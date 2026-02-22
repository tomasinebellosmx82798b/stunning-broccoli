/**
 * IOE LÂU ĐÀI TRÊN MÂY SOLVER - V3.3 (ULTRA COMPATIBLE)
 * Fix: Lỗi cấu trúc JSON từ AI bằng cách sử dụng Regex Parser thông minh.
 */
(function() {
    const WORKER_URL = "https://green-fire-6693.conwoodalluny67350w.workers.dev";
    const WORKER_AUTH = "Bearer 12345678";

    console.log("%c🏰 IOE LAU DAI SOLVER V3.3 - FIX JSON", "color: #f39c12; font-weight: bold;");

    window.autoSolveEnabled = true;
    let isSolving = false;
    let lastSolvedKey = "";

    function getParagraphText() {
        let node = cc.find("Canvas/GAME_PLAY/quest_doanvan_dientu") || 
                   cc.find("StartScene/Canvas/GAME_PLAY/quest_doanvan_dientu");
        if (!node) return "";
        let lbl = node.getComponentInChildren(cc.RichText) || node.getComponentInChildren(cc.Label);
        return lbl ? lbl.string.replace(/<[^>]*>/g, '').trim() : "";
    }

    function getQuestions() {
        let questions = [];
        let scrollview = cc.find("Canvas/GAME_PLAY/quest_doanvan_dientu/answerScrollview");
        let content = scrollview ? scrollview.getChildByName("view").getChildByName("content") : null;
        if (!content) return [];

        content.children.forEach((item, index) => {
            if (!item.active || item.opacity === 0) return;
            let options = [];
            let container = item.getChildByName("container");
            if (container) {
                let mcNodes = container.children.filter(n => n.name === "mcCross");
                mcNodes.forEach((node, idx) => {
                    let answerNode = node.getChildByName("txtAnswer");
                    let indexLabel = String.fromCharCode(65 + idx);
                    let answerText = "";
                    if (answerNode) {
                        let lbl = answerNode.getComponent(cc.Label) || answerNode.getComponent(cc.RichText);
                        if (lbl) answerText = lbl.string.trim();
                    }
                    if (answerText) {
                        options.push({ label: indexLabel, text: answerText, node: node });
                    }
                });
            }
            if (options.length > 0) questions.push({ index: index + 1, options: options });
        });
        return questions;
    }

    function simulateClick(node) {
        if (!node) return;
        node.active = true;
        [cc.Node.EventType.TOUCH_START, cc.Node.EventType.TOUCH_END].forEach(t => {
            let event = new cc.Event.EventCustom(t, true);
            event.touch = { getLocation: () => cc.v2(0,0), getPreviousLocation: () => cc.v2(0,0) };
            node.emit(t, event);
        });
        let btn = node.getComponent(cc.Button);
        if (btn && btn.interactable) {
            cc.Component.EventHandler.emitEvents(btn.clickEvents, { target: node });
        }
    }

    async function askAI(paragraph, questionCount, debugQuestions) {
        const optionsSummary = debugQuestions.map(q => 
            `Q${q.index}: ${q.options.map(o => `${o.label}. ${o.text}`).join(" | ")}`
        ).join("\n");
        
        console.log("%c--- 📤 GỬI DỮ LIỆU ĐẾN AI V3.3 ---", "color: #3498db; font-weight: bold;");

        try {
            const response = await fetch(WORKER_URL, {
                method: "POST",
                headers: { "Authorization": WORKER_AUTH, "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    systemPrompt: "Return ONLY a JSON array of strings: ['Word1', 'Word2', ...].", 
                    prompt: `Passage: ${paragraph}\n\nOptions List:\n${optionsSummary}\n\nAnswer for ${questionCount} questions:` 
                }),
            });
            const data = await response.json();
            const resultText = String(data.response || "").trim();
            
            // Bước 1: Thử parse JSON chuẩn
            try {
                const jsonMatch = resultText.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    // Thay thế nháy đơn thành nháy kép để hợp lệ hóa JSON
                    let validJson = jsonMatch[0].replace(/'/g, '"');
                    let parsed = JSON.parse(validJson);
                    return Array.isArray(parsed[0]) ? parsed[0] : parsed;
                }
            } catch (e) {}

            // Bước 2: Regex Parser (Nếu JSON parse thất bại)
            // Tìm tất cả các cụm nằm trong ngoặc đơn hoặc kép
            let fallbackMatches = resultText.match(/['"](.*?)['"]/g);
            if (fallbackMatches) {
                return fallbackMatches.map(m => m.replace(/['"]/g, ''));
            }

            return null;
        } catch (e) { 
            console.error("❌ API Error:", e.message);
            return null; 
        }
    }

    async function solve() {
        if (isSolving) return;
        const paragraph = getParagraphText();
        const questions = getQuestions();
        if (!paragraph || questions.length === 0) return;

        const currentKey = paragraph.substring(0, 100) + "_" + questions.length;
        if (currentKey === lastSolvedKey) return;

        lastSolvedKey = currentKey;
        isSolving = true;
        console.log("%c⏳ Đang phân tích (V3.3)...", "color: #f1c40f;");

        const answers = await askAI(paragraph, questions.length, questions);
        
        if (!answers || !Array.isArray(answers) || answers.length === 0) {
            console.log("%c⚠️ Không thể đọc đáp án AI. Thử lại sau 3s...", "color: #e74c3c;");
            isSolving = false;
            lastSolvedKey = ""; 
            return;
        }

        console.log("%c🎯 Đáp án AI:", "color: #2ecc71; font-weight: bold;", answers);

        for (let i = 0; i < questions.length; i++) {
            let aiRaw = String(answers[i] || "").trim().toLowerCase();
            let aiText = aiRaw.replace(/^[a-d]\.\s*/, "").replace(/[.,]$/, ""); 
            let question = questions[i];
            
            let target = question.options.find(opt => opt.text.toLowerCase() === aiText) || 
                         question.options.find(opt => opt.text.toLowerCase().includes(aiText)) ||
                         question.options.find(opt => aiText.includes(opt.text.toLowerCase()));

            if (target) {
                simulateClick(target.node);
                console.log(`✅ Q${question.index}: ${target.label}. ${target.text}`);
                await new Promise(r => setTimeout(r, 400));
            }
        }

        setTimeout(() => {
            let btnSubmit = cc.find("Canvas/GAME_PLAY/quest_doanvan_dientu/btnSubmit") || 
                           cc.find("Canvas/GAME_PLAY/btnSubmit");
            if (btnSubmit) {
                console.log("%c🚀 Nộp bài...", "color: #9b59b6;");
                simulateClick(btnSubmit);
            }
            isSolving = false;
        }, 1000);
    }

    setInterval(() => {
        if (window.autoSolveEnabled && !isSolving) solve();
    }, 3000);

})();
