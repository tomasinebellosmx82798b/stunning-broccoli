(function() {
    // --- CẤU HÌNH ---
    const WORKER_URL = "https://green-fire-6693.conwoodalluny67350w.workers.dev";
    const WORKER_AUTH = "Bearer 12345678";

    console.log("%c🚀 IOE BACH TUOC SOLVER V2.0 - SMART TOKENIZER", "color: #e67e22; font-weight: bold; font-size: 14px;");

    window.autoSolveEnabled = false;
    let isSolving = false;
    let lastSolvedKey = ""; 

    function cleanText(str) {
        if (!str) return "";
        return str.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
    }

    function getAvailableWords() {
        let words = [];
        let ctnText = cc.find("Canvas/GAME_PLAY/quest_game11/answerPanel/ctnText") || 
                      cc.find("StartScene/Canvas/GAME_PLAY/quest_game11/answerPanel/ctnText");
        
        if (!ctnText) return [];

        const scan = (node) => {
            if (node.name === "crossText" && node.activeInHierarchy && node.opacity > 0) {
                let lbl = node.getComponentInChildren(cc.Label);
                if (lbl && lbl.string && lbl.string.trim() !== "") {
                    words.push({
                        text: lbl.string.trim(),
                        clean: cleanText(lbl.string),
                        node: node,
                        uuid: node.uuid
                    });
                }
            }
            node.children.forEach(scan);
        };

        scan(ctnText);
        return words;
    }

    function simulateClick(node) {
        if (!node) return;
        let tStart = new cc.Event.EventCustom('touchstart', true);
        node.dispatchEvent(tStart);
        let tEnd = new cc.Event.EventCustom('touchend', true);
        node.dispatchEvent(tEnd);
        let btn = node.getComponent(cc.Button);
        if (btn) cc.Component.EventHandler.emitEvents(btn.clickEvents, btn);
    }

    function forceSubmit() {
        try {
            let gamePlayNode = cc.find("Canvas/GAME_PLAY") || cc.find("StartScene/Canvas/GAME_PLAY");
            if (gamePlayNode) {
                let gamePlayScript = gamePlayNode.getComponent("GamePlay");
                if (gamePlayScript && typeof gamePlayScript.confirmSubmit === "function") {
                    console.log("%c🚀 [Submit] Gọi hàm confirmSubmit()...", "color: #f39c12; font-weight: bold;");
                    gamePlayScript.confirmSubmit();
                    return true;
                }
            }
            let btnSubmit = cc.find("Canvas/GAME_PLAY/quest_game11/btnSubmit") || 
                           cc.find("StartScene/Canvas/GAME_PLAY/quest_game11/btnSubmit");
            if (btnSubmit) simulateClick(btnSubmit);
        } catch (e) { console.error("Lỗi submit:", e); }
        return false;
    }

    async function getCorrectOrder(words) {
        const wordList = words.map(w => `"${w.text}"`).join(", ");
        const systemPrompt = "You are an English teacher. Reorder scrambled words into a correct sentence. Return ONLY words/phrases separated by '|'. Example: 'I | love | you'. No extra punctuation.";
        const userPrompt = `Words: [${wordList}]`;

        try {
            const response = await fetch(WORKER_URL, {
                method: "POST",
                headers: { "Authorization": WORKER_AUTH, "Content-Type": "application/json" },
                body: JSON.stringify({ systemPrompt, prompt: userPrompt, history: [] }),
            });
            const data = await response.json();
            if (data.response) {
                console.log("%c🤖 AI Raw:", "color: #9b59b6;", data.response);
                // Phân tách bằng dấu gạch đứng, bỏ trống, và clean từng phần
                return data.response.split('|').map(s => s.trim()).filter(s => s.length > 0);
            }
        } catch (e) { return null; }
    }

    async function solve() {
        if (isSolving) return;

        const currentWords = getAvailableWords();
        if (currentWords.length === 0) return;
        
        const currentKey = currentWords.map(w => w.clean).sort().join("|");
        if (currentKey === lastSolvedKey) {
            forceSubmit();
            return;
        }

        isSolving = true;
        console.log("%c⏳ Bắt đầu giải...", "color: #3498db;");

        const aiParts = await getCorrectOrder(currentWords);
        if (!aiParts) {
            isSolving = false;
            return;
        }

        let clickedUuids = new Set();
        
        for (let part of aiParts) {
            let partClean = cleanText(part);
            if (!partClean) continue;

            const freshWords = getAvailableWords();
            
            // Tìm khối chữ nào mà nội dung của nó CHỨA hoặc BẰNG cụm từ AI yêu cầu
            // Hoặc cụm từ AI yêu cầu nằm TRONG khối chữ đó
            let match = freshWords.find(w => {
                if (clickedUuids.has(w.uuid)) return false;
                return w.clean === partClean || w.clean.includes(partClean) || partClean.includes(w.clean);
            });

            if (match) {
                console.log(`👉 Click: ${match.text} (Khớp với: ${part})`);
                simulateClick(match.node);
                clickedUuids.add(match.uuid);
                await new Promise(r => setTimeout(r, 800)); 
            }
            // Nếu không tìm thấy match, ta bỏ qua part này vì có thể nó đã được gộp vào part trước đó
        }

        // Bước quan trọng nhất: Kiểm tra xem Game còn từ nào chưa được click không
        // Nếu AI phân tách sai dẫn đến sót từ, click nốt theo thứ tự hiện có
        let remaining = getAvailableWords();
        if (remaining.length > 0) {
            console.log("🧹 Dọn nốt từ sót để đảm bảo có thể nộp bài...");
            for (let w of remaining) {
                if (!clickedUuids.has(w.uuid)) {
                    simulateClick(w.node);
                    clickedUuids.add(w.uuid);
                    await new Promise(r => setTimeout(r, 600));
                }
            }
        }

        lastSolvedKey = currentKey;
        await new Promise(r => setTimeout(r, 1000));
        forceSubmit();

        setTimeout(() => { isSolving = false; }, 4000); 
    }

    async function autoLoop() {
        while (window.autoSolveEnabled) {
            try {
                await solve();
                await new Promise(r => setTimeout(r, 1500));
            } catch (e) {
                isSolving = false;
                await new Promise(r => setTimeout(r, 3000));
            }
        }
    }

    window.toggleAuto = function() {
        window.autoSolveEnabled = !window.autoSolveEnabled;
        if (window.autoSolveEnabled) {
            console.log("%c▶️ AUTO: ON", "color: #27ae60; font-weight: bold;");
            autoLoop();
        } else {
            console.log("%c⏸️ AUTO: OFF", "color: #c0392b; font-weight: bold;");
            isSolving = false;
            lastSolvedKey = ""; 
        }
    };

    window.solve = solve;
})();
