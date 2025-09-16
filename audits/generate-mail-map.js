const fs = require('fs');

// Read admin-mail.html
const html = fs.readFileSync('public/admin-mail.html', 'utf8');

// Mail actions to check
const actions = [
  'compose', 'reply', 'replyAll', 'forward', 
  'archiveEmail', 'moveToFolder', 'snoozeEmail', 
  'deleteEmail', 'markAsRead', 'markAsUnread', 
  'toggleStar', 'saveDraft', 'sendReply'
];

console.log('\n=== FRONTEND → BACKEND COVERAGE MAP ===\n');

actions.forEach(action => {
  console.log(`\n${action}:`);
  
  // Check if function exists
  const funcRegex = new RegExp(`function\\s+${action}\\s*\\(`, 'i');
  const hasFunction = funcRegex.test(html);
  
  if (hasFunction) {
    console.log('  Frontend: ✓ Function exists');
    
    // Extract API endpoint from function
    const funcMatch = html.match(new RegExp(`function\\s+${action}[^}]*fetch[^}]*}`, 'si'));
    if (funcMatch) {
      const apiMatch = funcMatch[0].match(/['"`](\\/api\\/[^'"`]*)['"`]/);
      if (apiMatch) {
        console.log(`  API Path: ${apiMatch[1]}`);
        
        // Check if Lambda directory exists
        const possibleLambdaDirs = [
          `lambda/${action}`,
          `lambda/admin-${action}`,
          `lambda/${apiMatch[1].replace('/api/', '').replace(/\\//g, '-')}`
        ];
        
        let lambdaFound = false;
        for (const dir of possibleLambdaDirs) {
          if (fs.existsSync(dir)) {
            console.log(`  Lambda:   ✓ ${dir}/package.json`);
            lambdaFound = true;
            break;
          }
        }
        
        if (!lambdaFound) {
          console.log('  Lambda:   ✗ MISSING');
        }
      } else {
        console.log('  API Path: ✗ No fetch call found');
        console.log('  Lambda:   ✗ MISSING');
      }
    } else {
      console.log('  API Path: ✗ Function body not found');
      console.log('  Lambda:   ✗ MISSING');
    }
  } else {
    console.log('  Frontend: ✗ MISSING');
    console.log('  API Path: ✗ MISSING');
    console.log('  Lambda:   ✗ MISSING');
  }
});

// List actual Lambda functions
console.log('\n\n=== EXISTING LAMBDA FUNCTIONS ===\n');
try {
  const lambdaDirs = fs.readdirSync('lambda', { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
  lambdaDirs.forEach(dir => {
    if (fs.existsSync(`lambda/${dir}/package.json`)) {
      console.log(`  • lambda/${dir}/`);
    }
  });
} catch (e) {
  console.log('  No lambda directory found');
}
