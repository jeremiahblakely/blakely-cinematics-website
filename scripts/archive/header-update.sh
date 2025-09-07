#!/bin/bash

# Create backup
cp admin-galleries.html admin-galleries.backup.html

# Update the header section
sed -i '' '/<header class="main-header"/,/<\/header>/{
    s|<div class="logo">|<a href="/admin-dashboard.html" style="text-decoration: none; color: inherit;"><div class="logo">|
    s|<span class="logo-blakely">BLAKELY</span> <span class="logo-cinematics">CINEMATICS</span>|<span class="logo-blakely">BLAKELY ADMIN</span> <span style="color: var(--text-muted); margin: 0 8px;">|</span> <span style="color: var(--text-secondary);">GALLERIES</span>|
    s|</div>|</div></a>|
}' admin-galleries.html

# Update the logout link to go to admin login
sed -i '' 's|<a href="#" class="btn-outline">Log Out</a>|<a href="/admin-login.html" class="btn-outline">Log Out</a>|' admin-galleries.html

echo 'Header updated successfully!'
