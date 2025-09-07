/**
 * JWT Utilities Module
 * Handles JWT token generation, validation, and refresh for VIP authentication
 */

const crypto = require('crypto');

// Environment variables (set these in Lambda)
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key-change-in-production';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';
const ACCESS_TOKEN_EXPIRY = 15 * 60; // 15 minutes in seconds
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Base64URL encode
 */
function base64UrlEncode(str) {
    return Buffer.from(str)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

/**
 * Base64URL decode
 */
function base64UrlDecode(str) {
    str += Array(5 - str.length % 4).join('=');
    return Buffer.from(str
        .replace(/-/g, '+')
        .replace(/_/g, '/'), 'base64').toString();
}

/**
 * Create HMAC signature
 */
function createSignature(data, secret) {
    return crypto
        .createHmac('sha256', secret)
        .update(data)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

/**
 * Generate JWT token
 */
function generateToken(payload, secret, expiresIn) {
    const header = {
        alg: 'HS256',
        typ: 'JWT'
    };
    
    const now = Math.floor(Date.now() / 1000);
    const tokenPayload = {
        ...payload,
        iat: now,
        exp: now + expiresIn
    };
    
    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload));
    const signature = createSignature(`${encodedHeader}.${encodedPayload}`, secret);
    
    return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verify and decode JWT token
 */
function verifyToken(token, secret) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid token format');
        }
        
        const [encodedHeader, encodedPayload, signature] = parts;
        
        // Verify signature
        const expectedSignature = createSignature(`${encodedHeader}.${encodedPayload}`, secret);
        if (signature !== expectedSignature) {
            throw new Error('Invalid signature');
        }
        
        // Decode payload
        const payload = JSON.parse(base64UrlDecode(encodedPayload));
        
        // Check expiration
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
            throw new Error('Token expired');
        }
        
        return {
            valid: true,
            payload
        };
    } catch (error) {
        return {
            valid: false,
            error: error.message
        };
    }
}

/**
 * Generate access token
 */
function generateAccessToken(payload) {
    return generateToken(payload, JWT_SECRET, ACCESS_TOKEN_EXPIRY);
}

/**
 * Generate refresh token
 */
function generateRefreshToken(payload) {
    return generateToken(payload, REFRESH_SECRET, REFRESH_TOKEN_EXPIRY);
}

/**
 * Verify access token
 */
function verifyAccessToken(token) {
    return verifyToken(token, JWT_SECRET);
}

/**
 * Verify refresh token
 */
function verifyRefreshToken(token) {
    return verifyToken(token, REFRESH_SECRET);
}

/**
 * Extract token from Authorization header
 */
function extractTokenFromHeader(authHeader) {
    if (!authHeader) return null;
    
    // Support both 'Bearer <token>' and direct token
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        return parts[1];
    }
    return authHeader;
}

/**
 * Create token pair (access + refresh)
 */
function createTokenPair(payload) {
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    
    return {
        accessToken,
        refreshToken,
        expiresIn: ACCESS_TOKEN_EXPIRY,
        tokenType: 'Bearer'
    };
}

/**
 * Refresh access token using refresh token
 */
function refreshAccessToken(refreshToken) {
    const result = verifyRefreshToken(refreshToken);
    
    if (!result.valid) {
        throw new Error('Invalid refresh token');
    }
    
    // Create new token pair with same payload (minus exp/iat)
    const { exp, iat, ...payload } = result.payload;
    return createTokenPair(payload);
}

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    extractTokenFromHeader,
    createTokenPair,
    refreshAccessToken,
    ACCESS_TOKEN_EXPIRY,
    REFRESH_TOKEN_EXPIRY
};
