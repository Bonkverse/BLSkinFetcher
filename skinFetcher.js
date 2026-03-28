window.onload = () => {
    document.getElementById("bonkleagueLink").focus();
};

document.addEventListener("DOMContentLoaded", function() {
    const input = document.getElementById("bonkleagueLink");
    const button = document.getElementById("fetchSkinButton");

    input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            e.preventDefault(); // prevents weird behavior
            button.click();     // triggers same logic as button
        }
    });

    document.getElementById("fetchSkinButton").addEventListener("click", async function () {
        const input = document.getElementById("bonkleagueLink").value;
        const status = document.getElementById("status");
        const resultDiv = document.getElementById("result");

        const nameEl = document.getElementById("skinName");
        const authorEl = document.getElementById("skinAuthor");
        const finalUrlEl = document.getElementById("finalUrl");
        const skinCodeEl = document.getElementById("skinCode");
        const editorLink = document.getElementById("editorLink");

        if (!input) {
            status.textContent = "❌ Please enter a link";
            status.className = "error";
            return;
        }

        // 🔥 Loading state
        button.disabled = true;
        button.textContent = "Fetching...";
        status.textContent = "⏳ Fetching skin...";
        status.className = "loading";
        resultDiv.style.display = "none";

        try {
            const res = await fetch(`/api/getSkin?link=${encodeURIComponent(input)}`);
            if (!res.ok) throw new Error();

            const data = await res.json();

            // ✅ Success UI
            status.textContent = "✅ Skin fetched!";
            status.className = "success";

            nameEl.textContent = data.name || "N/A";
            authorEl.textContent = data.author || "N/A";

            finalUrlEl.href = data.finalUrl;
            finalUrlEl.textContent = data.finalUrl;

            skinCodeEl.value = data.skinCode || "N/A";

            const editorUrl = `https://editor.bonkverse.io/?skin=${skinCodeEl.value}`;

            editorLink.href = editorUrl;
            editorLink.textContent = "✏️ Open in Editor";

            resultDiv.style.display = "block";
            resultDiv.classList.add("fade-in");

        } catch (err) {
            status.textContent = "❌ Failed to fetch skin";
            status.className = "error";
        }

        // 🔁 Reset button
        button.disabled = false;
        button.textContent = "Fetch";
    });

    document.getElementById("copyButton").addEventListener("click", () => {
        navigator.clipboard.writeText(document.getElementById("skinCode").value);

        const btn = document.getElementById("copyButton");
        btn.textContent = "Copied!";
        setTimeout(() => btn.textContent = "Copy Skin Code", 1500);
    });
});
