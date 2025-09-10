#!/bin/bash

# Blakely Cinematics - AWS Amplify Staging Deployment Script V2
# Uses S3 bucket for larger files

set -e  # Exit on any error

# Configuration
APP_ID="d2fbkl7vcfz5f7"
BRANCH="staging"
REGION="us-east-1"
SITE_DIR="/Users/jeremiahblakely/Desktop/blakely-cinematics-website"
TEMP_DIR="$(mktemp -d)"
ZIP_FILE="$TEMP_DIR/blakely-cinematics-staging.zip"
S3_BUCKET="amplify-deploy-temp-$(date +%s)"

echo "🚀 Starting Blakely Cinematics Staging Deployment V2"
echo "====================================================="
echo "App ID: $APP_ID"
echo "Branch: $BRANCH" 
echo "Region: $REGION"
echo "Source: $SITE_DIR"
echo ""

# Function to clean up on exit
cleanup() {
    echo "🧹 Cleaning up temporary files and S3 bucket..."
    rm -rf "$TEMP_DIR"
    
    # Clean up S3 bucket if it was created
    if aws s3 ls "s3://$S3_BUCKET" >/dev/null 2>&1; then
        echo "   Deleting S3 bucket: $S3_BUCKET"
        aws s3 rm "s3://$S3_BUCKET" --recursive >/dev/null 2>&1 || true
        aws s3 rb "s3://$S3_BUCKET" >/dev/null 2>&1 || true
    fi
}
trap cleanup EXIT

# Create staging directory with only essential files
echo "📦 Preparing deployment package (essential files only)..."
STAGING_DIR="$TEMP_DIR/staging"
mkdir -p "$STAGING_DIR"

# Copy only essential files to reduce size
echo "   • Copying essential HTML files..."
essential_files=(
    "index.html"
    "booking.html" 
    "booking-success.html"
    "services.html"
    "preparation.html"
    "faq.html"
    "vendors.html"
    "vip-login.html"
    "vip.html"
)

for file in "${essential_files[@]}"; do
    if [ -f "$SITE_DIR/$file" ]; then
        cp "$SITE_DIR/$file" "$STAGING_DIR/"
        echo "      ✅ $file"
    else
        echo "      ⚠️  $file (missing)"
    fi
done

echo "   • Copying CSS directory..."
if [ -d "$SITE_DIR/css" ]; then
    cp -r "$SITE_DIR/css" "$STAGING_DIR/"
else
    echo "     Warning: CSS directory not found"
fi

echo "   • Copying essential JS files..."
mkdir -p "$STAGING_DIR/js"
essential_js=(
    "script.js"
    "api-config.js" 
    "integrate-api.js"
    "vip-api.js"
)

for jsfile in "${essential_js[@]}"; do
    if [ -f "$SITE_DIR/js/$jsfile" ]; then
        cp "$SITE_DIR/js/$jsfile" "$STAGING_DIR/js/"
        echo "      ✅ js/$jsfile"
    fi
done

echo "   • Copying admin config..."
if [ -f "$SITE_DIR/admin/config.js" ]; then
    mkdir -p "$STAGING_DIR/admin"
    cp "$SITE_DIR/admin/config.js" "$STAGING_DIR/admin/"
fi

echo "   • Copying VIP public files..."
if [ -d "$SITE_DIR/public/vip" ]; then
    mkdir -p "$STAGING_DIR/public"
    cp -r "$SITE_DIR/public/vip" "$STAGING_DIR/public/"
fi

# Verify critical files exist
echo ""
echo "🔍 Verifying critical files..."
if [ -f "$STAGING_DIR/booking.html" ]; then
    echo "   ✅ booking.html"
    if grep -q "\$175 Deposit" "$STAGING_DIR/booking.html"; then
        echo "      💰 Contains $175 deposit update"
    else
        echo "      ❌ WARNING: $175 deposit update not found!"
        exit 1
    fi
else
    echo "   ❌ booking.html (MISSING)"
    exit 1
fi

# Create deployment package
echo ""
echo "📄 Creating deployment ZIP..."
cd "$STAGING_DIR"
zip -r "$ZIP_FILE" . -x "*.DS_Store" "*.git*" "node_modules/*" "*.env*" "*.sh" "*.bak" "*.backup*"

# Verify ZIP was created
if [ ! -f "$ZIP_FILE" ]; then
    echo "❌ Failed to create deployment ZIP"
    exit 1
fi

ZIP_SIZE=$(du -h "$ZIP_FILE" | cut -f1)
echo "   ✅ ZIP created successfully ($ZIP_SIZE)"

# Check AWS CLI and credentials
echo ""
echo "🔑 Checking AWS credentials..."
if ! aws sts get-caller-identity --region "$REGION" >/dev/null 2>&1; then
    echo "❌ AWS credentials not configured or expired"
    exit 1
