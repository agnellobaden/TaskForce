// ===== Personal AI Assistant - JavaScript =====

// Personal AI Data Storage
let personalAIData = JSON.parse(localStorage.getItem('taskforce_personal_ai')) || {
    name: '',
    birthdate: '',
    gender: '',
    job: '',
    hobbies: '',
    features: {
        weather: true,
        news: true,
        business: true,
        private: true,
        reminders: true
    },
    morningTime: '07:00'
};

// ChatGPT Integration
async function callChatGPT(messages, options = {}) {
    const apiKey = (typeof appSettings !== 'undefined' && appSettings.openaiApiKey) ? appSettings.openaiApiKey : null;

    if (!apiKey) {
        throw new Error('Kein OpenAI API-Key gefunden. Bitte in den Einstellungen eintragen.');
    }

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: options.model || 'gpt-3.5-turbo',
                messages: messages,
                temperature: options.temperature || 0.7,
                max_tokens: options.max_tokens || 1000
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API Fehler');
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (err) {
        console.error('ChatGPT API Error:', err);
        throw err;
    }
}

// Initialize Personal AI Modal
function initPersonalAI() {
    const personalAIBtn = document.getElementById('personalAIBtn');
    const personalAIModal = document.getElementById('personalAIModal');
    const closePersonalAIBtn = document.getElementById('closePersonalAIBtn');
    const savePersonalAIBtn = document.getElementById('savePersonalAIBtn');
    const testAIBriefingBtn = document.getElementById('testAIBriefingBtn');

    // Load saved data
    loadPersonalAIData();
    loadAiChatHistory();

    // Event Listeners
    if (personalAIBtn) {
        personalAIBtn.addEventListener('click', () => {
            personalAIModal.classList.remove('hidden');
            updateAIGreeting();
        });
    }

    if (closePersonalAIBtn) {
        closePersonalAIBtn.addEventListener('click', () => {
            personalAIModal.classList.add('hidden');
        });
    }

    if (savePersonalAIBtn) {
        savePersonalAIBtn.addEventListener('click', savePersonalAIData);
    }

    if (testAIBriefingBtn) {
        testAIBriefingBtn.addEventListener('click', testAIBriefing);
    }

    // Age calculation on birthdate change
    const birthdateInput = document.getElementById('aiUserBirthdate');
    if (birthdateInput) {
        birthdateInput.addEventListener('change', updateAgeDisplay);
    }

    // AI Chat Listeners
    const sendAiChatBtn = document.getElementById('sendAiChatBtn');
    const aiChatInput = document.getElementById('aiChatInput');

    if (sendAiChatBtn) {
        sendAiChatBtn.addEventListener('click', handleSendAiChat);
    }
    if (aiChatInput) {
        aiChatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSendAiChat();
        });
    }

    // API Key toggler
    const toggleAiApiBtn = document.getElementById('toggleAiApiKeyVisibility');
    const aiApiInput = document.getElementById('aiOpenaiApiKeyInput');
    if (toggleAiApiBtn && aiApiInput) {
        toggleAiApiBtn.addEventListener('click', () => {
            aiApiInput.type = aiApiInput.type === 'password' ? 'text' : 'password';
            toggleAiApiBtn.textContent = aiApiInput.type === 'password' ? '👁️' : '🔒';
        });
    }

    // Check for morning briefing
    checkMorningBriefing();
    setInterval(checkMorningBriefing, 60000); // Check every minute
}

let aiChatHistoryData = [];

function loadAiChatHistory() {
    const saved = localStorage.getItem('taskforce_ai_history');
    if (saved) {
        aiChatHistoryData = JSON.parse(saved);
        const history = document.getElementById('aiChatHistory');
        if (history) {
            history.innerHTML = '';
            aiChatHistoryData.forEach(m => addChatMessageUI(m.role, m.text));
        }
    }
}

function saveAiChatHistory() {
    localStorage.setItem('taskforce_ai_history', JSON.stringify(aiChatHistoryData.slice(-50)));
}

