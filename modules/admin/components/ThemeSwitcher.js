/**
 * ThemeSwitcher.js - Compose Theme Selector
 * Path: /modules/admin/components/ThemeSwitcher.js
 * Created: September 12, 2025 10:30 AM
 */

export default class ThemeSwitcher {
    constructor() {
        this.themes = {
            default: {
                name: 'Default',
                class: 'compose-default',
                styles: {
                    background: 'linear-gradient(135deg, rgba(20, 10, 30, 0.95) 0%, rgba(30, 15, 45, 0.95) 100%)',
                    border: '1px solid var(--accent-primary)'
                }
            },
            metallic: {
                name: 'Metallic',
                class: 'compose-metallic',
                styles: {
                    background: 'linear-gradient(145deg, #0F0018, #1A0025)',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                }
            },
            glass: {
                name: 'Glass',
                class: 'compose-glass',
                styles: {
                    background: 'rgba(255, 255, 255, 0.03)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }
            },
            solid: {
                name: 'Solid Dark',
                class: 'compose-solid',
                styles: {
                    background: '#0D0015',
                    border: '1px solid var(--accent-primary)'
                }
            },
            matrix: {
                name: 'Cyan Matrix',
                class: 'compose-matrix',
                styles: {
                    background: 'linear-gradient(135deg, rgba(10, 20, 30, 0.98) 0%, rgba(0, 30, 40, 0.98) 100%)',
                    border: '2px solid #00FFFF'
                }
            },
            vapor: {
                name: 'Vapor Pink',
                class: 'compose-vapor',
                styles: {
                    background: 'linear-gradient(135deg, rgba(20, 5, 30, 0.98) 0%, rgba(40, 10, 50, 0.98) 100%)',
                    border: '2px solid #FF10F0'
                }
            },
            electric: {
                name: 'Electric Purple',
                class: 'compose-electric',
                styles: {
                    background: 'linear-gradient(135deg, rgba(15, 0, 30, 0.98) 0%, rgba(30, 0, 60, 0.98) 100%)',
                    border: '2px solid #9D00FF'
                }
            },
            toxic: {
                name: 'Toxic Green',
                class: 'compose-toxic',
                styles: {
                    background: 'linear-gradient(135deg, rgba(5, 15, 10, 0.98) 0%, rgba(10, 25, 15, 0.98) 100%)',
                    border: '2px solid #39FF14'
                }
            },
            holo: {
                name: 'Holographic',
                class: 'compose-holo',
                styles: {
                    background: 'linear-gradient(135deg, rgba(20, 10, 30, 0.9), rgba(10, 20, 40, 0.9), rgba(30, 10, 40, 0.9))',
                    border: '2px solid transparent'
                }
            }
        };
        
        this.currentTheme = 'default';
        this.createSwitcher();
    }
    
    createSwitcher() {
        // Create the toggle button
        const switcher = document.createElement('div');
        switcher.className = 'theme-switcher';
        switcher.innerHTML = `
            <button class="theme-toggle-btn" id="themeToggleBtn">🎨</button>
        `;
        
        // Create the panel separately and add to portal
        const panel = document.createElement('div');
        panel.className = 'theme-panel';
        panel.id = 'themePanel';
        panel.style.display = 'none';
        panel.innerHTML = `
            <h4>Compose Style</h4>
            <div class="theme-options">
                ${Object.keys(this.themes).map(key => `
                    <label class="theme-option">
                        <input type="radio" name="composeTheme" value="${key}" 
                            ${key === 'default' ? 'checked' : ''}>
                        <span>${this.themes[key].name}</span>
                    </label>
                `).join('')}
            </div>
        `;
        
        // Add button to header
        const header = document.querySelector('.mail-header-actions');
        if (header) {
            header.insertBefore(switcher, header.firstChild);
        }
        
        // Add panel to portal root
        const portalRoot = document.getElementById('portal-root');
        if (portalRoot) {
            portalRoot.appendChild(panel);
            console.log('Theme panel moved to portal root');
        } else {
            // Fallback: add to body
            document.body.appendChild(panel);
            console.log('Portal root not found, added panel to body');
        }
        
        // Store references
        this.toggleBtn = document.getElementById('themeToggleBtn');
        this.panel = panel;
        
        // Bind events
        this.attachEventListeners();
    }
    
    attachEventListeners() {
        // Add click handler to toggle button (no global function needed)
        if (this.toggleBtn) {
            this.toggleBtn.addEventListener('click', () => {
                this.togglePanel();
            });
        }
        
        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            if (this.panel && 
                !this.panel.contains(e.target) && 
                !this.toggleBtn.contains(e.target) && 
                this.panel.style.display === 'block') {
                this.panel.style.display = 'none';
            }
        });
        
        // Listen for theme changes
        document.addEventListener('change', (e) => {
            if (e.target.name === 'composeTheme') {
                this.applyTheme(e.target.value);
            }
        });
        
        // Also expose globally for debugging (optional)
        window.toggleThemePanel = () => this.togglePanel();
    }
    
    togglePanel() {
        if (this.panel) {
            const isVisible = this.panel.style.display === 'block';
            this.panel.style.display = isVisible ? 'none' : 'block';
            
            if (!isVisible) {
                // Position the panel near the toggle button
                this.positionPanel();
            }
        }
    }
    
    positionPanel() {
        if (this.toggleBtn && this.panel) {
            const btnRect = this.toggleBtn.getBoundingClientRect();
            this.panel.style.position = 'fixed';
            this.panel.style.top = (btnRect.bottom + 8) + 'px';
            this.panel.style.right = (window.innerWidth - btnRect.right) + 'px';
        }
    }
    
    applyTheme(themeName) {
        const theme = this.themes[themeName];
        if (!theme) return;
        
        const composeContainer = document.querySelector('.compose-container');
        if (composeContainer) {
            // Remove all theme classes (including new cyberpunk ones)
            composeContainer.classList.remove(
                'compose-default', 
                'compose-metallic', 
                'compose-glass', 
                'compose-solid',
                'compose-matrix', 
                'compose-vapor', 
                'compose-electric', 
                'compose-toxic', 
                'compose-holo'
            );
            
            // Add new theme class
            composeContainer.classList.add(theme.class);
            
            // Apply inline styles for immediate effect
            Object.assign(composeContainer.style, theme.styles);
        }
        
        this.currentTheme = themeName;
        
        // Save preference
        localStorage.setItem('composeTheme', themeName);
    }
    
    loadSavedTheme() {
        const saved = localStorage.getItem('composeTheme');
        if (saved && this.themes[saved]) {
            this.applyTheme(saved);
            const radio = document.querySelector(`input[name="composeTheme"][value="${saved}"]`);
            if (radio) radio.checked = true;
        }
    }
}
