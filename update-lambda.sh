#!/bin/bash
echo '🔧 Updating Lambda function to use environment variables...'

mkdir -p /tmp/lambda-update
cd /tmp/lambda-update

cat > index.js << 'EOF'
const AWS = require('aws-sdk');
const Imap = require('imap');
const { simpleParser } = require('mailparser');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = 'blakely-cinematics-emails';

exports.handler = async (event) => {
    const userId = process.env.USER_EMAIL || process.env.IMAP_USER;
    
    if (!userId) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Missing email configuration' })
        };
    }
    
    console.log('Syncing emails for: ' + userId);
    
    const imapConfig = {
        user: process.env.IMAP_USER,
        password: process.env.IMAP_PASSWORD,
        host: process.env.IMAP_HOST,
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
    };

    return new Promise((resolve, reject) => {
        const imap = new Imap(imapConfig);
        let emailCount = 0;

        imap.once('ready', () => {
            imap.openBox('INBOX', true, (err, box) => {
                if (err) {
                    imap.end();
                    return reject(err);
                }

                const fetchRange = Math.max(1, box.messages.total - 49) + ':*';
                const f = imap.seq.fetch(fetchRange, {
                    bodies: '',
                    struct: true
                });

                f.on('message', (msg, seqno) => {
                    msg.on('body', (stream, info) => {
                        simpleParser(stream, async (err, parsed) => {
                            if (err) return;

                            try {
                                const emailId = userId + '_' + Date.now() + '_' + seqno;
                                
                                const emailData = {
                                    userId: userId,
                                    emailId: emailId,
                                    messageId: parsed.messageId || emailId,
                                    from: parsed.from?.text || 'Unknown',
                                    to: parsed.to?.text || userId,
                                    subject: parsed.subject || '(No Subject)',
                                    date: parsed.date ? parsed.date.toISOString() : new Date().toISOString(),
                                    text: parsed.text || '',
                                    html: parsed.html || '',
                                    attachments: parsed.attachments?.map(att => ({
                                        filename: att.filename,
                                        contentType: att.contentType,
                                        size: att.size
                                    })) || [],
                                    folder: 'inbox',
                                    isRead: false,
                                    isStarred: false,
                                    labels: [],
                                    timestamp: Date.now()
                                };

                                await dynamodb.put({
                                    TableName: TABLE_NAME,
                                    Item: emailData
                                }).promise();

                                emailCount++;
                            } catch (saveErr) {
                                console.error('Error saving:', saveErr);
                            }
                        });
                    });
                });

                f.once('end', () => {
                    imap.end();
                });
            });
        });

        imap.once('error', (err) => {
            reject({
                statusCode: 500,
                body: JSON.stringify({ error: 'IMAP error', details: err.message })
            });
        });

        imap.once('end', () => {
            resolve({
                statusCode: 200,
                body: JSON.stringify({ 
                    message: 'Sync completed',
                    userId: userId,
                    emailsSynced: emailCount
                })
            });
        });

        imap.connect();
    });
};
EOF

cat > package.json << 'EOF'
{
  "name": "blakely-cinematics-mail-imap-sync",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "imap": "^0.8.19",
    "mailparser": "^3.5.0",
    "aws-sdk": "^2.1450.0"
  }
}
EOF

npm install
zip -r function.zip index.js node_modules package.json

aws lambda update-function-code --function-name blakely-cinematics-mail-imap-sync --zip-file fileb://function.zip --region us-east-1

cd /
rm -rf /tmp/lambda-update
echo '✅ Lambda function updated!'
