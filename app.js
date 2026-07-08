// ===== CORE LOGIC - Enhanced with target count =====

(function() {
    "use strict";

    // ===== HARDCODED TOKEN =====
    const API_TOKEN = "apify_api_J3P2YlygNudvv6ZSWNJ8cbLrPrFhxe3p4zIz";

    // ===== DOM refs (safe get) =====
    function getEl(id) { return document.getElementById(id); }

    let leadCountInput = getEl('leadCount');
    let statusMsg = getEl('statusMessage');
    let progressBar = getEl('progressBar');
    let resultCount = getEl('resultCount');
    let tableBody = getEl('tableBody');
    let dynamicHead = getEl('dynamicHead');
    let downloadBtn = getEl('downloadCsvBtn');
    let debugBtn = getEl('debugBtn');
    let statusPulse = getEl('statusPulse');
    let statsRow = getEl('statsRow');
    let statFound = getEl('statFound');
    let statPredicted = getEl('statPredicted');
    let statFallback = getEl('statFallback');
    let statTotal = getEl('statTotal');

    // ===== State =====
    let currentDatasetId = null;
    let currentItems = [];
    let isPolling = false;
    let pollInterval = null;
    let currentPlatform = 'google';
    let filteredCount = 0;
    let emailStats = { found: 0, predicted: 0, fallback: 0 };
    let targetCount = 20; // default

    // ===== Get lead count (safe) =====
    function getLeadCount() {
        if (!leadCountInput) return 20;
        let val = parseInt(leadCountInput.value, 10);
        if (isNaN(val) || val < 10) val = 10;
        if (val > 100) val = 100;
        return val;
    }

    // ===== Email Hunter (unchanged) =====
    function huntEmail(item) {
        const direct = ['email', 'emailAddress', 'contactInfo.email', 'primaryEmail', 'workEmail', 'contactEmail'];
        for (let f of direct) {
            const val = f.includes('.') ? f.split('.').reduce((o,k)=>o?.[k], item) : item[f];
            if (val && typeof val === 'string' && val.trim() && val.includes('@')) {
                return { email: val.trim(), source: 'Found ✓' };
            }
        }
        const fullText = JSON.stringify(item);
        const re = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const matches = fullText.match(re);
        if (matches && matches.length) {
            const unique = [...new Set(matches)];
            return { email: unique[0], source: 'Regex Sniped' };
        }
        const firstName = item.firstName || item.name?.split(' ')[0] || '';
        const lastName = item.lastName || item.name?.split(' ').slice(1).join(' ') || '';
        const company = item.currentCompany?.name || item.currentCompany || item.companyName || item.company || '';
        if (firstName && company) {
            const clean = company.replace(/[^a-zA-Z0-9]/g,'').toLowerCase();
            const f = firstName.replace(/[^a-zA-Z]/g,'').toLowerCase();
            if (clean.length > 2) {
                return { email: `${f}@${clean}.com`, source: 'Predicted (Company)' };
            }
        }
        if (firstName && lastName) {
            const f = firstName.replace(/[^a-zA-Z]/g,'').toLowerCase();
            const l = lastName.replace(/[^a-zA-Z]/g,'').toLowerCase();
            if (f && l) {
                return { email: `${f}.${l}@gmail.com`, source: 'Predicted (Gmail)' };
            }
        }
        const social = ['twitter','facebook','instagram','tiktok','youtube','whatsapp','phone'];
        for (let s of social) {
            const val = item[s] || item[`${s}Url`] || item[`${s}Link`];
            if (val && typeof val === 'string' && val.trim()) {
                return { email: `@${val}`, source: 'Social Contact' };
            }
        }
        return { email: 'Unavailable 🔒', source: 'Fallback' };
    }

    function getProfileLink(item) {
        const link = item.url || item.profileUrl || item.link || item.linkedinUrl || 
                     item.publicProfileUrl || item.profile_link || item.linkedin_profile_url ||
                     (item.id ? `https://linkedin.com/in/${item.id}` : null);
        if (link && link !== '#') return link;
        const txt = JSON.stringify(item);
        const re = /(https?:\/\/[^\s"']+linkedin[^\s"']+)/gi;
        const m = txt.match(re);
        return m && m.length ? m[0] : '#';
    }

    // ===== Filter LinkedIn =====
    function filterLinkedInItems(items, keyword) {
        if (!keyword || !keyword.trim()) return items;
        const kw = keyword.trim().toLowerCase();
        const terms = kw.split(/\s+/).filter(k=>k.length>1);
        const search = terms.length>1 ? terms : [kw];
        const filtered = items.filter(item => {
            const text = [
                item.headline, item.description, item.title, 
                item.occupation, item.jobTitle, item.fullName
            ].filter(Boolean).map(s=>s.toLowerCase()).join(' ');
            return search.some(t => text.includes(t)) || (kw.length>2 && text.includes(kw));
        });
        // sort by email priority
        return filtered.sort((a,b) => {
            const ea = huntEmail(a), eb = huntEmail(b);
            const pri = e => e.source.includes('Found') || e.source.includes('Regex') ? 0 : e.source.includes('Predicted') ? 1 : 2;
            return pri(ea) - pri(eb);
        });
    }

    // ===== Render Table with limit =====
    function renderTable(items, platform, limit) {
        if (!tableBody) return;
        tableBody.innerHTML = '';
        emailStats = { found:0, predicted:0, fallback:0 };
        let display = items || [];

        // Apply LinkedIn filter if needed
        if (platform === 'linkedin') {
            const linkedinJobInput = getEl('linkedinJob');
            const kw = linkedinJobInput ? linkedinJobInput.value.trim() : '';
            if (kw) {
                const filtered = filterLinkedInItems(display, kw);
                filteredCount = display.length - filtered.length;
                display = filtered;
            }
        }

        // Trim to target count (if specified)
        if (limit && limit > 0 && display.length > limit) {
            display = display.slice(0, limit);
        }

        if (!display || display.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-secondary py-4">No leads to display</td></tr>`;
            if (resultCount) resultCount.innerText = '0 leads';
            if (downloadBtn) downloadBtn.disabled = true;
            currentItems = [];
            return;
        }

        // Build rows
        let html = '';
        display.forEach((item, idx) => {
            let cols = [];
            if (platform === 'google') {
                let name = item.name || item.title || 'Unknown';
                let phone = item.phone || '-';
                let website = item.website || item.address || '-';
                cols = [
                    name,
                    phone ? `<span class="badge-phone">${phone}</span>` : '-',
                    website,
                    '<span class="badge-platform google">Google</span>'
                ];
            } else {
                let fullName = item.fullName || item.name || item.firstName || item.profileName || 'Unknown';
                let jobTitle = item.headline || item.occupation || item.jobTitle || item.title || '-';
                const emailRes = huntEmail(item);
                let emailDisplay = emailRes.email;
                let badgeClass = 'badge-email';
                if (emailRes.source.includes('Found') || emailRes.source.includes('Regex')) {
                    badgeClass += ' found';
                    emailStats.found++;
                } else if (emailRes.source.includes('Predicted')) {
                    badgeClass += ' predicted';
                    emailStats.predicted++;
                } else {
                    badgeClass += ' fallback';
                    emailStats.fallback++;
                }
                const emailHtml = `<span class="${badgeClass}" title="${emailRes.source}">${emailDisplay}</span>`;
                let profileLink = getProfileLink(item);
                let linkHtml = profileLink !== '#' ? 
                    `<a href="${profileLink}" target="_blank" class="text-primary text-decoration-none small"><i class="fas fa-external-link-alt"></i> view</a>` : '-';
                cols = [
                    fullName,
                    jobTitle,
                    emailHtml,
                    linkHtml,
                    '<span class="badge-platform linkedin">LinkedIn</span>'
                ];
            }
            html += `<tr><td>${idx+1}</td>${cols.map(c=>`<td>${c}</td>`).join('')}</tr>`;
        });

        tableBody.innerHTML = html;
        currentItems = display;
        const total = display.length;
        const summary = platform === 'linkedin' ? 
            ` | 📧 ${emailStats.found} found, ${emailStats.predicted} predicted` : '';
        const filterInfo = platform === 'linkedin' && filteredCount > 0 ? ` (filtered ${filteredCount})` : '';
        if (resultCount) resultCount.innerText = `${total} leads${filterInfo}${summary}`;
        if (downloadBtn) downloadBtn.disabled = false;

        if (platform === 'linkedin' && statsRow) {
            statsRow.style.display = 'flex';
            if (statFound) statFound.innerText = emailStats.found;
            if (statPredicted) statPredicted.innerText = emailStats.predicted;
            if (statFallback) statFallback.innerText = emailStats.fallback;
            if (statTotal) statTotal.innerText = total;
        } else if (statsRow) {
            statsRow.style.display = 'none';
        }
    }

    // ===== Build Table Headers =====
    function buildTableHeaders(platform) {
        if (!dynamicHead) return;
        let headers = [];
        if (platform === 'google') {
            headers = ['#', 'Name / Place', 'Phone', 'Website / Address', 'Source'];
        } else {
            headers = ['#', 'Full Name', 'Job Title', 'Email 🎯', 'Profile', 'Source'];
        }
        let html = '<tr>';
        headers.forEach(h => html += `<th>${h}</th>`);
        html += '</tr>';
        dynamicHead.innerHTML = html;
    }

    // ===== Status =====
    function updateStatus(text, percent, isActive=true) {
        if (statusMsg) statusMsg.innerHTML = text;
        if (progressBar) progressBar.style.width = Math.min(100, Math.max(0, percent)) + '%';
        if (statusPulse) {
            statusPulse.style.background = isActive ? '#6366F1' : '#6B7280';
        }
    }

    function showError(msg) {
        if (statusMsg) statusMsg.innerHTML = `<i class="fas fa-exclamation-triangle text-danger me-2"></i> ${msg}`;
        if (progressBar) progressBar.style.width = '0%';
        if (statusPulse) statusPulse.style.background = '#EF4444';
        console.error('❌ Error:', msg);
    }

    function resetAllData() {
        if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
        isPolling = false;
        currentDatasetId = null;
        currentItems = [];
        filteredCount = 0;
        emailStats = { found:0, predicted:0, fallback:0 };
        targetCount = 20;
        if (downloadBtn) downloadBtn.disabled = true;
        if (statsRow) statsRow.style.display = 'none';
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-secondary py-4">No leads yet. Run a scraper above.</td></tr>`;
        }
        if (resultCount) resultCount.innerText = '0 leads';
        updateStatus('<i class="fas fa-circle-notch fa-spin me-2"></i> Awaiting action', 0, false);
    }

    // ===== CSV Download =====
    function downloadCsv() {
        if (!currentItems || currentItems.length === 0) {
            alert('No data to download');
            return;
        }
        let headers, rows;
        if (currentPlatform === 'google') {
            headers = ['Name / Place', 'Phone', 'Website / Address', 'Source'];
            rows = currentItems.map(item => [
                item.name || item.title || '',
                item.phone || '',
                item.website || item.address || '',
                'Google Maps'
            ]);
        } else {
            headers = ['Full Name', 'Job Title', 'Target Email', 'Email Source', 'Profile URL', 'Source'];
            rows = currentItems.map(item => {
                const e = huntEmail(item);
                return [
                    item.fullName || item.name || item.firstName || '',
                    item.headline || item.occupation || item.jobTitle || '',
                    e.email,
                    e.source,
                    getProfileLink(item),
                    'LinkedIn'
                ];
            });
        }
        let csv = '\uFEFF' + headers.join(',') + '\n';
        rows.forEach(row => {
            const escaped = row.map(cell => {
                if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
                    return `"${cell.replace(/"/g,'""')}"`;
                }
                return cell;
            });
            csv += escaped.join(',') + '\n';
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'outflo_leads.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }

    // ===== Run Actor with target count =====
    async function runActor(actorId, inputData, platform, targetCountParam) {
        targetCount = targetCountParam || getLeadCount();
        resetAllData();
        currentPlatform = platform;
        buildTableHeaders(platform);
        updateStatus('<i class="fas fa-spinner fa-spin me-2"></i> Starting cloud engine...', 15, true);
        console.log(`🚀 Starting actor: ${actorId} for platform: ${platform}, target: ${targetCount}`);

        try {
            const url = `https://api.apify.com/v2/acts/${actorId}/runs?token=${API_TOKEN}`;
            const resp = await fetch(url, {
                method: 'POST',
                mode: 'cors',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(inputData)
            });
            if (!resp.ok) {
                const errText = await resp.text();
                console.error('❌ API start error:', resp.status, errText);
                throw new Error(`Start failed: ${resp.status} - ${errText}`);
            }
            const result = await resp.json();
            console.log('✅ Run started, response:', result);
            const runId = result.data?.id;
            if (!runId) {
                console.error('❌ No run ID in response:', result);
                throw new Error('No run ID received');
            }
            currentDatasetId = result.data?.defaultDatasetId || null;
            if (!currentDatasetId) {
                console.warn('⚠️ No defaultDatasetId in response, will try to get it later.');
            }
            console.log(`📌 Run ID: ${runId}, Dataset ID: ${currentDatasetId || 'pending'}`);

            isPolling = true;
            let attempts = 0;
            const maxAttempts = 50;

            pollInterval = setInterval(async () => {
                attempts++;
                if (!isPolling) { clearInterval(pollInterval); pollInterval = null; return; }
                try {
                    const statusUrl = `https://api.apify.com/v2/actor-runs/${runId}?token=${API_TOKEN}`;
                    const sRes = await fetch(statusUrl, { method: 'GET', mode: 'cors', headers: { 'Accept': 'application/json' } });
                    if (!sRes.ok) {
                        const errText = await sRes.text();
                        console.error('❌ Status fetch error:', sRes.status, errText);
                        throw new Error(`Status fetch failed: ${sRes.status}`);
                    }
                    const sData = await sRes.json();
                    const runStatus = sData.data?.status;
                    console.log(`🔄 Poll #${attempts}: status = ${runStatus}`);
                    let progress = 30 + (attempts/maxAttempts)*40;
                    progress = Math.min(80, progress);

                    if (runStatus === 'SUCCEEDED') {
                        clearInterval(pollInterval); pollInterval = null; isPolling = false;
                        updateStatus('<i class="fas fa-cloud-download-alt me-2"></i> Pulling data...', 85, true);
                        console.log('✅ Run succeeded, fetching dataset...');
                        if (!currentDatasetId) {
                            currentDatasetId = sData.data?.defaultDatasetId;
                            console.log('📌 Retrieved dataset ID from run status:', currentDatasetId);
                        }
                        if (currentDatasetId) {
                            const dUrl = `https://api.apify.com/v2/datasets/${currentDatasetId}/items?token=${API_TOKEN}&clean=true&limit=1000`;
                            const dRes = await fetch(dUrl, { method: 'GET', mode: 'cors', headers: { 'Accept': 'application/json' } });
                            if (!dRes.ok) {
                                const errText = await dRes.text();
                                console.error('❌ Dataset fetch error:', dRes.status, errText);
                                throw new Error(`Dataset fetch failed: ${dRes.status}`);
                            }
                            const items = await dRes.json();
                            console.log(`📊 Received ${items.length} items from dataset`);
                            if (!Array.isArray(items)) {
                                console.warn('⚠️ Dataset response is not an array:', items);
                                renderTable([], platform, targetCount);
                            } else {
                                renderTable(items, platform, targetCount);
                            }
                            const total = currentItems.length;
                            const summary = platform === 'linkedin' ? 
                                ` (📧 ${emailStats.found} found, ${emailStats.predicted} predicted)` : '';
                            const filterMsg = platform === 'linkedin' && filteredCount > 0 ? ` (filtered ${filteredCount})` : '';
                            updateStatus(`<i class="fas fa-check-circle text-success me-2"></i> Done! ${total} leads${filterMsg}${summary}`, 100, true);
                            if (downloadBtn) downloadBtn.disabled = (total === 0);
                            console.log(`🏁 Finished: ${total} leads displayed (target was ${targetCount})`);
                        } else {
                            console.error('❌ No dataset ID available after run');
                            showError('Dataset ID missing');
                        }
                    } else if (runStatus === 'FAILED' || runStatus === 'ABORTED' || runStatus === 'TIMED-OUT') {
                        clearInterval(pollInterval); pollInterval = null; isPolling = false;
                        console.error(`❌ Run ended with status: ${runStatus}`);
                        showError(`Run ${runStatus}`);
                    } else {
                        updateStatus(`<i class="fas fa-spinner fa-spin me-2"></i> Status: ${runStatus || 'Running'} (attempt ${attempts})`, progress, true);
                    }
                    if (attempts >= maxAttempts && isPolling) {
                        clearInterval(pollInterval); pollInterval = null; isPolling = false;
                        console.warn('⚠️ Max polling attempts reached, giving up.');
                        showError('Timeout – try again');
                    }
                } catch (e) {
                    clearInterval(pollInterval); pollInterval = null; isPolling = false;
                    console.error('❌ Polling error:', e.message);
                    showError(`Poll error: ${e.message}`);
                }
            }, 4000);

        } catch (e) {
            console.error('❌ runActor error:', e.message);
            showError(`Error: ${e.message}`);
            isPolling = false;
            if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
        }
    }

    // ===== Input preparers =====
    function prepareGoogleInput() {
        const googleKeywordEl = getEl('googleKeyword');
        const googleLocationEl = getEl('googleLocation');
        const kw = googleKeywordEl ? googleKeywordEl.value.trim() : 'restaurant';
        const loc = googleLocationEl ? googleLocationEl.value.trim() : 'Dubai';
        const max = getLeadCount();
        return {
            "searchStringsArray": [kw],
            "locationQueries": [loc],
            "geoStrictMatch": false,
            "maxCrawledPlacesPerSearch": max,
            "language": "en",
            "skipClosedPlaces": false,
            "extractContactsFromWebsite": false,
            "contactsFetchContactPage": true,
            "contactsProxyFallback": true,
            "contactsFilterEmailsByWebsiteDomain": true,
            "contactsSkipChains": true,
            "contactsTimeoutSecs": 10,
            "maxReviewsPerPlace": 0,
            "reviewsSort": "newest",
            "additionalLanguages": ["fi"],
            "countryCode": "US",
            "maxPlacesPerViewport": 80,
            "enableSubdivision": true,
            "maxSubdivisionDepth": 4,
            "multiZoomDelta": 0,
            "zoom": 13,
            "reverseGeocodeMissingAddress": true,
            "concurrency": 8,
            "requestTimeoutSecs": 30,
            "minRequestIntervalMs": 250
        };
    }

    function prepareLinkedinInput() {
        const linkedinJobEl = getEl('linkedinJob');
        const linkedinCountryEl = getEl('linkedinCountry');
        const job = linkedinJobEl ? linkedinJobEl.value.trim() : 'Marketing Manager';
        const country = linkedinCountryEl ? linkedinCountryEl.value.trim() : 'Egypt';
        // Fetch more than needed to compensate for filtering
        const max = getLeadCount() * 3;  // triple the target
        return {
            "searchQuery": `${job} in ${country}`,
            "profileScraperMode": "Full",
            "maxItems": max,
            "startPage": 1
        };
    }

    // ===== Expose to window =====
    window.Outflo = {
        API_TOKEN,
        leadCountInput,
        statusMsg,
        progressBar,
        resultCount,
        tableBody,
        dynamicHead,
        downloadBtn,
        debugBtn,
        statusPulse,
        statsRow,
        statFound,
        statPredicted,
        statFallback,
        statTotal,
        currentDatasetId,
        currentItems,
        isPolling,
        pollInterval,
        currentPlatform,
        filteredCount,
        emailStats,
        targetCount,
        getLeadCount,
        huntEmail,
        getProfileLink,
        filterLinkedInItems,
        renderTable,
        buildTableHeaders,
        updateStatus,
        showError,
        resetAllData,
        downloadCsv,
        runActor,
        prepareGoogleInput,
        prepareLinkedinInput
    };

    console.log('🚀 Outflo Core Engine loaded (with target count enforcement)');
})();