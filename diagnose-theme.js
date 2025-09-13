// Theme Diagnostic Script
// Run this in the browser console on admin-mail.html

console.log('=== THEME DIAGNOSTIC ===');

// 1. Check if reply box exists
const replyBox = document.getElementById('replyBox');
const replyBoxClass = document.querySelector('.reply-box');
console.log('Reply box by ID:', replyBox);
console.log('Reply box by class:', replyBoxClass);

// 2. Check current classes on reply box
if (replyBox) {
    console.log('Current reply box classes:', replyBox.className);
    console.log('Reply box display style:', replyBox.style.display);
}

// 3. Check if applyTheme function exists
console.log('applyTheme function exists:', typeof window.applyTheme);

// 4. Test applying a theme manually
if (replyBox) {
    console.log('\nManually applying metallic theme...');
    replyBox.classList.remove('compose-default', 'compose-metallic', 'compose-glass', 'compose-solid', 'compose-holo');
    replyBox.classList.add('compose-metallic');
    console.log('New classes:', replyBox.className);
    console.log('Check if visual change occurred');
}

// 5. Check if theme classes exist in CSS
const styleSheets = Array.from(document.styleSheets);
let themeRulesFound = false;
styleSheets.forEach(sheet => {
    try {
        const rules = Array.from(sheet.cssRules || sheet.rules);
        rules.forEach(rule => {
            if (rule.selectorText && rule.selectorText.includes('.reply-box.compose-')) {
                console.log('Found theme rule:', rule.selectorText);
                themeRulesFound = true;
            }
        });
    } catch(e) {}
});
console.log('Theme CSS rules found:', themeRulesFound);

// 6. Check localStorage
console.log('\nSaved theme:', localStorage.getItem('composeTheme'));

// 7. Test the actual applyTheme function
console.log('\nTesting applyTheme function...');
if (typeof window.applyTheme === 'function') {
    window.applyTheme('glass');
    setTimeout(() => {
        const updatedBox = document.getElementById('replyBox');
        console.log('After applyTheme(glass):', updatedBox ? updatedBox.className : 'Reply box not found');
    }, 100);
}
