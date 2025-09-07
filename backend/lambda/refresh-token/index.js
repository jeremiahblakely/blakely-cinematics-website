/**
 * Refresh Token Lambda Handler
 * Validates refresh tokens and issues new access tokens
 */

const { refreshAccessToken, verifyRefreshToken } = require('../../utils/jwt');

/**
 * Lambda handler for token refresh
 */
exports.handler = async (event) => {
    // CORS headers
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    
    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({
                error: 'METHOD_NOT_ALLOWED',
                message: 'Only POST method is allowed'
            })
        };
    }
    
    try {
        // Parse request body
        const body = JSON.parse(event.body || '{}');
        const { refreshToken } = body;
        
        // Check if refresh token is provided
        if (!refreshToken) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'MISSING_TOKEN',
                    message: 'Refresh token is required'
                })
            };
        }
        
        // Verify refresh token first
        const verifyResult = verifyRefreshToken(refreshToken);
        
        if (!verifyResult.valid) {
            console.log('Invalid refresh token attempt:', {
                error: verifyResult.error,
                timestamp: new Date().toISOString()
            });
            
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({
                    error: 'INVALID_TOKEN',
                    message: 'Invalid or expired refresh token'
                })
            };
        }
        
        // Generate new token pair
        try {
            const newTokens = refreshAccessToken(refreshToken);
            
            // Log successful refresh
            console.log('Token refreshed successfully:', {
                clientId: verifyResult.payload.clientId,
                galleryCode: verifyResult.payload.galleryCode,
                timestamp: new Date().toISOString()
            });
            
            // Return new tokens
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    message: 'Token refreshed successfully',
                    data: {
                        ...newTokens,
                        client: {
                            id: verifyResult.payload.clientId,
                            name: verifyResult.payload.clientName,
                            galleryCode: verifyResult.payload.galleryCode
                        }
                    }
                })
            };
            
        } catch (refreshError) {
            console.error('Error refreshing token:', refreshError);
            
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({
                    error: 'REFRESH_FAILED',
                    message: 'Failed to refresh token'
                })
            };
        }
        
    } catch (error) {
        console.error('Refresh token handler error:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'SERVER_ERROR',
                message: 'An error occurred while refreshing token'
            })
        };
    }
};

/**
 * TODO: Future enhancements
 * 1. Store refresh tokens in DynamoDB with TTL for revocation
 * 2. Implement refresh token rotation (issue new refresh token on use)
 * 3. Add device/session tracking
 * 4. Implement refresh token family detection (detect token reuse)
 * 5. Add CloudWatch metrics for monitoring
 * 6. Rate limiting per client
 */
