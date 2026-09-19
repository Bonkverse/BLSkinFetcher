// const express = require("express");
// const fs = require("fs/promises");
// const path = require("path");

// const app = express();
// const PORT = process.env.PORT || 3000;

// const EDITOR_RENDER_BUNDLE_URL =
//     process.env.EDITOR_RENDER_BUNDLE_URL ||
//     "https://editor.bonkverse.io/api/render-bundle";

// const TEMP_DIR = path.join(__dirname, "temp");

// app.use(express.static(__dirname));
// app.use("/temp", express.static(TEMP_DIR));
// app.use(express.json({ limit: "10mb" }));

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

// async function fetchSkinDataFromBonkLeagues(bonkleagueLink) {
//     console.log("🚀 Fetching:", bonkleagueLink);

//     const response = await fetch(bonkleagueLink, {
//         headers: {
//             "User-Agent":
//                 "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
//             "Accept": "text/html,application/xhtml+xml",
//             "Accept-Language": "en-US,en;q=0.9",
//             "Connection": "keep-alive"
//         }
//     });

//     console.log("📡 Status:", response.status);

//     const html = await response.text();

//     console.log("📄 HTML length:", html.length);
//     console.log("📄 HTML preview:", html.slice(0, 1200));

//     const redirectUrl = extractRedirect(html);

//     if (redirectUrl) {
//         console.log("➡️ Redirect URL:", redirectUrl);

//         const fullUrl = redirectUrl.startsWith("http")
//             ? redirectUrl
//             : `https://bonkleagues.io/${redirectUrl}`;

//         console.log("🏁 Full URL:", fullUrl);

//         const data = extractFromUrl(fullUrl);

//         if (!data || !data.skinCode) {
//             throw new Error("Failed to extract skin data from redirect URL");
//         }

//         console.log("✅ Successfully extracted skin");
//         return data;
//     }

//     if (isRealCloudflareBlock(html, response.status)) {
//         const err = new Error("BonkLeagues blocked the request before returning a usable redirect");
//         err.statusCode = 403;
//         err.error = "Blocked by Cloudflare";
//         throw err;
//     }

//     throw new Error("Could not find redirect in BonkLeagues HTML");
// }

// async function getMediaForSkinCode(skinCode) {
//     console.log("🎨 Calling skin editor render-bundle:", EDITOR_RENDER_BUNDLE_URL);

//     const response = await fetch(EDITOR_RENDER_BUNDLE_URL, {
//         method: "POST",
//         headers: {
//             "Content-Type": "application/json",
//             "Accept": "application/json"
//         },
//         body: JSON.stringify({ skinCode })
//     });

//     const contentType = response.headers.get("content-type") || "";
//     const rawText = await response.text();

//     console.log("🎯 Editor status:", response.status);
//     console.log("🎯 Editor content-type:", contentType);
//     console.log("🎯 Editor preview:", rawText.slice(0, 300));

//     if (!contentType.includes("application/json")) {
//         throw new Error(
//             `Skin editor returned non-JSON response from ${EDITOR_RENDER_BUNDLE_URL}`
//         );
//     }

//     const data = JSON.parse(rawText);

//     if (!response.ok || !data.ok) {
//         throw new Error(data.hint || data.error || "Skin editor render failed");
//     }

//     if (!data.svg || !data.pngBase64) {
//         throw new Error("Render response missing svg or pngBase64");
//     }

//     return {
//         svg: data.svg,
//         pngBase64: data.pngBase64,
//         thumbnailBase64: data.thumbnailBase64 || null
//     };
// }

// async function saveMediaToTemp(media) {
//     await fs.mkdir(TEMP_DIR, { recursive: true });

//     const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

//     const svgFilename = `${id}.svg`;
//     const pngFilename = `${id}.png`;
//     const thumbFilename = `${id}_thumb.png`;

//     const svgPath = path.join(TEMP_DIR, svgFilename);
//     const pngPath = path.join(TEMP_DIR, pngFilename);
//     const thumbPath = path.join(TEMP_DIR, thumbFilename);

//     await fs.writeFile(svgPath, media.svg, "utf8");
//     await fs.writeFile(pngPath, Buffer.from(media.pngBase64, "base64"));

//     let thumbnailUrl = null;

//     if (media.thumbnailBase64) {
//         await fs.writeFile(thumbPath, Buffer.from(media.thumbnailBase64, "base64"));
//         thumbnailUrl = `/temp/${thumbFilename}`;
//     }

//     return {
//         svgUrl: `/temp/${svgFilename}`,
//         pngUrl: `/temp/${pngFilename}`,
//         thumbnailUrl
//     };
// }

// app.get("/api/getSkin", async (req, res) => {
//     const bonkleagueLink = req.query.link;
//     const includeMedia = req.query.media === "true";

//     if (!bonkleagueLink) {
//         return res.status(400).json({
//             error: "Link required"
//         });
//     }

