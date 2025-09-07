// vip-handler-lambda/index.js
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamodb = new AWS.DynamoDB.DocumentClient();

// Read table names from environment variables
const TABLES = {
  galleries: process.env.VIP_GALLERIES_TABLE || 'blakely-cinematics-vip-galleries',
  assets: process.env.VIP_ASSETS_TABLE || 'blakely-cinematics-vip-assets',
  folders: process.env.VIP_FOLDERS_TABLE || 'blakely-cinematics-vip-folders',
  placements: process.env.VIP_PLACEMENTS_TABLE || 'blakely-cinematics-vip-placements',
  ratings: process.env.VIP_RATINGS_TABLE || 'blakely-cinematics-vip-ratings',
  selections: process.env.VIP_SELECTIONS_TABLE || 'blakely-cinematics-vip-selections'
};

// CORS headers for all responses
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS'
};

// Helper to create consistent responses
const respond = (statusCode, body) => ({
  statusCode,
  headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

// Route parser to extract path parameters
const parseRoute = (path) => {
  const match = path.match(/^\/vip\/galleries\/([^\/]+)(\/.*)?$/);
  if (!match) return null;
  
  const galleryId = match[1];
  const remainder = match[2] || '';
  
  // Parse sub-routes
  if (remainder === '/assets') {
    return { route: 'listAssets', galleryId };
  }
  
  if (remainder === '/folders') {
    return { route: 'createFolder', galleryId };
  }
  
  if (remainder === '/finalize') {
    return { route: 'finalizeSelection', galleryId };
  }
  
  const assetMatch = remainder.match(/^\/assets\/([^\/]+)\/rating$/);
  if (assetMatch) {
    return { route: 'updateRating', galleryId, assetId: assetMatch[1] };
  }
  
  if (remainder === '' || remainder === '/') {
    return { route: 'getGallery', galleryId };
  }
  
  return null;
};

// Main handler
exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event));
  
  try {
    const method = event.httpMethod || event.requestContext?.http?.method;
    const path = event.path || event.rawPath || event.resource;
    const body = event.body ? JSON.parse(event.body) : {};
    
    // Handle OPTIONS for CORS preflight
    if (method === 'OPTIONS') {
      return respond(200, {});
    }
    
    // Health check endpoint
    if (path === '/health' || path === '/vip/health') {
      return respond(200, {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        tables: TABLES
      });
    }
    
    // Parse the route
    const routeInfo = parseRoute(path);
    if (!routeInfo) {
      return respond(404, {
        error: 'Route not found',
        code: 'ROUTE_NOT_FOUND',
        path
      });
    }
    
    const { route, galleryId, assetId } = routeInfo;
    console.log('Route:', route, 'Gallery:', galleryId, 'Asset:', assetId);
    
    // Route handlers
    switch (\`\${method}:\${route}\`) {
      case 'GET:getGallery':
        return await handleGetGallery(galleryId);
        
      case 'GET:listAssets':
        return await handleListAssets(galleryId);
        
      case 'PATCH:updateRating':
        return await handleUpdateRating(galleryId, assetId, body);
        
      case 'POST:createFolder':
        return await handleCreateFolder(galleryId, body);
        
      case 'POST:finalizeSelection':
        return await handleFinalizeSelection(galleryId, body);
        
      default:
        return respond(405, {
          error: 'Method not allowed',
          code: 'METHOD_NOT_ALLOWED',
          method,
          route
        });
    }
    
  } catch (error) {
    console.error('Error:', error);
    return respond(500, {
      error: error.name || 'Internal Server Error',
      code: 'INTERNAL_ERROR',
      message: error.message
    });
  }
};

// Handler: GET /vip/galleries/{galleryId}
async function handleGetGallery(galleryId) {
  try {
    const result = await dynamodb.get({
      TableName: TABLES.galleries,
      Key: { galleryId }
    }).promise();
    
    if (!result.Item) {
      return respond(404, {
        error: 'Gallery not found',
        code: 'GALLERY_NOT_FOUND',
        galleryId
      });
    }
    
    return respond(200, result.Item);
  } catch (error) {
    console.error('Get gallery error:', error);
    throw error;
  }
}

// Handler: GET /vip/galleries/{galleryId}/assets
async function handleListAssets(galleryId) {
  try {
    const result = await dynamodb.query({
      TableName: TABLES.assets,
      KeyConditionExpression: 'galleryId = :gid',
      ExpressionAttributeValues: {
        ':gid': galleryId
      }
    }).promise();
    
    return respond(200, {
      galleryId,
      assets: result.Items || [],
      count: result.Count || 0
    });
  } catch (error) {
    console.error('List assets error:', error);
    throw error;
  }
}

// Handler: PATCH /vip/galleries/{galleryId}/assets/{assetId}/rating
async function handleUpdateRating(galleryId, assetId, body) {
  const { rating } = body;
  
  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    return respond(400, {
      error: 'Invalid rating',
      code: 'INVALID_RATING',
      message: 'Rating must be a number between 1 and 5'
    });
  }
  
  try {
    const ratingKey = \`\${galleryId}#\${assetId}\`;
    const timestamp = Date.now();
    
    await dynamodb.put({
      TableName: TABLES.ratings,
      Item: {
        galleryId,
        ratingKey,
        assetId,
        rating,
        updatedAt: timestamp
      }
    }).promise();
    
    return respond(200, {
      success: true,
      galleryId,
      assetId,
      rating,
      updatedAt: timestamp
    });
  } catch (error) {
    console.error('Update rating error:', error);
    throw error;
  }
}

// Handler: POST /vip/galleries/{galleryId}/folders
async function handleCreateFolder(galleryId, body) {
  const { name, parentId } = body;
  
  // Validate input
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return respond(400, {
      error: 'Invalid folder name',
      code: 'INVALID_FOLDER_NAME',
      message: 'Folder name must be a non-empty string'
    });
  }
  
  try {
    // Check for existing folder with same name in same parent
    const existingResult = await dynamodb.query({
      TableName: TABLES.folders,
      IndexName: 'gsi_parentId_sort',
      KeyConditionExpression: 'parentId = :pid',
      FilterExpression: 'galleryId = :gid AND folderName = :name',
      ExpressionAttributeValues: {
        ':pid': parentId || 'ROOT',
        ':gid': galleryId,
        ':name': name.trim()
      }
    }).promise();
    
    // If folder exists, return it (idempotent)
    if (existingResult.Items && existingResult.Items.length > 0) {
      const existing = existingResult.Items[0];
      return respond(200, {
        folderId: existing.folderId,
        name: existing.folderName,
        parentId: existing.parentId === 'ROOT' ? null : existing.parentId,
        createdAt: existing.createdAt,
        idempotent: true
      });
    }
    
    // Create new folder
    const folderId = uuidv4();
    const timestamp = Date.now();
    
    const folderItem = {
      galleryId,
      folderId,
      folderName: name.trim(),
      parentId: parentId || 'ROOT',
      createdAt: timestamp,
      updatedAt: timestamp,
      clientId: \`client-\${galleryId.split('-')[0]}\` // Extract client from gallery ID
    };
    
    await dynamodb.put({
      TableName: TABLES.folders,
      Item: folderItem
    }).promise();
    
    return respond(201, {
      folderId,
      name: name.trim(),
      parentId: parentId || null,
      createdAt: timestamp
    });
    
  } catch (error) {
    console.error('Create folder error:', error);
    throw error;
  }
}

// Handler: POST /vip/galleries/{galleryId}/finalize
async function handleFinalizeSelection(galleryId, body) {
  const { assetIds } = body;
  
  // Validate input
  if (!Array.isArray(assetIds) || assetIds.length === 0) {
    return respond(400, {
      error: 'Invalid asset IDs',
      code: 'INVALID_ASSET_IDS',
      message: 'assetIds must be a non-empty array'
    });
  }
  
  try {
    const selectionId = \`\${galleryId}-selection\`;
    
    // Check if already finalized
    const existing = await dynamodb.get({
      TableName: TABLES.selections,
      Key: { 
        galleryId,
        selectionId
      }
    }).promise();
    
    if (existing.Item && existing.Item.finalizedAt) {
      // Check if same assets (idempotent)
      const existingAssets = existing.Item.assetIds || [];
      const sameAssets = 
        existingAssets.length === assetIds.length &&
        existingAssets.every(id => assetIds.includes(id)) &&
        assetIds.every(id => existingAssets.includes(id));
      
      if (sameAssets) {
        return respond(200, {
          success: true,
          count: assetIds.length,
          finalizedAt: existing.Item.finalizedAt,
          idempotent: true
        });
      }
      
      // Different assets, return conflict
      return respond(409, {
        error: 'Selection already finalized',
        code: 'ALREADY_FINALIZED',
        message: 'Gallery selection has already been finalized with different assets'
      });
    }
    
    // Create or update selection
    const timestamp = Date.now();
    const selectionItem = {
      galleryId,
      selectionId,
      assetIds,
      count: assetIds.length,
      finalizedAt: timestamp,
      clientId: \`client-\${galleryId.split('-')[0]}\` // Extract client from gallery ID
    };
    
    await dynamodb.put({
      TableName: TABLES.selections,
      Item: selectionItem
    }).promise();
    
    return respond(200, {
      success: true,
      count: assetIds.length,
      finalizedAt: timestamp
    });
    
  } catch (error) {
    console.error('Finalize selection error:', error);
    throw error;
  }
}
