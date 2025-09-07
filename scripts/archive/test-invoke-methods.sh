#!/bin/bash
AWS=/usr/local/bin/aws
API_ID=kyjf2wp972

echo "=== Testing Methods via test-invoke-method ==="
echo ""

# Test 1: GET gallery
echo "1. Testing GET /vip/galleries/{galleryId}"
$AWS apigateway test-invoke-method \
    --rest-api-id $API_ID \
    --resource-id m0rfcv \
    --http-method GET \
    --path-with-query-string "/vip/galleries/test-001" \
    --query 'status' \
    --output text
echo ""

# Test 2: GET assets
echo "2. Testing GET /vip/galleries/{galleryId}/assets"
$AWS apigateway test-invoke-method \
    --rest-api-id $API_ID \
    --resource-id 9423kf \
    --http-method GET \
    --path-with-query-string "/vip/galleries/test-001/assets" \
    --query 'status' \
    --output text
echo ""

# Test 3: PATCH rating
echo "3. Testing PATCH /vip/galleries/{galleryId}/assets/{assetId}/rating"
$AWS apigateway test-invoke-method \
    --rest-api-id $API_ID \
    --resource-id wi9y32 \
    --http-method PATCH \
    --path-with-query-string "/vip/galleries/test-001/assets/asset-456/rating" \
    --body '{"rating":5}' \
    --query 'status' \
    --output text
echo ""

# Test 4: POST folders
echo "4. Testing POST /vip/galleries/{galleryId}/folders"
$AWS apigateway test-invoke-method \
    --rest-api-id $API_ID \
    --resource-id 3myzx8 \
    --http-method POST \
    --path-with-query-string "/vip/galleries/test-001/folders" \
    --body '{"name":"Test Folder","parentId":null}' \
    --query 'status' \
    --output text
echo ""

# Test 5: POST finalize
echo "5. Testing POST /vip/galleries/{galleryId}/finalize"
$AWS apigateway test-invoke-method \
    --rest-api-id $API_ID \
    --resource-id o3unqg \
    --http-method POST \
    --path-with-query-string "/vip/galleries/test-001/finalize" \
    --body '{"assetIds":["asset-1","asset-2"]}' \
    --query 'status' \
    --output text

