console.log('\naa FINAL SYSTEM CHECK\n');
console.log('================================\n');

let results = {
    jwt: false,
    galleryAccess: false,
    cloudwatch: false,
    schemas: false,
    lambdas: {
        vipLogin: false,
        vipApi: false,
        refreshToken: false,
        galleryAccess: false,
        galleryCrud: false,
        assetManager: false
    }
};

// Test JWT
try {
    const jwt = require('./utils/jwt');
    const tokens = jwt.createTokenPair({ test: 'data' });
    results.jwt = !!(tokens.accessToken && tokens.refreshToken);
    console.log(results.jwt ? 'a JWT System: WORKING' : 'a JWT System: FAILED');
} catch (e) {
    console.log('a JWT System: ERROR -', e.message);
}

// Test Gallery Access
try {
    const ga = require('./utils/gallery-access');
    const token = ga.generateGalleryToken();
    results.galleryAccess = !!token;
    console.log(results.galleryAccess ? 'a Gallery Access: WORKING' : 'a Gallery Access: FAILED');
} catch (e) {
    console.log('a Gallery Access: ERROR -', e.message);
}

// Test CloudWatch
try {
    const cw = require('./utils/cloudwatch-monitor');
    results.cloudwatch = !!(cw.putMetric);
    console.log(results.cloudwatch ? 'a CloudWatch: WORKING' : 'a CloudWatch: FAILED');
} catch (e) {
    console.log('a CloudWatch: ERROR -', e.message);
}

// Test Schemas
try {
    const schemas = require('./schemas/dynamodb-tables');
    results.schemas = !!(schemas.TABLE_SCHEMAS);
    console.log(results.schemas ? 'a DB Schemas: WORKING' : 'a DB Schemas: FAILED');
} catch (e) {
    console.log('a DB Schemas: ERROR -', e.message);
}

// Test Lambda Handlers
const handlers = [
    { name: 'vipLogin', path: './lambda/vip-login/index.js' },
    { name: 'vipApi', path: './lambda/vip-api/index.js' },
    { name: 'refreshToken', path: './lambda/refresh-token/index.js' },
    { name: 'galleryAccess', path: './lambda/gallery-access/index.js' },
    { name: 'galleryCrud', path: './lambda/gallery-crud/index.js' },
    { name: 'assetManager', path: './lambda/asset-manager/index.js' }
];

handlers.forEach(({ name, path }) => {
    try {
        const handler = require(path);
        results.lambdas[name] = !!(handler.handler);
        console.log(results.lambdas[name] ? 
            `a ${name}: WORKING` : 
            `a ${name}: FAILED`);
    } catch (e) {
        console.log(`a ${name}: ERROR - ${e.message}`);
    }
});

// Summary
console.log('\n================================');
const totalPassed = Object.values(results).filter(v => 
    typeof v === 'boolean' ? v : Object.values(v).every(lv => lv)
).length;
const totalTests = Object.keys(results).length;

if (totalPassed === totalTests) {
    console.log('\naa ALL SYSTEMS OPERATIONAL!\n');
    process.exit(0);
} else {
    console.log(`\naa  ${totalTests - totalPassed} SYSTEMS NEED ATTENTION\n`);
    process.exit(1);
}
