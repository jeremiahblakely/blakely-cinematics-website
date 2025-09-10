#!/bin/bash

# AWS Amplify Staging Deployment Script
# Updated: September 7, 2025
# Deploys directly from project root without dist folder

set -euo pipefail

# Configuration
AMPLIFY_APP_ID="d2fbkl7vcfz5f7"
BRANCH_NAME="staging"
ZIP_FILE="deploy-artifacts.zip"

echo "aa Starting Amplify STAGING deployment..."
echo "aa Deployment time: $(date)"

# Step 1: Clean up old artifacts
echo "aa Cleaning up old artifacts..."
rm -f "$ZIP_FILE"

# Step 2: Create deployment package
echo "aa Creating deployment package..."

# Create zip with all necessary files
zip -r "$ZIP_FILE" \
  *.html \
  css/ \
  js/ \
  images/ \
  assets/ \
  -x "*.DS_Store" \
  -x "*/.*" \
  -x "*.bak" \
  -x "*.backup*" \
  -x "deploy-*.sh" \
  -x "*.zip" \
  -x "node_modules/*" \
  -x ".git/*" \
  2>/dev/null || true

# Step 3: Verify the package
if [[ ! -f "$ZIP_FILE" ]]; then
    echo "a Error: Failed to create $ZIP_FILE"
    exit 1
fi

echo "a Package created: $(ls -lh $ZIP_FILE | awk '{print $5}')"

# Step 4: Deploy to Amplify
echo "aa  Uploading to Amplify..."

# Create deployment
DEPLOYMENT_RESULT=$(aws amplify create-deployment \
    --app-id "$AMPLIFY_APP_ID" \
    --branch-name "$BRANCH_NAME" \
    --region us-east-1 \
    --output json 2>/dev/null)

# Extract URLs from result
UPLOAD_URL=$(echo "$DEPLOYMENT_RESULT" | grep -o '"url":"[^"]*' | cut -d'"' -f4 | head -1)
JOB_ID=$(echo "$DEPLOYMENT_RESULT" | grep -o '"jobId":"[^"]*' | cut -d'"' -f4)

if [[ -z "$UPLOAD_URL" ]]; then
    echo "a Error: Failed to get upload URL"
    exit 1
fi

# Upload the package
echo "aa Uploading package..."
curl -T "$ZIP_FILE" "$UPLOAD_URL" --silent --show-error

# Start deployment
echo "aa Starting deployment job..."
aws amplify start-deployment \
    --app-id "$AMPLIFY_APP_ID" \
    --branch-name "$BRANCH_NAME" \
    --job-id "$JOB_ID" \
    --region us-east-1 \
    --output json > /dev/null

# Step 5: Show deployment URLs
echo ""
echo "a Deployment initiated successfully!"
echo "aa Job ID: $JOB_ID"
echo ""
echo "aa Your staging URLs:"
echo "   https://staging.d1f224347uild7.amplifyapp.com/"
echo "   https://staging.blakelycinematics.com/ (if DNS configured)"
echo ""
echo "aa Check deployment status:"
echo "   aws amplify get-job --app-id $AMPLIFY_APP_ID --branch-name $BRANCH_NAME --job-id $JOB_ID"
echo ""
echo "aa Test payment page at:"
echo "   https://staging.d1f224347uild7.amplifyapp.com/payment-test"
echo ""

# Cleanup
echo "aa Cleaning up..."
rm -f "$ZIP_FILE"

echo "a Done! Deployment will complete in 1-2 minutes."
