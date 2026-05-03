// const express = require("express");

// const app = express();
// const PORT = process.env.PORT || 3000;

// app.use(express.static(__dirname));

// app.get("/", (req, res) => {
//     res.sendFile(__dirname + "/index.html");
// });

// function extractFromUrl(finalUrl) {
//     const urlObj = new URL(finalUrl);
//     const rawHash = urlObj.hash ? urlObj.hash.substring(1) : null;

//     if (!rawHash) return null;

//     const parts = rawHash.split("|");

//     return {
//         name: parts[0] ? decodeURIComponent(parts[0]) : null,
//         author: parts[1] ? decodeURIComponent(parts[1]) : null,
//         skinCode: parts.slice(2).join("|") || null,
//         finalUrl
//     };
// }

// function extractRedirect(html) {
//     const patterns = [
//         /window\.location\s*=\s*["']([^"']+)["']/,
//         /window\.location\.href\s*=\s*["']([^"']+)["']/,
//         /location\.href\s*=\s*["']([^"']+)["']/,
//         /location\s*=\s*["']([^"']+)["']/,
//         /window\.location\.replace\(["']([^"']+)["']\)/
//     ];

//     for (const pattern of patterns) {
//         const match = html.match(pattern);
//         if (match) return match[1];
//     }

//     return null;
// }

// function isRealCloudflareBlock(html, status) {
//     const lower = html.toLowerCase();

//     return (
//         status === 403 ||
//         lower.includes("cf-challenge") ||
//         lower.includes("just a moment") ||
//         lower.includes("attention required") ||
//         lower.includes("checking your browser") ||
//         lower.includes("cloudflare ray id")
//     );
// }

// app.get("/api/getSkin", async (req, res) => {
//     const bonkleagueLink = req.query.link;

//     if (!bonkleagueLink) {
//         return res.status(400).json({
//             error: "Link required"
//         });
//     }

//     try {
//         console.log("🚀 Fetching:", bonkleagueLink);

//         const response = await fetch(bonkleagueLink, {
//             headers: {
//                 "User-Agent":
//                     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
//                 "Accept": "text/html,application/xhtml+xml",
//                 "Accept-Language": "en-US,en;q=0.9",
//                 "Connection": "keep-alive"
//             }
//         });

//         console.log("📡 Status:", response.status);

//         const html = await response.text();

//         console.log("📄 HTML length:", html.length);
//         console.log("📄 HTML preview:", html);

//         // IMPORTANT:
//         // BonkLeagues may include normal Cloudflare analytics scripts.
//         // So extract the redirect first before assuming it is blocked.
//         const redirectUrl = extractRedirect(html);

//         if (redirectUrl) {
//             console.log("➡️ Redirect URL:", redirectUrl);

//             const fullUrl = redirectUrl.startsWith("http")
//                 ? redirectUrl
//                 : `https://bonkleagues.io/${redirectUrl}`;

//             console.log("🏁 Full URL:", fullUrl);

//             const data = extractFromUrl(fullUrl);

//             if (!data || !data.skinCode) {
//                 throw new Error("Failed to extract skin data from redirect URL");
//             }

//             console.log("✅ Successfully extracted skin");

//             return res.json(data);
//         }

//         // Only now check for a real Cloudflare block
//         if (isRealCloudflareBlock(html, response.status)) {
//             console.log("🚨 Real Cloudflare block detected");

//             return res.status(403).json({
//                 error: "Blocked by Cloudflare",
//                 hint: "BonkLeagues blocked the request before returning a usable redirect"
//             });
//         }

//         console.log("❌ Could not find redirect. HTML preview:");
//         console.log(html);

//         return res.status(500).json({
//             error: "Failed to extract skin",
//             hint: "Could not find redirect in BonkLeagues HTML"
//         });

//     } catch (err) {
//         console.error("🔥 ERROR:", err);

//         return res.status(500).json({
//             error: "Failed to extract skin",
//             hint: err.message
//         });
//     }
// });

// app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
// });

const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;
const INTERNAL_RENDER_SECRET = process.env.INTERNAL_RENDER_SECRET || "";

const EDITOR_RENDER_URL =
    process.env.EDITOR_RENDER_URL ||
    "https://editor.bonkverse.io/api/render-bundle";

