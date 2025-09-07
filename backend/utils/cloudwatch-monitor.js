/**
 * CloudWatch Monitoring Utilities
 * Tracks metrics, logs, and alarms for gallery access
 */

const AWS = require('aws-sdk');
const cloudwatch = new AWS.CloudWatch({ region: process.env.AWS_REGION || 'us-east-1' });

/**
 * Metric namespace for the application
 */
const NAMESPACE = 'BlakelyGalleries';

/**
 * Send custom metric to CloudWatch
 */
async function putMetric(metricName, value, unit = 'Count', dimensions = []) {
    const params = {
        Namespace: NAMESPACE,
        MetricData: [
            {
                MetricName: metricName,
                Value: value,
                Unit: unit,
                Timestamp: new Date(),
                Dimensions: dimensions
            }
        ]
    };
    
    try {
        await cloudwatch.putMetricData(params).promise();
        console.log(`Metric sent: ${metricName} = ${value}`);
    } catch (error) {
        console.error('Failed to send metric:', error);
    }
}

/**
 * Track authentication events
 */
async function trackAuthEvent(eventType, galleryId, success) {
    const dimensions = [
        { Name: 'EventType', Value: eventType },
        { Name: 'Status', Value: success ? 'Success' : 'Failure' }
    ];
    
    if (galleryId) {
        dimensions.push({ Name: 'GalleryId', Value: galleryId });
    }
    
    await putMetric('AuthenticationEvents', 1, 'Count', dimensions);
}

/**
 * Track gallery access
 */
async function trackGalleryAccess(galleryId, method) {
    await putMetric('GalleryAccess', 1, 'Count', [
        { Name: 'GalleryId', Value: galleryId },
        { Name: 'Method', Value: method } // 'token' or 'pin'
    ]);
}

/**
 * Track API latency
 */
async function trackAPILatency(endpoint, latencyMs) {
    await putMetric('APILatency', latencyMs, 'Milliseconds', [
        { Name: 'Endpoint', Value: endpoint }
    ]);
}

/**
 * Track rate limiting
 */
async function trackRateLimit(identifier, blocked) {
    await putMetric('RateLimitEvents', 1, 'Count', [
        { Name: 'Status', Value: blocked ? 'Blocked' : 'Allowed' }
    ]);
}

/**
 * Track error events
 */
async function trackError(errorType, endpoint) {
    await putMetric('Errors', 1, 'Count', [
        { Name: 'ErrorType', Value: errorType },
        { Name: 'Endpoint', Value: endpoint }
    ]);
}

/**
 * Create CloudWatch alarm
 */
async function createAlarm(alarmName, metricName, threshold, comparisonOperator = 'GreaterThanThreshold') {
    const params = {
        AlarmName: alarmName,
        ComparisonOperator: comparisonOperator,
        EvaluationPeriods: 2,
        MetricName: metricName,
        Namespace: NAMESPACE,
        Period: 300, // 5 minutes
        Statistic: 'Sum',
        Threshold: threshold,
        ActionsEnabled: true,
        AlarmActions: [process.env.SNS_TOPIC_ARN], // SNS topic for notifications
        AlarmDescription: `Alarm for ${metricName} exceeding ${threshold}`,
        TreatMissingData: 'notBreaching'
    };
    
    try {
        await cloudwatch.putMetricAlarm(params).promise();
        console.log(`Alarm created: ${alarmName}`);
    } catch (error) {
        console.error('Failed to create alarm:', error);
    }
}

/**
 * Setup default alarms
 */
async function setupDefaultAlarms() {
    // High error rate alarm
    await createAlarm(
        'HighErrorRate',
        'Errors',
        10,
        'GreaterThanThreshold'
    );
    
    // High authentication failure rate
    await createAlarm(
        'HighAuthFailures',
        'AuthenticationEvents',
        20,
        'GreaterThanThreshold'
    );
    
    // Rate limit exceeded alarm
    await createAlarm(
        'RateLimitExceeded',
        'RateLimitEvents',
        50,
        'GreaterThanThreshold'
    );
    
    // High API latency alarm
    await createAlarm(
        'HighAPILatency',
        'APILatency',
        3000, // 3 seconds
        'GreaterThanThreshold'
    );
}

/**
 * Log structured data for CloudWatch Logs
 */
function logStructured(level, message, data = {}) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...data,
        environment: process.env.ENVIRONMENT || 'development'
    };
    
    console.log(JSON.stringify(logEntry));
}

/**
 * Performance timer utility
 */
class PerformanceTimer {
    constructor(endpoint) {
        this.endpoint = endpoint;
        this.startTime = Date.now();
    }
    
    async end() {
        const duration = Date.now() - this.startTime;
        await trackAPILatency(this.endpoint, duration);
        return duration;
    }
}

/**
 * Batch metrics for efficiency
 */
class MetricsBatcher {
    constructor(flushInterval = 10000) {
        this.metrics = [];
        this.flushInterval = flushInterval;
        this.timer = null;
        this.startTimer();
    }
    
    add(metricName, value, unit = 'Count', dimensions = []) {
        this.metrics.push({
            MetricName: metricName,
            Value: value,
            Unit: unit,
            Timestamp: new Date(),
            Dimensions: dimensions
        });
        
        // Auto-flush if batch is large
        if (this.metrics.length >= 20) {
            this.flush();
        }
    }
    
    async flush() {
        if (this.metrics.length === 0) return;
        
        const params = {
            Namespace: NAMESPACE,
            MetricData: this.metrics.splice(0, 20) // CloudWatch limit
        };
        
        try {
            await cloudwatch.putMetricData(params).promise();
        } catch (error) {
            console.error('Failed to flush metrics:', error);
        }
    }
    
    startTimer() {
        this.timer = setInterval(() => this.flush(), this.flushInterval);
    }
    
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.flush(); // Final flush
        }
    }
}

module.exports = {
    putMetric,
    trackAuthEvent,
    trackGalleryAccess,
    trackAPILatency,
    trackRateLimit,
    trackError,
    createAlarm,
    setupDefaultAlarms,
    logStructured,
    PerformanceTimer,
    MetricsBatcher
};
