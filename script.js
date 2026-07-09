const SERVER_URL = 'http://localhost:3000';
const tableBody = document.getElementById('resultsTableBody');
const enrichBtn = document.getElementById('enrichBtn'); 
const searchBtn = document.getElementById('startBtn');

// دالة عرض البيانات في الجدول بعد جلبها من جوجل مابس
function renderTable(data) {
    if (!data || data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="12" class="px-4 py-8 text-center text-gray-400 italic">لا توجد نتائج، جرب كلمة بحث أخرى.</td></tr>`;
        return;
    }
    tableBody.innerHTML = data.map(item => `
        <tr class="hover:bg-gray-50 transition">
            <td class="px-4 py-3">${item.title || item.name || 'غير متوفر'}</td>
            <td class="px-4 py-3">${item.totalScore || 'غير متوفر'}</td>
            <td class="px-4 py-3">${item.reviewsCount || 'غير متوفر'}</td>
            <td class="px-4 py-3">${item.street || 'غير متوفر'}</td>
            <td class="px-4 py-3">${item.city || 'غير متوفر'}</td>
            <td class="px-4 py-3">${item.state || 'غير متوفر'}</td>
            <td class="px-4 py-3">${item.countryCode || 'غير متوفر'}</td>
            <td class="px-4 py-3">${item.website ? `<a href="${item.website}" target="_blank" class="text-blue-500 underline">زيارة</a>` : 'غير متوفر'}</td>
            <td class="px-4 py-3">${item.phone || 'غير متوفر'}</td>
            <td class="px-4 py-3">${item.categories?.join(', ') || 'غير متوفر'}</td>
            <td class="px-4 py-3">${item.categoryName || 'غير متوفر'}</td>
        </tr>
    `).join('');
    
    if(enrichBtn) enrichBtn.disabled = false;
}



// دالة البحث الأساسية (Google Maps)
searchBtn.addEventListener('click', async () => {
    const searchQuery = document.getElementById('searchInput').value;
    updateStatus('جاري البحث في خرائط جوجل...', 'bg-blue-100', 'text-blue-800');

    try {
        const response = await fetch(`${SERVER_URL}/api/scrape`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ searchQuery })
        });

        const result = await response.json();
        renderTable(result.data);
        updateStatus('تم العثور على شركات! اضغط "استخراج الإيميلات" لبدء الإثراء.', 'bg-green-100', 'text-green-800');
    } catch (err) {
        updateStatus('حدث خطأ أثناء البحث', 'bg-red-100', 'text-red-800');
    }
});

// دالة استخراج الإيميلات (Enrichment)
if (enrichBtn) {
    enrichBtn.addEventListener('click', async () => {
        const websiteElements = document.querySelectorAll('.website-link');
        const websites = Array.from(websiteElements)
            .map(el => el.href)
            .filter(url => url && url.startsWith('http'));

        updateStatus('جاري استخراج الإيميلات... انتظر قليلاً', 'bg-purple-100', 'text-purple-800');
        
        try {
            const response = await fetch(`${SERVER_URL}/api/enrich`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ websites })
            });

            const result = await response.json();
            
            // دمج النتائج في الجدول
            if (result.data) {
                result.data.forEach(item => {
                    const domain = new URL(item.url || 'http://example.com').hostname.replace('www.', '');
                    document.querySelectorAll('.website-link').forEach(link => {
                        const linkDomain = new URL(link.href).hostname.replace('www.', '');
                        if (domain === linkDomain) {
                            const row = link.closest('tr');
                            const emailCell = row.querySelector('.email-cell');
                            if (emailCell) {
                                emailCell.textContent = item.emails?.[0]?.email || "لا يوجد إيميل";
                            }
                        }
                    });
                });
                updateStatus('اكتملت العملية بنجاح!', 'bg-green-100', 'text-green-800');
            }
        } catch (err) {
            updateStatus('حدث خطأ أثناء استخراج الإيميلات', 'bg-red-100', 'text-red-800');
        }
    });
}

// دالة تحديث الحالة (Status)
function updateStatus(msg, bgClass, textClass) {
    const statusDiv = document.getElementById('statusMessage');
    if (statusDiv) {
        statusDiv.className = `p-3 rounded ${bgClass} ${textClass}`;
        statusDiv.textContent = msg;
    }
}