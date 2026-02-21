(function() {
    // --- CẤU HÌNH ---
    const ASSEMBLY_AI_KEY = "lolo"; 
    const WORKER_URL = "https://green-fire-6693.conwoodalluny67350w.workers.dev";
    const WORKER_AUTH = "Bearer 12345678";

    console.log("%c🚀 IOE AUDIO SOLVER V6.3 - AUTO SOLVE & SMART PREFIX", "color: #2ecc71; font-weight: bold; font-size: 14px;");

    // Biến trạng thái cho Auto Solve
    window.autoSolveEnabled = false;
    let lastAudioUrl = "";

    function getCleanAudioUrl() {
        let node = cc.find("StartScene/Canvas/GAME_PLAY/nDienTu/nAudioQuest") || 
                   cc.find("Canvas/GAME_PLAY/nDienTu/nAudioQuest");
        if (node) {
            let comp = node.getComponent("AudioContent");
            if (comp && comp.remoteSound) return comp.remoteSound;
        }
        return null;
    }

    function getHintText() {
        let root = cc.find("StartScene/Canvas/GAME_PLAY/nDienTu/nAudioQuest") || 
                   cc.find("Canvas/GAME_PLAY/nDienTu/nAudioQuest");
        if (!root) return "";

        let hint = "";
        const scanForText = (node) => {
            if (hint !== "") return;
            let rt = node.getComponent(cc.RichText);
            if (rt && rt.string && rt.string.includes("_")) {
                hint = rt.string.replace(/<[^>]*>/g, "").trim();
                return;
            }
            let lb = node.getComponent(cc.Label);
            if (lb && lb.string && lb.string.includes("_")) {
                hint = lb.string.trim();
                return;
            }
            node.children.forEach(scanForText);
        };
        scanForText(root);
        return hint;
    }

    async function transcribeAudio(url) {
        console.log("⏳ AssemblyAI đang nghe...");
        try {
            const response = await fetch("https://api.assemblyai.com/v2/transcript", {
                method: "POST",
                headers: { "authorization": ASSEMBLY_AI_KEY, "content-type": "application/json" },
                body: JSON.stringify({ audio_url: url, language_code: "en" })
            });
            const startData = await response.json();
            const transcriptId = startData.id;
            while (true) {
                const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
                    headers: { "authorization": ASSEMBLY_AI_KEY }
                });
                const data = await pollResponse.json();
                if (data.status === 'completed') return data.text;
                if (data.status === 'error') return null;
                await new Promise(r => setTimeout(r, 800));
            }
        } catch (e) { return null; }
    }

    async function getFinalAnswer(transcript, fullSentenceHint) {
        // Prompt được cập nhật để dặn AI chỉ trả về phần chữ còn thiếu
        const systemPrompt = "You are an English test expert. Extract the missing word from the transcript. CRITICAL: If the blank has starting/ending letters (e.g. 'pl___' or '___face'), return ONLY the missing letters to complete it (e.g. 'anted'). Return ONLY the exact letters to type, no punctuation.";
        const userPrompt = `Transcript: "${transcript}"\nSentence with blank: "${fullSentenceHint}"\n\nFind the missing letters to type:`;

        console.log("%c--- DEBUG AI PROMPT ---", "color: #3498db; font-weight: bold;");
        console.log("%cUser Prompt:", "color: #e67e22; font-weight: bold;", userPrompt);

        try {
            const response = await fetch(WORKER_URL, {
                method: "POST",
                headers: {
                    "Authorization": WORKER_AUTH,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    systemPrompt: systemPrompt,
                    prompt: userPrompt,
                    history: []
                }),
            });

            const data = await response.json();
            if (data.response) {
                let answer = data.response.trim().split(/\s+/)[0].replace(/[^a-zA-Z]/g, '');
                
                // --- BỘ LỌC THÔNG MINH (TRÁNH AI NHẦM LẪN) ---
                // Tách phần chữ đầu và chữ cuối từ hint (ví dụ: pl_____ hoặc ___face)
                let parts = fullSentenceHint.match(/([a-zA-Z]*)_+([a-zA-Z]*)/);
                let prefix = parts && parts[1] ? parts[1].toLowerCase() : "";
                let suffix = parts && parts[2] ? parts[2].toLowerCase() : "";
                
                // Nếu AI lỡ trả về nguyên chữ "planted", cắt chữ "pl" đi
                if (prefix && answer.toLowerCase().startsWith(prefix)) {
                    answer = answer.substring(prefix.length);
                }
                if (suffix && answer.toLowerCase().endsWith(suffix)) {
                    answer = answer.substring(0, answer.length - suffix.length);
                }

                return answer;
            }
            return null;
        } catch (e) { 
            console.error("❌ Lỗi kết nối Worker:", e.message);
            return null; 
        }
    }

    // --- MÔ PHỎNG GÕ TỪNG KÝ TỰ ---
    async function findAndFill(answer) {
        let found = false;
        const scan = async (node) => {
            if (found || !node.activeInHierarchy) return;
            let eb = node.getComponent(cc.EditBox);
            if (eb) {
                console.log("🔍 Đang gõ chữ:", answer);
                if (eb._editBoxImpl) eb._editBoxImpl.beginEditing();
                
                let currentStr = "";
                for (let i = 0; i < answer.length; i++) {
                    currentStr += answer[i];
                    
                    if (eb._editBoxImpl && eb._editBoxImpl._elem) eb._editBoxImpl._elem.value = currentStr;
                    eb.string = currentStr;
                    
                    if (eb._editBoxImpl && eb._editBoxImpl._delegate && eb._editBoxImpl._delegate.editBoxTextChanged) {
                        eb._editBoxImpl._delegate.editBoxTextChanged(eb._editBoxImpl, currentStr);
                    } else {
                        node.emit('text-changed', eb);
                        if (eb.textChanged && eb.textChanged.length > 0) {
                            cc.Component.EventHandler.emitEvents(eb.textChanged, currentStr, eb);
                        }
                    }
                    await new Promise(resolve => setTimeout(resolve, 30));
                }

                if (eb._editBoxImpl) eb._editBoxImpl.endEditing();

                node.emit('editing-did-ended', eb);
                if (eb.editingDidEnded && eb.editingDidEnded.length > 0) {
                    cc.Component.EventHandler.emitEvents(eb.editingDidEnded, eb);
                }

                if (eb._onEditReturn) eb._onEditReturn();
                
                console.log(`%c✅ ĐÃ GÕ XONG: ${answer}`, "color: #00ff00; font-weight: bold;");
                found = true;
                return;
            }
            
            for (let i = 0; i < node.children.length; i++) {
                await scan(node.children[i]);
                if (found) break;
            }
        };

        let targetArea = cc.find("StartScene/Canvas/GAME_PLAY/nDienTu/nAudioQuest") || cc.find("Canvas/GAME_PLAY/nDienTu/nAudioQuest");
        if (targetArea) await scan(targetArea);
        if (!found) await scan(cc.director.getScene());
    }

    async function solve() {
        const audioUrl = getCleanAudioUrl();
        // Bỏ qua nếu không có audio hoặc trùng audio (đang đợi qua câu)
        if (!audioUrl || audioUrl === lastAudioUrl) return false;

        const hint = getHintText(); 
        const transcript = await transcribeAudio(audioUrl);
        
        if (!transcript) {
            console.error("❌ AssemblyAI không nghe được.");
            return false;
        }

        console.log(`%c👂 Transcript Gốc: "${transcript}"`, "color: #ff9900; font-weight: bold;");

        const answer = await getFinalAnswer(transcript, hint);
        if (answer) {
            console.log(`%c🎯 Đáp án cuối: ${answer}`, "color: #00ff00; font-size: 16px; font-weight: bold;");
            await findAndFill(answer);
            lastAudioUrl = audioUrl; // Lưu lại để không giải lại câu này
            return true;
        }
        return false;
    }

    // --- VÒNG LẶP AUTO SOLVE ---
    async function autoLoop() {
        while (window.autoSolveEnabled) {
            let success = await solve();
            if (success) {
                console.log("⏳ Chờ 6 giây (animation nhặt rác) để tải câu tiếp theo...");
                await new Promise(r => setTimeout(r, 6000));
            } else {
                // Nếu chưa có câu hỏi hoặc đang animation thì dò lại sau 2 giây
                await new Promise(r => setTimeout(r, 2000));
            }
        }
    }

    window.toggleAuto = async function() {
        window.autoSolveEnabled = !window.autoSolveEnabled;
        if (window.autoSolveEnabled) {
            console.log("%c▶️ ĐÃ BẬT AUTO SOLVE - Sẽ tự giải liên tục", "color: #fff; background: #27ae60; padding: 4px; font-weight:bold; font-size: 14px;");
            autoLoop();
        } else {
            console.log("%c⏸️ ĐÃ TẮT AUTO SOLVE", "color: #fff; background: #c0392b; padding: 4px; font-weight:bold; font-size: 14px;");
        }
    };

    window.solve = solve;
    console.log("%c👉 Đã cập nhật V6.3. Gõ toggleAuto() để Bật/Tắt giải tự động, hoặc solve() để giải tay.", "color: #fff; background: #8e44ad; padding: 4px; font-weight: bold;");
})();
