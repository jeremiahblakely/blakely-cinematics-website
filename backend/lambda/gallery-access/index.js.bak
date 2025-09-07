/**
 * Gallery Access Lambda Handler
 * Manages gallery-specific authentication and access control
 */

const {
    generateGalleryCredentials,
    validateGalleryAccess,
    generateShareableURL,
    hashPIN,
    checkRateLimit
} = require('../../utils/gallery-access');

// Mock database (replace with DynamoDB in production)
const galleryAccessDB = new Map();

/**
 * Lambda handler
 */
exports.handler = async (event) => {
    // CORS headers
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Gallery-Token, X-Gallery-PIN'
    };
    
    // Handle OPTIONS
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }
    
    const { httpMethod, path, pathParameters, body: eventBody, headers: reqHeaders } = event;
    
    try {
        // Route: POST /gallery-access/create
        if (httpMethod === 'POST' && path.includes('/create')) {
            return await handleCreateAccess(eventBody, headers);
        }
        
        // Route: POST /gallery-access/validate
        if (httpMethod === 'POST' && path.includes('/validate')) {
            return await handleValidateAccess(eventBody, reqHeaders, headers);
        }
        
        // Route: GET /gallery-access/{galleryId}/info
        if (httpMethod === 'GET' && pathParameters?.galleryId) {
            return await handleGetAccessInfo(pathParameters.galleryId, reqHeaders, headers);
        }
        
        // Route: PUT /gallery-access/{galleryId}/settings
        if (httpMethod === 'PUT' && pathParameters?.galleryId) {
            return await handleUpdateSettings(pathParameters.galleryId, eventBody, headers);
        }
        
        // Route: POST /gallery-access/{galleryId}/increment-view
        if (httpMethod === 'POST' && path.includes('/increment-view')) {
            return await handleIncrementView(pathParameters.galleryId, headers);
        }
        
        // Route: DELETE /gallery-access/{galleryId}
        if (httpMethod === 'DELETE' && pathParameters?.galleryId) {
            return await handleRevokeAccess(pathParameters.galleryId, headers);
        }
        
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'NOT_FOUND', message: 'Endpoint not found' })
        };
        
    } catch (error) {
        console.error('Gallery access error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'SERVER_ERROR', message: 'Internal server error' })
        };
    }
};

/**
 * Create gallery access credentials
 */
async function handleCreateAccess(eventBody, headers) {
    const body = JSON.parse(eventBody || '{}');
    const { galleryId, options = {} } = body;
    
    if (!galleryId) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                error: 'INVALID_REQUEST',
                message: 'Gallery ID is required'
            })
        };
    }
    
    // Check if access already exists
    if (galleryAccessDB.has(galleryId)) {
        return {
            statusCode: 409,
            headers,
            body: JSON.stringify({
                error: 'ALREADY_EXISTS',
                message: 'Gallery access already exists'
            })
        };
    }
    
    // Generate credentials
    const credentials = generateGalleryCredentials(galleryId, options);
    
    // Store with hashed PIN
    const storedCredentials = {
        ...credentials,
        pinHash: hashPIN(credentials.pin),
        pin: undefined // Don't store plain PIN
    };
    
    galleryAccessDB.set(galleryId, storedCredentials);
    
    // Generate shareable URL
    const shareableURL = generateShareableURL(
        process.env.BASE_URL || 'https://blakelycinematics.com',
        galleryId,
        credentials.accessToken
    );
    
    // Log creation
    console.log('Gallery access created:', {
        galleryId,
        expiresAt: credentials.expiresAt,
        maxViews: credentials.maxViews
    });
    
    return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
            success: true,
            message: 'Gallery access created',
            data: {
                galleryId,
                accessToken: credentials.accessToken,
                pin: credentials.pin, // Return PIN only on creation
                shareableURL,
                expiresAt: credentials.expiresAt,
                settings: {
                    maxViews: credentials.maxViews,
                    allowDownload: credentials.allowDownload,
                    allowRating: credentials.allowRating,
                    allowComments: credentials.allowComments,
                    requireEmail: credentials.requireEmail
                }
            }
        })
    };
}

/**
 * Validate gallery access
 */
