// blakely-cinematics-mail-manage Lambda Function
// Created: September 12, 2025, 6:50 PM
// Updated: September 12, 2025, 7:30 PM - Fixed DELETE and move-folder
// Purpose: Manage email drafts, folders, and operations

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const ddbClient = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(ddbClient);

exports.handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    
    try {
        const httpMethod = event.httpMethod || event.requestContext?.http?.method || 'POST';
        
        // Handle DELETE requests specially
        if (httpMethod === 'DELETE') {
            const pathParams = event.pathParameters || {};
            const queryParams = event.queryStringParameters || {};
            
            // Extract emailId from path (e.g., /mail/{id})
            const emailId = pathParams.id || pathParams.proxy || event.path?.split('/').pop();
            const userId = queryParams.userId || 'admin';
            
            return await deleteEmail({ userId, emailId });
        }
        
        // Handle other requests with body
        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
        const action = body.action || 'save-draft';
        
        switch(action) {
            case 'save-draft':
                return await saveDraft(body);
            case 'move-folder':
                return await moveToFolder(body);
            case 'delete-email':
                return await deleteEmail(body);
            case 'mark-read':
                return await markAsRead(body);
            default:
                return createResponse(400, { error: 'Invalid action' });
        }
        
    } catch (error) {
        console.error('Error:', error);
        return createResponse(500, { 
            error: 'Failed to process request',
            details: error.message 
        });
    }
};

async function saveDraft(data) {
    const emailId = `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const params = {
        TableName: 'blakely-cinematics-emails',
        Item: {
            userId: data.userId || 'admin',
            emailId: emailId,
            folder: 'drafts',
            from: data.from,
            to: data.to,
            subject: data.subject || '(No Subject)',
            textBody: data.textBody || '',
            htmlBody: data.htmlBody || '',
            timestamp: Date.now(),
            status: 'draft',
            lastModified: Date.now()
        }
    };
    
    const command = new PutCommand(params);
    await docClient.send(command);
    
    return createResponse(200, {
        success: true,
        emailId: emailId,
        message: 'Draft saved successfully'
    });
}

async function moveToFolder(data) {
    const params = {
        TableName: 'blakely-cinematics-emails',
        Key: {
            userId: data.userId || 'admin',
            emailId: data.emailId
        },
        UpdateExpression: 'SET folder = :folder, lastModified = :modified',
        ExpressionAttributeValues: {
            ':folder': data.targetFolder || data.newFolder || 'inbox',
            ':modified': Date.now()
        }
    };
    
    const command = new UpdateCommand(params);
    await docClient.send(command);
    
    return createResponse(200, {
        success: true,
        message: `Email moved to ${data.targetFolder || data.newFolder}`
    });
}

async function deleteEmail(data) {
    const params = {
        TableName: 'blakely-cinematics-emails',
        Key: {
            userId: data.userId || 'admin',
            emailId: data.emailId
        }
    };
    
    const command = new DeleteCommand(params);
    await docClient.send(command);
    
    return createResponse(200, {
        success: true,
        message: 'Email deleted successfully'
    });
}

async function markAsRead(data) {
    const params = {
        TableName: 'blakely-cinematics-emails',
        Key: {
            userId: data.userId || 'admin',
            emailId: data.emailId
        },
        UpdateExpression: 'SET #status = :status, lastModified = :modified',
        ExpressionAttributeNames: {
            '#status': 'status'
        },
        ExpressionAttributeValues: {
            ':status': 'read',
            ':modified': Date.now()
        }
    };
    
    const command = new UpdateCommand(params);
    await docClient.send(command);
    
    return createResponse(200, {
        success: true,
        message: 'Email marked as read'
    });
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
