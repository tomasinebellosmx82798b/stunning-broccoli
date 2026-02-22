/**
 * IOE TÁI TẠO SAN HÔ SOLVER V3.1 - GUI STYLED
 * Tính năng: Hiển thị Log căn lề trái, Phân biệt màu sắc các bước xử lý.
 */
(function() {
    // --- CẤU HÌNH API ---
    const WORKER_URL = "https://green-fire-6693.conwoodalluny67350w.workers.dev";
    const WORKER_AUTH = "Bearer 12345678";
    const ASSEMBLY_AI_KEY = "c542970535b040678d4cfacaa203cb75"; 

    let isAuto = false;
    let isSolving = false;
    window.lastSolvedNum = "";

    // --- KHỞI TẠO GUI ---
    const guiHTML = `
    <div id="ioe-gui" style="position: fixed; bottom: 20px; right: 20px; width: 320px; background: rgba(28, 28, 30, 0.98); border-radius: 12px; color: white; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; z-index: 99999; box-shadow: 0 8px 32px rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.1); overflow: hidden; transition: all 0.3s ease; text-align: left;">
        <div id="ioe-header" style="padding: 12px 15px; background: rgba(255,255,255,0.05); cursor: move; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1);">
            <span style="font-weight: bold; font-size: 13px; color: #3498db; letter-spacing: 0.5px;">🪸 TÁI TẠO SAN HÔ AI</span>
            <button id="ioe-minimize" style="background: none; border: none; color: #888; cursor: pointer; font-size: 24px; padding: 0 5px; line-height: 20px;">−</button>
        </div>
        <div id="ioe-content" style="padding: 15px;">
            <div style="margin-bottom: 12px;">
                <div style="font-size: 11px; color: #888; margin-bottom: 5px; text-transform: uppercase;">ĐÁP ÁN AI GỢI Ý:</div>
                <div id="ai-answer" style="font-size: 32px; font-weight: bold; color: #2ecc71; text-align: center; background: rgba(46, 204, 113, 0.1); border-radius: 8px; padding: 8px; border: 1px dashed rgba(46, 204, 113, 0.3);">--</div>
            </div>
            <div style="font-size: 11px; color: #888; margin-bottom: 5px; text-transform: uppercase;">NHẬT KÝ HỆ THỐNG:</div>
            <div id="ioe-log" style="height: 120px; background: #000; border-radius: 6px; padding: 10px; font-size: 11px; font-family: 'Consolas', monospace; overflow-y: auto; color: #bdc3c7; line-height: 1.5; border: 1px solid #333; text-align: left;">
                <div style="color: #3498db;">[System] Khởi động thành công...</div>
            </div>
            <div style="margin-top: 15px; display: flex; gap: 10px;">
                <button id="btn-auto" style="flex: 1; padding: 10px; border-radius: 8px; border: none; font-weight: bold; cursor: pointer; background: #e74c3c; color: white; transition: 0.3s; font-size: 12px;">AUTO: OFF</button>
                <button id="btn-solve-now" style="flex: 1; padding: 10px; border-radius: 8px; border: none; font-weight: bold; cursor: pointer; background: #3498db; color: white; font-size: 12px;">GIẢI CÂU NÀY</button>
            </div>
        </div>
    </div>
    <div id="ioe-bubble" style="position: fixed; bottom: 20px; right: 20px; width: 55px; height: 55px; background: #3498db; border-radius: 50%; display: none; align-items: center; justify-content: center; cursor: pointer; z-index: 99999; box-shadow: 0 4px 20px rgba(0,0,0,0.4); font-size: 24px; opacity: 0.8; transition: opacity 0.3s;">🪸</div>
    `;

    const container = document.createElement('div');
    container.innerHTML = guiHTML;
    document.body.appendChild(container);

    // --- TRUY XUẤT PHẦN TỬ GUI ---
    const gui = document.getElementById('ioe-gui');
    const bubble = document.getElementById('ioe-bubble');
    const logEl = document.getElementById('ioe-log');
    const ansEl = document.getElementById('ai-answer');
    const btnAuto = document.getElementById('btn-auto');

    /**
     * Hàm thêm log với màu sắc tùy chỉnh
     * @param {string} msg Nội dung log
     * @param {string} color Mã màu hex hoặc tên màu
     */
    function addLog(msg, color = "#bdc3c7") {
        const div = document.createElement('div');
        div.style.color = color;
        div.style.marginBottom = "2px";
        div.innerText = `> ${msg}`;
        logEl.appendChild(div);
        logEl.scrollTop = logEl.scrollHeight;
    }

    // Kéo thả GUI
    let isDragging = false, offset = [0, 0];
    document.getElementById('ioe-header').onmousedown = (e) => {
        isDragging = true;
        offset = [gui.offsetLeft - e.clientX, gui.offsetTop - e.clientY];
    };
    document.onmousemove = (e) => {
        if (!isDragging) return;
        gui.style.left = (e.clientX + offset[0]) + 'px';
        gui.style.top = (e.clientY + offset[1]) + 'px';
        gui.style.bottom = 'auto'; gui.style.right = 'auto';
    };
    document.onmouseup = () => isDragging = false;

    // Thu nhỏ / Mở rộng
    document.getElementById('ioe-minimize').onclick = () => { gui.style.display = 'none'; bubble.style.display = 'flex'; };
    bubble.onclick = () => { gui.style.display = 'block'; bubble.style.display = 'none'; };

    // Nút Auto
    btnAuto.onclick = () => {
        isAuto = !isAuto;
        btnAuto.style.background = isAuto ? '#2ecc71' : '#e74c3c';
        btnAuto.innerText = isAuto ? 'AUTO: ON' : 'AUTO: OFF';
        addLog(isAuto ? "Chế độ tự động: BẬT" : "Chế độ tự động: TẮT", isAuto ? "#2ecc71" : "#e74c3c");
    };

    document.getElementById('btn-solve-now').onclick = () => solve();

    // --- LOGIC XỬ LÝ ---
    async function getTranscript(audioUrl) {
        addLog("Gửi audio tới AssemblyAI...", "#f1c40f"); // Màu vàng khi gửi đi
        try {
            const response = await fetch("https://api.assemblyai.com/v2/transcript", {
                method: "POST",
                headers: { "authorization": ASSEMBLY_AI_KEY, "content-type": "application/json" },
                body: JSON.stringify({ audio_url: audioUrl })
            });
            const data = await response.json();
            const transcriptId = data.id;
            while (true) {
                const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
                    headers: { "authorization": ASSEMBLY_AI_KEY }
                });
                const pollData = await pollResponse.json();
                if (pollData.status === "completed") {
                    addLog("AssemblyAI phản hồi thành công.", "#2ecc71"); // Màu xanh khi nhận về
                    return pollData.text;
                }
                if (pollData.status === "error") throw new Error("AssemblyAI Error");
                await new Promise(r => setTimeout(r, 1000));
            }
        } catch (e) { 
            addLog("Lỗi AssemblyAI: " + e.message, "#e74c3c");
            return ""; 
        }
    }

    function getFullTextFromNode(nodePath) {
        let rootNode = cc.find(nodePath);
        if (!rootNode) return "";
        let texts = [];
        const collect = (node) => {
            let lbl = node.getComponent(cc.Label) || node.getComponent(cc.RichText);
            if (lbl && lbl.string) {
                let cleanText = lbl.string.replace(/<[^>]*>/g, '').trim();
                if (cleanText) texts.push(cleanText);
            }
            node.children.forEach(collect);
        };
        collect(rootNode);
        return texts.join(" ");
    }

    async function solve() {
        if (isSolving) return;
        isSolving = true;
        ansEl.innerText = "⏳";
        ansEl.style.color = "#f1c40f";
        
        try {
            let audioNode = cc.find("Canvas/GAME_PLAY/nTracNghiem/nAudioQuest");
            if (!audioNode || !audioNode.active) { 
                addLog("Chờ màn hình câu hỏi...", "#888");
                isSolving = false; return; 
            }
            
            let audioComp = audioNode.getComponent("AudioContent");
            let audioUrl = audioComp ? audioComp.remoteSound : null;
            if (!audioUrl) { addLog("Lỗi: Không tìm thấy link audio.", "#e74c3c"); isSolving = false; return; }

            const transcript = await getTranscript(audioUrl);
            if (!transcript) { isSolving = false; return; }

            let question = getFullTextFromNode("Canvas/GAME_PLAY/nTracNghiem/nAudioQuest/audioSprite/audioTxtScrollView");
            let ansA = getFullTextFromNode("Canvas/GAME_PLAY/nTracNghiem/nAudioQuest/answer_a");
            let ansB = getFullTextFromNode("Canvas/GAME_PLAY/nTracNghiem/nAudioQuest/answer_b");
            let ansC = getFullTextFromNode("Canvas/GAME_PLAY/nTracNghiem/nAudioQuest/answer_C");
            let ansD = getFullTextFromNode("Canvas/GAME_PLAY/nTracNghiem/nAudioQuest/answer_d");

            addLog("Đang gửi dữ liệu tới LLM AI...", "#f1c40f"); // Màu vàng khi gửi đi
            const response = await fetch(WORKER_URL, {
                method: "POST",
                headers: { "Authorization": WORKER_AUTH, "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    systemPrompt: "Return ONLY the letter A, B, C, or D.", 
                    prompt: `Transcript: "${transcript}"\nQ: ${question}\nA: ${ansA}\nB: ${ansB}\nC: ${ansC}\nD: ${ansD}` 
                }),
            });
            const data = await response.json();
            if (data.response) {
                const choice = data.response.trim().toUpperCase().match(/[A-D]/)?.[0];
                if (choice) {
                    ansEl.innerText = choice;
                    ansEl.style.color = "#2ecc71"; // Màu xanh cho đáp án
                    addLog(`AI trả lời: Đáp án ${choice}`, "#2ecc71"); // Màu xanh khi có đáp án
                }
            }
        } catch (e) { 
            addLog("Lỗi hệ thống: " + e.message, "#e74c3c");
            ansEl.innerText = "ERR";
        }
        isSolving = false;
    }

    // Vòng lặp quét câu hỏi tự động
    setInterval(() => {
        if (isAuto && !isSolving) {
            let audioQuest = cc.find("Canvas/GAME_PLAY/nTracNghiem/nAudioQuest");
            if (audioQuest && audioQuest.active) {
                let numNode = cc.find("Canvas/GAME_PLAY/nTracNghiem/nAudioQuest/audioSprite/QUEST_NUMBER/number_lbl");
                let currentNum = numNode ? numNode.getComponent(cc.Label).string : "";
                if (window.lastSolvedNum !== currentNum && currentNum !== "") {
                    window.lastSolvedNum = currentNum;
                    addLog(`Phát hiện câu mới: ${currentNum}`, "#3498db");
                    solve(); 
                }
            }
        }
    }, 2000);

})();
