/**
 * Email Pills Module
 * Created: December 17, 2024 1:00 PM
 * Purpose: Gmail-style email pills with lowercase enforcement
 */

// ============================================
// EMAIL PILL FUNCTIONALITY
// ============================================

/**
 * Initialize email pill functionality for compose fields
 */
function initEmailPills() {
    // Prevent running in iframes or sandboxed contexts
    if (window.location.href.includes('about:') || window !== window.parent) {
        console.log('[Pills] Skipping init in iframe/sandbox');
        return;
    }
    
    // Use more specific selectors and check existence
    const selectors = [
        '#composeTo',
        '#composeCc', 
        '#composeBcc',
        'input[type="email"][placeholder*="recipient"]',
        '.cc-input',
        '.bcc-input'
    ];
    
    selectors.forEach(selector => {
        try {
            const field = document.querySelector(selector);
            if (field && field.dataset.pillsInitialized !== 'true') {
                setupPillField(field);
            }
        } catch (error) {
            // Silently skip if selector fails
        }
    });
}

/**
 * Setup pill functionality for an email input field
 * @param {HTMLInputElement} input - The input field to enhance
 */
function setupPillField(input) {
    // Prevent duplicate initialization
    if (!input || input.dataset.pillsInitialized === 'true') {
        return;
    }
    
    // Check if already wrapped in chip container
    let container = input.closest('.chip-input-container');
    if (container && container.querySelector('.email-chips')) {
        // Already set up, just mark as initialized
        input.dataset.pillsInitialized = 'true';
        return;
    }
    
    // Mark as initialized BEFORE setting up to prevent race conditions
    input.dataset.pillsInitialized = 'true';
    
    // Create chip container structure if needed
    if (!container) {
        try {
            container = document.createElement('div');
            container.className = 'chip-input-container';
            
            const chipsDiv = document.createElement('div');
            chipsDiv.className = 'email-chips';
            
            // Replace input with container structure
            if (input.parentNode) {
                input.parentNode.replaceChild(container, input);
                container.appendChild(chipsDiv);
                container.appendChild(input);
            }
        } catch (error) {
            console.warn('[Pills] Setup error, skipping:', error);
            input.dataset.pillsInitialized = 'false';
            return;
        }
    }
    
    const chipsDiv = container.querySelector('.email-chips');
    if (!chipsDiv) {
        console.warn('[Pills] No chips container found');
        return;
    }
    
    input.classList.add('chip-input');
    
    // Force lowercase on input
    input.addEventListener('input', function(e) {
        e.target.value = e.target.value.toLowerCase();
    });
    
    // Create pill on Enter or comma
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const email = input.value.trim();
            if (email) {
                createEmailPill(email, chipsDiv, input);
            }
        }
        
        // Delete last pill on backspace if input is empty
        if (e.key === 'Backspace' && !input.value) {
            const lastChip = chipsDiv.lastElementChild;
            if (lastChip) {
                lastChip.remove();
            }
        }
    });
    
    // Create pill on blur if there's content
    input.addEventListener('blur', function() {
        const email = input.value.trim();
        if (email) {
            createEmailPill(email, chipsDiv, input);
        }
    });
    
    // Handle paste - split by common delimiters
    input.addEventListener('paste', function(e) {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        const emails = pastedText.split(/[,;\s]+/);
        
        emails.forEach(email => {
            const trimmedEmail = email.trim();
            if (trimmedEmail) {
                createEmailPill(trimmedEmail, chipsDiv, input);
            }
        });
    });
}

/**
 * Create an email pill element
 * @param {string} email - The email address
 * @param {HTMLElement} container - Container for the chips
 * @param {HTMLInputElement} input - The input field
 */
function createEmailPill(email, container, input) {
    // Normalize email
    email = email.toLowerCase().trim();
    if (!email) return;
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);
    
    // Check for duplicates
    const existingEmails = Array.from(container.querySelectorAll('.email-chip .email-text'))
        .map(el => el.textContent);
    const isDuplicate = existingEmails.includes(email);
    
    // Don't create duplicate pills
    if (isDuplicate) {
        input.value = '';
        return;
    }
    
    // Create chip element
    const chip = document.createElement('div');
    chip.className = 'email-chip';
    
    // Add validation class
    if (!isValid) {
        chip.classList.add('invalid');
    } else {
        chip.classList.add('valid');
    }
    
    // Create chip content
    const emailText = document.createElement('span');
    emailText.className = 'email-text';
    emailText.textContent = email;
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-chip';
    removeBtn.type = 'button';
    removeBtn.innerHTML = '×';
    removeBtn.title = 'Remove';
    
    // Remove chip on click
    removeBtn.onclick = function() {
        chip.remove();
        input.focus();
    };
    
    // Edit chip on text click
    emailText.onclick = function() {
        input.value = email;
        chip.remove();
        input.focus();
    };
    
    // Assemble chip
    chip.appendChild(emailText);
    chip.appendChild(removeBtn);
    
    // Add to container with animation
    container.appendChild(chip);
    
    // Clear input
    input.value = '';
    
    // Animate in
    requestAnimationFrame(() => {
        chip.style.opacity = '0';
        chip.style.transform = 'scale(0.8)';
        requestAnimationFrame(() => {
            chip.style.transition = 'all 0.2s ease';
            chip.style.opacity = '1';
            chip.style.transform = 'scale(1)';
        });
    });
}

/**
 * Get all email addresses from a pill field
 * @param {string|HTMLElement} fieldOrContainer - Field ID or container element
 * @returns {Array<string>} Array of email addresses
 */
function getEmailsFromPillField(fieldOrContainer) {
    let container;
    
    if (typeof fieldOrContainer === 'string') {
        const field = document.getElementById(fieldOrContainer);
        container = field ? field.closest('.chip-input-container') : null;
    } else {
        container = fieldOrContainer.closest('.chip-input-container') || fieldOrContainer;
    }
    
    if (!container) return [];
    
    const chips = container.querySelectorAll('.email-chip .email-text');
    return Array.from(chips).map(chip => chip.textContent);
}

// ============================================
// GLOBAL EXPORT
// ============================================

// Make email pill functions available globally
window.emailPills = {
    init: initEmailPills,
    getEmails: getEmailsFromPillField,
    setup: setupPillField
};

console.log('[Mail Pills] Module loaded');