const SERVER_URL = 'http://localhost:3000';
const searchBtn = document.getElementById('searchBtn');
const tableBody = document.getElementById('linkedinTableBody');
const statusDiv = document.getElementById('statusMessage');

// تحديث الحالة
function updateStatus(msg, bgClass, textClass) {
  statusDiv.className = `p-3 rounded ${bgClass} ${textClass}`;
  statusDiv.textContent = msg;
}

// عرض النتائج في الجدول
function renderLinkedInTable(data) {
  if (!data || data.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" class="px-4 py-8 text-center text-gray-400 italic">لا توجد نتائج.</td></tr>`;
    return;
  }
  tableBody.innerHTML = data.map(item => `
    <tr class="hover:bg-gray-50 transition">
      <td class="px-4 py-3">${item.name || 'غير متوفر'}</td>
      <td class="px-4 py-3">${item.title || 'غير متوفر'}</td>
      <td class="px-4 py-3">${item.company || 'غير متوفر'}</td>
      <td class="px-4 py-3">${item.email || 'غير متوفر'}</td>
      <td class="px-4 py-3 text-blue-500 underline">
        ${item.linkedinProfile ? `<a href="${item.linkedinProfile}" target="_blank">زيارة</a>` : 'غير متوفر'}
      </td>
    </tr>
  `).join('');
}

// البحث في LinkedIn
async function searchLinkedIn() {
  const jobTitle = document.getElementById('jobTitle').value;
  const location = document.getElementById('location').value;
  const industry = document.getElementById('industry').value;

  updateStatus('جاري البحث في LinkedIn...', 'bg-blue-100', 'text-blue-800');

  try {
    const response = await fetch(`${SERVER_URL}/api/linkedin-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobTitle, location, industry })
    });

    const result = await response.json();
    renderLinkedInTable(result.data);

    updateStatus('تم العثور على نتائج! جاري الإثراء...', 'bg-green-100', 'text-green-800');

    // إثراء البيانات (استخراج الإيميلات)
    const enrichResponse = await fetch(`${SERVER_URL}/api/enrich-linkedin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profiles: result.data })
    });

    const enrichResult = await enrichResponse.json();
    renderLinkedInTable(enrichResult.data);

    updateStatus('اكتملت العملية بنجاح!', 'bg-green-100', 'text-green-800');
  } catch (err) {
    updateStatus('حدث خطأ أثناء البحث', 'bg-red-100', 'text-red-800');
  }
}

searchBtn.addEventListener('click', searchLinkedIn);