app.use(express.static(__dirname));

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
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

function extractRedirect(html) {
    const patterns = [
        /window\.location\s*=\s*["']([^"']+)["']/,
        /window\.location\.href\s*=\s*["']([^"']+)["']/,
        /location\.href\s*=\s*["']([^"']+)["']/,
        /location\s*=\s*["']([^"']+)["']/,
        /window\.location\.replace\(["']([^"']+)["']\)/
    ];

    for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) return match[1];
    }

    return null;
}

function isRealCloudflareBlock(html, status) {
    const lower = html.toLowerCase();

    return (
        status === 403 ||
        lower.includes("cf-challenge") ||
        lower.includes("just a moment") ||
        lower.includes("attention required") ||
        lower.includes("checking your browser") ||
        lower.includes("cloudflare ray id")
    );
}

async function renderWithEditor(skinCode) {
    console.log("🎯 Calling editor render URL:", EDITOR_RENDER_URL);

    const response = await fetch(EDITOR_RENDER_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "x-internal-render-secret": INTERNAL_RENDER_SECRET
        },
        body: JSON.stringify({ skinCode })
    });

    const contentType = response.headers.get("content-type") || "";
    const rawText = await response.text();

    console.log("🎯 Editor status:", response.status);
    console.log("🎯 Editor content-type:", contentType);
    console.log("🎯 Editor response preview:", rawText.slice(0, 300));

    if (!contentType.includes("application/json")) {
        throw new Error(
            `Editor returned non-JSON from ${EDITOR_RENDER_URL}. Preview: ${rawText.slice(0, 120)}`
        );
    }

    const data = JSON.parse(rawText);

    if (!response.ok || !data.ok) {
        throw new Error(data.hint || data.error || "Editor render failed");
    }

    return {
        svg: data.svg,
        pngBase64: data.pngBase64,
        thumbnailBase64: data.thumbnailBase64
    };
}

app.get("/api/getSkin", async (req, res) => {
    const bonkleagueLink = req.query.link;
    const shouldRender = req.query.render === "true";

    if (!bonkleagueLink) {
        return res.status(400).json({
            error: "Link required"
        });
    }

    try {
        console.log("🚀 Fetching:", bonkleagueLink);

        const response = await fetch(bonkleagueLink, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml",
                "Accept-Language": "en-US,en;q=0.9",
                "Connection": "keep-alive"
            }
        });

        console.log("📡 Status:", response.status);

        const html = await response.text();

        console.log("📄 HTML length:", html.length);
        console.log("📄 HTML preview:", html.slice(0, 1200));

        const redirectUrl = extractRedirect(html);

        if (redirectUrl) {
            console.log("➡️ Redirect URL:", redirectUrl);

            const fullUrl = redirectUrl.startsWith("http")
                ? redirectUrl
                : `https://bonkleagues.io/${redirectUrl}`;

            console.log("🏁 Full URL:", fullUrl);

            const data = extractFromUrl(fullUrl);

            if (!data || !data.skinCode) {
                throw new Error("Failed to extract skin data from redirect URL");
            }

            if (!shouldRender) {
                console.log("✅ Successfully extracted skin");
                return res.json(data);
            }

            try {
                console.log("🎨 Rendering with Bonkverse editor...");
                const rendered = await renderWithEditor(data.skinCode);

                console.log("✅ Successfully extracted and rendered skin");

                return res.json({
                    ...data,
                    rendered
                });
            } catch (renderErr) {
                console.error("⚠️ Render failed, returning skin data only:", renderErr);

                return res.json({
                    ...data,
                    rendered: null,
                    renderError: renderErr.message
                });
            }
        }

        if (isRealCloudflareBlock(html, response.status)) {
            console.log("🚨 Real Cloudflare block detected");

            return res.status(403).json({
                error: "Blocked by Cloudflare",
                hint: "BonkLeagues blocked the request before returning a usable redirect"
            });
        }

        console.log("❌ Could not find redirect. HTML preview:");
        console.log(html);

        return res.status(500).json({
            error: "Failed to extract skin",
            hint: "Could not find redirect in BonkLeagues HTML"
        });

    } catch (err) {
        console.error("🔥 ERROR:", err);

        return res.status(500).json({
            error: "Failed to extract skin",
            hint: err.message
        });
    }
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});