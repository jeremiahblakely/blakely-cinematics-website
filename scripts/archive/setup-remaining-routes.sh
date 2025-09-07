
echo "Creating PATCH /vip/galleries/{galleryId}/assets/{assetId}/rating..."
$AWS apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $RATING_ID \
    --http-method PATCH \
    --authorization-type NONE 2>/dev/null || echo "Method exists"

$AWS apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $RATING_ID \
    --http-method PATCH \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations" 2>/dev/null || echo "Integration exists"

# Add OPTIONS for CORS preflight on rating
echo "Creating OPTIONS for rating (CORS preflight)..."
$AWS apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $RATING_ID \
    --http-method OPTIONS \
    --authorization-type NONE 2>/dev/null || echo "Method exists"

$AWS apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $RATING_ID \
    --http-method OPTIONS \
    --type MOCK \
    --request-templates '{"application/json":"{\"statusCode\":200}"}' 2>/dev/null || echo "Integration exists"

$AWS apigateway put-method-response \
    --rest-api-id $API_ID \
    --resource-id $RATING_ID \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{
        "method.response.header.Access-Control-Allow-Origin": true,
        "method.response.header.Access-Control-Allow-Methods": true,
        "method.response.header.Access-Control-Allow-Headers": true
    }' 2>/dev/null || echo "Method response exists"

$AWS apigateway put-integration-response \
    --rest-api-id $API_ID \
    --resource-id $RATING_ID \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{
        "method.response.header.Access-Control-Allow-Origin": "'\''https://d2fbkl7vcfz5f7.amplifyapp.com,https://www.blakelycinematics.com,https://blakelycinematics.com,http://localhost:5173,http://localhost:8080,http://127.0.0.1:5500'\''",
        "method.response.header.Access-Control-Allow-Methods": "'\''GET,POST,DELETE,PATCH,OPTIONS'\''",
        "method.response.header.Access-Control-Allow-Headers": "'\''Content-Type,Authorization'\''"
    }' 2>/dev/null || echo "Integration response exists"

# 4. Create POST /vip/galleries/{galleryId}/folders
echo "Creating POST /vip/galleries/{galleryId}/folders..."
$AWS apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $FOLDERS_ID \
    --http-method POST \
    --authorization-type NONE 2>/dev/null || echo "Method exists"

$AWS apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $FOLDERS_ID \
    --http-method POST \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations" 2>/dev/null || echo "Integration exists"

# Add OPTIONS for CORS preflight on folders
echo "Creating OPTIONS for folders (CORS preflight)..."
$AWS apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $FOLDERS_ID \
    --http-method OPTIONS \
    --authorization-type NONE 2>/dev/null || echo "Method exists"

$AWS apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $FOLDERS_ID \
    --http-method OPTIONS \
    --type MOCK \
    --request-templates '{"application/json":"{\"statusCode\":200}"}' 2>/dev/null || echo "Integration exists"

$AWS apigateway put-method-response \
    --rest-api-id $API_ID \
    --resource-id $FOLDERS_ID \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{
        "method.response.header.Access-Control-Allow-Origin": true,
        "method.response.header.Access-Control-Allow-Methods": true,
        "method.response.header.Access-Control-Allow-Headers": true
    }' 2>/dev/null || echo "Method response exists"

$AWS apigateway put-integration-response \
    --rest-api-id $API_ID \
    --resource-id $FOLDERS_ID \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{
        "method.response.header.Access-Control-Allow-Origin": "'\''https://d2fbkl7vcfz5f7.amplifyapp.com,https://www.blakelycinematics.com,https://blakelycinematics.com,http://localhost:5173,http://localhost:8080,http://127.0.0.1:5500'\''",
        "method.response.header.Access-Control-Allow-Methods": "'\''GET,POST,DELETE,PATCH,OPTIONS'\''",
        "method.response.header.Access-Control-Allow-Headers": "'\''Content-Type,Authorization'\''"
    }' 2>/dev/null || echo "Integration response exists"

# 5. Create POST /vip/galleries/{galleryId}/finalize
echo "Creating POST /vip/galleries/{galleryId}/finalize..."
$AWS apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $FINALIZE_ID \
    --http-method POST \
    --authorization-type NONE 2>/dev/null || echo "Method exists"

$AWS apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $FINALIZE_ID \
    --http-method POST \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations" 2>/dev/null || echo "Integration exists"

# Add OPTIONS for CORS preflight on finalize
echo "Creating OPTIONS for finalize (CORS preflight)..."
$AWS apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $FINALIZE_ID \
    --http-method OPTIONS \
    --authorization-type NONE 2>/dev/null || echo "Method exists"

$AWS apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $FINALIZE_ID \
    --http-method OPTIONS \
    --type MOCK \
    --request-templates '{"application/json":"{\"statusCode\":200}"}' 2>/dev/null || echo "Integration exists"

$AWS apigateway put-method-response \
    --rest-api-id $API_ID \
    --resource-id $FINALIZE_ID \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{
        "method.response.header.Access-Control-Allow-Origin": true,
        "method.response.header.Access-Control-Allow-Methods": true,
        "method.response.header.Access-Control-Allow-Headers": true
    }' 2>/dev/null || echo "Method response exists"

$AWS apigateway put-integration-response \
    --rest-api-id $API_ID \
    --resource-id $FINALIZE_ID \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{
        "method.response.header.Access-Control-Allow-Origin": "'\''https://d2fbkl7vcfz5f7.amplifyapp.com,https://www.blakelycinematics.com,https://blakelycinematics.com,http://localhost:5173,http://localhost:8080,http://127.0.0.1:5500'\''",
        "method.response.header.Access-Control-Allow-Methods": "'\''GET,POST,DELETE,PATCH,OPTIONS'\''",
        "method.response.header.Access-Control-Allow-Headers": "'\''Content-Type,Authorization'\''"
    }' 2>/dev/null || echo "Integration response exists"

echo "All routes created successfully!"
echo "Now deploying to dev stage..."

# Deploy to dev stage
DEPLOYMENT_ID=$($AWS apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name dev \
    --description "VIP Lambda proxy routes with CORS" \
    --query 'id' \
    --output text)

echo "✅ Deployed with ID: $DEPLOYMENT_ID"
echo ""
echo "📋 Summary:"
echo "  - GET /vip/galleries/{galleryId}"
echo "  - GET /vip/galleries/{galleryId}/assets"
echo "  - PATCH /vip/galleries/{galleryId}/assets/{assetId}/rating"
echo "  - POST /vip/galleries/{galleryId}/folders"
echo "  - POST /vip/galleries/{galleryId}/finalize"
echo "  - OPTIONS for CORS preflight on PATCH and POST routes"
echo ""
echo "🔗 API Endpoint: https://${API_ID}.execute-api.${REGION}.amazonaws.com/dev"

