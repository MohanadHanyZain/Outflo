const express = require('express');
const cors = require('cors');
const { ApifyClient } = require('apify-client');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new ApifyClient({
    token: 'apify_api_J3P2YlygNudvv6ZSWNJ8cbLrPrFhxe3p4zIz',
});

app.post('/api/scrape', async (req, res) => {
    try {
        const { searchQuery } = req.body;
        
        // تشغيل Google Maps فقط (المرحلة الأولى)
        const run = await client.actor("compass~crawler-google-places").call({
            "searchStringsArray": [searchQuery],
            "maxCrawledPlacesPerSearch": 10
        });

        // نرسل الـ runId فقط للمتصفح، المتصفح هو من سينتظر
        res.json({ runId: run.id, datasetId: run.defaultDatasetId });
    } catch (error) {
        console.error("خطأ:", error);
        res.status(500).json({ error: 'فشل تشغيل محرك البحث' });
    }
});

app.get('/api/status/:runId', async (req, res) => {
    try {
        const { runId } = req.params;
        const run = await client.run(runId).get();
        
        if (run.status === 'SUCCEEDED') {
            const { items } = await client.dataset(run.defaultDatasetId).listItems();
            return res.json({ status: 'SUCCEEDED', data: items });
        }
        res.json({ status: run.status });
    } catch (error) {
        res.status(500).json({ error: 'فشل جلب البيانات' });
    }
});




app.listen(3000, () => console.log('السيرفر يعمل الآن وجاهز للاستخراج'));

