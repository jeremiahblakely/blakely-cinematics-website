// admin/admin-app-config.js
// Created: September 14, 2025 14:20
// Purpose: Bootstrap API configuration for admin mail system

(function() {
    // Load API key from localStorage into window.CONFIG
    const apiKey = (function(){
        try { return localStorage.getItem('BC_API_KEY') || ''; } catch { return ''; }
    })();
    
    window.CONFIG = window.CONFIG || {};
    window.CONFIG.API_KEY = apiKey;
    window.CONFIG.API_BASE_URL = 'https://qtgzo3psyb.execute-api.us-east-1.amazonaws.com/prod';
    
    // Helper function to update API key
    window.configureApiKey = function(newKey) {
        try { localStorage.setItem('BC_API_KEY', newKey); } catch {}
        window.CONFIG.API_KEY = newKey;
        console.log('API key updated. Reload page to apply everywhere.');
        return 'API key configured';
    };
    
    // Debug helper
    window.checkApiConfig = function() {
        return {
            hasKey: !!window.CONFIG.API_KEY,
            keyLength: window.CONFIG.API_KEY ? window.CONFIG.API_KEY.length : 0,
            baseURL: window.CONFIG.API_BASE_URL
        };
    };
})();
