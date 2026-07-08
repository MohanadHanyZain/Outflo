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
        try {
            const userData = await Auth.getCurrentUser();
            if (!userData) return;
            
            const searchQuery = document.getElementById('linkedinJob').value.trim() || 'Marketing Manager';
            const location = document.getElementById('linkedinCountry').value.trim() || 'Egypt';
            
            await Auth.saveLead(
                userData.id,
                'linkedin',
                searchQuery,
                location,
                items
            );
            
            console.log('✅ LinkedIn results saved to database');
        } catch (err) {
            console.error('Error saving LinkedIn results:', err);
        }
    }

    if (runLinkedinBtn) {
        runLinkedinBtn.addEventListener('click', function() {
            const input = window.Outflo ? window.Outflo.prepareLinkedinInput() : prepareLinkedinInputFallback();
            const count = window.Outflo ? window.Outflo.getLeadCount() : 20;
            
            const originalRun = window.Outflo ? window.Outflo.runActor : null;
            if (originalRun) {
                const originalRender = window.Outflo.renderTable;
                window.Outflo.renderTable = function(items, platform) {
                    originalRender(items, platform);
                    saveLinkedinResultsToDb(items, platform);
                    window.Outflo.renderTable = originalRender;
                };
                
                window.Outflo.runActor('M2FMdjRVeF1HPGFcc', input, 'linkedin', count);
            }
        });
    }

    function prepareLinkedinInputFallback() {
        const job = document.getElementById('linkedinJob').value.trim() || 'Marketing Manager';
        const country = document.getElementById('linkedinCountry').value.trim() || 'Egypt';
        const max = parseInt(document.getElementById('leadCount').value) || 20;
        return {
            "searchQuery": `${job} in ${country}`,
            "profileScraperMode": "Full",
            "maxItems": max * 3,
            "startPage": 1
        };
    }

    if (downloadBtn) {
        downloadBtn.addEventListener('click', function() {
            if (window.Outflo) window.Outflo.downloadCsv();
        });
    }

    if (debugBtn) {
        debugBtn.addEventListener('click', function() {
            console.log('🔍 LinkedIn Debug');
            if (window.Outflo) {
                console.log('Items:', window.Outflo.currentItems.length);
                console.log('Email stats:', window.Outflo.emailStats);
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
        window.Outflo.buildTableHeaders('linkedin');
    }
    console.log('🔗 LinkedIn page ready with database save');
});