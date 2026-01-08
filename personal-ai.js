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

// Initialize Personal AI Modal
function initPersonalAI() {
    const personalAIBtn = document.getElementById('personalAIBtn');
    const personalAIModal = document.getElementById('personalAIModal');
    const closePersonalAIBtn = document.getElementById('closePersonalAIBtn');
    const savePersonalAIBtn = document.getElementById('savePersonalAIBtn');
    const testAIBriefingBtn = document.getElementById('testAIBriefingBtn');

    // Load saved data
    loadPersonalAIData();

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

    // Check for morning briefing
    checkMorningBriefing();
    setInterval(checkMorningBriefing, 60000); // Check every minute
}

// Load Personal AI Data from localStorage
function loadPersonalAIData() {
    document.getElementById('aiUserName').value = personalAIData.name || '';
    document.getElementById('aiUserBirthdate').value = personalAIData.birthdate || '';
    document.getElementById('aiUserGender').value = personalAIData.gender || '';
    document.getElementById('aiUserJob').value = personalAIData.job || '';
    document.getElementById('aiUserHobbies').value = personalAIData.hobbies || '';

    document.getElementById('aiWeatherToggle').checked = personalAIData.features.weather !== false;
    document.getElementById('aiNewsToggle').checked = personalAIData.features.news !== false;
    document.getElementById('aiBusinessToggle').checked = personalAIData.features.business !== false;
    document.getElementById('aiPrivateToggle').checked = personalAIData.features.private !== false;
    document.getElementById('aiRemindersToggle').checked = personalAIData.features.reminders !== false;

    document.getElementById('aiMorningTime').value = personalAIData.morningTime || '07:00';

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

    if (typeof showToast === 'function') {
        showToast('Persönliche KI-Einstellungen gespeichert!', 'success');
    }

    document.getElementById('personalAIModal').classList.add('hidden');
}

// Update Age Display
function updateAgeDisplay() {
    const birthdate = document.getElementById('aiUserBirthdate').value;
    const ageDisplay = document.getElementById('aiAgeDisplay');

    if (birthdate) {
        const age = calculateAge(birthdate);
        ageDisplay.textContent = `Du bist ${age} Jahre alt`;
    } else {
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

    preview.classList.remove('hidden');
    content.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="loading-spinner"></i> Erstelle dein Briefing...</div>';

    setTimeout(() => {
        const briefing = generateDailyBriefing();
        content.innerHTML = briefing;

        // Speak the briefing if voice is enabled
        if (personalAIData.features.reminders && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(briefing.replace(/<[^>]*>/g, ''));
            utterance.lang = 'de-DE';
            utterance.rate = 0.9;
            window.speechSynthesis.speak(utterance);
        }
    }, 1500);
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

    briefing += `<div style="margin-top: 15px; font-style: italic; opacity: 0.8;">Viel Erfolg heute! 🚀</div>`;

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
function showMorningBriefing() {
    const briefing = generateDailyBriefing();

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
    if ('speechSynthesis' in window) {
        const text = briefing.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        const utterance = new SpeechSynthesisUtterance(text);
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
