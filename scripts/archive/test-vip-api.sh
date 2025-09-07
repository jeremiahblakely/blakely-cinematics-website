#!/bin/bash
set -euo pipefail

API_URL="https://kyjf2wp972.execute-api.us-east-1.amazonaws.com/dev"
echo "=== VIP API Test Results ===" > test-results.txt
echo "Testing API: $API_URL" >> test-results.txt
echo "" >> test-results.txt

# Test 1: Health check (baseline)
echo "Test 1: Health Check" | tee -a test-results.txt
echo "---------------------" >> test-results.txt
curl -i -X GET "${API_URL}/health" >> test-results.txt 2>&1
echo "" >> test-results.txt

# Test 2: Gallery Details
echo "Test 2: Gallery Details" | tee -a test-results.txt
echo "------------------------" >> test-results.txt
curl -i -X GET \
    -H "Origin: https://d2fbkl7vcfz5f7.amplifyapp.com" \
    "${API_URL}/vip/galleries/test-gallery-123" >> test-results.txt 2>&1
echo "" >> test-results.txt

# Test 3: Gallery Assets
echo "Test 3: Gallery Assets" | tee -a test-results.txt
echo "-----------------------" >> test-results.txt
curl -i -X GET \
    -H "Origin: http://localhost:5173" \
    "${API_URL}/vip/galleries/test-gallery-123/assets" >> test-results.txt 2>&1
echo "" >> test-results.txt

# Test 4: Asset Rating
echo "Test 4: Asset Rating" | tee -a test-results.txt
echo "---------------------" >> test-results.txt
curl -i -X PATCH \
    -H "Origin: https://blakelycinematics.com" \
    -H "Content-Type: application/json" \
    -d '{"rating": 5}' \
    "${API_URL}/vip/galleries/test-gallery-123/assets/asset-456/rating" >> test-results.txt 2>&1
echo "" >> test-results.txt

# Test 5: Create Folder
echo "Test 5: Create Folder" | tee -a test-results.txt
echo "----------------------" >> test-results.txt
curl -i -X POST \
    -H "Origin: http://localhost:8080" \
    -H "Content-Type: application/json" \
    -d '{"name": "Test Folder", "parentId": null}' \
    "${API_URL}/vip/galleries/test-gallery-123/folders" >> test-results.txt 2>&1
echo "" >> test-results.txt

# Test 6: Finalize Selection
echo "Test 6: Finalize Selection" | tee -a test-results.txt
echo "---------------------------" >> test-results.txt
curl -i -X POST \
    -H "Origin: https://www.blakelycinematics.com" \
    -H "Content-Type: application/json" \
    -d '{"assetIds": ["asset-1", "asset-2"]}' \
    "${API_URL}/vip/galleries/test-gallery-123/finalize" >> test-results.txt 2>&1
echo "" >> test-results.txt

# Test 7: CORS Preflight
echo "Test 7: CORS Preflight" | tee -a test-results.txt
echo "-----------------------" >> test-results.txt
curl -i -X OPTIONS \
    -H "Origin: https://d2fbkl7vcfz5f7.amplifyapp.com" \
    -H "Access-Control-Request-Method: PATCH" \
    -H "Access-Control-Request-Headers: Content-Type,Authorization" \
    "${API_URL}/vip/galleries/test-gallery-123/assets/asset-456/rating" >> test-results.txt 2>&1
echo "" >> test-results.txt

# Test 8: Negative Test (404 with CORS)
echo "Test 8: 404 with CORS" | tee -a test-results.txt
echo "----------------------" >> test-results.txt
curl -i -X GET \
    -H "Origin: https://d2fbkl7vcfz5f7.amplifyapp.com" \
    "${API_URL}/vip/galleries/nonexistent-gallery/assets" >> test-results.txt 2>&1
echo "" >> test-results.txt

echo ""
echo "✅ Tests complete! Results saved to test-results.txt"
echo ""
echo "Quick summary:"
grep "HTTP/" test-results.txt | head -8

