document.addEventListener('DOMContentLoaded', function() {
    "use strict";
    
    const runLinkedinBtn = document.getElementById('runLinkedinBtn');
    const leadCountInput = document.getElementById('leadCount');
    const downloadBtn = document.getElementById('downloadCsvBtn');
    const debugBtn = document.getElementById('debugBtn');

    if (runLinkedinBtn) {
        runLinkedinBtn.addEventListener('click', function() {
            console.log('🚀🚀🚀 RUNNING LINKEDIN SCRAPER...');
            console.log('📌 Using Actor: Wp9rLb1xk0Z6e3JX9 (Google Search for LinkedIn)');
            
            if (!window.Outflo) {
                console.error('❌ Outflo not loaded');
                return;
            }
            
            const input = window.Outflo.prepareLinkedinInput();
            const count = window.Outflo.getLeadCount();
            
            console.log('📦 Input:', input);
            console.log('🎯 Target count:', count);
            
            window.Outflo.runActor('Wp9rLb1xk0Z6e3JX9', input, 'linkedin', count);
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
            console.log('Outflo loaded:', !!window.Outflo);
            if (window.Outflo) {
                console.log('Items:', window.Outflo.currentItems ? window.Outflo.currentItems.length : 0);
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

    console.log('🔗 LinkedIn page ready with Actor: Wp9rLb1xk0Z6e3JX9');
});