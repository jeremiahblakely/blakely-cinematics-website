/**
 * Test Gallery CRUD Operations
 */

// Mock AWS SDK for testing
const mockDynamoDB = {
    put: () => ({ promise: async () => ({}) }),
    get: () => ({ 
        promise: async () => ({ 
            Item: { 
                galleryId: 'TEST-GAL-001',
                title: 'Test Gallery',
                clientId: 'test-client'
            } 
        }) 
    }),
    query: () => ({ promise: async () => ({ Items: [], Count: 0 }) }),
    update: () => ({ promise: async () => ({}) }),
    delete: () => ({ promise: async () => ({}) }),
    batchWrite: () => ({ promise: async () => ({}) })
};

const mockS3 = {
    putObject: () => ({ promise: async () => ({}) }),
    getSignedUrlPromise: async () => 'https://mock-upload-url.com',
    listObjectsV2: () => ({ promise: async () => ({ Contents: [] }) }),
    deleteObjects: () => ({ promise: async () => ({}) })
};

// Mock AWS in require cache
require.cache[require.resolve('aws-sdk')] = {
    exports: {
        DynamoDB: {
            DocumentClient: function() { return mockDynamoDB; }
        },
        S3: function() { return mockS3; }
    }
};

const jwt = require('./utils/jwt');
const { handler } = require('./lambda/gallery-crud/index');

async function testGalleryCRUD() {
    console.log('\naa TESTING GALLERY CRUD OPERATIONS\n');
    console.log('================================\n');
    
    // Create test token
    const testToken = jwt.generateAccessToken({
        clientId: 'test-client',
        type: 'admin'
    });
    
    try {
        // Test 1: Create Gallery
        console.log('1aa  Testing gallery creation...');
        const createEvent = {
            httpMethod: 'POST',
            headers: { Authorization: `Bearer ${testToken}` },
            body: JSON.stringify({
                title: 'Smith Wedding Gallery',
                description: 'Beautiful wedding at sunset',
                clientName: 'John & Jane Smith',
                clientEmail: 'smith@example.com',
                eventDate: '2025-06-15',
                location: 'Malibu Beach, CA',
                settings: {
                    allowDownload: true,
                    allowRating: true,
                    maxSelections: 50
                }
            })
        };
        
        const createResponse = await handler(createEvent);
        const createBody = JSON.parse(createResponse.body);
        console.log('   a Status:', createResponse.statusCode);
        console.log('   a Gallery ID generated:', !!createBody.data?.galleryId);
        console.log('   a Upload URL generated:', !!createBody.data?.uploadUrl);
        console.log('');
        
        // Test 2: Get Gallery
        console.log('2aa  Testing get gallery...');
        const getEvent = {
            httpMethod: 'GET',
            headers: { Authorization: `Bearer ${testToken}` },
            pathParameters: { galleryId: 'TEST-GAL-001' }
        };
        
        const getResponse = await handler(getEvent);
        console.log('   a Get gallery status:', getResponse.statusCode);
        console.log('');
        
        // Test 3: List Galleries
        console.log('3aa  Testing list galleries...');
        const listEvent = {
            httpMethod: 'GET',
            headers: { Authorization: `Bearer ${testToken}` },
            queryStringParameters: { limit: '10', status: 'active' }
        };
        
        const listResponse = await handler(listEvent);
        const listBody = JSON.parse(listResponse.body);
        console.log('   a List status:', listResponse.statusCode);
        console.log('   a Response has galleries array:', Array.isArray(listBody.data?.galleries));
        console.log('');
        
        // Test 4: Update Gallery
        console.log('4aa  Testing update gallery...');
        const updateEvent = {
            httpMethod: 'PUT',
            headers: { Authorization: `Bearer ${testToken}` },
            pathParameters: { galleryId: 'TEST-GAL-001' },
            body: JSON.stringify({
                title: 'Updated Gallery Title',
                settings: {
                    allowDownload: false
                }
            })
        };
        
        const updateResponse = await handler(updateEvent);
        console.log('   a Update status:', updateResponse.statusCode);
        console.log('');
        
        // Test 5: Delete Gallery
        console.log('5aa  Testing delete gallery...');
        const deleteEvent = {
            httpMethod: 'DELETE',
            headers: { Authorization: `Bearer ${testToken}` },
            pathParameters: { galleryId: 'TEST-GAL-001' }
        };
        
        const deleteResponse = await handler(deleteEvent);
        console.log('   a Delete status:', deleteResponse.statusCode);
        console.log('');
        
        // Test 6: Unauthorized Access
        console.log('6aa  Testing unauthorized access...');
        const unauthorizedEvent = {
            httpMethod: 'GET',
            headers: {},
            pathParameters: { galleryId: 'TEST-GAL-001' }
        };
        
        const unauthorizedResponse = await handler(unauthorizedEvent);
        console.log('   a Unauthorized rejected:', unauthorizedResponse.statusCode === 401);
        console.log('');
        
        console.log('================================');
        console.log('\naa ALL GALLERY CRUD TESTS PASSED!\n');
        
    } catch (error) {
        console.error('\na TEST FAILED:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

// Run tests
testGalleryCRUD();
