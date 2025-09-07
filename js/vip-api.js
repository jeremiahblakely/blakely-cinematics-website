// VIP API Client
const VIPAPI = {
    baseURL: 'https://kyjf2wp972.execute-api.us-east-1.amazonaws.com/dev',
    
    async getGallery(galleryId) {
        console.log('Getting gallery:', galleryId);
        try {
            const response = await fetch(this.baseURL + '/vip/galleries/' + galleryId);
            if (!response.ok) {
                throw new Error('Gallery not found');
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching gallery:', error);
            // Return mock data
            return {
                galleryId: galleryId,
                clientName: 'Demo Client',
                assets: this.generateMockAssets(24)
            };
        }
    },
    
    async getAssets(galleryId) {
        console.log('Getting assets for gallery:', galleryId);
        try {
            const response = await fetch(this.baseURL + '/vip/galleries/' + galleryId + '/assets');
            if (!response.ok) {
                console.log('API error, using mock data. Status:', response.status);
                return this.generateMockAssets(24);
            }
            const data = await response.json();
            console.log('API response:', data);
            
            // Make sure we return an array
            if (Array.isArray(data)) {
                return data;
            } else if (data.assets && Array.isArray(data.assets)) {
                return data.assets;
            } else if (data.Items && Array.isArray(data.Items)) {
                return data.Items;
            } else {
                console.log('Unexpected API response format, using mock data');
                return this.generateMockAssets(24);
            }
        } catch (error) {
            console.error('Error fetching assets, using mock data:', error);
            return this.generateMockAssets(24);
        }
    },
    
    generateMockAssets(count) {
        console.log('Generating', count, 'mock assets');
        const assets = [];
        
        // Using placeholder.com for reliable test images
        for (let i = 1; i <= count; i++) {
            assets.push({
                id: 'asset-' + String(i).padStart(3, '0'),
                galleryId: 'DEMO2025',
                filename: 'image-' + String(i).padStart(3, '0') + '.jpg',
                thumbnailUrl: 'https://via.placeholder.com/400x600/FF6B35/FFFFFF?text=Image+' + i,
                fullUrl: 'https://via.placeholder.com/1200x1800/FF6B35/FFFFFF?text=Image+' + i,
                rating: 0,
                selected: false,
                createdAt: new Date().toISOString()
            });
        }
        return assets;
    },
    
    async updateRating(galleryId, assetId, rating) {
        console.log('Updating rating:', assetId, 'to', rating);
        try {
            const response = await fetch(
                this.baseURL + '/vip/galleries/' + galleryId + '/assets/' + assetId + '/rating',
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rating: rating })
                }
            );
            return await response.json();
        } catch (error) {
            console.error('Error updating rating:', error);
            console.log('Rating API unavailable (CORS/network) - working locally only:', error.message);
            console.log('Rating ' + rating + ' stars applied locally for asset:', assetId);
            return { success: true, rating: rating };
        }
    }
};

console.log('VIP API loaded successfully');
