#!/bin/bash
set -euo pipefail

AWS=/usr/local/bin/aws
API_ID=kyjf2wp972
LAMBDA_ARN="arn:aws:lambda:us-east-1:642278445221:function:blakely-cinematics-vip-handler-dev"
REGION=us-east-1

echo "Setting up VIP routes..."

# Resource IDs we know exist
GALLERY_ID=m0rfcv  # /vip/galleries/{galleryId}

# 1. Create GET /vip/galleries/{galleryId}
echo "Creating GET /vip/galleries/{galleryId}..."
$AWS apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $GALLERY_ID \
    --http-method GET \
    --authorization-type NONE 2>/dev/null || echo "Method exists"

$AWS apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $GALLERY_ID \
    --http-method GET \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations" 2>/dev/null || echo "Integration exists"

# 2. Create assets resource and GET method
echo "Creating /vip/galleries/{galleryId}/assets resource..."
ASSETS_ID=$($AWS apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $GALLERY_ID \
    --path-part "assets" \
    --query 'id' \
    --output text 2>/dev/null || $AWS apigateway get-resources \
    --rest-api-id $API_ID \
    --query "items[?path=='/vip/galleries/{galleryId}/assets'].id" \
    --output text)

echo "Assets resource ID: $ASSETS_ID"

echo "Creating GET /vip/galleries/{galleryId}/assets..."
$AWS apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $ASSETS_ID \
    --http-method GET \
    --authorization-type NONE 2>/dev/null || echo "Method exists"

$AWS apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $ASSETS_ID \
    --http-method GET \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations" 2>/dev/null || echo "Integration exists"

echo "Routes created successfully!"
