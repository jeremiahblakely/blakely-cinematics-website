/**
 * Theme Panel Diagnostic Script
 * Run this in DevTools Console to debug theme panel visibility issues
 */

function debugThemePanel() {
    console.log('🔍 THEME PANEL DIAGNOSTIC REPORT');
    console.log('================================');
    
    // Check if theme panel exists
    const panel = document.getElementById('themePanel');
    if (!panel) {
        console.error('❌ Theme panel not found! ThemeSwitcher may not be initialized.');
        return;
    }
    console.log('✅ Theme panel found');
    
    // Check computed styles
    const styles = window.getComputedStyle(panel);
    console.log('📊 Panel Computed Styles:');
    console.log('  Position:', styles.position);
    console.log('  Z-Index:', styles.zIndex);
    console.log('  Display:', styles.display);
    console.log('  Top:', styles.top);
    console.log('  Right:', styles.right);
    console.log('  Width:', styles.width);
    console.log('  Height:', styles.height);
    
    // Check for overflow:hidden on parents
    console.log('🔍 Checking parent containers for overflow:hidden...');
    let parent = panel.parentElement;
    let level = 1;
    while (parent && level < 10) {
        const overflow = window.getComputedStyle(parent).overflow;
        const className = parent.className || parent.tagName.toLowerCase();
        
        if (overflow === 'hidden') {
            console.warn(`⚠️  Level ${level} - ${className} has overflow:hidden`);
        } else {
            console.log(`✅ Level ${level} - ${className} overflow: ${overflow}`);
        }
        
        parent = parent.parentElement;
        level++;
    }
    
    // Test visibility
    const rect = panel.getBoundingClientRect();
    console.log('📐 Panel Bounding Rectangle:');
    console.log('  Top:', rect.top, 'Left:', rect.left);
    console.log('  Width:', rect.width, 'Height:', rect.height);
    console.log('  Visible:', rect.width > 0 && rect.height > 0);
    
    // Check if panel is in viewport
    const isInViewport = rect.top >= 0 && rect.left >= 0 && 
                        rect.bottom <= window.innerHeight && 
                        rect.right <= window.innerWidth;
    console.log('👁️  In Viewport:', isInViewport);
    
    // Test toggle function
    if (typeof toggleThemePanel === 'function') {
        console.log('✅ toggleThemePanel function available');
    } else {
        console.error('❌ toggleThemePanel function not found');
    }
    
    console.log('================================');
    console.log('🎯 DIAGNOSTIC COMPLETE');
    
    // Highlight the panel for 3 seconds
    if (panel.style.display === 'block') {
        panel.style.border = '3px solid red';
        setTimeout(() => {
            panel.style.border = '2px solid var(--accent-primary)';
        }, 3000);
    }
}

// Auto-run diagnostic
debugThemePanel();

// Make toggle function available for testing
window.testThemeToggle = function() {
    const panel = document.getElementById('themePanel');
    if (panel) {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        console.log('Panel toggled to:', panel.style.display);
    }
};

console.log('💡 Available test functions:');
console.log('  - debugThemePanel() - Run full diagnostic');
console.log('  - testThemeToggle() - Manually toggle panel');