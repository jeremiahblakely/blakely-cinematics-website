#!/bin/bash

# AWS Amplify Staging Deployment Script
# Deploys to staging branch for app-id d2fbkl7vcfz5f7

set -euo pipefail

# Configuration
AMPLIFY_APP_ID="d2fbkl7vcfz5f7"
BRANCH_NAME="staging"
DIST_DIR="dist"
ZIP_FILE="artifacts.zip"

echo "🚀 Starting Amplify STAGING deployment..."

# Step 1: Clean and prepare dist directory
echo "📁 Preparing dist directory..."
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# Step 2: Copy all HTML pages
echo "📄 Copying all HTML pages..."
cp *.html "$DIST_DIR/" 2>/dev/null || true

# Verify main index.html exists
if [[ ! -f "$DIST_DIR/index.html" ]]; then
    echo "❌ Error: index.html not found after copy"
    exit 1
fi

echo "✅ Copied HTML files:"
ls "$DIST_DIR"/*.html | xargs -n1 basename

# Step 3: Copy website assets (CSS, JS, admin, etc.)
if [[ -d "css" ]]; then
    echo "📂 Copying CSS files..."
    cp -r css "$DIST_DIR/"
fi

if [[ -d "js" ]]; then
    echo "📂 Copying JS files..."
    cp -r js "$DIST_DIR/"
fi

if [[ -d "admin" ]]; then
    echo "📂 Copying admin files..."
    cp -r admin "$DIST_DIR/"
fi

if [[ -d "images" ]]; then
    echo "📂 Copying images..."
    cp -r images "$DIST_DIR/"
fi

# Copy other assets if they exist
if [[ -d "assets" ]]; then
    cp -r assets "$DIST_DIR/" 2>/dev/null || true
fi

# Copy public folder contents if it exists (exclude css to avoid overwriting root CSS)
if [[ -d "public" ]]; then
    echo "📂 Copying public assets (excluding public/css and duplicate admin shells)..."
    # Prefer rsync if available for exclusion
    if command -v rsync >/dev/null 2>&1; then
        rsync -a \
          --exclude 'css' \
          --exclude 'admin.html' \
          --exclude 'admin-login.html' \
          public/ "$DIST_DIR/" 2>/dev/null || true
    else
        # Fallback: copy entries except 'css'
        for entry in public/*; do
            name=$(basename "$entry")
            [[ "$name" == "css" || "$name" == "admin.html" || "$name" == "admin-login.html" ]] && continue
            cp -R "$entry" "$DIST_DIR/" 2>/dev/null || true
        done
    fi
fi

# Step 4: Create artifacts.zip (flat structure)
echo "📦 Creating artifacts.zip..."
rm -f "$ZIP_FILE"
cd "$DIST_DIR"
zip -r "../$ZIP_FILE" . -x "*.DS_Store" "*/.*" "*.bak" "*.bak2" "*~" "admin/*-wrong*.html*" "public/*-wrong*.html*"
cd ..

if [[ ! -f "$ZIP_FILE" ]]; then
    echo "❌ Error: Failed to create $ZIP_FILE"
    exit 1
fi

echo "✅ Created $ZIP_FILE ($(du -h "$ZIP_FILE" | cut -f1))"

# Step 5: Create deployment and get URLs (ONCE)
echo "🔗 Creating Amplify deployment for STAGING..."
DEPLOYMENT_INFO=$(aws amplify create-deployment \
    --app-id "$AMPLIFY_APP_ID" \
    --branch-name "$BRANCH_NAME" \
    --query '[jobId, zipUploadUrl]' \
    --output text)

JOB_ID=$(echo "$DEPLOYMENT_INFO" | awk '{print $1}')
UPLOAD_URL=$(echo "$DEPLOYMENT_INFO" | awk '{print $2}')

echo "📋 Job ID: $JOB_ID"
echo "🔗 Upload URL received"

# Step 6: Upload artifacts.zip to S3
echo "⬆️  Uploading artifacts.zip to S3..."
HTTP_STATUS=$(curl -s -X PUT \
    -H "Content-Type: application/zip" \
    --upload-file "$ZIP_FILE" \
    -w "%{http_code}" \
    -o /dev/null \
    "$UPLOAD_URL")

if [[ "$HTTP_STATUS" != "200" && "$HTTP_STATUS" != "204" ]]; then
    echo "❌ Error: Upload failed with HTTP $HTTP_STATUS"
    exit 1
fi

echo "✅ Upload successful (HTTP $HTTP_STATUS)"

# Step 7: Start deployment
echo "🚀 Starting deployment..."
aws amplify start-deployment \
    --app-id "$AMPLIFY_APP_ID" \
    --branch-name "$BRANCH_NAME" \
    --job-id "$JOB_ID" \
    > /dev/null

echo "✅ Deployment started successfully!"

# Step 8: Cleanup
echo "🧹 Cleaning up..."
rm -f "$ZIP_FILE"
rm -rf "$DIST_DIR"

# Step 9: Print staging preview URL and DNS configuration
echo ""
echo "🌐 STAGING environment available at:"
echo "   https://staging.$AMPLIFY_APP_ID.amplifyapp.com/"
echo "   https://staging.blakelycinematics.com/ (after DNS setup)"
echo ""
echo "🔗 DNS Configuration for Namecheap:"
echo "   Host: staging"
echo "   Value/Target: staging.$AMPLIFY_APP_ID.amplifyapp.com"
echo "   TTL: Automatic"
echo ""
echo "🔒 Basic Auth enabled: blakely / cinematic123"
echo "⏳ Deployment in progress... Check AWS Amplify console for status."
echo "📋 Job ID: $JOB_ID"
