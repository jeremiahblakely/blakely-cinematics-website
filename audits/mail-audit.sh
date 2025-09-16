#!/bin/bash

echo '=== MAIL FEATURE AUDIT ==='
echo ''

# Frontend mail actions to check
actions=(
  'compose'
  'reply'
  'replyAll'
  'forward'
  'archiveEmail'
  'moveToFolder'
  'snoozeEmail'
  'deleteEmail'
  'markAsRead'
  'markAsUnread'
  'toggleStar'
  'saveDraft'
  'sendReply'
)

echo 'FRONTEND -> BACKEND MAPPING'
echo '============================'
echo ''

for action in "${actions[@]}"; do
  echo "Action: $action"
  
  # Check if function exists in admin-mail.html
  if grep -q "function $action" public/admin-mail.html 2>/dev/null; then
    echo "  ✓ Frontend function found"
    
    # Extract the API endpoint from the function
    endpoint=$(grep -A 10 "function $action" public/admin-mail.html | grep -oE "['/]api/[^'\"]*" | head -1)
    if [ ! -z "$endpoint" ]; then
      echo "  → API endpoint: $endpoint"
      
      # Check if Lambda exists
      lambda_name=$(echo $endpoint | sed 's|/api/||' | sed 's|/|-|g')
      if [ -d "lambda/$lambda_name" ] || [ -d "lambda/admin-$action" ]; then
        echo "  ✓ Lambda directory found"
      else
        echo "  ✗ Lambda directory NOT found"
      fi
      
      # Check Terraform for API Gateway route
      if grep -q "$action\|$(echo $endpoint | sed 's|/api/||')" terraform/*.tf 2>/dev/null; then
        echo "  ✓ Terraform API route found"
      else
        echo "  ✗ Terraform API route NOT found"
      fi
    else
      echo "  ✗ No API endpoint found in function"
    fi
  else
    echo "  ✗ Frontend function NOT found"
  fi
  echo ''
done

echo ''
echo '=== LAMBDA FUNCTIONS INVENTORY ==='
ls -d lambda/*/ 2>/dev/null | sed 's|lambda/||' | sed 's|/||'

echo ''
echo '=== API GATEWAY ROUTES IN TERRAFORM ==='
grep -h 'path_part\|route_key' terraform/*.tf 2>/dev/null | grep -v '#' | sort -u
