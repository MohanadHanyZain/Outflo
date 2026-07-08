document.addEventListener('DOMContentLoaded', function() {
    "use strict";
    
    const runGoogleBtn = document.getElementById('runGoogleBtn');
    const leadCountInput = document.getElementById('leadCount');
    const downloadBtn = document.getElementById('downloadCsvBtn');
    const debugBtn = document.getElementById('debugBtn');

    // =============================================
    // Save Google results to database (DIRECT)
    // =============================================
    async function saveGoogleResultsDirect(items, platform) {
        console.log('💾💾💾 SAVING GOOGLE RESULTS DIRECTLY...');
        
        try {
            const user = await Auth.getCurrentUser();
            if (!user) {
                console.error('❌ No user logged in');
                alert('Please login first!');
                return false;
            }
            
            console.log('👤 User:', user.email, 'ID:', user.id);
            
            const searchQuery = document.getElementById('googleKeyword').value.trim() || 'restaurant';
            const location = document.getElementById('googleLocation').value.trim() || 'Dubai';
            
            console.log('🔍 Search:', searchQuery);
            console.log('📍 Location:', location);
            console.log('📊 Items count:', items.length);
            
            // Save using Auth.saveLead
            const result = await Auth.saveLead(
                user.id,
                'google',
                searchQuery,
                location,
                items
            );
            
            if (result) {
                console.log('✅✅✅ SAVED TO DATABASE SUCCESSFULLY!');
                alert('✅ Data saved to database! Check your dashboard.');
                return true;
            } else {
                console.error('❌ Failed to save');
                alert('❌ Failed to save data to database. Check console for errors.');
                return false;
            }
        } catch (err) {
            console.error('❌❌❌ Error saving:', err);
            alert('Error saving data: ' + err.message);
            return false;
        }
    }

    // =============================================
    // Run button
    // =============================================
    if (runGoogleBtn) {
        runGoogleBtn.addEventListener('click', function() {
            console.log('🚀🚀🚀 RUNNING GOOGLE SCRAPER...');
            
            if (!window.Outflo) {
                console.error('❌ Outflo not loaded');
                return;
            }
            
            // Get current user
            Auth.getCurrentUser().then(user => {
                if (!user) {
                    alert('Please login first!');
                    return;
                }
                console.log('✅ User logged in:', user.email);
            });
            
            const input = window.Outflo.prepareGoogleInput();
            const count = window.Outflo.getLeadCount();
            
            console.log('📦 Input:', input);
            console.log('🎯 Target count:', count);
            
            // Override renderTable to save data
            const originalRender = window.Outflo.renderTable;
            
            window.Outflo.renderTable = function(items, platform) {
                console.log('📊 RenderTable called with', items.length, 'items');
                
                // Call original render
                originalRender(items, platform);
                
                // SAVE TO DATABASE
                if (items && items.length > 0) {
                    saveGoogleResultsDirect(items, platform);
                } else {
                    console.log('⚠️ No items to save');
                }
            };
            
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
            console.log('Outflo loaded:', !!window.Outflo);
            if (window.Outflo) {
                console.log('Items:', window.Outflo.currentItems ? window.Outflo.currentItems.length : 0);
            }
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
    console.log('📍 Google Maps page ready');
});