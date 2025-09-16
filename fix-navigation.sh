#!/bin/bash
cd /Users/jeremiahblakely/Desktop/blakely-cinematics-website

echo '=== FIXING NAVIGATION ACROSS ALL PAGES ==='

# Fix public/pages files
for file in public/pages/*.html; do
    if [ -f "$file" ]; then
        echo "Fixing $(basename $file)"
        # Fix home/logo link
        sed -i '' 's|href="#home"|href="../../index.html"|g' "$file"
        # Fix portfolio and contact
        sed -i '' 's|href="#portfolio"|href="../../index.html#portfolio"|g' "$file"
        sed -i '' 's|href="#contact"|href="../../index.html#contact"|g' "$file"
        # Fix VIP
        sed -i '' 's|href="vip/vip-login.html"|href="../../vip/vip-login.html"|g' "$file"
    fi
done

# Fix vip files  
for file in vip/*.html; do
    if [ -f "$file" ]; then
        echo "Fixing $(basename $file)"
        # Fix home/logo link
        sed -i '' 's|href="#home"|href="../index.html"|g' "$file"
        # Fix portfolio and contact
        sed -i '' 's|href="#portfolio"|href="../index.html#portfolio"|g' "$file"
        sed -i '' 's|href="#contact"|href="../index.html#contact"|g' "$file"
    fi
done

echo 'Navigation fixed!'
