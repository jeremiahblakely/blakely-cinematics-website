#!/bin/bash

# Minimal deployment using only essential files
set -e

APP_ID="d2fbkl7vcfz5f7"
BRANCH="staging"  
REGION="us-east-1"
SITE_DIR="/Users/jeremiahblakely/Desktop/blakely-cinematics-website"

echo "🚀 Minimal Deployment for Blakely Cinematics"
echo "============================================="

# Use a much smaller file set - just the critical files
TEMP_DIR="$(mktemp -d)"
MINIMAL_DIR="$TEMP_DIR/minimal"
mkdir -p "$MINIMAL_DIR"

echo "📦 Creating minimal deployment package..."

# Copy only the most essential files
echo "   • booking.html (with $175 update)"
cp "$SITE_DIR/booking.html" "$MINIMAL_DIR/"

echo "   • index.html" 
cp "$SITE_DIR/index.html" "$MINIMAL_DIR/"

echo "   • Essential CSS"
mkdir -p "$MINIMAL_DIR/css"
cp "$SITE_DIR/css/styles.css" "$MINIMAL_DIR/css/"

echo "   • Essential JS"
mkdir -p "$MINIMAL_DIR/js"
cp "$SITE_DIR/js/script.js" "$MINIMAL_DIR/js/"
cp "$SITE_DIR/js/api-config.js" "$MINIMAL_DIR/js/"

# Create a tiny ZIP
ZIP_FILE="$TEMP_DIR/minimal-deploy.zip"
cd "$MINIMAL_DIR"
zip -r "$ZIP_FILE" . 

ZIP_SIZE=$(du -h "$ZIP_FILE" | cut -f1)
echo "   ✅ Minimal ZIP created ($ZIP_SIZE)"

# Verify the $175 update
if grep -q "\$175 Deposit" "$MINIMAL_DIR/booking.html"; then
    echo "   💰 $175 deposit update confirmed"
else
    echo "   ❌ $175 update missing!"
    exit 1
fi

# Try direct deployment with base64 - this should work for small files
echo ""
echo "🚀 Attempting direct deployment..."

BASE64_DATA=$(base64 < "$ZIP_FILE")
DATA_URL="data://application/zip;base64,$BASE64_DATA"

# Check if base64 data is under AWS limit (roughly 2.7MB when base64 encoded)
DATA_SIZE=${#DATA_URL}
echo "   Base64 data size: $DATA_SIZE characters"

if [ $DATA_SIZE -gt 2800000 ]; then
    echo "   ❌ Still too large for direct deployment"
    exit 1
fi

# Start deployment
DEPLOY_RESULT=$(aws amplify start-deployment \
    --app-id "$APP_ID" \
    --branch-name "$BRANCH" \
    --region "$REGION" \
    --source-url "$DATA_URL")

JOB_ID=$(echo "$DEPLOY_RESULT" | jq -r '.jobSummary.jobId')
echo "   ✅ Deployment started! Job ID: $JOB_ID"

# Monitor deployment
echo ""
echo "⏳ Monitoring deployment..."
for i in {1..30}; do
    sleep 10
    STATUS=$(aws amplify get-job \
        --app-id "$APP_ID" \
        --branch-name "$BRANCH" \
        --job-id "$JOB_ID" \
        --region "$REGION" \
        --query 'job.summary.status' \
        --output text)
    
    echo "   Status: $STATUS (${i}0s elapsed)"
    
    if [ "$STATUS" = "SUCCEED" ]; then
        echo ""
        echo "✅ Deployment successful!"
        echo "🔗 Check: https://staging.blakelycinematics.com/booking.html"
        echo "💰 Verify the $175 deposit amount is shown"
        exit 0
    elif [ "$STATUS" = "FAILED" ]; then
        echo ""
        echo "❌ Deployment failed"
        aws amplify get-job \
            --app-id "$APP_ID" \
            --branch-name "$BRANCH" \
            --job-id "$JOB_ID" \
            --region "$REGION" \
            --query 'job.steps[].logUrl'
        exit 1
    fi
done

echo "⏰ Deployment timeout"
rm -rf "$TEMP_DIR"