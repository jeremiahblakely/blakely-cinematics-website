/**
 * Gallery CRUD Lambda Handler
 * Manages gallery creation, updates, deletion, and listing
 */

const AWS = require('aws-sdk');
const crypto = require('crypto');
const { verifyAccessToken, extractTokenFromHeader } = require('../../utils/jwt');

// AWS Services
const dynamodb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

// Table names from environment
const GALLERIES_TABLE = process.env.GALLERIES_TABLE || 'blakely-galleries';
const ASSETS_TABLE = process.env.ASSETS_TABLE || 'blakely-assets';
const FOLDERS_TABLE = process.env.FOLDERS_TABLE || 'blakely-folders';
const S3_BUCKET = process.env.S3_BUCKET || 'blakely-galleries-assets';

/**
 * Generate unique gallery ID
 */
function generateGalleryId() {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `GAL-${date}-${random}`;
}

/**
 * Lambda handler
 */
exports.handler = async (event) => {
    // CORS headers
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };
    
    // Handle OPTIONS
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }
    
    // Authenticate request
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'UNAUTHORIZED', message: 'Authentication required' })
        };
    }
    
    const authResult = verifyAccessToken(token);
    if (!authResult.valid) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'INVALID_TOKEN', message: 'Invalid or expired token' })
        };
    }
    
    const user = authResult.payload;
    const { httpMethod, pathParameters, queryStringParameters, body: eventBody } = event;
    
    try {
        // Route handlers
        switch (httpMethod) {
            case 'POST':
                return await handleCreateGallery(user, eventBody, headers);
                
            case 'GET':
                if (pathParameters?.galleryId) {
                    return await handleGetGallery(pathParameters.galleryId, user, headers);
                }
                return await handleListGalleries(user, queryStringParameters, headers);
                
            case 'PUT':
                if (!pathParameters?.galleryId) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'INVALID_REQUEST', message: 'Gallery ID required' })
                    };
                }
                return await handleUpdateGallery(pathParameters.galleryId, user, eventBody, headers);
                
            case 'DELETE':
                if (!pathParameters?.galleryId) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'INVALID_REQUEST', message: 'Gallery ID required' })
                    };
                }
                return await handleDeleteGallery(pathParameters.galleryId, user, headers);
                
            default:
                return {
                    statusCode: 405,
                    headers,
                    body: JSON.stringify({ error: 'METHOD_NOT_ALLOWED', message: 'Method not supported' })
                };
        }
    } catch (error) {
        console.error('Gallery CRUD error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'SERVER_ERROR', message: 'Internal server error' })
        };
    }
};

/**
 * Create new gallery
 */
async function handleCreateGallery(user, eventBody, headers) {
    const body = JSON.parse(eventBody || '{}');
    const {
        title,
        description,
        clientName,
        clientEmail,
        eventDate,
        location,
        coverImage,
        settings = {}
    } = body;
    
    // Validate required fields
    if (!title || !clientName) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                error: 'INVALID_REQUEST',
                message: 'Title and client name are required'
            })
        };
    }
    
    const galleryId = generateGalleryId();
    const timestamp = new Date().toISOString();
    
    // Create S3 folder structure
    const s3Prefix = `galleries/${galleryId}/`;
    await createS3Folders(galleryId);
    
    // Gallery item for DynamoDB
    const galleryItem = {
        galleryId,
        clientId: user.clientId || clientEmail,
        title,
        description,
        clientName,
        clientEmail,
        eventDate,
        location,
        coverImage,
        s3Prefix,
        status: 'active',
        assetCount: 0,
        selectedCount: 0,
        settings: {
            allowDownload: settings.allowDownload !== false,
            allowRating: settings.allowRating !== false,
            allowComments: settings.allowComments || false,
            watermark: settings.watermark || false,
            maxSelections: settings.maxSelections || null,
            selectionDeadline: settings.selectionDeadline || null
        },
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: user.clientId
    };
    
    // Save to DynamoDB
    await dynamodb.put({
        TableName: GALLERIES_TABLE,
        Item: galleryItem
    }).promise();
    
    // Create default folder structure
    await createDefaultFolders(galleryId);
    
    console.log('Gallery created:', { galleryId, title, clientName });
    
    return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
            success: true,
            message: 'Gallery created successfully',
            data: {
                galleryId,
                title,
                s3Prefix,
                uploadUrl: await generateUploadUrl(galleryId),
                settings: galleryItem.settings
            }
        })
    };
}

/**
 * Get gallery details
 */
async function handleGetGallery(galleryId, user, headers) {
    const result = await dynamodb.get({
        TableName: GALLERIES_TABLE,
        Key: { galleryId }
    }).promise();
    
    if (!result.Item) {
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'NOT_FOUND', message: 'Gallery not found' })
        };
    }
    
    // Check access permissions
    if (result.Item.clientId !== user.clientId && user.type !== 'admin') {
        return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'FORBIDDEN', message: 'Access denied' })
        };
    }
    
    // Get asset count
    const assetCount = await getAssetCount(galleryId);
    
    // Get folder structure
    const folders = await getFolders(galleryId);
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            data: {
                ...result.Item,
                assetCount,
                folders
            }
        })
    };
}

