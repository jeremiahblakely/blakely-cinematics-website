/**
 * VIP Client Application
 * Handles JWT authentication and API communication
 */

class VIPAuthManager {
    constructor() {
        this.tokens = {
            access: null,
            refresh: null,
            expiresAt: null
        };
        this.client = null;
        this.refreshTimer = null;
        this.apiBase = 'https://kyjf2wp972.execute-api.us-east-1.amazonaws.com/dev';
        
        // Check for existing tokens on initialization
        this.loadStoredTokens();
    }
    
    /**
     * Load tokens from localStorage (optional persistence)
     */
    loadStoredTokens() {
        try {
            const stored = localStorage.getItem('vip_auth');
            if (stored) {
                const data = JSON.parse(stored);
                // Verify token hasn't expired
                if (data.expiresAt && new Date(data.expiresAt) > new Date()) {
                    this.tokens = data;
                    this.client = data.client;
                    this.scheduleTokenRefresh();
                    return true;
                }
            }
        } catch (e) {
            console.warn('Could not load stored tokens:', e);
        }
        return false;
    }
    
    /**
     * Save tokens to localStorage (optional persistence)
     */
    saveTokens() {
        try {
            if (this.tokens.access) {
                localStorage.setItem('vip_auth', JSON.stringify({
                    ...this.tokens,
                    client: this.client
                }));
            }
        } catch (e) {
            console.warn('Could not save tokens:', e);
        }
    }
    
    /**
     * Clear stored tokens
     */
    clearTokens() {
        this.tokens = {
            access: null,
            refresh: null,
            expiresAt: null
        };
        this.client = null;
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
        try {
            localStorage.removeItem('vip_auth');
            sessionStorage.removeItem('vipAuthenticated');
            sessionStorage.removeItem('vipGalleryCode');
            sessionStorage.removeItem('vipPassword');
        } catch (e) {
            console.warn('Could not clear stored tokens:', e);
        }
    }
    
    /**
     * Login with gallery code and password
     */
    async login(galleryCode, password) {
        try {
            const response = await fetch(`${this.apiBase}/vip/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    galleryCode: galleryCode.toUpperCase(),
                    password
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }
            
            // Store tokens
            this.tokens = {
                access: data.data.accessToken,
                refresh: data.data.refreshToken,
                expiresAt: new Date(Date.now() + (data.data.expiresIn * 1000))
            };
            this.client = data.data.client;
            
            // Save to localStorage
            this.saveTokens();
            
            // Schedule token refresh
            this.scheduleTokenRefresh();
            
            return {
                success: true,
                client: this.client
            };
            
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Schedule automatic token refresh
     */
    scheduleTokenRefresh() {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }
        
        if (!this.tokens.expiresAt) return;
        
        // Refresh 1 minute before expiry
        const expiresAt = new Date(this.tokens.expiresAt);
        const refreshAt = expiresAt.getTime() - (60 * 1000);
        const now = Date.now();
        
        if (refreshAt > now) {
            const delay = refreshAt - now;
            console.log(`Scheduling token refresh in ${Math.round(delay / 1000)} seconds`);
            
            this.refreshTimer = setTimeout(() => {
                this.refreshToken();
            }, delay);
        }
    }
    
    /**
     * Refresh access token
     */
    async refreshToken() {
        if (!this.tokens.refresh) {
            console.error('No refresh token available');
            this.handleAuthFailure();
            return false;
        }
        
        try {
            const response = await fetch(`${this.apiBase}/refresh-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    refreshToken: this.tokens.refresh
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Token refresh failed');
            }
            
            // Update tokens
            this.tokens = {
                access: data.data.accessToken,
                refresh: data.data.refreshToken,
                expiresAt: new Date(Date.now() + (data.data.expiresIn * 1000))
            };
            
            // Save updated tokens
            this.saveTokens();
            
            // Schedule next refresh
            this.scheduleTokenRefresh();
            
            console.log('Token refreshed successfully');
            return true;
            
        } catch (error) {
            console.error('Token refresh error:', error);
            this.handleAuthFailure();
            return false;
        }
    }
    
