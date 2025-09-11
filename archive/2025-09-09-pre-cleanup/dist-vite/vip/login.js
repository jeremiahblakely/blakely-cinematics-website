/**
 * VIP Login Script
 * Handles the login form and JWT authentication
 */

document.addEventListener('DOMContentLoaded', function() {
    // Load VIP auth manager
    const script = document.createElement('script');
    script.src = '/public/vip/app.js';
    script.onload = initializeLogin;
    document.head.appendChild(script);
});

function initializeLogin() {
    const vipForm = document.getElementById('vip-login-form');
    
    // Check if already authenticated
    if (window.VIPAuth && window.VIPAuth.isAuthenticated()) {
        window.location.href = '/gallery.html';
        return;
    }
    
    // Check for error messages in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('error') === 'session_expired') {
        showMessage('Your session has expired. Please login again.', 'error');
    }
    
    function showMessage(message, type) {
        let messageEl = document.querySelector('.admin-message');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.className = 'admin-message';
            messageEl.style.textAlign = 'center';
            messageEl.style.marginTop = '1rem';
            messageEl.style.fontSize = '0.9rem';
            vipForm.appendChild(messageEl);
        }
        
        messageEl.textContent = message;
        messageEl.style.color = type === 'error' ? '#ef4444' : 
                               type === 'loading' ? '#FF6B35' : '#10b981';
    }
    
    vipForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const galleryCode = document.getElementById('gallery-code').value.trim();
        const password = document.getElementById('vip-password').value.trim();
        const submitBtn = document.querySelector('.admin-login-btn');
        const originalText = submitBtn.textContent;
        
        // Show loading message
        showMessage('Verifying credentials...', 'loading');
        submitBtn.textContent = 'Verifying...';
        submitBtn.disabled = true;
        
        try {
            // Use JWT authentication
            const result = await window.VIPAuth.login(galleryCode, password);
            
            if (result.success) {
                showMessage('Access granted! Loading gallery...', 'success');
                
                // Store client info for gallery page
                sessionStorage.setItem('vipClient', JSON.stringify(result.client));
                
                // Redirect to gallery
                setTimeout(() => {
                    window.location.href = '/gallery.html';
                }, 800);
            } else {
                showMessage(result.error || 'Invalid gallery code or password.', 'error');
                
                // Reset form
                document.getElementById('gallery-code').value = '';
                document.getElementById('vip-password').value = '';
                
                // Reset button
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                
                // Focus back to gallery code input
                document.getElementById('gallery-code').focus();
            }
        } catch (error) {
            console.error('Login error:', error);
            showMessage('An error occurred. Please try again.', 'error');
            
            // Reset button
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
    
    // Focus gallery code field on load
    document.getElementById('gallery-code').focus();
}
