#!/bin/bash

echo '🔧 Fixing VIP header brand spacing and size...'
echo ''

# Backup current file
cp vip-dashboard.html vip-dashboard-before-spacing-fix.html
echo '✅ Backup created: vip-dashboard-before-spacing-fix.html'

# Create temporary file with fixes
cat vip-dashboard.html | sed 's/BLAKELY <span class="vip-accent">/BLAKELY<span class="vip-accent" style="margin-left: 0.25rem;">/g' | sed 's/font-size: 1.2rem/font-size: 1.4rem/g' > vip-dashboard-temp.html

# Replace original with fixed version
mv vip-dashboard-temp.html vip-dashboard.html

echo ''
echo '✅ Updates applied:'
echo '   • Font size: 1.4rem (matching admin header)'
echo '   • Spacing: Reduced gap between BLAKELY and VIP'
echo '   • Letter spacing: 0.14em (unchanged)'
echo ''
echo 'Done! Open vip-dashboard.html to see the changes.'
