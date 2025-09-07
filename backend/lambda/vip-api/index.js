/**
 * VIP API Lambda Handler
 * Protected endpoints for VIP gallery operations with JWT authentication
 */

const { verifyAccessToken, extractTokenFromHeader } = require('../../utils/jwt');

/**
 * Auth middleware - validates JWT token
 */
const authenticate = (authHeader) => {
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
        return {
            isValid: false,
            error: 'NO_TOKEN',
            message: 'Authorization token is required'
        };
    }
    
    const result = verifyAccessToken(token);
    
    if (!result.valid) {
        return {
            isValid: false,
            error: 'INVALID_TOKEN',
            message: result.error === 'Token expired' ? 'Token has expired' : 'Invalid token'
        };
    }
    
    return {
        isValid: true,
        user: result.payload
    };
};

/**
 * Lambda handler
 */
exports.handler = async (event) => {
    // CORS headers
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true'
    };
    
    // Handle OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }
    
    // Authenticate all non-OPTIONS requests
    const authResult = authenticate(event.headers.Authorization || event.headers.authorization);
    
    if (!authResult.isValid) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({
                error: authResult.error,
                message: authResult.message
            })
        };
    }
    
    // Extract user context from token
    const user = authResult.user;
    const { httpMethod, path, pathParameters, queryStringParameters, body } = event;
    
    try {
        // Route handling
        const route = `${httpMethod} ${path}`;
        
        // Gallery endpoints
        if (route.startsWith('GET /vip/galleries/') && pathParameters?.galleryId) {
            return handleGetGallery(pathParameters.galleryId, user, headers);
        }
        
        if (route.startsWith('GET /vip/galleries/') && route.includes('/assets')) {
            return handleGetAssets(pathParameters?.galleryId, queryStringParameters, user, headers);
        }
        
        if (route.startsWith('PATCH /vip/galleries/') && route.includes('/assets/') && route.includes('/rating')) {
            return handleUpdateRating(pathParameters, body, user, headers);
        }
        
        if (route.startsWith('POST /vip/galleries/') && route.includes('/folders')) {
            return handleCreateFolder(pathParameters?.galleryId, body, user, headers);
        }
        
        if (route.startsWith('DELETE /vip/galleries/') && route.includes('/folders/')) {
            return handleDeleteFolder(pathParameters, user, headers);
        }
        
        if (route.startsWith('POST /vip/galleries/') && route.includes('/trash')) {
            return handleTrashAssets(pathParameters?.galleryId, body, user, headers);
        }
        
        if (route.startsWith('POST /vip/galleries/') && route.includes('/restore')) {
            return handleRestoreAssets(pathParameters?.galleryId, body, user, headers);
        }
        
        if (route.startsWith('POST /vip/galleries/') && route.includes('/finalize')) {
            return handleFinalizeGallery(pathParameters?.galleryId, body, user, headers);
        }
        
        // Default 404
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({
                error: 'NOT_FOUND',
                message: 'Endpoint not found'
            })
        };
        
    } catch (error) {
        console.error('VIP API error:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'SERVER_ERROR',
                message: 'An error occurred processing your request'
            })
        };
    }
};

/**
 * Handler functions for each endpoint
 */

async function handleGetGallery(galleryId, user, headers) {
    // Verify user has access to this gallery
    if (user.galleryCode !== galleryId && !galleryId.startsWith(user.galleryCode)) {
        return {
            statusCode: 403,
            headers,
            body: JSON.stringify({
                error: 'FORBIDDEN',
                message: 'Access denied to this gallery'
            })
        };
    }
    
    // TODO: Fetch from DynamoDB
    const mockGallery = {
        galleryId,
        clientId: user.clientId,
        clientName: user.clientName,
        title: `${user.clientName} Gallery`,
        assetCount: 24,
        createdAt: new Date().toISOString(),
        status: 'active'
    };
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            data: mockGallery
        })
    };
}

