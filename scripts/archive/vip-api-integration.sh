#!/bin/bash
# VIP API Gateway Lambda Integration Script
# Safe, idempotent, with proper CORS handling

set -euo pipefail

# Configuration
API_ID="kyjf2wp972"
LAMBDA_NAME="blakely-cinematics-vip-handler-dev"
LAMBDA_ARN="arn:aws:lambda:us-east-1:642278445221:function:${LAMBDA_NAME}"
REGION="us-east-1"
ACCOUNT_ID="642278445221"
STAGE="dev"

# Allowed origins (centralized)
ALLOWED_ORIGINS="https://d2fbkl7vcfz5f7.amplifyapp.com,https://www.blakelycinematics.com,https://blakelycinematics.com,http://localhost:5173,http://localhost:8080,http://127.0.0.1:5500"

# Change log file
CHANGELOG="api-integration-changelog.txt"
echo "=== API Integration Change Log $(date) ===" > $CHANGELOG

# Helper Functions
log_change() {
    echo "$1" | tee -a $CHANGELOG
}

ensure_resource() {
    local PARENT_ID=$1
    local PATH_PART=$2
    local FULL_PATH=$3
    
    local RESOURCE_ID=$(aws apigateway get-resources \
        --rest-api-id $API_ID \
        --query "items[?path=='${FULL_PATH}'].id" \
        --output text 2>/dev/null || true)
    
    if [ -z "${RESOURCE_ID:-}" ]; then
        aws apigateway create-resource \
            --rest-api-id $API_ID \
            --parent-id "$PARENT_ID" \
            --path-part "$PATH_PART" >/dev/null
        RESOURCE_ID=$(aws apigateway get-resources \
            --rest-api-id $API_ID \
            --query "items[?path=='${FULL_PATH}'].id" \
            --output text)
        log_change "✅ Created resource: $FULL_PATH"
    else
        log_change "⏭️  Resource exists (skipped): $FULL_PATH"
    fi
    
    echo "$RESOURCE_ID"
}

ensure_method() {
    local RES_ID=$1
    local METHOD=$2
    local PATH=$3
    
    if ! aws apigateway get-method \
        --rest-api-id $API_ID \
        --resource-id "$RES_ID" \
        --http-method "$METHOD" >/dev/null 2>&1; then
        
        aws apigateway put-method \
            --rest-api-id $API_ID \
            --resource-id "$RES_ID" \
            --http-method "$METHOD" \
            --authorization-type NONE >/dev/null
        log_change "✅ Created method: $METHOD $PATH"
    else
        log_change "⏭️  Method exists (skipped): $METHOD $PATH"
    fi
}

ensure_proxy_integration() {
    local RES_ID=$1
    local METHOD=$2
    local PATH=$3
    
    if ! aws apigateway get-integration \
        --rest-api-id $API_ID \
        --resource-id "$RES_ID" \
        --http-method "$METHOD" >/dev/null 2>&1; then
        
        aws apigateway put-integration \
            --rest-api-id $API_ID \
            --resource-id "$RES_ID" \
            --http-method "$METHOD" \
            --type AWS_PROXY \
            --integration-http-method POST \
            --uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations" >/dev/null
        log_change "✅ Created proxy integration: $METHOD $PATH → Lambda"
    else
        log_change "⏭️  Integration exists (skipped): $METHOD $PATH"
    fi
}

set_options_mock() {
    local RES_ID=$1
    local PATH=$2
    
    # Create OPTIONS method
    ensure_method "$RES_ID" "OPTIONS" "$PATH"
    
    # Check if integration exists
    if ! aws apigateway get-integration \
        --rest-api-id $API_ID \
        --resource-id "$RES_ID" \
        --http-method "OPTIONS" >/dev/null 2>&1; then
        
        # Create MOCK integration
        aws apigateway put-integration \
            --rest-api-id $API_ID \
            --resource-id "$RES_ID" \
            --http-method OPTIONS \
            --type MOCK \
            --request-templates '{"application/json":"{\"statusCode\":200}"}' >/dev/null
        
        # Method response
        aws apigateway put-method-response \
            --rest-api-id $API_ID \
            --resource-id "$RES_ID" \
            --http-method OPTIONS \
            --status-code 200 \
            --response-parameters '{
                "method.response.header.Access-Control-Allow-Origin": true,
                "method.response.header.Access-Control-Allow-Methods": true,
                "method.response.header.Access-Control-Allow-Headers": true
            }' >/dev/null
        
        # Integration response with proper origin list (FIXED)
        aws apigateway put-integration-response \
            --rest-api-id $API_ID \
            --resource-id "$RES_ID" \
            --http-method OPTIONS \
            --status-code 200 \
            --response-parameters "{
                \"method.response.header.Access-Control-Allow-Origin\": \"'https://d2fbkl7vcfz5f7.amplifyapp.com,https://www.blakelycinematics.com,https://blakelycinematics.com,http://localhost:5173,http://localhost:8080,http://127.0.0.1:5500'\",
                \"method.response.header.Access-Control-Allow-Methods\": \"'GET,POST,DELETE,PATCH,OPTIONS'\",
                \"method.response.header.Access-Control-Allow-Headers\": \"'Content-Type,Authorization'\"
            }" >/dev/null
        
        log_change "✅ Created MOCK OPTIONS: $PATH"
    else
        log_change "⏭️  OPTIONS exists (skipped): $PATH"
    fi
}

