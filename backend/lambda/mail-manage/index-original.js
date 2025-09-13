// blakely-cinematics-mail-manage Lambda Function
// Created: September 12, 2025, 6:50 PM
// Purpose: Manage email drafts, folders, and operations

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const ddbClient = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(ddbClient);

exports.handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    
    try {
        const httpMethod = event.httpMethod || event.requestContext?.http?.method || 'POST';
        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        
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
    const emailId = data.emailId || 'draft-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const timestamp = Date.now();
    
    const params = {
        TableName: 'blakely-cinematics-emails',
        Item: {
            userId: data.userId || 'admin',
            emailId: emailId,
            from: data.from || '',
            to: data.to || '',
            subject: data.subject || 'Draft',
            htmlBody: data.htmlBody || '',
            textBody: data.textBody || '',
            folder: 'drafts',
            timestamp: timestamp,
            createdAt: new Date(timestamp).toISOString(),
            status: 'draft',
            lastModified: timestamp
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
            ':folder': data.newFolder,
            ':modified': Date.now()
        }
    };
    
    const command = new UpdateCommand(params);
    await docClient.send(command);
    
    return createResponse(200, {
        success: true,
        message: `Email moved to ${data.newFolder}`
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
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    };
}
