document.addEventListener('DOMContentLoaded', function() {
    "use strict";
    const runLinkedinBtn = document.getElementById('runLinkedinBtn');
    const leadCountInput = document.getElementById('leadCount');
    const downloadBtn = document.getElementById('downloadCsvBtn');
    const debugBtn = document.getElementById('debugBtn');
    
    if (runLinkedinBtn) {
        runLinkedinBtn.addEventListener('click', function() {
            const input = Outflo.prepareLinkedinInput();
            const count = Outflo.getLeadCount();
            Outflo.runActor('M2FMdjRVeF1HPGFcc', input, 'linkedin', count);
        });
    }
    
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function() {
            Outflo.downloadCsv();
        });
    }
    
    if (debugBtn) {
        debugBtn.addEventListener('click', function() {
            console.log('🔍 LinkedIn Debug');
            console.log('Items:', Outflo.currentItems.length);
            console.log('Email stats:', Outflo.emailStats);
            if (Outflo.currentItems.length) {
                console.log('Sample:', Outflo.currentItems[0]);
                console.log('Email:', Outflo.huntEmail(Outflo.currentItems[0]));
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
    Outflo.buildTableHeaders('linkedin');
    console.log('🔗 LinkedIn page ready');
});