document.addEventListener('DOMContentLoaded', function() {
    "use strict";
    
    const runLinkedinBtn = document.getElementById('runLinkedinBtn');
    const leadCountInput = document.getElementById('leadCount');
    const downloadBtn = document.getElementById('downloadCsvBtn');
    const debugBtn = document.getElementById('debugBtn');

    // =============================================
    // ===== RUN LINKEDIN SCRAPER =====
    // =============================================
    if (runLinkedinBtn) {
        runLinkedinBtn.addEventListener('click', function() {
            console.log('🚀🚀🚀 RUNNING LINKEDIN SCRAPER...');
            console.log('📌 Using Actor: M2FMdjRVeF1HPGFcc (LinkedIn Profile Search)');
            
            if (!window.Outflo) {
                console.error('❌ Outflo not loaded');
                return;
            }
            
            const input = window.Outflo.prepareLinkedinInput();
            const count = window.Outflo.getLeadCount();
            
            console.log('📦 Input:', input);
            console.log('🎯 Target count:', count);
            
            window.Outflo.runActor('M2FMdjRVeF1HPGFcc', input, 'linkedin', count);
        });
    }

    // =============================================
    // ===== TEST LINKEDIN SEARCH =====
    // =============================================
    // يمكنك إضافة زر اختبار في الواجهة إذا أردت
    // window.testLinkedin = async function() {
    //     if (window.Outflo) {
    //         await window.Outflo.testLinkedinSearch();
    //     }
    // };

    // =============================================
    // ===== DOWNLOAD BUTTON =====
    // =============================================
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function() {
            if (window.Outflo) window.Outflo.downloadCsv();
        });
    }

    // =============================================
    // ===== DEBUG BUTTON =====
    // =============================================
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

    // =============================================
    // ===== LEAD COUNT INPUT =====
    // =============================================
    if (leadCountInput) {
        leadCountInput.addEventListener('change', function() {
            let v = parseInt(this.value, 10);
            if (isNaN(v) || v < 10) this.value = 10;
            if (v > 100) this.value = 100;
        });
    }

    console.log('🔗 LinkedIn page ready with Actor: M2FMdjRVeF1HPGFcc');
    console.log('💡 To test: window.Outflo.testLinkedinSearch()');
});