    /**
     * Make authenticated API request
     */
    async apiRequest(endpoint, options = {}) {
        // Check if token needs refresh
        if (this.tokens.expiresAt && new Date(this.tokens.expiresAt) <= new Date()) {
            console.log('Token expired, refreshing...');
            const refreshed = await this.refreshToken();
            if (!refreshed) {
                throw new Error('Authentication required');
            }
        }
        
        // Add auth header
        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${this.tokens.access}`,
            'Content-Type': 'application/json'
        };
        
        const response = await fetch(`${this.apiBase}${endpoint}`, {
            ...options,
            headers
        });
        
        // Handle 401 Unauthorized
        if (response.status === 401) {
            console.log('Received 401, attempting token refresh...');
            const refreshed = await this.refreshToken();
            if (refreshed) {
                // Retry request with new token
                headers.Authorization = `Bearer ${this.tokens.access}`;
                return fetch(`${this.apiBase}${endpoint}`, {
                    ...options,
                    headers
                });
            } else {
                this.handleAuthFailure();
                throw new Error('Authentication failed');
            }
        }
        
        return response;
    }
    
    /**
     * Handle authentication failure
     */
    handleAuthFailure() {
        console.error('Authentication failed, redirecting to login...');
        this.clearTokens();
        
        // Redirect to VIP login page
        if (window.location.pathname !== '/vip.html') {
            window.location.href = '/vip.html?error=session_expired';
        }
    }
    
    /**
     * Logout
     */
    logout() {
        this.clearTokens();
        window.location.href = '/vip.html';
    }
    
    /**
     * Check if authenticated
     */
    isAuthenticated() {
        return !!(this.tokens.access && this.tokens.expiresAt && 
                 new Date(this.tokens.expiresAt) > new Date());
    }
    
    /**
     * Get current client info
     */
    getClient() {
        return this.client;
    }
}

/**
 * VIP API Client
 */
class VIPApiClient {
    constructor(authManager) {
        this.auth = authManager;
    }
    
    /**
     * Get gallery details
     */
    async getGallery(galleryId) {
        const response = await this.auth.apiRequest(`/vip/galleries/${galleryId}`);
        return response.json();
    }
    
    /**
     * Get gallery assets
     */
    async getAssets(galleryId, options = {}) {
        const params = new URLSearchParams();
        if (options.page) params.append('page', options.page);
        if (options.limit) params.append('limit', options.limit);
        if (options.folderId) params.append('folderId', options.folderId);
        
        const query = params.toString() ? `?${params.toString()}` : '';
        const response = await this.auth.apiRequest(`/vip/galleries/${galleryId}/assets${query}`);
        return response.json();
    }
    
    /**
     * Update asset rating
     */
    async updateRating(galleryId, assetId, rating) {
        const response = await this.auth.apiRequest(
            `/vip/galleries/${galleryId}/assets/${assetId}/rating`,
            {
                method: 'PATCH',
                body: JSON.stringify({ rating })
            }
        );
        return response.json();
    }
    
    /**
     * Create folder
     */
    async createFolder(galleryId, name, description) {
        const response = await this.auth.apiRequest(
            `/vip/galleries/${galleryId}/folders`,
            {
                method: 'POST',
                body: JSON.stringify({ name, description })
            }
        );
        return response.json();
    }
    
    /**
     * Delete folder
     */
    async deleteFolder(galleryId, folderId) {
        const response = await this.auth.apiRequest(
            `/vip/galleries/${galleryId}/folders/${folderId}`,
            {
                method: 'DELETE'
            }
        );
        return response.json();
    }
    
    /**
     * Trash assets
     */
    async trashAssets(galleryId, assetIds) {
        const response = await this.auth.apiRequest(
            `/vip/galleries/${galleryId}/trash`,
            {
                method: 'POST',
                body: JSON.stringify({ assetIds })
            }
        );
        return response.json();
    }
    
    /**
     * Restore assets
     */
    async restoreAssets(galleryId, assetIds) {
        const response = await this.auth.apiRequest(
            `/vip/galleries/${galleryId}/restore`,
            {
                method: 'POST',
                body: JSON.stringify({ assetIds })
            }
        );
        return response.json();
    }
    
    /**
     * Finalize gallery
     */
    async finalizeGallery(galleryId, assetIds, notes) {
        const response = await this.auth.apiRequest(
            `/vip/galleries/${galleryId}/finalize`,
            {
                method: 'POST',
                body: JSON.stringify({ assetIds, notes })
            }
        );
        return response.json();
    }
}

// Initialize auth manager and API client
const vipAuth = new VIPAuthManager();
const vipApi = new VIPApiClient(vipAuth);

// Export for use in other scripts
window.VIPAuth = vipAuth;
window.VIPApi = vipApi;

// Auto-redirect if not authenticated and not on login page
if (window.location.pathname !== '/vip.html' && !vipAuth.isAuthenticated()) {
    console.log('Not authenticated, redirecting to login...');
    window.location.href = '/vip.html';
}

console.log('VIP Auth Manager initialized');
