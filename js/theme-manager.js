// Theme Manager for Blakely Cinematics
class ThemeManager {
    constructor() {
        this.loadSettings();
        this.applySettings();
    }
    
    loadSettings() {
        const saved = localStorage.getItem('blakelyTheme');
        if (saved) {
            this.settings = JSON.parse(saved);
        } else {
            this.settings = {
                theme: 'midnight',
                font: 'Montserrat',
                effects: {
                    morphingBlobs: true,
                    gradientAnimations: true,
                    glowEffects: true
                },
                animationSpeed: 'normal',
                blurIntensity: 20
            };
        }
    }
    
    applySettings() {
        // Apply theme
        document.body.setAttribute('data-theme', this.settings.theme);
        
        // Apply font
        document.documentElement.style.setProperty('--user-font', this.settings.font);
        
        // Update active states if on settings page
        if (document.querySelector('.theme-option')) {
            document.querySelectorAll('.theme-option').forEach(btn => {
                btn.classList.remove('active');
                if (btn.getAttribute('data-theme') === this.settings.theme) {
                    btn.classList.add('active');
                }
            });
        }
        
        // Apply effects
        if (document.getElementById('morphingBlobs')) {
            document.getElementById('morphingBlobs').checked = this.settings.effects.morphingBlobs;
        }
        if (document.getElementById('gradientAnimations')) {
            document.getElementById('gradientAnimations').checked = this.settings.effects.gradientAnimations;
        }
        if (document.getElementById('glowEffects')) {
            document.getElementById('glowEffects').checked = this.settings.effects.glowEffects;
        }
    }
    
    saveSettings() {
        // Gather current settings
        this.settings.theme = document.body.getAttribute('data-theme');
        
        if (document.getElementById('fontSelect')) {
            this.settings.font = document.getElementById('fontSelect').value;
        }
        
        if (document.getElementById('morphingBlobs')) {
            this.settings.effects.morphingBlobs = document.getElementById('morphingBlobs').checked;
        }
        if (document.getElementById('gradientAnimations')) {
            this.settings.effects.gradientAnimations = document.getElementById('gradientAnimations').checked;
        }
        if (document.getElementById('glowEffects')) {
            this.settings.effects.glowEffects = document.getElementById('glowEffects').checked;
        }
        
        // Save to localStorage
        localStorage.setItem('blakelyTheme', JSON.stringify(this.settings));
        
        // Show success message
        alert('Settings saved successfully!');
    }
}

// Initialize on page load
const themeManager = new ThemeManager();

// Functions for settings page
function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-theme') === theme) {
            btn.classList.add('active');
        }
    });
}

function applyFont(font) {
    document.documentElement.style.setProperty('--user-font', font + ', sans-serif');
}

function saveSettings() {
    themeManager.saveSettings();
}

function resetSettings() {
    if (confirm('Reset all settings to default?')) {
        localStorage.removeItem('blakelyTheme');
        location.reload();
    }
}