fi
echo "   ✅ AWS credentials verified"

# Create temporary S3 bucket
echo ""
echo "📡 Creating temporary S3 bucket..."
aws s3 mb "s3://$S3_BUCKET" --region "$REGION"
echo "   ✅ S3 bucket created: $S3_BUCKET"

# Upload ZIP to S3
echo ""
echo "📤 Uploading deployment package to S3..."
aws s3 cp "$ZIP_FILE" "s3://$S3_BUCKET/deployment.zip" --region "$REGION"
S3_URL="https://$S3_BUCKET.s3.$REGION.amazonaws.com/deployment.zip"
echo "   ✅ Upload completed: $S3_URL"

# Cancel any pending jobs
echo ""
echo "🛑 Checking for pending jobs..."
PENDING_JOBS=$(aws amplify list-jobs --app-id "$APP_ID" --branch-name "$BRANCH" --region "$REGION" --query 'jobSummaries[?status==`PENDING`].jobId' --output text)

if [ ! -z "$PENDING_JOBS" ]; then
    echo "   Found pending jobs: $PENDING_JOBS"
    for job_id in $PENDING_JOBS; do
        echo "   🛑 Stopping job $job_id..."
        aws amplify stop-job --app-id "$APP_ID" --branch-name "$BRANCH" --job-id "$job_id" --region "$REGION" || echo "     Could not stop job $job_id"
    done
    echo "   ⏳ Waiting 10 seconds for jobs to stop..."
    sleep 10
else
    echo "   ✅ No pending jobs found"
fi

# Start deployment using S3 URL
echo ""
echo "🚀 Starting Amplify deployment..."
DEPLOY_RESULT=$(aws amplify start-deployment \
    --app-id "$APP_ID" \
    --branch-name "$BRANCH" \
    --region "$REGION" \
    --source-url "$S3_URL")

JOB_ID=$(echo "$DEPLOY_RESULT" | jq -r '.jobSummary.jobId')

if [ "$JOB_ID" = "null" ] || [ -z "$JOB_ID" ]; then
    echo "❌ Failed to start deployment"
    echo "AWS Response: $DEPLOY_RESULT"
    exit 1
fi

echo "   ✅ Deployment started!"
echo "   📋 Job ID: $JOB_ID"

# Monitor deployment
echo ""
echo "⏳ Monitoring deployment progress..."
TIMEOUT=600  # 10 minutes timeout
ELAPSED=0
INTERVAL=10

while [ $ELAPSED -lt $TIMEOUT ]; do
    JOB_STATUS=$(aws amplify get-job \
        --app-id "$APP_ID" \
        --branch-name "$BRANCH" \
        --job-id "$JOB_ID" \
        --region "$REGION" \
        --query 'job.summary.status' \
        --output text)
    
    case "$JOB_STATUS" in
        "SUCCEED")
            echo "   ✅ Deployment completed successfully!"
            break
            ;;
        "FAILED"|"CANCELLED")
            echo "   ❌ Deployment failed with status: $JOB_STATUS"
            
            # Get error details
            echo ""
            echo "📋 Deployment logs:"
            aws amplify get-job \
                --app-id "$APP_ID" \
                --branch-name "$BRANCH" \
                --job-id "$JOB_ID" \
                --region "$REGION" \
                --query 'job.steps[].logUrl' \
                --output table
            exit 1
            ;;
        "PENDING"|"PROVISIONING"|"RUNNING")
            printf "   📊 Status: %s (elapsed: %ds)\n" "$JOB_STATUS" "$ELAPSED"
            ;;
        *)
            echo "   ⚠️  Unknown status: $JOB_STATUS"
            ;;
    esac
    
    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
done

if [ $ELAPSED -ge $TIMEOUT ]; then
    echo "   ⏰ Deployment timed out after ${TIMEOUT}s"
    echo "   Check the AWS Amplify console for details"
    exit 1
fi

# Get final deployment info
echo ""
echo "📊 Deployment Summary:"
aws amplify get-job \
    --app-id "$APP_ID" \
    --branch-name "$BRANCH" \
    --job-id "$JOB_ID" \
    --region "$REGION" \
    --query 'job.summary' \
    --output table

echo ""
echo "✅ Deployment completed successfully!"
echo "🎬 Your Blakely Cinematics website is now live on staging!"
echo ""
echo "🔗 Staging URLs:"
echo "   • Main: https://staging.blakelycinematics.com"
echo "   • Booking: https://staging.blakelycinematics.com/booking.html"
echo "   • Services: https://staging.blakelycinematics.com/services.html"
echo ""
echo "Next steps:"
echo "1. Visit https://staging.blakelycinematics.com/booking.html"
echo "2. Verify the $175 deposit amount is displayed correctly"
echo "3. Test the booking flow to ensure everything works"
echo ""