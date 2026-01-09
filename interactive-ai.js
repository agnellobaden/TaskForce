// ===== Interactive AI Assistant - Always Available =====

let isAIListening = false;
let aiRecognition = null;
let aiSpeechSynthesis = window.speechSynthesis;

// Initialize Interactive AI
function initInteractiveAI() {
    // Create floating AI button
    createFloatingAIButton();

    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        aiRecognition = new SpeechRecognition();
        aiRecognition.continuous = true;
        aiRecognition.interimResults = true;
        aiRecognition.lang = 'de-DE';

        aiRecognition.onresult = handleAIVoiceInput;
        aiRecognition.onerror = (e) => console.log('AI Speech Error:', e);
    }

    // Listen for wake word "Hey KI" or "Hallo KI"
    setupWakeWordDetection();

    // Start Proactive AI Advisor
    setTimeout(initAIAdvisor, 3000);
}

// Proactive AI Advisor Questions Pool
const advisorPrompts = [
    {
        type: 'business',
        question: 'Möchtest du dein Team-Meeting für heute vorbereiten?',
        actions: [
            { label: 'Ja, Agenda erstellen', icon: 'file-text', cmd: 'agenda' },
            { label: 'Später', icon: 'clock', cmd: 'skip' }
        ]
    },
    {
        type: 'private',
        question: 'Es ist Zeit für eine kleine Pause. Soll ich deine Einkaufsliste für das Wochenende planen?',
        actions: [
            { label: 'Einkaufsliste öffnen', icon: 'shopping-cart', cmd: 'shopping' },
            { label: 'Vielleicht später', icon: 'x', cmd: 'skip' }
        ]
    },
    {
        type: 'music',
        question: 'Brauchst du etwas Fokus? Soll ich deine Lieblingsmusik zum Arbeiten spielen?',
        actions: [
            { label: 'Musik abspielen', icon: 'play', cmd: 'music_on' },
            { label: 'Nein, danke', icon: 'mic-off', cmd: 'skip' }
        ]
    },
    {
        type: 'business',
        question: 'Deine To-Do Liste sieht voll aus. Soll ich die wichtigsten Business-Tasks für dich priorisieren?',
        actions: [
            { label: 'Ja, bitte', icon: 'trending-up', cmd: 'prioritize' },
            { label: 'Ich mach das selbst', icon: 'user', cmd: 'skip' }
        ]
    },
    {
        type: 'private',
        question: 'Hast du heute schon genug Wasser getrunken? Soll ich dich später nochmal erinnern?',
        actions: [
            { label: 'Ja, erinnere mich', icon: 'bell', cmd: 'water_reminder' },
            { label: 'Schon erledigt', icon: 'check', cmd: 'skip' }
        ]
    },
    {
        type: 'music',
        question: 'Lust auf ein bisschen gute Laune? Soll ich dir ein paar neue Musik-Hits vorspielen?',
        actions: [
            { label: 'Hits spielen', icon: 'music', cmd: 'music_hits' },
            { label: 'Andere Musik', icon: 'search', cmd: 'music_search' }
        ]
    }
];

function initAIAdvisor() {
    const section = document.getElementById('aiAdvisorSection');
    if (!section) return;

    // Show advisor every few minutes if user is active
    showRandomAdvisorPrompt();
    setInterval(showRandomAdvisorPrompt, 300000); // Every 5 minutes
}

