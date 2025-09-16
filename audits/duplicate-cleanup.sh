#!/bin/bash

echo '=== DUPLICATE FILE CLEANUP AUDIT ==='
echo 'Generated: '$(date)
echo ''

echo '1️⃣ BACKUP FILES TO REVIEW:'
echo '----------------------------'
find . -type f \( \
    -name '*.backup' -o \
    -name '*.bak' -o \
    -name '*-backup*' -o \
    -name '*-original*' -o \
    -name '*-fixed*' -o \
    -name '*-updated*' -o \
    -name '*.old' \
\) -not -path './.git/*' -not -path './node_modules/*' -not -path './audits/*' | while read file; do
    echo "  $file"
    if [ -f "${file%-backup*}${file##*-backup}" ] || [ -f "${file%.backup}" ] || [ -f "${file%.bak}" ]; then
        echo "    → Has active version, safe to delete backup"
    fi
done

echo ''
echo '2️⃣ LAMBDA FUNCTION DUPLICATES:'
echo '--------------------------------'
echo 'Mail-manage variations:'
ls -la backend/lambda/mail-manage/index*.js 2>/dev/null || echo '  None found'

echo ''
echo 'Mail-send variations:'
ls -la backend/lambda/mail-send/index*.js 2>/dev/null || echo '  None found'

echo ''
echo '3️⃣ HTML FILE DUPLICATES:'
echo '-------------------------'
for pattern in 'admin-mail' 'vip-dashboard' 'admin' 'vip'; do
    echo "$pattern files:"
    find . -name "*${pattern}*.html*" -not -path './.git/*' | sort
    echo ''
done

echo ''
echo '4️⃣ JAVASCRIPT DUPLICATES:'
echo '--------------------------'
for pattern in 'admin' 'vip' 'mail' 'api'; do
    echo "$pattern.js files:"
    find . -name "*${pattern}*.js" -not -path './node_modules/*' -not -path './.git/*' | grep -v min.js | sort
    echo ''
done

echo ''
echo '5️⃣ RECOMMENDED ACTIONS:'
echo '------------------------'
echo '# Remove backup files (after verifying originals work)'
echo 'rm admin-mail.html.backup-before-update'
echo 'rm vip-dashboard.html.backup'
echo ''
echo '# Remove old Lambda versions (keep only index.js)'
echo 'rm backend/lambda/mail-manage/index-original.js'
echo 'rm backend/lambda/mail-manage/index-fixed.js'
echo ''
echo '# Archive old versions to a backup folder instead'
echo 'mkdir -p .archive/2024-backups'
echo 'mv *.backup *.bak *-original* .archive/2024-backups/'
echo ''
echo '⚠️  Review each file before deleting!'
