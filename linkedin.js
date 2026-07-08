document.addEventListener('DOMContentLoaded', function() {
    "use strict";
    
    const runLinkedinBtn = document.getElementById('runLinkedinBtn');
    const leadCountInput = document.getElementById('leadCount');
    const downloadBtn = document.getElementById('downloadCsvBtn');
    const debugBtn = document.getElementById('debugBtn');

    if (runLinkedinBtn) {
        runLinkedinBtn.addEventListener('click', function() {
            console.log('🚀🚀🚀 RUNNING LINKEDIN SCRAPER...');
            
            if (!window.Outflo) {
                console.error('❌ Outflo not loaded');
                return;
            }
            
            const input = window.Outflo.prepareLinkedinInput();
            console.log('📦 Input:', input);
            
            // استخدم الطريقة الجديدة التي لا تعاني من CORS
            window.Outflo.runActorNoCORS('M2FMdjRVeF1HPGFcc', input, 'linkedin', window.Outflo.getLeadCount());
        });
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
                console.log('Items:', window.Outflo.currentItems ? window.Outflo.currentItems.length : 0);
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

    console.log('🔗 LinkedIn page ready');
});