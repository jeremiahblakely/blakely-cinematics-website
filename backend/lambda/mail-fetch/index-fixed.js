const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const ddbClient = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(ddbClient);

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    try {
        const path = event.path || event.rawPath || '';
        const httpMethod = event.httpMethod || event.requestContext?.http?.method || 'GET';
        const params = event.queryStringParameters || {};
        const userId = params.userId || 'admin';
        
        // Route: GET /mail/folders/counts
        if (path.includes('/folders/counts')) {
            return await getFolderCounts(userId);
        }
        
        // Route: GET /mail/{folder} - fetch emails from any folder
        if (path.includes('/mail/')) {
            const pathParts = path.split('/');
            const folder = pathParts[pathParts.length - 1] || 'inbox';
            return await getEmailsByFolder(userId, folder);
        }
        
        return createResponse(404, { error: 'Route not found' });
        
    } catch (error) {
        console.error('Error:', error);
        return createResponse(500, { error: error.message });
    }
};

async function getEmailsByFolder(userId, folder) {
    try {
        const params = {
            TableName: 'blakely-cinematics-emails',
            FilterExpression: 'userId = :userId AND folder = :folder',
            ExpressionAttributeValues: {
                ':userId': userId,
                ':folder': folder
            }
        };
        
        const result = await docClient.send(new ScanCommand(params));
        return createResponse(200, {
            emails: result.Items || [],
            count: result.Count || 0
        });
    } catch (error) {
        console.error('Error fetching emails:', error);
        return createResponse(500, { error: 'Failed to fetch emails' });
    }
}

async function getFolderCounts(userId) {
    const folders = ['inbox', 'sent', 'drafts', 'bookings', 'clients', 'finance', 'galleries', 'trash'];
    const counts = {};
    
    for (const folder of folders) {
        try {
            const params = {
                TableName: 'blakely-cinematics-emails',
                FilterExpression: 'userId = :userId AND folder = :folder',
                ExpressionAttributeValues: {
                    ':userId': userId,
                    ':folder': folder
                },
                Select: 'COUNT'
            };
            
            const result = await docClient.send(new ScanCommand(params));
            counts[folder] = result.Count || 0;
        } catch (error) {
            counts[folder] = 0;
        }
    }
    
    return createResponse(200, counts);
}

function createResponse(statusCode, body) {
    return {
        statusCode: statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS'
        },
        body: JSON.stringify(body)
    };
}
