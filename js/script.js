/* ============================================ */
/* BLAKELY CINEMATICS - MAIN JAVASCRIPT        */
/* Author: Jeremiah Blakely                    */
/* Version: 1.0                                */
/* ============================================ */

/* ============================================ */
/* TABLE OF CONTENTS                           */
/* ============================================ */
/* 1. GLOBAL VARIABLES
   2. CUSTOM CURSOR
   3. LOADING SCREEN
   4. NAVIGATION
   5. HERO SLIDER
   6. PORTFOLIO FILTER
   7. TESTIMONIAL SLIDER
   8. SMOOTH SCROLLING
   9. FORM HANDLING
   10. SCROLL ANIMATIONS
   11. INITIALIZATION
*/

/* ============================================ */
/* 1. GLOBAL VARIABLES                         */
/* ============================================ */
const API_BASE_URL = "https://qtgzo3psyb.execute-api.us-east-1.amazonaws.com/prod";
const AUTH_URL = `${API_BASE_URL}/auth/login`;

// VIP Gallery Images API
async function fetchGalleryImages(galleryCode) {
  const res = await fetch(`${API_BASE_URL}/images`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({ galleryCode })
  });
  if (!res.ok) throw new Error(`Images API ${res.status}`);
  const data = await res.json();
  return Array.isArray(data.images) ? data.images : [];
}

let currentSlide = 0;
let currentTestimonial = 0;
let isMenuOpen = false;

/* ============================================ */
/* 2. CUSTOM CURSOR                            */
/* ============================================ */
function initCustomCursor() {
    const cursor = document.querySelector('.cursor');
    const cursorFollower = document.querySelector('.cursor-follower');
    
    if (!cursor || !cursorFollower) return;
    
    // Move cursor with mouse
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
        
        setTimeout(() => {
            cursorFollower.style.left = e.clientX - 10 + 'px';
            cursorFollower.style.top = e.clientY - 10 + 'px';
        }, 100);
    });

    // Add hover effect to interactive elements
    const hoverElements = document.querySelectorAll('a, button, input, textarea, .filter-btn, .testimonial-dot');
    
    hoverElements.forEach(element => {
        element.addEventListener('mouseenter', () => {
            cursor.classList.add('hover');
        });
        
        element.addEventListener('mouseleave', () => {
            cursor.classList.remove('hover');
        });
    });
}

/* ============================================ */
/* 3. LOADING SCREEN                           */
/* ============================================ */
function hideLoadingScreen() {
    const loader = document.querySelector('.loader');
    if (!loader) return;
    
    // Hide loader after page loads
    window.addEventListener('load', () => {
        setTimeout(() => {
            loader.classList.add('hidden');
        }, 2000);
    });
}

