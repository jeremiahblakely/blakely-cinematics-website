/**
 * Gallery Access Utilities
 * Handles gallery-specific authentication and access control
 */

const crypto = require('crypto');

/**
 * Generate gallery token (simple version for testing)
 */
function generateGalleryToken() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate gallery credentials (access token + PIN)
 */
function generateGalleryCredentials(galleryId, options = {}) {
    const {
        expiresInHours = 72,
        maxViews = 1000,
        enablePIN = true
    } = options;

    const accessToken = crypto.randomBytes(32).toString('hex');
    const pin = enablePIN ? Math.floor(1000 + Math.random() * 9000).toString() : null;
    const expiresAt = Date.now() + (expiresInHours * 60 * 60 * 1000);

    return {
        galleryId,
        accessToken,
        pin,
        expiresAt,
        maxViews,
        createdAt: Date.now()
    };
}

/**
 * Validate gallery access credentials
 */
function validateGalleryAccess(credentials, providedToken, providedPIN = null) {
    if (!credentials) {
        return { valid: false, reason: 'Gallery access not found' };
    }

    if (Date.now() > credentials.expiresAt) {
        return { valid: false, reason: 'Gallery access has expired' };
    }

    if (credentials.accessToken !== providedToken) {
        return { valid: false, reason: 'Invalid access token' };
    }

    if (credentials.pinHash && providedPIN) {
        const providedPINHash = hashPIN(providedPIN);
        if (credentials.pinHash !== providedPINHash) {
            return { valid: false, reason: 'Invalid PIN' };
        }
    }

    if (credentials.viewCount >= credentials.maxViews) {
        return { valid: false, reason: 'Maximum view limit exceeded' };
    }

    return { valid: true };
}

/**
 * Generate shareable URL for gallery access
 */
function generateShareableURL(baseURL, galleryId, accessToken) {
    return `${baseURL}/vip/gallery/${galleryId}?token=${accessToken}`;
}

/**
 * Hash PIN for secure storage
 */
function hashPIN(pin) {
    if (!pin) return null;
    return crypto.createHash('sha256').update(pin.toString()).digest('hex');
}

/**
 * Check rate limit for gallery access attempts
 */
async function checkRateLimit(identifier, maxAttempts = 100) {
    // Mock implementation for testing
    return {
        allowed: true,
        remaining: maxAttempts - 1,
        resetTime: Date.now() + (60 * 60 * 1000) // 1 hour
    };
}

module.exports = {
    generateGalleryToken,
    generateGalleryCredentials,
    validateGalleryAccess,
    generateShareableURL,
    hashPIN,
    checkRateLimit
};