async function handleSendAiChat() {
    const input = document.getElementById('aiChatInput');
    const text = input.value.trim();
    if (!text) return;

    // Add User Message
    addChatMessage('user', text);
    input.value = '';

    // Thinking placeholder
    const thinkingId = 'thinking_' + Date.now();
    addChatMessageUI('ai', '<span class="loading-dots">... denkt nach ...</span>', thinkingId);

    try {
        const systemPrompt = `Du bist ein hilfreicher persönlicher Assistent namens "Personal Advisor". 
Dein Ziel ist es, den Nutzer optimal zu unterstützen. Sei freundlich, professionell und motivierend.
Nutze die persönlichen Details des Nutzers: Name: ${personalAIData.name}, Job: ${personalAIData.job}, Hobbys: ${personalAIData.hobbies}.
Du hast Zugriff auf alle Funktionen der App (Kalender, Notizen, etc.) - antworte so, als wärst du ein echter Butler.`;

        const messages = [
            { role: 'system', content: systemPrompt },
            ...aiChatHistoryData.slice(-10).map(m => ({ role: m.role, content: m.text })),
            { role: 'user', content: text }
        ];

        const response = await callChatGPT(messages);

        // Remove thinking and add real response
        const thinkingEl = document.getElementById(thinkingId);
        if (thinkingEl) thinkingEl.remove();

        addChatMessage('ai', response);

        // Speak response if enabled
        if (personalAIData.features.reminders && typeof speakAI === 'function') {
            speakAI(response);
        }
    } catch (err) {
        const thinkingEl = document.getElementById(thinkingId);
        if (thinkingEl) thinkingEl.innerHTML = `<span style="color:#ef4444;">Fehler: ${err.message}</span>`;
    }
}

function addChatMessage(role, text) {
    aiChatHistoryData.push({ role, text });
    saveAiChatHistory();
    addChatMessageUI(role, text);
}

function addChatMessageUI(role, text, id) {
    const history = document.getElementById('aiChatHistory');
    if (!history) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = role === 'user' ? 'user-msg' : 'ai-msg';
    if (id) msgDiv.id = id;

    const isUser = role === 'user';
    msgDiv.style.padding = '10px 15px';
    msgDiv.style.borderRadius = '18px';
    msgDiv.style.fontSize = '0.9rem';
    msgDiv.style.maxWidth = '85%';
    msgDiv.style.alignSelf = isUser ? 'flex-end' : 'flex-start';
    msgDiv.style.background = isUser ? 'var(--primary)' : 'rgba(255,255,255,0.1)';
    msgDiv.style.color = isUser ? 'white' : 'var(--text-primary)';
    msgDiv.style.borderBottomRightRadius = isUser ? '4px' : '18px';
    msgDiv.style.borderBottomLeftRadius = isUser ? '18px' : '4px';
    msgDiv.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';

    msgDiv.innerHTML = text;
    history.appendChild(msgDiv);
    history.scrollTop = history.scrollHeight;
}

// Load Personal AI Data from localStorage
function loadPersonalAIData() {
    if (document.getElementById('aiUserName')) document.getElementById('aiUserName').value = personalAIData.name || '';
    if (document.getElementById('aiUserBirthdate')) document.getElementById('aiUserBirthdate').value = personalAIData.birthdate || '';
    if (document.getElementById('aiUserGender')) document.getElementById('aiUserGender').value = personalAIData.gender || '';
    if (document.getElementById('aiUserJob')) document.getElementById('aiUserJob').value = personalAIData.job || '';
    if (document.getElementById('aiUserHobbies')) document.getElementById('aiUserHobbies').value = personalAIData.hobbies || '';

    if (document.getElementById('aiWeatherToggle')) document.getElementById('aiWeatherToggle').checked = personalAIData.features.weather !== false;
    if (document.getElementById('aiNewsToggle')) document.getElementById('aiNewsToggle').checked = personalAIData.features.news !== false;
    if (document.getElementById('aiBusinessToggle')) document.getElementById('aiBusinessToggle').checked = personalAIData.features.business !== false;
    if (document.getElementById('aiPrivateToggle')) document.getElementById('aiPrivateToggle').checked = personalAIData.features.private !== false;
    if (document.getElementById('aiRemindersToggle')) document.getElementById('aiRemindersToggle').checked = personalAIData.features.reminders !== false;

    if (document.getElementById('aiMorningTime')) document.getElementById('aiMorningTime').value = personalAIData.morningTime || '07:00';

    if (document.getElementById('aiOpenaiApiKeyInput')) {
        document.getElementById('aiOpenaiApiKeyInput').value = (typeof appSettings !== 'undefined') ? appSettings.openaiApiKey : '';
    }

    updateAgeDisplay();
}

