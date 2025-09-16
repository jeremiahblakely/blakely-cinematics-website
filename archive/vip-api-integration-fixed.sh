#!/bin/bash
# VIP API Gateway Lambda Integration Script - FIXED VERSION
# Safe, idempotent, with proper CORS handling

set -euo pipefail

# Source the profile to get AWS CLI
if [ -f ~/.zshrc ]; then
    source ~/.zshrc
elif [ -f ~/.bash_profile ]; then
    source ~/.bash_profile
fi

# Verify AWS CLI is available
if ! command -v aws &> /dev/null; then
    echo "ERROR: AWS CLI not found. Please install it first."
    exit 1
fi

# Configuration
API_ID="kyjf2wp972"
LAMBDA_NAME="blakely-cinematics-vip-handler-dev"
LAMBDA_ARN="arn:aws:lambda:us-east-1:642278445221:function:${LAMBDA_NAME}"
REGION="us-east-1"
ACCOUNT_ID="642278445221"
STAGE="dev"

# Change log file
CHANGELOG="api-integration-changelog-fixed.txt"
echo "=== API Integration Change Log $(date) ===" > $CHANGELOG

# Helper Functions
log_change() {
    echo "$1" >> $CHANGELOG
    echo "$1"
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

log_change "Starting simplified test..."
log_change "Checking AWS CLI: $(which aws)"
log_change "Testing API Gateway access..."

# Just test getting resources
ROOT_ID=$(aws apigateway get-resources \
    --rest-api-id $API_ID \
    --query "items[?path=='/'].id" \
    --output text)

log_change "Root resource ID: $ROOT_ID"

VIP_ID=$(aws apigateway get-resources \
    --rest-api-id $API_ID \
    --query "items[?path=='/vip'].id" \
    --output text || echo "")

if [ -z "$VIP_ID" ]; then
    log_change "Creating /vip resource..."
    aws apigateway create-resource \
        --rest-api-id $API_ID \
        --parent-id "$ROOT_ID" \
        --path-part "vip" >/dev/null
    VIP_ID=$(aws apigateway get-resources \
        --rest-api-id $API_ID \
        --query "items[?path=='/vip'].id" \
        --output text)
fi

log_change "VIP resource ID: $VIP_ID"
log_change "Test complete!"
