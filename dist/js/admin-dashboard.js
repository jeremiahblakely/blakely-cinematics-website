                button.classList.add('loading');
                const originalText = button.innerHTML;
                button.innerHTML = '⏳ Refreshing...';
                
                try {
                    // Show loading message
                    const sectionCount = document.querySelector('.section-count');
                    sectionCount.textContent = 'Refreshing...';
                    sectionCount.style.color = '#f59e0b';
                    
                    // Simulate API call (1 second delay)
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // In the future, this would fetch from DynamoDB
                    // const galleries = await this.fetchGalleriesFromAPI();
                    
                    // For now, simulate refresh with current data
                    const galleryCount = document.querySelectorAll('.table-row').length;
                    sectionCount.textContent = `${galleryCount} galleries`;
                    sectionCount.style.color = '';
                    
                    // Show success message briefly
                    sectionCount.textContent = '✅ Refreshed!';
                    sectionCount.style.color = '#10b981';
                    
                    setTimeout(() => {
                        sectionCount.textContent = `${galleryCount} galleries`;
                        sectionCount.style.color = '';
                    }, 2000);
                    
                    
                } catch (error) {
                    const sectionCount = document.querySelector('.section-count');
                    sectionCount.textContent = '❌ Refresh failed';
                    sectionCount.style.color = '#ef4444';
                    
                    setTimeout(() => {
                        const galleryCount = document.querySelectorAll('.table-row').length;
                        sectionCount.textContent = `${galleryCount} galleries`;
                        sectionCount.style.color = '';
                    }, 3000);
                } finally {
                    // Remove loading state
                    button.disabled = false;
                    button.classList.remove('loading');
                    button.innerHTML = originalText;
                }
            }
            
            addButtonFeedback(button) {
                // Add brief visual feedback for button clicks
                button.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    button.style.transform = '';
                }, 150);
            }
            
            generateGalleryCode(clientName, forceNew = false) {
                if (!clientName.trim()) {
                    // Generate random code if no client name
                    const randomCode = 'BC-' + Math.random().toString(36).substring(2, 8).toUpperCase();
                    document.getElementById('gallery-code').value = randomCode;
                    return;
                }
                
                const date = new Date();
                const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 
                               'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
                
                // Get last name (or first 4 characters if single name)
                const nameParts = clientName.trim().split(/\s+/);
                const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0];
                const cleanLastName = lastName.replace(/[^a-zA-Z]/g, '').toUpperCase();
                
                // Format: LASTNAME-MONTH-YEAR (e.g., "SMITH-AUG-2025")
                const month = months[date.getMonth()];
                const year = date.getFullYear();
                
                let baseCode = `${cleanLastName.slice(0, 8)}-${month}-${year}`;
                
                // Add random suffix if forced or for uniqueness
                if (forceNew) {
                    const randomSuffix = Math.random().toString(36).substring(2, 4).toUpperCase();
                    baseCode = `${cleanLastName.slice(0, 6)}-${month}-${year}-${randomSuffix}`;
                }
                
                document.getElementById('gallery-code').value = baseCode;
            }
            
            setDefaultExpirationDate() {
                const date = new Date();
                date.setDate(date.getDate() + 90); // 90 days from today
                const formattedDate = date.toISOString().split('T')[0];
                document.getElementById('expiration-date').value = formattedDate;
            }
            
            initDragDrop() {
                const uploadZone = document.getElementById('upload-zone');
                const fileInput = document.getElementById('file-input');
                const uploadStatus = document.getElementById('upload-status');
                
                // Click to upload
                uploadZone.addEventListener('click', () => {
                    fileInput.click();
                });
                
                // File selection
                fileInput.addEventListener('change', (e) => {
                    this.handleFiles(e.target.files);
                });
                
                // Drag and drop events
                uploadZone.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    uploadZone.classList.add('drag-over');
                });
                
                uploadZone.addEventListener('dragleave', (e) => {
                    e.preventDefault();
                    uploadZone.classList.remove('drag-over');
                });
                
                uploadZone.addEventListener('drop', (e) => {
                    e.preventDefault();
                    uploadZone.classList.remove('drag-over');
                    this.handleFiles(e.dataTransfer.files);
                });
            }
            
            handleFiles(files) {
                const uploadStatus = document.getElementById('upload-status');
                const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
                
                if (imageFiles.length === 0) {
                    uploadStatus.innerHTML = '<p class="error">Please select only image files.</p>';
                    return;
                }
                
                // Store files for later upload
                this.selectedFiles = imageFiles;
                
                imageFiles.forEach(file => {
                });
                
                uploadStatus.innerHTML = `
                    <p class="success">${imageFiles.length} images ready for upload</p>
                    <div class="file-list">
                        ${imageFiles.map(file => `<span class="file-name">${file.name}</span>`).join('')}
                    </div>
                `;
            }
            
            async convertToBase64(file) {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            }
            
            async uploadImagesToAPI(galleryCode, files) {
                const UPLOAD_API_URL = 'https://4l12h6snuh.execute-api.us-east-1.amazonaws.com/upload';
                const uploadStatus = document.getElementById('upload-status');
                
                try {
                    // Show upload progress
                    uploadStatus.innerHTML = `
                        <div class="upload-progress">
                            <p>Converting images to base64...</p>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: 0%"></div>
                            </div>
                            <div class="upload-details"></div>
                        </div>
                    `;
                    
                    // Convert all files to base64
                    const images = [];
                    for (let i = 0; i < files.length; i++) {
                        const file = files[i];
                        const progressFill = document.querySelector('.progress-fill');
                        const uploadDetails = document.querySelector('.upload-details');
                        
                        progressFill.style.width = `${((i + 1) / files.length) * 50}%`;
                        uploadDetails.innerHTML = `Converting ${file.name}... (${i + 1}/${files.length})`;
                        
                        const base64Content = await this.convertToBase64(file);
                        images.push({
                            fileName: file.name,
                            content: base64Content
                        });
                    }
                    
                    // Upload to API
                    uploadStatus.querySelector('p').textContent = 'Uploading images to S3...';
                    const progressFill = document.querySelector('.progress-fill');
                    const uploadDetails = document.querySelector('.upload-details');
                    
                    progressFill.style.width = '75%';
                    uploadDetails.innerHTML = `Uploading ${images.length} images to gallery: ${galleryCode}`;
                    
                    const response = await fetch(UPLOAD_API_URL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            galleryCode: galleryCode,
                            images: images
                        })
                    });
                    
                    const data = await response.json();
                    
                    progressFill.style.width = '100%';
                    
                    if (data.success) {
                        const successCount = data.results ? data.results.filter(r => r.success).length : images.length;
                        const failCount = data.results ? data.results.filter(r => !r.success).length : 0;
                        
                        uploadStatus.innerHTML = `
                            <div class="upload-success">
                                <p class="success">✅ Upload Complete!</p>
                                <div class="upload-results">
                                    <p>Successfully uploaded: <strong>${successCount} images</strong></p>
                                    ${failCount > 0 ? `<p class="error">Failed: ${failCount} images</p>` : ''}
                                    <p>Gallery Code: <strong>${galleryCode}</strong></p>
                                </div>
                                ${data.results ? `
                                    <div class="detailed-results">
                                        ${data.results.map(result => `
                                            <div class="result-item ${result.success ? 'success' : 'error'}">
                                                ${result.success ? '✅' : '❌'} ${result.fileName || 'Unknown'}
                                                ${result.error ? ` - ${result.error}` : ''}
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    } else {
                        throw new Error(data.error || 'Upload failed');
                    }
                    
                } catch (error) {
                    uploadStatus.innerHTML = `
                        <div class="upload-error">
                            <p class="error">❌ Upload Failed</p>
                            <p>Error: ${error.message}</p>
                            <p>Please check the console for more details and try again.</p>
                        </div>
                    `;
                }
            }
            
            async createGallery() {
                const formData = {
                    clientName: document.getElementById('client-name').value,
                    sessionType: document.getElementById('session-type').value,
                    galleryCode: document.getElementById('gallery-code').value,
                    password: document.getElementById('gallery-password').value,
                    expirationDate: document.getElementById('expiration-date').value
                };
                
                // Basic validation
                if (!formData.clientName || !formData.sessionType || !formData.password) {
                    alert('Please fill in all required fields.');
                    return;
                }
                
                // Check if files are selected for upload
                if (!this.selectedFiles || this.selectedFiles.length === 0) {
                    const proceed = confirm(`No images selected for upload. Create gallery "${formData.galleryCode}" without images?`);
                    if (!proceed) return;
                }
                
                
                // Disable create button during upload
                const createBtn = document.getElementById('create-gallery-btn');
                const originalText = createBtn.textContent;
                createBtn.disabled = true;
                createBtn.textContent = 'Creating Gallery...';
                
                try {
                    // If files are selected, upload them
                    if (this.selectedFiles && this.selectedFiles.length > 0) {
                        await this.uploadImagesToAPI(formData.galleryCode, this.selectedFiles);
                        
                        // Success message with upload confirmation
                        alert(`Gallery created successfully for ${formData.clientName}!\n\n` + 
                              `Gallery Code: ${formData.galleryCode}\n` + 
                              `Password: ${formData.password}\n` + 
                              `Images Uploaded: ${this.selectedFiles.length}\n\n` + 
                              `Share these credentials with your client.`);
                    } else {
                        // Success message without upload
                        alert(`Gallery created successfully for ${formData.clientName}!\n\n` + 
                              `Gallery Code: ${formData.galleryCode}\n` + 
                              `Password: ${formData.password}\n\n` + 
                              `Share these credentials with your client.`);
                    }
                    
                    // Reset form
                    this.resetForm();
                    
                } catch (error) {
                    alert(`Error creating gallery: ${error.message}`);
                } finally {
                    // Re-enable create button
                    createBtn.disabled = false;
                    createBtn.textContent = originalText;
                }
            }
            
            resetForm() {
                document.getElementById('client-name').value = '';
                document.getElementById('session-type').value = '';
                document.getElementById('gallery-code').value = '';
                document.getElementById('gallery-password').value = '';
                document.getElementById('upload-status').innerHTML = '';
                document.getElementById('file-input').value = '';
                this.selectedFiles = [];
                this.setDefaultExpirationDate();
                this.generateDefaultCode();
            }
            
            generateDefaultCode() {
                // Generate a default code for demo
                this.generateGalleryCode('Sample Client');
            }
        }
        
        // Initialize admin dashboard
        document.addEventListener('DOMContentLoaded', function() {
            // Initialize custom cursor and other components
            if (typeof initCustomCursor === 'function') {
                initCustomCursor();
            }
            
            // Initialize admin dashboard
            new AdminDashboard();
        });
        
        // Admin Sign Out Function
        function adminSignOut(event) {
            event.preventDefault();
            
            // Clear admin authentication (both session and local)
            sessionStorage.removeItem('adminAuthenticated');
            sessionStorage.removeItem('adminLoginTime');
            sessionStorage.removeItem('adminEmail');
            localStorage.removeItem('adminAuthenticated');
            localStorage.removeItem('adminLoginTime');
            localStorage.removeItem('adminEmail');
            
            // Redirect to main site
            window.location.href = 'index.html';
        }
    </script>
    
    <!-- Load main script for shared functionality -->
    <script src="../js/api-config.js"></script>
    <script src="../js/integrate-api.js"></script>
    <script src="../js/script.js?v=20250828"></script>
    
    <script>
    (function(){
        var links = document.querySelectorAll('#header-tabs a');
        if (!links.length) return;
        var page = location.pathname.split('/').pop() || 'admin.html';
        links.forEach(function(a){
            if (a.getAttribute('href') === page) a.classList.add('active');
        });
    })();
    </script>
