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

// 🔥 Robust redirect extractor
function extractRedirect(html) {
    const patterns = [
        /window\.location\s*=\s*["']([^"']+)["']/,
        /window\.location\.href\s*=\s*["']([^"']+)["']/,
        /location\.href\s*=\s*["']([^"']+)["']/,
        /location\s*=\s*["']([^"']+)["']/,
        /window\.location\.replace\(["']([^"']+)["']\)/,
    ];

    for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) return match[1];
    }

    return null;
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
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Accept": "text/html,application/xhtml+xml",
                "Accept-Language": "en-US,en;q=0.9",
                "Connection": "keep-alive"
            }
        });

        console.log("📡 Status:", response.status);

        const html = await response.text();

        console.log("📄 HTML length:", html.length);

        // 🚨 Detect Cloudflare block
        if (
            html.toLowerCase().includes("cloudflare") ||
            html.toLowerCase().includes("not allowed") ||
            response.status === 403
        ) {
            console.log("🚨 Cloudflare detected");

            return res.status(403).json({
                error: "Blocked by Cloudflare",
                hint: "Bonkleagues is blocking this request"
            });
        }

        // 🔥 Extract redirect
        const redirectUrl = extractRedirect(html);

        if (!redirectUrl) {
            console.log("❌ Could not find redirect. HTML preview:");
            console.log(html.slice(0, 1000));

            throw new Error("Could not find redirect in HTML");
        }

        console.log("➡️ Redirect URL:", redirectUrl);

        const fullUrl = redirectUrl.startsWith("http")
            ? redirectUrl
            : `https://bonkleagues.io/${redirectUrl}`;

        console.log("🏁 Full URL:", fullUrl);

        const data = extractFromUrl(fullUrl);

        if (!data) {
            throw new Error("Failed to extract hash from redirect");
        }

        console.log("✅ Successfully extracted skin");

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