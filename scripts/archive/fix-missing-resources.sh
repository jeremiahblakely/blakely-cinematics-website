#!/bin/bash
set -euo pipefail

AWS=/usr/local/bin/aws
API_ID=kyjf2wp972
LAMBDA_ARN="arn:aws:lambda:us-east-1:642278445221:function:blakely-cinematics-vip-handler-dev"
REGION=us-east-1

echo "Creating missing resources for rating endpoint..."

# Resource IDs we know
ASSETS_ID=9423kf  # /vip/galleries/{galleryId}/assets

# Create {assetId} resource
echo "Creating /vip/galleries/{galleryId}/assets/{assetId}..."
ASSET_ID=$($AWS apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $ASSETS_ID \
    --path-part "{assetId}" \
    --query 'id' \
    --output text)

echo "Asset ID resource created: $ASSET_ID"

# Create rating resource
echo "Creating /vip/galleries/{galleryId}/assets/{assetId}/rating..."
RATING_ID=$($AWS apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $ASSET_ID \
    --path-part "rating" \
    --query 'id' \
    --output text)

echo "Rating resource created: $RATING_ID"

# Now create PATCH method on rating
echo "Creating PATCH method on rating..."
$AWS apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $RATING_ID \
    --http-method PATCH \
    --authorization-type NONE

$AWS apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $RATING_ID \
    --http-method PATCH \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations"

echo "Resources created. Now listing all resources..."
$AWS apigateway get-resources --rest-api-id $API_ID --query 'items[*].[path,id]' --output table