/* ============================================ */
/* 4. NAVIGATION                               */
/* ============================================ */
function initNavigation() {
    const nav = document.querySelector('nav');
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    // Scroll effect for navigation
    if (nav) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 100) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
        });
    }
    
    // Mobile menu toggle
    if (mobileToggle && navLinks) {
        mobileToggle.addEventListener('click', () => {
            isMenuOpen = !isMenuOpen;
            mobileToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
        
        // Close menu when clicking a link
        const links = navLinks.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', () => {
                isMenuOpen = false;
                mobileToggle.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }
}

/* ============================================ */
/* 5. HERO SLIDER                              */
/* ============================================ */
function initHeroSlider() {
    const heroSlider = document.querySelector('.hero-slider');
    if (!heroSlider) return;// Hero image data with S3 URLs (expanded selection)
    const heroImages = [
        {
            name: 'Art Portrait',
            slug: 'art1',
            alt: 'Dramatic Artistic Portrait with Cinematic Lighting'
        },
        {
            name: 'Jan Portrait 1',
            slug: 'jan1',
            alt: 'Professional Cinematic Portrait'
        },
        {
            name: 'Jan Portrait 2',
            slug: 'jan2',
            alt: 'Dramatic Light Study Portrait'
        },
        {
            name: 'Jan Portrait 3',
            slug: 'jan3',
            alt: 'Creative Portrait Photography'
        },
        {
            name: 'Wolf Portrait 1',
            slug: 'wolf1',
            alt: 'Intense Character Portrait'
        },
        {
            name: 'Wolf Portrait 2',
            slug: 'wolf2',
            alt: 'Moody Cinematic Portrait'
        },
        {
            name: 'Bruno & Jan',
            slug: 'brono&jan',
            alt: 'Dynamic Duo Portrait Session'
        },
        {
            name: 'Rod & Sus',
            slug: 'rod&sus',
            alt: 'Couple Portrait Session'
        }
    ];
    
    function getImageUrl(imageName) {
const urls = {
'art1': 'https://blakely-cinematics.s3.us-east-1.amazonaws.com/images/hero/4k/hero%3Aart1-bg-4k.jpg',
'jan1': 'https://blakely-cinematics.s3.us-east-1.amazonaws.com/images/hero/4k/hero%3Ajan1-bg-4k.jpg',
'jan2': 'https://blakely-cinematics.s3.us-east-1.amazonaws.com/images/hero/4k/hero%3Ajan2-bg-4k.jpg',
'jan3': 'https://blakely-cinematics.s3.us-east-1.amazonaws.com/images/hero/4k/hero%3Ajan3-bg-4k.jpg',
'wolf1': 'https://blakely-cinematics.s3.us-east-1.amazonaws.com/images/hero/4k/hero%3Awolf1-bg-4k.jpg',
'wolf2': 'https://blakely-cinematics.s3.us-east-1.amazonaws.com/images/hero/4k/hero%3Awolf2-bg-4k.jpg',
'brono&jan': 'https://blakely-cinematics.s3.us-east-1.amazonaws.com/images/hero/4k/hero%3Abrono%26jan-bg-4k.jpg',
'rod&sus': 'https://blakely-cinematics.s3.us-east-1.amazonaws.com/images/hero/4k/hero%3Arod%26sus-bg-4k.jpg'
};
return urls[imageName];
}
    
    // Create slide elements
    function createSlides() {
        heroSlider.innerHTML = ''; // Clear existing slides
        
        heroImages.forEach((image, index) => {
            const slide = document.createElement('div');
            slide.className = index === 0 ? 'slide active' : 'slide';
            
            const img = document.createElement('img');
            img.src = getImageUrl(image.slug);
            img.alt = image.alt;
            img.loading = index === 0 ? 'eager' : 'lazy'; // Load first image immediately
            
            // Handle image load errors
            img.onerror = function() {
            };
            
            slide.appendChild(img);
            heroSlider.appendChild(slide);
        });
    }
    
    // Initialize slides
    createSlides();
    
    const slides = document.querySelectorAll('.slide');
    if (slides.length === 0) return;
    
    // Preload next few images
    function preloadImages() {
        const preloadCount = Math.min(2, heroImages.length - 1); // Reduced preload count
        
        for (let i = 1; i <= preloadCount; i++) {
            const nextIndex = (currentSlide + i) % heroImages.length;
            const img = new Image();
            img.src = getImageUrl(heroImages[nextIndex].slug);
        }
    }
    
    function nextSlide() {
        // Remove active class from current slide
        slides[currentSlide].classList.remove('active');
        
        // Move to next slide
        currentSlide = (currentSlide + 1) % slides.length;
        
        // Add active class to new slide
        slides[currentSlide].classList.add('active');
        
        // Preload upcoming images
        preloadImages();
    }
    
    // Start preloading after initial load
    setTimeout(preloadImages, 1000);
    
    // Change slide every 6 seconds (slightly longer for better viewing)
    const slideInterval = setInterval(nextSlide, 6000);
    
    // Pause on hover (optional)
    heroSlider.addEventListener('mouseenter', () => {
        clearInterval(slideInterval);
    });
    
    let resumeInterval;
    heroSlider.addEventListener('mouseleave', () => {
        resumeInterval = setInterval(nextSlide, 6000);
    });
    
    // No need for resize handling since we're using consistent 1080p images
}

/* ============================================ */
/* 6. PORTFOLIO FILTER                         */
/* ============================================ */
function initPortfolioFilter() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const portfolioItems = document.querySelectorAll('.portfolio-item');
    const portfolioGrid = document.querySelector('.portfolio-grid');
    
    if (filterButtons.length === 0) return;
    
    // Initialize with headshots filter on page load
    const defaultFilter = 'headshots';
    portfolioGrid.classList.add('headshots-active');
    
    // Show only headshots items initially
    portfolioItems.forEach(item => {
        if (item.dataset.category === defaultFilter) {
            item.style.display = 'block';
            item.style.opacity = '1';
        } else {
            item.style.display = 'none';
            item.style.opacity = '0';
        }
    });
    
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const filter = button.dataset.filter;
            
            // Update active button
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Update grid classes for layout changes
            portfolioGrid.classList.remove('creative-active', 'cinematic-active', 'headshots-active');
            if (filter === 'creative') {
                portfolioGrid.classList.add('creative-active');
            } else if (filter === 'cinematic') {
                portfolioGrid.classList.add('cinematic-active');
            } else if (filter === 'headshots') {
                portfolioGrid.classList.add('headshots-active');
            }
            
            // Filter portfolio items
            portfolioItems.forEach(item => {
                if (filter === 'all' || item.dataset.category === filter) {
                    item.style.display = 'block';
                    setTimeout(() => {
                        item.style.opacity = '1';
                    }, 100);
                } else {
                    item.style.opacity = '0';
                    setTimeout(() => {
                        item.style.display = 'none';
                    }, 300);
                }
            });
        });
    });
}