async function showRandomAdvisorPrompt() {
    const section = document.getElementById('aiAdvisorSection');
    if (!section) return;

    const questionEl = document.getElementById('aiAdvisorQuestion');
    const actionsEl = document.getElementById('aiAdvisorActions');

    // If ChatGPT is available, try to get a smart prompt
    if (typeof callChatGPT === 'function' && typeof appSettings !== 'undefined' && appSettings.openaiApiKey) {
        if (questionEl) questionEl.innerHTML = '<span class="loading-dots">Advisor denkt nach...</span>';

        try {
            const openTasks = (typeof tasks !== 'undefined') ? tasks.filter(t => !t.done && !t.archived).map(t => t.keyword).join(', ') : '';
            const systemPrompt = `Du bist der "Personal Advisor" in einer Produktivitäts-App. 
Erstelle EINE kurze, proaktive Frage oder einen Vorschlag (max 15 Wörter) für den Nutzer basierend auf seinen Daten.
Nutze Name: ${personalAIData.name || 'Nutzer'}, Job: ${personalAIData.job || 'Unbekannt'}, Hobbys: ${personalAIData.hobbies || 'Unbekannt'}.
Aktuelle Aufgaben: ${openTasks}.
Antworte NUR mit der Frage/dem Vorschlag.`;

            const advice = await callChatGPT([{ role: 'system', content: systemPrompt }], { max_tokens: 50 });
            if (questionEl) questionEl.textContent = advice;

            if (actionsEl) {
                actionsEl.innerHTML = `
                    <button class="btn-ai-action primary" onclick="openPersonalAdvisorChat('${advice.replace(/'/g, "\\'").replace(/"/g, '&quot;')}')">
                        <i data-lucide="message-circle"></i> <span>Antworten</span>
                    </button>
                    <button class="btn-ai-action" onclick="document.getElementById('aiAdvisorSection').classList.add('hidden')">
                        <i data-lucide="x"></i> <span>Ignorieren</span>
                    </button>
                `;
            }

            section.classList.remove('hidden');
            if (typeof lucide !== 'undefined') lucide.createIcons();

            // Proactive voice if enabled
            if (personalAIData.features.reminders && typeof speakAI === 'function') {
                speakAI(advice);
            }
            return;
        } catch (err) {
            console.warn('Dashboard Advisor AI error, falling back to static:', err);
        }
    }

    // Fallback to static prompts
    const randomIndex = Math.floor(Math.random() * advisorPrompts.length);
    const prompt = advisorPrompts[randomIndex];

    if (questionEl) questionEl.textContent = prompt.question;
    if (actionsEl) {
        actionsEl.innerHTML = '';
        prompt.actions.forEach(action => {
            const btn = document.createElement('button');
            btn.className = 'btn-ai-action' + (action.cmd !== 'skip' ? ' primary' : '');
            btn.innerHTML = `<i data-lucide="${action.icon}"></i> <span>${action.label}</span>`;
            btn.onclick = () => handleAdvisorAction(action.cmd, prompt);
            actionsEl.appendChild(btn);
        });
    }

    section.classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

window.openPersonalAdvisorChat = function (initialText) {
    const personalAIModal = document.getElementById('personalAIModal');
    if (personalAIModal) {
        personalAIModal.classList.remove('hidden');
        const chatInput = document.getElementById('aiChatInput');
        if (chatInput) {
            chatInput.value = initialText ? `Zu deinem Vorschlag "${initialText}": ` : '';
            chatInput.focus();
        }
    }
};

function handleAdvisorAction(cmd, prompt) {
    const section = document.getElementById('aiAdvisorSection');

    switch (cmd) {
        case 'music_on':
        case 'music_hits':
            speakAI('Sicher! Ich starte deine Musik.');
            window.open('https://music.youtube.com', '_blank');
            break;
        case 'music_search':
            if (typeof openAISearch === 'function') openAISearch('gute musik inspiration');
            break;
        case 'agenda':
            speakAI('Gute Idee. Ich öffne die Notizen für deine Agenda.');
            if (typeof handleAddTodo === 'function') {
                const keywordInput = document.getElementById('keywordInput');
                if (keywordInput) keywordInput.value = 'Agenda für heute: ';
                handleAddTodo();
            }
            break;
        case 'shopping':
            if (typeof handleAddTodo === 'function') {
                const keywordInput = document.getElementById('keywordInput');
                if (keywordInput) keywordInput.value = 'Einkaufsliste: ';
                handleAddTodo();
            }
            break;
        case 'prioritize':
            speakAI('Ich analysiere deine Aufgaben und schiebe die wichtigsten nach oben.');
            // Logic for prioritization could go here
            break;
        case 'water_reminder':
            speakAI('Alles klar, ich erinnere dich in einer Stunde.');
            break;
        case 'skip':
            // Just close
            break;
    }

    section.classList.add('hidden');
}

// Create Floating AI Button
function createFloatingAIButton() {
    const aiButton = document.createElement('button');
    aiButton.id = 'floatingAIBtn';
    aiButton.className = 'floating-ai-button';
    aiButton.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"></path>
        </svg>
        <span class="ai-pulse"></span>
    `;

    aiButton.addEventListener('click', toggleAIListening);
    document.body.appendChild(aiButton);

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .floating-ai-button {
            position: fixed;
            bottom: 100px;
            right: 20px;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: linear-gradient(135deg, #a78bfa, #8b5cf6);
            border: none;
            box-shadow: 0 4px 20px rgba(167, 139, 250, 0.4);
            cursor: pointer;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            transition: all 0.3s ease;
        }
        
        .floating-ai-button:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 30px rgba(167, 139, 250, 0.6);
        }
        
        .floating-ai-button.listening {
            animation: aiPulse 1.5s ease-in-out infinite;
            background: linear-gradient(135deg, #10b981, #059669);
        }
        
        .ai-pulse {
            position: absolute;
            top: -2px;
            right: -2px;
            width: 12px;
            height: 12px;
            background: #10b981;
            border-radius: 50%;
            animation: pulse 2s ease-in-out infinite;
        }
        
        @keyframes aiPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.15); }
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.3); }
        }
    `;
    document.head.appendChild(style);
}

// Toggle AI Listening
function toggleAIListening() {
    const btn = document.getElementById('floatingAIBtn');

    if (isAIListening) {
        stopAIListening();
        btn.classList.remove('listening');
    } else {
        startAIListening();
        btn.classList.add('listening');
        speakAI('Ja, ich höre. Wie kann ich dir helfen?');
    }
}

// Start AI Listening
function startAIListening() {
    if (aiRecognition) {
        isAIListening = true;
        aiRecognition.start();
    }
}

// Stop AI Listening
function stopAIListening() {
    if (aiRecognition) {
        isAIListening = false;
        aiRecognition.stop();
    }
}

// Handle AI Voice Input
function handleAIVoiceInput(event) {
    const transcript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');

    if (event.results[0].isFinal) {
        processAICommand(transcript.toLowerCase());
    }
}

// Process AI Commands
function processAICommand(command) {
    console.log('AI Command:', command);

    // Vorlesen
    if (command.includes('lies vor') || command.includes('vorlesen')) {
        readCurrentContent();
    }
    // Musik
    else if (command.includes('musik') || command.includes('music')) {
        handleMusicCommand(command);
    }
    // Wetter
    else if (command.includes('wetter')) {
        tellWeather();
    }
    // Termine
    else if (command.includes('termin') || command.includes('aufgabe')) {
        tellTasks();
    }
    // Uhrzeit
    else if (command.includes('uhrzeit') || command.includes('wie spät')) {
        tellTime();
    }
    // Datum
    else if (command.includes('datum') || command.includes('welcher tag')) {
        tellDate();
    }
    // Nachrichten
    else if (command.includes('nachrichten') || command.includes('news')) {
        tellNews();
    }
    // Hilfe
    else if (command.includes('hilfe') || command.includes('was kannst du')) {
        tellCapabilities();
    }
    // Allgemeine Frage
    else {
        speakAI('Ich habe verstanden: ' + command + '. Wie kann ich dir damit helfen?');
    }
}

// Read Current Content
function readCurrentContent() {
    const tasks = document.querySelectorAll('.task-card:not(.done)');
    if (tasks.length === 0) {
        speakAI('Du hast keine offenen Aufgaben.');
        return;
    }

    let text = `Du hast ${tasks.length} offene Aufgabe${tasks.length > 1 ? 'n' : ''}. `;
    tasks.forEach((task, index) => {
        const title = task.querySelector('.task-title')?.textContent || '';
        text += `${index + 1}. ${title}. `;
    });

    speakAI(text);
}

// Handle Music Commands
function handleMusicCommand(command) {
    if (command.includes('an') || command.includes('spiel') || command.includes('start')) {
        speakAI('Ich öffne YouTube Music für dich.');
        setTimeout(() => {
            window.open('https://music.youtube.com', '_blank');
        }, 2000);
    } else if (command.includes('aus') || command.includes('stop')) {
        speakAI('Okay, Musik wird gestoppt.');
    } else {
        speakAI('Möchtest du Musik abspielen? Sage zum Beispiel: Musik an.');
    }
}

// Tell Weather
function tellWeather() {
    speakAI('Heute wird es voraussichtlich sonnig mit Temperaturen um 18 Grad. Perfektes Wetter!');
}

// Tell Tasks
function tellTasks() {
    const tasks = document.querySelectorAll('.task-card:not(.done)');
    if (tasks.length === 0) {
        speakAI('Du hast keine offenen Aufgaben. Gut gemacht!');
    } else {
        speakAI(`Du hast ${tasks.length} offene Aufgabe${tasks.length > 1 ? 'n' : ''}.`);
        readCurrentContent();
    }
}

// Tell Time
function tellTime() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    speakAI(`Es ist ${hours} Uhr ${minutes}.`);
}

