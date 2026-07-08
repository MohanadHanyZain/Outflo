document.addEventListener('DOMContentLoaded', function() {
    "use strict";
    const runGoogleBtn = document.getElementById('runGoogleBtn');
    const leadCountInput = document.getElementById('leadCount');
    const downloadBtn = document.getElementById('downloadCsvBtn');
    const debugBtn = document.getElementById('debugBtn');
    
    if (runGoogleBtn) {
        runGoogleBtn.addEventListener('click', function() {
            const input = Outflo.prepareGoogleInput();
            const count = Outflo.getLeadCount();
            Outflo.runActor('AabCualFIriz3X6Fs', input, 'google', count);
        });
    }
    
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function() {
            Outflo.downloadCsv();
        });
    }
    
    if (debugBtn) {
        debugBtn.addEventListener('click', function() {
            console.log('🔍 Google Maps Debug');
            console.log('Items:', Outflo.currentItems.length);
            console.log('Email stats:', Outflo.emailStats);
            if (Outflo.currentItems.length) {
                console.log('Sample:', Outflo.currentItems[0]);
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
    
    Outflo.resetAllData();
    Outflo.buildTableHeaders('google');
    console.log('📍 Google Maps page ready');
});