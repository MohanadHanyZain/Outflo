document.addEventListener('DOMContentLoaded', function() {
    "use strict";
    
    const runGoogleBtn = document.getElementById('runGoogleBtn');
    const leadCountInput = document.getElementById('leadCount');
    const downloadBtn = document.getElementById('downloadCsvBtn');
    const debugBtn = document.getElementById('debugBtn');

    // =============================================
    // Save Google results to database
    // =============================================
    async function saveGoogleResultsToDb(items, platform) {
        console.log('💾 Saving Google results to database...');
        console.log('📊 Items count:', items ? items.length : 0);
        
        try {
            const userData = await Auth.getCurrentUser();
            if (!userData) {
                console.error('❌ No user logged in');
                return false;
            }
            
            console.log('👤 User ID:', userData.id);
            
            const searchQuery = document.getElementById('googleKeyword').value.trim() || 'restaurant';
            const location = document.getElementById('googleLocation').value.trim() || 'Dubai';
            
            console.log('🔍 Search:', searchQuery, '📍 Location:', location);
            
            const result = await Auth.saveLead(
                userData.id,
                'google',
                searchQuery,
                location,
                items || []
            );
            
            if (result) {
                console.log('✅ Google results saved to database successfully!');
                console.log('📝 Saved lead ID:', result.id);
                return true;
            } else {
                console.error('❌ Failed to save Google results');
                return false;
            }
        } catch (err) {
            console.error('❌ Error saving Google results:', err);
            return false;
        }
    }

    // =============================================
    // Override renderTable to save data
    // =============================================
    let isSaving = false;

    function setupSaveInterceptor() {
        if (!window.Outflo) {
            console.log('⏳ Waiting for Outflo to load...');
            setTimeout(setupSaveInterceptor, 500);
            return;
        }

        console.log('✅ Outflo loaded, setting up save interceptor');
        
        const originalRender = window.Outflo.renderTable;
        
        window.Outflo.renderTable = function(items, platform) {
            console.log('📊 RenderTable called with', items ? items.length : 0, 'items');
            
            // Call original render
            originalRender(items, platform);
            
            // Save to database if not already saving
            if (!isSaving && items && items.length > 0) {
                isSaving = true;
                saveGoogleResultsToDb(items, platform).then(() => {
                    isSaving = false;
                }).catch(() => {
                    isSaving = false;
                });
            } else if (items && items.length === 0) {
                console.log('⚠️ No items to save');
            }
        };
        
        console.log('✅ Save interceptor set up');
    }

    // =============================================
    // Run button
    // =============================================
    if (runGoogleBtn) {
        runGoogleBtn.addEventListener('click', function() {
            console.log('🚀 Running Google scraper...');
            
            if (!window.Outflo) {
                console.error('❌ Outflo not loaded');
                return;
            }
            
            const input = window.Outflo.prepareGoogleInput();
            const count = window.Outflo.getLeadCount();
            
            console.log('📦 Input:', input);
            console.log('🎯 Target count:', count);
            
            // Reset save flag
            isSaving = false;
            
            window.Outflo.runActor('AabCualFIriz3X6Fs', input, 'google', count);
        });
    }

    // =============================================
    // Download button
    // =============================================
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function() {
            if (window.Outflo) window.Outflo.downloadCsv();
        });
    }

    // =============================================
    // Debug button
    // =============================================
    if (debugBtn) {
        debugBtn.addEventListener('click', function() {
            console.log('🔍 Google Maps Debug');
            if (window.Outflo) {
                console.log('Items:', window.Outflo.currentItems ? window.Outflo.currentItems.length : 0);
            }
            // Check if user is logged in
            Auth.getCurrentUser().then(user => {
                console.log('👤 Current user:', user ? user.email : 'Not logged in');
            });
        });
    }

    // =============================================
    // Lead count input
    // =============================================
    if (leadCountInput) {
        leadCountInput.addEventListener('change', function() {
            let v = parseInt(this.value, 10);
            if (isNaN(v) || v < 10) this.value = 10;
            if (v > 100) this.value = 100;
        });
    }

    // =============================================
    // Initialize
    // =============================================
    console.log('📍 Google Maps page loading...');
    
    // Wait for Outflo to load
    if (window.Outflo) {
        window.Outflo.resetAllData();
        window.Outflo.buildTableHeaders('google');
        setupSaveInterceptor();
    } else {
        // Wait for Outflo
        const checkOutflo = setInterval(() => {
            if (window.Outflo) {
                clearInterval(checkOutflo);
                window.Outflo.resetAllData();
                window.Outflo.buildTableHeaders('google');
                setupSaveInterceptor();
                console.log('✅ Google Maps page ready');
            }
        }, 100);
    }
    
    console.log('📍 Google Maps page ready');
});