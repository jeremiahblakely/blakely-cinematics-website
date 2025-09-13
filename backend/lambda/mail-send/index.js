// blakely-cinematics-mail-send Lambda Function
// Updated: September 12, 2025, 6:40 PM
// Purpose: Send emails via AWS SES and store in DynamoDB
// Runtime: Node.js 20.x with AWS SDK v3

const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const sesClient = new SESClient({ region: 'us-east-1' });
const ddbClient = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(ddbClient);

exports.handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    
    try {
        // Parse request body
        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        
        const {
            from,
            to,
            subject,
            htmlBody,
            textBody,
            userId,
            replyToMessageId
        } = body;
        
        // Validate required fields
        if (!from || !to || !subject || (!htmlBody && !textBody)) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    error: 'Missing required fields: from, to, subject, and either htmlBody or textBody'
                })
            };
        }
        
        // Generate unique email ID
        const emailId = 'email-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const timestamp = Date.now();
        
        // Prepare email parameters for SES
        const emailParams = {
            Source: from,
            Destination: {
                ToAddresses: Array.isArray(to) ? to : [to]
            },
            Message: {
                Subject: {
                    Data: subject,
                    Charset: 'UTF-8'
                },
                Body: {}
            }
        };
        
        if (htmlBody) {
            emailParams.Message.Body.Html = {
                Data: htmlBody,
                Charset: 'UTF-8'
            };
        }
        
        if (textBody) {
            emailParams.Message.Body.Text = {
                Data: textBody,
                Charset: 'UTF-8'
            };
        }
        
        // Send email via SES
        const sendCommand = new SendEmailCommand(emailParams);
        const sesResult = await sesClient.send(sendCommand);
        console.log('SES send result:', sesResult);
        
        // Store email in DynamoDB
        const dbParams = {
            TableName: 'blakely-cinematics-emails',
            Item: {
                userId: userId || from,
                emailId: emailId,
                messageId: sesResult.MessageId,
                from: from,
                to: to,
                subject: subject,
                htmlBody: htmlBody || '',
                textBody: textBody || '',
                folder: 'sent',
                timestamp: timestamp,
                createdAt: new Date(timestamp).toISOString(),
                status: 'sent',
                replyToMessageId: replyToMessageId || null
            }
        };
        
        const putCommand = new PutCommand(dbParams);
        await docClient.send(putCommand);
        console.log('Email stored in DynamoDB');
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: true,
                emailId: emailId,
                messageId: sesResult.MessageId,
                message: 'Email sent successfully'
            })
        };
        
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                error: 'Failed to send email',
                details: error.message
            })
        };
    }
};
