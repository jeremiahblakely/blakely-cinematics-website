/**
 * DynamoDB Table Schemas for Blakely Cinematics
 * Define all table structures and indexes
 */

const TABLE_SCHEMAS = {
    /**
     * Galleries Table
     * Stores gallery metadata and settings
     */
    Galleries: {
        TableName: 'blakely-galleries',
        KeySchema: [
            { AttributeName: 'galleryId', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'galleryId', AttributeType: 'S' },
            { AttributeName: 'clientId', AttributeType: 'S' },
            { AttributeName: 'createdAt', AttributeType: 'S' },
            { AttributeName: 'status', AttributeType: 'S' }
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'ClientIdIndex',
                KeySchema: [
                    { AttributeName: 'clientId', KeyType: 'HASH' },
                    { AttributeName: 'createdAt', KeyType: 'RANGE' }
                ],
                Projection: { ProjectionType: 'ALL' },
                ProvisionedThroughput: {
                    ReadCapacityUnits: 5,
                    WriteCapacityUnits: 5
                }
            },
            {
                IndexName: 'StatusIndex',
                KeySchema: [
                    { AttributeName: 'status', KeyType: 'HASH' },
                    { AttributeName: 'createdAt', KeyType: 'RANGE' }
                ],
                Projection: { ProjectionType: 'ALL' },
                ProvisionedThroughput: {
                    ReadCapacityUnits: 5,
                    WriteCapacityUnits: 5
                }
            }
        ],
        BillingMode: 'PROVISIONED',
        ProvisionedThroughput: {
            ReadCapacityUnits: 10,
            WriteCapacityUnits: 10
        },
        StreamSpecification: {
            StreamEnabled: true,
            StreamViewType: 'NEW_AND_OLD_IMAGES'
        },
        Tags: [
            { Key: 'Environment', Value: process.env.ENVIRONMENT || 'development' },
            { Key: 'Application', Value: 'BlakelyGalleries' }
        ]
    },

    /**
     * Assets Table
     * Stores individual asset information
     */
    Assets: {
        TableName: 'blakely-assets',
        KeySchema: [
            { AttributeName: 'galleryId', KeyType: 'HASH' },
            { AttributeName: 'assetId', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'galleryId', AttributeType: 'S' },
            { AttributeName: 'assetId', AttributeType: 'S' },
            { AttributeName: 'uploadedAt', AttributeType: 'S' },
            { AttributeName: 'status', AttributeType: 'S' }
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'StatusIndex',
                KeySchema: [
                    { AttributeName: 'galleryId', KeyType: 'HASH' },
                    { AttributeName: 'status', KeyType: 'RANGE' }
                ],
                Projection: { ProjectionType: 'ALL' },
                ProvisionedThroughput: {
                    ReadCapacityUnits: 5,
                    WriteCapacityUnits: 5
                }
            },
            {
                IndexName: 'UploadDateIndex',
                KeySchema: [
                    { AttributeName: 'galleryId', KeyType: 'HASH' },
                    { AttributeName: 'uploadedAt', KeyType: 'RANGE' }
                ],
                Projection: { ProjectionType: 'ALL' },
                ProvisionedThroughput: {
                    ReadCapacityUnits: 5,
                    WriteCapacityUnits: 5
                }
            }
        ],
        BillingMode: 'PROVISIONED',
        ProvisionedThroughput: {
            ReadCapacityUnits: 20,
            WriteCapacityUnits: 20
        }
    },

    /**
     * Folders Table
     * Manages folder hierarchy for galleries
     */
    Folders: {
        TableName: 'blakely-folders',
        KeySchema: [
            { AttributeName: 'galleryId', KeyType: 'HASH' },
            { AttributeName: 'folderId', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'galleryId', AttributeType: 'S' },
            { AttributeName: 'folderId', AttributeType: 'S' },
            { AttributeName: 'parentFolderId', AttributeType: 'S' },
            { AttributeName: 'createdAt', AttributeType: 'S' }
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'ParentFolderIndex',
                KeySchema: [
                    { AttributeName: 'galleryId', KeyType: 'HASH' },
                    { AttributeName: 'parentFolderId', KeyType: 'RANGE' }
                ],
                Projection: { ProjectionType: 'ALL' },
                ProvisionedThroughput: {
                    ReadCapacityUnits: 5,
                    WriteCapacityUnits: 5
                }
            }
        ],
        BillingMode: 'PROVISIONED',
        ProvisionedThroughput: {
            ReadCapacityUnits: 10,
            WriteCapacityUnits: 10
        }
    },

    /**
     * Ratings Table
     * Stores asset ratings from clients
     */
    Ratings: {
        TableName: 'blakely-ratings',
        KeySchema: [
            { AttributeName: 'assetId', KeyType: 'HASH' },
            { AttributeName: 'raterId', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'assetId', AttributeType: 'S' },
            { AttributeName: 'raterId', AttributeType: 'S' },
            { AttributeName: 'galleryId', AttributeType: 'S' },
            { AttributeName: 'rating', AttributeType: 'N' }
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'GalleryRatingsIndex',
                KeySchema: [
                    { AttributeName: 'galleryId', KeyType: 'HASH' },
                    { AttributeName: 'rating', KeyType: 'RANGE' }
                ],
                Projection: { ProjectionType: 'ALL' },
                ProvisionedThroughput: {
                    ReadCapacityUnits: 5,
                    WriteCapacityUnits: 5
                }
            }
        ],
        BillingMode: 'PROVISIONED',
        ProvisionedThroughput: {
            ReadCapacityUnits: 10,
            WriteCapacityUnits: 10
        }
    },

    /**
     * Gallery Access Table
     * Stores access tokens and permissions
     */
    GalleryAccess: {
        TableName: 'blakely-gallery-access',
        KeySchema: [
            { AttributeName: 'galleryId', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'galleryId', AttributeType: 'S' },
            { AttributeName: 'accessToken', AttributeType: 'S' },
            { AttributeName: 'expiresAt', AttributeType: 'S' }
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'AccessTokenIndex',
                KeySchema: [
                    { AttributeName: 'accessToken', KeyType: 'HASH' }
                ],
                Projection: { ProjectionType: 'ALL' },
                ProvisionedThroughput: {
                    ReadCapacityUnits: 5,
                    WriteCapacityUnits: 5
                }
            },
            {
                IndexName: 'ExpirationIndex',
                KeySchema: [
                    { AttributeName: 'expiresAt', KeyType: 'HASH' }
                ],
                Projection: { ProjectionType: 'KEYS_ONLY' },
                ProvisionedThroughput: {
                    ReadCapacityUnits: 2,
                    WriteCapacityUnits: 2
                }
            }
        ],
        BillingMode: 'PROVISIONED',
        ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
        },
        TimeToLiveSpecification: {
            AttributeName: 'ttl',
            Enabled: true
        }
    }
};

