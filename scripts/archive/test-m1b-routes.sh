#!/bin/bash
AWS=/usr/local/bin/aws
API_ID=kyjf2wp972

echo "=== Testing Milestone 1B Routes ==="
echo ""

# Test POST /vip/galleries/{galleryId}/folders
echo "1. Testing POST /vip/galleries/{galleryId}/folders"
$AWS apigateway test-invoke-method \
    --rest-api-id $API_ID \
    --resource-id 3myzx8 \
    --http-method POST \
    --path-with-query-string "/vip/galleries/test-gallery-001/folders" \
    --body '{"name":"Test Folder M1B","parentId":null}' \
    --query 'status' \
    --output text && echo " - Status code"

echo ""

# Test POST /vip/galleries/{galleryId}/finalize
echo "2. Testing POST /vip/galleries/{galleryId}/finalize"
$AWS apigateway test-invoke-method \
    --rest-api-id $API_ID \
    --resource-id o3unqg \
    --http-method POST \
    --path-with-query-string "/vip/galleries/test-gallery-001/finalize" \
    --body '{"assetIds":["asset-1","asset-2","asset-3"]}' \
    --query 'status' \
    --output text && echo " - Status code"

echo ""

# Test invalid folder name
echo "3. Testing validation: empty folder name"
$AWS apigateway test-invoke-method \
    --rest-api-id $API_ID \
    --resource-id 3myzx8 \
    --http-method POST \
    --path-with-query-string "/vip/galleries/test-gallery-001/folders" \
    --body '{"name":"","parentId":null}' \
    --query 'status' \
    --output text && echo " - Status code (expect 400)"

echo ""

# Test invalid finalize (no assets)
echo "4. Testing validation: empty asset list"
$AWS apigateway test-invoke-method \
    --rest-api-id $API_ID \
    --resource-id o3unqg \
    --http-method POST \
    --path-with-query-string "/vip/galleries/test-gallery-001/finalize" \
    --body '{"assetIds":[]}' \
    --query 'status' \
    --output text && echo " - Status code (expect 400)"

echo ""
echo "Milestone 1B tests complete!"