echo "Script ready. Run ./vip-api-integration.sh to execute."

# Main Script
log_change "Starting API Gateway integration for VIP routes..."

# Step 1: Export pre-change snapshot
log_change "Exporting pre-change API definition..."
aws apigateway get-export \
    --rest-api-id $API_ID \
    --stage-name $STAGE \
    --export-type oas30 \
    --parameters extensions='integrations' \
    --accepts application/yaml \
    pre-change-api.yaml

# Step 2: Add Lambda permission (with unique SID)
SID="api-gateway-invoke-vip-$(date +%s)"
log_change "Adding Lambda permission with SID: $SID"

aws lambda add-permission \
    --function-name $LAMBDA_NAME \
    --statement-id "$SID" \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*/*" >/dev/null 2>&1 || \
    log_change "⚠️  Lambda permission may already exist (continuing)"

# Step 3: Ensure /vip exists
ROOT_ID=$(aws apigateway get-resources \
    --rest-api-id $API_ID \
    --query "items[?path=='/'].id" \
    --output text)

VIP_ID=$(ensure_resource "$ROOT_ID" "vip" "/vip")

# Step 4: Create resources and methods

# 4.1 /vip/galleries
GALLERIES_ID=$(ensure_resource "$VIP_ID" "galleries" "/vip/galleries")

# 4.2 /vip/galleries/{galleryId}
GALLERY_ID=$(ensure_resource "$GALLERIES_ID" "{galleryId}" "/vip/galleries/{galleryId}")

# Route 1: GET /vip/galleries/{galleryId}
ensure_method "$GALLERY_ID" "GET" "/vip/galleries/{galleryId}"
ensure_proxy_integration "$GALLERY_ID" "GET" "/vip/galleries/{galleryId}"

# 4.3 /vip/galleries/{galleryId}/assets
ASSETS_ID=$(ensure_resource "$GALLERY_ID" "assets" "/vip/galleries/{galleryId}/assets")

# Route 2: GET /vip/galleries/{galleryId}/assets
ensure_method "$ASSETS_ID" "GET" "/vip/galleries/{galleryId}/assets"
ensure_proxy_integration "$ASSETS_ID" "GET" "/vip/galleries/{galleryId}/assets"

# 4.4 /vip/galleries/{galleryId}/assets/{assetId}
ASSET_ID=$(ensure_resource "$ASSETS_ID" "{assetId}" "/vip/galleries/{galleryId}/assets/{assetId}")

# 4.5 /vip/galleries/{galleryId}/assets/{assetId}/rating
RATING_ID=$(ensure_resource "$ASSET_ID" "rating" "/vip/galleries/{galleryId}/assets/{assetId}/rating")

# Route 3: PATCH /vip/galleries/{galleryId}/assets/{assetId}/rating
ensure_method "$RATING_ID" "PATCH" "/vip/galleries/{galleryId}/assets/{assetId}/rating"
ensure_proxy_integration "$RATING_ID" "PATCH" "/vip/galleries/{galleryId}/assets/{assetId}/rating"
set_options_mock "$RATING_ID" "/vip/galleries/{galleryId}/assets/{assetId}/rating"

# 4.6 /vip/galleries/{galleryId}/folders
FOLDERS_ID=$(ensure_resource "$GALLERY_ID" "folders" "/vip/galleries/{galleryId}/folders")

# Route 4: POST /vip/galleries/{galleryId}/folders
ensure_method "$FOLDERS_ID" "POST" "/vip/galleries/{galleryId}/folders"
ensure_proxy_integration "$FOLDERS_ID" "POST" "/vip/galleries/{galleryId}/folders"
set_options_mock "$FOLDERS_ID" "/vip/galleries/{galleryId}/folders"

# 4.7 /vip/galleries/{galleryId}/finalize
FINALIZE_ID=$(ensure_resource "$GALLERY_ID" "finalize" "/vip/galleries/{galleryId}/finalize")

# Route 5: POST /vip/galleries/{galleryId}/finalize
ensure_method "$FINALIZE_ID" "POST" "/vip/galleries/{galleryId}/finalize"
ensure_proxy_integration "$FINALIZE_ID" "POST" "/vip/galleries/{galleryId}/finalize"
set_options_mock "$FINALIZE_ID" "/vip/galleries/{galleryId}/finalize"

# Step 5: Deploy to dev stage
log_change "Deploying API to $STAGE stage..."
DEPLOYMENT_ID=$(aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name $STAGE \
    --description "VIP Lambda proxy routes with CORS" \
    --query 'id' \
    --output text)
log_change "✅ Deployed with ID: $DEPLOYMENT_ID"

# Step 6: Export post-change snapshot
log_change "Exporting post-change API definition..."
aws apigateway get-export \
    --rest-api-id $API_ID \
    --stage-name $STAGE \
    --export-type oas30 \
    --parameters extensions='integrations' \
    --accepts application/yaml \
    post-change-api.yaml


# Step 7: Run test suite
log_change "Running test suite..."
API_URL="https://${API_ID}.execute-api.${REGION}.amazonaws.com/${STAGE}"

echo "=== Test Results ===" > test-results.txt

# Test 1: Health check (baseline)
echo -e "\n--- Test 1: Health Check ---" >> test-results.txt
curl -i -X GET "${API_URL}/health" >> test-results.txt 2>&1

# Test 2: Gallery Details
echo -e "\n--- Test 2: Gallery Details ---" >> test-results.txt
curl -i -X GET \
    -H "Origin: https://d2fbkl7vcfz5f7.amplifyapp.com" \
    "${API_URL}/vip/galleries/test-gallery-123" >> test-results.txt 2>&1

# Test 3: Gallery Assets
echo -e "\n--- Test 3: Gallery Assets ---" >> test-results.txt
curl -i -X GET \
    -H "Origin: http://localhost:5173" \
    "${API_URL}/vip/galleries/test-gallery-123/assets" >> test-results.txt 2>&1

# Test 4: Asset Rating
echo -e "\n--- Test 4: Asset Rating ---" >> test-results.txt
curl -i -X PATCH \
    -H "Origin: https://blakelycinematics.com" \
    -H "Content-Type: application/json" \
    -d '{"rating": 5}' \
    "${API_URL}/vip/galleries/test-gallery-123/assets/asset-456/rating" >> test-results.txt 2>&1

# Test 5: Create Folder
echo -e "\n--- Test 5: Create Folder ---" >> test-results.txt
curl -i -X POST \
    -H "Origin: http://localhost:8080" \
    -H "Content-Type: application/json" \
    -d '{"name": "Test Folder", "parentId": null}' \
    "${API_URL}/vip/galleries/test-gallery-123/folders" >> test-results.txt 2>&1

# Test 6: Finalize Selection
echo -e "\n--- Test 6: Finalize Selection ---" >> test-results.txt
curl -i -X POST \
    -H "Origin: https://www.blakelycinematics.com" \
    -H "Content-Type: application/json" \
    -d '{"assetIds": ["asset-1", "asset-2"]}' \
    "${API_URL}/vip/galleries/test-gallery-123/finalize" >> test-results.txt 2>&1

# Test 7: CORS Preflight
echo -e "\n--- Test 7: CORS Preflight ---" >> test-results.txt
curl -i -X OPTIONS \
    -H "Origin: https://d2fbkl7vcfz5f7.amplifyapp.com" \
    -H "Access-Control-Request-Method: PATCH" \
    -H "Access-Control-Request-Headers: Content-Type,Authorization" \
    "${API_URL}/vip/galleries/test-gallery-123/assets/asset-456/rating" >> test-results.txt 2>&1

# Test 8: Negative Test (404 with CORS)
echo -e "\n--- Test 8: 404 with CORS ---" >> test-results.txt
curl -i -X GET \
    -H "Origin: https://d2fbkl7vcfz5f7.amplifyapp.com" \
    "${API_URL}/vip/galleries/nonexistent-gallery/assets" >> test-results.txt 2>&1

# Step 8: Generate diff
log_change "Generating API diff..."
diff pre-change-api.yaml post-change-api.yaml > api-changes.diff 2>&1 || true

# Summary
echo -e "\n=== DEPLOYMENT COMPLETE ===" | tee -a $CHANGELOG
echo "📁 Files created:" | tee -a $CHANGELOG
echo "  - api-integration-changelog.txt (change log)" | tee -a $CHANGELOG
echo "  - pre-change-api.yaml (before snapshot)" | tee -a $CHANGELOG
echo "  - post-change-api.yaml (after snapshot)" | tee -a $CHANGELOG
echo "  - api-changes.diff (differences)" | tee -a $CHANGELOG
echo "  - test-results.txt (curl outputs)" | tee -a $CHANGELOG
echo "" | tee -a $CHANGELOG
echo "🔗 API Endpoint: ${API_URL}" | tee -a $CHANGELOG
echo "🚀 Lambda: ${LAMBDA_NAME}" | tee -a $CHANGELOG
echo "📋 Stage: ${STAGE}" | tee -a $CHANGELOG