//     try {
//         const data = await fetchSkinDataFromBonkLeagues(bonkleagueLink);

//         if (!includeMedia) {
//             return res.json(data);
//         }

//         const media = await getMediaForSkinCode(data.skinCode);
//         const tempFiles = await saveMediaToTemp(media);

//         return res.json({
//             ...data,
//             media: {
//                 ...media,
//                 ...tempFiles
//             }
//         });
//     } catch (err) {
//         console.error("🔥 ERROR:", err);

//         return res.status(err.statusCode || 500).json({
//             error: err.error || "Failed to extract skin",
//             hint: err.message
//         });
//     }
// });

// app.post("/api/get-media", async (req, res) => {
//     try {
//         const { skinCode } = req.body;

//         if (!skinCode) {
//             return res.status(400).json({
//                 ok: false,
//                 error: "missing_skin_code"
//             });
//         }

//         const media = await getMediaForSkinCode(skinCode);
//         const tempFiles = await saveMediaToTemp(media);

//         return res.json({
//             ok: true,
//             ...tempFiles,
//             svg: media.svg,
//             pngBase64: media.pngBase64,
//             thumbnailBase64: media.thumbnailBase64
//         });
//     } catch (err) {
//         console.error("🔥 ERROR in /api/get-media:", err);

//         return res.status(500).json({
//             ok: false,
//             error: "failed_to_get_media",
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

const ALLOWED_HOSTS = new Set(["bonkleagues.io", "www.bonkleagues.io"]);

const CACHE_TTL_MS = 10 * 60 * 1000;        // successful lookups
const BLOCK_COOLDOWN_MS = 30 * 1000;        // after a Cloudflare block, don't hammer

const skinCache = new Map();      // link -> { data, expires }
const blockCache = new Map();     // link -> { error, expires }
const inFlight = new Map();       // link -> Promise

app.use(express.static(__dirname));
app.use("/temp", express.static(TEMP_DIR));
app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

function decodeHtmlEntities(str) {
    if (!str) return str;

    return str
        .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&");
}

function safeDecode(str) {
    try {
        return decodeURIComponent(str);
    } catch {
        return str;
    }
}

// Validates and normalizes the user-supplied link. Throws a 400-style error if bad.
function normalizeBonkLeaguesLink(input) {
    let url;

    try {
        url = new URL(String(input).trim());
    } catch {
        const err = new Error("That doesn't look like a valid URL. Paste a full BonkLeagues link.");
        err.statusCode = 400;
        err.error = "Invalid link";
        throw err;
    }

    if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname)) {
        const err = new Error("Only https://bonkleagues.io links are supported.");
        err.statusCode = 400;
        err.error = "Invalid link";
        throw err;
    }

    return url.toString();
}

function getMetaContent(html, property) {
    // Handles either attribute order: property before content, or content before property
    const patterns = [
        new RegExp(
            `<meta[^>]*?property=["']${property}["'][^>]*?content=["']([^"']*)["']`,
            "i"
        ),
        new RegExp(
            `<meta[^>]*?content=["']([^"']*)["'][^>]*?property=["']${property}["']`,
            "i"
        )
    ];

    for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) return decodeHtmlEntities(match[1]);
    }

    return null;
}

function getTitle(html) {
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return match ? decodeHtmlEntities(match[1]).trim() : null;
}

