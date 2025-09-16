#!/bin/bash

echo '================================================='
echo 'MAIL FEATURE FRONTEND → BACKEND COVERAGE REPORT'
echo '================================================='
echo ''
echo 'Date: '$(date)
echo 'Repository: blakely-cinematics-website'
echo ''

# List of mail actions to check
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

echo 'COVERAGE SUMMARY'
echo '----------------'
echo ''

for action in "${actions[@]}"; do
  printf "%-15s: " "$action"
  
  # Check frontend function
  if grep -q "function $action" public/admin-mail.html 2>/dev/null; then
    printf "Frontend ✓  "
    
    # Try to find API endpoint
    endpoint=$(grep -A10 "function $action" public/admin-mail.html 2>/dev/null | grep -oE '['\''"]*/api/[^'\''"]*' | head -1 | tr -d '\''"')
    
    if [ ! -z "$endpoint" ]; then
      printf "API: %-25s  " "$endpoint"
      
      # Check for Lambda
      lambda_name=$(echo $endpoint | sed 's|/api/||' | tr '/' '-')
      if [ -d "lambda/$lambda_name" ] || [ -d "lambda/$action" ]; then
        printf "Lambda ✓"
      else
        printf "Lambda ✗ (MISSING)"
      fi
    else
      printf "API: MISSING                    Lambda: N/A"
    fi
  else
    printf "Frontend ✗ (MISSING)"
  fi
  echo
done

echo ''
echo 'BACKEND INFRASTRUCTURE CHECK'
echo '----------------------------'
echo ''

if [ -d lambda ]; then
  echo 'Lambda functions found:'
  ls -d lambda/*/ 2>/dev/null | sed 's|lambda/||' | sed 's|/||' | sed 's/^/  • /'
else
  echo '✗ No lambda directory found'
fi

echo ''
if [ -d terraform ]; then
  echo 'Terraform configuration found:'
  ls terraform/*.tf 2>/dev/null | xargs -n1 basename | sed 's/^/  • /'
else
  echo '✗ No terraform directory found'
fi

echo ''
echo 'RECOMMENDATION'
echo '--------------'
echo 'Based on this audit, the following backend implementations are needed:'
echo ''

for action in "${actions[@]}"; do
  if ! grep -q "function $action" public/admin-mail.html 2>/dev/null; then
    echo "  • Implement frontend function: $action()"
  elif [ -d lambda ]; then
    if ! ls lambda | grep -q "$action" 2>/dev/null; then
      echo "  • Create Lambda function: lambda/$action/"
    fi
  fi
done
