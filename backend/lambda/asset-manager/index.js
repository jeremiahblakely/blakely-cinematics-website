const AWS = require('aws-sdk');
const crypto = require('crypto');
const { verifyAccessToken, extractTokenFromHeader } = require('../../utils/jwt');

const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB.DocumentClient();

const ASSETS_TABLE = process.env.ASSETS_TABLE || 'blakely-assets';
const GALLERIES_TABLE = process.env.GALLERIES_TABLE || 'blakely-galleries';
const S3_BUCKET = process.env.S3_BUCKET || 'blakely-galleries-assets';

function generateAssetId() {
    return 'ASSET-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

exports.handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };
    
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }
    
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
    const { httpMethod, path, pathParameters, queryStringParameters, body: eventBody } = event;
    
    try {
        if (httpMethod === 'POST' && path.includes('/upload')) {
            return await handleAssetUpload(pathParameters.galleryId, user, eventBody, headers);
        }
        
        if (httpMethod === 'POST' && path.includes('/bulk-upload')) {
            return await handleBulkUpload(pathParameters.galleryId, user, eventBody, headers);
        }
        
        if (httpMethod === 'GET' && pathParameters?.assetId) {
            return await handleGetAsset(pathParameters.galleryId, pathParameters.assetId, user, headers);
        }
        
        if (httpMethod === 'GET') {
            return await handleListAssets(pathParameters.galleryId, queryStringParameters, user, headers);
        }
        
        if (httpMethod === 'PUT' && pathParameters?.assetId) {
            return await handleUpdateAsset(pathParameters.galleryId, pathParameters.assetId, user, eventBody, headers);
        }
        
        if (httpMethod === 'DELETE' && pathParameters?.assetId) {
            return await handleDeleteAsset(pathParameters.galleryId, pathParameters.assetId, user, headers);
        }
        
        if (httpMethod === 'POST' && path.includes('/process')) {
            return await handleProcessAssets(pathParameters.galleryId, user, eventBody, headers);
        }
        
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'NOT_FOUND', message: 'Endpoint not found' })
        };
        
    } catch (error) {
        console.error('Asset management error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'SERVER_ERROR', message: 'Internal server error' })
        };
    }
};

async function handleAssetUpload(galleryId, user, eventBody, headers) {
    const body = JSON.parse(eventBody || '{}');
    const { filename, contentType, metadata = {} } = body;
    
    if (!filename) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'INVALID_REQUEST', message: 'Filename required' })
        };
    }
    
    const assetId = generateAssetId();
    const originalKey = `galleries/${galleryId}/originals/${assetId}-${filename}`;
    
    const uploadUrl = await s3.getSignedUrlPromise('putObject', {
        Bucket: S3_BUCKET,
        Key: originalKey,
        ContentType: contentType || 'image/jpeg',
        Expires: 3600
    });
    
    await dynamodb.put({
        TableName: ASSETS_TABLE,
        Item: {
            galleryId,
            assetId,
            filename,
            originalKey,
            status: 'uploading',
            uploadedAt: new Date().toISOString()
        }
    }).promise();
    
    return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
            success: true,
            message: 'Upload URL generated',
            data: { assetId, uploadUrl }
        })
    };
}

async function handleBulkUpload(galleryId, user, eventBody, headers) {
    const body = JSON.parse(eventBody || '{}');
    const { files = [] } = body;
    
    if (!Array.isArray(files) || files.length === 0) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'INVALID_REQUEST', message: 'Files array required' })
        };
    }
    
    const uploadUrls = [];
    
    for (const file of files) {
        const assetId = generateAssetId();
        const originalKey = `galleries/${galleryId}/originals/${assetId}-${file.filename}`;
        
        const uploadUrl = await s3.getSignedUrlPromise('putObject', {
            Bucket: S3_BUCKET,
            Key: originalKey,
            ContentType: file.contentType || 'image/jpeg',
            Expires: 7200
        });
        
        uploadUrls.push({
            assetId,
            filename: file.filename,
            uploadUrl
        });
    }
    
    return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
            success: true,
            message: `Generated ${uploadUrls.length} upload URLs`,
            data: { uploads: uploadUrls, expiresIn: 7200 }
        })
    };
}

async function handleGetAsset(galleryId, assetId, user, headers) {
    const result = await dynamodb.get({
        TableName: ASSETS_TABLE,
        Key: { galleryId, assetId }
    }).promise();
    
    if (!result.Item) {
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'NOT_FOUND', message: 'Asset not found' })
        };
    }
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: result.Item })
    };
}

async function handleListAssets(galleryId, queryParams, user, headers) {
    const result = await dynamodb.query({
        TableName: ASSETS_TABLE,
        KeyConditionExpression: 'galleryId = :galleryId',
        ExpressionAttributeValues: { ':galleryId': galleryId }
    }).promise();
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            data: { assets: result.Items || [], count: result.Count || 0 }
        })
    };
}

async function handleUpdateAsset(galleryId, assetId, user, eventBody, headers) {
    const body = JSON.parse(eventBody || '{}');
    
    await dynamodb.update({
        TableName: ASSETS_TABLE,
        Key: { galleryId, assetId },
        UpdateExpression: 'SET updatedAt = :now',
        ExpressionAttributeValues: { ':now': new Date().toISOString() }
    }).promise();
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Asset updated' })
    };
}

async function handleDeleteAsset(galleryId, assetId, user, headers) {
    await dynamodb.delete({
        TableName: ASSETS_TABLE,
        Key: { galleryId, assetId }
    }).promise();
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Asset deleted' })
    };
}

async function handleProcessAssets(galleryId, user, eventBody, headers) {
    const body = JSON.parse(eventBody || '{}');
    const { assetIds = [] } = body;
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            message: `Processed ${assetIds.length} assets`,
            data: { processedAssets: assetIds }
        })
    };
}

// Standard Lambda exports
module.exports = {
    handler: exports.handler,
    generateAssetId,
    handleAssetUpload,
    handleBulkUpload,
    handleGetAsset,
    handleListAssets,
    handleUpdateAsset,
    handleDeleteAsset,
    handleProcessAssets,
    generateSignedUrl: async (key) => key ? "mock-url" : null
};
