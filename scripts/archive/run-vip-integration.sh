#!/bin/bash
# Direct execution with full AWS path

# Use the full path to AWS CLI
AWS=/usr/local/bin/aws

# Test AWS CLI
echo "Testing AWS CLI..."
$AWS --version

# Configuration
API_ID="kyjf2wp972"
LAMBDA_NAME="blakely-cinematics-vip-handler-dev"
REGION="us-east-1"

echo "Getting current API resources..."
$AWS apigateway get-resources --rest-api-id $API_ID --query 'items[*].[path,id]' --output table

echo ""
echo "Now running the main integration..."
echo "This will create/verify 5 VIP routes"
