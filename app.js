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

// server.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import { encodeSkin } from "./src/utils/encodeSkin.js";
import process from "process";

import { Buffer } from "buffer";
import sharp from "sharp";
import { decodeSkinCode } from "./decodeSkin.js";
import { renderSkinToSVGFromBonk } from "./src/render/renderSkinToSVGFromBonk.js";
import { loadAndNormalizeSvgNode } from "./src/utils/loadSvgNode.js";
import { TOTAL_BONK_SHAPES } from "./src/bonk/constants.js";

// Preload SVG assets
for (let i = 1; i <= TOTAL_BONK_SHAPES; i++) {
  loadAndNormalizeSvgNode(i);
}

console.log("✅ Server SVG cache loaded");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BONK_AVATAR_UPDATE_URL = "https://bonk2.io/scripts/avatar_update.php";
const BONK_LOGIN_URL = "https://bonk2.io/scripts/login_legacy.php";

const app = express();

// Static frontend
app.use(express.static(path.join(__dirname, "dist")));

// JSON parsing
app.use(express.json({ limit: "10mb" }));

// ==============================
// 🎮 APPLY SKIN TO BONK ACCOUNT
// ==============================
app.post("/api/wear", async (req, res) => {
  try {
    const { username, password, skin } = req.body;

    if (!username || !password || !skin) {
      return res.status(400).json({
        ok: false,
        error: "missing_params",
      });
    }

    const loginRes = await fetch(BONK_LOGIN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        task: "legacy",
        username,
        password,
      }),
    });

    const loginData = await loginRes.json();

    if (loginData.r !== "success" || !loginData.token) {
      return res.status(401).json({
        ok: false,
        error: loginData.error || "login_failed",
      });
    }

    const token = loginData.token;
    const activeSlot =
      loginData.activeAvatarNumber ||
      loginData.activeavatarnumber ||
      3;

    const skinCode = encodeSkin(skin);

    const updateRes = await fetch(BONK_AVATAR_UPDATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        task: "updateavatar",
        token,
        newavatarslot: String(activeSlot),
        newavatar: skinCode,
      }),
    });

    const updateData = await updateRes.json();

    if (updateData.r !== "success") {
      return res.status(400).json({
        ok: false,
        error: updateData.error || "update_failed",
      });
    }

    return res.json({
      ok: true,
      skinCode,
      activeSlot,
    });

  } catch (err) {
    console.error("Error in /api/wear:", err);

    return res.status(500).json({
      ok: false,
      error: "server_error",
      hint: err.message,
    });
  }
});

// ==============================
// 🖼️ FAST PNG RENDER (for preview)
// ==============================
app.post("/api/render", async (req, res) => {
  try {
    const { skinCode, size = 512 } = req.body;

    if (!skinCode) {
      return res.status(400).json({
        ok: false,
        error: "missing_skin_code",
      });
    }

    const skin = decodeSkinCode(skinCode);
    const svg = renderSkinToSVGFromBonk(skin);

    const png = await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toBuffer();

    res.set("Content-Type", "image/png");
    return res.send(png);

  } catch (err) {
    console.error("Error in /api/render:", err);

    return res.status(500).json({
      ok: false,
      error: "render_failed",
      hint: err.message,
    });
  }
});

// ==============================
// 🧠 FULL RENDER BUNDLE (SVG + PNG + THUMB)
// ==============================
app.post("/api/render-bundle", async (req, res) => {
  try {
    const { skinCode, size = 512 } = req.body;

    if (!skinCode || typeof skinCode !== "string") {
      return res.status(400).json({
        ok: false,
        error: "missing_or_invalid_skin_code",
      });
    }

    // Decode
    let skin;
    try {
      skin = decodeSkinCode(skinCode);
    } catch (err) {
      return res.status(400).json({
        ok: false,
        error: "invalid_skin_code",
        hint: err.message,
      });
    }

    // Render SVG
    let svg;
    try {
      svg = renderSkinToSVGFromBonk(skin);
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: "svg_render_failed",
        hint: err.message,
      });
    }

    // Convert to PNG + thumbnail
    let pngBuffer, thumbBuffer;

    try {
      const svgBuffer = Buffer.from(svg);

      pngBuffer = await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toBuffer();

      thumbBuffer = await sharp(svgBuffer)
        .resize(128, 128)
        .png()
        .toBuffer();

    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: "png_conversion_failed",
        hint: err.message,
      });
    }

    return res.json({
      ok: true,
      svg,
      pngBase64: pngBuffer.toString("base64"),
      thumbnailBase64: thumbBuffer.toString("base64"),
    });

  } catch (err) {
    console.error("🔥 Unexpected error in /api/render-bundle:", err);

    return res.status(500).json({
      ok: false,
      error: "render_bundle_failed",
      hint: err.message,
    });
  }
});

// ==============================
// ❤️ HEALTH CHECK
// ==============================
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    time: new Date().toISOString(),
  });
});

// ==============================
// 🚫 API FALLBACK (IMPORTANT)
// ==============================
app.use("/api", (req, res) => {
  return res.status(404).json({
    ok: false,
    error: "api_route_not_found",
    path: req.originalUrl,
  });
});

// ==============================
// 🌐 SPA FALLBACK
// ==============================
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// ==============================
// 🚀 START SERVER
// ==============================
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});