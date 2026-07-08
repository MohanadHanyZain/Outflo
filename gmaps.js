document.addEventListener('DOMContentLoaded', function() {
    "use strict";
    
    const runGoogleBtn = document.getElementById('runGoogleBtn');
    const leadCountInput = document.getElementById('leadCount');
    const downloadBtn = document.getElementById('downloadCsvBtn');
    const debugBtn = document.getElementById('debugBtn');

    if (runGoogleBtn) {
        runGoogleBtn.addEventListener('click', function() {
            console.log('🚀🚀🚀 RUNNING GOOGLE SCRAPER...');
            
            if (!window.Outflo) {
                console.error('❌ Outflo not loaded');
                return;
            }
            
            const input = window.Outflo.prepareGoogleInput();
            const count = window.Outflo.getLeadCount();
            
            console.log('📦 Input:', input);
            console.log('🎯 Target count:', count);
            
            window.Outflo.runActor('AabCualFIriz3X6Fs', input, 'google', count);
        });
    }

    if (downloadBtn) {
        downloadBtn.addEventListener('click', function() {
            if (window.Outflo) window.Outflo.downloadCsv();
        });
    }

    if (debugBtn) {
        debugBtn.addEventListener('click', function() {
            console.log('🔍 Google Maps Debug');
            console.log('Outflo loaded:', !!window.Outflo);
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

    console.log('📍 Google Maps page ready with organized display');
});