async function handleGetAssets(galleryId, queryParams, user, headers) {
    // Verify access
    if (user.galleryCode !== galleryId && !galleryId.startsWith(user.galleryCode)) {
        return {
            statusCode: 403,
            headers,
            body: JSON.stringify({
                error: 'FORBIDDEN',
                message: 'Access denied to this gallery'
            })
        };
    }
    
    const page = parseInt(queryParams?.page || '1');
    const limit = parseInt(queryParams?.limit || '50');
    const folderId = queryParams?.folderId;
    
    // TODO: Fetch from DynamoDB/S3
    const mockAssets = Array.from({ length: 24 }, (_, i) => ({
        assetId: `asset-${i + 1}`,
        filename: `image-${i + 1}.jpg`,
        url: `https://via.placeholder.com/400x300?text=Image+${i + 1}`,
        thumbnailUrl: `https://via.placeholder.com/200x150?text=Thumb+${i + 1}`,
        rating: 0,
        isFavorite: false,
        isFinalized: false,
        folderId: folderId || null,
        metadata: {
            width: 4000,
            height: 3000,
            size: 2048576,
            mimeType: 'image/jpeg'
        }
    }));
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            data: {
                assets: mockAssets.slice((page - 1) * limit, page * limit),
                pagination: {
                    page,
                    limit,
                    total: mockAssets.length,
                    totalPages: Math.ceil(mockAssets.length / limit)
                }
            }
        })
    };
}

async function handleUpdateRating(pathParams, body, user, headers) {
    const { galleryId, assetId } = pathParams;
    const { rating } = JSON.parse(body || '{}');
    
    // Validate rating
    if (typeof rating !== 'number' || rating < 0 || rating > 5) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                error: 'INVALID_RATING',
                message: 'Rating must be a number between 0 and 5'
            })
        };
    }
    
    // TODO: Update in DynamoDB
    console.log('Rating updated:', { galleryId, assetId, rating, clientId: user.clientId });
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            message: 'Rating updated successfully',
            data: {
                assetId,
                rating,
                updatedAt: new Date().toISOString()
            }
        })
    };
}

async function handleCreateFolder(galleryId, body, user, headers) {
    const { name, description } = JSON.parse(body || '{}');
    
    if (!name) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                error: 'INVALID_INPUT',
                message: 'Folder name is required'
            })
        };
    }
    
    // TODO: Create in DynamoDB
    const folderId = `folder-${Date.now()}`;
    
    return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
            success: true,
            message: 'Folder created successfully',
            data: {
                folderId,
                name,
                description,
                createdAt: new Date().toISOString()
            }
        })
    };
}

async function handleDeleteFolder(pathParams, user, headers) {
    const { galleryId, folderId } = pathParams;
    
    // TODO: Delete from DynamoDB
    console.log('Folder deleted:', { galleryId, folderId, clientId: user.clientId });
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            message: 'Folder deleted successfully'
        })
    };
}

async function handleTrashAssets(galleryId, body, user, headers) {
    const { assetIds } = JSON.parse(body || '{}');
    
    if (!Array.isArray(assetIds) || assetIds.length === 0) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                error: 'INVALID_INPUT',
                message: 'Asset IDs array is required'
            })
        };
    }
    
    // TODO: Update in DynamoDB with TTL
    const trashedAt = new Date().toISOString();
    const ttlDays = 14;
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            message: `${assetIds.length} assets moved to trash`,
            data: {
                trashedAssets: assetIds.map(id => ({
                    assetId: id,
                    trashedAt,
                    ttlDays
                }))
            }
        })
    };
}

async function handleRestoreAssets(galleryId, body, user, headers) {
    const { assetIds } = JSON.parse(body || '{}');
    
    if (!Array.isArray(assetIds) || assetIds.length === 0) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                error: 'INVALID_INPUT',
                message: 'Asset IDs array is required'
            })
        };
    }
    
    // TODO: Update in DynamoDB
    const restoredAt = new Date().toISOString();
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            message: `${assetIds.length} assets restored`,
            data: {
                restoredAssets: assetIds.map(id => ({
                    assetId: id,
                    restoredAt
                }))
            }
        })
    };
}

async function handleFinalizeGallery(galleryId, body, user, headers) {
    const { assetIds, notes } = JSON.parse(body || '{}');
    
    if (!Array.isArray(assetIds) || assetIds.length === 0) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                error: 'INVALID_INPUT',
                message: 'At least one asset must be selected'
            })
        };
    }
    
    // TODO: Update in DynamoDB and trigger notifications
    const finalizedAt = new Date().toISOString();
    
    console.log('Gallery finalized:', {
        galleryId,
        clientId: user.clientId,
        assetCount: assetIds.length,
        notes,
        finalizedAt
    });
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            message: 'Gallery finalized successfully',
            data: {
                galleryId,
                finalizedAssets: assetIds,
                notes,
                finalizedAt
            }
        })
    };
}

/**
 * TODO: Production enhancements
 * 1. Connect to DynamoDB for real data operations
 * 2. Implement S3 integration for asset URLs
 * 3. Add CloudWatch logging and metrics
 * 4. Implement caching with ElastiCache
 * 5. Add request validation middleware
 * 6. Implement rate limiting per client
 * 7. Add webhook notifications for gallery events
 */
