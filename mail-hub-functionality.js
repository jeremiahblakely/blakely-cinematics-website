// Mail Hub Interactive Functionality
document.addEventListener('DOMContentLoaded', function() {
  
  // Email card selection
  const emailCards = document.querySelectorAll('.email-card');
  const emailViewer = document.querySelector('.mail-viewer-inner');
  
  emailCards.forEach(card => {
    card.addEventListener('click', function() {
      // Remove previous selection
      emailCards.forEach(c => c.classList.remove('selected'));
      
      // Add selection to clicked card
      this.classList.add('selected');
      
      // Animate email viewer
      if (emailViewer) {
        emailViewer.style.animation = 'slideIn 0.3s ease';
      }
    });
  });
  
  // Compose button ripple effect
  const composeBtn = document.querySelector('.fab-compose');
  if (composeBtn) {
    composeBtn.addEventListener('click', function(e) {
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      this.appendChild(ripple);
      
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
      
      setTimeout(() => ripple.remove(), 600);
    });
  }
  
  // Sidebar navigation hover effects
  const navItems = document.querySelectorAll('.mail-nav-item');
  navItems.forEach(item => {
    item.addEventListener('mouseenter', function() {
      this.style.paddingLeft = '20px';
    });
    
    item.addEventListener('mouseleave', function() {
      this.style.paddingLeft = '12px';
    });
  });
  
  // Quick action buttons
  const quickActions = document.querySelectorAll('.template-item');
  quickActions.forEach(action => {
    action.addEventListener('click', function() {
      // Flash effect
      this.style.background = 'var(--primary)';
      this.style.color = 'white';
      
      setTimeout(() => {
        this.style.background = '';
        this.style.color = '';
      }, 200);
    });
  });
  
  // Add animation keyframes
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    
    .ripple {
      position: absolute;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.6);
      transform: scale(0);
      animation: rippleEffect 0.6s ease-out;
    }
    
    @keyframes rippleEffect {
      to {
        transform: scale(4);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
  
  // Search functionality
  const searchInput = document.querySelector('.mail-search input');
  if (searchInput) {
    searchInput.addEventListener('input', function(e) {
      const searchTerm = e.target.value.toLowerCase();
      
      emailCards.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
          card.style.display = 'flex';
          card.style.animation = 'fadeIn 0.3s ease';
        } else {
          card.style.display = 'none';
        }
      });
    });
  }
});
