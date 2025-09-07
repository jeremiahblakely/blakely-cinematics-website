#!/bin/bash
AWS=/usr/local/bin/aws
API_ID=kyjf2wp972

echo "=== Verifying Methods on Resources ==="
echo ""

# Route 1: GET /vip/galleries/{galleryId}
echo "1. GET /vip/galleries/{galleryId} (resource: m0rfcv)"
$AWS apigateway get-method --rest-api-id $API_ID --resource-id m0rfcv --http-method GET 2>&1 | grep -E "(httpMethod|type)" | head -2 || echo "NOT FOUND"
echo ""

# Route 2: GET /vip/galleries/{galleryId}/assets  
echo "2. GET /vip/galleries/{galleryId}/assets (resource: 9423kf)"
$AWS apigateway get-method --rest-api-id $API_ID --resource-id 9423kf --http-method GET 2>&1 | grep -E "(httpMethod|type)" | head -2 || echo "NOT FOUND"
echo ""

# Route 3: PATCH /vip/galleries/{galleryId}/assets/{assetId}/rating
echo "3. PATCH /vip/galleries/{galleryId}/assets/{assetId}/rating (resource: wi9y32)"
$AWS apigateway get-method --rest-api-id $API_ID --resource-id wi9y32 --http-method PATCH 2>&1 | grep -E "(httpMethod|type)" | head -2 || echo "NOT FOUND"
echo ""

# Route 4: POST /vip/galleries/{galleryId}/folders
echo "4. POST /vip/galleries/{galleryId}/folders (resource: 3myzx8)"
$AWS apigateway get-method --rest-api-id $API_ID --resource-id 3myzx8 --http-method POST 2>&1 | grep -E "(httpMethod|type)" | head -2 || echo "NOT FOUND"
echo ""

# Route 5: POST /vip/galleries/{galleryId}/finalize
echo "5. POST /vip/galleries/{galleryId}/finalize (resource: o3unqg)"
$AWS apigateway get-method --rest-api-id $API_ID --resource-id o3unqg --http-method POST 2>&1 | grep -E "(httpMethod|type)" | head -2 || echo "NOT FOUND"

