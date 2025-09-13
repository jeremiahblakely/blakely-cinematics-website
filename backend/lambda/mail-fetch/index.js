// blakely-cinematics-mail-fetch Lambda Function
// Created: September 12, 2025, 6:45 PM
// Purpose: Fetch emails from DynamoDB

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const ddbClient = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(ddbClient);

exports.handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    
    try {
        // Parse query parameters
        const params = event.queryStringParameters || {};
        const userId = params.userId || 'admin';
        const folder = params.folder || 'inbox';
        const limit = parseInt(params.limit) || 50;
        const nextTokenIn = params.nextToken;
        let exclusiveStartKey = undefined;
        if (nextTokenIn) {
            try {
                exclusiveStartKey = JSON.parse(Buffer.from(nextTokenIn, 'base64').toString('utf8'));
            } catch (e) {
                console.warn('Invalid nextToken provided, ignoring.');
            }
        }
        
        let command;
        
        if (folder === 'all') {
            // Fetch all emails for user via PK query
            command = new QueryCommand({
                TableName: 'blakely-cinematics-emails',
                KeyConditionExpression: 'userId = :uid',
                ExpressionAttributeValues: { ':uid': userId },
                ScanIndexForward: false,
                Limit: limit,
                ExclusiveStartKey: exclusiveStartKey
            });
        } else {
            // Prefer GSI query on folder; fallback to Scan if GSI missing
            command = new QueryCommand({
                TableName: 'blakely-cinematics-emails',
                IndexName: 'folder-timestamp-index',
                KeyConditionExpression: 'folder = :folder',
                ExpressionAttributeValues: { ':folder': folder },
                ScanIndexForward: false,
                Limit: limit,
                ExclusiveStartKey: exclusiveStartKey
            });
        }

        let result;
        try {
            result = await docClient.send(command);
        } catch (gsiError) {
            console.warn('Folder GSI query failed, attempting Scan fallback:', gsiError?.message || gsiError);
            if (folder !== 'all') {
                // Fallback: scan by userId + folder, then sort by timestamp desc and cap to limit
                const scanRes = await docClient.send(new ScanCommand({
                    TableName: 'blakely-cinematics-emails',
                    FilterExpression: '#uid = :uid AND #folder = :folder',
                    ExpressionAttributeNames: {
                        '#uid': 'userId',
                        '#folder': 'folder'
                    },
                    ExpressionAttributeValues: {
                        ':uid': userId,
                        ':folder': folder
                    },
                    ExclusiveStartKey: exclusiveStartKey
                }));
                const items = Array.isArray(scanRes.Items) ? scanRes.Items : [];
                items.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                result = { Items: items.slice(0, limit), LastEvaluatedKey: scanRes.LastEvaluatedKey };
            } else {
                // Re-throw for 'all' since PK query should exist; handled by outer catch
                throw gsiError;
            }
        }

        const items = Array.isArray(result.Items) ? result.Items : [];
        console.log(`Fetched ${items.length} emails from ${folder}`);
        
        // Robust item transformer: supports both DocumentClient output and raw AttributeValue maps
        const extract = (attr) => {
            if (attr == null) return undefined;
            if (typeof attr !== 'object') return attr;
            if ('S' in attr) return attr.S;
            if ('N' in attr) return Number(attr.N);
            if ('BOOL' in attr) return !!attr.BOOL;
            if ('L' in attr && Array.isArray(attr.L)) return attr.L.map(extract);
            if ('M' in attr && attr.M) {
                const out = {};
                for (const [k, v] of Object.entries(attr.M)) out[k] = extract(v);
                return out;
            }
            return attr;
        };

        const looksLikeAttributeMap = (obj) => {
            // Heuristic: any top-level value is an object with one of S/N/BOOL keys
            if (!obj || typeof obj !== 'object') return false;
            for (const v of Object.values(obj)) {
                if (v && typeof v === 'object' && (('S' in v) || ('N' in v) || ('BOOL' in v) || ('L' in v) || ('M' in v))) {
                    return true;
                }
            }
            return false;
        };

        const normalizeItem = (item) => {
            if (looksLikeAttributeMap(item)) {
                // Convert AttributeValue map to plain JS first
                const plain = {};
                for (const [k, v] of Object.entries(item)) plain[k] = extract(v);
                return plain;
            }
            return item;
        };

        const toArray = (val) => Array.isArray(val) ? val : (val ? [val] : []);

        // Format emails for frontend
        const emails = items.map(raw => {
            const item = normalizeItem(raw);
            return {
                emailId: item.emailId || '',
                subject: item.subject || 'No Subject',
                from: item.from || 'Unknown',
                to: toArray(item.to),
                timestamp: typeof item.timestamp === 'number' ? item.timestamp : (item.createdAt || Date.now()),
                createdAt: item.createdAt || item.timestamp || Date.now(),
                folder: item.folder || 'inbox',
                // Support both IMAP sync field names (html/text) and API names (htmlBody/textBody)
                htmlBody: item.html || item.htmlBody || '',
                textBody: item.text || item.textBody || '',
                status: item.status || (item.read ? 'read' : 'unread'),
                read: typeof item.read === 'boolean' ? item.read : (item.status === 'read'),
                messageId: item.messageId,
                replyToMessageId: item.replyToMessageId,
                attachments: item.attachments || []
            };
        });
        
        // Encode pagination token if available
        const nextTokenOut = result.LastEvaluatedKey
            ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
            : null;

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: true,
                emails: emails,
                count: emails.length,
                folder: folder,
                nextToken: nextTokenOut
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
                error: 'Failed to fetch emails',
                details: error.message
            })
        };
    }
};
