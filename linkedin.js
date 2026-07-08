document.addEventListener('DOMContentLoaded', function() {
    "use strict";
    
    const runLinkedinBtn = document.getElementById('runLinkedinBtn');
    const leadCountInput = document.getElementById('leadCount');
    const downloadBtn = document.getElementById('downloadCsvBtn');
    const debugBtn = document.getElementById('debugBtn');

    // =============================================
    // Save LinkedIn results to database (DIRECT)
    // =============================================
    async function saveLinkedinResultsDirect(items, platform) {
        console.log('💾💾💾 SAVING LINKEDIN RESULTS DIRECTLY...');
        
        try {
            const user = await Auth.getCurrentUser();
            if (!user) {
                console.error('❌ No user logged in');
                alert('Please login first!');
                return false;
            }
            
            console.log('👤 User:', user.email, 'ID:', user.id);
            
            const searchQuery = document.getElementById('linkedinJob').value.trim() || 'Marketing Manager';
            const location = document.getElementById('linkedinCountry').value.trim() || 'Egypt';
            
            console.log('🔍 Search:', searchQuery);
            console.log('📍 Location:', location);
            console.log('📊 Items count:', items.length);
            
            const result = await Auth.saveLead(
                user.id,
                'linkedin',
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
    if (runLinkedinBtn) {
        runLinkedinBtn.addEventListener('click', function() {
            console.log('🚀🚀🚀 RUNNING LINKEDIN SCRAPER...');
            
            if (!window.Outflo) {
                console.error('❌ Outflo not loaded');
                return;
            }
            
            Auth.getCurrentUser().then(user => {
                if (!user) {
                    alert('Please login first!');
                    return;
                }
                console.log('✅ User logged in:', user.email);
            });
            
            const input = window.Outflo.prepareLinkedinInput();
            const count = window.Outflo.getLeadCount();
            
            console.log('📦 Input:', input);
            console.log('🎯 Target count:', count);
            
            const originalRender = window.Outflo.renderTable;
            
            window.Outflo.renderTable = function(items, platform) {
                console.log('📊 RenderTable called with', items.length, 'items');
                originalRender(items, platform);
                
                if (items && items.length > 0) {
                    saveLinkedinResultsDirect(items, platform);
                } else {
                    console.log('⚠️ No items to save');
                }
            };
            
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
    console.log('🔗 LinkedIn page ready');
});