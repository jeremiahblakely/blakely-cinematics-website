/**
 * API Configuration
 * Created: December 17, 2024
 * Purpose: Handle API endpoints for local and production environments
 */

// Detect environment based on hostname
const isLocal = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' || 
                window.location.hostname.includes('192.168');

// API Configuration
const API_CONFIG = {
    // AWS Lambda endpoint for mail
    LAMBDA_URL: 'https://qtgzo3psyb.execute-api.us-east-1.amazonaws.com/prod',
    
    // Base URL changes based on environment
    BASE_URL: isLocal 
        ? 'https://qtgzo3psyb.execute-api.us-east-1.amazonaws.com/prod'
        : '', // Empty for production (uses relative paths)
    
    // Mail endpoints
    MAIL: {
        SEND: isLocal 
            ? 'https://qtgzo3psyb.execute-api.us-east-1.amazonaws.com/prod/mail/send'
            : '/api/mail/send',
        FETCH: isLocal
            ? 'https://qtgzo3psyb.execute-api.us-east-1.amazonaws.com/prod/mail/fetch'
            : '/api/mail/fetch'
    },
    
    // Legacy API Endpoints
    ENDPOINTS: {
        HEALTH: '/health',
        LOGIN: '/auth/login',
        CONTACT: '/contact',
        GALLERIES: '/galleries',
        IMAGES: '/images',
        BOOKINGS: '/bookings'
    }
};

// Export globally
window.API_CONFIG = API_CONFIG;

console.log('[API Config] Environment:', isLocal ? 'Local Development' : 'Production');
console.log('[API Config] Mail endpoint:', API_CONFIG.MAIL.SEND);