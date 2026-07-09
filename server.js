const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// تنبيه أمني: يفضل دائماً نقل المفاتيح السرية إلى ملف .env
const API_TOKEN = process.env.API_TOKEN || 'apify_api_J3P2YlygNudvv6ZSWNJ8cbLrPrFhxe3p4zIz';
const ACTOR_ID = 'compass/crawler-google-places';

// 1. رابط تشغيل الاستخراج
app.post('/api/scrape', async (req, res) => {
    try {
        const { searchQuery } = req.body;
        const runUrl = `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${API_TOKEN}`;

        const runPayload = {
            "searchStrings": [searchQuery],
            "maxResults": 10,
            "extractEmails": true
        };

        const response = await axios.post(runUrl, runPayload);
        res.json({
            runId: response.data.data.id,
            datasetId: response.data.data.defaultDatasetId
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'فشل السيرفر في تشغيل Apify' });
    }
});

// 2. رابط مراقبة حالة الطلب وجلب النتائج
app.get('/api/status/:runId/:datasetId', async (req, res) => {
    try {
        const { runId, datasetId } = req.params;

        // فحص الحالة
        const checkUrl = `https://api.apify.com/v2/acts/${ACTOR_ID}/runs/${runId}?token=${API_TOKEN}`;
        const checkResponse = await axios.get(checkUrl);
        const status = checkResponse.data.data.status;

        if (status === 'SUCCEEDED') {
            // جلب البيانات فوراً إذا اكتملت
            const datasetUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${API_TOKEN}`;
            const datasetResponse = await axios.get(datasetUrl);
            return res.json({ status, data: datasetResponse.data });
        }

        res.json({ status });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'خطأ في جلب حالة البيانات' });
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`السيرفر الآمن يعمل الآن على الرابط: http://localhost:${PORT}`));