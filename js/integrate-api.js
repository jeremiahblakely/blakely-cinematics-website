// Blakely Cinematics API Integration
// This file provides the main API integration functionality for the Blakely Cinematics website

// Initialize API integration when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Blakely Cinematics API Integration loaded');
    console.log('API Base URL:', API_CONFIG.BASE_URL);
    
    // Initialize any API-dependent functionality here
    initializeAPIFeatures();
});

// Initialize API-dependent features
function initializeAPIFeatures() {
    // Add any initialization code here
    console.log('API features initialized');
}

// Generic API request function
async function apiRequest(endpoint, options = {}) {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    
    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    try {
        const response = await fetch(url, finalOptions);
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API request error:', error);
        throw error;
    }
}

// Health check function
async function checkAPIHealth() {
    try {
        const response = await apiRequest(API_CONFIG.ENDPOINTS.HEALTH);
        console.log('API Health Check:', response);
        return response;
    } catch (error) {
        console.error('API health check failed:', error);
        return null;
    }
}

// Contact form submission
async function submitContactForm(formData) {
    try {
        const response = await apiRequest(API_CONFIG.ENDPOINTS.CONTACT, {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        return response;
    } catch (error) {
        console.error('Contact form submission failed:', error);
        throw error;
    }
}

// Gallery functions
async function getGalleries() {
    try {
        const response = await apiRequest(API_CONFIG.ENDPOINTS.GALLERIES);
        return response;
    } catch (error) {
        console.error('Failed to get galleries:', error);
        throw error;
    }
}

// Authentication function
async function authenticate(credentials) {
    try {
        const response = await apiRequest(API_CONFIG.ENDPOINTS.LOGIN, {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
        return response;
    } catch (error) {
        console.error('Authentication failed:', error);
        throw error;
    }
}

// Booking functions
async function createBooking(bookingData) {
    try {
        const response = await apiRequest(API_CONFIG.ENDPOINTS.BOOKINGS, {
            method: 'POST',
            body: JSON.stringify(bookingData)
        });
        return response;
    } catch (error) {
        console.error('Failed to create booking:', error);
        throw error;
    }
}

async function getBookings() {
    try {
        const response = await apiRequest(API_CONFIG.ENDPOINTS.BOOKINGS);
        return response;
    } catch (error) {
        console.error('Failed to get bookings:', error);
        throw error;
    }
}

// Make functions available globally
window.BlakelyAPI = {
    checkHealth: checkAPIHealth,
    submitContactForm: submitContactForm,
    getGalleries: getGalleries,
    authenticate: authenticate,
    createBooking: createBooking,
    getBookings: getBookings,
    request: apiRequest
};