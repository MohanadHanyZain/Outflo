const express = require('express');
const cors = require('cors');
const { ApifyClient } = require('apify-client');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// تهيئة العميل الرسمي لـ Apify
const client = new ApifyClient({
    token: 'apify_api_J3P2YlygNudvv6ZSWNJ8cbLrPrFhxe3p4zIz',
});

// 1. مسار استخراج الشركات من خرائط جوجل
app.post('/api/scrape', async (req, res) => {
    try {
        const { searchQuery } = req.body;
        
        console.log(`بدء عملية البحث عن: ${searchQuery}`);
        
        // تشغيل Google Maps Actor
        const run = await client.actor("compass~crawler-google-places").call({
            "searchStringsArray": [searchQuery],
            "maxCrawledPlacesPerSearch": 10
        });

        // جلب البيانات من الـ Dataset
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        
        // إرجاع البيانات للواجهة
        res.json({ data: items });
    } catch (error) {
        console.error("خطأ في تشغيل الاستخراج:", error);
        res.status(500).json({ error: 'فشل تشغيل محرك البحث' });
    }
});

// 2. مسار إثراء البيانات (استخراج الإيميلات من المواقع المحددة)
app.post('/api/enrich', async (req, res) => {
    try {
        const { websites } = req.body;
        
        // تنظيف الروابط قبل إرسالها للـ Actor
        const validWebsites = websites
            .filter(url => url && typeof url === 'string')
            .map(url => url.startsWith('http') ? url : `http://${url}`);

        if (validWebsites.length === 0) {
            return res.status(400).json({ error: "لا توجد مواقع صالحة للبحث" });
        }

        console.log(`جاري الإثراء لـ ${validWebsites.length} موقع`);
        
        const emailRun = await client.actor("vdrmota/contact-info-scraper").call({
            "startUrls": validWebsites.map(url => ({ url }))
        });

        const { items } = await client.dataset(emailRun.defaultDatasetId).listItems();
        res.json({ data: items });

    } catch (error) {
        // اطبع الخطأ الحقيقي في الـ Terminal لنعرف السبب
        console.error("تفاصيل الخطأ في الـ Actor:", error.message);
        res.status(500).json({ error: 'حدث خطأ أثناء الاتصال بأداة الإيميلات' });
    }
});


// 3. مسار البحث في LinkedIn
app.post('/api/linkedin-search', async (req, res) => {
  try {
    const { jobTitle, location, industry } = req.body;
    console.log(`بدء البحث في LinkedIn عن: ${jobTitle}, ${location}, ${industry}`);

    const run = await client.actor("automations/linkedin-search-export").call({
      "jobTitle": jobTitle,
      "location": location,
      "industry": industry,
      "maxResults": 10
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    res.json({ data: items });
  } catch (error) {
    console.error("خطأ في LinkedIn Search:", error);
    res.status(500).json({ error: 'فشل تشغيل البحث في LinkedIn' });
  }
});

// 4. مسار إثراء LinkedIn (استخراج الإيميلات)
app.post('/api/enrich-linkedin', async (req, res) => {
  try {
    const { profiles } = req.body;
    console.log(`جاري إثراء ${profiles.length} بروفايل LinkedIn`);

    const run = await client.actor("snipercoder/bulk-linkedin-email-finder").call({
      "profiles": profiles.map(p => ({ url: p.linkedinProfile }))
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    res.json({ data: items });
  } catch (error) {
    console.error("خطأ في Enrich LinkedIn:", error);
    res.status(500).json({ error: 'فشل تشغيل إثراء LinkedIn' });
  }
});

// 5. مسار معلومات الشركات من LinkedIn
app.post('/api/company-info', async (req, res) => {
  try {
    const { companyUrls } = req.body;
    console.log(`جاري استخراج معلومات ${companyUrls.length} شركة`);

    const run = await client.actor("automation-lab/linkedin-company-scraper").call({
      "startUrls": companyUrls.map(url => ({ url }))
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    res.json({ data: items });
  } catch (error) {
    console.error("خطأ في Company Info:", error);
    res.status(500).json({ error: 'فشل تشغيل استخراج معلومات الشركات' });
  }
});


const PORT = 3000;
app.listen(PORT, () => console.log(`السيرفر يعمل الآن على http://localhost:${PORT}`));