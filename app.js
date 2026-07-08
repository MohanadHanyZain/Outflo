// ===== CORE LOGIC - No Email Prediction =====

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
    let targetCount = 20;

    // ===== Get lead count =====
    function getLeadCount() {
        if (!leadCountInput) return 20;
        let val = parseInt(leadCountInput.value, 10);
        if (isNaN(val) || val < 10) val = 10;
        if (val > 100) val = 100;
        return val;
    }

    // =============================================
    // ===== EMAIL EXTRACTOR - NO PREDICTION =====
    // =============================================
    function extractEmail(item) {
        // Check direct email fields
        const emailFields = ['email', 'emailAddress', 'contactInfo.email', 'primaryEmail', 'workEmail', 'contactEmail'];
        for (let field of emailFields) {
            const val = field.includes('.') ? field.split('.').reduce((o, k) => o?.[k], item) : item[field];
            if (val && typeof val === 'string' && val.trim() && val.includes('@')) {
                return { email: val.trim(), source: 'Found ✓' };
            }
        }

        // Check if email exists in any text field using regex
        const textFields = ['headline', 'description', 'about', 'summary', 'bio', 'occupation', 'jobTitle', 'title'];
        for (let field of textFields) {
            if (item[field] && typeof item[field] === 'string') {
                const regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
                const match = item[field].match(regex);
                if (match) {
                    return { email: match[0], source: 'Regex Sniped' };
                }
            }
        }

        // Check entire object as last resort
        const fullText = JSON.stringify(item);
        const globalRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const matches = fullText.match(globalRegex);
        if (matches && matches.length > 0) {
            // Remove duplicates
            const unique = [...new Set(matches)];
            // Filter out common placeholder emails
            const validEmails = unique.filter(email => 
                !email.includes('example.com') && 
                !email.includes('test.com') &&
                !email.includes('sample.com')
            );
            if (validEmails.length > 0) {
                return { email: validEmails[0], source: 'Regex Sniped' };
            }
        }

        // No email found - return Not Available
        return { email: 'Not Available', source: 'Not Found' };
    }

    // =============================================
    // ===== GET PROFILE LINK =====
    // =============================================
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

    // =============================================
    // ===== FILTER LINKEDIN ITEMS =====
    // =============================================
    function filterLinkedInItems(items, keyword) {
        if (!keyword || !keyword.trim()) return items;
        const kw = keyword.trim().toLowerCase();
        const terms = kw.split(/\s+/).filter(k => k.length > 1);
        const search = terms.length > 1 ? terms : [kw];
        const filtered = items.filter(item => {
            const text = [
                item.headline, item.description, item.title, 
                item.occupation, item.jobTitle, item.fullName
            ].filter(Boolean).map(s => s.toLowerCase()).join(' ');
            return search.some(t => text.includes(t)) || (kw.length > 2 && text.includes(kw));
        });
        // Sort: items with real emails first
        return filtered.sort((a, b) => {
            const ea = extractEmail(a);
            const eb = extractEmail(b);
            const pri = e => e.source === 'Found ✓' || e.source === 'Regex Sniped' ? 0 : 1;
            return pri(ea) - pri(eb);
        });
    }

    // =============================================
    // ===== SAVE TO DATABASE =====
    // =============================================
    async function saveToDatabase(items, platform) {
        console.log('💾 SAVING TO DATABASE FROM APP.JS...');
        console.log('📊 Platform:', platform);
        console.log('📊 Items count:', items ? items.length : 0);

        try {
            if (typeof Auth === 'undefined' || !Auth.getCurrentUser) {
                console.log('⚠️ Auth not loaded, skipping database save');
                return false;
            }

            const user = await Auth.getCurrentUser();
            if (!user) {
                console.log('⚠️ No user logged in, skipping database save');
                return false;
            }

            console.log('👤 User ID:', user.id);

            let searchQuery = '';
            let location = '';

            if (platform === 'google') {
                const googleKeyword = getEl('googleKeyword');
                const googleLocation = getEl('googleLocation');
                searchQuery = googleKeyword ? googleKeyword.value.trim() : 'restaurant';
                location = googleLocation ? googleLocation.value.trim() : 'Dubai';
            } else {
                const linkedinJob = getEl('linkedinJob');
                const linkedinCountry = getEl('linkedinCountry');
                searchQuery = linkedinJob ? linkedinJob.value.trim() : 'Marketing Manager';
                location = linkedinCountry ? linkedinCountry.value.trim() : 'Egypt';
            }

            console.log('🔍 Search:', searchQuery);
            console.log('📍 Location:', location);

            const result = await Auth.saveLead(
                user.id,
                platform,
                searchQuery,
                location,
                items || []
            );

            if (result) {
                console.log('✅ DATA SAVED TO DATABASE SUCCESSFULLY!');
                console.log('📝 Saved lead ID:', result[0]?.id || 'unknown');
                return true;
            } else {
                console.error('❌ Failed to save data');
                return false;
            }
        } catch (err) {
            console.error('❌ Error saving to database:', err);
            return false;
        }
    }

    // =============================================
    // ===== RENDER TABLE - ORGANIZED =====
    // =============================================
    function renderTable(items, platform) {
        if (!tableBody) return;
        tableBody.innerHTML = '';
        emailStats = { found: 0, predicted: 0, fallback: 0 };
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

        // Trim to target count
        if (targetCount && targetCount > 0 && display.length > targetCount) {
            display = display.slice(0, targetCount);
        }

        if (!display || display.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-secondary py-4">
                        <i class="fas fa-inbox me-2" style="opacity:0.3;"></i> 
                        No leads to display
                    </td>
                </tr>
            `;
            if (resultCount) resultCount.innerText = '0 leads';
            if (downloadBtn) downloadBtn.disabled = true;
            currentItems = [];
            return;
        }

        let html = '';
        display.forEach((item, idx) => {
            let cols = [];
            
            if (platform === 'google') {
                // ===== GOOGLE MAPS =====
                const name = item.name || item.title || 'Unknown';
                const phone = item.phone || '—';
                const website = item.website || '—';
                const address = item.address || '—';
                const rating = item.rating || '—';
                const reviews = item.reviews || '—';
                
                cols = [
                    `<div class="fw-semibold text-light">${name}</div>
                     <div class="text-secondary small">${address}</div>`,
                    `<div class="text-light">${phone}</div>`,
                    website !== '—' ? `<a href="${website}" target="_blank" class="text-primary text-decoration-none small">${website.replace(/^https?:\/\//, '').slice(0, 30)}${website.length > 30 ? '…' : ''}</a>` : '—',
                    `<div class="text-center">
                        <span class="badge bg-primary bg-opacity-10 text-primary small">${rating}</span>
                        <div class="text-secondary small">${reviews} reviews</div>
                     </div>`,
                    `<span class="badge-platform google">Google Maps</span>`
                ];
            } else {
                // ===== LINKEDIN - NO PREDICTION =====
                const fullName = item.fullName || item.name || item.firstName || 'Unknown';
                const jobTitle = item.headline || item.occupation || item.jobTitle || '—';
                const company = item.currentCompany || item.company || '—';
                const location = item.location || '—';
                
                // Extract email without prediction
                const emailRes = extractEmail(item);
                let emailDisplay = emailRes.email;
                let badgeClass = 'badge-email';
                
                if (emailRes.source === 'Found ✓' || emailRes.source === 'Regex Sniped') {
                    badgeClass += ' found';
                    emailStats.found++;
                } else {
                    badgeClass += ' fallback';
                    emailStats.fallback++;
                    emailDisplay = 'Not Available';
                }
                const emailHtml = `<span class="${badgeClass}" title="${emailRes.source}">${emailDisplay}</span>`;
                
                const profileLink = getProfileLink(item);
                const linkHtml = profileLink !== '#' ? 
                    `<a href="${profileLink}" target="_blank" class="text-primary text-decoration-none small">
                        <i class="fas fa-external-link-alt"></i> View Profile
                     </a>` : '—';
                
                cols = [
                    `<div class="fw-semibold text-light">${fullName}</div>
                     <div class="text-secondary small">${jobTitle}</div>`,
                    `<div class="text-light">${company}</div>
                     <div class="text-secondary small">${location}</div>`,
                    emailHtml,
                    linkHtml,
                    `<span class="badge-platform linkedin">LinkedIn</span>`
                ];
            }
            
            html += `
                <tr>
                    <td class="text-secondary" style="width:40px;">${idx + 1}</td>
                    ${cols.map(c => `<td>${c}</td>`).join('')}
                </tr>
            `;
        });

        tableBody.innerHTML = html;
        currentItems = display;
        const total = display.length;
        const summary = platform === 'linkedin' ? 
            ` | 📧 ${emailStats.found} found, ${emailStats.fallback} not available` : '';
        const filterInfo = platform === 'linkedin' && filteredCount > 0 ? ` (filtered ${filteredCount})` : '';
        if (resultCount) resultCount.innerText = `${total} leads${filterInfo}${summary}`;
        if (downloadBtn) downloadBtn.disabled = false;

        if (platform === 'linkedin' && statsRow) {
            statsRow.style.display = 'flex';
            if (statFound) statFound.innerText = emailStats.found;
            if (statPredicted) statPredicted.innerText = 0; // No predictions
            if (statFallback) statFallback.innerText = emailStats.fallback;
            if (statTotal) statTotal.innerText = total;
        } else if (statsRow) {
            statsRow.style.display = 'none';
        }

        // Save to database
        if (display && display.length > 0) {
            console.log('💾 Triggering database save from renderTable...');
            saveToDatabase(display, platform);
        }
    }

    // ===== Build Table Headers =====
    function buildTableHeaders(platform) {
        if (!dynamicHead) return;
        let headers = [];
        if (platform === 'google') {
            headers = ['#', 'Place / Address', 'Phone', 'Website', 'Rating', 'Source'];
        } else {
            headers = ['#', 'Name / Title', 'Company / Location', 'Email', 'Profile', 'Source'];
        }
        let html = '<tr>';
        headers.forEach(h => html += `<th class="text-uppercase small fw-semibold" style="color:#9CA3AF;letter-spacing:0.5px;">${h}</th>`);
        html += '</tr>';
        dynamicHead.innerHTML = html;
    }

    // ===== Status =====
    function updateStatus(text, percent, isActive = true) {
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
        emailStats = { found: 0, predicted: 0, fallback: 0 };
        targetCount = 20;
        if (downloadBtn) downloadBtn.disabled = true;
        if (statsRow) statsRow.style.display = 'none';
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-secondary py-4">
                        <i class="fas fa-inbox me-2" style="opacity:0.3;"></i> 
                        No leads yet. Run a scraper above.
                    </td>
                </tr>
            `;
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
            headers = ['Name', 'Address', 'Phone', 'Website', 'Rating', 'Reviews', 'Source'];
            rows = currentItems.map(item => [
                item.name || item.title || '',
                item.address || '',
                item.phone || '',
                item.website || '',
                item.rating || '',
                item.reviews || '',
                'Google Maps'
            ]);
        } else {
            headers = ['Full Name', 'Job Title', 'Company', 'Location', 'Email', 'Email Source', 'Profile URL', 'Source'];
            rows = currentItems.map(item => {
                const e = extractEmail(item);
                return [
                    item.fullName || item.name || item.firstName || '',
                    item.headline || item.occupation || item.jobTitle || '',
                    item.currentCompany || item.company || '',
                    item.location || '',
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
                    return `"${cell.replace(/"/g, '""')}"`;
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

    // ===== Run Actor =====
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
                    let progress = 30 + (attempts / maxAttempts) * 40;
                    progress = Math.min(80, progress);

                    if (runStatus === 'SUCCEEDED') {
                        clearInterval(pollInterval);
                        pollInterval = null;
                        isPolling = false;
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
                                renderTable([], platform);
                            } else {
                                renderTable(items, platform);
                            }
                            const total = currentItems.length;
                            const summary = platform === 'linkedin' ? 
                                ` (📧 ${emailStats.found} found, ${emailStats.fallback} not available)` : '';
                            const filterMsg = platform === 'linkedin' && filteredCount > 0 ? ` (filtered ${filteredCount})` : '';
                            updateStatus(`<i class="fas fa-check-circle text-success me-2"></i> Done! ${total} leads${filterMsg}${summary}`, 100, true);
                            if (downloadBtn) downloadBtn.disabled = (total === 0);
                            console.log(`🏁 Finished: ${total} leads displayed (target was ${targetCount})`);
                        } else {
                            console.error('❌ No dataset ID available after run');
                            showError('Dataset ID missing');
                        }
                    } else if (runStatus === 'FAILED' || runStatus === 'ABORTED' || runStatus === 'TIMED-OUT') {
                        clearInterval(pollInterval);
                        pollInterval = null;
                        isPolling = false;
                        console.error(`❌ Run ended with status: ${runStatus}`);
                        showError(`Run ${runStatus}`);
                    } else {
                        updateStatus(`<i class="fas fa-spinner fa-spin me-2"></i> Status: ${runStatus || 'Running'} (attempt ${attempts})`, progress, true);
                    }
                    if (attempts >= maxAttempts && isPolling) {
                        clearInterval(pollInterval);
                        pollInterval = null;
                        isPolling = false;
                        console.warn('⚠️ Max polling attempts reached, giving up.');
                        showError('Timeout – try again');
                    }
                } catch (e) {
                    clearInterval(pollInterval);
                    pollInterval = null;
                    isPolling = false;
                    console.error('❌ Polling error:', e.message);
                    showError(`Poll error: ${e.message}`);
                }
            }, 4000);

        } catch (e) {
            console.error('❌ runActor error:', e.message);
            showError(`Error: ${e.message}`);
            isPolling = false;
            if (pollInterval) { clearInterval(pollInterval);
                pollInterval = null; }
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
        const max = getLeadCount();
        const searchQuery = `${job} in ${country}`;
        return {
            "searchQuery": searchQuery,
            "profileScraperMode": "Full",
            "maxItems": max,
            "startPage": 1
        };
    }

    // ===== Expose =====
    window.Outflo = {
        API_TOKEN,
        getLeadCount,
        extractEmail,
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
        prepareLinkedinInput,
        saveToDatabase,
        currentItems,
        emailStats,
        currentPlatform,
        targetCount
    };

    console.log('🚀 Outflo Core Engine loaded - NO EMAIL PREDICTION');
    console.log('📧 Only real emails from Apify will be displayed');
})();