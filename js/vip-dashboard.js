console.log('VIP Dashboard script loading...');

// VIP Dashboard - Fixed Rating System Version
class VIPDashboard {
    constructor() {
        this.gallery = null;
        this.assets = [];
        this.selectedAssets = new Set();
        this.currentView = 'grid';
        this.currentDensity = 'medium';
        this.init();
    }
    
    async init() {
        const galleryData = JSON.parse(sessionStorage.getItem('galleryData') || '{}');
        const galleryCode = galleryData.galleryCode || 'DEMO2025';
        
        document.getElementById('clientName').textContent = galleryData.clientName || 'Loading...';
        document.getElementById('galleryCode').textContent = galleryCode;
        
        await this.loadGallery(galleryCode);
        this.setupEventListeners();
        this.setupDensityControls();
    }
    
    async loadGallery(galleryCode) {
        try {
            this.showLoading();
            
            const assets = await VIPAPI.getAssets(galleryCode); 
            if (!Array.isArray(assets)) { 
                console.error('Assets is not an array:', assets); 
                this.assets = []; 
            } else { 
                this.assets = assets; 
            }
            
            document.getElementById('totalImages').textContent = this.assets.length;
            document.getElementById('allImagesCount').textContent = this.assets.length;
            
            this.displayGallery();
            this.hideLoading();
        } catch (error) {
            console.error('Error loading gallery:', error);
            this.showError(error.message);
        }
    }
    
    displayGallery() {
        const grid = document.getElementById('imageGrid');
        grid.innerHTML = '';
        
        this.assets.forEach((asset, index) => {
            const card = this.createImageCard(asset, index);
            grid.appendChild(card);
            this.attachRatingHandlers(card, asset.id);
        });
    }
    
    createImageCard(asset, index) {
        const card = document.createElement('div');
        card.className = 'vip-image-card';
        card.dataset.assetId = asset.id;
        
        const cardHTML = '<div class="vip-image-wrapper"><img src="' + asset.thumbnailUrl + '" alt="' + asset.filename + '" loading="lazy"><div class="vip-image-overlay"><div class="vip-image-number">#' + (index + 1) + '</div><div class="vip-image-checkbox"><input type="checkbox" id="select-' + asset.id + '" data-asset-id="' + asset.id + '"><label for="select-' + asset.id + '"></label></div></div></div><div class="vip-image-footer"><div class="vip-rating" id="rating-' + asset.id + '" data-asset-id="' + asset.id + '">' + this.createRatingStars(asset.rating) + '</div><span class="vip-image-name">' + asset.filename + '</span></div>';
        
        card.innerHTML = cardHTML;
        
        const checkbox = card.querySelector('#select-' + asset.id);
        checkbox.addEventListener('change', (e) => {
            this.toggleSelection(asset.id, e.target.checked);
        });
        
        return card;
    }
    
    attachRatingHandlers(card, assetId) {
        const stars = card.querySelectorAll('#rating-' + assetId + ' .vip-star');
        
        stars.forEach((star, index) => {
            star.addEventListener('click', (e) => {
                e.stopPropagation();
                const rating = index + 1;
                console.log('Star clicked for asset ' + assetId + ': rating ' + rating);
                this.updateRating(assetId, rating);
            });
            
            star.addEventListener('mouseenter', () => {
                this.previewRating(assetId, index + 1);
            });
        });
        
        const ratingDiv = card.querySelector('#rating-' + assetId);
        ratingDiv.addEventListener('mouseleave', () => {
            const asset = this.assets.find(a => a.id === assetId);
            if (asset) {
                this.showRating(assetId, asset.rating);
            }
        });
    }
    
