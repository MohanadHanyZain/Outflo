document.addEventListener('DOMContentLoaded', function() {
    "use strict";
    
    const runLinkedinBtn = document.getElementById('runLinkedinBtn');
    const leadCountInput = document.getElementById('leadCount');
    const downloadBtn = document.getElementById('downloadCsvBtn');
    const debugBtn = document.getElementById('debugBtn');

    // =============================================
    // Save LinkedIn results to database
    // =============================================
    async function saveLinkedinResultsToDb(items, platform) {
        console.log('💾 Saving LinkedIn results to database...');
        console.log('📊 Items count:', items ? items.length : 0);
        
        try {
            const userData = await Auth.getCurrentUser();
            if (!userData) {
                console.error('❌ No user logged in');
                return false;
            }
            
            console.log('👤 User ID:', userData.id);
            
            const searchQuery = document.getElementById('linkedinJob').value.trim() || 'Marketing Manager';
            const location = document.getElementById('linkedinCountry').value.trim() || 'Egypt';
            
            console.log('🔍 Search:', searchQuery, '📍 Location:', location);
            
            const result = await Auth.saveLead(
                userData.id,
                'linkedin',
                searchQuery,
                location,
                items || []
            );
            
            if (result) {
                console.log('✅ LinkedIn results saved to database successfully!');
                console.log('📝 Saved lead ID:', result.id);
                return true;
            } else {
                console.error('❌ Failed to save LinkedIn results');
                return false;
            }
        } catch (err) {
            console.error('❌ Error saving LinkedIn results:', err);
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
                saveLinkedinResultsToDb(items, platform).then(() => {
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
    if (runLinkedinBtn) {
        runLinkedinBtn.addEventListener('click', function() {
            console.log('🚀 Running LinkedIn scraper...');
            
            if (!window.Outflo) {
                console.error('❌ Outflo not loaded');
                return;
            }
            
            const input = window.Outflo.prepareLinkedinInput();
            const count = window.Outflo.getLeadCount();
            
            console.log('📦 Input:', input);
            console.log('🎯 Target count:', count);
            
            // Reset save flag
            isSaving = false;
            
            window.Outflo.runActor('M2FMdjRVeF1HPGFcc', input, 'linkedin', count);
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
            console.log('🔍 LinkedIn Debug');
            if (window.Outflo) {
                console.log('Items:', window.Outflo.currentItems ? window.Outflo.currentItems.length : 0);
                console.log('Email stats:', window.Outflo.emailStats);
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
    console.log('🔗 LinkedIn page loading...');
    
    // Wait for Outflo to load
    if (window.Outflo) {
        window.Outflo.resetAllData();
        window.Outflo.buildTableHeaders('linkedin');
        setupSaveInterceptor();
    } else {
        // Wait for Outflo
        const checkOutflo = setInterval(() => {
            if (window.Outflo) {
                clearInterval(checkOutflo);
                window.Outflo.resetAllData();
                window.Outflo.buildTableHeaders('linkedin');
                setupSaveInterceptor();
                console.log('✅ LinkedIn page ready');
            }
        }, 100);
    }
    
    console.log('🔗 LinkedIn page ready');
});