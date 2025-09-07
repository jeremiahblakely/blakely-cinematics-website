// Blakely Cinematics API Configuration
const API_CONFIG = {
    // Production API endpoint (new unified backend)
    BASE_URL: 'https://qtgzo3psyb.execute-api.us-east-1.amazonaws.com/prod',
    
    // API Endpoints
    ENDPOINTS: {
        HEALTH: '/health',
        LOGIN: '/auth/login',
        CONTACT: '/contact',
        GALLERIES: '/galleries',
        IMAGES: '/images',
        BOOKINGS: '/bookings'
    }
};

// Make available globally
window.API_CONFIG = API_CONFIG;