async function handleValidateAccess(eventBody, reqHeaders, headers) {
    const body = JSON.parse(eventBody || '{}');
    const { galleryId, token, pin } = body;
    
    // Also check headers for token/PIN
    const headerToken = reqHeaders['X-Gallery-Token'] || reqHeaders['x-gallery-token'];
    const headerPIN = reqHeaders['X-Gallery-PIN'] || reqHeaders['x-gallery-pin'];
    
    const accessToken = token || headerToken;
    const accessPIN = pin || headerPIN;
    
    if (!galleryId || (!accessToken && !accessPIN)) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                error: 'INVALID_REQUEST',
                message: 'Gallery ID and either token or PIN required'
            })
        };
    }
    
    // Check rate limit
    const identifier = accessToken || accessPIN || reqHeaders['X-Forwarded-For'] || 'unknown';
    const rateLimit = await checkRateLimit(identifier, 100);
    
    if (!rateLimit.allowed) {
        return {
            statusCode: 429,
            headers: {
                ...headers,
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': rateLimit.resetAt.toISOString()
            },
            body: JSON.stringify({
                error: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many requests',
                retryAfter: rateLimit.resetAt
            })
        };
    }
    
    // Get stored credentials
    const credentials = galleryAccessDB.get(galleryId);
    
    // Validate access
    const validation = validateGalleryAccess(credentials, accessToken, accessPIN);
    
    if (!validation.valid) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({
                error: validation.error,
                message: validation.message
            })
        };
    }
    
    // Increment view count if validated
    if (credentials) {
        credentials.viewCount++;
        galleryAccessDB.set(galleryId, credentials);
    }
    
    return {
        statusCode: 200,
        headers: {
            ...headers,
            'X-RateLimit-Remaining': rateLimit.remaining.toString()
        },
        body: JSON.stringify({
            success: true,
            message: 'Access granted',
            data: {
                galleryId,
                method: validation.method,
                permissions: validation.permissions,
                viewCount: credentials.viewCount,
                remainingViews: credentials.maxViews ? 
                    Math.max(0, credentials.maxViews - credentials.viewCount) : null
            }
        })
    };
}

/**
 * Get gallery access info (admin only)
 */
async function handleGetAccessInfo(galleryId, reqHeaders, headers) {
    // TODO: Add admin authentication check
    
    const credentials = galleryAccessDB.get(galleryId);
    
    if (!credentials) {
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({
                error: 'NOT_FOUND',
                message: 'Gallery access not found'
            })
        };
    }
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            data: {
                galleryId,
                accessToken: credentials.accessToken,
                createdAt: credentials.createdAt,
                expiresAt: credentials.expiresAt,
                viewCount: credentials.viewCount,
                maxViews: credentials.maxViews,
                settings: {
                    allowDownload: credentials.allowDownload,
                    allowRating: credentials.allowRating,
                    allowComments: credentials.allowComments,
                    requireEmail: credentials.requireEmail
                }
            }
        })
    };
}

/**
 * Update gallery access settings
 */
async function handleUpdateSettings(galleryId, eventBody, headers) {
    // TODO: Add admin authentication check
    
    const body = JSON.parse(eventBody || '{}');
    const credentials = galleryAccessDB.get(galleryId);
    
    if (!credentials) {
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({
                error: 'NOT_FOUND',
                message: 'Gallery access not found'
            })
        };
    }
    
    // Update settings
    if (body.maxViews !== undefined) credentials.maxViews = body.maxViews;
    if (body.allowDownload !== undefined) credentials.allowDownload = body.allowDownload;
    if (body.allowRating !== undefined) credentials.allowRating = body.allowRating;
    if (body.allowComments !== undefined) credentials.allowComments = body.allowComments;
    if (body.requireEmail !== undefined) credentials.requireEmail = body.requireEmail;
    
    // Update expiration
    if (body.expiryDays !== undefined) {
        if (body.expiryDays === null) {
            credentials.expiresAt = null;
        } else {
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + body.expiryDays);
            credentials.expiresAt = expiryDate.toISOString();
        }
    }
    
    galleryAccessDB.set(galleryId, credentials);
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            message: 'Settings updated',
            data: {
                galleryId,
                settings: {
                    maxViews: credentials.maxViews,
                    allowDownload: credentials.allowDownload,
                    allowRating: credentials.allowRating,
                    allowComments: credentials.allowComments,
                    requireEmail: credentials.requireEmail,
                    expiresAt: credentials.expiresAt
                }
            }
        })
    };
}

/**
 * Increment view count
 */
async function handleIncrementView(galleryId, headers) {
    const credentials = galleryAccessDB.get(galleryId);
    
    if (!credentials) {
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({
                error: 'NOT_FOUND',
                message: 'Gallery access not found'
            })
        };
    }
    
    credentials.viewCount++;
    galleryAccessDB.set(galleryId, credentials);
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            data: {
                viewCount: credentials.viewCount,
                remainingViews: credentials.maxViews ? 
                    Math.max(0, credentials.maxViews - credentials.viewCount) : null
            }
        })
    };
}

/**
 * Revoke gallery access
 */
async function handleRevokeAccess(galleryId, headers) {
    // TODO: Add admin authentication check
    
    if (!galleryAccessDB.has(galleryId)) {
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({
                error: 'NOT_FOUND',
                message: 'Gallery access not found'
            })
        };
    }
    
    galleryAccessDB.delete(galleryId);
    
    console.log('Gallery access revoked:', { galleryId });
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            message: 'Gallery access revoked'
        })
    };
}

/**
 * TODO: Production enhancements
 * 1. Replace Map with DynamoDB for persistence
 * 2. Implement proper admin authentication
 * 3. Add Redis for rate limiting
 * 4. Implement email verification flow
 * 5. Add CloudWatch metrics and alarms
 * 6. Generate and store QR codes in S3
 * 7. Add webhook notifications for access events
 */
