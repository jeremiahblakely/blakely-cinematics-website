// Mail Hub Theme Switcher
document.addEventListener('DOMContentLoaded', function() {
  // Load saved theme or default to 'ember'
  const savedTheme = localStorage.getItem('mailHubTheme') || 'ember';
  document.body.setAttribute('data-theme', savedTheme);
  
  // Theme definitions
  const themes = {
    ember: { name: 'Ember & Ash', color: '#FF6B35' },
    copper: { name: 'Copper & Charcoal', color: '#B87333' },
    teal: { name: 'Teal & Graphite', color: '#00D4AA' },
    sunset: { name: 'Sunset & Twilight', color: '#FF6B9D' },
    blakely: { name: 'Classic Blakely', color: '#9b87f5' }
  };
  
  // Toggle theme switcher dropdown
  const settingsBtn = document.querySelector('.admin-settings');
  const themeSwitcher = document.querySelector('.theme-switcher');
  
  if (settingsBtn && themeSwitcher) {
    settingsBtn.addEventListener('click', function(e) {
      e.preventDefault();
      themeSwitcher.classList.toggle('active');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
      if (!settingsBtn.contains(e.target) && !themeSwitcher.contains(e.target)) {
        themeSwitcher.classList.remove('active');
      }
    });
  }
  
  // Handle theme selection
  const themeOptions = document.querySelectorAll('.theme-option');
  themeOptions.forEach(option => {
    option.addEventListener('click', function() {
      const theme = this.getAttribute('data-theme');
      
      // Update active state
      themeOptions.forEach(opt => opt.classList.remove('active'));
      this.classList.add('active');
      
      // Apply theme
      document.body.setAttribute('data-theme', theme);
      
      // Save to localStorage
      localStorage.setItem('mailHubTheme', theme);
      
      // Close dropdown
      themeSwitcher.classList.remove('active');
    });
  });
  
  // Set initial active theme in dropdown
  const activeOption = document.querySelector(`[data-theme='${savedTheme}']`);
  if (activeOption) {
    activeOption.classList.add('active');
  }
  
  // Calendar widget functionality
  function generateCalendar() {
    const calendarGrid = document.querySelector('.calendar-grid');
    if (!calendarGrid) return;
    
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const currentDay = today.getDate();
    
    // Get first day of month
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Add day headers
    const dayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    dayHeaders.forEach(day => {
      const header = document.createElement('div');
      header.className = 'calendar-day-header';
      header.textContent = day;
      header.style.color = 'var(--text-muted)';
      header.style.fontSize = '10px';
      header.style.fontWeight = '600';
      calendarGrid.appendChild(header);
    });
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      const emptyDay = document.createElement('div');
      emptyDay.className = 'calendar-day';
      calendarGrid.appendChild(emptyDay);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayElement = document.createElement('div');
      dayElement.className = 'calendar-day';
      if (day === currentDay) {
        dayElement.classList.add('today');
      }
      dayElement.textContent = day;
      calendarGrid.appendChild(dayElement);
    }
  }
  
  generateCalendar();
});
