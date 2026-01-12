window.STPhone = window.STPhone || {};
window.STPhone.Apps = window.STPhone.Apps || {};

window.STPhone.Apps.Streaming = (function() {
    'use strict';

    // ========== AI Generation Helper ==========
    function getSlashCommandParser() {
        return window.SillyTavern?.getContext()?.SlashCommandParser || window.SlashCommandParser;
    }

    function normalizeModelOutput(raw) {
        if (raw == null) return '';
        if (typeof raw === 'string') return raw;
        if (typeof raw?.content === 'string') return raw.content;
        if (typeof raw?.text === 'string') return raw.text;
        const choiceContent = raw?.choices?.[0]?.message?.content;
        if (typeof choiceContent === 'string') return choiceContent;
        const dataContent = raw?.data?.content;
        if (typeof dataContent === 'string') return dataContent;
        try {
            return JSON.stringify(raw);
        } catch (e) {
            return String(raw);
        }
    }

    async function generateWithProfile(promptOrMessages, maxTokens = 2048) {
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        const profileId = settings.connectionProfileId;
        const debugId = Date.now();
        const startedAt = performance?.now?.() || 0;

        const messages = Array.isArray(promptOrMessages)
            ? promptOrMessages
            : [{ role: 'user', content: promptOrMessages }];

        try {
            const context = window.SillyTavern?.getContext?.();
            if (!context) throw new Error('SillyTavern context not available');

            if (profileId) {
                const connectionManager = context.ConnectionManagerRequestService;
                if (connectionManager && typeof connectionManager.sendRequest === 'function') {
                    const overrides = {};
                    if (maxTokens) {
                        overrides.max_tokens = maxTokens;
                    }

                    const result = await connectionManager.sendRequest(
                        profileId,
                        messages,
                        maxTokens,
                        {},
                        overrides
                    );

                    const text = normalizeModelOutput(result);
                    return String(text || '').trim();
                }
            }

            // Fallback
            const fallbackPrompt = Array.isArray(promptOrMessages)
                ? promptOrMessages.map(m => `${m.role}: ${m.content}`).join('\n\n')
                : promptOrMessages;

            const parser = getSlashCommandParser();
            const genCmd = parser?.commands['genraw'] || parser?.commands['gen'];
            if (!genCmd) throw new Error('AI 명령어를 찾을 수 없습니다');

            const result = await genCmd.callback({ quiet: 'true' }, fallbackPrompt);
            return String(result || '').trim();

        } catch (e) {
            const errorStr = String(e?.message || e || '');
            if (errorStr.includes('PROHIBITED_CONTENT') ||
                errorStr.includes('SAFETY') ||
                errorStr.includes('blocked') ||
                errorStr.includes('content filter')) {
                return '';
            }
            console.error('[Streaming] generateWithProfile failed:', e);
            throw e;
        }
    }

    const css = `
        <style>
            .st-streaming-app {
                position: absolute; top: 0; left: 0;
                width: 100%; height: 100%; z-index: 999;
                display: flex; flex-direction: column;
                background: #0e0e10;
                color: #efeff1;
                font-family: var(--pt-font, -apple-system, sans-serif);
                box-sizing: border-box;
            }

            /* Header */
            .st-streaming-header {
                padding: 15px 20px;
                flex-shrink: 0;
                background: linear-gradient(135deg, #9146ff 0%, #772ce8 100%);
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .st-streaming-title {
                font-size: 20px;
                font-weight: 700;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .st-streaming-profile-btn {
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                width: 36px; height: 36px;
                border-radius: 50%;
                font-size: 18px;
                cursor: pointer;
            }

            /* Main Content */
            .st-streaming-content {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
            }

            /* Home Screen */
            .st-streaming-home-card {
                background: #18181b;
                border-radius: 12px;
                padding: 24px;
                margin-bottom: 15px;
                text-align: center;
            }
            .st-streaming-home-icon {
                font-size: 48px;
                margin-bottom: 12px;
            }
            .st-streaming-home-title {
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 8px;
            }
            .st-streaming-home-desc {
                font-size: 14px;
                color: #adadb8;
                margin-bottom: 20px;
            }
            .st-streaming-start-btn {
                background: #9146ff;
                color: white;
                border: none;
                padding: 14px 32px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: background 0.2s;
            }
            .st-streaming-start-btn:hover {
                background: #772ce8;
            }

            /* Stream Setup */
            .st-streaming-setup {
                background: #18181b;
                border-radius: 12px;
                padding: 20px;
            }
            .st-streaming-setup-title {
                font-size: 16px;
                font-weight: 600;
                margin-bottom: 16px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .st-streaming-input {
                width: 100%;
                padding: 14px;
                border: 1px solid #3d3d3d;
                border-radius: 8px;
                background: #0e0e10 !important;
                color: #efeff1 !important;
                font-size: 15px;
                margin-bottom: 12px;
                box-sizing: border-box;
                outline: none;
                -webkit-text-fill-color: #efeff1 !important;
            }
            .st-streaming-input::placeholder {
                color: #adadb8 !important;
                -webkit-text-fill-color: #adadb8 !important;
            }
            .st-streaming-input:focus {
                border-color: #9146ff;
                background: #0e0e10 !important;
                color: #efeff1 !important;
                -webkit-text-fill-color: #efeff1 !important;
            }
            #st-streaming-title {
                background: #0e0e10 !important;
                color: #efeff1 !important;
                -webkit-text-fill-color: #efeff1 !important;
            }
            #st-streaming-title:focus {
                background: #0e0e10 !important;
                color: #efeff1 !important;
                -webkit-text-fill-color: #efeff1 !important;
            }
            .st-streaming-textarea {
                width: 100%;
                padding: 14px;
                border: 1px solid #3d3d3d;
                border-radius: 8px;
                background: #0e0e10 !important;
                color: #efeff1 !important;
                font-size: 15px;
                margin-bottom: 12px;
                box-sizing: border-box;
                outline: none;
                resize: none;
                min-height: 80px;
                -webkit-text-fill-color: #efeff1 !important;
            }
            .st-streaming-textarea::placeholder {
                color: #adadb8 !important;
                -webkit-text-fill-color: #adadb8 !important;
            }
            .st-streaming-textarea:focus {
                border-color: #9146ff;
                background: #0e0e10 !important;
                color: #efeff1 !important;
                -webkit-text-fill-color: #efeff1 !important;
            }
            .st-streaming-toggle-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 0;
                border-bottom: 1px solid #3d3d3d;
            }
            .st-streaming-toggle-label {
                font-size: 14px;
            }
            .st-streaming-toggle-desc {
                font-size: 12px;
                color: #adadb8;
                margin-top: 2px;
            }
            .st-streaming-toggle {
                position: relative;
                width: 44px;
                height: 24px;
                background: #3d3d3d;
                border-radius: 12px;
                cursor: pointer;
                transition: background 0.3s;
                flex-shrink: 0;
            }
            .st-streaming-toggle.active {
                background: #9146ff;
            }
            .st-streaming-toggle::after {
                content: '';
                position: absolute;
                top: 2px;
                left: 2px;
                width: 20px;
                height: 20px;
                background: white;
                border-radius: 50%;
                transition: transform 0.3s;
            }
            .st-streaming-toggle.active::after {
                transform: translateX(20px);
            }
            .st-streaming-setup-actions {
                display: flex;
                gap: 10px;
                margin-top: 20px;
            }
            .st-streaming-btn {
                flex: 1;
                padding: 14px;
                border: none;
                border-radius: 8px;
                font-size: 15px;
                font-weight: 600;
                cursor: pointer;
            }
            .st-streaming-btn.cancel {
                background: #3d3d3d;
                color: #efeff1;
            }
            .st-streaming-btn.go-live {
                background: #9146ff;
                color: white;
            }

            /* Live Stream Screen */
            .st-streaming-live {
                display: flex;
                flex-direction: column;
                height: 100%;
            }
            .st-streaming-live-header {
                padding: 12px 15px;
                background: #18181b;
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-shrink: 0;
                border-bottom: 1px solid #3d3d3d;
            }
            .st-streaming-live-info {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .st-streaming-live-badge {
                background: #eb0400;
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 700;
                animation: livePulse 1.5s infinite;
            }
            @keyframes livePulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }
            .st-streaming-viewer-count {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 14px;
                color: #bf94ff;
            }
            .st-streaming-end-btn {
                background: #eb0400;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
            }

            /* Stream Display */
            .st-streaming-display {
                flex: 0 0 auto;
                background: #000;
                border-radius: 8px;
                margin: 10px;
                aspect-ratio: 16 / 9;
                max-height: 200px;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                position: relative;
            }
            .st-streaming-display-content {
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 15px;
                box-sizing: border-box;
                font-size: 14px;
                color: #efeff1;
                text-align: center;
                line-height: 1.4;
            }
            .st-streaming-display img {
                width: 100%;
                height: 100%;
                object-fit: contain;
            }
            .st-streaming-display-title {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                background: linear-gradient(transparent, rgba(0,0,0,0.8));
                padding: 20px 12px 10px;
                font-size: 13px;
                font-weight: 500;
            }

            /* Chat Area */
            .st-streaming-chat {
                flex: 1;
                display: flex;
                flex-direction: column;
                background: #18181b;
                margin: 0 10px 10px;
                border-radius: 8px;
                overflow: hidden;
            }
            .st-streaming-chat-header {
                padding: 10px 15px;
                border-bottom: 1px solid #3d3d3d;
                font-size: 14px;
                font-weight: 600;
            }
            .st-streaming-chat-messages {
                flex: 1;
                overflow-y: auto;
                padding: 10px 15px;
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            .st-streaming-chat-msg {
                font-size: 13px;
                line-height: 1.4;
                animation: chatFadeIn 0.3s ease;
            }
            @keyframes chatFadeIn {
                from { opacity: 0; transform: translateY(5px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .st-streaming-chat-msg .username {
                font-weight: 600;
                color: #bf94ff;
                margin-right: 6px;
            }
            .st-streaming-chat-msg .donation {
                background: linear-gradient(135deg, #ff6b6b, #ffa500);
                color: white;
                padding: 8px 12px;
                border-radius: 8px;
                margin: 4px 0;
            }
            .st-streaming-chat-msg .donation-amount {
                font-weight: 700;
                display: flex;
                align-items: center;
                gap: 4px;
                margin-bottom: 4px;
            }
            .st-streaming-chat-msg .contact-msg {
                background: rgba(145, 70, 255, 0.2);
                border-left: 3px solid #9146ff;
                padding: 8px 12px;
                border-radius: 0 8px 8px 0;
                margin: 4px 0;
            }

            /* Action Input */
            /* 이 부분을 찾아서 아래처럼 바꿔보세요! */
.st-streaming-action-area {
    padding: 10px 15px;
    background: #0e0e10;
    border-top: 1px solid #3d3d3d;
    display: flex;
    gap: 10px;
    flex-shrink: 0;
}
            .st-streaming-action-input {
                flex: 1;
                padding: 12px;
                border: 1px solid #3d3d3d;
                border-radius: 8px;
                background: #0e0e10 !important;
                color: #efeff1 !important;
                font-size: 14px;
                outline: none;
                -webkit-text-fill-color: #efeff1 !important;
            }
            .st-streaming-action-input::placeholder {
                color: #adadb8 !important;
                -webkit-text-fill-color: #adadb8 !important;
            }
            .st-streaming-action-input:focus {
                border-color: #9146ff;
                background: #0e0e10 !important;
                color: #efeff1 !important;
                -webkit-text-fill-color: #efeff1 !important;
            }
            #st-streaming-action-input {
                background: #0e0e10 !important;
                color: #efeff1 !important;
                -webkit-text-fill-color: #efeff1 !important;
            }
            #st-streaming-action-input:focus {
                background: #0e0e10 !important;
                color: #efeff1 !important;
                -webkit-text-fill-color: #efeff1 !important;
            }
            /* 모든 입력 필드에 대한 범용 CSS */
            .st-streaming-setup input[type="text"],
            .st-streaming-setup input,
            .st-streaming-app input {
                background: #0e0e10 !important;
                color: #efeff1 !important;
                -webkit-text-fill-color: #efeff1 !important;
            }
            .st-streaming-setup input[type="text"]:focus,
            .st-streaming-setup input:focus,
            .st-streaming-app input:focus {
                background: #0e0e10 !important;
                color: #efeff1 !important;
                -webkit-text-fill-color: #efeff1 !important;
            }
            .st-streaming-action-btn {
                background: #9146ff;
                color: white;
                border: none;
                padding: 12px 20px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                white-space: nowrap;
            }

            /* End Screen */
            .st-streaming-end-screen {
                text-align: center;
                padding: 40px 20px;
            }
            .st-streaming-end-icon {
                font-size: 64px;
                margin-bottom: 16px;
            }
            .st-streaming-end-title {
                font-size: 24px;
                font-weight: 700;
                margin-bottom: 8px;
            }
            .st-streaming-end-subtitle {
                font-size: 14px;
                color: #adadb8;
                margin-bottom: 24px;
            }
            .st-streaming-stats {
                display: flex;
                justify-content: center;
                gap: 24px;
                margin-bottom: 24px;
            }
            .st-streaming-stat {
                text-align: center;
            }
            .st-streaming-stat-value {
                font-size: 28px;
                font-weight: 700;
                color: #9146ff;
            }
            .st-streaming-stat-label {
                font-size: 12px;
                color: #adadb8;
            }
            .st-streaming-end-btn-home {
                background: #9146ff;
                color: white;
                border: none;
                padding: 14px 32px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
            }

            /* Profile Screen */
            .st-streaming-profile {
                padding: 20px;
            }
            .st-streaming-profile-header {
                display: flex;
                align-items: center;
                gap: 15px;
                margin-bottom: 24px;
            }
            .st-streaming-profile-avatar {
                width: 60px; height: 60px;
                border-radius: 50%;
                background: #9146ff;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 28px;
            }
            .st-streaming-profile-name {
                font-size: 20px;
                font-weight: 700;
            }
            .st-streaming-profile-stats {
                display: flex;
                gap: 20px;
            }
            .st-streaming-profile-stat {
                text-align: center;
            }
            .st-streaming-profile-stat-value {
                font-size: 18px;
                font-weight: 700;
                color: #9146ff;
            }
            .st-streaming-profile-stat-label {
                font-size: 11px;
                color: #adadb8;
            }
            .st-streaming-section-title {
                font-size: 16px;
                font-weight: 600;
                margin-bottom: 12px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .st-streaming-history-item {
                background: #18181b;
                border-radius: 8px;
                padding: 14px;
                margin-bottom: 10px;
            }
            .st-streaming-history-title {
                font-size: 14px;
                font-weight: 600;
                margin-bottom: 6px;
            }
            .st-streaming-history-meta {
                font-size: 12px;
                color: #adadb8;
                display: flex;
                gap: 15px;
            }
            .st-streaming-empty {
                text-align: center;
                padding: 40px;
                color: #adadb8;
            }

            /* Back button */
            .st-streaming-back-btn {
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                padding: 5px;
            }

            /* Loading */
            .st-streaming-loading {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                padding: 20px;
                color: #adadb8;
            }
            .st-streaming-spinner {
                width: 20px; height: 20px;
                border: 2px solid #3d3d3d;
                border-top-color: #9146ff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        </style>
    `;

    // ========== State ==========
    let isLive = false;
    let streamData = null;
    let totalEarnings = 0;
    let viewerCount = 0;
    let followerCount = 0;
    let streamHistory = [];
    let autoImageEnabled = false;
    let isGenerating = false;
    let isReplayMode = false;
    let replayData = null;
    let replayIndex = 0;

    // ========== Storage ==========
    function getStorageKey() {
        const context = window.SillyTavern?.getContext?.();
        if (!context?.chatId) return null;
        return 'st_phone_streaming_' + context.chatId;
    }

    function loadData() {
        const key = getStorageKey();
        if (!key) {
            resetData();
            return;
        }
        try {
            const saved = localStorage.getItem(key);
            if (saved) {
                const data = JSON.parse(saved);
                streamHistory = data.streamHistory || [];
                totalEarnings = data.totalEarnings || 0;
                followerCount = data.followerCount || 0;
            } else {
                resetData();
            }
        } catch (e) {
            resetData();
        }
    }

    function saveData() {
        const key = getStorageKey();
        if (!key) return;
        try {
            localStorage.setItem(key, JSON.stringify({
                streamHistory,
                totalEarnings,
                followerCount
            }));
        } catch (e) {
            console.error('[Streaming] Save failed:', e);
        }
    }

    function resetData() {
        streamHistory = [];
        totalEarnings = 0;
        followerCount = 0;
    }

    // ========== Utility ==========
    function getUserName() {
        const settings = window.STPhone?.Apps?.Settings?.getSettings?.() || {};
        if (settings.userName) return settings.userName;
        const ctx = window.SillyTavern?.getContext?.();
        return ctx?.name1 || 'User';
    }

    function formatMoney(amount) {
        const Bank = window.STPhone?.Apps?.Bank;
        if (Bank && typeof Bank.formatAmount === 'function') {
            return Bank.formatAmount(amount);
        }
        return amount.toLocaleString() + '원';
    }

    // ========== 방송 프로필 저장/불러오기 ==========
    function getStreamProfile() {
        const saved = localStorage.getItem('st-streaming-profile');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) { }
        }
        return { nickname: '', concept: '', outfit: '' };
    }

    function saveStreamProfile(profile) {
        localStorage.setItem('st-streaming-profile', JSON.stringify(profile));
    }

    // RP 날짜 가져오기 (캘린더 앱 연동)
    function getRpDateString() {
        const Calendar = window.STPhone?.Apps?.Calendar;
        if (Calendar && typeof Calendar.getRpDate === 'function') {
            const rpDate = Calendar.getRpDate();
            if (rpDate) {
                return `${rpDate.year}년 ${rpDate.month}월 ${rpDate.day}일 ${rpDate.dayOfWeek || ''}`.trim();
            }
        }
        // 캘린더 없으면 현재 날짜
        const now = new Date();
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        return `${now.getFullYear()}년 ${now.getMonth()+1}월 ${now.getDate()}일 ${days[now.getDay()]}요일`;
    }

    // 폰 로그 숨김 처리 (UI에서만 숨기고 프롬프트에는 포함)
    const FLING_LOG_MARKER = '[📺';
    let phoneLogObserver = null;

    function hidePhoneLogs() {
        $('#chat .mes').each(function() {
            const $mes = $(this);
            const mesText = $mes.find('.mes_text').text();
            if (mesText.includes(FLING_LOG_MARKER)) {
                $mes.css('display', 'none');
            }
        });
    }

    function setupPhoneLogHider() {
        // 기존 로그 숨기기
        hidePhoneLogs();
        
        // 이미 옵저버가 있으면 스킵
        if (phoneLogObserver) return;
        
        const chatContainer = document.getElementById('chat');
        if (!chatContainer) return;
        
        // 새 메시지 추가 시 자동으로 숨기기
        phoneLogObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        const mesText = node.querySelector?.('.mes_text');
                        if (mesText && mesText.textContent.includes(FLING_LOG_MARKER)) {
                            node.style.display = 'none';
                        }
                    }
                });
            });
        });
        
        phoneLogObserver.observe(chatContainer, { childList: true, subtree: true });
    }

    function addHiddenLog(speaker, text) {
        if (!window.SillyTavern) return;
        const context = window.SillyTavern.getContext();
        if (!context || !context.chat) return;

        // 프롬프트에 포함되는 일반 메시지로 추가
        context.chat.push({
            name: speaker,
            is_user: false,
            is_system: false,
            send_date: Date.now(),
            mes: text
        });

        if (window.SlashCommandParser && window.SlashCommandParser.commands['savechat']) {
            window.SlashCommandParser.commands['savechat'].callback({});
        }

        // UI에서 즉시 숨기기
        setTimeout(hidePhoneLogs, 50);
    }

    // ========== Image Generation ==========
    async function generateStreamImage(action) {
        try {
            const parser = getSlashCommandParser();
            const sdCmd = parser?.commands['sd'] || parser?.commands['imagine'];

            if (!sdCmd) {
                console.warn('[Streaming] Image generation extension not available');
                return null;
            }

            const settings = window.STPhone?.Apps?.Settings?.getSettings?.() || {};
            const userTags = settings.userTags || '';
            const myName = getUserName();

            // Generate tags for the stream scene
            const tagPrompt = `
### Task: Generate Stable Diffusion tags for a livestream scene.

### Streamer Info
Name: ${myName}
Visual Tags: ${userTags}

### Stream Info
Title: ${streamData?.title || 'Livestream'}
Current Action: ${action}

### Instructions
Generate comma-separated tags for this streaming scene.
Include: streamer appearance, action, streaming setup, mood, lighting.
Focus on the action being performed.
Output ONLY tags, no explanation.

### Tags:`;

            const tags = await generateWithProfile(tagPrompt, 256);
            const finalPrompt = tags || `1girl, streaming, webcam, ${action}`;

            const imgResult = await sdCmd.callback({ quiet: 'true' }, finalPrompt);
            if (typeof imgResult === 'string' && imgResult.length > 10) {
                return imgResult;
            }
        } catch (e) {
            console.error('[Streaming] Image generation failed:', e);
        }
        return null;
    }

    // ========== AI Response Generation ==========
    async function generateViewerResponse(action, includeContacts = true) {
        const settings = window.STPhone?.Apps?.Settings?.getSettings?.() || {};
        const myName = getUserName();
        const maxTokens = settings.maxContextTokens || 4096;
        const prefill = settings.prefill || '';

        // Get contacts info
        let contactsInfo = '';
        if (includeContacts) {
            const contacts = window.STPhone?.Apps?.Contacts?.getAllContacts?.() || [];
            if (contacts.length > 0) {
                contactsInfo = contacts.map(c => {
                    return `- ${c.name}: ${c.persona || '(no personality set)'} / Tags: ${c.tags || 'none'}`;
                }).join('\n');
            }
        }

        // Get chat history
        let chatHistory = '';
        const ctx = window.SillyTavern?.getContext() || {};
        if (ctx.chat && ctx.chat.length > 0) {
            const recentChat = ctx.chat.slice(-30);
            chatHistory = recentChat.map(m => {
                const name = m.is_user ? myName : (m.name || 'Assistant');
                return `${name}: ${m.mes}`;
            }).join('\n');
        }

        // 화폐 정보 가져오기 (은행 앱 연동)
        const Bank = window.STPhone?.Apps?.Bank;
        let currencySymbol = '원';
        let currencyCode = 'KRW';
        if (Bank && typeof Bank.getCurrency === 'function') {
            currencyCode = Bank.getCurrency();
            const currencyMap = {
                'KRW': '원', 'USD': '$', 'EUR': '€', 'JPY': '¥', 'GBP': '£', 'CNY': '¥'
            };
            currencySymbol = currencyMap[currencyCode] || '원';
        }

        // 화폐별 후원 금액 범위 설정
        const donationRanges = {
            'KRW': {
                regular: '1,000~10,000원',
                medium: '10,000~50,000원',
                big: '100,000~1,000,000원'
            },
            'USD': {
                regular: '$1~$10',
                medium: '$10~$50',
                big: '$100~$1,000'
            },
            'EUR': {
                regular: '€1~€10',
                medium: '€10~€50',
                big: '€100~€1,000'
            },
            'JPY': {
                regular: '¥100~¥1,000',
                medium: '¥1,000~¥5,000',
                big: '¥10,000~¥100,000'
            },
            'GBP': {
                regular: '£1~£10',
                medium: '£10~£50',
                big: '£100~£1,000'
            },
            'CNY': {
                regular: '¥5~¥50',
                medium: '¥50~¥300',
                big: '¥500~¥5,000'
            }
        };
        const ranges = donationRanges[currencyCode] || donationRanges['KRW'];

        // 화폐별 시청자 국적 설정 (언어는 모두 한국어, 유저네임만 국적에 맞게)
        const nationalityMap = {
            'KRW': {
                nationality: '한국인',
                usernameStyle: '한국어 또는 영어 닉네임 (예: 별빛소녀, xXGameMasterXx, 귀여운토끼, 시청자92)',
                exampleChat: '[별빛소녀]: 헐 뭐하는거야 ㅋㅋㅋ\n[xXGameMasterXx]: 오 방금 들어왔는데 뭐함?\n[귀여운토끼]: ㅎㅇㅎㅇ\n[시청자92]: 재밌냐 이거\n[익명이]: ㄹㅇ 뭔상황임'
            },
            'USD': {
                nationality: '미국인/국제 시청자',
                usernameStyle: '영어 닉네임 (예: starlightgirl, xXGameMasterXx, cutebunny22, viewer92, anon_user)',
                exampleChat: '[starlightgirl]: 헐 뭐하는거야 ㅋㅋㅋ\n[xXGameMasterXx]: 오 방금 들어왔는데 뭐함?\n[cutebunny22]: ㅎㅇㅎㅇ\n[viewer92]: 재밌냐 이거\n[anon_user]: ㄹㅇ 뭔상황임'
            },
            'EUR': {
                nationality: '유럽인 (다양한 국적 혼합)',
                usernameStyle: '유럽풍 영어 닉네임 (예: starlight_eu, GameMaster_DE, bunny_fr, viewer_uk, anon_es)',
                exampleChat: '[starlight_eu]: 헐 뭐하는거야 ㅋㅋㅋ\n[GameMaster_DE]: 오 방금 들어왔는데 뭐함?\n[bunny_fr]: ㅎㅇㅎㅇ\n[viewer_uk]: 재밌냐 이거\n[anon_es]: ㄹㅇ 뭔상황임'
            },
            'JPY': {
                nationality: '일본인',
                usernameStyle: '일본어 또는 영어 닉네임 (예: 星空少女, xXゲームマスターXx, かわいいうさぎ, 視聴者92, 匿名さん)',
                exampleChat: '[星空少女]: 헐 뭐하는거야 ㅋㅋㅋ\n[xXゲームマスターXx]: 오 방금 들어왔는데 뭐함?\n[かわいいうさぎ]: ㅎㅇㅎㅇ\n[視聴者92]: 재밌냐 이거\n[匿名さん]: ㄹㅇ 뭔상황임'
            },
            'GBP': {
                nationality: '영국인',
                usernameStyle: '영국풍 영어 닉네임 (예: starlight_uk, GameMaster_brit, bunnylove, viewer_london, anon_uk)',
                exampleChat: '[starlight_uk]: 헐 뭐하는거야 ㅋㅋㅋ\n[GameMaster_brit]: 오 방금 들어왔는데 뭐함?\n[bunnylove]: ㅎㅇㅎㅇ\n[viewer_london]: 재밌냐 이거\n[anon_uk]: ㄹㅇ 뭔상황임'
            },
            'CNY': {
                nationality: '중국인',
                usernameStyle: '중국어 또는 영어 닉네임 (예: 星光女孩, 游戏大师, 可爱兔子, 观众92, 匿名用户)',
                exampleChat: '[星光女孩]: 헐 뭐하는거야 ㅋㅋㅋ\n[游戏大师]: 오 방금 들어왔는데 뭐함?\n[可爱兔子]: ㅎㅇㅎㅇ\n[观众92]: 재밌냐 이거\n[匿名用户]: ㄹㅇ 뭔상황임'
            }
        };
        const nationalityInfo = nationalityMap[currencyCode] || nationalityMap['KRW'];

        // 커스텀 프롬프트 가져오기 (설정 앱에서)
        const flingPrompt = settings.flingStreamPrompt || null;

        // Build messages array
        const messages = [];

        // System prompt - 커스텀 또는 기본 프롬프트 사용
        let systemContent;
        if (flingPrompt) {
            // 커스텀 프롬프트 변수 치환
            systemContent = flingPrompt
                .replace(/\{\{contactsInfo\}\}/gi, contactsInfo || '(No contacts registered)')
                .replace(/\{\{chatHistory\}\}/gi, chatHistory || '(No recent history)')
                .replace(/\{\{myName\}\}/gi, myName)
                .replace(/\{\{userName\}\}/gi, myName)
                .replace(/\{\{userPersonality\}\}/gi, settings.userPersonality || '(not specified)')
                .replace(/\{\{userTags\}\}/gi, settings.userTags || '(not specified)')
                .replace(/\{\{followerCount\}\}/gi, followerCount)
                .replace(/\{\{viewerCount\}\}/gi, viewerCount)
                .replace(/\{\{streamTitle\}\}/gi, streamData?.title || 'Untitled Stream')
                .replace(/\{\{action\}\}/gi, action)
                .replace(/\{\{currencySymbol\}\}/gi, currencySymbol)
                .replace(/\{\{currencyCode\}\}/gi, currencyCode)
                .replace(/\{\{regularDonation\}\}/gi, ranges.regular)
                .replace(/\{\{mediumDonation\}\}/gi, ranges.medium)
                .replace(/\{\{bigDonation\}\}/gi, ranges.big)
                .replace(/\{\{nationality\}\}/gi, nationalityInfo.nationality)
                .replace(/\{\{usernameStyle\}\}/gi, nationalityInfo.usernameStyle)
                .replace(/\{\{exampleChat\}\}/gi, nationalityInfo.exampleChat);
        } else {
            // 기본 프롬프트 (화폐 동적 적용 + 현실적 반응 + 국적 기반 유저네임)
            const hasAppearanceInfo = settings.userTags && settings.userTags.trim().length > 0;
            const appearanceNote = hasAppearanceInfo
                ? `(Described as: ${settings.userTags})`
                : `(No appearance specified - treat as average/unknown looking person. Do NOT assume attractive.)`;

            // 스트리머 프로필 정보
            const streamerProfile = streamData?.profile || {};
            let streamerInfo = `Name: ${myName}`;
            if (streamerProfile.nickname && streamerProfile.nickname !== myName) {
                streamerInfo += `\nStream Nickname: ${streamerProfile.nickname}`;
            }
            if (streamerProfile.concept) {
                streamerInfo += `\nConcept/Gimmick: ${streamerProfile.concept}`;
            }
            if (streamerProfile.outfit) {
                streamerInfo += `\nOutfit: ${streamerProfile.outfit}`;
            }
            streamerInfo += `\nPersonality: ${settings.userPersonality || '(not specified)'}`;
            streamerInfo += `\nAppearance: ${appearanceNote}`;
            streamerInfo += `\nCurrent Followers: ${followerCount}`;

            systemContent = `### Registered Contacts (may appear in chat based on their personality)
${contactsInfo || '(No contacts registered)'}

### Streamer Profile
${streamerInfo}

### FLING LIVE STREAMING - REALISTIC CHAT SIMULATION

Generate REALISTIC livestream viewer chat for ${streamerProfile.nickname || myName}'s stream.
Viewers are ${nationalityInfo.nationality} - use appropriate usernames!

Stream Title: "${streamData?.title || 'Untitled Stream'}"
Current Viewers: ${viewerCount}
Current Action: "${action}"

### OUTPUT FORMAT (STRICT!)
LINE 1: [VIEWERS: number]
LINE 2+: [username]: message (one message per line)

Donation format: [username] donated X${currencySymbol}: message

### CRITICAL RULES - READ CAREFULLY!

**FORMAT RULES:**
1. NEVER use quotation marks ("") in chat messages! Write raw text only.
2. Output [VIEWERS: X] on the FIRST line, then chat messages.
3. Generate 3-8 messages. Each message = one line.
4. ALL messages must be in Korean (한국어)! Only USERNAMES reflect nationality.

**USERNAME STYLE (based on viewer nationality: ${nationalityInfo.nationality}):**
${nationalityInfo.usernameStyle}

**REALISM RULES:**
5. NOT everyone is nice! Include variety:
   - Supportive fans (30%)
   - Neutral observers (30%)
   - Skeptics/critics (20%)
   - Trolls/haters - mild negativity (10%)
   - Random/off-topic (10%)

6. APPEARANCE MATTERS:
   ${hasAppearanceInfo
     ? `- ${myName} is described as: ${settings.userTags}. React accordingly.`
     : `- No appearance info = assume AVERAGE looking. Do NOT call them handsome/pretty without reason!`}
   - If no visual shown, don't comment on looks
   - Some viewers may be rude about appearance
   - Don't always compliment - that's unrealistic

7. REALISTIC KOREAN CHAT STYLES (모든 채팅은 한국어로!):
   - Short messages: ㅋㅋ, ㅎㅇ, ㄷㄷ, 헐, 와, 뭐함
   - Typos/slang: ㄹㅇ, ㅇㅈ, ㄱㅇㄷ, 개웃김, 미쳤네
   - Questions: 뭐하는거임?, 이게뭔데, 왜함?
   - Skeptical: 뭐야이게, 어 그래서?, 재미없는데
   - Light trolling: ㅋㅋㅋ노잼, 나가요~, 뭔솰

8. DONATIONS (${currencyCode}):
   - ${ranges.regular}: Common (short supportive messages)
   - ${ranges.medium}: Uncommon, needs good content
   - ${ranges.big}: EXTREMELY RARE! Only for spectacular moments.
   - Most messages have NO donation!

9. VIEWER COUNT:
   - Boring content: viewers DECREASE (-5 to -20)
   - Normal content: slight change (-5 to +10)
   - Interesting: moderate increase (+10 to +30)
   - Viral moment: big jump (+30 to +100)

10. If registered contacts appear, they act according to their personality.

### EXAMPLE OUTPUT (Korean messages with ${nationalityInfo.nationality} usernames):
[VIEWERS: ${viewerCount + Math.floor(Math.random() * 20) - 5}]
${nationalityInfo.exampleChat}

### NOW GENERATE for action: "${action}"`;
        }

        // 메시지 배열 구성 - 프롬프트가 유저 메시지 위에 오도록
        // 1. 시스템 프롬프트
        messages.push({ role: 'system', content: systemContent });

        // 2. 유저 액션 (시스템 프롬프트 바로 다음)
        messages.push({
            role: 'user',
            content: `[${myName}'s action on stream]: ${action}\n\nGenerate viewer chat reactions:`
        });

        // 3. 그 다음에 스토리 컨텍스트 (선택적)
        if (ctx.chat && ctx.chat.length > 0) {
            const reverseChat = ctx.chat.slice().reverse();
            const collectedMessages = [];
            let currentTokens = 0;

            for (const m of reverseChat) {
                const msgContent = m.mes || '';
                const estimatedTokens = Math.ceil(msgContent.length / 2.5);
                if (currentTokens + estimatedTokens > maxTokens) break;
                collectedMessages.unshift({
                    role: m.is_user ? 'user' : 'assistant',
                    content: msgContent
                });
                currentTokens += estimatedTokens;
            }
            // 스토리 컨텍스트를 중간에 삽입 (시스템과 유저 액션 사이)
            messages.splice(1, 0, ...collectedMessages);
        }

        // Prefill
        if (prefill) {
            messages.push({ role: 'assistant', content: prefill });
        }

        try {
            const result = await generateWithProfile(messages, maxTokens);
            return result;
        } catch (e) {
            console.error('[Streaming] Failed to generate viewer response:', e);
            return '';
        }
    }

    // ========== Parse and Display Chat ==========
    function parseViewerChat(response) {
        const lines = response.split('\n').filter(l => l.trim());
        const chats = [];
        let newViewerCount = null;

        for (const line of lines) {
            // Check for viewer count first: [VIEWERS: X]
            const viewerMatch = line.match(/^\[?VIEWERS?\s*:\s*(\d+)\]?/i);
            if (viewerMatch) {
                newViewerCount = parseInt(viewerMatch[1]);
                continue;
            }

            // Donation format: 다양한 형식 지원
            // [username] donated X원: message
            // username donated $X: message
            // [유저] 후원 1000원: 메시지
            const donationMatch = line.match(/^\[?([^\]\d]+?)\]?\s*(?:donated|후원|도네이션)\s*[\$€¥£]?\s*([\d,]+)\s*[\$€¥£원]?\s*[:\uff1a]?\s*(.*)$/i);
            if (donationMatch) {
                const username = donationMatch[1].trim();
                const amount = parseInt(donationMatch[2].replace(/,/g, ''));
                let message = donationMatch[3].trim();
                // 따옴표 제거
                message = message.replace(/^"|"$/g, '').replace(/^'|'$/g, '').trim();

                chats.push({
                    type: 'donation',
                    username: username,
                    amount: amount,
                    message: message
                });
                continue;
            }

            // Regular chat: [username]: message or username: message
            const chatMatch = line.match(/^\[?([^\]:]+)\]?\s*:\s*(.+)$/);
            if (chatMatch) {
                const username = chatMatch[1].trim();
                // 따옴표 제거 처리
                let message = chatMatch[2].trim();
                message = message.replace(/^"|"$/g, '').replace(/^'|'$/g, '').trim();

                // Check if this is a registered contact
                const contacts = window.STPhone?.Apps?.Contacts?.getAllContacts?.() || [];
                const isContact = contacts.some(c =>
                    c.name.toLowerCase() === username.toLowerCase() ||
                    username.toLowerCase().includes(c.name.toLowerCase())
                );

                chats.push({
                    type: isContact ? 'contact' : 'chat',
                    username,
                    message
                });
            }
        }

        // Update viewer count if AI provided one
        if (newViewerCount !== null) {
            viewerCount = newViewerCount;
            if (streamData) {
                streamData.maxViewers = Math.max(streamData.maxViewers || 0, viewerCount);
            }
            $('#st-streaming-viewer-count').text(viewerCount.toLocaleString());

            // Store viewerCount in last chat for replay
            if (chats.length > 0) {
                chats[chats.length - 1].viewerCount = viewerCount;
            }
        }

        // 채팅이 없어도 시청자수는 업데이트됨 - 기본 채팅 생성 안함 (AI 응답 실패시 로그만)
        // No chats parsed - just return empty array

        return chats;
    }

    async function displayChatsSequentially(chats) {
        const $chatMessages = $('#st-streaming-chat-messages');
        if (!$chatMessages.length) return;

        // [수정 1] 로그를 담아둘 바구니(배열)를 만듭니다.
        let logBuffer = [];

        for (const chat of chats) {
            // 메시지 간 랜덤 딜레이 (0.3 ~ 1.5초)
            const delay = 300 + Math.random() * 1200;
            await new Promise(resolve => setTimeout(resolve, delay));

            if (!isLive) break; // 방송 종료시 중단

            let html = '';
            if (chat.type === 'donation') {
                html = `
                    <div class="st-streaming-chat-msg">
                        <div class="donation">
                            <div class="donation-amount">💎 ${chat.username} - ${formatMoney(chat.amount)}</div>
                            <div>${chat.message || '후원 감사합니다!'}</div>
                        </div>
                    </div>
                `;
                // 수익 및 은행 추가
                totalEarnings += chat.amount;
                streamData.earnings = (streamData.earnings || 0) + chat.amount;

                const Bank = window.STPhone?.Apps?.Bank;
                if (Bank && typeof Bank.addBalance === 'function') {
                    Bank.addBalance(chat.amount, `${chat.username}님 Fling 후원`);
                }

                // [수정 2] addHiddenLog 대신 바구니(logBuffer)에 담습니다.
                logBuffer.push(`[📺 FLING DONATION] ${chat.username}님이 ${chat.amount}원을 후원하며 메시지를 보냈습니다: "${chat.message || '후원 감사합니다!'}"`);

            } else if (chat.type === 'contact') {
                html = `
                    <div class="st-streaming-chat-msg">
                        <div class="contact-msg">
                            <span class="username" style="color: #00ff7f;">⭐ ${chat.username}</span>
                            <span>${chat.message}</span>
                        </div>
                    </div>
                `;
                // [수정 2] 연락처 채팅도 바구니에 담습니다.
                logBuffer.push(`[📺 FLING CONTACT CHAT] ${chat.username}: "${chat.message}"`);

            } else {
                html = `
                    <div class="st-streaming-chat-msg">
                        <span class="username">${chat.username}</span>
                        <span>${chat.message}</span>
                    </div>
                `;
                // [수정 2] 일반 채팅도 바구니에 담습니다.
                logBuffer.push(`[📺 FLING VIEWER] ${chat.username}: "${chat.message}"`);
            }

            $chatMessages.append(html);
            $chatMessages.scrollTop($chatMessages[0].scrollHeight);
        }

        // [수정 3] 채팅이 화면에 다 올라온 뒤, 모아둔 로그를 한 번에 묶어서(줄바꿈 \n 포함) 저장합니다.
        if (logBuffer.length > 0) {
            addHiddenLog('System', logBuffer.join('\n'));
        }
    }

    // ========== Stream Actions ==========
    async function handleStreamAction() {
        const $input = $('#st-streaming-action-input');
        const action = $input.val().trim();
        if (!action || isGenerating) return;

        isGenerating = true;
        $input.val('');

        // Update display
        const $display = $('#st-streaming-display-content');
        const $actionBtn = $('#st-streaming-action-btn');
        $actionBtn.prop('disabled', true).text('생성중...');

        // Show action on stream display
        let imgUrl = null;
        if (autoImageEnabled) {
            $display.html('<div class="st-streaming-loading"><div class="st-streaming-spinner"></div>이미지 생성 중...</div>');
            imgUrl = await generateStreamImage(action);
            if (imgUrl && isLive) {
                $display.html(`<img src="${imgUrl}" alt="Stream">`);
            } else {
                $display.html(`<div style="padding: 20px;">${action}</div>`);
            }
        } else {
            $display.html(`<div style="padding: 20px; font-size: 16px;">${action}</div>`);
        }

        // 유저 행동 히든로그 추가
        const profile = streamData?.profile || {};
        const streamerName = profile.nickname || getUserName();
        addHiddenLog(streamerName, `[📺 FLING STREAMER ACTION] ${action}`);

        // Generate viewer response
        const response = await generateViewerResponse(action);
        const chats = parseViewerChat(response);

        // Save action and chats for replay
        if (streamData && streamData.actions) {
            streamData.actions.push({ action, chats, imgUrl });
        }

        // Display chats sequentially
        await displayChatsSequentially(chats);

        isGenerating = false;
        $actionBtn.prop('disabled', false).text('다음 행동');
    }

    // ========== UI Screens ==========
    function open() {
        loadData();
        
        // 폰 로그 숨김 처리 설정
        setupPhoneLogHider();

        const $screen = window.STPhone.UI.getContentElement();
        if (!$screen || !$screen.length) return;
        $screen.empty();

        const html = `
            ${css}
            <div class="st-streaming-app">
                <div class="st-streaming-header">
                    <div class="st-streaming-title">📺 Fling</div>
                    <button class="st-streaming-profile-btn" id="st-streaming-profile-btn">👤</button>
                </div>
                <div class="st-streaming-content" id="st-streaming-content">
                </div>
            </div>
        `;

        $screen.append(html);
        renderHomeScreen();
        attachListeners();
    }

    function renderHomeScreen() {
        const $content = $('#st-streaming-content');
        $content.empty();

        // 홈바 표시 (홈화면에서만)
        $('#st-home-btn').show();

        const html = `
            <div class="st-streaming-home-card">
                <div class="st-streaming-home-icon">📺</div>
                <div class="st-streaming-home-title">Fling 방송 시작하기</div>
                <div class="st-streaming-home-desc">
                    방송을 시작하고 시청자들과 소통하세요!<br>
                    후원을 받으면 은행에 자동으로 입금됩니다.<br>
                    <span style="color: #bf94ff;">팔로워: ${followerCount.toLocaleString()}명</span>
                </div>
                <button class="st-streaming-start-btn" id="st-streaming-start">🎬 방송 시작</button>
            </div>

            ${streamHistory.length > 0 ? `
                <div class="st-streaming-section-title">📊 최근 방송</div>
                ${streamHistory.slice(0, 3).map((s, idx) => `
                    <div class="st-streaming-history-item" style="cursor: pointer;" data-home-replay-idx="${idx}">
                        <div class="st-streaming-history-title">${s.title}</div>
                        <div class="st-streaming-history-meta">
                            <span>👁 ${s.maxViewers}명</span>
                            <span>💎 ${formatMoney(s.earnings)}</span>
                            <span>+${s.newFollowers || 0}팔로워</span>
                        </div>
                        <div style="font-size: 11px; color: #777; margin-top: 2px;">
                            📅 ${s.rpDate || new Date(s.endTime).toLocaleDateString()}
                        </div>
                    </div>
                `).join('')}
            ` : ''}
        `;

        $content.append(html);

        $('#st-streaming-start').on('click', showSetupScreen);

        // Click on history item to replay
        $('.st-streaming-history-item[data-home-replay-idx]').on('click', function() {
            const idx = parseInt($(this).data('home-replay-idx'));
            if (!isNaN(idx) && streamHistory[idx]) {
                startReplay(streamHistory[idx]);
            }
        });
    }

    function showSetupScreen() {
        const $content = $('#st-streaming-content');
        $content.empty();

        // 방송 설정 화면에서는 홈바 숨김
        $('#st-home-btn').hide();

        const html = `
            <div class="st-streaming-setup">
                <div class="st-streaming-setup-title">🎬 방송 설정</div>

                <input type="text" class="st-streaming-input" id="st-streaming-title"
                       placeholder="방송 제목을 입력하세요">

                <textarea class="st-streaming-textarea" id="st-streaming-first-action"
                          placeholder="첫 번째 행동을 입력하세요 (예: 카메라를 보며 인사한다)"></textarea>

                <div class="st-streaming-toggle-row">
                    <div>
                        <div class="st-streaming-toggle-label">자동 이미지 생성</div>
                        <div class="st-streaming-toggle-desc">행동 입력 시 자동으로 이미지를 생성합니다</div>
                    </div>
                    <div class="st-streaming-toggle ${autoImageEnabled ? 'active' : ''}" id="st-streaming-auto-image"></div>
                </div>

                <div class="st-streaming-setup-actions">
                    <button class="st-streaming-btn cancel" id="st-streaming-cancel">취소</button>
                    <button class="st-streaming-btn go-live" id="st-streaming-go-live">🔴 방송 시작</button>
                </div>
            </div>
        `;

        $content.append(html);

        $('#st-streaming-auto-image').on('click', function() {
            autoImageEnabled = !autoImageEnabled;
            $(this).toggleClass('active', autoImageEnabled);
        });

        $('#st-streaming-cancel').on('click', renderHomeScreen);

        $('#st-streaming-go-live').on('click', async () => {
            const title = $('#st-streaming-title').val().trim();
            const firstAction = $('#st-streaming-first-action').val().trim();

            if (!title) {
                toastr.warning('방송 제목을 입력하세요.');
                return;
            }

            if (!firstAction) {
                toastr.warning('첫 번째 행동을 입력하세요.');
                return;
            }

            // 저장된 프로필 불러오기
            const profile = getStreamProfile();
            await startStream(title, firstAction, profile);
        });
    }

    async function startStream(title, firstAction, profile = {}) {
        isLive = true;
        // 팔로워 기반 초기 시청자수 - 팔로워가 많을수록 초기 시청자 많음
        const baseViewers = Math.floor(followerCount * 0.05); // 팔로워의 5%가 기본 시청자
        const randomBonus = Math.floor(Math.random() * Math.max(10, followerCount * 0.02)); // 랜덤 보너스
        viewerCount = Math.max(1, baseViewers + randomBonus); // 최소 1명

        // 프로필 정보 저장
        const streamerProfile = {
            nickname: profile.nickname || getUserName(),
            concept: profile.concept || '',
            outfit: profile.outfit || ''
        };

        const rpDate = getRpDateString();
        streamData = {
            title,
            startTime: Date.now(),
            rpDate: rpDate,
            earnings: 0,
            maxViewers: 0,
            newFollowers: 0,
            actions: [{ action: firstAction, chats: [] }],
            profile: streamerProfile
        };

        // 히든 로그 - 더 간결하게
        let profileDesc = '';
        if (streamerProfile.nickname && streamerProfile.nickname !== getUserName()) {
            profileDesc += ` as "${streamerProfile.nickname}"`;
        }
        if (streamerProfile.concept) {
            profileDesc += ` (${streamerProfile.concept})`;
        }
        if (streamerProfile.outfit) {
            profileDesc += ` wearing ${streamerProfile.outfit}`;
        }
        addHiddenLog(getUserName(), `Started Fling stream "${title}"${profileDesc}. Followers: ${followerCount}. Action: ${firstAction}`);

        renderLiveScreen(firstAction);
    }

    function renderLiveScreen(firstAction) {
        const $content = $('#st-streaming-content');
        $content.empty();

        // 방송 중에는 홈바 숨김
        $('#st-home-btn').hide();

        const html = `
            <div class="st-streaming-live">
                <div class="st-streaming-live-header">
                    <div class="st-streaming-live-info">
                        <span class="st-streaming-live-badge">LIVE</span>
                        <span class="st-streaming-viewer-count">
                            👁 <span id="st-streaming-viewer-count">${viewerCount}</span>
                        </span>
                    </div>
                    <button class="st-streaming-end-btn" id="st-streaming-end">방송 종료</button>
                </div>

                <div class="st-streaming-display">
                    <div class="st-streaming-display-content" id="st-streaming-display-content">
                        ${autoImageEnabled ? '<div class="st-streaming-loading"><div class="st-streaming-spinner"></div>이미지 생성 중...</div>' : `<div style="padding: 20px; font-size: 16px;">${firstAction}</div>`}
                    </div>
                    <div class="st-streaming-display-title">${streamData.title}</div>
                </div>

                <div class="st-streaming-chat">
                    <div class="st-streaming-chat-header">💬 채팅</div>
                    <div class="st-streaming-chat-messages" id="st-streaming-chat-messages">
                    </div>
                </div>

                <div class="st-streaming-action-area">
                    <input type="text" class="st-streaming-action-input" id="st-streaming-action-input"
                           placeholder="다음 행동을 입력하세요...">
                    <button class="st-streaming-action-btn" id="st-streaming-action-btn">다음 행동</button>
                </div>
            </div>
        `;

        $content.append(html);

        $('#st-streaming-end').on('click', endStream);
        $('#st-streaming-action-btn').on('click', handleStreamAction);
        $('#st-streaming-action-input').on('keypress', function(e) {
            if (e.key === 'Enter') handleStreamAction();
        });

        // Generate initial viewer response
        (async () => {
            let imgUrl = null;
            if (autoImageEnabled) {
                imgUrl = await generateStreamImage(firstAction);
                if (imgUrl && isLive) {
                    $('#st-streaming-display-content').html(`<img src="${imgUrl}" alt="Stream">`);
                } else if (isLive) {
                    $('#st-streaming-display-content').html(`<div style="padding: 20px;">${firstAction}</div>`);
                }
            }

            const response = await generateViewerResponse(firstAction);
            const chats = parseViewerChat(response);

            // Update first action with chats
            if (streamData && streamData.actions && streamData.actions[0]) {
                streamData.actions[0].chats = chats;
                streamData.actions[0].imgUrl = imgUrl;
            }

            await displayChatsSequentially(chats);
        })();
    }

    function endStream() {
        if (!isLive) return;

        isLive = false;
        isGenerating = false;

        // Calculate new followers based on stream performance
        // More viewers & earnings = more new followers
        const avgViewers = streamData.maxViewers > 0 ? Math.floor((streamData.maxViewers + viewerCount) / 2) : viewerCount;
        const earningsBonus = Math.floor((streamData.earnings || 0) / 10000); // 1만원당 1명
        const baseNewFollowers = Math.floor(avgViewers * (0.01 + Math.random() * 0.05)); // 1-6% of avg viewers
        const newFollowers = Math.max(0, baseNewFollowers + earningsBonus);

        streamData.newFollowers = newFollowers;
        followerCount += newFollowers;

        // Save stream data
        streamData.endTime = Date.now();
        streamData.maxViewers = Math.max(streamData.maxViewers || 0, viewerCount);

        streamHistory.unshift({
            title: streamData.title,
            startTime: streamData.startTime,
            endTime: streamData.endTime,
            rpDate: streamData.rpDate,
            earnings: streamData.earnings || 0,
            maxViewers: streamData.maxViewers,
            newFollowers: newFollowers,
            actions: streamData.actions
        });

        // Keep only last 20 streams
        if (streamHistory.length > 20) {
            streamHistory = streamHistory.slice(0, 20);
        }

        totalEarnings += streamData.earnings || 0;
        saveData();

        // Hidden log for stream end
        addHiddenLog('System', `Fling stream "${streamData.title}" ended. Earnings: ${formatMoney(streamData.earnings || 0)}, Peak viewers: ${streamData.maxViewers}, New followers: +${newFollowers}`);

        renderEndScreen();
    }

    function renderEndScreen() {
        const $content = $('#st-streaming-content');
        $content.empty();

        // 종료 화면에서는 홈바 숨김 (홈으로 가면 다시 표시)
        $('#st-home-btn').hide();

        const duration = streamData.endTime - streamData.startTime;
        const minutes = Math.floor(duration / 60000);

        const html = `
            <div class="st-streaming-end-screen">
                <div class="st-streaming-end-icon">🎉</div>
                <div class="st-streaming-end-title">방송 종료!</div>
                <div class="st-streaming-end-subtitle">${streamData.title}</div>

                <div class="st-streaming-stats">
                    <div class="st-streaming-stat">
                        <div class="st-streaming-stat-value">${formatMoney(streamData.earnings || 0)}</div>
                        <div class="st-streaming-stat-label">총 수익</div>
                    </div>
                    <div class="st-streaming-stat">
                        <div class="st-streaming-stat-value">${streamData.maxViewers}</div>
                        <div class="st-streaming-stat-label">최고 시청자</div>
                    </div>
                    <div class="st-streaming-stat">
                        <div class="st-streaming-stat-value">+${streamData.newFollowers || 0}</div>
                        <div class="st-streaming-stat-label">신규 팔로워</div>
                    </div>
                    <div class="st-streaming-stat">
                        <div class="st-streaming-stat-value">${minutes}분</div>
                        <div class="st-streaming-stat-label">방송 시간</div>
                    </div>
                </div>

                <button class="st-streaming-end-btn-home" id="st-streaming-home">홈으로</button>
            </div>
        `;

        $content.append(html);

        $('#st-streaming-home').on('click', () => {
            streamData = null;
            renderHomeScreen();
        });
    }

    function renderProfileScreen() {
        const $content = $('#st-streaming-content');
        $content.empty();

        // 프로필 화면에서는 홈바 숨김
        $('#st-home-btn').hide();

        const myName = getUserName();
        const profile = getStreamProfile();
        const displayName = profile.nickname || myName;

        const html = `
            <div class="st-streaming-profile">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
                    <button class="st-streaming-back-btn" id="st-streaming-back">‹</button>
                    <span style="font-size: 18px; font-weight: 600;">프로필</span>
                </div>

                <div class="st-streaming-profile-header">
                    <div class="st-streaming-profile-avatar">📺</div>
                    <div>
                        <div class="st-streaming-profile-name" style="display: flex; align-items: center; gap: 8px;">
                            ${displayName}
                            <button id="st-streaming-profile-settings" style="
                                background: rgba(255,255,255,0.1);
                                border: none;
                                color: #adadb8;
                                width: 28px;
                                height: 28px;
                                border-radius: 50%;
                                cursor: pointer;
                                font-size: 14px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            " title="방송 프로필 설정">⚙️</button>
                        </div>
                        ${profile.concept ? `<div style="font-size: 12px; color: #adadb8; margin-top: 4px;">${profile.concept}</div>` : ''}
                        ${profile.outfit ? `<div style="font-size: 11px; color: #777; margin-top: 2px;">👕 ${profile.outfit}</div>` : ''}
                        <div class="st-streaming-profile-stats">
                            <div class="st-streaming-profile-stat">
                                <div class="st-streaming-profile-stat-value">${followerCount.toLocaleString()}</div>
                                <div class="st-streaming-profile-stat-label">팔로워</div>
                            </div>
                            <div class="st-streaming-profile-stat">
                                <div class="st-streaming-profile-stat-value">${streamHistory.length}</div>
                                <div class="st-streaming-profile-stat-label">방송 수</div>
                            </div>
                            <div class="st-streaming-profile-stat">
                                <div class="st-streaming-profile-stat-value">${formatMoney(totalEarnings)}</div>
                                <div class="st-streaming-profile-stat-label">총 수익</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="st-streaming-section-title" style="margin-top: 24px;">📜 방송 기록</div>

                ${streamHistory.length > 0 ? streamHistory.map((s, idx) => `
                    <div class="st-streaming-history-item" style="cursor: pointer;" data-replay-idx="${idx}">
                        <div class="st-streaming-history-title">${s.title}</div>
                        <div class="st-streaming-history-meta">
                            <span>👁 ${s.maxViewers}명</span>
                            <span>💎 ${formatMoney(s.earnings)}</span>
                            <span>+${s.newFollowers || 0}팔로워</span>
                        </div>
                        <div style="font-size: 11px; color: #777; margin-top: 4px;">
                            📅 ${s.rpDate || new Date(s.endTime).toLocaleDateString()}
                        </div>
                        <div style="margin-top: 8px;">
                            <button class="st-streaming-replay-btn" data-replay-idx="${idx}"
                                    style="background: #9146ff; color: white; border: none;
                                           padding: 6px 12px; border-radius: 6px; font-size: 12px;
                                           cursor: pointer;">
                                📹 다시보기
                            </button>
                        </div>
                    </div>
                `).join('') : `
                    <div class="st-streaming-empty">
                        아직 방송 기록이 없습니다
                    </div>
                `}
            </div>
        `;

        $content.append(html);

        $('#st-streaming-back').on('click', renderHomeScreen);

        // Replay button click handler
        $('.st-streaming-replay-btn').on('click', function(e) {
            e.stopPropagation();
            const idx = parseInt($(this).data('replay-idx'));
            if (!isNaN(idx) && streamHistory[idx]) {
                startReplay(streamHistory[idx]);
            }
        });

        // 프로필 설정 버튼 클릭
        $('#st-streaming-profile-settings').on('click', showProfileSettingsScreen);
    }

    // 프로필 설정 화면
    function showProfileSettingsScreen() {
        const $content = $('#st-streaming-content');
        $content.empty();

        // 프로필 설정 화면에서는 홈바 숨김
        $('#st-home-btn').hide();

        const profile = getStreamProfile();

        const html = `
            <div class="st-streaming-setup">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
                    <button class="st-streaming-back-btn" id="st-streaming-profile-back">‹</button>
                    <span style="font-size: 18px; font-weight: 600;">방송 프로필 설정</span>
                </div>

                <div style="margin-bottom: 8px; font-size: 13px; color: #adadb8;">방송 닉네임</div>
                <input type="text" class="st-streaming-input" id="st-streaming-nickname"
                       placeholder="방송에서 사용할 닉네임 (예: 가면사나이, 게임왕)" value="${profile.nickname || ''}">

                <div style="margin-bottom: 8px; font-size: 13px; color: #adadb8;">컨셉 / 특징</div>
                <input type="text" class="st-streaming-input" id="st-streaming-concept"
                       placeholder="컨셉 (예: 얼굴을 가면으로 가리고 있음)" value="${profile.concept || ''}">

                <div style="margin-bottom: 8px; font-size: 13px; color: #adadb8;">옷차림</div>
                <input type="text" class="st-streaming-input" id="st-streaming-outfit"
                       placeholder="현재 옷차림 (예: 검은 후드티, 캐주얼)" value="${profile.outfit || ''}">

                <div class="st-streaming-setup-actions" style="margin-top: 20px;">
                    <button class="st-streaming-btn cancel" id="st-streaming-profile-cancel">취소</button>
                    <button class="st-streaming-btn go-live" id="st-streaming-profile-save">💾 저장</button>
                </div>
            </div>
        `;

        $content.append(html);

        $('#st-streaming-profile-back, #st-streaming-profile-cancel').on('click', renderProfileScreen);

        $('#st-streaming-profile-save').on('click', () => {
            const nickname = $('#st-streaming-nickname').val().trim();
            const concept = $('#st-streaming-concept').val().trim();
            const outfit = $('#st-streaming-outfit').val().trim();

            saveStreamProfile({ nickname, concept, outfit });
            toastr.success('방송 프로필이 저장되었습니다.');
            renderProfileScreen();
        });
    }

    // ========== Replay Mode ==========
    function startReplay(historyItem) {
        isReplayMode = true;
        replayData = historyItem;
        replayIndex = 0;
        viewerCount = 0;

        renderReplayScreen();
    }

    function renderReplayScreen() {
        const $content = $('#st-streaming-content');
        $content.empty();

        // 리플레이 화면에서는 홈바 숨김
        $('#st-home-btn').hide();

        const currentAction = replayData.actions[replayIndex];
        const actionText = typeof currentAction === 'string' ? currentAction : currentAction?.action || '';

        const html = `
            <div class="st-streaming-live">
                <div class="st-streaming-live-header">
                    <div class="st-streaming-live-info">
                        <span class="st-streaming-live-badge" style="background: #666;">다시보기</span>
                        <span class="st-streaming-viewer-count">
                            👁 <span id="st-streaming-viewer-count">${viewerCount}</span>
                        </span>
                    </div>
                    <button class="st-streaming-end-btn" id="st-streaming-replay-back" style="background: #3d3d3d;">← 기록으로</button>
                </div>

                <div class="st-streaming-display">
                    <div class="st-streaming-display-content" id="st-streaming-display-content">
                        ${currentAction?.imgUrl ? `<img src="${currentAction.imgUrl}" alt="Stream">` : `<div style="padding: 20px; font-size: 16px;">${actionText}</div>`}
                    </div>
                    <div class="st-streaming-display-title">${replayData.title}</div>
                </div>

                <div class="st-streaming-chat">
                    <div class="st-streaming-chat-header">💬 채팅 (${replayIndex + 1}/${replayData.actions.length})</div>
                    <div class="st-streaming-chat-messages" id="st-streaming-chat-messages">
                    </div>
                </div>

                <div class="st-streaming-action-area" style="justify-content: center;">
                    <button class="st-streaming-action-btn" id="st-streaming-replay-next"
                            style="flex: none; padding: 12px 40px;">
                        ${replayIndex < replayData.actions.length - 1 ? '다음 행동 ▶' : '처음으로 ↺'}
                    </button>
                </div>
            </div>
        `;

        $content.append(html);

        $('#st-streaming-replay-back').on('click', () => {
            isReplayMode = false;
            replayData = null;
            replayIndex = 0;
            renderProfileScreen();
        });

        $('#st-streaming-replay-next').on('click', handleReplayNext);

        // Display current action's chats
        displayReplayChats();
    }

    async function displayReplayChats() {
        const currentAction = replayData.actions[replayIndex];
        const chats = currentAction?.chats || [];
        const $chatMessages = $('#st-streaming-chat-messages');

        if (!$chatMessages.length) return;

        for (const chat of chats) {
            await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 700));

            let html = '';
            if (chat.type === 'donation') {
                html = `
                    <div class="st-streaming-chat-msg">
                        <div class="donation">
                            <div class="donation-amount">💎 ${chat.username} - ${formatMoney(chat.amount)}</div>
                            <div>${chat.message || '후원 감사합니다!'}</div>
                        </div>
                    </div>
                `;
            } else if (chat.type === 'contact') {
                html = `
                    <div class="st-streaming-chat-msg">
                        <div class="contact-msg">
                            <span class="username" style="color: #00ff7f;">⭐ ${chat.username}</span>
                            <span>${chat.message}</span>
                        </div>
                    </div>
                `;
            } else {
                html = `
                    <div class="st-streaming-chat-msg">
                        <span class="username">${chat.username}</span>
                        <span>${chat.message}</span>
                    </div>
                `;
            }

            $chatMessages.append(html);
            $chatMessages.scrollTop($chatMessages[0].scrollHeight);

            // Update viewer count from chat data
            if (chat.viewerCount) {
                viewerCount = chat.viewerCount;
                $('#st-streaming-viewer-count').text(viewerCount);
            }
        }
    }

    function handleReplayNext() {
        if (replayIndex < replayData.actions.length - 1) {
            replayIndex++;
            renderReplayScreen();
        } else {
            // Go back to beginning
            replayIndex = 0;
            viewerCount = 0;
            renderReplayScreen();
        }
    }

    function attachListeners() {
        $('#st-streaming-profile-btn').on('click', renderProfileScreen);
    }

    // ========== Public API ==========
    return {
        open,
        isInstalled: () => window.STPhone?.Apps?.Store?.isInstalled?.('streaming'),
        getStreamHistory: () => streamHistory,
        getTotalEarnings: () => totalEarnings,
        isLive: () => isLive  // [추가됨] 현재 방송 중인지 확인하는 함수
    };
})();
