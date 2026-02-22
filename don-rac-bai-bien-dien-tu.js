/**
 * IOE DỌN RÁC BÃI BIỂN - FILL IN THE BLANK SOLVER (V1.7)
 * Cập nhật: Thêm Logging chi tiết và Rule nghiêm ngặt cho AI.
 */
(function() {
    const WORKER_URL = "https://green-fire-6693.conwoodalluny67350w.workers.dev";
    const WORKER_AUTH = "Bearer 12345678";

    console.log("%c🧹 IOE DIEN TU SOLVER V1.7 - DETAILED LOGGING & RULES", "color: #1abc9c; font-weight: bold; font-size: 14px;");

    const guiId = "ioe-dien-tu-status";
    if (!document.getElementById(guiId)) {
        const div = document.createElement('div');
        div.id = guiId;
        div.style = "position: fixed; top: 10px; left: 50%; transform: translateX(-50%); padding: 8px 20px; background: rgba(0,0,0,0.8); color: #00ff00; border-radius: 20px; z-index: 10000; font-family: sans-serif; font-size: 12px; border: 1px solid #00ff00;";
        div.innerText = "Dọn rác: Đang chờ...";
        document.body.appendChild(div);
    }
    const setStatus = (txt) => document.getElementById(guiId).innerText = "Dọn rác: " + txt;

    window.autoSolveEnabled = true;
    let isSolving = false;
    let lastSolvedText = "";

    function findNodeRecursively(root, criteria) {
        if (!root) return null;
        if (criteria(root)) return root;
        for (let child of root.children) {
            let found = findNodeRecursively(child, criteria);
            if (found) return found;
        }
        return null;
    }

    function getQuestionData() {
        let root = cc.find("Canvas/GAME_PLAY/nDienTu");
        if (!root || !root.activeInHierarchy) return null;

        let questionNode = findNodeRecursively(root, n => {
            let rt = n.getComponent(cc.RichText);
            return rt && rt.string && rt.string.includes("_");
        });

        if (!questionNode) return null;
        let rawStr = questionNode.getComponent(cc.RichText).string;
        let cleanStr = rawStr.replace(/<[^>]*>/g, '').trim();
        let underscoreCount = (cleanStr.match(/_/g) || []).length;
        
        return { fullText: cleanStr, underscoreCount };
    }

    async function simulateTyping(eb, answer) {
        if (!eb) return;
        console.log(`%c⌨️ Đang mô phỏng gõ: ${answer}`, "color: #f1c40f;");
        if (eb._editBoxImpl) eb._editBoxImpl.beginEditing();
        
        let currentStr = "";
        for (let i = 0; i < answer.length; i++) {
            currentStr += answer[i];
            if (eb._editBoxImpl && eb._editBoxImpl._elem) eb._editBoxImpl._elem.value = currentStr;
            eb.string = currentStr;
            
            if (eb._editBoxImpl && eb._editBoxImpl._delegate && eb._editBoxImpl._delegate.editBoxTextChanged) {
                eb._editBoxImpl._delegate.editBoxTextChanged(eb._editBoxImpl, currentStr);
            } else {
                eb.node.emit('text-changed', eb);
                if (eb.textChanged && eb.textChanged.length > 0) {
                    cc.Component.EventHandler.emitEvents(eb.textChanged, currentStr, eb);
                }
            }
            await new Promise(r => setTimeout(r, 50));
        }

        if (eb._editBoxImpl) eb._editBoxImpl.endEditing();
        eb.node.emit('editing-did-ended', eb);
        if (eb.editingDidEnded && eb.editingDidEnded.length > 0) {
            cc.Component.EventHandler.emitEvents(eb.editingDidEnded, eb);
        }
        if (eb._onEditReturn) eb._onEditReturn();
    }

    async function solve() {
        if (isSolving || !window.autoSolveEnabled) return;

        const qData = getQuestionData();
        if (!qData || qData.fullText === lastSolvedText) return;

        isSolving = true;
        lastSolvedText = qData.fullText;
        setStatus("Đang gửi AI...");

        // RULE CHO AI: Rất khắt khe
        const systemRule = `You are an English language expert.
RULES:
1. Provide ONLY the missing characters to replace the underscores.
2. The number of characters MUST match exactly the number of underscores.
3. NO punctuation, NO sentences, NO explanation, NO labels.
4. Output MUST be plain text only.`;

        const userPrompt = `Sentence: "${qData.fullText}"\nUnderscores: ${qData.underscoreCount}\nMissing letters:`;

        // LOGGING GỬI ĐI
        console.log("%c--- 📤 GỬI AI ---", "color: #3498db; font-weight: bold;");
        console.log("%cPrompt:", "color: #ecf0f1;", userPrompt);
        console.log("%cSố ký tự cần tìm:", "color: #ecf0f1;", qData.underscoreCount);

        try {
            const response = await fetch(WORKER_URL, {
                method: "POST",
                headers: { "Authorization": WORKER_AUTH, "Content-Type": "application/json" },
                body: JSON.stringify({
                    systemPrompt: systemRule,
                    prompt: userPrompt
                }),
            });
            
            const data = await response.json();
            let rawAnswer = data.response ? data.response.trim() : "";
            
            // LOGGING PHẢN HỒI
            console.log("%c--- 📥 AI PHẢN HỒI ---", "color: #2ecc71; font-weight: bold;");
            console.log("%cRaw Response:", "color: #ecf0f1;", rawAnswer);

            // Hậu xử lý: Lấy đúng số lượng ký tự cần thiết nếu AI lỡ trả về nguyên từ
            let cleanedAnswer = rawAnswer.replace(/[^a-zA-Z0-9]/g, "");
            
            // Kiểm tra Logic: Nếu AI trả về nguyên từ (ví dụ "apple" cho "ap___"), ta cắt bỏ phần đầu
            if (cleanedAnswer.length > qData.underscoreCount) {
                 // Tìm vị trí các gạch dưới trong câu gốc để so sánh
                 let parts = qData.fullText.split(/_+/);
                 let prefix = parts[0].toLowerCase();
                 if (prefix && cleanedAnswer.toLowerCase().startsWith(prefix)) {
                     cleanedAnswer = cleanedAnswer.substring(prefix.length);
                 }
            }

            // Chỉ lấy đúng số lượng ký tự từ cuối nếu vẫn còn thừa
            if (cleanedAnswer.length > qData.underscoreCount) {
                cleanedAnswer = cleanedAnswer.substring(0, qData.underscoreCount);
            }

            console.log("%c🎯 Đáp án cuối cùng:", "color: #f39c12; font-weight: bold;", cleanedAnswer);

            if (cleanedAnswer && cleanedAnswer.length === qData.underscoreCount) {
                let root = cc.find("Canvas/GAME_PLAY/nDienTu");
                let ebNode = findNodeRecursively(root, n => n.getComponent(cc.EditBox));
                if (ebNode) {
                    await simulateTyping(ebNode.getComponent(cc.EditBox), cleanedAnswer);
                    setStatus(`✅ Đã nhập: ${cleanedAnswer}`);
                    
                    // Nộp bài sau 1s
                    setTimeout(() => {
                        let comp = root.getComponent("DienTu") || root.getComponent("GamePlay");
                        if (comp && comp.onBtnAnswer) comp.onBtnAnswer();
                        isSolving = false;
                    }, 1000);
                } else {
                    isSolving = false;
                }
            } else {
                setStatus("❌ AI sai số ký tự");
                console.error(`AI trả về ${cleanedAnswer.length} ký tự, nhưng cần ${qData.underscoreCount}`);
                isSolving = false;
                lastSolvedText = ""; // Để nó thử lại
            }
        } catch (e) {
            console.error("Lỗi:", e);
            setStatus("❌ Lỗi kết nối");
            isSolving = false;
        }
    }

    setInterval(solve, 2000);
})();