/**
 * S3 Bucket Configuration
 */
const S3_BUCKET_CONFIG = {
    BucketName: 'blakely-galleries-assets',
    Folders: {
        originals: 'originals/',      // Original full-resolution images
        optimized: 'optimized/',      // Web-optimized versions
        thumbnails: 'thumbnails/',    // Thumbnail images
        downloads: 'downloads/',      // Prepared download packages
        temp: 'temp/'                 // Temporary upload staging
    },
    CorsConfiguration: {
        CorsRules: [
            {
                AllowedHeaders: ['*'],
                AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
                AllowedOrigins: [
                    'https://blakelycinematics.com',
                    'https://staging.blakelycinematics.com',
                    'http://localhost:3000'
                ],
                ExposeHeaders: ['ETag', 'x-amz-server-side-encryption'],
                MaxAgeSeconds: 3000
            }
        ]
    },
    LifecycleConfiguration: {
        Rules: [
            {
                Id: 'DeleteTempFiles',
                Status: 'Enabled',
                Prefix: 'temp/',
                Expiration: {
                    Days: 1
                }
            },
            {
                Id: 'ArchiveOldDownloads',
                Status: 'Enabled',
                Prefix: 'downloads/',
                Transitions: [
                    {
                        Days: 30,
                        StorageClass: 'GLACIER_IR'
                    }
                ]
            }
        ]
    }
};

module.exports = {
    TABLE_SCHEMAS,
    S3_BUCKET_CONFIG
};
