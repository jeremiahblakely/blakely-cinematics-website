// Using AWS SDK v3 that's built into Lambda Node.js 18
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

// Initialize clients
const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);
const s3 = new S3Client({ region: 'us-east-1' });
const lambda = new LambdaClient({ region: 'us-east-1' });

// Mail Lambda routing function
async function routeMailRequest(path, method, event) {
    let functionName;
    
    // Determine which mail Lambda to invoke
    if (path.includes('/mail/send') && method === 'POST') {
        functionName = 'blakely-cinematics-mail-send';
    } else if (path.includes('/mail/inbox') && method === 'GET') {
        functionName = 'blakely-cinematics-mail-fetch';
    } else if (path.includes('/mail/draft') && method === 'POST') {
        functionName = 'blakely-cinematics-mail-manage';
    } else if (path.includes('/mail/manage') && method === 'POST') {
        functionName = 'blakely-cinematics-mail-manage';
    } else if (path.match(/\/mail\/[^\/]+$/) && method === 'DELETE') {
        functionName = 'blakely-cinematics-mail-manage';
    } else {
        return {
            statusCode: 404,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Mail endpoint not found' })
        };
    }
    
    // Invoke the appropriate Lambda
    const command = new InvokeCommand({
        FunctionName: functionName,
        InvocationType: 'RequestResponse',
        Payload: JSON.stringify(event)
    });
    
    try {
        const response = await lambda.send(command);
        const payload = JSON.parse(new TextDecoder().decode(response.Payload));
        return payload;
    } catch (error) {
        console.error('Error invoking mail Lambda:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Failed to process mail request' })
        };
    }
}

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event));
    
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    };
    
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }
    
    const path = event.path || '/';
    const method = event.httpMethod;
    
    try {
        // Mail routing - Handle mail endpoints first
        if (path.includes('/mail')) {
            return await routeMailRequest(path, method, event);
        }
        
        // Health check
        if (path.includes('/health')) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    status: 'healthy',
                    message: 'Blakely Cinematics API v2.0',
                    timestamp: new Date().toISOString(),
                    features: ['auth', 'contact', 'galleries', 'bookings', 'images', 'mail']
                })
            };
        }
                    success: false,
                    message: 'Invalid credentials'
                })
            };
        }
        
        // Contact form
        if (path.includes('/contact') && method === 'POST') {
            const body = JSON.parse(event.body || '{}');
            
            if (!body.name || !body.email || !body.message) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ 
                        success: false,
                        error: 'Missing required fields' 
                    })
                };
            }
            
            await dynamodb.send(new PutCommand({
                TableName: 'blakely-cinematics-contacts',
                Item: {
                    id: Date.now().toString(),
                    name: body.name,
                    email: body.email,
                    message: body.message,
                    timestamp: new Date().toISOString()
                }
            }));
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    success: true, 
                    message: 'Thank you for contacting us!' 
                })
            };
        }
        
        // List galleries
        if (path.includes('/galleries') && method === 'GET') {
            const result = await dynamodb.send(new ScanCommand({
                TableName: 'blakely-cinematics-galleries'
            }));
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    galleries: result.Items || [],
                    count: result.Items ? result.Items.length : 0
                })
            };
        }
        
        // Create gallery
        if (path.includes('/galleries') && method === 'POST') {
            const body = JSON.parse(event.body || '{}');
            
            if (!body.galleryCode || !body.name || !body.password) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ 
                        success: false,
                        error: 'Missing required fields' 
                    })
                };
            }
            
            await dynamodb.send(new PutCommand({
                TableName: 'blakely-cinematics-galleries',
                Item: {
                    galleryCode: body.galleryCode,
                    name: body.name,
                    password: body.password,
                    createdAt: new Date().toISOString(),
                    images: []
                }
            }));
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    success: true, 
                    message: 'Gallery created successfully',
                    galleryCode: body.galleryCode
                })
            };
        }
        
        // List bookings
        if (path.includes('/bookings') && method === 'GET') {
            const result = await dynamodb.send(new ScanCommand({
                TableName: 'blakely-cinematics-bookings'
            }));
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    bookings: result.Items || [],
                    count: result.Items ? result.Items.length : 0
                })
            };
        }
        
        // Create booking
        if (path.includes('/bookings') && method === 'POST') {
            const body = JSON.parse(event.body || '{}');
            
            await dynamodb.send(new PutCommand({
                TableName: 'blakely-cinematics-bookings',
                Item: {
                    id: Date.now().toString(),
                    ...body,
                    createdAt: new Date().toISOString()
                }
            }));
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    success: true, 
                    message: 'Booking created successfully'
                })
            };
        }
        
        // Get images for gallery
        if (path.includes('/images') && method === 'GET') {
            const galleryCode = event.queryStringParameters?.galleryCode;
            
            if (!galleryCode) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ 
                        success: false,
                        error: 'Gallery code required' 
                    })
                };
            }
            
            const result = await dynamodb.send(new ScanCommand({
                TableName: 'blakely-cinematics-images',
                FilterExpression: 'galleryCode = :gc',
                ExpressionAttributeValues: {
                    ':gc': galleryCode
                }
            }));
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    images: result.Items || [],
                    count: result.Items ? result.Items.length : 0
                })
            };
        }
        
        // Default 404
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ 
                success: false,
                error: 'Endpoint not found',
                path: path,
                method: method
            })
        };
        
    } catch (error) {
        console.error('Handler error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false,
                error: 'Internal server error',
                message: error.message 
            })
        };
    }
};