// Title format: 'Skin Name' by author name
function parseTitle(title) {
    if (!title) return { name: null, author: null };

    const idx = title.lastIndexOf(" by ");

    if (idx === -1) {
        return { name: title.replace(/^['"]|['"]$/g, ""), author: null };
    }

    const name = title.slice(0, idx).trim().replace(/^['"]|['"]$/g, "");
    const author = title.slice(idx + 4).trim();

    return { name: name || null, author: author || null };
}

// Primary method: BonkLeagues embeds the skin code in the og:image URL
function extractFromMetadata(html, pageUrl) {
    const ogImage = getMetaContent(html, "og:image");
    if (!ogImage) return null;

    let skinCode = null;

    try {
        const imgUrl = new URL(ogImage, "https://bonkleagues.io");
        // searchParams automatically decodes %2B -> +, %2F -> /, etc.
        skinCode = imgUrl.searchParams.get("skinCode");
    } catch (err) {
        console.log("⚠️ Could not parse og:image URL:", err.message);
        return null;
    }

    if (!skinCode) return null;

    const { name, author } = parseTitle(getTitle(html));
    const finalUrl = getMetaContent(html, "og:url") || pageUrl;

    return { name, author, skinCode, finalUrl };
}

// Fallback method: URL like skins.html#Name%7CAuthor%7CSkinCode
// The hash is percent-encoded (including the | separators), so decode BEFORE splitting.
function extractFromUrl(finalUrl) {
    const urlObj = new URL(finalUrl);
    const rawHash = urlObj.hash ? urlObj.hash.substring(1) : null;

    if (!rawHash) return null;

    const decodedHash = safeDecode(rawHash);
    const parts = decodedHash.split("|");

    return {
        name: parts[0] || null,
        author: parts[1] || null,
        skinCode: parts.slice(2).join("|") || null,
        finalUrl
    };
}

function extractRedirect(html) {
    const patterns = [
        /window\.location\s*=\s*["'`]([^"'`]+)["'`]/,
        /window\.location\.href\s*=\s*["'`]([^"'`]+)["'`]/,
        /location\.href\s*=\s*["'`]([^"'`]+)["'`]/,
        /location\s*=\s*["'`]([^"'`]+)["'`]/,
        /window\.location\.replace\(["'`]([^"'`]+)["'`]\)/,
        /window\.location\.assign\(["'`]([^"'`]+)["'`]\)/
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

// Pulls the useful bits out of a Cloudflare block page so we can tell WHY we were blocked
function describeCloudflareBlock(html, headers) {
    const code =
        html.match(/Error code\s*(\d{3,4})/i)?.[1] ||
        html.match(/cf-error-code[^>]*>\s*(\d{3,4})/i)?.[1] ||
        null;

    const ray =
        headers.get("cf-ray") ||
        html.match(/Ray ID:\s*(?:<[^>]+>)?\s*([a-f0-9]{8,})/i)?.[1] ||
        null;

    const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 600);

    return { code, ray, text };
}

async function fetchSkinDataFromBonkLeagues(bonkleagueLink) {
    console.log("🚀 Fetching:", bonkleagueLink);

    const response = await fetch(bonkleagueLink, {
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept":
                "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "no-cache",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1"
        }
    });

    console.log("📡 Status:", response.status);

    const html = await response.text();

    console.log("📄 HTML length:", html.length);

    if (isRealCloudflareBlock(html, response.status)) {
        const info = describeCloudflareBlock(html, response.headers);

        console.log("🚨 Cloudflare block:", {
            status: response.status,
            errorCode: info.code,
            rayId: info.ray,
            cfMitigated: response.headers.get("cf-mitigated"),
            text: info.text
        });

        // Only treat as a block if we did NOT get usable data. A 200 page can
        // legitimately mention Cloudflare analytics, so check for data first.
        if (response.status === 403 || !html.includes("og:image")) {
            const err = new Error(
                `BonkLeagues blocked the request${info.code ? ` (Cloudflare error ${info.code})` : ""}. Try again in a minute.`
            );
            err.statusCode = 403;
            err.error = "Blocked by Cloudflare";
            throw err;
        }
    }

    console.log("📄 HTML preview:", html.slice(0, 500));

    // 1) Primary: metadata (og:image contains the skinCode, title has name/author)
    const metaData = extractFromMetadata(html, bonkleagueLink);

    if (metaData) {
        console.log("✅ Successfully extracted skin from metadata");
        return metaData;
    }

    // 2) Fallback: JS redirect with #name|author|skinCode in the hash
    const redirectUrl = extractRedirect(html);

    if (redirectUrl) {
        console.log("➡️ Redirect URL:", redirectUrl);

        const fullUrl = new URL(redirectUrl, "https://bonkleagues.io/").toString();

        console.log("🏁 Full URL:", fullUrl);

        const data = extractFromUrl(fullUrl);

        if (!data || !data.skinCode) {
            throw new Error("Failed to extract skin data from redirect URL");
        }

        console.log("✅ Successfully extracted skin from redirect");
        return data;
    }

    throw new Error("Could not find skin code in BonkLeagues HTML (no og:image skinCode or redirect)");
}

// Wraps the fetch with a cache, a short cooldown after blocks, and in-flight dedupe
// so duplicate requests (retries, double clicks) only hit BonkLeagues once.
async function getSkinData(rawLink) {
    const link = normalizeBonkLeaguesLink(rawLink);
    const now = Date.now();

    const cached = skinCache.get(link);
    if (cached && cached.expires > now) {
        console.log("💾 Cache hit:", link);
        return cached.data;
    }

    const blocked = blockCache.get(link);
    if (blocked && blocked.expires > now) {
        console.log("⏸️ Skipping fetch, in block cooldown:", link);
        throw blocked.error;
    }

    if (inFlight.has(link)) {
        console.log("🔁 Joining in-flight request:", link);
        return inFlight.get(link);
    }

    const promise = (async () => {
        try {
            const data = await fetchSkinDataFromBonkLeagues(link);
            skinCache.set(link, { data, expires: Date.now() + CACHE_TTL_MS });
            return data;
        } catch (err) {
            if (err.statusCode === 403) {
                blockCache.set(link, { error: err, expires: Date.now() + BLOCK_COOLDOWN_MS });
            }
            throw err;
        } finally {
            inFlight.delete(link);
        }
    })();

    inFlight.set(link, promise);
    return promise;
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
        const data = await getSkinData(bonkleagueLink);

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
        console.error("🔥 ERROR:", err.message);

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