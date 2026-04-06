const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

function extractFromUrl(finalUrl) {
    const urlObj = new URL(finalUrl);
    const rawHash = urlObj.hash ? urlObj.hash.substring(1) : null;

    if (!rawHash) return null;

    const parts = rawHash.split("|");

    return {
        name: parts[0] ? decodeURIComponent(parts[0]) : null,
        author: parts[1] ? decodeURIComponent(parts[1]) : null,
        skinCode: parts.slice(2).join("|") || null,
        finalUrl
    };
}

app.get('/api/getSkin', async (req, res) => {
    const bonkleagueLink = req.query.link;

    if (!bonkleagueLink) {
        return res.status(400).json({ error: 'Link required' });
    }

    try {
        console.log("🚀 Fetching:", bonkleagueLink);

        const response = await fetch(bonkleagueLink, {
            headers: {
                "User-Agent": "Mozilla/5.0"
            }
        });

        const html = await response.text();

        console.log("📄 HTML length:", html.length);

        // 🔥 Extract redirect from JS
        const match = html.match(/window\.location\s*=\s*["']([^"']+)["']/);

        if (!match) {
            throw new Error("Could not find redirect in HTML");
        }

        const redirectUrl = match[1];
        console.log("➡️ Redirect URL:", redirectUrl);

        const fullUrl = `https://bonkleagues.io/${redirectUrl}`;
        console.log("🏁 Full URL:", fullUrl);

        const data = extractFromUrl(fullUrl);

        if (!data) {
            throw new Error("Failed to extract hash from redirect");
        }

        return res.json(data);

    } catch (err) {
        console.error("🔥 ERROR:", err);
        return res.status(500).json({
            error: "Failed to extract skin",
            hint: err.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});