// Save Personal AI Data
function savePersonalAIData() {
    personalAIData = {
        name: document.getElementById('aiUserName').value.trim(),
        birthdate: document.getElementById('aiUserBirthdate').value,
        gender: document.getElementById('aiUserGender').value,
        job: document.getElementById('aiUserJob').value.trim(),
        hobbies: document.getElementById('aiUserHobbies').value.trim(),
        features: {
            weather: document.getElementById('aiWeatherToggle').checked,
            news: document.getElementById('aiNewsToggle').checked,
            business: document.getElementById('aiBusinessToggle').checked,
            private: document.getElementById('aiPrivateToggle').checked,
            reminders: document.getElementById('aiRemindersToggle').checked
        },
        morningTime: document.getElementById('aiMorningTime').value
    };

    localStorage.setItem('taskforce_personal_ai', JSON.stringify(personalAIData));

    // Update global API key if provided
    const aiApiInput = document.getElementById('aiOpenaiApiKeyInput');
    if (aiApiInput && aiApiInput.value.trim()) {
        if (typeof appSettings !== 'undefined') {
            appSettings.openaiApiKey = aiApiInput.value.trim();
            localStorage.setItem('taskforce_settings', JSON.stringify(appSettings));
        }
    }

    if (typeof showToast === 'function') {
        showToast('Persönliche KI-Einstellungen gespeichert!', 'success');
    }

    document.getElementById('personalAIModal').classList.add('hidden');
}

// Update Age Display
function updateAgeDisplay() {
    const birthdateInput = document.getElementById('aiUserBirthdate');
    if (!birthdateInput) return;
    const birthdate = birthdateInput.value;
    const ageDisplay = document.getElementById('aiAgeDisplay');

    if (birthdate && ageDisplay) {
        const age = calculateAge(birthdate);
        ageDisplay.textContent = `Du bist ${age} Jahre alt`;
    } else if (ageDisplay) {
        ageDisplay.textContent = '';
    }
}

// Calculate Age from Birthdate
function calculateAge(birthdate) {
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }

    return age;
}

// Update AI Greeting
function updateAIGreeting() {
    const greetingText = document.getElementById('aiGreetingText');
    const greetingSubtext = document.getElementById('aiGreetingSubtext');
    if (!greetingText) return;

    if (personalAIData.name) {
        const hour = new Date().getHours();
        let greeting = 'Hallo';

        if (hour < 12) greeting = 'Guten Morgen';
        else if (hour < 18) greeting = 'Guten Tag';
        else greeting = 'Guten Abend';

        greetingText.textContent = `${greeting}, ${personalAIData.name}!`;
        greetingSubtext.textContent = 'Wie kann ich dir heute helfen?';
    } else {
        greetingText.textContent = 'Hallo! Ich bin deine persönliche KI.';
        greetingSubtext.textContent = 'Lass mich dich kennenlernen, damit ich dir besser helfen kann.';
    }
}

// Test AI Briefing
async function testAIBriefing() {
    const preview = document.getElementById('aiDashboardPreview');
    const content = document.getElementById('aiDashboardContent');

    if (preview) preview.classList.remove('hidden');
    if (content) content.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="loading-spinner"></i> Erstelle dein KI-Briefing mit ChatGPT...</div>';

    try {
        const briefing = await generateDailyBriefingAI();
        if (content) content.innerHTML = briefing;

        // Speak the briefing if voice is enabled
        if (personalAIData.features.reminders && 'speechSynthesis' in window) {
            const textToSpeak = briefing.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
            if (typeof speakAI === 'function') speakAI(textToSpeak);
            else {
                const utterance = new SpeechSynthesisUtterance(textToSpeak);
                utterance.lang = 'de-DE';
                utterance.rate = 0.9;
                window.speechSynthesis.speak(utterance);
            }
        }
    } catch (err) {
        if (content) content.innerHTML = `<div style="color: #ef4444; padding: 10px;">Fehler: ${err.message}</div>`;
        if (typeof showToast === 'function') showToast('Briefing fehlgeschlagen: ' + err.message, 'error');
    }
}

// Generate Daily Briefing using ChatGPT
async function generateDailyBriefingAI() {
    const now = new Date();
    const dayName = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][now.getDay()];
    const dateStr = `${now.getDate()}.${now.getMonth() + 1}.${now.getFullYear()}`;

    // Get current tasks
    const openTasks = (typeof tasks !== 'undefined') ? tasks.filter(t => !t.done && !t.archived).map(t => t.keyword).join(', ') : 'Keine';

    const systemPrompt = `Du bist ein hilfreicher persönlicher Assistent namens "Personal Advisor". 
Dein Ziel ist es, den Nutzer optimal zu unterstützen. Sei freundlich, professionell und motivierend.
Nutze die persönlichen Details des Nutzers, um die Antwort individuell zu gestalten.
Schreibe in HTML-Format (für <div>-Container), nutze Emojis.`;

    const userPrompt = `Erstelle ein kurzes, knackiges Tages-Briefing für mich.
Meine Details:
Name: ${personalAIData.name || 'Unbekannt'}
Job: ${personalAIData.job || 'Nicht angegeben'}
Hobbys: ${personalAIData.hobbies || 'Nicht angegeben'}
Interessen: ${Object.entries(personalAIData.features).filter(([k, v]) => v).map(([k, v]) => k).join(', ')}

Heute ist ${dayName}, der ${dateStr}.
Aktuelle Aufgaben: ${openTasks}

Berücksichtige Wetterinfo (simuliert als sonnig), motiviere mich für meine Hobbys oder meinen Job.`;

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];

    try {
        return await callChatGPT(messages);
    } catch (err) {
        // Fallback to local briefing if API fails
        return generateDailyBriefing() + `<br><small style="color:#ef4444;">(API Fehler: ${err.message})</small><br><small style="color:gray;">(Lokales Backup-Briefing)</small>`;
    }
}

