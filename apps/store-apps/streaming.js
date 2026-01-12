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
                    console.debug('📺 [Streaming][AI] sendRequest start', { debugId, profileId, maxTokens, messageCount: messages.length });

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
                    const elapsedMs = (performance?.now?.() || 0) - startedAt;
                    console.debug('📺 [Streaming][AI] sendRequest done', { debugId, elapsedMs: Math.round(elapsedMs), outLen: String(text || '').length });
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
                console.warn('📺 [Streaming][AI] Safety filter blocked:', { debugId, error: errorStr });
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
            .st-streaming-input,
            .st-streaming-input:focus,
            .st-streaming-input:active,
            .st-streaming-input:hover {
                width: 100%;
                padding: 14px;
                border: 1px solid #3d3d3d;
                border-radius: 8px;
                background: #1a1a1d !important;
                background-color: #1a1a1d !important;
                color: #ffffff !important;
                font-size: 15px;
                margin-bottom: 12px;
                box-sizing: border-box;
                outline: none !important;
                -webkit-text-fill-color: #ffffff !important;
                -webkit-appearance: none !important;
                caret-color: #ffffff !important;
            }
            .st-streaming-input:focus,
            .st-streaming-input:active {
                border-color: #9146ff !important;
            }
            .st-streaming-input::placeholder {
                color: #adadb8 !important;
                -webkit-text-fill-color: #adadb8 !important;
            }
            .st-streaming-textarea,
            .st-streaming-textarea:focus,
            .st-streaming-textarea:active,
            .st-streaming-textarea:hover {
                width: 100%;
                padding: 14px;
                border: 1px solid #3d3d3d;
                border-radius: 8px;
                background: #1a1a1d !important;
                background-color: #1a1a1d !important;
                color: #ffffff !important;
                font-size: 15px;
                margin-bottom: 12px;
                box-sizing: border-box;
                outline: none !important;
                resize: none;
                min-height: 80px;
                -webkit-text-fill-color: #ffffff !important;
                -webkit-appearance: none !important;
                caret-color: #ffffff !important;
            }
            .st-streaming-textarea:focus,
            .st-streaming-textarea:active {
                border-color: #9146ff !important;
            }
            .st-streaming-textarea::placeholder {
                color: #adadb8 !important;
                -webkit-text-fill-color: #adadb8 !important;
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
            .st-streaming-action-area {
                padding: 10px 15px;
                background: #0e0e10;
                border-top: 1px solid #3d3d3d;
                display: flex;
                gap: 10px;
                flex-shrink: 0;
            }
            .st-streaming-action-input,
            .st-streaming-action-input:focus,
            .st-streaming-action-input:active,
            .st-streaming-action-input:hover {
                flex: 1;
                padding: 12px;
                border: 1px solid #3d3d3d;
                border-radius: 8px;
                background: #1a1a1d !important;
                background-color: #1a1a1d !important;
                color: #ffffff !important;
                font-size: 14px;
                outline: none !important;
                -webkit-text-fill-color: #ffffff !important;
                -webkit-appearance: none !important;
                caret-color: #ffffff !important;
            }
            .st-streaming-action-input:focus,
            .st-streaming-action-input:active {
                border-color: #9146ff !important;
            }
            .st-streaming-action-input::placeholder {
                color: #adadb8 !important;
                -webkit-text-fill-color: #adadb8 !important;
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

            /* Force dark background on ALL inputs within streaming app */
            .st-streaming-app input,
            .st-streaming-app input:focus,
            .st-streaming-app input:active,
            .st-streaming-app input:hover,
            .st-streaming-app textarea,
            .st-streaming-app textarea:focus,
            .st-streaming-app textarea:active,
            .st-streaming-app textarea:hover {
                background: #1a1a1d !important;
                background-color: #1a1a1d !important;
                color: #ffffff !important;
                -webkit-text-fill-color: #ffffff !important;
                -webkit-appearance: none !important;
                caret-color: #ffffff !important;
            }
            .st-streaming-app input:-webkit-autofill,
            .st-streaming-app input:-webkit-autofill:hover,
            .st-streaming-app input:-webkit-autofill:focus,
            .st-streaming-app textarea:-webkit-autofill,
            .st-streaming-app textarea:-webkit-autofill:hover,
            .st-streaming-app textarea:-webkit-autofill:focus {
                -webkit-box-shadow: 0 0 0 1000px #1a1a1d inset !important;
                -webkit-text-fill-color: #ffffff !important;
                background-color: #1a1a1d !important;
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
    
    // 스트리머 프로필 설정
    let streamerProfile = {
        nickname: '',
        concept: '',
        outfit: ''
    };

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
                streamerProfile = data.streamerProfile || { nickname: '', concept: '', outfit: '' };
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
                followerCount,
                streamerProfile
            }));
        } catch (e) {
            console.error('[Streaming] Save failed:', e);
        }
    }

    function resetData() {
        streamHistory = [];
        totalEarnings = 0;
        followerCount = 0;
        streamerProfile = { nickname: '', concept: '', outfit: '' };
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

    function addHiddenLog(speaker, text) {
        if (!window.SillyTavern) return;
        const context = window.SillyTavern.getContext();
        if (!context || !context.chat) return;

        context.chat.push({
            name: speaker,
            is_user: false,
            is_system: false,
            send_date: Date.now(),
            mes: text,
            extra: {
                is_phone_log: true
            }
        });

        if (window.SlashCommandParser && window.SlashCommandParser.commands['savechat']) {
            window.SlashCommandParser.commands['savechat'].callback({});
        }
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

        // Build messages array
        const messages = [];

        // Get streamer profile info
        const streamerNickname = streamerProfile.nickname || myName;
        const streamerConcept = streamerProfile.concept || '(설정되지 않음)';
        const streamerOutfit = streamerProfile.outfit || '(설정되지 않음)';

        // Get currency info from Bank app
        const Bank = window.STPhone?.Apps?.Bank;
        const currencyCode = Bank?.getCurrency?.() || 'KRW';
        
        // Currency settings for different regions
        const currencyInfo = {
            KRW: { symbol: '₩', name: '원', region: '한국', locale: 'Korean', smallDonation: '1,000~10,000', mediumDonation: '10,000~50,000', bigDonation: '100,000~1,000,000', usernameStyle: 'Korean-style nicknames (예: 감자탕조아, 방탄소녀단, 크크크123)' },
            USD: { symbol: '$', name: '달러', region: '미국/국제', locale: 'International/English-speaking', smallDonation: '1~10', mediumDonation: '10~50', bigDonation: '100~1,000', usernameStyle: 'English usernames (e.g., CoolGamer99, ShadowKnight, xXDragonXx)' },
            EUR: { symbol: '€', name: '유로', region: '유럽', locale: 'European', smallDonation: '1~10', mediumDonation: '10~50', bigDonation: '100~1,000', usernameStyle: 'European-style usernames (e.g., HansGamer, Pierre_FR, Luigi_IT)' },
            JPY: { symbol: '¥', name: '엔', region: '일본', locale: 'Japanese', smallDonation: '100~1,000', mediumDonation: '1,000~5,000', bigDonation: '10,000~100,000', usernameStyle: 'Japanese-style usernames (e.g., たけし_gamer, sakura123, アニメ大好き)' },
            GBP: { symbol: '£', name: '파운드', region: '영국', locale: 'British', smallDonation: '1~10', mediumDonation: '10~50', bigDonation: '100~1,000', usernameStyle: 'British-style usernames (e.g., TeaLover99, LondonGamer, CheekyNandos)' },
            CNY: { symbol: '¥', name: '위안', region: '중국', locale: 'Chinese', smallDonation: '5~50', mediumDonation: '50~300', bigDonation: '500~5,000', usernameStyle: 'Chinese-style usernames (e.g., 小龙_gamer, 熊猫123, 大神来了)' }
        };
        
        const currInfo = currencyInfo[currencyCode] || currencyInfo.KRW;

        // System prompt
        const systemContent = `### Registered Contacts (may appear in chat based on their personality and chat history context)
${contactsInfo || '(No contacts registered)'}

### Recent Chat History (RP context outside of streaming)
${chatHistory || '(No recent history)'}

### User Profile
Name: ${myName}
Personality: ${settings.userPersonality || '(not specified)'}
Appearance: ${settings.userTags || '(not specified)'}
Current Followers: ${followerCount}

### Streamer Profile (방송 설정)
방송 닉네임: ${streamerNickname}
컨셉/캐릭터: ${streamerConcept}
옷차림/외모: ${streamerOutfit}

### Currency & Region Setting
Currency: ${currInfo.symbol} (${currInfo.name})
Viewer Region: ${currInfo.region} (${currInfo.locale} viewers)

### FLING LIVE STREAMING SYSTEM PROMPT

You are generating viewer chat reactions for ${streamerNickname}'s Fling livestream.
The viewers are from ${currInfo.region} region.

Stream Title: "${streamData?.title || 'Untitled Stream'}"
Streamer's Current Followers: ${followerCount}
Current Viewers: ${viewerCount}
Current Action: "${action}"

### OUTPUT FORMAT
FIRST LINE MUST BE viewer count in this format:
[VIEWERS: number]

Then generate 3-8 chat messages. Each line should be ONE chat message in this format:
[username]: message

For donations, use this format (use ${currInfo.symbol} symbol):
[username] donated ${currInfo.symbol}X: donation message

### RULES
1. FIRST decide viewer count. Start from current viewers (${viewerCount}) and adjust based on content interest. Output [VIEWERS: X] first.
2. All chat messages MUST be in Korean (한국어) - viewers are typing in Korean regardless of their nationality
3. Usernames should be ${currInfo.usernameStyle}
4. Mix of reactions: excited, funny, supportive, teasing, questions
5. DONATIONS (in ${currInfo.symbol} ${currInfo.name}):
   - Regular donations: ${currInfo.symbol}${currInfo.smallDonation} (occasional)
   - Medium donations: ${currInfo.symbol}${currInfo.mediumDonation} (rare)
   - BIG JACKPOT donations: ${currInfo.symbol}${currInfo.bigDonation} (VERY RARE - only when content is EXTREMELY exciting)
   - Consider if a contact is watching and has strong feelings for ${streamerNickname} - they might donate big!
6. If a registered contact would realistically watch this stream (based on their personality and relationship with ${streamerNickname}), they MAY appear in chat using their actual name. Fans/lovers may donate big!
7. Chat should feel natural and varied - not everyone reacts the same way
8. Consider the streamer's concept (${streamerConcept}) and outfit (${streamerOutfit}) when generating reactions
9. Consider the action ${streamerNickname} is doing and react appropriately
10. Some messages can be emotes/reactions: ㅋㅋㅋ, ㅠㅠ, ㄷㄷ, 헐, 와, 대박, ㄹㅇ, ㅇㅈ 등
11. NO English in chat messages except for usernames - everything else in Korean
12. Do NOT generate ${streamerNickname}'s responses - only viewer chat
13. Viewer count changes naturally - interesting/provocative content = viewers increase, boring = decrease
14. NEVER use quotation marks ("") in chat messages - speak naturally without quotes
15. NEVER wrap messages in quotes - just write the message directly

### Generate [VIEWERS: X] first, then viewer chat:`;

        messages.push({ role: 'system', content: systemContent });

        // Add story context
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
            messages.push(...collectedMessages);
        }

        // User action
        messages.push({
            role: 'user',
            content: `[${myName}'s action on stream]: ${action}\n\nGenerate viewer chat reactions in Korean:`
        });

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
            const trimmedLine = line.trim();
            
            // Skip empty lines or lines that are just formatting
            if (!trimmedLine || trimmedLine.startsWith('---') || trimmedLine.startsWith('===')) {
                continue;
            }

            // Check for viewer count: [VIEWERS: X] or 시청자: X or [시청자수: X]
            const viewerMatch = trimmedLine.match(/^\[?(?:VIEWERS?|시청자(?:수)?|현재\s*시청자)\s*[:\s]\s*(\d+)\s*(?:명)?\]?/i);
            if (viewerMatch) {
                newViewerCount = parseInt(viewerMatch[1]);
                continue;
            }

            // Donation format: various patterns with multiple currency symbols
            // Supports: ₩, $, €, ¥, £, 원, 달러, 엔, 유로, 파운드
            const donationMatch = trimmedLine.match(/^\[?([^\]:\[]+?)\]?\s*(?:donated|후원|도네이션|도네|💎)\s*[₩$€¥£]?\s*([\d,]+)\s*(?:원|달러|엔|유로|파운드|[₩$€¥£])?\s*[:\-]?\s*(.*)$/i);
            if (donationMatch) {
                chats.push({
                    type: 'donation',
                    username: donationMatch[1].trim(),
                    amount: parseInt(donationMatch[2].replace(/,/g, '')),
                    message: donationMatch[3].trim().replace(/^["']|["']$/g, '') // Remove quotes from message
                });
                continue;
            }

            // Regular chat: multiple formats supported
            // Format 1: [username]: message
            // Format 2: username: message
            // Format 3: **username**: message
            // Format 4: - username: message
            let chatMatch = trimmedLine.match(/^-?\s*\*?\*?\[?([^\]:\[\*]+?)\]?\*?\*?\s*:\s*(.+)$/);
            if (chatMatch) {
                const username = chatMatch[1].trim();
                // Remove quotes from message
                const message = chatMatch[2].trim().replace(/^["']|["']$/g, '').replace(/^[""]|[""]$/g, '');

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
            if (viewerCount > streamData.maxViewers) {
                streamData.maxViewers = viewerCount;
            }
            $('#st-streaming-viewer-count').text(viewerCount);
        }

        return chats;
    }

    async function displayChatsSequentially(chats) {
        const $chatMessages = $('#st-streaming-chat-messages');
        
        // Get currency info for display
        const Bank = window.STPhone?.Apps?.Bank;
        const currencyCode = Bank?.getCurrency?.() || 'KRW';
        const currencySymbols = { KRW: '₩', USD: '$', EUR: '€', JPY: '¥', GBP: '£', CNY: '¥' };
        const currSymbol = currencySymbols[currencyCode] || '₩';

        for (const chat of chats) {
            if (!isLive) break;

            let html = '';

            if (chat.type === 'donation') {
                html = `
                    <div class="st-streaming-chat-msg">
                        <div class="donation">
                            <div class="donation-amount">💎 ${chat.username} - ${currSymbol}${chat.amount.toLocaleString()}</div>
                            <div>${chat.message || '후원 감사합니다!'}</div>
                        </div>
                    </div>
                `;
                // Add to earnings and bank
                totalEarnings += chat.amount;
                streamData.earnings = (streamData.earnings || 0) + chat.amount;

                // Add to bank if installed
                if (Bank && typeof Bank.addBalance === 'function') {
                    Bank.addBalance(chat.amount, `${chat.username}님 Fling 후원`);
                }

                // 히든 로그
                addHiddenLog('System', `[📺 FLING DONATION] ${chat.username}님이 ${currSymbol}${chat.amount.toLocaleString()}을 후원하며 메시지를 보냈습니다: ${chat.message || '후원 감사합니다!'}`);

            } else if (chat.type === 'contact') {
                html = `
                    <div class="st-streaming-chat-msg">
                        <div class="contact-msg">
                            <span class="username" style="color: #00ff7f;">⭐ ${chat.username}</span>
                            <span>${chat.message}</span>
                        </div>
                    </div>
                `;
                // Hidden log for contact message
                addHiddenLog(chat.username, `[📺 FLING CONTACT CHAT] ${chat.username}: ${chat.message}`);
            } else {
                // 일반 시청자 채팅
                html = `
                    <div class="st-streaming-chat-msg">
                        <span class="username">${chat.username}</span>
                        <span>${chat.message}</span>
                    </div>
                `;
                addHiddenLog('System', `[📺 FLING VIEWER] ${chat.username}: ${chat.message}`);
            }

            $chatMessages.append(html);
            $chatMessages.scrollTop($chatMessages[0].scrollHeight);

            // Delay between messages
            await new Promise(r => setTimeout(r, 400 + Math.random() * 600));
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

        // Hidden log for action
        addHiddenLog(getUserName(), `[📺 FLING ACTION] ${getUserName()} on Fling stream: ${action}`);

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

        // 앱 진입 시 홈바 표시 (모바일 포함)
        $('#st-home-btn').removeClass('st-hidden');

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

            await startStream(title, firstAction);
        });
    }

    async function startStream(title, firstAction) {
        isLive = true;
        // Initial viewer count starts at 0 - AI will decide how many viewers come
        viewerCount = 0;

        // 홈바 숨김 (모바일 포함)
        $('#st-home-btn').addClass('st-hidden');

        const rpDate = getRpDateString();
        streamData = {
            title,
            startTime: Date.now(),
            rpDate: rpDate,
            earnings: 0,
            maxViewers: 0,
            newFollowers: 0,
            actions: [{ action: firstAction, chats: [] }]
        };

        // Hidden log for stream start
        addHiddenLog(getUserName(), `[📺 FLING STREAM STARTED] ${getUserName()} started a Fling livestream titled "${title}" on ${rpDate}. Current Followers: ${followerCount}. First action: ${firstAction}`);

        renderLiveScreen(firstAction);
    }

    function renderLiveScreen(firstAction) {
        const $content = $('#st-streaming-content');
        $content.empty();

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

        // 홈바 다시 표시 (모바일 포함)
        $('#st-home-btn').removeClass('st-hidden');

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
        addHiddenLog('System', `[📺 FLING STREAM ENDED] ${getUserName()}'s Fling stream "${streamData.title}" ended. Total earnings: ${formatMoney(streamData.earnings || 0)}, Max viewers: ${streamData.maxViewers}, New followers: +${newFollowers} (Total: ${followerCount})`);

        renderEndScreen();
    }

    function renderEndScreen() {
        const $content = $('#st-streaming-content');
        $content.empty();

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

        const myName = getUserName();
        const displayName = streamerProfile.nickname || myName;

        const html = `
            <div class="st-streaming-profile">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
                    <button class="st-streaming-back-btn" id="st-streaming-back">‹</button>
                    <span style="font-size: 18px; font-weight: 600;">프로필</span>
                </div>

                <div class="st-streaming-profile-header">
                    <div class="st-streaming-profile-avatar">📺</div>
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div class="st-streaming-profile-name">${displayName}</div>
                            <button id="st-streaming-settings-btn" style="background: none; border: none; color: #adadb8; font-size: 18px; cursor: pointer; padding: 4px;">⚙️</button>
                        </div>
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
        $('#st-streaming-settings-btn').on('click', renderSettingsScreen);

        // Replay button click handler
        $('.st-streaming-replay-btn').on('click', function(e) {
            e.stopPropagation();
            const idx = parseInt($(this).data('replay-idx'));
            if (!isNaN(idx) && streamHistory[idx]) {
                startReplay(streamHistory[idx]);
            }
        });
    }

    // ========== Settings Screen ==========
    function renderSettingsScreen() {
        const $content = $('#st-streaming-content');
        $content.empty();

        const myName = getUserName();

        const html = `
            <div class="st-streaming-profile">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
                    <button class="st-streaming-back-btn" id="st-streaming-settings-back">‹</button>
                    <span style="font-size: 18px; font-weight: 600;">⚙️ 스트리머 설정</span>
                </div>

                <div class="st-streaming-setup" style="margin-bottom: 15px;">
                    <div class="st-streaming-setup-title">🎭 스트리머 프로필</div>
                    
                    <label style="font-size: 13px; color: #adadb8; margin-bottom: 6px; display: block;">닉네임 (방송용)</label>
                    <input type="text" class="st-streaming-input" id="st-streamer-nickname" 
                           placeholder="예: 가면사나이 (비워두면 기본 이름 사용)" 
                           value="${streamerProfile.nickname || ''}">
                    
                    <label style="font-size: 13px; color: #adadb8; margin-bottom: 6px; display: block;">컨셉 / 캐릭터 설정</label>
                    <textarea class="st-streaming-textarea" id="st-streamer-concept" 
                              placeholder="예: 가면을 쓰고 방송하는 미스터리한 스트리머">${streamerProfile.concept || ''}</textarea>
                    
                    <label style="font-size: 13px; color: #adadb8; margin-bottom: 6px; display: block;">옷차림 / 외모</label>
                    <textarea class="st-streaming-textarea" id="st-streamer-outfit" 
                              placeholder="예: 검은 가면과 후드티를 입고 있음">${streamerProfile.outfit || ''}</textarea>

                    <div style="margin-top: 20px; display: flex; gap: 10px;">
                        <button class="st-streaming-btn cancel" id="st-settings-cancel" style="flex: 1;">취소</button>
                        <button class="st-streaming-btn go-live" id="st-settings-save" style="flex: 1;">저장</button>
                    </div>
                </div>

                <div style="background: #18181b; border-radius: 8px; padding: 14px; font-size: 12px; color: #adadb8;">
                    💡 <strong>팁:</strong> 설정한 프로필은 방송 시 AI에게 전달되어 시청자 채팅에 반영됩니다.
                </div>
            </div>
        `;

        $content.append(html);

        $('#st-streaming-settings-back').on('click', renderProfileScreen);
        $('#st-settings-cancel').on('click', renderProfileScreen);
        
        $('#st-settings-save').on('click', function() {
            streamerProfile.nickname = $('#st-streamer-nickname').val().trim();
            streamerProfile.concept = $('#st-streamer-concept').val().trim();
            streamerProfile.outfit = $('#st-streamer-outfit').val().trim();
            saveData();
            toastr.success('스트리머 프로필이 저장되었습니다!');
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
        getTotalEarnings: () => totalEarnings
    };
})();
