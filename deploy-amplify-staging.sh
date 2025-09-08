#!/bin/bash

# Blakely Cinematics - AWS Amplify Staging Deployment Script
# This script packages and deploys the website to AWS Amplify staging

set -e  # Exit on any error

# Configuration
APP_ID="d2fbkl7vcfz5f7"
BRANCH="staging"
REGION="us-east-1"
SITE_DIR="/Users/jeremiahblakely/Desktop/blakely-cinematics-website"
TEMP_DIR="$(mktemp -d)"
ZIP_FILE="$TEMP_DIR/blakely-cinematics-staging.zip"

echo "🚀 Starting Blakely Cinematics Staging Deployment"
echo "====================================================="
echo "App ID: $APP_ID"
echo "Branch: $BRANCH" 
echo "Region: $REGION"
echo "Source: $SITE_DIR"
echo "Temp Dir: $TEMP_DIR"
echo ""

# Function to clean up on exit
cleanup() {
    echo "🧹 Cleaning up temporary files..."
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

# Create staging directory with only files we want to deploy
echo "📦 Preparing deployment package..."
STAGING_DIR="$TEMP_DIR/staging"
mkdir -p "$STAGING_DIR"

# Copy core website files
echo "   • Copying HTML files..."
cp "$SITE_DIR"/*.html "$STAGING_DIR/" 2>/dev/null || echo "     No HTML files found"

echo "   • Copying CSS directory..."
if [ -d "$SITE_DIR/css" ]; then
    cp -r "$SITE_DIR/css" "$STAGING_DIR/"
else
    echo "     Warning: CSS directory not found"
fi

echo "   • Copying JS directory..."
if [ -d "$SITE_DIR/js" ]; then
    cp -r "$SITE_DIR/js" "$STAGING_DIR/"
else
    echo "     Warning: JS directory not found"
fi

echo "   • Copying assets directory..."
if [ -d "$SITE_DIR/assets" ]; then
    cp -r "$SITE_DIR/assets" "$STAGING_DIR/"
else
    echo "     Warning: Assets directory not found"
fi

echo "   • Copying public directory..."
if [ -d "$SITE_DIR/public" ]; then
    cp -r "$SITE_DIR/public" "$STAGING_DIR/"
else
    echo "     Public directory not found (skipping)"
fi

echo "   • Copying admin directory..."
if [ -d "$SITE_DIR/admin" ]; then
    cp -r "$SITE_DIR/admin" "$STAGING_DIR/"
else
    echo "     Admin directory not found (skipping)"
fi

# Verify critical files exist
echo ""
echo "🔍 Verifying critical files..."
critical_files=("booking.html" "index.html" "css/styles.css")
for file in "${critical_files[@]}"; do
    if [ -f "$STAGING_DIR/$file" ]; then
        echo "   ✅ $file"
        # Special check for booking.html $175 update
        if [ "$file" = "booking.html" ]; then
            if grep -q "\$175 Deposit" "$STAGING_DIR/$file"; then
                echo "      💰 Contains $175 deposit update"
            else
                echo "      ⚠️  WARNING: $175 deposit update not found!"
                exit 1
            fi
        fi
    else
        echo "   ❌ $file (MISSING)"
        exit 1
    fi
done

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
    echo "   Please run: aws configure"
    exit 1
fi
echo "   ✅ AWS credentials verified"

# Cancel any pending jobs first
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

# Start deployment
echo ""
echo "🚀 Starting Amplify deployment..."
DEPLOY_RESULT=$(aws amplify start-deployment \
    --app-id "$APP_ID" \
    --branch-name "$BRANCH" \
    --region "$REGION" \
    --source-url "data://application/zip;base64,$(base64 < "$ZIP_FILE")")

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

# Get the staging URL
echo ""
echo "🌐 Getting staging URL..."
STAGING_URL=$(aws amplify get-branch \
    --app-id "$APP_ID" \
    --branch-name "$BRANCH" \
    --region "$REGION" \
    --query 'branch.branchName' \
    --output text 2>/dev/null)

if [ "$STAGING_URL" = "staging" ]; then
    echo "   🔗 Staging URL: https://staging.blakelycinematics.com"
    echo "   🔗 Booking Page: https://staging.blakelycinematics.com/booking.html"
else
    echo "   🔗 Check AWS Amplify console for the staging URL"
fi

echo ""
echo "✅ Deployment completed successfully!"
echo "🎬 Your Blakely Cinematics website is now live on staging!"
echo ""
echo "Next steps:"
echo "1. Visit https://staging.blakelycinematics.com/booking.html"
echo "2. Verify the $175 deposit amount is displayed correctly"
echo "3. Test the booking flow to ensure everything works"
echo ""