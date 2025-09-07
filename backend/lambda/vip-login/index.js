/**
 * VIP Login Lambda Handler
 * Authenticates VIP clients and returns JWT tokens
 */

const { createTokenPair } = require('../../utils/jwt');

// Temporary hardcoded credentials - replace with DynamoDB lookup
const VALID_CREDENTIALS = [
    { code: 'DEMO2025', password: 'VIP2025', clientId: 'client-demo-2025', clientName: 'Demo Gallery' },
    { code: 'GALLERY01', password: 'EXCLUSIVE', clientId: 'client-gallery-01', clientName: 'Gallery 01' },
    { code: 'SPRING24', password: 'PORTRAIT', clientId: 'client-spring-24', clientName: 'Spring 2024' },
    { code: 'WEDDING23', password: 'CINEMA', clientId: 'client-wedding-23', clientName: 'Wedding 2023' }
];

/**
 * Lambda handler
 */
exports.handler = async (event) => {
    // CORS headers
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };
    
    // Handle OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }
    
    try {
        // Parse request body
        const body = JSON.parse(event.body || '{}');
        const { galleryCode, password } = body;
        
        // Validate input
        if (!galleryCode || !password) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'MISSING_CREDENTIALS',
                    message: 'Gallery code and password are required'
                })
            };
        }
        
        // Find matching credentials
        const credential = VALID_CREDENTIALS.find(cred => 
            cred.code === galleryCode.toUpperCase() && 
            cred.password === password
        );
        
        if (!credential) {
            // Log failed attempt
            console.log('Failed login attempt:', { galleryCode, timestamp: new Date().toISOString() });
            
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({
                    error: 'INVALID_CREDENTIALS',
                    message: 'Invalid gallery code or password'
                })
            };
        }
        
        // Generate JWT tokens
        const tokenPayload = {
            clientId: credential.clientId,
            galleryCode: credential.code,
            clientName: credential.clientName,
            type: 'vip'
        };
        
        const tokens = createTokenPair(tokenPayload);
        
        // Log successful login
        console.log('Successful login:', { 
            clientId: credential.clientId, 
            galleryCode: credential.code,
            timestamp: new Date().toISOString() 
        });
        
        // Return tokens and client info
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Authentication successful',
                data: {
                    ...tokens,
                    client: {
                        id: credential.clientId,
                        name: credential.clientName,
                        galleryCode: credential.code
                    }
                }
            })
        };
        
    } catch (error) {
        console.error('Login error:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'SERVER_ERROR',
                message: 'An error occurred during authentication'
            })
        };
    }
};
