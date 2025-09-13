// WorkMail IMAP Sync Lambda
// Created: September 12, 2025, 8:30 PM
// Purpose: Sync WorkMail emails via IMAP to DynamoDB

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const ddbClient = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const secretsClient = new SecretsManagerClient({ region: 'us-east-1' });

// We'll install these packages
const Imap = require('node-imap');
const { simpleParser } = require('mailparser');

async function getCredentials() {
    try {
        const command = new GetSecretValueCommand({
            SecretId: 'blakely-workmail-credentials'
        });
        const response = await secretsClient.send(command);
        return JSON.parse(response.SecretString);
    } catch (error) {
        console.error('Failed to get credentials:', error);
        throw error;
    }
}

async function fetchEmails(credentials, folder = 'INBOX', limit = 50) {
    return new Promise((resolve, reject) => {
        const emails = [];
        const parsePromises = [];
        let imap;
        let fetch = null; // capture to cleanup later
        let settled = false;
        let timeoutId = null;

        // ---- helpers ----------------------------------------------------------
        const cleanup = () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            try { if (imap) imap.removeAllListeners(); } catch {}
            try { if (fetch) fetch.removeAllListeners(); } catch {}
        };

        const done = () => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve(emails);
        };

        const fail = (err) => {
            if (settled) return;
            settled = true;
            cleanup();
            reject(err);
        };

        // ---- optional dev visibility -----------------------------------------
        if (process.env.NODE_ENV !== 'production') {
            process.on('unhandledRejection', (r) => console.error('UNHANDLED REJECTION', r));
            process.on('uncaughtException',  (e) => console.error('UNCAUGHT EXCEPTION', e));
        }

        // ---- timeout protection (30s) ----------------------------------------
        timeoutId = setTimeout(() => {
            fail(new Error('IMAP operation timed out after 30s'));
        }, 30_000);

        // ---- helper function for parsing one message -------------------------
        const parseOneMessageAsync = (msg) => {
            return new Promise((resolveMsg, rejectMsg) => {
                let emailData = { headers: {}, body: '', uid: null, flags: [] };
                
                msg.on('body', (stream) => {
                    let buffer = '';
                    stream.on('data', (chunk) => {
                        buffer += chunk.toString('utf8');
                    });
                    stream.on('end', () => {
                        // Parse the email buffer
                        simpleParser(buffer)
                            .then(parsed => {
                                const parsedEmailData = {
                                    messageId: parsed.messageId,
                                    from: parsed.from?.text,
                                    to: parsed.to?.text,
                                    subject: parsed.subject,
                                    date: parsed.date,
                                    text: parsed.text,
                                    html: parsed.html || parsed.textAsHtml,
                                    attachments: parsed.attachments?.length || 0,
                                    uid: emailData.uid,
                                    flags: emailData.flags
                                };
                                resolveMsg(parsedEmailData);
                            })
                            .catch(parseError => {
                                console.error('Email parsing error:', parseError);
                                // Still return basic email data even if parsing fails
                                const basicEmailData = {
                                    messageId: `parse-error-${Date.now()}`,
                                    from: 'Unknown',
                                    to: 'Unknown',
                                    subject: '(Parse Error)',
                                    date: new Date(),
                                    text: 'Email parsing failed',
                                    html: '<p>Email parsing failed</p>',
                                    attachments: 0,
                                    uid: emailData.uid,
                                    flags: emailData.flags
                                };
                                resolveMsg(basicEmailData);
                            });
                    });
                });
                
                msg.once('attributes', (attrs) => {
                    emailData.uid = attrs.uid;
                    emailData.flags = attrs.flags;
                });
                
                msg.once('error', rejectMsg);
            });
        };

        // ---- IMAP wiring ------------------------------------------------------
        const onReady = () => {
            // open the mailbox, then start fetch
            imap.openBox(folder, false, (err, box) => {
                if (err) return fail(err);

                // Fetch recent emails
                fetch = imap.seq.fetch(`${Math.max(1, box.messages.total - limit)}:*`, {
                    bodies: '',
                    struct: true,
                    envelope: true
                });

                // fan-in every per-message parse promise
                fetch.on('message', (msg) => {
                    const p = parseOneMessageAsync(msg)
                        .then((email) => { 
                            if (email) emails.push(email); 
                            return email;
                        });
                    // IMPORTANT: capture rejections into fail via Promise.all below
                    parsePromises.push(p);
                });

                fetch.once('error', fail);

                fetch.once('end', async () => {
                    try {
                        await Promise.all(parsePromises); // ensure no orphan async
                        console.log(`Successfully parsed ${emails.length} emails`);
                        // request connection close AFTER all parsing
                        try { imap.end(); } catch (e) { return fail(e); }
                        // DO NOT resolve here; wait for 'close'
                    } catch (e) {
                        return fail(e);
                    }
                });
            });
        };

        const onClose = (hadError) => {
            if (hadError) return fail(new Error('IMAP connection closed with error'));
            return done(); // resolve only after full close & no error
        };

        const onError = (err) => fail(err);

        // ---- create and connect client ---------------------------------------
        try {
            imap = new Imap({
                user: credentials.email,
                password: credentials.password,
                host: 'imap.mail.us-east-1.awsapps.com',
                port: 993,
                tls: true,
                tlsOptions: { rejectUnauthorized: false }
            });
            imap.once('ready', onReady);
            imap.once('close', onClose);
            imap.on('error', onError);
            imap.connect(); // can throw synchronously
        } catch (e) {
            return fail(e);
        }
    });
}

async function storeEmails(emails, accountId) {
    const timestamp = Date.now();
    
    for (const email of emails) {
        const emailId = `imap-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
        
        const params = {
            TableName: 'blakely-cinematics-emails',
            Item: {
                userId: accountId,
                emailId: emailId,
                folder: email.flags?.includes('\\Seen') ? 'inbox' : 'unread',
                from: email.from,
                to: email.to,
                subject: email.subject || '(No Subject)',
                textBody: email.text,
                htmlBody: email.html,
                timestamp: email.date ? new Date(email.date).getTime() : timestamp,
                messageId: email.messageId,
                attachments: email.attachments,
                source: 'workmail-imap'
            }
        };
        
        await docClient.send(new PutCommand(params));
    }
    
    return emails.length;
}

exports.handler = async (event) => {
    console.log('IMAP Sync triggered:', JSON.stringify(event, null, 2));
    
    try {
        // Get account to sync (from event or default)
        const accountId = event.accountId || 'jd@blakelycinematics.com';
        const folder = event.folder || 'INBOX';
        
        // Get credentials
        const credentials = await getCredentials();
        
        // Fetch emails from WorkMail
        console.log(`Fetching emails from ${folder}...`);
        const emails = await fetchEmails(credentials, folder);
        
        // Store in DynamoDB
        console.log(`Storing ${emails.length} emails...`);
        const stored = await storeEmails(emails, accountId);
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                message: `Synced ${stored} emails from ${accountId}`,
                count: stored
            })
        };
        
    } catch (error) {
        console.error('IMAP sync error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};