/**
 * List galleries
 */
async function handleListGalleries(user, queryParams, headers) {
    const limit = parseInt(queryParams?.limit || '20');
    const status = queryParams?.status || 'active';
    const lastEvaluatedKey = queryParams?.cursor ? 
        JSON.parse(Buffer.from(queryParams.cursor, 'base64').toString()) : undefined;
    
    let params;
    
    if (user.type === 'admin') {
        // Admin can see all galleries
        params = {
            TableName: GALLERIES_TABLE,
            IndexName: 'StatusIndex',
            KeyConditionExpression: '#status = :status',
            ExpressionAttributeNames: {
                '#status': 'status'
            },
            ExpressionAttributeValues: {
                ':status': status
            },
            Limit: limit,
            ExclusiveStartKey: lastEvaluatedKey
        };
    } else {
        // Clients see only their galleries
        params = {
            TableName: GALLERIES_TABLE,
            IndexName: 'ClientIdIndex',
            KeyConditionExpression: 'clientId = :clientId',
            ExpressionAttributeValues: {
                ':clientId': user.clientId
            },
            Limit: limit,
            ExclusiveStartKey: lastEvaluatedKey
        };
    }
    
    const result = await dynamodb.query(params).promise();
    
    // Generate next cursor if there are more results
    const nextCursor = result.LastEvaluatedKey ? 
        Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : null;
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            data: {
                galleries: result.Items,
                count: result.Items.length,
                nextCursor
            }
        })
    };
}

/**
 * Update gallery
 */
async function handleUpdateGallery(galleryId, user, eventBody, headers) {
    const body = JSON.parse(eventBody || '{}');
    
    // Get existing gallery
    const existing = await dynamodb.get({
        TableName: GALLERIES_TABLE,
        Key: { galleryId }
    }).promise();
    
    if (!existing.Item) {
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'NOT_FOUND', message: 'Gallery not found' })
        };
    }
    
    // Check permissions
    if (existing.Item.clientId !== user.clientId && user.type !== 'admin') {
        return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'FORBIDDEN', message: 'Access denied' })
        };
    }
    
    // Build update expression
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};
    
    const allowedUpdates = [
        'title', 'description', 'eventDate', 'location',
        'coverImage', 'status', 'settings'
    ];
    
    allowedUpdates.forEach(field => {
        if (body[field] !== undefined) {
            updateExpressions.push(`#${field} = :${field}`);
            expressionAttributeNames[`#${field}`] = field;
            expressionAttributeValues[`:${field}`] = body[field];
        }
    });
    
    if (updateExpressions.length === 0) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'INVALID_REQUEST', message: 'No valid updates provided' })
        };
    }
    
    // Add updatedAt
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();
    
    // Update gallery
    await dynamodb.update({
        TableName: GALLERIES_TABLE,
        Key: { galleryId },
        UpdateExpression: 'SET ' + updateExpressions.join(', '),
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues
    }).promise();
    
    console.log('Gallery updated:', { galleryId, updates: Object.keys(body) });
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            message: 'Gallery updated successfully'
        })
    };
}

/**
 * Delete gallery
 */
async function handleDeleteGallery(galleryId, user, headers) {
    // Get gallery
    const existing = await dynamodb.get({
        TableName: GALLERIES_TABLE,
        Key: { galleryId }
    }).promise();
    
    if (!existing.Item) {
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'NOT_FOUND', message: 'Gallery not found' })
        };
    }
    
    // Check permissions
    if (existing.Item.clientId !== user.clientId && user.type !== 'admin') {
        return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'FORBIDDEN', message: 'Access denied' })
        };
    }
    
    // Soft delete by updating status
    if (user.type !== 'admin') {
        await dynamodb.update({
            TableName: GALLERIES_TABLE,
            Key: { galleryId },
            UpdateExpression: 'SET #status = :status, #deletedAt = :deletedAt',
            ExpressionAttributeNames: {
                '#status': 'status',
                '#deletedAt': 'deletedAt'
            },
            ExpressionAttributeValues: {
                ':status': 'deleted',
                ':deletedAt': new Date().toISOString()
            }
        }).promise();
        
        console.log('Gallery soft deleted:', { galleryId });
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Gallery deleted successfully'
            })
        };
    }
    
    // Hard delete for admins (with cleanup)
    // Delete all assets from S3
    await deleteS3Folder(galleryId);
    
    // Delete from DynamoDB tables
    await Promise.all([
        // Delete gallery
        dynamodb.delete({
            TableName: GALLERIES_TABLE,
            Key: { galleryId }
        }).promise(),
        
        // Delete all assets
        deleteAllAssets(galleryId),
        
        // Delete all folders
        deleteAllFolders(galleryId)
    ]);
    
    console.log('Gallery hard deleted:', { galleryId });
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            message: 'Gallery and all associated data deleted'
        })
    };
}