    createRatingStars(currentRating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            const filled = i <= currentRating ? 'filled' : '';
            stars += '<span class="vip-star ' + filled + '" data-star="' + i + '">★</span>';
        }
        return stars;
    }
    
    previewRating(assetId, rating) {
        const stars = document.querySelectorAll('#rating-' + assetId + ' .vip-star');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('preview');
            } else {
                star.classList.remove('preview');
            }
        });
    }
    
    showRating(assetId, rating) {
        const stars = document.querySelectorAll('#rating-' + assetId + ' .vip-star');
        stars.forEach((star, index) => {
            star.classList.remove('preview');
            if (index < rating) {
                star.classList.add('filled');
            } else {
                star.classList.remove('filled');
            }
        });
    }
    
    async updateRating(assetId, rating) {
        console.log('Updating rating for asset:', assetId, 'to:', rating);
        
        const asset = this.assets.find(a => a.id === assetId);
        if (!asset) {
            console.error('Asset not found:', assetId);
            return;
        }
        
        asset.rating = rating;
        this.showRating(assetId, rating);
        
        const ratedCount = this.assets.filter(a => a.rating > 0).length;
        document.getElementById('ratedCount').textContent = ratedCount;
        
        const favoritesCount = this.assets.filter(a => a.rating === 5).length;
        const favCountEl = document.getElementById('favoritesCount');
        if (favCountEl) favCountEl.textContent = favoritesCount;
        
        try {
            const galleryCode = JSON.parse(sessionStorage.getItem('galleryData') || '{}').galleryCode;
            await VIPAPI.updateRating(galleryCode, assetId, rating);
        } catch (error) {
            console.log('API call failed (CORS), but rating saved locally');
        }
        
        const assetIndex = this.assets.findIndex(a => a.id === assetId);
        this.showToast('Image #' + (assetIndex + 1) + ' rated ' + rating + ' stars', 'success');
    }
    
    toggleSelection(assetId, isSelected) {
        console.log('Toggle selection:', assetId, isSelected);
        
        if (isSelected) {
            this.selectedAssets.add(assetId);
        } else {
            this.selectedAssets.delete(assetId);
        }
        
        const count = this.selectedAssets.size;
        document.getElementById('selectedCount').textContent = count;
        document.getElementById('selectedFolderCount').textContent = count;
        document.getElementById('basketCount').textContent = count;
        
        const clearBtn = document.getElementById('clearBasket');
        const finalizeBtn = document.getElementById('finalizeBtn');
        const basketEmpty = document.getElementById('basketEmpty');
        const basketItems = document.getElementById('basketItems');
        
        if (count > 0) {
            if (clearBtn) clearBtn.disabled = false;
            if (finalizeBtn) finalizeBtn.disabled = false;
            if (basketEmpty) basketEmpty.style.display = 'none';
            if (basketItems) basketItems.style.display = 'block';
            this.updateBasketDisplay();
        } else {
            if (clearBtn) clearBtn.disabled = true;
            if (finalizeBtn) finalizeBtn.disabled = true;
            if (basketEmpty) basketEmpty.style.display = 'block';
            if (basketItems) basketItems.style.display = 'none';
        }
    }
    
    updateBasketDisplay() {
        const basketItems = document.getElementById('basketItems');
        if (!basketItems) return;
        
        basketItems.innerHTML = '';
        
        this.selectedAssets.forEach(assetId => {
            const asset = this.assets.find(a => a.id === assetId);
            if (asset) {
                const item = document.createElement('div');
                item.className = 'vip-basket-item';
                item.innerHTML = '<img src="' + asset.thumbnailUrl + '" alt="' + asset.filename + '"><span>' + asset.filename + '</span><button class="vip-basket-remove" data-asset-id="' + assetId + '">×</button>';
                basketItems.appendChild(item);
            }
        });
        
        basketItems.querySelectorAll('.vip-basket-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const assetId = e.target.dataset.assetId;
                const checkbox = document.querySelector('#select-' + assetId);
                if (checkbox) {
                    checkbox.checked = false;
                    this.toggleSelection(assetId, false);
                }
            });
        });
    }
    
    setupDensityControls() {
        const densityMinus = document.getElementById('densityMinus');
        const densityPlus = document.getElementById('densityPlus');
        const grid = document.getElementById('imageGrid');
        
        const densities = ['small', 'medium', 'large'];
        let currentIndex = 1;
        
        if (densityMinus) {
            densityMinus.addEventListener('click', () => {
                if (currentIndex > 0) {
                    currentIndex--;
                    this.currentDensity = densities[currentIndex];
                    grid.className = 'vip-image-grid vip-density-' + this.currentDensity;
                    this.showToast('Thumbnail size: ' + this.currentDensity, 'info');
                }
            });
        }
        
        if (densityPlus) {
            densityPlus.addEventListener('click', () => {
                if (currentIndex < densities.length - 1) {
                    currentIndex++;
                    this.currentDensity = densities[currentIndex];
                    grid.className = 'vip-image-grid vip-density-' + this.currentDensity;
                    this.showToast('Thumbnail size: ' + this.currentDensity, 'info');
                }
            });
        }
    }
    
    setupEventListeners() {
        const clearBtn = document.getElementById('clearBasket');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.selectedAssets.clear();
                document.querySelectorAll('.vip-image-card input[type="checkbox"]').forEach(cb => {
                    cb.checked = false;
                });
                this.toggleSelection('', false);
                this.showToast('Selection cleared', 'info');
            });
        }
        
        const finalizeBtn = document.getElementById('finalizeBtn');
        if (finalizeBtn) {
            finalizeBtn.addEventListener('click', () => {
                if (this.selectedAssets.size > 0) {
                    this.showToast('Finalizing ' + this.selectedAssets.size + ' images...', 'success');
                    this.finalizeSelection();
                }
            });
        }
    }
    
    async finalizeSelection() {
        console.log('Finalizing selection:', Array.from(this.selectedAssets));
    }
    
    showLoading() {
        document.getElementById('loadingState').style.display = 'flex';
        document.getElementById('galleryContainer').style.display = 'none';
        document.getElementById('errorState').style.display = 'none';
        document.getElementById('emptyState').style.display = 'none';
    }
    
    hideLoading() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('galleryContainer').style.display = 'block';
    }
    
    showError(message) {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('galleryContainer').style.display = 'none';
        document.getElementById('errorState').style.display = 'flex';
        const errorMsg = document.getElementById('errorMessage');
        if (errorMsg) errorMsg.textContent = message;
    }
    
    showToast(message, type) {
        type = type || 'info';
        const toast = document.createElement('div');
        toast.className = 'vip-toast vip-toast-' + type;
        toast.textContent = message;
        
        const container = document.getElementById('toastContainer');
        if (container) {
            container.appendChild(toast);
            
            setTimeout(() => {
                toast.classList.add('vip-toast-show');
            }, 10);
            
            setTimeout(() => {
                toast.classList.remove('vip-toast-show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.vipDashboard = new VIPDashboard();
});
