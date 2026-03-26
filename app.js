const express = require('express');
const { chromium } = require('playwright');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.get('/api/getSkin', async (req, res) => {
    const bonkleagueLink = req.query.link;

    if (!bonkleagueLink) {
        return res.status(400).json({ error: 'Link required' });
    }

    let browser;

    try {
        browser = await chromium.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        await page.goto(bonkleagueLink, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        await page.waitForURL(
            url => url.toString().includes('skins.html#'),
            { timeout: 10000 }
        );

        const finalUrl = page.url();
        console.log("Final URL:", finalUrl);

        const urlObj = new URL(finalUrl);

        const hash = urlObj.hash
            ? decodeURIComponent(urlObj.hash.substring(1))
            : null;

        let name = null;
        let author = null;
        let skinCode = null;

        if (hash) {
            const parts = hash.split("|");
            name = parts[0] || null;
            author = parts[1] || null;
            skinCode = parts.slice(2).join("|") || null;
        }

        res.json({
            name,
            author,
            skinCode,
            finalUrl
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to extract skin" });
    } finally {
        if (browser) await browser.close();
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});