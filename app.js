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
        console.log("🚀 Starting fetch for:", bonkleagueLink);

        browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        });

        const context = await browser.newContext();
        const page = await context.newPage();

        // 🔥 LOG EVERYTHING
        page.on('console', msg => console.log('🧠 PAGE LOG:', msg.text()));
        page.on('request', req => console.log('➡️ REQUEST:', req.url()));
        page.on('response', res => console.log('⬅️ RESPONSE:', res.url(), res.status()));
        page.on('pageerror', err => console.log('❌ PAGE ERROR:', err));

        console.log("🌐 Navigating...");

        await page.goto(bonkleagueLink, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        console.log("✅ Initial URL:", page.url());

        // 🔥 CHECK WHAT PAGE LOOKS LIKE
        const content = await page.content();
        console.log("📄 Page length:", content.length);

        // 🔥 TRY WAITING FOR HASH (with logs)
        console.log("⏳ Waiting for hash...");

        try {
            await page.waitForFunction(() => window.location.hash.length > 1, {
                timeout: 15000
            });
        } catch (e) {
            console.log("⚠️ Hash never appeared");
        }

        const finalUrl = page.url();
        console.log("🏁 Final URL:", finalUrl);

        // 🔥 DEBUG HASH DIRECTLY
        const hash = await page.evaluate(() => window.location.hash);
        console.log("🔗 Raw hash:", hash);

        const urlObj = new URL(finalUrl);
        const rawHash = urlObj.hash ? urlObj.hash.substring(1) : null;

        let name = null;
        let author = null;
        let skinCode = null;

        if (rawHash) {
            const parts = rawHash.split("|");

            name = parts[0] ? decodeURIComponent(parts[0]) : null;
            author = parts[1] ? decodeURIComponent(parts[1]) : null;
            skinCode = parts.slice(2).join("|") || null;
        }

        res.json({
            name,
            author,
            skinCode,
            finalUrl,
            debug: {
                finalUrl,
                hash,
                hasHash: !!rawHash
            }
        });

    } catch (err) {
        console.error("🔥 ERROR:", err);
        res.status(500).json({ error: "Failed to extract skin" });
    } finally {
        if (browser) await browser.close();
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});