// Generate Daily Briefing
function generateDailyBriefing() {
    const now = new Date();
    const hour = now.getHours();
    const dayName = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][now.getDay()];

    let greeting = 'Guten Morgen';
    if (hour >= 12 && hour < 18) greeting = 'Guten Tag';
    else if (hour >= 18) greeting = 'Guten Abend';

    let briefing = `<div style="margin-bottom: 15px;"><strong>${greeting}, ${personalAIData.name || 'Freund'}!</strong></div>`;
    briefing += `<div style="margin-bottom: 10px;">Heute ist ${dayName}, der ${now.getDate()}.${now.getMonth() + 1}.${now.getFullYear()}</div>`;

    // Weather
    if (personalAIData.features.weather) {
        briefing += `<div style="margin: 15px 0; padding: 10px; background: rgba(59, 130, 246, 0.1); border-left: 3px solid #3b82f6; border-radius: 4px;">`;
        briefing += `<strong>🌤️ Wetter:</strong> Heute wird es voraussichtlich sonnig mit Temperaturen um 18°C. Perfektes Wetter für einen Spaziergang!`;
        briefing += `</div>`;
    }

    // Tasks/Appointments
    if (typeof tasks !== 'undefined' && tasks.length > 0) {
        const todayTasks = tasks.filter(t => !t.done && !t.archived);
        if (todayTasks.length > 0) {
            briefing += `<div style="margin: 15px 0; padding: 10px; background: rgba(168, 85, 247, 0.1); border-left: 3px solid #a855f7; border-radius: 4px;">`;
            briefing += `<strong>📋 Deine Aufgaben:</strong> Du hast ${todayTasks.length} offene Aufgabe${todayTasks.length > 1 ? 'n' : ''}.`;
            briefing += `</div>`;
        }
    }

    // News
    if (personalAIData.features.news) {
        briefing += `<div style="margin: 15px 0; padding: 10px; background: rgba(34, 197, 94, 0.1); border-left: 3px solid #22c55e; border-radius: 4px;">`;
        briefing += `<strong>📰 Nachrichten:</strong> Bleibe informiert über aktuelle Ereignisse. Öffne deine Nachrichten-App für Details.`;
        briefing += `</div>`;
    }

    // Personal motivation
    if (personalAIData.hobbies) {
        briefing += `<div style="margin: 15px 0; padding: 10px; background: rgba(251, 146, 60, 0.1); border-left: 3px solid #fb923c; border-radius: 4px;">`;
        briefing += `<strong>💡 Tipp:</strong> Vergiss nicht, Zeit für deine Hobbys zu nehmen: ${personalAIData.hobbies}`;
        briefing += `</div>`;
    }

    return briefing;
}

// Check for Morning Briefing
function checkMorningBriefing() {
    if (!personalAIData.name || !personalAIData.features.reminders) return;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const lastBriefing = localStorage.getItem('taskforce_last_briefing');
    const today = now.toDateString();

    if (currentTime === personalAIData.morningTime && lastBriefing !== today) {
        showMorningBriefing();
        localStorage.setItem('taskforce_last_briefing', today);
    }
}

// Show Morning Briefing
async function showMorningBriefing() {
    let briefing = '';

    if (typeof appSettings !== 'undefined' && appSettings.openaiApiKey) {
        briefing = await generateDailyBriefingAI();
    } else {
        briefing = generateDailyBriefing();
    }

    // Create a notification-style modal
    const briefingModal = document.createElement('div');
    briefingModal.className = 'modal';
    briefingModal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2><i data-lucide="sun"></i> Dein Tages-Briefing</h2>
                <button class="modal-close-icon" onclick="this.closest('.modal').remove()">✕</button>
            </div>
            <div class="modal-body">
                ${briefing}
            </div>
            <div class="modal-footer">
                <button class="btn-primary" onclick="this.closest('.modal').remove()">Verstanden</button>
            </div>
        </div>
    `;

    document.body.appendChild(briefingModal);

    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Speak the briefing
    const textToSpeak = briefing.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    if (typeof speakAI === 'function') {
        speakAI(textToSpeak);
    } else if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = 'de-DE';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPersonalAI);
} else {
    initPersonalAI();
}
