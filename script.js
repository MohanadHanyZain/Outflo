// --- 1. إعدادات المنصة ومفاتيح الربط ---
const API_TOKEN = 'apify_api_J3P2YlygNudvv6ZSWNJ8cbLrPrFhxe3p4zIz';
const ACTOR_ID = 'compass/crawler-google-places';

// --- 2. جلب عناصر الواجهة ---
const startBtn = document.getElementById('startScrapingBtn');
const exportBtn = document.getElementById('exportCsvBtn');
const requestStatus = document.getElementById('requestStatus');
const scrapedCountEl = document.getElementById('scrapedCount');
const cleanCountEl = document.getElementById('cleanCount');
const tableBody = document.getElementById('resultsTableBody');

let finalCleanedData = [];

// --- 3. حدث الضغط على زر بدء الاستخراج ---
startBtn.addEventListener('click', async () => {
    const industry = document.getElementById('industryInput').value.trim();
    const location = document.getElementById('locationInput').value.trim();

    if (!industry || !location) {
        alert('الرجاء إدخال النيش والموقع الجغرافي أولاً!');
        return;
    }

    const searchQuery = `${industry} in ${location}`;

    try {
        updateStatus('جاري التشغيل...', 'bg-yellow-100', 'text-yellow-800');
        startBtn.disabled = true;
        exportBtn.disabled = true;
        tableBody.innerHTML = `<tr><td colspan="4" class="px-4 py-8 text-center text-gray-500 animate-pulse">جاري تشغيل محرك الاستخراج في Apify...</td></tr>`;

        // تشغيل الأداة
        const response = await fetch(`https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${API_TOKEN}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                searchStrings: [searchQuery],
                maxResults: 10,
                extractEmails: true
            })
        });

        const runData = await response.json();
        monitorExecution(runData.data.id, runData.data.defaultDatasetId);

    } catch (error) {
        updateStatus('خطأ في العملية', 'bg-red-100', 'text-red-800');
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-red-500">حدث خطأ: ${error.message}</td></tr>`;
        startBtn.disabled = false;
    }
});

// --- 4. دالة مراقبة الحالة ---
async function monitorExecution(runId, datasetId) {
    const checkUrl = `https://api.apify.com/v2/acts/${ACTOR_ID}/runs/${runId}?token=${API_TOKEN}`;
    
    const interval = setInterval(async () => {
        const response = await fetch(checkUrl);
        const result = await response.json();
        const status = result.data.status;

        if (status === 'SUCCEEDED') {
            clearInterval(interval);
            fetchAndCleanData(datasetId);
        } else if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
            clearInterval(interval);
            updateStatus('فشلت المهمة', 'bg-red-100', 'text-red-800');
            startBtn.disabled = false;
        }
    }, 5000);
}

// --- 5. معالجة البيانات ---
async function fetchAndCleanData(datasetId) {
    try {
        const response = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${API_TOKEN}`);
        const rawData = await response.json();

        scrapedCountEl.textContent = rawData.length;
        const seenEmails = new Set();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const filterGeneric = document.getElementById('filterGenericEmails').checked;

        finalCleanedData = rawData.map(item => ({
            name: item.title || item.name || 'غير متوفر',
            email: (item.emails?.[0] || item.email || '').trim().toLowerCase(),
            phone: item.phone || item.internationalPhone || 'غير متوفر',
            website: item.website || 'غير متوفر'
        })).filter(item => {
            if (!item.email || !emailRegex.test(item.email) || seenEmails.has(item.email)) return false;
            if (filterGeneric && ['info@', 'support@', 'admin@', 'office@', 'contact@'].some(w => item.email.startsWith(w))) return false;
            seenEmails.add(item.email);
            return true;
        });

        cleanCountEl.textContent = finalCleanedData.length;
        renderTable(finalCleanedData);
        updateStatus('اكتمل بنجاح', 'bg-green-100', 'text-green-800');
        exportBtn.disabled = false;
    } catch (e) {
        updateStatus('خطأ في المعالجة', 'bg-red-100', 'text-red-800');
    } finally {
        startBtn.disabled = false;
    }
}

// --- 6. دالة بناء الجدول وتصدير CSV (باقي الدوال كما هي مع تصحيح الـ Syntax) ---
function renderTable(data) {
    tableBody.innerHTML = data.map(item => `
        <tr class="hover:bg-gray-50">
            <td class="px-4 py-3">${item.name}</td>
            <td class="px-4 py-3 text-indigo-600">${item.email}</td>
            <td class="px-4 py-3">${item.phone}</td>
            <td class="px-4 py-3"><a href="${item.website}" target="_blank">رابط</a></td>
        </tr>`).join('');
}

function updateStatus(text, bg, color) {
    requestStatus.textContent = text;
    requestStatus.className = `inline-block px-3 py-1 rounded-full ${bg} ${color}`;
}

exportBtn.addEventListener('click', () => {
    let csv = "\uFEFFالاسم,البريد,الهاتف,الموقع\n" + finalCleanedData.map(i => `"${i.name}","${i.email}","${i.phone}","${i.website}"`).join("\n");
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads.csv";
    a.click();
});