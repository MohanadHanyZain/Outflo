const startBtn = document.getElementById('startScrapingBtn');
const exportBtn = document.getElementById('exportCsvBtn');
const requestStatus = document.getElementById('requestStatus');
const scrapedCountEl = document.getElementById('scrapedCount');
const cleanCountEl = document.getElementById('cleanCount');
const tableBody = document.getElementById('resultsTableBody');

let finalCleanedData = [];
const SERVER_URL = 'http://localhost:3000';

startBtn.addEventListener('click', async () => {
    const industry = document.getElementById('industryInput').value.trim();
    const location = document.getElementById('locationInput').value.trim();

    if (!industry || !location) {
        alert('الرجاء إدخال النيش والموقع الجغرافي أولاً!');
        return;
    }

    const searchQuery = `${industry} in ${location}`;

    try {
        updateStatus('جاري التشغيل عبر السيرفر...', 'bg-yellow-100', 'text-yellow-800');
        startBtn.disabled = true;
        exportBtn.disabled = true;
        tableBody.innerHTML = `<tr><td colspan="4" class="px-4 py-8 text-center text-gray-500 animate-pulse">جاري إرسال الطلب للسيرفر لتشغيل محرك الاستخراج...</td></tr>`;
        
        const response = await fetch(`${SERVER_URL}/api/scrape`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ searchQuery })
        });

        if (!response.ok) throw new Error('فشل السيرفر في معالجة طلب الاستخراج');
        const data = await response.json();

        monitorExecution(data.runId, data.datasetId);
    } catch (error) {
        console.error(error);
        updateStatus('خطأ في العملية', 'bg-red-100', 'text-red-800');
        tableBody.innerHTML = `<tr><td colspan="4" class="px-4 py-8 text-center text-red-500 font-medium">حدث خطأ: ${error.message}</td></tr>`;
        startBtn.disabled = false;
    }
});

async function monitorExecution(runId, datasetId) {
    const interval = setInterval(async () => {
        try {
            const response = await fetch(`${SERVER_URL}/api/status/${runId}/${datasetId}`);
            const result = await response.json();
            
            if (result.status === 'SUCCEEDED') {
                clearInterval(interval);
                updateStatus('جاري تصفية وتنظيف البيانات...', 'bg-blue-100', 'text-blue-800');
                processCleanedData(result.data);
            } else if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(result.status)) {
                clearInterval(interval);
                throw new Error(`فشلت المهمة داخل السحاب بحالة: ${result.status}`);
            }
        } catch (error) {
            clearInterval(interval);
            updateStatus('خطأ أثناء المراقبة', 'bg-red-100', 'text-red-800');
            startBtn.disabled = false;
        }
    }, 5000);
}

function processCleanedData(rawData) {
    scrapedCountEl.textContent = rawData.length;
    const seenEmails = new Set();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const filterGeneric = document.getElementById('filterGenericEmails').checked;

    finalCleanedData = rawData.map(item => {
        let email = '';
        if (item.emails && item.emails.length > 0) email = item.emails[0];
        else if (item.email) email = item.email;

        return {
            name: item.title || item.name || 'غير متوفر',
            email: email ? email.trim().toLowerCase() : '',
            phone: item.phone || item.internationalPhone || 'غير متوفر',
            website: item.website || 'غير متوفر'
        };
    }).filter(item => {
        if (!item.email || !emailRegex.test(item.email)) return false;
        if (seenEmails.has(item.email)) return false;
        seenEmails.add(item.email);

        if (filterGeneric) {
            const genericWords = ['info@', 'support@', 'admin@', 'office@', 'contact@'];
            if (genericWords.some(word => item.email.startsWith(word))) return false;
        }
        return true;
    });

    cleanCountEl.textContent = finalCleanedData.length;
    renderTable(finalCleanedData);
    updateStatus('اكتمل بنجاح النظافة المطلقة!', 'bg-green-100', 'text-green-800');
    if (finalCleanedData.length > 0) exportBtn.disabled = false;
    startBtn.disabled = false;
}

function renderTable(data) {
    if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="px-4 py-8 text-center text-gray-400 italic">اكتملت العملية، ولكن تم تنظيف القائمة بالكامل.</td></tr>`;
        return;
    }
    tableBody.innerHTML = data.map(item => `
        <tr class="hover:bg-gray-50 transition">
            <td class="px-4 py-3 font-medium text-gray-900">${item.name}</td>
            <td class="px-4 py-3 text-indigo-600 font-mono">${item.email}</td>
            <td class="px-4 py-3 text-gray-600 font-mono">${item.phone}</td>
            <td class="px-4 py-3 text-blue-500 underline"><a href="${item.website}" target="_blank">زيارة الموقع</a></td>
        </tr>
    `).join('');
}

function updateStatus(text, bgColor, textColor) {
    requestStatus.textContent = text;
    requestStatus.className = `inline-block mt-1 px-3 py-1 text-xs font-semibold rounded-full ${bgColor} ${textColor}`;
}

document.getElementById('exportCsvBtn').addEventListener('click', () => {
    if (finalCleanedData.length === 0) return;
    let csvContent = "\uFEFF" + "الاسم,البريد الإلكتروني,الهاتف,الموقع الإلكتروني\n";
    finalCleanedData.forEach(item => {
        csvContent += `"${item.name.replace(/"/g, '""')}","${item.email}","${item.phone}","${item.website}"\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "cleaned_leads.csv");
    link.click();
});