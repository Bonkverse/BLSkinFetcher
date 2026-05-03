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
const fs = require("fs/promises");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const EDITOR_RENDER_BUNDLE_URL =
    process.env.EDITOR_RENDER_BUNDLE_URL ||
    "https://editor.bonkverse.io/api/render-bundle";

const TEMP_DIR = path.join(__dirname, "temp");

app.use(express.static(__dirname));
app.use("/temp", express.static(TEMP_DIR));
app.use(express.json({ limit: "10mb" }));

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

async function fetchSkinDataFromBonkLeagues(bonkleagueLink) {
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

        console.log("✅ Successfully extracted skin");
        return data;
    }

    if (isRealCloudflareBlock(html, response.status)) {
        const err = new Error("BonkLeagues blocked the request before returning a usable redirect");
        err.statusCode = 403;
        err.error = "Blocked by Cloudflare";
        throw err;
    }

    throw new Error("Could not find redirect in BonkLeagues HTML");
}

async function getMediaForSkinCode(skinCode) {
    console.log("🎨 Calling skin editor render-bundle:", EDITOR_RENDER_BUNDLE_URL);

    const response = await fetch(EDITOR_RENDER_BUNDLE_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({ skinCode })
    });

    const contentType = response.headers.get("content-type") || "";
    const rawText = await response.text();

    console.log("🎯 Editor status:", response.status);
    console.log("🎯 Editor content-type:", contentType);
    console.log("🎯 Editor preview:", rawText.slice(0, 300));

    if (!contentType.includes("application/json")) {
        throw new Error(
            `Skin editor returned non-JSON response from ${EDITOR_RENDER_BUNDLE_URL}`
        );
    }

    const data = JSON.parse(rawText);

    if (!response.ok || !data.ok) {
        throw new Error(data.hint || data.error || "Skin editor render failed");
    }

    if (!data.svg || !data.pngBase64) {
        throw new Error("Render response missing svg or pngBase64");
    }

    return {
        svg: data.svg,
        pngBase64: data.pngBase64,
        thumbnailBase64: data.thumbnailBase64 || null
    };
}

async function saveMediaToTemp(media) {
    await fs.mkdir(TEMP_DIR, { recursive: true });

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const svgFilename = `${id}.svg`;
    const pngFilename = `${id}.png`;
    const thumbFilename = `${id}_thumb.png`;

    const svgPath = path.join(TEMP_DIR, svgFilename);
    const pngPath = path.join(TEMP_DIR, pngFilename);
    const thumbPath = path.join(TEMP_DIR, thumbFilename);

    await fs.writeFile(svgPath, media.svg, "utf8");
    await fs.writeFile(pngPath, Buffer.from(media.pngBase64, "base64"));

    let thumbnailUrl = null;

    if (media.thumbnailBase64) {
        await fs.writeFile(thumbPath, Buffer.from(media.thumbnailBase64, "base64"));
        thumbnailUrl = `/temp/${thumbFilename}`;
    }

    return {
        svgUrl: `/temp/${svgFilename}`,
        pngUrl: `/temp/${pngFilename}`,
        thumbnailUrl
    };
}

app.get("/api/getSkin", async (req, res) => {
    const bonkleagueLink = req.query.link;
    const includeMedia = req.query.media === "true";

    if (!bonkleagueLink) {
        return res.status(400).json({
            error: "Link required"
        });
    }

    try {
        const data = await fetchSkinDataFromBonkLeagues(bonkleagueLink);

        if (!includeMedia) {
            return res.json(data);
        }

        const media = await getMediaForSkinCode(data.skinCode);
        const tempFiles = await saveMediaToTemp(media);

        return res.json({
            ...data,
            media: {
                ...media,
                ...tempFiles
            }
        });
    } catch (err) {
        console.error("🔥 ERROR:", err);

        return res.status(err.statusCode || 500).json({
            error: err.error || "Failed to extract skin",
            hint: err.message
        });
    }
});

app.post("/api/get-media", async (req, res) => {
    try {
        const { skinCode } = req.body;

        if (!skinCode) {
            return res.status(400).json({
                ok: false,
                error: "missing_skin_code"
            });
        }

        const media = await getMediaForSkinCode(skinCode);
        const tempFiles = await saveMediaToTemp(media);

        return res.json({
            ok: true,
            ...tempFiles,
            svg: media.svg,
            pngBase64: media.pngBase64,
            thumbnailBase64: media.thumbnailBase64
        });
    } catch (err) {
        console.error("🔥 ERROR in /api/get-media:", err);

        return res.status(500).json({
            ok: false,
            error: "failed_to_get_media",
            hint: err.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});