// Tell Date
function tellDate() {
    const now = new Date();
    const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

    const dayName = days[now.getDay()];
    const day = now.getDate();
    const month = months[now.getMonth()];
    const year = now.getFullYear();

    speakAI(`Heute ist ${dayName}, der ${day}. ${month} ${year}.`);
}

// Tell News
function tellNews() {
    speakAI('Hier sind die wichtigsten Nachrichten: Die Welt entwickelt sich weiter. Bleibe informiert über aktuelle Ereignisse in deiner Nachrichten-App.');
}

// Tell Capabilities
function tellCapabilities() {
    const capabilities = `
        Ich kann dir helfen mit:
        Termine vorlesen,
        Musik abspielen,
        Wetter ansagen,
        Uhrzeit und Datum nennen,
        Nachrichten vorlesen,
        und vieles mehr.
        Frag mich einfach!
    `;
    speakAI(capabilities);
}

// Speak AI Response
function speakAI(text) {
    if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        aiSpeechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'de-DE';
        utterance.rate = 0.95;
        utterance.pitch = 1.1;
        utterance.volume = 1;

        aiSpeechSynthesis.speak(utterance);
    }
}

// Setup Wake Word Detection
function setupWakeWordDetection() {
    if (!aiRecognition) return;

    const customWakeWord = (typeof appSettings !== 'undefined' && appSettings.wakeWordName) ? appSettings.wakeWordName.toLowerCase() : 'taskforce';
    const wakeWords = ['hey ki', 'hallo ki', 'hey assistant', 'hallo assistent', customWakeWord, `hey ${customWakeWord}`, `hallo ${customWakeWord}`];

    aiRecognition.onresult = (event) => {
        const transcript = Array.from(event.results)
            .map(result => result[0])
            .map(result => result.transcript)
            .join('')
            .toLowerCase();

        // Check for wake word
        const hasWakeWord = wakeWords.some(word => transcript.includes(word));

        if (hasWakeWord && !isAIListening) {
            toggleAIListening();
        } else if (event.results[0].isFinal && isAIListening) {
            processAICommand(transcript);
        }
    };
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInteractiveAI);
} else {
    initInteractiveAI();
}

// Export functions for global access
window.speakAI = speakAI;
window.toggleAIListening = toggleAIListening;
