/**
 * IOE CHIM HÁI TÁO SOLVER - TRUE/FALSE AI
 * Tính năng: Phân tích đoạn văn và câu hỏi để đưa ra đáp án True/False.
 */
(function() {
    const WORKER_URL = "https://green-fire-6693.conwoodalluny67350w.workers.dev";
    const WORKER_AUTH = "Bearer 12345678";

    console.log("%c🍎 IOE CHIM HÁI TÁO SOLVER READY", "color: #e74c3c; font-weight: bold; font-size: 14px;");

    // --- GUI Tương tự bài trước để đồng bộ ---
    const guiHTML = `
    <div id="ioe-gui-tf" style="position: fixed; bottom: 20px; right: 20px; width: 300px; background: rgba(28, 28, 30, 0.95); border-radius: 12px; color: white; font-family: sans-serif; z-index: 99999; box-shadow: 0 8px 32px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); text-align: left;">
        <div style="padding: 10px 15px; background: rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1);">
            <span style="font-weight: bold; font-size: 12px; color: #e74c3c;">🍎 CHIM HÁI TÁO AI</span>
        </div>
        <div style="padding: 15px;">
            <div style="margin-bottom: 10px;">
                <div style="font-size: 10px; color: #888; text-transform: uppercase;">Dự đoán:</div>
                <div id="tf-answer" style="font-size: 28px; font-weight: bold; color: #2ecc71; text-align: center; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px;">--</div>
            </div>
            <div id="tf-log" style="height: 100px; background: #000; border-radius: 6px; padding: 8px; font-size: 11px; font-family: monospace; overflow-y: auto; color: #bdc3c7; text-align: left;">
                <div style="color: #3498db;">[Hệ thống] Đang đợi câu hỏi...</div>
            </div>
            <button id="btn-solve-tf" style="width: 100%; margin-top: 10px; padding: 10px; border-radius: 8px; border: none; background: #3498db; color: white; font-weight: bold; cursor: pointer;">GIẢI CÂU NÀY</button>
        </div>
    </div>`;

    if (!document.getElementById('ioe-gui-tf')) {
        const div = document.createElement('div');
        div.innerHTML = guiHTML;
        document.body.appendChild(div);
    }

    const logEl = document.getElementById('tf-log');
    const ansEl = document.getElementById('tf-answer');

    function addLog(msg, color = "#bdc3c7") {
        const d = document.createElement('div');
        d.style.color = color;
        d.innerText = `> ${msg}`;
        logEl.appendChild(d);
        logEl.scrollTop = logEl.scrollHeight;
    }

    function getText(path) {
        let node = cc.find(path);
        if (!node) return "";
        let lbl = node.getComponent(cc.Label) || node.getComponent(cc.RichText);
        return lbl ? lbl.string.replace(/<[^>]*>/g, '').trim() : "";
    }

    async function solveTF() {
        ansEl.innerText = "⏳";
        ansEl.style.color = "#f1c40f";

        // 1. Lấy đoạn văn chính
        let passage = getText("Canvas/GAME_PLAY/nTrueFalse/nTextQuest/converSprite/convTxtScrollView/view/content/conv_content_scroll");
        
        // 2. Lấy câu hỏi hiện tại
        let question = getText("Canvas/GAME_PLAY/nTrueFalse/askTxtScrollView/ask_content_no_scroll");

        if (!passage || !question) {
            addLog("Không tìm thấy dữ liệu bài học!", "#e74c3c");
            ansEl.innerText = "ERR";
            return;
        }

        addLog("Đang gửi tới LLM...", "#f1c40f");

        try {
            const response = await fetch(WORKER_URL, {
                method: "POST",
                headers: { "Authorization": WORKER_AUTH, "Content-Type": "application/json" },
                body: JSON.stringify({
                    systemPrompt: "You are an English expert. Based on the passage, decide if the statement is True or False. Return ONLY the word 'TRUE' or 'FALSE'.",
                    prompt: `Passage: ${passage}\n\nStatement: ${question}`
                }),
            });
            const data = await response.json();
            if (data.response) {
                const result = data.response.toUpperCase().includes("TRUE") ? "TRUE" : "FALSE";
                ansEl.innerText = result;
                ansEl.style.color = (result === "TRUE") ? "#2ecc71" : "#e67e22";
                addLog("AI phản hồi: " + result, "#2ecc71");
                
                // Tự động click (Tùy chọn)
                // let btnName = (result === "TRUE") ? "Canvas/GAME_PLAY/nTrueFalse/btnTrue copy" : "Canvas/GAME_PLAY/nTrueFalse/btnFalse copy";
                // let btnNode = cc.find(btnName);
                // if(btnNode) { /* logic click giống các bài trước */ }
            }
        } catch (e) {
            addLog("Lỗi: " + e.message, "#e74c3c");
        }
    }

    document.getElementById('btn-solve-tf').onclick = solveTF;

})();