/**
 * Helper: Create S3 folder structure
 */
async function createS3Folders(galleryId) {
    const folders = ['originals/', 'optimized/', 'thumbnails/', 'downloads/'];
    const promises = folders.map(folder => 
        s3.putObject({
            Bucket: S3_BUCKET,
            Key: `galleries/${galleryId}/${folder}`,
            Body: ''
        }).promise()
    );
    await Promise.all(promises);
}

/**
 * Helper: Create default folders in DynamoDB
 */
async function createDefaultFolders(galleryId) {
    const defaultFolders = [
        { folderId: 'favorites', name: 'Favorites', icon: 'star' },
        { folderId: 'selects', name: 'Final Selects', icon: 'check' }
    ];
    
    const timestamp = new Date().toISOString();
    const promises = defaultFolders.map(folder =>
        dynamodb.put({
            TableName: FOLDERS_TABLE,
            Item: {
                galleryId,
                folderId: folder.folderId,
                name: folder.name,
                icon: folder.icon,
                parentFolderId: 'root',
                assetCount: 0,
                createdAt: timestamp
            }
        }).promise()
    );
    
    await Promise.all(promises);
}

/**
 * Helper: Generate presigned upload URL
 */
async function generateUploadUrl(galleryId) {
    const key = `galleries/${galleryId}/temp/${Date.now()}-upload`;
    return s3.getSignedUrlPromise('putObject', {
        Bucket: S3_BUCKET,
        Key: key,
        Expires: 3600, // 1 hour
        ContentType: 'image/jpeg'
    });
}

/**
 * Helper: Get asset count
 */
async function getAssetCount(galleryId) {
    const result = await dynamodb.query({
        TableName: ASSETS_TABLE,
        KeyConditionExpression: 'galleryId = :galleryId',
        ExpressionAttributeValues: {
            ':galleryId': galleryId
        },
        Select: 'COUNT'
    }).promise();
    
    return result.Count || 0;
}

/**
 * Helper: Get folders
 */
async function getFolders(galleryId) {
    const result = await dynamodb.query({
        TableName: FOLDERS_TABLE,
        KeyConditionExpression: 'galleryId = :galleryId',
        ExpressionAttributeValues: {
            ':galleryId': galleryId
        }
    }).promise();
    
    return result.Items || [];
}

/**
 * Helper: Delete S3 folder
 */
async function deleteS3Folder(galleryId) {
    const prefix = `galleries/${galleryId}/`;
    
    // List all objects
    const objects = await s3.listObjectsV2({
        Bucket: S3_BUCKET,
        Prefix: prefix
    }).promise();
    
    if (objects.Contents && objects.Contents.length > 0) {
        // Delete all objects
        await s3.deleteObjects({
            Bucket: S3_BUCKET,
            Delete: {
                Objects: objects.Contents.map(obj => ({ Key: obj.Key }))
            }
        }).promise();
    }
}

/**
 * Helper: Delete all assets
 */
async function deleteAllAssets(galleryId) {
    // Query all assets
    const assets = await dynamodb.query({
        TableName: ASSETS_TABLE,
        KeyConditionExpression: 'galleryId = :galleryId',
        ExpressionAttributeValues: {
            ':galleryId': galleryId
        }
    }).promise();
    
    if (assets.Items && assets.Items.length > 0) {
        // Batch delete
        const deleteRequests = assets.Items.map(item => ({
            DeleteRequest: {
                Key: {
                    galleryId: item.galleryId,
                    assetId: item.assetId
                }
            }
        }));
        
        // DynamoDB batch write limit is 25
        while (deleteRequests.length > 0) {
            const batch = deleteRequests.splice(0, 25);
            await dynamodb.batchWrite({
                RequestItems: {
                    [ASSETS_TABLE]: batch
                }
            }).promise();
        }
    }
}

/**
 * Helper: Delete all folders
 */
async function deleteAllFolders(galleryId) {
    // Query all folders
    const folders = await dynamodb.query({
        TableName: FOLDERS_TABLE,
        KeyConditionExpression: 'galleryId = :galleryId',
        ExpressionAttributeValues: {
            ':galleryId': galleryId
        }
    }).promise();
    
    if (folders.Items && folders.Items.length > 0) {
        // Batch delete
        const deleteRequests = folders.Items.map(item => ({
            DeleteRequest: {
                Key: {
                    galleryId: item.galleryId,
                    folderId: item.folderId
                }
            }
        }));
        
        // DynamoDB batch write limit is 25
        while (deleteRequests.length > 0) {
            const batch = deleteRequests.splice(0, 25);
            await dynamodb.batchWrite({
                RequestItems: {
                    [FOLDERS_TABLE]: batch
                }
            }).promise();
        }
    }
}

/**
 * TODO: Production enhancements
 * 1. Implement image processing pipeline
 * 2. Add CloudFront distribution for assets
 * 3. Implement backup and restore
 * 4. Add analytics tracking
 * 5. Implement gallery templates
 * 6. Add batch operations support
 */
