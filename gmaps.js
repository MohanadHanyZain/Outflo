document.addEventListener('DOMContentLoaded', function() {
    "use strict";
    
    // Override the renderTable function to save data
    const originalRenderTable = window.Outflo ? window.Outflo.renderTable : null;
    
    const runGoogleBtn = document.getElementById('runGoogleBtn');
    const leadCountInput = document.getElementById('leadCount');
    const downloadBtn = document.getElementById('downloadCsvBtn');
    const debugBtn = document.getElementById('debugBtn');

    // =============================================
    // Save Google results to database
    // =============================================
    async function saveGoogleResultsToDb(items, platform) {
        try {
            const userData = await Auth.getCurrentUser();
            if (!userData) return;
            
            const searchQuery = document.getElementById('googleKeyword').value.trim() || 'restaurant';
            const location = document.getElementById('googleLocation').value.trim() || 'Dubai';
            
            await Auth.saveLead(
                userData.id,
                'google',
                searchQuery,
                location,
                items
            );
            
            console.log('✅ Google results saved to database');
        } catch (err) {
            console.error('Error saving Google results:', err);
        }
    }

    if (runGoogleBtn) {
        runGoogleBtn.addEventListener('click', function() {
            const input = window.Outflo ? window.Outflo.prepareGoogleInput() : prepareGoogleInputFallback();
            const count = window.Outflo ? window.Outflo.getLeadCount() : 20;
            
            // Wrap the runActor to save results
            const originalRun = window.Outflo ? window.Outflo.runActor : null;
            if (originalRun) {
                // We need to intercept the render to save data
                const originalRender = window.Outflo.renderTable;
                window.Outflo.renderTable = function(items, platform) {
                    originalRender(items, platform);
                    // Save to database
                    saveGoogleResultsToDb(items, platform);
                    // Restore original
                    window.Outflo.renderTable = originalRender;
                };
                
                window.Outflo.runActor('AabCualFIriz3X6Fs', input, 'google', count);
            }
        });
    }

    function prepareGoogleInputFallback() {
        const kw = document.getElementById('googleKeyword').value.trim() || 'restaurant';
        const loc = document.getElementById('googleLocation').value.trim() || 'Dubai';
        const max = parseInt(document.getElementById('leadCount').value) || 20;
        return {
            "searchStringsArray": [kw],
            "locationQueries": [loc],
            "maxCrawledPlacesPerSearch": max,
            // ... other defaults
        };
    }

    if (downloadBtn) {
        downloadBtn.addEventListener('click', function() {
            if (window.Outflo) window.Outflo.downloadCsv();
        });
    }

    if (debugBtn) {
        debugBtn.addEventListener('click', function() {
            console.log('🔍 Google Maps Debug');
            if (window.Outflo) {
                console.log('Items:', window.Outflo.currentItems.length);
            }
        });
    }

    if (leadCountInput) {
        leadCountInput.addEventListener('change', function() {
            let v = parseInt(this.value, 10);
            if (isNaN(v) || v < 10) this.value = 10;
            if (v > 100) this.value = 100;
        });
    }

    if (window.Outflo) {
        window.Outflo.resetAllData();
        window.Outflo.buildTableHeaders('google');
    }
    console.log('📍 Google Maps page ready with database save');
});