/* ============================================ */
/* 7. TESTIMONIAL SLIDER                       */
/* ============================================ */
function initTestimonialSlider() {
    const testimonials = document.querySelectorAll('.testimonial');
    const testimonialDots = document.querySelectorAll('.testimonial-dot');
    
    if (testimonials.length === 0) return;
    
    function showTestimonial(index) {
        // Hide all testimonials
        testimonials.forEach(t => t.classList.remove('active'));
        testimonialDots.forEach(d => d.classList.remove('active'));
        
        // Show selected testimonial
        testimonials[index].classList.add('active');
        if (testimonialDots[index]) {
            testimonialDots[index].classList.add('active');
        }
    }
    
    // Click dots to change testimonial
    testimonialDots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            currentTestimonial = index;
            showTestimonial(currentTestimonial);
        });
    });
    
    // Auto-rotate testimonials every 5 seconds
    setInterval(() => {
        currentTestimonial = (currentTestimonial + 1) % testimonials.length;
        showTestimonial(currentTestimonial);
    }, 5000);
}

/* ============================================ */
/* 8. SMOOTH SCROLLING                         */
/* ============================================ */
function initSmoothScrolling() {
    // Handle all anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const target = document.querySelector(targetId);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

/* ============================================ */
/* 9. FORM HANDLING - MOVED TO DOMContentLoaded */
/* ============================================ */
/* Contact form handler is now inline within DOMContentLoaded */

/* ============================================ */
/* 10. SCROLL ANIMATIONS                       */
/* ============================================ */
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Animate service cards on scroll
    const serviceCards = document.querySelectorAll('.service-card');
    serviceCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'all 0.8s ease';
        observer.observe(card);
    });
    
    // You can add more elements to animate on scroll here
}

/* ============================================ */
/* 10. VIP LOGIN FORM                          */
/* ============================================ */
function initVIPForm() {
    // VIP form handling is now managed directly in vip.html
    // This prevents conflicts with the real authentication system
}

