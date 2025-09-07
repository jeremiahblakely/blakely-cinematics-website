#!/bin/bash

# Simple deployment script for VIP Lambda
FUNCTION_NAME="blakely-cinematics-vip-handler-dev"

echo "📦 Creating zip file..."
zip -r vip-handler.zip index.js node_modules package.json

echo "🚀 Updating Lambda function..."
aws lambda update-function-code \
    --function-name blakely-cinematics-vip-handler-dev \
    --zip-file fileb://vip-handler.zip \
    --region us-east-1

echo "✅ Deployment complete!"
echo ""
echo "Test with: aws lambda invoke --function-name blakely-cinematics-vip-handler-dev --cli-binary-format raw-in-base64-out --payload '{\"path\":\"/health\"}' --region us-east-1 response.json"
