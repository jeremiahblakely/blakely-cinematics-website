// Account Switcher for Admin Mail
// Created: September 12, 2025
// Handles dropdown account selection and email filtering

(function() {
    'use strict';
    
    let currentAccount = 'all';
    
    // Initialize account dropdown
    function initAccountDropdown() {
        console.log('Initializing account dropdown...');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    }
    
    function init() {
        // Find the dropdown (check multiple possible selectors)
        const dropdown = findAccountDropdown();
        
        if (!dropdown) {
            console.error('Account dropdown not found');
            return;
        }
        
        console.log('Account dropdown found:', dropdown);
        
        // Add change listener
        dropdown.addEventListener('change', handleAccountChange);
        
        // Load initial emails for all accounts
        loadEmailsForAccount('all');
    }
    
    function findAccountDropdown() {
        // Try various selectors to find the dropdown
        return document.querySelector('.account-selector') ||
               document.querySelector('.account-dropdown') ||
               document.querySelector('[data-account-selector]') ||
               document.querySelector('select[name="account"]') ||
               document.querySelector('.mail-header select');
    }
    
    async function handleAccountChange(event) {
        const selectedValue = event.target.value;
        console.log('Account changed to:', selectedValue);
        
        // Map dropdown value to account email
        let account = selectedValue;
        if (selectedValue.toLowerCase().includes('all')) {
            account = 'all';
        }
        
        currentAccount = account;
        await loadEmailsForAccount(account);
    }
    
    async function loadEmailsForAccount(account) {
        try {
            // Build API URL
            let apiUrl = 'https://qtgzo3psyb.execute-api.us-east-1.amazonaws.com/prod/mail';
            
            if (account && account !== 'all' && account !== 'All Accounts') {
                apiUrl += '?userId=' + encodeURIComponent(account);
            }
            
            console.log('Fetching emails from:', apiUrl);
            
            // Show loading state
            updateLoadingState(true);
            
            // Fetch emails
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error('Failed to fetch emails: ' + response.status);
            }
            
            const data = await response.json();
            console.log('Received data:', data);
            
            // Extract emails from various response formats
            let emails = extractEmails(data);
            
            // Sort emails by date if viewing all accounts
            if (account === 'all') {
                emails.sort((a, b) => {
                    const dateA = new Date(b.date || b.timestamp || 0);
                    const dateB = new Date(a.date || a.timestamp || 0);
                    return dateA - dateB;
                });
            }
            
            // Update the UI
            updateEmailList(emails);
            updateLoadingState(false);
            
        } catch (error) {
            console.error('Error loading emails:', error);
            showError('Failed to load emails. Please try again.');
            updateLoadingState(false);
        }
    }
    
    function extractEmails(data) {
        if (Array.isArray(data)) {
            return data;
        } else if (data.emails) {
            return data.emails;
        } else if (data.Items) {
            return data.Items;
        } else if (data.body) {
            try {
                const parsed = JSON.parse(data.body);
                return parsed.emails || parsed.Items || [];
            } catch (e) {
                return [];
            }
        }
        return [];
    }
    
    function updateLoadingState(isLoading) {
        const emailList = document.querySelector('.mail-list') || 
                         document.querySelector('.email-list') ||
                         document.querySelector('[data-email-list]');
        
        if (emailList) {
            emailList.style.opacity = isLoading ? '0.5' : '1';
            emailList.style.pointerEvents = isLoading ? 'none' : 'auto';
        }
    }
    
    function updateEmailList(emails) {
        console.log('Updating email list with', emails.length, 'emails');
        
        // If MailController exists, use it
        if (window.mailController && window.mailController.view) {
            window.mailController.model.setEmails(emails);
            window.mailController.view.renderEmailList(emails);
        } else {
            // Fallback rendering
            renderEmailsFallback(emails);
        }
    }
    
    function renderEmailsFallback(emails) {
        const emailList = document.querySelector('.mail-list') || 
                         document.querySelector('.email-list');
        
        if (!emailList) {
            console.error('Email list container not found');
            return;
        }
        
        if (emails.length === 0) {
            emailList.innerHTML = '<div class="no-emails">No emails found for this account</div>';
            return;
        }
        
        const emailsHTML = emails.map(email => {
            const date = formatDate(email.date || email.timestamp);
            const isStarred = email.isStarred ? '⭐' : '☆';
            
            return '<div class="email-item" data-email-id="' + (email.emailId || email.id) + '">' +
                   '<div class="email-star">' + isStarred + '</div>' +
                   '<div class="email-content">' +
                   '<div class="email-from">' + (email.from || 'Unknown') + '</div>' +
                   '<div class="email-subject">' + (email.subject || '(No Subject)') + '</div>' +
                   '</div>' +
                   '<div class="email-date">' + date + '</div>' +
                   '</div>';
        }).join('');
        
        emailList.innerHTML = emailsHTML;
    }
    
    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        
        if (hours < 1) {
            const minutes = Math.floor(diff / (1000 * 60));
            return minutes + 'm ago';
        } else if (hours < 24) {
            return hours + 'h ago';
        } else {
            const days = Math.floor(hours / 24);
            if (days === 1) return 'Yesterday';
            if (days < 7) return days + ' days ago';
            return date.toLocaleDateString();
        }
    }
    
    function showError(message) {
        const emailList = document.querySelector('.mail-list') || 
                         document.querySelector('.email-list');
        
        if (emailList) {
            emailList.innerHTML = '<div class="error-message">' + message + '</div>';
        }
    }
    
    // Expose functions globally for integration
    window.accountSwitcher = {
        init: initAccountDropdown,
        loadAccount: loadEmailsForAccount,
        getCurrentAccount: function() { return currentAccount; }
    };
    
    // Auto-initialize
    initAccountDropdown();
    
})();
