window.onload = () => {
    document.getElementById("bonkleagueLink").focus();
};

document.addEventListener("DOMContentLoaded", function () {
    const input = document.getElementById("bonkleagueLink");
    const button = document.getElementById("fetchSkinButton");

    input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            button.click();
        }
    });

    button.addEventListener("click", async function () {
        const link = input.value.trim();

        const status = document.getElementById("status");
        const resultDiv = document.getElementById("result");

        const nameEl = document.getElementById("skinName");
        const authorEl = document.getElementById("skinAuthor");
        const finalUrlEl = document.getElementById("finalUrl");
        const skinCodeEl = document.getElementById("skinCode");
        const editorLink = document.getElementById("editorLink");

        if (!link) {
            status.textContent = "❌ Please enter a link";
            status.className = "error";
            return;
        }

        button.disabled = true;
        button.textContent = "Fetching...";
        status.textContent = "⏳ Fetching skin...";
        status.className = "loading";
        resultDiv.style.display = "none";

        try {
            const res = await fetch(`/api/getSkin?link=${encodeURIComponent(link)}`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.hint || data.error || "Failed to fetch skin");
            }

            status.textContent = "✅ Skin fetched!";
            status.className = "success";

            nameEl.textContent = data.name || "N/A";
            authorEl.textContent = data.author || "N/A";

            finalUrlEl.href = data.finalUrl;
            finalUrlEl.textContent = data.finalUrl;

            skinCodeEl.value = data.skinCode || "N/A";

            const editorUrl = `https://editor.bonkverse.io/?skin=${encodeURIComponent(data.skinCode)}`;

            editorLink.href = editorUrl;
            editorLink.textContent = "View With Editor";

            resultDiv.style.display = "block";
            resultDiv.classList.add("fade-in");

        } catch (err) {
            status.textContent = `❌ ${err.message}`;
            status.className = "error";
        }

        button.disabled = false;
        button.textContent = "Fetch";
    });

    document.getElementById("copyButton").addEventListener("click", () => {
        navigator.clipboard.writeText(document.getElementById("skinCode").value);

        const btn = document.getElementById("copyButton");
        btn.textContent = "Copied!";
        setTimeout(() => {
            btn.textContent = "Copy Skin Code";
        }, 1500);
    });
});

// window.onload = () => {
//     document.getElementById("bonkleagueLink").focus();
// };

// document.addEventListener("DOMContentLoaded", function () {
//     const input = document.getElementById("bonkleagueLink");
//     const button = document.getElementById("fetchSkinButton");

//     input.addEventListener("keypress", (e) => {
//         if (e.key === "Enter") {
//             e.preventDefault();
//             button.click();
//         }
//     });

//     button.addEventListener("click", async function () {
//         const link = input.value.trim();

//         const status = document.getElementById("status");
//         const resultDiv = document.getElementById("result");

//         const nameEl = document.getElementById("skinName");
//         const authorEl = document.getElementById("skinAuthor");
//         const finalUrlEl = document.getElementById("finalUrl");
//         const skinCodeEl = document.getElementById("skinCode");
//         const editorLink = document.getElementById("editorLink");
//         const previewImage = document.getElementById("previewImage");

//         if (!link) {
//             status.textContent = "❌ Please enter a link";
//             status.className = "error";
//             return;
//         }

//         button.disabled = true;
//         button.textContent = "Fetching...";
//         status.textContent = "⏳ Fetching skin...";
//         status.className = "loading";
//         resultDiv.style.display = "none";

//         try {
//             const res = await fetch(`/api/getSkin?render=true&link=${encodeURIComponent(link)}`);
//             const data = await res.json();

//             if (!res.ok) {
//                 throw new Error(data.hint || data.error || "Failed to fetch skin");
//             }

//             nameEl.textContent = data.name || "N/A";
//             authorEl.textContent = data.author || "N/A";

//             finalUrlEl.href = data.finalUrl;
//             finalUrlEl.textContent = data.finalUrl;

//             skinCodeEl.value = data.skinCode || "N/A";

//             const editorUrl = `https://editor.bonkverse.io/?skin=${encodeURIComponent(data.skinCode)}`;

//             editorLink.href = editorUrl;
//             editorLink.textContent = "View With Editor";

//             if (data.rendered && data.rendered.pngBase64) {
//                 previewImage.src = `data:image/png;base64,${data.rendered.pngBase64}`;
//                 previewImage.style.display = "block";
//                 status.textContent = "✅ Skin fetched and rendered!";
//             } else {
//                 previewImage.removeAttribute("src");
//                 previewImage.style.display = "none";

//                 if (data.renderError) {
//                     status.textContent = `✅ Skin fetched, but preview failed: ${data.renderError}`;
//                 } else {
//                     status.textContent = "✅ Skin fetched!";
//                 }
//             }

//             status.className = "success";

//             resultDiv.style.display = "block";
//             resultDiv.classList.add("fade-in");

//         } catch (err) {
//             status.textContent = `❌ ${err.message}`;
//             status.className = "error";
//         }

//         button.disabled = false;
//         button.textContent = "Fetch";
//     });

//     document.getElementById("copyButton").addEventListener("click", () => {
//         navigator.clipboard.writeText(document.getElementById("skinCode").value);

//         const btn = document.getElementById("copyButton");
//         btn.textContent = "Copied!";

//         setTimeout(() => {
//             btn.textContent = "Copy Skin Code";
//         }, 1500);
//     });
// });