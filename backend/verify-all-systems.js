/**
 * Verify all systems are working
 */

console.log('\naa SYSTEM VERIFICATION CHECK\n');
console.log('================================\n');

let allPassed = true;

// Test 1: JWT System
try {
    const jwt = require('./utils/jwt');
    const tokens = jwt.createTokenPair({ test: 'data' });
    if (tokens.accessToken && tokens.refreshToken) {
        console.log('a JWT System: OPERATIONAL');
    } else {
        throw new Error('Token generation failed');
    }
} catch (e) {
    console.log('a JWT System: FAILED -', e.message);
    allPassed = false;
}

// Test 2: Gallery Access System
try {
    const galleryAccess = require('./utils/gallery-access');
    const token = galleryAccess.generateGalleryToken();
    const pin = galleryAccess.generateGalleryPIN();
    if (token && pin) {
        console.log('a Gallery Access: OPERATIONAL');
    } else {
        throw new Error('Access token generation failed');
    }
} catch (e) {
    console.log('a Gallery Access: FAILED -', e.message);
    allPassed = false;
}

// Test 3: CloudWatch Monitoring
try {
    const monitor = require('./utils/cloudwatch-monitor');
    if (monitor.putMetric && monitor.trackAuthEvent) {
        console.log('a CloudWatch Monitor: OPERATIONAL');
    } else {
        throw new Error('Monitor functions missing');
    }
} catch (e) {
    console.log('a CloudWatch Monitor: FAILED -', e.message);
    allPassed = false;
}

// Test 4: Database Schemas
try {
    const schemas = require('./schemas/dynamodb-tables');
    if (schemas.TABLE_SCHEMAS && schemas.S3_BUCKET_CONFIG) {
        console.log('a Database Schemas: DEFINED');
    } else {
        throw new Error('Schemas not properly defined');
    }
} catch (e) {
    console.log('a Database Schemas: FAILED -', e.message);
    allPassed = false;
}

// Test 5: Lambda Handlers
const handlers = [
    { name: 'VIP Login', path: './lambda/vip-login/index.js' },
    { name: 'VIP API', path: './lambda/vip-api/index.js' },
    { name: 'Refresh Token', path: './lambda/refresh-token/index.js' },
    { name: 'Gallery Access', path: './lambda/gallery-access/index.js' },
    { name: 'Gallery CRUD', path: './lambda/gallery-crud/index.js' }
];

handlers.forEach(({ name, path }) => {
    try {
        const handler = require(path);
        if (handler.handler && typeof handler.handler === 'function') {
            console.log(`a ${name} Lambda: READY`);
        } else {
            throw new Error('Handler function missing');
        }
    } catch (e) {
        console.log(`a ${name} Lambda: FAILED -`, e.message);
        allPassed = false;
    }
});

console.log('\n================================');
if (allPassed) {
    console.log('\naa ALL SYSTEMS OPERATIONAL!\n');
    console.log('Ready to proceed with deployment or next phase.');
} else {
    console.log('\naa  SOME SYSTEMS NEED ATTENTION\n');
    console.log('Please review the failed components above.');
}
console.log('');

process.exit(allPassed ? 0 : 1);