/* ============================================ */
/* 11. INITIALIZATION                          */
/* ============================================ */
// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    
    // Initialize all components
    initCustomCursor();
    hideLoadingScreen();
    initNavigation();
    initHeroSlider();
    initPortfolioFilter();
    initTestimonialSlider();
    initVIPForm();
    initSmoothScrolling();
    initScrollAnimations();
    
    // Contact Form Handler - WORKING VERSION
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                phone: '',
                service: document.getElementById('service').value,
                message: document.getElementById('message').value
            };
            
            
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;
            
            try {
                const response = await fetch('https://qtgzo3psyb.execute-api.us-east-1.amazonaws.com/prod/contact', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(formData)
                });
                const result = await response.json();
                
                // Create overlay for success animation
                const overlay = document.createElement('div');
                overlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    backdrop-filter: blur(5px);
                    animation: fadeIn 0.3s ease;
                `;

                const successCard = document.createElement('div');
                successCard.style.cssText = `
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 40px;
                    border-radius: 20px;
                    text-align: center;
                    max-width: 400px;
                    animation: slideUp 0.5s ease, pulse 2s infinite;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                `;

                successCard.innerHTML = `
                    <div style="font-size: 60px; margin-bottom: 20px; animation: checkmark 0.8s ease;">✓</div>
                    <h2 style="margin: 0 0 10px 0; font-size: 28px;">Message Sent!</h2>
                    <p style="margin: 0; opacity: 0.9; font-size: 16px;">Thank you for reaching out. I'll get back to you soon!</p>
                `;

                overlay.appendChild(successCard);
                document.body.appendChild(overlay);

                // Add animations
                const style = document.createElement('style');
                style.textContent = `
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes fadeOut {
                        from { opacity: 1; }
                        to { opacity: 0; }
                    }
                    @keyframes slideUp {
                        from { transform: translateY(30px); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }
                    @keyframes checkmark {
                        0% { transform: scale(0) rotate(45deg); }
                        50% { transform: scale(1.2) rotate(45deg); }
                        100% { transform: scale(1) rotate(0); }
                    }
                    @keyframes pulse {
                        0%, 100% { transform: scale(1); }
                        50% { transform: scale(1.02); }
                    }
                `;
                document.head.appendChild(style);

                // Remove overlay after 3 seconds
                setTimeout(() => {
                    overlay.style.animation = 'fadeOut 0.5s ease';
                    setTimeout(() => overlay.remove(), 500);
                }, 3000);

                // Clear and reset form
                contactForm.reset();
            } catch (error) {
                
                const errorMessage = document.createElement('div');
                errorMessage.className = 'form-error-message';
                errorMessage.textContent = 'Sorry, there was an error. Please try again.';
                errorMessage.style.cssText = 'color: #f44336; margin-top: 10px; font-weight: 500;';
                contactForm.appendChild(errorMessage);
                setTimeout(() => errorMessage.remove(), 5000);
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
    
    // Show/hide custom project field
    const serviceSelect = document.getElementById('service');
    if (serviceSelect) {
        serviceSelect.addEventListener('change', function() {
            const customDiv = document.getElementById('custom-project-details');
            if (customDiv) {
                customDiv.style.display = this.value === 'custom' ? 'block' : 'none';
            }
        });
    }
    
    // Character counter for textareas
    const textareas = document.querySelectorAll('textarea[maxlength]');
    textareas.forEach(textarea => {
        const counter = textarea.nextElementSibling;
        if (counter && counter.classList.contains('char-counter')) {
            textarea.addEventListener('input', function() {
                counter.textContent = `${this.value.length}/${this.maxLength} characters`;
            });
        }
    });
    
    // Instagram @ auto-add functionality
    const instagramInput = document.getElementById('instagram');
    if (instagramInput) {
        instagramInput.addEventListener('focus', function() {
            if (!this.value) {
                this.value = '@';
            }
        });
        
        instagramInput.addEventListener('input', function() {
            if (!this.value.startsWith('@') && this.value.length > 0) {
                this.value = '@' + this.value;
            }
            if (this.value === '@') {
                // Allow user to clear the field completely
            }
        });
        
        instagramInput.addEventListener('keydown', function(e) {
            // Prevent deleting the @ sign
            if (e.key === 'Backspace' && this.selectionStart <= 1) {
                e.preventDefault();
                this.value = '';
            }
        });
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    // Add any resize-specific logic here
    if (window.innerWidth > 768 && isMenuOpen) {
        // Close mobile menu if window becomes larger
        const mobileToggle = document.querySelector('.mobile-menu-toggle');
        const navLinks = document.querySelector('.nav-links');
        
        if (mobileToggle && navLinks) {
            isMenuOpen = false;
            mobileToggle.classList.remove('active');
            navLinks.classList.remove('active');
        }
    }
});

/* ============================================ */
/* UTILITY FUNCTIONS                           */
/* ============================================ */

// Debounce function for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Check if element is in viewport
function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

/* ============================================ */
/* 12. SECRET ADMIN ACCESS                     */
/* ============================================ */
// Secret admin access shortcut: Ctrl+Shift+\ (or Cmd+Shift+\ on Mac)
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '\\') {
        e.preventDefault();
        window.location.href = 'admin.html';
    }
});

// Export functions if using modules (optional)
// export { initCustomCursor, initNavigation, initHeroSlider };