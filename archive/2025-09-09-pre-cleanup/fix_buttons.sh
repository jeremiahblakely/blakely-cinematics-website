#!/bin/bash

echo 'Fixing Select All and Reset Ratings buttons...'

# Backup current file
cp vip-dashboard.html vip-dashboard-before-button-fix.html

# Create Python script inline
python3 << 'PYTHON'
import re

with open('vip-dashboard.html', 'r') as f:
    content = f.read()

# Find the script section
script_start = content.find('<script>')
script_end = content.rfind('</script>')

if script_start != -1 and script_end != -1:
    # Add/update the functions
    new_functions = '''
    
    // Fixed Toggle Select All
    function toggleSelectAll() {
        const btn = document.getElementById("selectAllBtn");
        const isSelecting = btn.textContent === "Select All";
        
        // Get all gallery items in current view
        const items = document.querySelectorAll(".gallery-item, .list-item");
        let visibleItems = [];
        
        items.forEach(item => {
            if (item.offsetParent !== null) {
                visibleItems.push(item);
            }
        });
        
        // Toggle selection
        visibleItems.forEach(item => {
            const checkbox = item.querySelector("input[type=checkbox]");
            if (checkbox) {
                checkbox.checked = isSelecting;
                if (isSelecting) {
                    item.classList.add("selected");
                } else {
                    item.classList.remove("selected");
                }
            }
        });
        
        // Update button
        btn.textContent = isSelecting ? "Deselect All" : "Select All";
        
        // Update selection count
        const count = document.querySelector(".selection-count");
        if (count) {
            count.textContent = isSelecting ? visibleItems.length + " items" : "0 items";
        }
    }
    
    // Fixed Reset Ratings
    function resetAllRatings() {
        if (confirm("Reset all ratings to 0 stars?")) {
            document.querySelectorAll(".star-rating").forEach(rating => {
                rating.querySelectorAll(".star").forEach(star => {
                    star.classList.remove("filled");
                });
            });
            
            // Visual feedback
            const btn = document.getElementById("resetRatingsBtn");
            btn.textContent = "Ratings Reset!";
            btn.style.color = "#22C55E";
            setTimeout(() => {
                btn.textContent = "Reset Ratings";
                btn.style.color = "";
            }, 2000);
        }
    }'''
    
    # Insert before closing script tag
    content = content[:script_end] + new_functions + content[script_end:]
    
    with open('vip-dashboard.html', 'w') as f:
        f.write(content)
    
    print("Functions updated successfully!")

PYTHON

echo ''
echo '✅ Button functions have been fixed!'
echo '   • Select All now works with visible gallery items'
echo '   • Reset Ratings clears all star ratings'
echo ''
