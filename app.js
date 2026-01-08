
// ===== TaskForce App - Main JavaScript =====
const appSessionId = Math.random().toString(36).substring(2, 10);
console.log("App Session ID:", appSessionId);

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCdiwAhgLBNnIdgvpWW3qpeTaKoSy1nTM0",
    authDomain: "taskforce-91683.firebaseapp.com",
    projectId: "taskforce-91683",
    storageBucket: "taskforce-91683.firebasestorage.app",
    messagingSenderId: "203568113458",
    appId: "1:203568113458:web:666709ae3263977a43592b",
    measurementId: "G-K8GQZGB8KE"
};

// Initialize Firebase
let db = null;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    console.log("Firebase initialisiert");
} catch (e) {
    console.warn("Firebase konnte nicht initialisiert werden (evtl. Config fehlt):", e);
}

// User & Task Storage
// User & Task Storage
let currentUser = JSON.parse(localStorage.getItem('taskforce_user')) || null;
if (currentUser && !currentUser.name) currentUser = null; // Ensure valid user
let tasks = [];
let currentFilter = 'all';
let currentTask = null;
let urgentActiveTask = null; // Separate variable for urgent popups to avoid data loss
let urgentReminderInterval = null;
let deferredPrompt = null;
let currentCalendarDate = new Date(); // To track calendar month
let teamBadge, teamCodeName, syncBtn;
let teamCodeLogin, teamCodeReg;
let toastContainer;

// Auth & UI Elements
let loginScreen, mainApp, userNameLogin, userPinLogin, loginBtn;
let userNameReg, userPinReg, userPinConfirm, registerBtn;
let tabLogin, tabRegister, loginForm, registerForm, avatarPicker;
let keywordInput, addTaskBtn, addTodoBtn, quickTodoSection, todoList, clearDoneTodosBtn, tasksList, emptyState, displayUserName, userAvatar, logoutBtn; // syncBtn moved
let questionsModal, taskKeywordDisplay, questionsContainer, cancelTaskBtn, saveTaskBtn;
let taskDetailModal, closeDetailModal, detailTaskTitle, detailTaskStatus, detailContent, deleteTaskBtn, toggleDoneBtn, editTaskBtn, archiveTaskBtn;
let urgentOverlay, urgentTaskText, urgentDoneBtn, urgentLaterBtn, filterTabs;
let driveModeOverlay, driveTaskTitle, driveTaskLocation, startNavBtn, closeDriveBtn, speedValue;
let grokModal, grokInput, grokResponse, closeGrokBtn;
let totalTasksEl, urgentTasksEl, doneTasksEl;
let taskFileUpload, taskFileName, toggleUploadBtn, uploadSection, removeFileBtn, voiceBtn;
let hamburgerBtn, sideMenuOverlay, closeSideMenu, sideCalendarBtn, sideDriveBtn, sideSettingsBtn, sideSyncBtn, sideLogoutBtn;
let calendarBtn, closeCalendarBtn, prevMonthBtn, nextMonthBtn;
let teamCodeInput, voiceStatus, globalRecordingDot,
    teamNotificationOverlay, teamNotificationText, teamNotificationDetails, closeTeamNotificationBtn;
let wakeWordRecognition = null;
let isWakeWordListening = false;
let mainRecognition = null;
let tesseractWorker = null; // Warm worker for faster scans
let alarms = [];
let activeAlarm = null;
let alarmTimer = null;
let nightstandTimer = null;

// AI Research Result Modal Elements
let aiResearchResultModal, closeAiResearchResultBtn, aiResultContent, researchAppointmentList, saveInNewAppointmentBtn, cancelAiResearchResultBtn;
let expenses = [];
let expenseBtn, sideExpenseBtn, expenseSection, expenseModal, closeExpenseModalBtn, addExpenseBtn, saveExpenseBtn, expenseImageInput, receiptPreview, scannerOverlay, expenseResultForm;
let expDate, expStore, expCategory, expAmount, expenseTableBody, expDay, expWeek, expMonth, expYear;
let paypalBtn, sidePaypalBtn, paypalModal, closePaypalBtn, redirectToPaypalBtn;
let commBtn, sideCommBtn, commModal, closeCommBtn, btnCall, btnWhatsApp, btnEmail, commInput, commContactBtn;
let appContactBtn, appPerson, appPhone;
let syncContactsBtn, syncedContactsList;
let savedContacts = JSON.parse(localStorage.getItem('taskforce_contacts')) || [];

let quickCallBtn, quickWaBtn, quickMailBtn;
let manualDriveBtn, alarmBtn; // Header buttons restored
let settingsModal, closeSettingsModal, saveSettingsBtn, themeSelect, soundSelect, defaultSnoozeSelect, testSoundBtn, snoozeTimeSelect, settingsAvatarPicker, settingsAvatarUpload;
let appSettings = Object.assign({
    theme: 'dark',
    sound: 'beep',
    defaultSnooze: '5',
    wakeWordEnabled: false,
    wakeWordName: 'Taskforce',
    voiceBeepEnabled: false, // Default OFF as requested
    aiTipsEnabled: true,
    aiVoiceEnabled: true,
    openaiApiKey: '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', // Auto-inserted key
    autoArchive: true,
    locationTracking: true,
    driveModeEnabled: true,
    urgentPopupEnabled: true, // NEW: Toggle for urgent popups
    homeAddress: '',
    reminderLeadTime: 60,
    aiProvider: 'grok',
    headerIconCalendar: true,
    headerIconExpense: true,
    headerIconScan: true,
    headerIconAlarm: true,
    headerIconDrive: true,
    headerIconNight: true
}, JSON.parse(localStorage.getItem('taskforce_settings')) || {});

let userPos = null;

let installPrompt, installBtn, dismissInstall, installBanner, installAppBtn, closeInstallBanner;

let currentFileBase64 = null;
let currentFileName = null;

// Keyword Detection for smart questions
const keywordPatterns = {
    phone: {
        keywords: ['anrufen', 'telefon', 'tel', 'call', 'rückruf', 'kontakt'],
        question: { label: '📞 Telefonnummer', type: 'tel', placeholder: 'z.B. 0123 456789' }
    },
    document: {
        keywords: ['unterlagen', 'dokument', 'papiere', 'formular', 'antrag', 'vertrag', 'bescheinigung'],
        question: { label: '📄 Welche Unterlagen?', type: 'text', placeholder: 'z.B. Ausweis, Vertrag...' }
    },
    appointment: {
        keywords: ['termin', 'arzt', 'meeting', 'treffen', 'besprechung', 'verabredung'],
        question: { label: '📅 Wann?', type: 'datetime-local', placeholder: '' }
    },
    location: {
        keywords: ['ort', 'adresse', 'wo', 'location', 'treffpunkt', 'abholen', 'termin'],
        question: { label: '📍 Wo?', type: 'text', placeholder: 'z.B. Hauptstraße 1...' }
    },
    person: {
        keywords: ['person', 'name', 'wer', 'kontakt', 'kunde', 'kollege', 'chef'],
        question: { label: '👤 Wer?', type: 'text', placeholder: 'Name der Person...' }
    },
    amount: {
        keywords: ['geld', 'euro', 'bezahlen', 'überweisen', 'kaufen', 'kosten', 'betrag'],
        question: { label: '💰 Betrag', type: 'number', placeholder: 'z.B. 50' }
    },
    email: {
        keywords: ['email', 'e-mail', 'mail', 'schreiben', 'nachricht'],
        question: { label: '✉️ E-Mail Adresse', type: 'email', placeholder: 'z.B. max@example.de' }
    },
    birthday: {
        keywords: ['geburtstag', 'birthday', 'geboren', 'wiegefest'],
        question: { label: '🎂 Geburtstag', type: 'text', placeholder: 'z.B. 24.12.' }
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initDOMElements();
    setupPWA();
    checkLoginStatus();
    setupEventListeners();

    // Attempt to start wake word on any interaction in case it was blocked
    document.addEventListener('click', () => {
        if (!isWakeWordListening && currentUser) {
            initWakeWordRecognition();
        }
        startLocationTracking();
    }, { once: true });

    checkUrlActions();

    // Start Alarm Check Interval
    setInterval(checkAlarms, 10000); // Check every 10 seconds
});

function checkUrlActions() {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');

    if (action === 'new') {
        setTimeout(() => {
            if (currentUser && keywordInput) {
                keywordInput.focus();
                keywordInput.classList.add('highlight-flash');
            }
        }, 1500); // Wait for login restoration
    }
}

// Initialize DOM Elements
function initDOMElements() {
    // Auth Elements
    loginScreen = document.getElementById('loginScreen');
    mainApp = document.getElementById('mainApp');
    userNameLogin = document.getElementById('userNameLogin');
    userPinLogin = document.getElementById('userPinLogin');
    loginBtn = document.getElementById('loginBtn');
    userNameReg = document.getElementById('userNameReg');
    userPinReg = document.getElementById('userPinReg');
    userPinConfirm = document.getElementById('userPinConfirm');
    registerBtn = document.getElementById('registerBtn');
    tabLogin = document.getElementById('tabLogin');
    tabRegister = document.getElementById('tabRegister');
    loginForm = document.getElementById('loginForm');
    registerForm = document.getElementById('registerForm');
    avatarPicker = document.getElementById('avatarPicker');
    teamCodeLogin = document.getElementById('teamCodeLogin');
    teamCodeReg = document.getElementById('teamCodeReg');

    // Grok Elements
    grokModal = document.getElementById('grokModal');
    grokInput = document.getElementById('grokInput');
    grokResponse = document.getElementById('grokResponse');
    closeGrokBtn = document.getElementById('closeGrokBtn');
    grokManualBtn = document.getElementById('grokManualBtn');

    // AI Selection Elements
    const aiSelectionMenu = document.getElementById('aiSelectionMenu');
    const aiOptions = document.querySelectorAll('.ai-option');

    if (closeGrokBtn) closeGrokBtn.addEventListener('click', () => {
        grokModal.classList.add('hidden');
        if (typeof stopWakeWord === 'function') startWakeWord(); // Resume listening when closed
    });

    const aiSelectorArrow = document.getElementById('aiSelectorArrow');

    if (grokManualBtn) {
        grokManualBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const val = keywordInput.value.trim();
            if (val) {
                openAISearch(val); // Öffnet die ausgewählte KI (Original)
                keywordInput.value = '';
            } else {
                openAISearch(''); // Öffnet die Homepage der KI
            }
        });
    }

    if (aiSelectorArrow) {
        aiSelectorArrow.addEventListener('click', (e) => {
            e.stopPropagation();
            aiSelectionMenu.classList.toggle('hidden');
            aiOptions.forEach(opt => {
                opt.classList.toggle('active', opt.dataset.provider === (appSettings.aiProvider || 'grok'));
            });
        });
    }

    document.addEventListener('click', () => {
        if (aiSelectionMenu) aiSelectionMenu.classList.add('hidden');
    });

    if (aiOptions) {
        aiOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const provider = option.dataset.provider;
                appSettings.aiProvider = provider;
                localStorage.setItem('taskforce_settings', JSON.stringify(appSettings));
                if (document.getElementById('aiProviderSelect')) {
                    document.getElementById('aiProviderSelect').value = provider;
                }
                updateRobotIcon(provider);
                aiSelectionMenu.classList.add('hidden');
                showToast(`${getAiName()} ausgewählt`, 'success');
            });
        });
    }

    // Expense Tracker Elements
    expenseBtn = document.getElementById('expenseBtn');
    sideExpenseBtn = document.getElementById('sideExpenseBtn');
    expenseSection = document.getElementById('expenseSection');
    expenseModal = document.getElementById('expenseModal');
    closeExpenseModalBtn = document.getElementById('closeExpenseModalBtn');
    addExpenseBtn = document.getElementById('addExpenseBtn');
    saveExpenseBtn = document.getElementById('saveExpenseBtn');
    expenseImageInput = document.getElementById('expenseImageInput');
    receiptPreview = document.getElementById('receiptPreview');
    scannerOverlay = document.getElementById('scannerOverlay');
    expenseResultForm = document.getElementById('expenseResultForm');
    expDate = document.getElementById('expDate');
    expStore = document.getElementById('expStore');
    expCategory = document.getElementById('expCategory');
    expAmount = document.getElementById('expAmount');
    expenseTableBody = document.getElementById('expenseTableBody');
    expDay = document.getElementById('expDay');
    expWeek = document.getElementById('expWeek');
    expMonth = document.getElementById('expMonth');
    expYear = document.getElementById('expYear');
    const expenseSearchInput = document.getElementById('expenseSearch');
    if (expenseSearchInput) {
        expenseSearchInput.addEventListener('input', (e) => renderExpenses(e.target.value));
    }

    // PayPal
    paypalBtn = document.getElementById('paypalBtn');
    sidePaypalBtn = document.getElementById('sidePaypalBtn');
    paypalModal = document.getElementById('paypalModal');
    closePaypalBtn = document.getElementById('closePaypalBtn');
    redirectToPaypalBtn = document.getElementById('redirectToPaypalBtn');

    if (paypalBtn) paypalBtn.addEventListener('click', () => paypalModal.classList.remove('hidden'));
    if (sidePaypalBtn) sidePaypalBtn.addEventListener('click', () => { paypalModal.classList.remove('hidden'); sideMenuOverlay.classList.add('hidden'); });
    if (closePaypalBtn) closePaypalBtn.addEventListener('click', () => paypalModal.classList.add('hidden'));
    if (redirectToPaypalBtn) redirectToPaypalBtn.addEventListener('click', () => {
        window.open('https://www.paypal.com/signin', '_blank');
        paypalModal.classList.add('hidden');
    });

    // Communication
    commBtn = document.getElementById('commBtn');
    sideCommBtn = document.getElementById('sideCommBtn');
    commModal = document.getElementById('commModal');
    closeCommBtn = document.getElementById('closeCommBtn');
    btnCall = document.getElementById('btnCall');
    btnWhatsApp = document.getElementById('btnWhatsApp');
    btnEmail = document.getElementById('btnEmail');
    commInput = document.getElementById('commInput');
    commContactBtn = document.getElementById('commContactBtn');
    syncContactsBtn = document.getElementById('syncContactsBtn');
    syncedContactsList = document.getElementById('syncedContactsList');

    // Render contacts on init
    if (syncedContactsList) renderSyncedContacts();
    appContactBtn = document.getElementById('appContactBtn');
    appPerson = document.getElementById('appPerson');
    appPhone = document.getElementById('appPhone');

    // Quick Actions (Mobile Bar)
    quickCallBtn = document.getElementById('quickCallBtn');
    quickWaBtn = document.getElementById('quickWaBtn');
    quickMailBtn = document.getElementById('quickMailBtn');

    if (commBtn) commBtn.addEventListener('click', () => commModal.classList.remove('hidden'));
    if (sideCommBtn) sideCommBtn.addEventListener('click', () => { commModal.classList.remove('hidden'); sideMenuOverlay.classList.add('hidden'); });
    if (closeCommBtn) closeCommBtn.addEventListener('click', () => commModal.classList.add('hidden'));

    // Unified Global Helper for comm actions
    window.handleCommunicationAction = async (type, value) => {
        let val = value ? value.trim() : (commInput ? commInput.value.trim() : '');

        // If empty, try to pick from contact book first (User request: "telefon mit dem telfonbuxh")
        if (!val) {
            if (window.pickNativeContact) {
                // Determine which field to prioritize based on action
                const contact = await window.pickNativeContact();
                if (contact) {
                    if (type === 'email' && contact.email && contact.email.length > 0) val = contact.email[0];
                    else if (contact.tel && contact.tel.length > 0) val = contact.tel[0];

                    // Update input if available
                    if (commInput && val) commInput.value = val;
                }
            }
        }

        if (!val) {
            if (!commModal.classList.contains('hidden')) showToast('Kein Kontakt ausgewählt.', 'error');
            else commModal.classList.remove('hidden');
            return;
        }

        if (type === 'call') window.location.href = 'tel:' + val;

        if (type === 'whatsapp') {
            let clean = val.replace(/[^0-9+]/g, '');
            if (clean.startsWith('0')) clean = '49' + clean.substring(1);
            if (clean.startsWith('+')) clean = clean.substring(1);

            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

            if (isMobile) {
                window.location.href = 'whatsapp://send?phone=' + clean;
            } else {
                window.open('https://web.whatsapp.com/send?phone=' + clean, '_blank');
            }
        }

        if (type === 'email') {
            if (val.toLowerCase() === 'gmail') {
                window.open('https://mail.google.com/', '_blank');
                return;
            }

            // User requested explicit Gmail opening
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

            if (!isMobile) {
                // On Desktop/Web, force Gmail Compose Interface
                window.open('https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(val), '_blank');
            } else {
                // On Mobile, standard mailto is best
                window.location.href = 'mailto:' + val;
            }
        }
    };

    // Local wrapper for buttons
    const doCommAction = (type, value) => window.handleCommunicationAction(type, value);

    if (btnCall) btnCall.addEventListener('click', () => doCommAction('call'));
    if (btnWhatsApp) btnWhatsApp.addEventListener('click', () => doCommAction('whatsapp'));
    if (btnEmail) btnEmail.addEventListener('click', () => doCommAction('email'));

    // Quick Action Listeners (Input -> Action)
    if (quickCallBtn) quickCallBtn.addEventListener('click', () => doCommAction('call', keywordInput.value));
    if (quickWaBtn) quickWaBtn.addEventListener('click', () => doCommAction('whatsapp', keywordInput.value));
    if (quickMailBtn) quickMailBtn.addEventListener('click', () => doCommAction('email', keywordInput.value));

    // CONTACT PICKER LOGIC (Exposed Globally)
    window.pickNativeContact = async () => {
        if (!('contacts' in navigator && 'ContactsManager' in window)) {
            showToast('Kontakt-Zugriff nicht unterstützt.', 'error');
            return null;
        }
        try {
            const props = ['name', 'tel', 'email'];
            const contacts = await navigator.contacts.select(props, { multiple: false });
            if (contacts && contacts.length > 0) {
                return contacts[0];
            }
        } catch (err) {
            // console.error(err);
            // Handle dismissed picker generally silently or small log
        }
        return null;
    };

    if (commContactBtn) {
        commContactBtn.addEventListener('click', async () => {
            const c = await window.pickNativeContact();
            if (c) {
                // Prioritize Tel, then Email
                let val = '';
                if (c.tel && c.tel.length > 0) val = c.tel[0];
                else if (c.email && c.email.length > 0) val = c.email[0];

                if (val && commInput) commInput.value = val;
            }
        });
    }

    if (appContactBtn) {
        if (appContactBtn) {
            appContactBtn.addEventListener('click', async () => {
                const c = await window.pickNativeContact();
                if (c) {
                    if (c.name && c.name.length > 0 && appPerson) appPerson.value = c.name[0];
                    if (c.tel && c.tel.length > 0 && appPhone) appPhone.value = c.tel[0];
                }
            });
        }
    }

    if (syncContactsBtn) {
        syncContactsBtn.addEventListener('click', async () => {
            if (!('contacts' in navigator && 'ContactsManager' in window)) {
                showToast('Kontakt-Import nicht unterstützt.', 'error');
                return;
            }
            try {
                const props = ['name', 'tel', 'email'];
                const contacts = await navigator.contacts.select(props, { multiple: true });
                if (contacts && contacts.length > 0) {
                    // Merge with existing
                    const newContacts = contacts.map(c => ({
                        name: c.name && c.name[0] ? c.name[0] : 'Unbekannt',
                        tel: c.tel && c.tel[0] ? c.tel[0] : '',
                        email: c.email && c.email[0] ? c.email[0] : ''
                    }));

                    // Simple de-dupe by name
                    newContacts.forEach(nc => {
                        if (!savedContacts.find(sc => sc.name === nc.name)) {
                            savedContacts.push(nc);
                        }
                    });

                    localStorage.setItem('taskforce_contacts', JSON.stringify(savedContacts));
                    renderSyncedContacts();
                    showToast(`${newContacts.length} Kontakte importiert.`, 'success');
                }
            } catch (err) {
                console.error(err);
            }
        });
    }

    function renderSyncedContacts() {
        if (!syncedContactsList) return;
        syncedContactsList.innerHTML = '';
        if (savedContacts.length === 0) {
            syncedContactsList.innerHTML = '<div class="empty-contacts" style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 1rem;">Keine Kontakte synchronisiert.</div>';
            return;
        }

        savedContacts.forEach((c, index) => {
            const el = document.createElement('div');
            el.className = 'synced-contact-item';

            // Construct Action buttons based on what data is available
            let actions = '';
            if (c.tel) {
                actions += `<button class="synced-action-btn" onclick="doSyncedAction('call', '${c.tel}')" title="Anrufen">📞</button>`;
                actions += `<button class="synced-action-btn" onclick="doSyncedAction('wa', '${c.tel}')" title="WhatsApp">💬</button>`;
            }
            if (c.email) {
                actions += `<button class="synced-action-btn" onclick="doSyncedAction('email', '${c.email}')" title="E-Mail">✉️</button>`;
            }
            actions += `<button class="synced-action-btn" style="color:#ef4444;" onclick="removeSyncedContact(${index})" title="Entfernen">✕</button>`;

            el.innerHTML = `
                <div class="synced-contact-header">
                    <span class="synced-contact-name">${c.name}</span>
                    <div class="synced-contact-actions">
                        ${actions}
                    </div>
                </div>
                <div class="synced-contact-details">
                    ${c.tel ? '📞 ' + c.tel : ''} ${c.email ? '✉️ ' + c.email : ''}
                </div>
             `;
            syncedContactsList.appendChild(el);
        });
    }

    // Global helper for the onclicks in HTML string
    window.doSyncedAction = (type, val) => {
        if (window.handleCommunicationAction) {
            // Map 'wa' to 'whatsapp' for consistency
            if (type === 'wa') type = 'whatsapp';
            window.handleCommunicationAction(type, val);
        }
    };

    window.removeSyncedContact = (index) => {
        savedContacts.splice(index, 1);
        localStorage.setItem('taskforce_contacts', JSON.stringify(savedContacts));
        renderSyncedContacts();
    };

    updateRobotIcon(appSettings.aiProvider || 'grok');

    // Main App
    keywordInput = document.getElementById('keywordInput');
    addTodoBtn = document.getElementById('addTodoBtn');
    quickTodoSection = document.getElementById('quickTodoSection');
    todoList = document.getElementById('todoList');
    clearDoneTodosBtn = document.getElementById('clearDoneTodosBtn');

    if (keywordInput) {
        keywordInput.addEventListener('input', () => {
            keywordInput.style.height = 'auto';
            keywordInput.style.height = (keywordInput.scrollHeight) + 'px';
        });
        // Also handle Enter key for confirm
        keywordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                if (e.ctrlKey) {
                    e.preventDefault();
                    handleAddTodo();
                } else if (!e.shiftKey) {
                    e.preventDefault();
                    handleAddTask();
                }
            }
        });
    }
    addTaskBtn = document.getElementById('addTaskBtn');
    tasksList = document.getElementById('tasksList');
    emptyState = document.getElementById('emptyState');
    displayUserName = document.getElementById('displayUserName');
    userAvatar = document.getElementById('userAvatar');
    logoutBtn = document.getElementById('logoutBtn');
    syncBtn = document.getElementById('syncBtn');
    calendarBtn = document.getElementById('calendarBtn');
    closeCalendarBtn = document.getElementById('closeCalendarBtn');
    prevMonthBtn = document.getElementById('prevMonthBtn');
    nextMonthBtn = document.getElementById('nextMonthBtn');
    filterTabs = document.querySelectorAll('.tab-btn');

    // Start Clock
    updateGlobalClock();
    setInterval(updateGlobalClock, 1000);

    // Modals & Overlays
    questionsModal = document.getElementById('questionsModal');
    taskKeywordDisplay = document.getElementById('taskKeywordDisplay');
    questionsContainer = document.getElementById('questionsContainer');
    cancelTaskBtn = document.getElementById('cancelTaskBtn');
    saveTaskBtn = document.getElementById('saveTaskBtn');

    taskDetailModal = document.getElementById('taskDetailModal');
    closeDetailModal = document.getElementById('closeDetailModal');
    detailTaskTitle = document.getElementById('detailTaskTitle');
    detailTaskStatus = document.getElementById('detailTaskStatus');
    detailContent = document.getElementById('detailContent');
    deleteTaskBtn = document.getElementById('deleteTaskBtn');
    toggleDoneBtn = document.getElementById('toggleDoneBtn');
    editTaskBtn = document.getElementById('editTaskBtn');
    archiveTaskBtn = document.getElementById('archiveTaskBtn');

    urgentOverlay = document.getElementById('urgentOverlay');
    urgentTaskText = document.getElementById('urgentTaskText');
    urgentDoneBtn = document.getElementById('urgentDoneBtn');
    urgentLaterBtn = document.getElementById('urgentLaterBtn');

    driveModeOverlay = document.getElementById('driveModeOverlay');
    driveTaskTitle = document.getElementById('driveTaskTitle');
    driveTaskLocation = document.getElementById('driveTaskLocation');
    startNavBtn = document.getElementById('startNavBtn');
    closeDriveBtn = document.getElementById('closeDriveBtn');
    speedValue = document.getElementById('speedValue');

    // Restored Header Buttons
    manualDriveBtn = document.getElementById('manualDriveBtn');
    alarmBtn = document.getElementById('alarmBtn');

    if (manualDriveBtn) manualDriveBtn.addEventListener('click', () => {
        openDriveMode(); // Assuming function exists
    });
    if (alarmBtn) alarmBtn.addEventListener('click', () => {
        // Reuse side alarm logic or simple toggle
        const alarmSection = document.getElementById('alarmSection');
        if (alarmSection) {
            alarmSection.classList.remove('hidden');
            // Scroll to it or ensure visible
            alarmSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            showToast('Wecker-Sektion nicht gefunden.', 'error');
        }
    });

    // Stats
    totalTasksEl = document.getElementById('totalTasks');
    urgentTasksEl = document.getElementById('urgentTasks');
    doneTasksEl = document.getElementById('doneTasks');

    // Task File & Voice
    taskFileUpload = document.getElementById('taskFileUpload');
    taskFileName = document.getElementById('taskFileName');
    toggleUploadBtn = document.getElementById('toggleUploadBtn');
    uploadSection = document.getElementById('uploadSection');
    removeFileBtn = document.getElementById('removeFileBtn');
    voiceBtn = document.getElementById('voiceBtn');
    voiceStatus = document.getElementById('voiceStatus');
    globalRecordingDot = document.getElementById('globalRecordingDot');

    // Team & Install
    teamBadge = document.getElementById('teamBadge');
    teamCodeName = document.getElementById('teamCodeName');
    teamCodeLogin = document.getElementById('teamCodeLogin');
    teamCodeReg = document.getElementById('teamCodeReg');

    // Team Notification Elements
    teamNotificationOverlay = document.getElementById('teamNotificationOverlay');
    teamNotificationText = document.getElementById('teamNotificationText');
    teamNotificationDetails = document.getElementById('teamNotificationDetails');
    closeTeamNotificationBtn = document.getElementById('closeTeamNotificationBtn');

    // Settings Elements
    settingsModal = document.getElementById('settingsModal');
    closeSettingsModal = document.getElementById('closeSettingsModal');
    saveSettingsBtn = document.getElementById('saveSettingsBtn');
    themeSelect = document.getElementById('themeSelect');
    soundSelect = document.getElementById('soundSelect');
    defaultSnoozeSelect = document.getElementById('defaultSnoozeSelect');
    testSoundBtn = document.getElementById('testSoundBtn');
    snoozeTimeSelect = document.getElementById('snoozeTimeSelect');
    settingsAvatarPicker = document.getElementById('settingsAvatarPicker');
    settingsAvatarUpload = document.getElementById('settingsAvatarUpload');
    aiProviderSelect = document.getElementById('aiProviderSelect');

    applyAppSettings();

    installPrompt = document.getElementById('installPrompt');
    installBtn = document.getElementById('installBtn');
    dismissInstall = document.getElementById('dismissInstall');
    installBanner = document.getElementById('installBanner');
    installAppBtn = document.getElementById('installAppBtn');
    closeInstallBanner = document.getElementById('closeInstallBanner');

    // Sidebar Menu
    hamburgerBtn = document.getElementById('hamburgerBtn');
    sideMenuOverlay = document.getElementById('sideMenuOverlay');
    closeSideMenu = document.getElementById('closeSideMenu');
    sideCalendarBtn = document.getElementById('sideCalendarBtn');
    sideDriveBtn = document.getElementById('sideDriveBtn');
    sideSettingsBtn = document.getElementById('sideSettingsBtn');
    sideSyncBtn = document.getElementById('sideSyncBtn');
    sideLogoutBtn = document.getElementById('sideLogoutBtn');

    if (sideDriveBtn) sideDriveBtn.addEventListener('click', () => {
        openDriveMode();
        toggleSideMenu();
    });

    // Additional Side Buttons
    const sideAlarmBtn = document.getElementById('sideAlarmBtn');
    const sideNightstandBtn = document.getElementById('sideNightstandBtn');
    const sideTodoBtn = document.getElementById('sideTodoBtn'); // New Sidebar Button
    const sideNightstandBtnHeader = document.getElementById('sideNightstandBtnHeader'); // New Header Button for Nightstand

    if (sideTodoBtn) sideTodoBtn.addEventListener('click', () => {
        // Toggle Quick Todo Section
        const qts = document.getElementById('quickTodoSection');
        if (qts) {
            qts.classList.remove('hidden');
            qts.scrollIntoView({ behavior: 'smooth' });
        }
        toggleSideMenu();
    });

    if (sideNightstandBtnHeader) sideNightstandBtnHeader.addEventListener('click', () => {
        // Trigger Nightstand Mode from header
        startNightstandMode();
    });

    if (sideAlarmBtn) sideAlarmBtn.addEventListener('click', () => {
        // Logic to show alarms (e.g. scroll to section or open modal)
        // For now, let's assume section toggle or similiar
        const alarmSection = document.getElementById('alarmSection');
        if (alarmSection) alarmSection.classList.toggle('hidden');
        toggleSideMenu();
    });
    if (sideNightstandBtn) sideNightstandBtn.addEventListener('click', () => {
        // Trigger Nightstand Mode from sidebar
        startNightstandMode();
        toggleSideMenu();
    });

    // AI Research Result Modal
    aiResearchResultModal = document.getElementById('aiResearchResultModal');
    closeAiResearchResultBtn = document.getElementById('closeAiResearchResultBtn');
    aiResultContent = document.getElementById('aiResultContent');
    researchAppointmentList = document.getElementById('researchAppointmentList');
    saveInNewAppointmentBtn = document.getElementById('saveInNewAppointmentBtn');
    cancelAiResearchResultBtn = document.getElementById('cancelAiResearchResultBtn');

    if (closeAiResearchResultBtn) closeAiResearchResultBtn.addEventListener('click', () => aiResearchResultModal.classList.add('hidden'));
    if (cancelAiResearchResultBtn) cancelAiResearchResultBtn.addEventListener('click', () => aiResearchResultModal.classList.add('hidden'));
    if (saveInNewAppointmentBtn) {
        saveInNewAppointmentBtn.addEventListener('click', () => {
            const data = aiResearchResultModal.dataset.extracted;
            const type = aiResearchResultModal.dataset.type;
            aiResearchResultModal.classList.add('hidden');

            // Open new appointment modal with pre-filled data
            openAppointmentModalWithData(data, type);
        });
    }

    // Toast Container
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
}

function openDriveMode() {
    const dm = document.getElementById('driveModeOverlay');
    if (dm) dm.classList.remove('hidden');
    // Attempt wake lock
    if ('wakeLock' in navigator) {
        try { navigator.wakeLock.request('screen'); } catch (e) { }
    }
}

// Toast System
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">${type === 'success' ? '✓' : (type === 'error' ? '✕' : 'ℹ')}</span>
            <span class="toast-message">${message}</span>
        </div>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('visible');
    }, 10);
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Setup PWA
function setupPWA() {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;

        // Show install prompts
        if (currentUser) {
            showInstallBanner();
        } else {
            showInstallPrompt();
        }
    });

    // Detect if running as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('Running as PWA');
    }
}

function showInstallPrompt() {
    if (installPrompt && deferredPrompt) {
        installPrompt.classList.remove('hidden');
    }
}

function showInstallBanner() {
    if (installBanner && deferredPrompt) {
        installBanner.classList.remove('hidden');
    }
}

async function installApp() {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    console.log(`User response: ${outcome} `);
    deferredPrompt = null;

    // Hide all install UI
    if (installPrompt) installPrompt.classList.add('hidden');
    if (installBanner) installBanner.classList.add('hidden');
}

// Check Login Status
function checkLoginStatus() {
    if (currentUser) {
        showMainApp();
    } else {
        showLoginScreen();
    }
}

function showLoginScreen() {
    loginScreen.classList.remove('hidden');
    mainApp.classList.add('hidden');

    // Default to login tab
    switchTab('login');
}

function switchTab(type) {
    if (type === 'login') {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    } else {
        tabLogin.classList.remove('active');
        tabRegister.classList.add('active');
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    }
}

function showMainApp() {
    loginScreen.classList.add('hidden');
    mainApp.classList.remove('hidden');

    // Load user data
    displayUserName.textContent = currentUser.name;

    if (currentUser.avatar && currentUser.avatar.startsWith('data:image')) {
        userAvatar.innerHTML = `<img src="${currentUser.avatar}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
    } else {
        userAvatar.textContent = currentUser.avatar || '😊';
    }

    // Load user's tasks (Personal or Team)
    const storageKey = currentUser.teamCode ? `taskforce_tasks_shared_${currentUser.teamCode}` : `taskforce_tasks_${currentUser.id}`;
    tasks = JSON.parse(localStorage.getItem(storageKey)) || [];

    // --- Firebase Sync START ---
    if (db) {
        if (window.taskUnsubscribe) window.taskUnsubscribe();

        const path = currentUser.teamCode ? `teams/${currentUser.teamCode}/tasks` : `users/${currentUser.id}/tasks`;
        let isInitialLoad = true;

        window.taskUnsubscribe = db.collection(path).onSnapshot(snapshot => {
            console.log("📝 Firestore Snapshot empfangen. Dokumente:", snapshot.size, "Initial:", isInitialLoad);

            let newTasksForNotification = [];

            snapshot.docChanges().forEach(change => {
                console.log("🔍 Change detected:", change.type, change.doc.id);
                if (change.type === "added" && !isInitialLoad) {
                    const task = { id: change.doc.id, ...change.doc.data() };
                    console.log("🆕 Möglicher neuer Team-Termin:", task.keyword, "von Session:", task.sessionId);

                    // Notify if not from this specific session (allows testing with same user on different devices)
                    if (task.sessionId !== appSessionId) {
                        newTasksForNotification.push(task);
                    } else {
                        console.log("⏭️ Nachricht übersprungen (Gleiche Session/Tabs)");
                    }
                }
            });

            // Always update the full local list from snapshot
            const cloudTasks = [];
            snapshot.forEach(doc => {
                cloudTasks.push({ id: doc.id, ...doc.data() });
            });

            if (cloudTasks.length > 0 || snapshot.empty) {
                tasks = cloudTasks;
                localStorage.setItem(storageKey, JSON.stringify(tasks));
                renderTasks();
                updateStats();

                // Trigger notifications for new tasks
                if (newTasksForNotification.length > 0) {
                    console.log("📣 Trigger Team-Notification für", newTasksForNotification.length, "Termine");
                    newTasksForNotification.forEach(t => showTeamNotification(t));
                }
            }
            isInitialLoad = false;
        });
    }
    // --- Firebase Sync END ---

    // Show team badge if applicable
    if (currentUser.teamCode) {
        teamBadge.classList.remove('hidden');
        teamCodeName.textContent = currentUser.teamCode.toUpperCase();
    } else {
        teamBadge.classList.add('hidden');
    }

    renderTasks();
    loadTodos();
    loadAlarms();
    loadExpenses(); // Local first
    syncExpenses(); // Then cloud sync
    updateStats();
    startUrgentReminder();
    requestNotificationPermission();

    // Ensure clock is visible immediately
    updateGlobalClock();
    applyAppSettings();

    // Start Wake Word Recognition
    setTimeout(() => {
        initWakeWordRecognition();
    }, 1000);

    // Show install banner after a delay
    setTimeout(() => {
        if (deferredPrompt) showInstallBanner();
    }, 3000);
}

// Register
function handleRegister() {
    const name = userNameReg.value.trim();
    const pin = userPinReg.value.trim();
    const pinConfirm = userPinConfirm.value.trim();
    const teamCode = teamCodeReg ? teamCodeReg.value.trim().toLowerCase() : '';

    if (!name || name.length < 2) return showToast('Bitte gib einen gültigen Namen ein.', 'error');
    if (!/^\d{6}$/.test(pin)) return showToast('Der PIN muss aus genau 6 Zahlen bestehen.', 'error');
    if (pin !== pinConfirm) return showToast('Die PINs stimmen nicht überein.', 'error');

    const userId = generateUserId(name);

    // Check if user exists (Firestore)
    if (db) {
        db.collection('users').doc(userId).get().then(doc => {
            if (doc.exists()) {
                showToast('Dieser Nutzername ist bereits vergeben.', 'error');
                return;
            }
            completeRegistration(userId, name, pin, teamCode);
        }).catch(err => {
            console.error("Firestore error:", err);
            // Fallback to local check if Firestore fails
            let allUsers = JSON.parse(localStorage.getItem('taskforce_users_registry')) || {};
            if (allUsers[userId]) return showToast('Dieser Nutzername ist bereits vergeben.', 'error');
            completeRegistration(userId, name, pin, teamCode);
        });
    } else {
        let allUsers = JSON.parse(localStorage.getItem('taskforce_users_registry')) || {};
        if (allUsers[userId]) return showToast('Dieser Nutzername ist bereits vergeben.', 'error');
        completeRegistration(userId, name, pin, teamCode);
    }
}

function completeRegistration(userId, name, pin, teamCode) {
    const selectedAvatar = document.querySelector('.avatar-option.selected');
    const avatar = selectedAvatar ? selectedAvatar.dataset.avatar : '😊';

    currentUser = {
        id: userId,
        name: name,
        pin: pin,
        avatar: avatar,
        teamCode: teamCode ? teamCode : null,
        createdAt: new Date().toISOString()
    };

    // Save to Firestore
    if (db) {
        db.collection('users').doc(userId).set(currentUser).catch(e => console.error("Error saving user:", e));
    }

    let allUsers = JSON.parse(localStorage.getItem('taskforce_users_registry')) || {};
    allUsers[userId] = currentUser;
    localStorage.setItem('taskforce_users_registry', JSON.stringify(allUsers));
    localStorage.setItem('taskforce_user', JSON.stringify(currentUser));

    showToast('Willkommen bei TaskForce!', 'success');
    showMainApp();
}

// Login
function handleLogin() {
    const name = userNameLogin.value.trim();
    const pin = userPinLogin.value.trim();
    const teamCode = teamCodeLogin ? teamCodeLogin.value.trim().toLowerCase() : '';

    if (!name || !pin) return showToast('Bitte Name und PIN eingeben.', 'error');

    const userId = generateUserId(name);

    // Attempt local login first
    const allUsers = JSON.parse(localStorage.getItem('taskforce_users_registry')) || {};
    const localUser = allUsers[userId];

    if (localUser && localUser.pin === pin) {
        completeLogin(localUser, teamCode);
        return;
    }

    // If local fails, try Firebase
    if (db) {
        db.collection('users').doc(userId).get().then(doc => {
            if (doc.exists()) {
                const cloudUser = doc.data();
                if (cloudUser.pin === pin) {
                    completeLogin(cloudUser, teamCode);
                } else {
                    showToast('PIN falsch.', 'error');
                }
            } else {
                showToast('Benutzername nicht gefunden.', 'error');
            }
        }).catch(err => {
            console.error("Firebase login error:", err);
            showToast('Anmeldung fehlgeschlagen.', 'error');
        });
    } else {
        showToast('Benutzername oder PIN falsch.', 'error');
    }
}

function completeLogin(user, teamCode) {
    currentUser = user;
    // Always update teamCode if provided, even if empty (to allow leaving a team)
    currentUser.teamCode = teamCode || currentUser.teamCode || null;

    // Sync with global user registry
    const allUsers = JSON.parse(localStorage.getItem('taskforce_users_registry')) || {};
    allUsers[user.id] = currentUser;
    localStorage.setItem('taskforce_users_registry', JSON.stringify(allUsers));
    localStorage.setItem('taskforce_user', JSON.stringify(currentUser));

    // Update Firebase teamCode if it changed
    if (db) {
        db.collection('users').doc(user.id).update({ teamCode: currentUser.teamCode }).catch(e => { });
    }

    showToast(`Schön dich zu sehen, ${currentUser.name}!`, 'success');
    showMainApp();

    // Start Presence Tracking
    if (db) {
        updatePresence();
        if (window.presenceInterval) clearInterval(window.presenceInterval);
        window.presenceInterval = setInterval(updatePresence, 30000); // Every 30s
    }
}

function generateUserId(name) {
    // Generate a consistent ID based ONLY on the name
    return 'user_' + name.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
}

// Logout
function handleLogout() {
    if (confirm('Möchtest du dich wirklich abmelden?')) {
        currentUser = null;
        localStorage.removeItem('taskforce_user');

        // Stop Firebase Sync
        if (window.taskUnsubscribe) {
            window.taskUnsubscribe();
            window.taskUnsubscribe = null;
        }

        tasks = [];

        showLoginScreen();
    }
}

// Request browser notification permission
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Auth events
    loginBtn.addEventListener('click', handleLogin);
    registerBtn.addEventListener('click', handleRegister);
    // Switch tabs
    tabLogin.addEventListener('click', () => switchTab('login'));
    tabRegister.addEventListener('click', () => switchTab('register'));

    // Avatar picker (Reg)
    if (avatarPicker) {
        avatarPicker.addEventListener('click', (e) => {
            const option = e.target.closest('.avatar-option');
            if (option) {
                document.querySelectorAll('#avatarPicker .avatar-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
            }
        });
    }

    const regAvatarUpload = document.getElementById('avatarUpload');
    if (regAvatarUpload) {
        regAvatarUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                processAvatarFile(file, (base64) => {
                    const customBtn = document.getElementById('customAvatarBtn');
                    if (customBtn) {
                        customBtn.style.backgroundImage = `url(${base64})`;
                        customBtn.style.backgroundSize = 'cover';
                        customBtn.innerHTML = '';
                        customBtn.dataset.avatar = base64;
                    }
                    document.querySelectorAll('#avatarPicker .avatar-option').forEach(o => o.classList.remove('selected'));
                    customBtn.classList.add('selected');
                });
            }
        });
    }

    // Settings Avatar Picker
    if (settingsAvatarPicker) {
        settingsAvatarPicker.addEventListener('click', (e) => {
            const option = e.target.closest('.avatar-option');
            if (option) {
                document.querySelectorAll('#settingsAvatarPicker .avatar-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
            }
        });
    }

    if (settingsAvatarUpload) {
        settingsAvatarUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                processAvatarFile(file, (base64) => {
                    const customBtn = document.getElementById('settingsCustomAvatarBtn');
                    if (customBtn) {
                        customBtn.style.backgroundImage = `url(${base64})`;
                        customBtn.style.backgroundSize = 'cover';
                        customBtn.innerHTML = '';
                        customBtn.dataset.avatar = base64;
                    }
                    document.querySelectorAll('#settingsAvatarPicker .avatar-option').forEach(o => o.classList.remove('selected'));
                    customBtn.classList.add('selected');
                });
            }
        });
    }

    // Keypress for login
    userPinLogin.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    // Avatar picker
    avatarPicker.addEventListener('click', (e) => {
        const option = e.target.closest('.avatar-option');
        if (option) {
            document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
        }
    });

    // Logout
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    // Settings
    if (document.getElementById('settingsBtn')) {
        document.getElementById('settingsBtn').addEventListener('click', openSettings);
    }
    if (closeSettingsModal) closeSettingsModal.addEventListener('click', () => settingsModal.classList.add('hidden'));
    if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', saveAppSettings);
    if (testSoundBtn) testSoundBtn.addEventListener('click', () => playAlertSound(true));

    // Test AI Button
    const testAiBtn = document.getElementById('testAiBtn');
    if (testAiBtn) {
        testAiBtn.addEventListener('click', () => {
            const query = 'Hallo, ich teste die KI-Integration in TaskForce!';
            openAISearch(query);
        });
    }

    // Install buttons
    if (installBtn) installBtn.addEventListener('click', installApp);
    if (dismissInstall) dismissInstall.addEventListener('click', () => installPrompt.classList.add('hidden'));
    if (installAppBtn) installAppBtn.addEventListener('click', installApp);
    if (closeInstallBanner) closeInstallBanner.addEventListener('click', () => installBanner.classList.add('hidden'));

    // Manual Drive Mode Button
    const manualDriveBtn = document.getElementById('manualDriveBtn');
    if (manualDriveBtn) {
        manualDriveBtn.addEventListener('click', () => {
            const upcoming = getUpcomingLocationTasks();
            if (upcoming.length > 0) {
                showDriveMode(upcoming[0]);
            } else {
                showToast('Keine Aufgaben mit Ort gefunden. Öffne leeres Dashboard...', 'info');
                // Open even if no task
                showDriveMode({ keyword: 'Kein Ziel', details: { location: '' } });
            }
        });
    }

    // Add Task
    addTaskBtn.addEventListener('click', handleAddTask);
    keywordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAddTask();
    });

    // Questions Modal
    if (cancelTaskBtn) cancelTaskBtn.addEventListener('click', () => {
        questionsModal.classList.add('hidden');
        currentTask = null;
        showToast('Vorgang abgebrochen', 'info');
    });
    saveTaskBtn.addEventListener('click', () => saveTask(false));

    // Detail Modal basic listeners
    if (closeDetailModal) closeDetailModal.addEventListener('click', closeTaskDetail);
    if (closeDriveBtn) closeDriveBtn.addEventListener('click', () => driveModeOverlay.classList.add('hidden'));

    // Top-level elements setup (moved inside setupEventListeners)
    if (syncBtn) {
        syncBtn.addEventListener('click', () => {
            syncBtn.classList.add('rotating');

            // Re-trigger Firestore load if possible
            if (db && currentUser) {
                const path = currentUser.teamCode ? `teams/${currentUser.teamCode}/tasks` : `users/${currentUser.id}/tasks`;
                db.collection(path).get().then(snapshot => {
                    const cloudTasks = [];
                    snapshot.forEach(doc => cloudTasks.push({ id: doc.id, ...doc.data() }));
                    if (cloudTasks.length > 0) {
                        tasks = cloudTasks;
                        const storageKey = currentUser.teamCode ? `taskforce_tasks_shared_${currentUser.teamCode}` : `taskforce_tasks_${currentUser.id}`;
                        localStorage.setItem(storageKey, JSON.stringify(tasks));
                    }
                    renderTasks();
                    updateStats();
                    syncBtn.classList.remove('rotating');
                    showNotification('✨ Cloud-Synchronisiert!', 'Alle Daten sind aktuell.');
                    showToast('Cloud-Daten geladen', 'success');
                });
            } else {
                setTimeout(() => {
                    const storageKey = currentUser.teamCode ? `taskforce_tasks_shared_${currentUser.teamCode}` : `taskforce_tasks_${currentUser.id}`;
                    tasks = JSON.parse(localStorage.getItem(storageKey)) || [];
                    renderTasks();
                    updateStats();
                    syncBtn.classList.remove('rotating');
                    showNotification('✨ Lokal Synchronisiert!', 'Deine Aufgaben sind auf dem neuesten Stand.');
                }, 1000);
            }
        });
    }

    if (filterTabs) {
        filterTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                filterTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentFilter = tab.dataset.filter;
                renderTasks();
            });
        });
    }

    if (questionsModal) {
        questionsModal.addEventListener('click', (e) => {
            if (e.target === questionsModal) {
                questionsModal.classList.add('hidden');
                currentTask = null;
            }
        });
    }

    if (taskDetailModal) {
        taskDetailModal.addEventListener('click', (e) => {
            if (e.target === taskDetailModal) {
                closeTaskDetail();
            }
        });
    }

    // Task File Upload Handler
    if (taskFileUpload) {
        taskFileUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    currentFileBase64 = event.target.result;
                    currentFileName = file.name;
                    taskFileName.textContent = file.name;
                    removeFileBtn.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (toggleUploadBtn) {
        toggleUploadBtn.addEventListener('click', () => {
            uploadSection.classList.toggle('hidden');
            toggleUploadBtn.textContent = uploadSection.classList.contains('hidden') ?
                '📎 Anhang hinzufügen?' : '📖 Upload einklappen';
        });
    }

    if (removeFileBtn) {
        removeFileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            resetFileSelection();
        });
    }

    // Urgent Overlay
    urgentDoneBtn.addEventListener('click', markUrgentDone);
    urgentLaterBtn.addEventListener('click', snoozeUrgent);

    if (closeTeamNotificationBtn) {
        closeTeamNotificationBtn.addEventListener('click', () => {
            teamNotificationOverlay.classList.add('hidden');
        });
    }

    // Calendar
    if (calendarBtn) {
        calendarBtn.addEventListener('click', () => {
            if (window.openCalendarModal) window.openCalendarModal();
        });
    }

    if (closeCalendarBtn) {
        closeCalendarBtn.addEventListener('click', () => {
            document.getElementById('calendarModal').classList.add('hidden');
        });
    }
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
            renderCalendar();
        });
    }
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
            renderCalendar();
        });
    }

    const todayBtn = document.getElementById('todayBtn');
    if (todayBtn) {
        todayBtn.addEventListener('click', () => {
            currentCalendarDate = new Date();
            renderCalendar();
        });
    }

    // Sidebar & Navigation Events
    if (hamburgerBtn) hamburgerBtn.addEventListener('click', () => {
        sideMenuOverlay.classList.remove('hidden');
        updateSyncStatusText();
    });
    if (closeSideMenu) closeSideMenu.addEventListener('click', () => sideMenuOverlay.classList.add('hidden'));
    if (sideMenuOverlay) sideMenuOverlay.addEventListener('click', (e) => {
        if (e.target === sideMenuOverlay) sideMenuOverlay.classList.add('hidden');
    });

    if (sideCalendarBtn) sideCalendarBtn.addEventListener('click', () => {
        sideMenuOverlay.classList.add('hidden');
        if (!currentCalendarDate) currentCalendarDate = new Date();
        renderCalendar();
        const modal = document.getElementById('calendarModal');
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        modal.style.zIndex = '10005';
    });

    if (sideDriveBtn) sideDriveBtn.addEventListener('click', () => {
        sideMenuOverlay.classList.add('hidden');
        openLatestDashboard();
    });

    if (sideSettingsBtn) sideSettingsBtn.addEventListener('click', () => {
        sideMenuOverlay.classList.add('hidden');
        openSettings();
    });

    if (sideSyncBtn) sideSyncBtn.addEventListener('click', () => {
        sideMenuOverlay.classList.add('hidden');
        if (typeof syncData === 'function') syncData();
        else showToast('Synchronisierung gestartet...', 'success');
    });

    if (sideLogoutBtn) sideLogoutBtn.addEventListener('click', () => {
        sideMenuOverlay.classList.add('hidden');
        handleLogout();
    });

    // Voice recognition setup - Cross Browser
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        mainRecognition = new SpeechRecognition();
        mainRecognition.lang = 'de-DE';
        mainRecognition.continuous = false;
        mainRecognition.interimResults = false;
        mainRecognition.maxAlternatives = 1;

        mainRecognition.onstart = () => {
            console.log('Voice recognition started');
            voiceBtn.classList.add('active');
            if (typeof voiceStatus !== 'undefined' && voiceStatus) voiceStatus.classList.add('active');
            if (globalRecordingDot) globalRecordingDot.classList.add('visible');
            voiceBtn.textContent = '🛑';
            // Stop wake word while main is active
            stopWakeWord();
        };

        mainRecognition.onend = () => {
            console.log('Voice recognition ended');
            voiceBtn.classList.remove('active');
            if (typeof voiceStatus !== 'undefined' && voiceStatus) {
                voiceStatus.classList.remove('active', 'mode-grok', 'mode-task');
                const label = voiceStatus.querySelector('.voice-label');
                if (label) label.textContent = 'Bereit...';
            }
            if (globalRecordingDot) globalRecordingDot.classList.remove('visible');
            voiceBtn.textContent = '🎤';
            // Restart wake word when main ends
            if (appSettings.wakeWordEnabled) {
                setTimeout(startWakeWord, 800);
            }
        };

        mainRecognition.onerror = (event) => {
            console.error('Speech Recognition Error:', event.error);
            if (event.error === 'not-allowed') {
                showToast('🔒 Mikrofon blockiert! Bitte klicke auf das Schloss-Icon oben links in der Adresszeile und erlaube den Zugriff.', 'error');
            } else if (event.error === 'network') {
                showToast('🌐 Netzwerk-Fehler bei Spracherkennung.', 'error');
            } else {
                showToast('Sprach-Fehler: ' + event.error, 'error');
            }
            voiceBtn.classList.remove('active');
            if (typeof voiceStatus !== 'undefined' && voiceStatus) {
                voiceStatus.classList.remove('active', 'mode-grok', 'mode-task');
                const label = voiceStatus.querySelector('.voice-label');
                if (label) label.textContent = 'Bereit...';
            }
            if (globalRecordingDot) globalRecordingDot.classList.remove('visible');
            voiceBtn.textContent = '🎤';
        };

        mainRecognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            console.log('Recognized:', transcript);
            if (window.currentVoiceMode === 'grok') {
                openAISearch(transcript); // Jetzt direkt das Original öffnen
                window.currentVoiceMode = 'task';
                return;
            }

            keywordInput.value = transcript;

            // Visual confirmation
            keywordInput.classList.add('highlight-flash');
            setTimeout(() => keywordInput.classList.remove('highlight-flash'), 500);

            // If it was triggered by wake word, we might want to auto-save
            const isAutoTriggered = !!window.voiceAutoSave;
            delete window.voiceAutoSave;

            handleAddTask(isAutoTriggered);
        };

        if (voiceBtn) {
            voiceBtn.style.display = 'flex';
            voiceBtn.addEventListener('click', () => {
                if (voiceBtn.classList.contains('active')) {
                    if (!window.isAutoStarting) {
                        mainRecognition.stop();
                        return;
                    }
                }
                startMainVoice();
            });
        }
    }

    if (addTodoBtn) {
        addTodoBtn.addEventListener('click', () => handleAddTodo());
    }

    if (clearDoneTodosBtn) {
        clearDoneTodosBtn.addEventListener('click', () => clearDoneTodos());
    }

    // Expense Tracker
    if (expenseBtn) expenseBtn.addEventListener('click', toggleExpenseSection);
    if (sideExpenseBtn) sideExpenseBtn.addEventListener('click', () => {
        toggleExpenseSection();
        sideMenuOverlay.classList.add('hidden');
    });
    if (addExpenseBtn) addExpenseBtn.addEventListener('click', openExpenseModal);
    if (closeExpenseModalBtn) closeExpenseModalBtn.addEventListener('click', closeExpenseModal);
    if (saveExpenseBtn) saveExpenseBtn.addEventListener('click', handleSaveExpense);
    if (expenseImageInput) expenseImageInput.addEventListener('change', handleExpenseImage);
    const fileInp = document.getElementById('expenseFileInput');
    if (fileInp) fileInp.addEventListener('change', handleExpenseImage);

    // New Header/Mobile Buttons
    const addExpBtnHeader = document.getElementById('addExpenseBtnHeader');
    if (addExpBtnHeader) addExpBtnHeader.addEventListener('click', openExpenseModal);
    const mobExpBtn = document.getElementById('mobileExpenseBtn');
    if (mobExpBtn) mobExpBtn.addEventListener('click', toggleExpenseSection);
    const mobAddBtn = document.getElementById('mobileAddExpenseBtn');
    if (mobAddBtn) mobAddBtn.addEventListener('click', openExpenseModal);

    // Nightstand Mode Buttons
    const sideNightstandBtn = document.getElementById('sideNightstandBtn');
    const sideNightstandBtnHeader = document.getElementById('sideNightstandBtnHeader');
    if (sideNightstandBtn) sideNightstandBtn.addEventListener('click', () => {
        sideMenuOverlay.classList.add('hidden');
        startNightstandMode();
    });
    if (sideNightstandBtnHeader) sideNightstandBtnHeader.addEventListener('click', startNightstandMode);

    // Initial load
    if (currentUser) {
        loadExpenses();
    }
}

// Global Calendar Opener
window.openCalendarModal = function () {
    console.log('Opening Calendar Modal...');
    // Only reset to today if currentCalendarDate wasn't set or it's a fresh session
    if (!currentCalendarDate) {
        currentCalendarDate = new Date();
    }

    if (typeof renderCalendar === 'function') {
        renderCalendar();
    }
    const modal = document.getElementById('calendarModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex'; // Force display
        modal.style.zIndex = '10005'; // Ensure it's above everything
    }
};





// Handle Add Task
// AI Provider Change Listener
document.addEventListener('DOMContentLoaded', () => {
    const provSel = document.getElementById('aiProviderSelect');
    if (provSel) {
        provSel.addEventListener('change', () => {
            const val = provSel.value;
            const keyGroup = document.getElementById('openaiKeyGroup');
            if (keyGroup) {
                if (val === 'chatgpt') keyGroup.classList.remove('hidden');
                else keyGroup.classList.add('hidden');
            }
        });
        // Initial check
        // Check local storage or default first, but wait for appSettings to be ready?
        // Actually appSettings is global.
        setTimeout(() => {
            if (appSettings && appSettings.aiProvider === 'chatgpt') {
                const keyGroup = document.getElementById('openaiKeyGroup');
                if (keyGroup) keyGroup.classList.remove('hidden');
            }
        }, 500);
    }
});

// Appointment Form Logic
document.addEventListener('DOMContentLoaded', () => {
    const closeAppBtn = document.getElementById('closeAppointmentModal');
    const cancelAppBtn = document.getElementById('cancelAppointmentBtn');
    const saveAppBtn = document.getElementById('saveAppointmentBtn');
    const appModal = document.getElementById('appointmentModal');

    const closeApp = () => {
        if (appModal) appModal.classList.add('hidden');
    };

    if (closeAppBtn) closeAppBtn.addEventListener('click', closeApp);
    if (cancelAppBtn) cancelAppBtn.addEventListener('click', closeApp);

    // Voice Input for Form
    const appVoiceBtn = document.getElementById('appVoiceBtn');
    if (appVoiceBtn && mainRecognition) {
        appVoiceBtn.addEventListener('click', () => {
            appVoiceBtn.classList.add('active'); // Visual feedback
            appVoiceBtn.style.background = 'rgba(255,0,0,0.2)';

            // Temporary override onresult
            const originalOnResult = mainRecognition.onresult;

            mainRecognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                console.log('Form Voice Input:', transcript);

                // Fill Title
                const titleField = document.getElementById('appTitle');
                if (titleField) {
                    titleField.value = transcript;
                    // Try to parse more? keeping it simple for now, user asked to "insert appointment".
                    // Ideally we use parseSmartInput logic to fill other fields too.
                    if (typeof parseSmartInput === 'function') {
                        const parsed = parseSmartInput(transcript);
                        if (parsed.details) {
                            if (parsed.details.location) document.getElementById('appLocation').value = parsed.details.location;
                            if (parsed.details.person) document.getElementById('appPerson').value = parsed.details.person;
                        }
                        if (parsed.deadline) {
                            // Only update time if found, keep date fixed as it was selected from calendar
                            const d = new Date(parsed.deadline);
                            const h = String(d.getHours()).padStart(2, '0');
                            const m = String(d.getMinutes()).padStart(2, '0');
                            document.getElementById('appTime').value = `${h}:${m}`;
                        }
                    }
                }

                appVoiceBtn.style.background = 'rgba(99, 102, 241, 0.2)';
                appVoiceBtn.classList.remove('active');

                // Restore main handler
                mainRecognition.onresult = originalOnResult;
            };

            mainRecognition.start();
        });
    }

    if (saveAppBtn) {
        saveAppBtn.addEventListener('click', () => {
            const title = document.getElementById('appTitle').value.trim();
            const date = document.getElementById('appDate').value;
            const time = document.getElementById('appTime').value;
            const location = document.getElementById('appLocation').value.trim();
            const person = document.getElementById('appPerson').value.trim();
            const phone = document.getElementById('appPhone').value.trim();
            const notes = document.getElementById('appNotes').value.trim();

            if (!title) {
                showToast('Bitte Titel eingeben', 'error');
                return;
            }
            if (!date) {
                showToast('Bitte Datum eingeben', 'error');
                return;
            }

            // Construct Deadline
            let deadline = null;
            if (date && time) {
                deadline = new Date(`${date}T${time}`).toISOString();
            } else if (date) {
                deadline = new Date(`${date}T12:00`).toISOString();
            }

            const newTask = {
                id: Date.now().toString(),
                creatorId: currentUser ? currentUser.id : 'unknown',
                creatorName: currentUser ? currentUser.name : 'Unbekannt',
                sessionId: appSessionId,
                keyword: title,
                deadline: deadline,
                details: {
                    location: location,
                    person: person,
                    notes: notes,
                    phone: phone,
                    createdVia: 'form'
                },
                priority: 'normal',
                done: false,
                archived: false,
                createdAt: new Date().toISOString()
            };

            // Save
            tasks.unshift(newTask);
            saveTasks();
            renderTasks();
            updateStats();

            showToast('Termin gespeichert!', 'success');
            closeApp();
        });
    }
});

// ===== INTELLIGENT AI RESEARCH HANDLER =====
/**
 * Handles AI-powered research queries
 * Example: "Finde die Telefonnummer von Anwalt Vetter in Rastatt"
 */
function handleAIResearch(query) {
    const lower = query.toLowerCase();

    // Extract what we're looking for
    let searchType = 'information';
    if (lower.match(/telefon|nummer|tel|phone/i)) searchType = 'Telefonnummer';
    else if (lower.match(/adresse|address/i)) searchType = 'Adresse';
    else if (lower.match(/öffnungszeit/i)) searchType = 'Öffnungszeiten';
    else if (lower.match(/email|e-mail/i)) searchType = 'E-Mail';
    else if (lower.match(/website|webseite/i)) searchType = 'Website';

    // Extract the subject (who/what we're searching for)
    let subject = '';
    const vonMatch = query.match(/(?:von|für)\s+(.+?)(?:\s+in\s+|\s+und\s+|$)/i);
    if (vonMatch) {
        subject = vonMatch[1].trim();
    }

    // Extract location if mentioned
    let location = '';
    const inMatch = query.match(/in\s+(\w+)/i);
    if (inMatch) {
        location = inMatch[1];
    }

    // Build search query for AI
    let aiQuery = `Finde die ${searchType}`;
    if (subject) aiQuery += ` von ${subject}`;
    if (location) aiQuery += ` in ${location}`;

    // Add instruction for AI to format the response
    aiQuery += `. Bitte gib mir nur die konkrete Information zurück, ohne zusätzliche Erklärungen. Format: ${searchType}: [Wert]`;

    showToast('🔍 Starte KI-Recherche...', 'info');

    // Open AI with the search query
    const provider = appSettings.aiProvider || 'grok';
    let url = '';

    switch (provider) {
        case 'chatgpt':
            url = `https://chat.openai.com/?q=${encodeURIComponent(aiQuery)}`;
            break;
        case 'gemini':
            url = `https://gemini.google.com/app?q=${encodeURIComponent(aiQuery)}`;
            break;
        case 'grok':
        default:
            url = `https://grok.com/?q=${encodeURIComponent(aiQuery)}`;
            break;
    }

    // Store the original query and context for later use
    window.pendingResearchQuery = {
        originalQuery: query,
        searchType: searchType,
        subject: subject,
        location: location,
        timestamp: Date.now()
    };

    // Open AI in new window
    const aiWindow = window.open(url, '_blank');

    // Show instructions to user
    const aiName = getAiName();
    showToast(`🔍 ${aiName} öffnet sich...`, 'info');

    // After a delay, show instruction to copy result
    setTimeout(() => {
        showToast(`📋 Schritt 1: Warte auf ${aiName}'s Antwort`, 'info');
    }, 1000);

    setTimeout(() => {
        showToast('📝 Schritt 2: Kopiere die Antwort (Strg+C)', 'info');
    }, 3000);

    setTimeout(() => {
        showToast('🔙 Schritt 3: Kehre zur App zurück und klicke den Button!', 'info');

        // Prepare the task modal to receive the information
        prepareTaskModalForResearch(subject, location, searchType);
    }, 5000);

    // Set up clipboard monitoring
    window.pendingAiResearch = true;
    setupClipboardMonitoring();
}

/**
 * Prepares the task/appointment modal to receive researched information
 */
function prepareTaskModalForResearch(subject, location, searchType) {
    // Create a new task with the subject
    const taskTitle = subject || 'Neuer Termin';

    // Store in window for later use
    window.researchTaskData = {
        keyword: taskTitle,
        location: location || '',
        searchType: searchType,
        details: {}
    };

    // Open the appointment modal if it exists
    const appointmentModal = document.getElementById('appointmentModal');
    if (appointmentModal) {
        appointmentModal.classList.remove('hidden');

        // Pre-fill known information
        const titleField = document.getElementById('appTitle');
        const locationField = document.getElementById('appLocation');

        if (titleField) titleField.value = taskTitle;
        if (locationField && location) locationField.value = location;

        // Add a helper button for manual pasting
        addResearchPasteButton(searchType);

        // Focus on the appropriate field based on search type
        if (searchType === 'Telefonnummer') {
            const phoneField = document.getElementById('appPhone');
            if (phoneField) {
                phoneField.focus();
                phoneField.placeholder = 'KI-Antwort hier einfügen (Strg+V)';
            }
        } else if (searchType === 'E-Mail') {
            const notesField = document.getElementById('appNotes');
            if (notesField) {
                notesField.focus();
                notesField.placeholder = 'E-Mail hier einfügen (Strg+V)';
            }
        } else if (searchType === 'Adresse') {
            const locationField = document.getElementById('appLocation');
            if (locationField) {
                locationField.focus();
                locationField.placeholder = 'Adresse hier einfügen (Strg+V)';
            }
        }
    } else {
        // Fallback: Open questions modal
        if (typeof showQuestionsModal === 'function') {
            const newTask = {
                keyword: taskTitle,
                details: {
                    location: location || ''
                }
            };
            currentTask = newTask;
            const detected = detectQuestions(taskTitle, newTask.details);
            showQuestionsModal(taskTitle, detected, { taskTitle, details: newTask.details });
        }
    }
}

/**
 * Adds a manual paste button to help users insert AI research results
 */
function addResearchPasteButton(searchType) {
    // Remove any existing button
    const existingBtn = document.getElementById('aiResearchPasteBtn');
    if (existingBtn) existingBtn.remove();

    // Create the button
    const pasteBtn = document.createElement('button');
    pasteBtn.id = 'aiResearchPasteBtn';
    pasteBtn.type = 'button';
    pasteBtn.className = 'btn-primary';
    pasteBtn.style.cssText = `
        width: 100%;
        margin: 1rem 0;
        padding: 1rem;
        font-size: 1.1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        background: linear-gradient(135deg, var(--secondary), var(--primary));
        animation: pulse 2s ease-in-out infinite;
    `;
    pasteBtn.innerHTML = `📋 KI-Antwort automatisch einfügen`;

    pasteBtn.onclick = async () => {
        try {
            const clipboardText = await navigator.clipboard.readText();

            if (!clipboardText || clipboardText.length < 3) {
                showToast('❌ Keine Daten in der Zwischenablage gefunden', 'error');
                return;
            }

            // Extract the information
            const extracted = extractResearchInfo(clipboardText, searchType);

            if (extracted) {
                autoFillResearchedInfo(extracted, searchType);
                showToast(`✅ ${searchType} eingefügt!`, 'success');

                // Remove the button after successful paste
                pasteBtn.remove();

                // Clear pending research
                window.pendingAiResearch = false;
                window.pendingResearchQuery = null;
            } else {
                showToast('⚠️ Konnte keine Information extrahieren. Bitte manuell einfügen.', 'warning');
            }
        } catch (err) {
            console.error('Clipboard error:', err);
            showToast('❌ Clipboard-Zugriff verweigert. Bitte mit Strg+V einfügen.', 'error');
        }
    };

    // Insert the button into the modal
    const appointmentModal = document.getElementById('appointmentModal');
    if (appointmentModal) {
        const modalBody = appointmentModal.querySelector('.modal-body');
        if (modalBody) {
            // Insert at the top of the modal body
            modalBody.insertBefore(pasteBtn, modalBody.firstChild);
        }
    }
}

/**
 * Sets up clipboard monitoring to auto-fill researched information
 */
function setupClipboardMonitoring() {
    // Monitor window focus to detect when user returns from AI
    const focusHandler = async () => {
        if (window.pendingAiResearch && window.pendingResearchQuery) {
            try {
                // Small delay to ensure clipboard is ready
                await new Promise(resolve => setTimeout(resolve, 500));

                const clipboardText = await navigator.clipboard.readText();

                if (clipboardText && clipboardText.length > 3) {
                    // Extract the relevant information from AI response
                    const extracted = extractResearchInfo(clipboardText, window.pendingResearchQuery.searchType);

                    if (extracted) {
                        // Auto-fill the information
                        autoFillResearchedInfo(extracted, window.pendingResearchQuery.searchType);

                        showToast(`✅ ${window.pendingResearchQuery.searchType} automatisch eingefügt!`, 'success');

                        // Clear pending research
                        window.pendingAiResearch = false;
                        window.pendingResearchQuery = null;

                        // Remove focus listener
                        window.removeEventListener('focus', focusHandler);
                    }
                }
            } catch (err) {
                console.log('Clipboard access error:', err);
                // User might need to manually paste
                showToast('💡 Bitte füge die Information manuell ein (Strg+V)', 'info');
            }
        }
    };

    window.addEventListener('focus', focusHandler);

    // Auto-cleanup after 5 minutes
    setTimeout(() => {
        window.pendingAiResearch = false;
        window.removeEventListener('focus', focusHandler);
    }, 300000);
}

/**
 * Extracts specific information from AI response
 */
function extractResearchInfo(text, searchType) {
    const lower = text.toLowerCase();

    if (searchType === 'Telefonnummer') {
        // Extract phone number
        const phonePatterns = [
            /(?:telefon|tel|phone|nummer)[:\s]*([+\d\s\-\/\(\)]{7,20})/gi,
            /(\+49[\s\-]?\d{2,5}[\s\-]?\d{3,10})/g,
            /(0\d{2,5}[\s\-\/]?\d{3,10})/g
        ];

        for (const pattern of phonePatterns) {
            const match = text.match(pattern);
            if (match) {
                return match[0].replace(/[^\d+\s\-\/\(\)]/g, '').trim();
            }
        }
    } else if (searchType === 'E-Mail') {
        // Extract email
        const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailMatch) return emailMatch[1];
    } else if (searchType === 'Adresse') {
        // Extract address (simple approach)
        const addressMatch = text.match(/(\d{5}\s+\w+.*?(?:\d+)?)/);
        if (addressMatch) return addressMatch[1];
    } else if (searchType === 'Website') {
        // Extract URL
        const urlMatch = text.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/i);
        if (urlMatch) return urlMatch[1];
    }

    // Fallback: return first line that looks relevant
    const lines = text.split('\n').filter(l => l.trim().length > 3);
    return lines[0] || text.substring(0, 100);
}

/**
 * Auto-fills researched information into the appropriate field
 */
/**
 * Auto-fills researched information into the appropriate field or opens selection modal
 */
function autoFillResearchedInfo(info, searchType) {
    // If appointment modal is already open and not hidden, fill it directly
    const appointmentModal = document.getElementById('appointmentModal');
    if (appointmentModal && !appointmentModal.classList.contains('hidden')) {
        fillTargetField(info, searchType);
        return;
    }

    // Otherwise open the selection modal as requested by user
    openAiResearchResultModal(info, searchType);
}

function fillTargetField(info, searchType) {
    if (searchType === 'Telefonnummer') {
        const phoneField = document.getElementById('appPhone');
        if (phoneField) {
            phoneField.value = info;
            phoneField.classList.add('highlight-flash');
            setTimeout(() => phoneField.classList.remove('highlight-flash'), 1000);
        }
        if (window.researchTaskData) window.researchTaskData.details.phone = info;
    } else if (searchType === 'E-Mail') {
        const emailField = document.getElementById('appEmail');
        const notesField = document.getElementById('appNotes');
        if (emailField) {
            emailField.value = info;
            emailField.classList.add('highlight-flash');
            setTimeout(() => emailField.classList.remove('highlight-flash'), 1000);
        } else if (notesField) {
            const emailLine = `📧 E-Mail: ${info}`;
            if (!notesField.value.includes(info)) {
                notesField.value = (notesField.value ? notesField.value + '\n' : '') + emailLine;
                notesField.classList.add('highlight-flash');
                setTimeout(() => notesField.classList.remove('highlight-flash'), 1000);
            }
        }
        if (window.researchTaskData) window.researchTaskData.details.email = info;
    } else if (searchType === 'Adresse') {
        const locationField = document.getElementById('appLocation');
        if (locationField) {
            locationField.value = info;
            locationField.classList.add('highlight-flash');
            setTimeout(() => locationField.classList.remove('highlight-flash'), 1000);
        }
        if (window.researchTaskData) window.researchTaskData.details.location = info;
    } else {
        const notesField = document.getElementById('appNotes');
        if (notesField) {
            notesField.value = (notesField.value ? notesField.value + '\n' : '') + info;
            notesField.classList.add('highlight-flash');
            setTimeout(() => notesField.classList.remove('highlight-flash'), 1000);
        }
    }
}

function openAiResearchResultModal(info, searchType) {
    if (!aiResearchResultModal) return;

    aiResultContent.textContent = info;
    aiResearchResultModal.dataset.extracted = info;
    aiResearchResultModal.dataset.type = searchType;
    aiResearchResultModal.classList.remove('hidden');

    renderResearchAppointmentList(info, searchType);
}

function renderResearchAppointmentList(info, searchType) {
    if (!researchAppointmentList) return;

    // Get upcoming tasks
    const now = new Date();
    const upcomingTasks = tasks.filter(t => !t.archived && (!t.deadline || new Date(t.deadline) >= now)).slice(0, 10);

    if (upcomingTasks.length === 0) {
        researchAppointmentList.innerHTML = '<div style="text-align:center; padding:1rem; opacity:0.6;">Keine anstehenden Termine gefunden.</div>';
        return;
    }

    researchAppointmentList.innerHTML = upcomingTasks.map(task => {
        const dateStr = task.deadline ? formatDateShort(task.deadline) : 'Ohne Datum';
        return `
            <div class="appointment-select-item" onclick="applyResearchToTask('${task.id}', '${info.replace(/'/g, "\\'")}', '${searchType}')" style="padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-glass); border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                <div style="font-weight: 600;">${escapeHtml(task.keyword)}</div>
                <div style="font-size: 0.8rem; opacity: 0.6;">${dateStr}</div>
            </div>
        `;
    }).join('');
}

window.applyResearchToTask = function (taskId, info, searchType) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (!task.details) task.details = {};

    if (searchType === 'Telefonnummer') task.details.phone = info;
    else if (searchType === 'Adresse') task.details.location = info;
    else if (searchType === 'E-Mail') task.details.email = info;
    else if (searchType === 'Öffnungszeiten') task.details.hours = info;
    else {
        task.details.notes = (task.details.notes ? task.details.notes + '\n' : '') + info;
    }

    saveTasks();
    renderTasks();
    aiResearchResultModal.classList.add('hidden');
    showToast(`✅ Info in "${task.keyword}" gespeichert`, 'success');
};

function openAppointmentModalWithData(info, searchType) {
    const appointmentModal = document.getElementById('appointmentModal');
    if (!appointmentModal) return;

    // Reset fields
    document.getElementById('appTitle').value = '';
    document.getElementById('appDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('appTime').value = '12:00';
    document.getElementById('appLocation').value = '';
    document.getElementById('appPerson').value = '';
    document.getElementById('appPhone').value = '';
    document.getElementById('appNotes').value = '';

    // Fill the specific one
    if (searchType === 'Telefonnummer') document.getElementById('appPhone').value = info;
    else if (searchType === 'Adresse') document.getElementById('appLocation').value = info;
    else if (searchType === 'E-Mail') {
        const personMatch = info.match(/^([^@]+)@/);
        if (personMatch) document.getElementById('appPerson').value = personMatch[1];
        document.getElementById('appNotes').value = `E-Mail: ${info}`;
    } else {
        document.getElementById('appNotes').value = info;
    }

    appointmentModal.classList.remove('hidden');
    document.getElementById('appTitle').focus();
}

// ===== INTELLIGENT NATURAL LANGUAGE COMMAND PROCESSOR =====

function handleAIResearch(input) {
    const lower = input.toLowerCase();
    let type = 'Auto';
    if (lower.includes('telefon') || lower.includes('nummer')) type = 'Telefonnummer';
    else if (lower.includes('adresse') || lower.includes('anschrift') || lower.includes('wo ist') || lower.includes('ort')) type = 'Adresse';
    else if (lower.includes('mail')) type = 'E-Mail';
    else if (lower.includes('öffnet') || lower.includes('zeit')) type = 'Öffnungszeiten';

    window.pendingAiResearch = true;
    window.pendingAiSearchType = type;

    // Extract query cleanly
    let query = input.replace(/finde|suche|trage|eintrag|speicher|recherchier|ermittle|bitte|mir/gi, '').trim();
    // Remove articles at start
    query = query.replace(/^(die|den|das|eine|einen)\s+/i, '');

    // Add context if missing
    if (type === 'Telefonnummer' && !query.toLowerCase().includes('telefon')) query = 'Telefonnummer ' + query;
    if (type === 'Adresse' && !query.toLowerCase().includes('adresse')) query = 'Adresse ' + query;

    openAISearch(query);
    showToast('📋 Ergebnis kopieren & hierher zurückkehren!', 'info', 8000);
}

/**
 * Processes natural language commands and executes corresponding actions
 * Returns true if a command was recognized and executed, false otherwise
 */
function processNaturalLanguageCommand(input) {
    const lower = input.toLowerCase().trim();

    // ========== INTELLIGENT AI RESEARCH SYSTEM ==========
    // Detects when user asks for information and automatically researches it
    // Detects when user asks for information and automatically researches it
    if (lower.match(/finde|suche|such|recherchier|ermittle|zeige?\s+mir|trage|eintrag|speicher/i)) {
        // Check if asking for specific information
        const isResearchQuery =
            lower.match(/telefon|nummer|tel|phone|adresse|address|öffnungszeit|email|e-mail|website|webseite/i) ||
            lower.match(/von\s+\w+/i) || // "von [Name]"
            lower.match(/in\s+\w+/i);    // "in [Stadt]"

        if (isResearchQuery) {
            handleAIResearch(input);
            return true;
        }
    }

    // ========== CALENDAR COMMANDS ==========
    if (lower.match(/kalender|calendar/i)) {
        if (lower.match(/öffn|öffen|zeig|anzeig|starte|start/i)) {
            if (window.openCalendarModal) {
                window.openCalendarModal();
                showToast('📅 Kalender geöffnet', 'success');
                return true;
            }
        }
    }

    // ========== TODO LIST COMMANDS ==========
    if (lower.match(/todo|to-do|aufgabe|notiz/i)) {
        if (lower.match(/öffn|öffen|zeig|anzeig|liste/i)) {
            const todoSection = document.getElementById('quickTodoSection');
            if (todoSection) {
                todoSection.classList.remove('hidden');
                todoSection.scrollIntoView({ behavior: 'smooth' });
                showToast('📝 To-Do Liste geöffnet', 'success');
                return true;
            }
        }
        // "Füge X in die To-Do Liste ein" or "Trage X in die To-Do Liste ein"
        if (lower.match(/füge|trage|eintrag|hinzu|add/i) && lower.match(/ein|hinzu/i)) {
            // Extract the task text
            const taskMatch = input.match(/(?:füge|trage|eintrag)\s+(.+?)\s+(?:in|zur|zu)/i);
            if (taskMatch && taskMatch[1]) {
                const todoText = taskMatch[1].trim();
                addQuickTodo(todoText);
                showToast(`✅ "${todoText}" zur To-Do Liste hinzugefügt`, 'success');
                return true;
            }
        }
    }

    // ========== EXPENSE TRACKER COMMANDS ==========
    if (lower.match(/ausgabe|ausgaben|kosten|beleg|expense|quittung/i)) {
        // "Füge 50 Euro Aldi in die Ausgaben ein"
        if (lower.match(/füge|trage|eintrag|hinzu|add/i)) {
            // Extract amount, store, and category
            const amountMatch = input.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:€|euro|eur)/i);
            const storeMatch = input.match(/(?:€|euro|eur)\s+(\w+)|(\w+)\s+in\s+(?:die\s+)?ausgabe/i);

            if (amountMatch) {
                const amount = amountMatch[1].replace(',', '.');
                let store = '';

                // Try to extract store name
                if (storeMatch) {
                    store = storeMatch[1] || storeMatch[2] || '';
                } else {
                    // Look for common store names
                    const commonStores = ['aldi', 'lidl', 'rewe', 'edeka', 'penny', 'netto', 'kaufland', 'dm', 'rossmann', 'amazon', 'ebay', 'paypal', 'tankstelle', 'shell', 'aral'];
                    for (const storeName of commonStores) {
                        if (lower.includes(storeName)) {
                            store = storeName.charAt(0).toUpperCase() + storeName.slice(1);
                            break;
                        }
                    }
                }

                // Create expense entry
                const newExpense = {
                    id: Date.now().toString(),
                    date: new Date().toISOString().split('T')[0],
                    store: store || 'Unbekannt',
                    amount: parseFloat(amount),
                    category: 'Allgemein',
                    createdAt: new Date().toISOString()
                };

                expenses.push(newExpense);
                saveExpenses();
                updateExpenseStats();
                renderExpenses();

                showToast(`💰 ${amount}€ ${store ? 'bei ' + store : ''} eingetragen`, 'success');

                // Optionally open expense section
                const expenseSection = document.getElementById('expenseSection');
                if (expenseSection && expenseSection.classList.contains('hidden')) {
                    toggleExpenseSection();
                }

                return true;
            }
        }

        // "Öffne Ausgaben" or "Zeige Ausgaben"
        if (lower.match(/öffn|öffen|zeig|anzeig/i)) {
            toggleExpenseSection();
            showToast('💰 Kostenkontrolle geöffnet', 'success');
            return true;
        }
    }

    // ========== PAYPAL COMMANDS ==========
    if (lower.match(/paypal|pay\s*pal/i)) {
        if (lower.match(/öffn|öffen|zeig|starte|bezahl|zahl/i)) {
            window.open('https://www.paypal.com', '_blank');
            showToast('🅿️ PayPal geöffnet', 'success');
            return true;
        }
    }

    // ========== NIGHT MODE / NIGHTSTAND COMMANDS ==========
    if (lower.match(/nacht|night|nachttisch|nightstand/i)) {
        if (lower.match(/modus|mode|ein|an|aktiv|start|öffn/i)) {
            const nightstandOverlay = document.getElementById('nightstandOverlay');
            if (nightstandOverlay) {
                nightstandOverlay.classList.remove('hidden');
                if (typeof startNightstand === 'function') {
                    startNightstand();
                }
                showToast('🌙 Nachtmodus aktiviert', 'success');
                return true;
            }
        }
    }

    // ========== ALARM / WECKER COMMANDS ==========
    if (lower.match(/wecker|alarm|weck/i)) {
        // "Wecker auf 7 Uhr eintragen" or "Stelle Wecker auf 14:30"
        if (lower.match(/auf|für|um|stelle|eintrag|setze/i)) {
            // Extract time
            const timeMatch = input.match(/(\d{1,2})[:\.]?(\d{2})?\s*(?:uhr)?/i) ||
                input.match(/um\s+(\d{1,2})[:\.]?(\d{2})?/i) ||
                input.match(/auf\s+(\d{1,2})[:\.]?(\d{2})?/i);

            if (timeMatch) {
                const hours = parseInt(timeMatch[1]);
                const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;

                if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
                    // Create alarm
                    const newAlarm = {
                        id: Date.now().toString(),
                        hours: hours,
                        minutes: minutes,
                        label: `Wecker ${hours}:${minutes.toString().padStart(2, '0')}`,
                        days: [],
                        enabled: true,
                        createdAt: new Date().toISOString()
                    };

                    alarms.push(newAlarm);
                    saveAlarms();
                    renderAlarms();

                    showToast(`⏰ Wecker auf ${hours}:${minutes.toString().padStart(2, '0')} Uhr gestellt`, 'success');

                    // Optionally open alarm section
                    const alarmSection = document.getElementById('alarmSection');
                    if (alarmSection && alarmSection.classList.contains('hidden')) {
                        alarmSection.classList.remove('hidden');
                    }

                    return true;
                }
            }
        }

        // "Öffne Wecker" or "Zeige Alarme"
        if (lower.match(/öffn|öffen|zeig|anzeig|liste/i)) {
            const alarmModal = document.getElementById('alarmSettingsModal');
            if (alarmModal) {
                alarmModal.classList.remove('hidden');
                showToast('⏰ Wecker-Einstellungen geöffnet', 'success');
                return true;
            }
        }
    }

    // ========== COMMUNICATION COMMANDS ==========
    if (lower.match(/anruf|ruf|telefon|call/i)) {
        // Extract phone number
        const phoneMatch = input.match(/(\+?[\d\s\-\/\(\)]{7,20})/);
        if (phoneMatch) {
            const phone = phoneMatch[1].replace(/[^\d+]/g, '');
            window.location.href = `tel:${phone}`;
            showToast(`📞 Rufe ${phone} an...`, 'success');
            return true;
        }

        // Open communication modal
        if (lower.match(/öffn|öffen|zeig/i)) {
            const commModal = document.getElementById('commModal');
            if (commModal) {
                commModal.classList.remove('hidden');
                showToast('📱 Kommunikation geöffnet', 'success');
                return true;
            }
        }
    }

    // ========== WHATSAPP COMMANDS ==========
    if (lower.match(/whatsapp|wa\s/i)) {
        if (lower.match(/öffn|öffen|schreib|send/i)) {
            window.open('https://web.whatsapp.com', '_blank');
            showToast('💬 WhatsApp geöffnet', 'success');
            return true;
        }
    }

    // ========== EMAIL COMMANDS ==========
    if (lower.match(/email|e-mail|mail/i) && lower.match(/öffn|öffen|schreib|send/i)) {
        const emailMatch = input.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailMatch) {
            window.location.href = `mailto:${emailMatch[1]}`;
            showToast(`✉️ E-Mail an ${emailMatch[1]} wird geöffnet...`, 'success');
            return true;
        }
    }

    // ========== DRIVE MODE COMMANDS ==========
    if (lower.match(/fahrt|fahr|drive|auto/i) && lower.match(/modus|mode|start|öffn/i)) {
        const upcoming = getUpcomingLocationTasks();
        if (upcoming.length > 0) {
            showDriveMode(upcoming[0]);
        } else {
            showToast('🚗 Fahrt-Modus gestartet', 'info');
            showDriveMode({ keyword: 'Kein Ziel', details: { location: '' } });
        }
        return true;
    }

    // ========== SETTINGS COMMANDS ==========
    if (lower.match(/einstellung|settings|optionen/i) && lower.match(/öffn|öffen|zeig/i)) {
        if (typeof openSettings === 'function') {
            openSettings();
            showToast('⚙️ Einstellungen geöffnet', 'success');
            return true;
        }
    }

    // No command recognized
    return false;
}

// Helper function to add quick todo
function addQuickTodo(text) {
    if (!text || !text.trim()) return;

    const todo = {
        id: Date.now().toString(),
        text: text.trim(),
        done: false,
        createdAt: new Date().toISOString()
    };

    const storageKey = currentUser ? `taskforce_todos_${currentUser.id}` : 'taskforce_todos';
    let todos = JSON.parse(localStorage.getItem(storageKey)) || [];
    todos.unshift(todo);
    localStorage.setItem(storageKey, JSON.stringify(todos));

    // Render todos if function exists
    if (typeof renderTodos === 'function') {
        renderTodos();
    }

    // Show todo section
    const todoSection = document.getElementById('quickTodoSection');
    if (todoSection) {
        todoSection.classList.remove('hidden');
    }
}

// Handle Add Task
function handleAddTask(autoSave = false) {
    const rawInput = keywordInput.value.trim();
    if (!rawInput) {
        keywordInput.focus();
        keywordInput.classList.add('shake');
        setTimeout(() => keywordInput.classList.remove('shake'), 300);
        return;
    }

    // PRIORITY: Direct Grok Question Mode
    // If input ends with '?' -> Always ask Grok, no matter what
    if (rawInput.includes('?')) {
        const query = rawInput;
        const provider = appSettings.aiProvider || 'grok';
        let url = '';

        switch (provider) {
            case 'chatgpt':
                url = `https://chat.openai.com/?q=${encodeURIComponent(query)}`;
                break;
            case 'gemini':
                url = `https://gemini.google.com/app?q=${encodeURIComponent(query)}`;
                break;
            case 'grok':
            default:
                url = `https://grok.com/?q=${encodeURIComponent(query)}`;
                break;
        }

        window.open(url, '_blank');
        showToast(`Frage an ${getAiName()} gesendet...`, 'info');
        keywordInput.value = '';
        return;
    }

    // ===== INTELLIGENT NATURAL LANGUAGE COMMAND PROCESSING =====
    // Process natural language commands BEFORE task creation
    if (processNaturalLanguageCommand(rawInput)) {
        keywordInput.value = '';
        return;
    }

    // PRIORitize Task/Memo Saving over commands
    const lowerRaw = rawInput.toLowerCase();
    const isAiTrigger = lowerRaw.startsWith('grok') || lowerRaw.startsWith('hey grok') ||
        lowerRaw.startsWith('chatgpt') || lowerRaw.startsWith('hey chatgpt') ||
        lowerRaw.startsWith('gemini') || lowerRaw.startsWith('hey gemini');
    const questionPatterns = ['was ist', 'wie ist', 'wie spät', 'wer bist', 'wie wird', 'was sind'];
    const looksLikeQuestion = (questionPatterns.some(p => rawInput.toLowerCase().startsWith(p)))
        && !/heute|morgen|termin|uhr|anrufen|kaufen|besorgen|erinner/i.test(rawInput);

    if ((isAiTrigger || looksLikeQuestion) && typeof handleVoiceCommand === 'function') {
        if (handleVoiceCommand(rawInput)) {
            keywordInput.value = '';
            return;
        }
    }

    // Voice Command for Drive Mode (Legacy support)
    if (rawInput.toLowerCase().includes('fahrtmodus') || rawInput.toLowerCase().includes('drive mode')) {
        const upcoming = getUpcomingLocationTasks();
        if (upcoming.length > 0) {
            showDriveMode(upcoming[0]);
        } else {
            showToast('Keine Aufgaben mit Ort gefunden.', 'info');
        }
        keywordInput.value = '';
        return;
    }

    // Expense Tracker Command
    if (rawInput.toLowerCase().match(/kosten|ausgabe|beleg|quittung/)) {
        if (rawInput.toLowerCase().includes('öffnen') || rawInput.toLowerCase().includes('zeigen') || rawInput.toLowerCase().includes('liste')) {
            toggleExpenseSection();
            keywordInput.value = '';
            return;
        }
    }



    // Normal Task Creation Logic
    let parsed = parseSmartInput(rawInput);

    // Override date if set from Calendar click
    if (window.forcedTaskDate) {
        const d = new Date(window.forcedTaskDate);
        if (!isNaN(d.getTime())) {
            let finalDate = d;
            if (parsed.deadline) {
                const pDate = new Date(parsed.deadline);
                finalDate.setHours(pDate.getHours(), pDate.getMinutes());
            } else {
                finalDate.setHours(12, 0); // Default noon
            }
            parsed.deadline = finalDate.toISOString();
        }
        window.forcedTaskDate = null;
        keywordInput.placeholder = 'Stichwort eingeben...';
    }

    // Check for duplicates (same title and day)
    const todayStr = parsed.deadline ? new Date(parsed.deadline).toDateString() : new Date().toDateString();
    const duplicate = tasks.find(t =>
        t.keyword.toLowerCase() === (parsed.taskTitle || '').toLowerCase() &&
        t.deadline &&
        new Date(t.deadline).toDateString() === todayStr &&
        !t.archived
    );

    if (duplicate) {
        if (!confirm(`Die Aufgabe "${parsed.taskTitle}" existiert heute schon. Trotzdem erstellen?`)) {
            return;
        }
    }

    const newTask = {
        id: Date.now().toString(),
        creatorId: currentUser ? currentUser.id : 'unknown',
        creatorName: currentUser ? currentUser.name : 'Unbekannt',
        sessionId: appSessionId,
        keyword: parsed.taskTitle || 'Aufgabe',
        deadline: parsed.deadline || null,
        details: {
            ...parsed.details,
            createdVia: 'quick'
        },
        priority: parsed.isUrgent ? 'urgent' : 'normal',
        done: false,
        archived: false,
        createdAt: new Date().toISOString()
    };

    // Auto-detect questions if inputs are missing
    const detected = detectQuestions(newTask.keyword, newTask.details);

    // ALWAYS show the modal as a control window before saving, unless it's a pure voice auto-save
    const isPast = newTask.deadline && new Date(newTask.deadline) < new Date();
    if (!autoSave) {
        currentTask = newTask;
        showQuestionsModal(newTask.keyword, detected, parsed);
        if (isPast) {
            showToast('Termin liegt in der Vergangenheit. Bitte korrigiere Datum & Zeit.', 'error');
        }
        return;
    }

    // Direct save
    tasks.unshift(newTask);
    saveTasks();
    renderTasks();
    updateStats();

    keywordInput.value = '';
    showToast('Aufgabe erstellt!', 'success');

    // AI Tip (Voice/Text)
    const tips = generateAiTips(newTask.keyword, newTask.details);
    if (tips && appSettings.aiTipsEnabled) {
        showToast(tips.plain, 'info'); // Just show text
        if (appSettings.aiVoiceEnabled) speakText(tips.plain);
    }
}

// NEW: Handle Questions / Commands
function handleVoiceCommand(text) {
    const lower = text.toLowerCase();

    // Simple Conversational / Status triggers
    if (lower.startsWith('was') || lower.startsWith('wie') || lower.includes('?')) {

        // 1. Termine heute
        if (lower.includes('heute') && (lower.includes('termin') || lower.includes('aufgabe'))) {
            const daily = getDailyTasks();
            const open = daily.filter(t => !t.done).length;
            const answer = daily.length === 0 ? "Du hast heute keine Termine." : `Du hast heute ${daily.length} Termine, davon sind noch ${open} offen.`;
            speakText(answer);
            showToast(answer, 'info');
            return true;
        }

        // 2. Wetter (Mock)
        if (lower.includes('wetter')) {
            const answer = "Das kann ich leider noch nicht genau sagen, schau am besten aus dem Fenster!";
            speakText(answer);
            showToast(answer, 'info');
            return true;
        }

        // 3. Status Grok/AI
        if (lower.includes('bist du') || lower.includes('wer bist du')) {
            const answer = "Ich bin TaskForce, dein persönlicher Assistent. Ich werde von Grok, Gemini und ChatGPT inspiriert.";
            speakText(answer);
            showToast(answer, 'info');
            return true;
        }
    }

    // AI direct prompt (Grok, ChatGPT, Gemini)
    if (lower.startsWith('grok') || lower.startsWith('hey grok') ||
        lower.startsWith('chatgpt') || lower.startsWith('hey chatgpt') ||
        lower.startsWith('gemini') || lower.startsWith('hey gemini')) {
        const query = text.replace(/grok|hey grok|chatgpt|hey chatgpt|gemini|hey gemini/gi, '').trim();
        openAISearch(query || 'Hallo');
        return true;
    }

    // MAGIC COMMAND: "Das ist der Richtige"
    if (lower.includes('das ist der richtige') || lower.includes('es ist der richtige')) {
        if (!questionsModal.classList.contains('hidden')) {
            magicFillFromClipboard();
            return true;
        }
    }

    return false;
}

// Global state for Research Mode
window.pendingAiResearch = false;

// Monitor window focus for automatic clipboard ingestion
window.addEventListener('focus', async () => {
    // If pending research, ALWAYS check clipboard, regardless of modal state
    if (window.pendingAiResearch) {
        console.log("Returning from research (Pending Mode), checking clipboard...");
        const success = await magicFillFromClipboard(true); // silent mode
        if (success) {
            window.pendingAiResearch = false;
        }
        return;
    }

    // Default behavior for magic input in modal
    if (window.pendingAiResearch && !questionsModal.classList.contains('hidden')) {
        console.log("Returning from research, checking clipboard...");
        const success = await magicFillFromClipboard(true); // silent mode
        if (success) {
            window.pendingAiResearch = false;
            showToast('KI-Daten automatisch übernommen!', 'success');
        }
    }
});

// Magic Fill from Clipboard
async function magicFillFromClipboard(silent = false) {
    try {
        const text = await navigator.clipboard.readText();
        if (!text || text.length < 5) {
            if (!silent) showToast('Kein Text in der Zwischenablage gefunden.', 'error');
            return false;
        }

        // Use the existing logic to parse
        const magicArea = document.getElementById('magicRawInput');
        if (magicArea) magicArea.value = text;

        // NEW: Check if this is a pending research result destined for the popup
        if (window.pendingAiResearch) {
            // If we are waiting for research data, open the Selection Modal
            // Try to extract relevant info first (cleaning)
            let cleanedInfo = text;
            if (window.pendingAiSearchType) {
                cleanedInfo = extractResearchInfo(text, window.pendingAiSearchType);
            }

            openAiResearchResultModal(cleanedInfo, window.pendingAiSearchType || 'Auto');

            // Reset state handled by caller or here
            window.pendingAiResearch = false;
            showToast('✅ Daten gefunden! Bitte Termin wählen.', 'success');
            return true;
        }

        const filled = magicFillFromText();
        return filled;
    } catch (err) {
        console.error("Clipboard Error:", err);
        if (!silent) showToast('Zugriff auf Zwischenablage verweigert. Bitte Button klicken.', 'error');
        return false;
    }
}

// ===== INTELLIGENT TEXT PARSER =====
function parseSmartInput(input) {
    const result = {
        taskTitle: '',
        details: {},
        deadline: null,
        isUrgent: false,
        extractedParts: []
    };

    let remainingText = input;

    // 1. Detect URGENCY (dringend, sofort, wichtig, asap, !)
    const urgentPatterns = [
        /\b(dringend|sofort|wichtig|urgent|asap|eilig|schnell)\b/gi,
        /!{2,}/g,
        /\bsofort\b/gi
    ];

    for (const pattern of urgentPatterns) {
        if (pattern.test(remainingText)) {
            result.isUrgent = true;
            remainingText = remainingText.replace(pattern, '').trim();
        }
    }

    // 2. Extract PHONE NUMBERS (verschiedene Formate)
    // Suche nach tel/telefon gefolgt von zahlen, oder zahlen die wie eine Tel-Nr aussehen
    const phonePatterns = [
        /(?:tel[:\s]?|telefon[:\s]?|nr[:\s]?|nummer[:\s]?)(\+?[\d\s\-\/\(\)]{7,20})/gi,
        /\b(\+49\d{8,15})\b/g,
        /\b(01[567]\d{8,11})\b/g, // Deutsche Mobil
        /\b(0[2-9]\d{1,5}[\/\s-]?\d{3,10})\b/g // Deutsche Festnetz
    ];

    for (const pattern of phonePatterns) {
        const match = remainingText.match(pattern);
        if (match) {
            // Check if it looks like a date (roughly 10 chars with multiple dots)
            const dotCount = (match[0].match(/\./g) || []).length;
            if (dotCount >= 2 && match[0].length < 12) continue;

            const phone = match[0].replace(/[^\d+]/g, '');
            if (phone.length >= 7 && phone.length <= 20) {
                result.details.phone = phone;
                result.extractedParts.push({ type: 'phone', value: phone });
                remainingText = remainingText.replace(match[0], '').trim();
                break;
            }
        }
    }

    // 3. Extract EMAIL
    const emailPattern = /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/gi;
    const emailMatch = remainingText.match(emailPattern);
    if (emailMatch) {
        result.details.email = emailMatch[0];
        result.extractedParts.push({ type: 'email', value: emailMatch[0] });
        remainingText = remainingText.replace(emailMatch[0], '').trim();
    }

    // 4. Extract MONEY/AMOUNTS (50€, 100 euro, 25,50€)
    const moneyPatterns = [
        /(\d+(?:[.,]\d{1,2})?)\s*(?:€|euro|eur)\b/gi,
        /(?:€|euro|eur)\s*(\d+(?:[.,]\d{1,2})?)/gi,
        /(\d+(?:[.,]\d{1,2})?)\s*(?:dollar|\$)/gi
    ];

    for (const pattern of moneyPatterns) {
        const match = remainingText.match(pattern);
        if (match) {
            const amount = match[0].replace(/[^\d.,]/g, '').replace(',', '.');
            result.details.amount = amount;
            result.extractedParts.push({ type: 'amount', value: amount });
            remainingText = remainingText.replace(match[0], '').trim();
            break;
        }
    }

    // 5. Extract DATE & TIME
    const now = new Date();
    let foundDate = null;
    let foundTime = null;

    // Time patterns (14:00, 14 uhr, 14.30)
    const timePatterns = [
        /\b(\d{1,2})[:\.](\d{2})\s*(?:uhr)?\b/gi,
        /\b(\d{1,2})\s*uhr(?:\s*(\d{2}))?\b/gi,
        /\bum\s+(\d{1,2})[:\.]?(\d{2})?\b/gi
    ];

    for (const pattern of timePatterns) {
        const match = pattern.exec(remainingText);
        if (match) {
            const hours = parseInt(match[1]);
            const minutes = match[2] ? parseInt(match[2]) : 0;
            if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
                foundTime = { hours, minutes };
                result.extractedParts.push({ type: 'time', value: `${hours}:${minutes.toString().padStart(2, '0')} ` });
                remainingText = remainingText.replace(match[0], '').trim();
                break;
            }
        }
    }

    // Date patterns
    const dateKeywords = {
        'heute': 0,
        'morgen': 1,
        'übermorgen': 2,
        'montag': getNextWeekday(1),
        'dienstag': getNextWeekday(2),
        'mittwoch': getNextWeekday(3),
        'donnerstag': getNextWeekday(4),
        'freitag': getNextWeekday(5),
        'samstag': getNextWeekday(6),
        'sonntag': getNextWeekday(0),
        'kommenden montag': getNextWeekday(1),
        'kommenden dienstag': getNextWeekday(2),
        'kommenden mittwoch': getNextWeekday(3),
        'kommenden donnerstag': getNextWeekday(4),
        'kommenden freitag': getNextWeekday(5),
        'kommenden samstag': getNextWeekday(6),
        'kommenden sonntag': getNextWeekday(0),
        'nächsten montag': getNextWeekday(1),
        'nächsten dienstag': getNextWeekday(2),
        'nächsten mittwoch': getNextWeekday(3),
        'nächsten donnerstag': getNextWeekday(4),
        'nächsten freitag': getNextWeekday(5),
        'nächsten samstag': getNextWeekday(6),
        'nächsten sonntag': getNextWeekday(0),
        'nächste woche': 7,
        'in einer woche': 7,
        'in 2 tagen': 2,
        'in 3 tagen': 3,
        'in einer stunde': 'hour',
        'in 2 stunden': 'hours2',
        'in 30 minuten': 'min30'
    };

    for (const [keyword, daysOrSpecial] of Object.entries(dateKeywords)) {
        const regex = new RegExp(`\\b${keyword} \\b`, 'gi');
        if (regex.test(remainingText)) {
            if (typeof daysOrSpecial === 'number') {
                foundDate = new Date(now);
                foundDate.setDate(foundDate.getDate() + daysOrSpecial);
            } else if (daysOrSpecial === 'hour') {
                foundDate = new Date(now);
                foundDate.setHours(foundDate.getHours() + 1);
                foundTime = { hours: foundDate.getHours(), minutes: foundDate.getMinutes() };
            } else if (daysOrSpecial === 'hours2') {
                foundDate = new Date(now);
                foundDate.setHours(foundDate.getHours() + 2);
                foundTime = { hours: foundDate.getHours(), minutes: foundDate.getMinutes() };
            } else if (daysOrSpecial === 'min30') {
                foundDate = new Date(now);
                foundDate.setMinutes(foundDate.getMinutes() + 30);
                foundTime = { hours: foundDate.getHours(), minutes: foundDate.getMinutes() };
            }
            result.extractedParts.push({ type: 'date', value: keyword });
            remainingText = remainingText.replace(regex, '').trim();
            break;
        }
    }

    // Explicit date patterns (15.01, 15.01.2024, 15/01)
    const explicitDatePatterns = [
        /\b(\d{1,2})[.\/](\d{1,2})(?:[.\/](\d{2,4}))?\b/g
    ];

    for (const pattern of explicitDatePatterns) {
        const match = pattern.exec(remainingText);
        if (match && !foundDate) {
            const day = parseInt(match[1]);
            const month = parseInt(match[2]) - 1;
            let year = match[3] ? parseInt(match[3]) : now.getFullYear();
            if (year < 100) year += 2000;

            if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
                foundDate = new Date(year, month, day);
                result.extractedParts.push({ type: 'date', value: match[0] });
                remainingText = remainingText.replace(match[0], '').trim();
            }
        }
    }

    // Build deadline if we found date or time
    if (foundDate || foundTime) {
        const d = foundDate ? new Date(foundDate) : new Date(now);
        if (foundTime) {
            d.setHours(foundTime.hours, foundTime.minutes, 0, 0);
        } else {
            d.setHours(9, 0, 0, 0); // Default to 9:00 if no time specified
        }

        // Accurate local format for datetime-local
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        result.deadline = `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    // 6. Extract PERSON/NAME (after common prefixes)
    const personPatterns = [
        /(?:bei|mit|für|von|an)\s+(?:dr\.?|herr|frau|prof\.?)?\s*([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)?)/g,
        /(?:dr\.?|herr|frau|prof\.?)\s+([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)?)/gi
    ];

    for (const pattern of personPatterns) {
        const match = pattern.exec(remainingText);
        if (match) {
            const person = match[1] || match[0];
            result.details.person = person.trim();
            result.extractedParts.push({ type: 'person', value: person.trim() });
            break;
        }
    }

    // NEW: Automatic Contact Match in text even without prefix
    if (!result.details.person) {
        const contactsCache = JSON.parse(localStorage.getItem('taskforce_contacts_cache')) || {};
        const words = remainingText.split(/\s+/);
        for (let i = 0; i < words.length; i++) {
            const potentialName = words[i].toLowerCase();
            const potentialFull = (words[i] + (words[i + 1] ? ' ' + words[i + 1] : '')).toLowerCase();

            if (contactsCache[potentialFull]) {
                result.details.person = contactsCache[potentialFull].name;
                result.extractedParts.push({ type: 'person', value: result.details.person });
                break;
            } else if (contactsCache[potentialName]) {
                result.details.person = contactsCache[potentialName].name;
                result.extractedParts.push({ type: 'person', value: result.details.person });
                break;
            }
        }
    }

    // 7. Extract LOCATION (nach, in, bei, auf + location)
    const locationPatterns = [
        /(?:nach|in|bei|auf|zum|zur|am|im|beim)\s+(?:der|dem|die|das)?\s*([A-ZÄÖÜ][a-zäöüß]+(?:straße|str\.|platz|weg|gasse|allee)?(?:\s+\d+)?(?:\s+[A-ZÄÖÜ][a-zäöüß]+)?)/g,
        /([A-ZÄÖÜ][a-zäöüß]+(?:straße|str\.|platz|weg|gasse|allee)\s*\d*)/g,
        /\bik\s+([A-ZÄÖÜ][a-zäöüß\s,]+)\b/gi // "in Berlin" etc.
    ];

    for (const pattern of locationPatterns) {
        const match = pattern.exec(remainingText);
        if (match) {
            const loc = (match[1] || match[0]).trim();
            // Don't take dates as locations
            if (!/^\d{2}\.\d{2}/.test(loc)) {
                result.details.location = loc;
                result.extractedParts.push({ type: 'location', value: loc });
                remainingText = remainingText.replace(match[0], '').trim();
                break;
            }
        }
    }

    // NEW: Priority for Herr/Frau logic
    // We check the ORIGINAL input for Herr/Frau to ensure we catch it even if parts were removed
    const salutationMatch = input.match(/\b(herr|frau|hr\.?|fr\.?)\s+([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)?)\b/i);
    let priorityTitle = null;
    if (salutationMatch) {
        let title = salutationMatch[1].toLowerCase();
        if (title.startsWith('h')) title = 'Herr';
        else if (title.startsWith('f')) title = 'Frau';

        priorityTitle = `${title} ${salutationMatch[2]} `;
    }

    // 8. Clean up remaining text as task title
    // Remove extra spaces and common filler words
    remainingText = remainingText
        .replace(/\s+/g, ' ')
        .replace(/^(ich muss|ich soll|nicht vergessen|erinnere mich|reminder|plane|eintragen|aufgabe)\s+/gi, '')
        .replace(/\b(mal|bitte|gerne|vielleicht|unbedingt|wieder|endlich)\b/gi, '')
        .replace(/[,\s!]+$/g, '')
        .replace(/^[,\s]+/g, '')
        .trim();

    // 9. STICHWORT LOGIK / TITEL PRIORISIERUNG
    const words = remainingText.split(' ');
    let stichwort = words[0];

    // Priority 1: Person + Location, Priority 2: Person, Priority 3: Stichwort
    if (result.details.person && result.details.location) {
        result.taskTitle = `${result.details.person} @${result.details.location} `;
    } else if (result.details.person) {
        result.taskTitle = result.details.person;
    } else if (result.details.location) {
        result.taskTitle = result.details.location;
    } else {
        result.taskTitle = stichwort ? stichwort.charAt(0).toUpperCase() + stichwort.slice(1) : 'Aufgabe';
    }

    // User wants FULL text as notes
    result.notes = input.trim();

    // If title is empty, use a generic one based on extracted data
    if (!result.taskTitle || result.taskTitle.length < 2) {
        if (result.details.phone) result.taskTitle = 'Anrufen';
        else if (result.details.email) result.taskTitle = 'E-Mail';
        else if (result.details.amount) result.taskTitle = 'Bezahlen';
        else if (result.details.person) result.taskTitle = result.details.person;
        else result.taskTitle = 'Aufgabe';
    }

    // 10. Check for SEARCH INTENT (weiß nicht, kenne nicht, suchen, finden)
    const searchIntentKeywords = ['weiß nicht', 'weiß ich nicht', 'unbekannt', 'kenne nicht', 'habe nicht', 'suche', 'googlen', 'finden', 'recherchieren'];
    const serviceKeywords = ['arzt', 'zahnarzt', 'friseur', 'boutique', 'restaurant', 'kino', 'hotel', 'meeting', 'besprechung', 'büro'];

    if (searchIntentKeywords.some(kw => input.toLowerCase().includes(kw))) {
        result.needsResearch = true;
    }

    // Auto-trigger research if it's a service but no location found
    if (!result.details.location && serviceKeywords.some(kw => input.toLowerCase().includes(kw))) {
        result.needsResearch = true;
    }

    return result;
}

// Open Smart Search - Uses selected AI provider
// Open Smart Search - Uses selected AI provider or Background Simulation
function openSmartSearch(type, context) {
    let query = '';
    const taskTitle = currentTask ? currentTask.keyword : '';
    const person = (currentTask && currentTask.details.person) || '';
    const location = (currentTask && currentTask.details.location) || '';
    const isEditVal = document.getElementById(`question_${type}`) ? document.getElementById(`question_${type}`).value : '';

    // If we already have a value, maybe just validate it? No, user clicked search.

    if (type === 'phone') {
        query = `Telefonnummer ${person || taskTitle} ${location} `;
    } else if (type === 'location') {
        query = `Anschrift Adresse ${person || taskTitle} ${location} `;
    } else if (type === 'brain') {
        // ULTIMATE PROMPT: Monitor, Validate, Find and Question
        query = `RECHERCHE-AUFTRAG & TASK-VALIDIERUNG: 
        1. Recherchiere UNBEDINGT Telefon, E-Mail, Adresse und Sprechzeiten für '${taskTitle}' in '${location}'.
        2. ÜBERWACHE DEN TASK: Prüfe ob etwas nicht stimmt (Termin-Konflikte, Schließzeiten etc.).
        3. FRAGEN-CHECK: Stelle zur Vorbereitung kurz die 6 W-Fragen (Wie? Wo? Was? Warum? Wieso? Weshalb?).
        
        ANTWORTE STRIKT IM FORMAT:
        TELEFON: [Nummer]
        EMAIL: [E-Mail]
        ADRESSE: [Anschrift]
        SPRECHZEITEN: [Details]
        HINWEIS: [Problem-Check]
        FRAGEN: [Wie, Wo, Was, Warum, Wieso, Weshalb - kurz zusammengefasst]
        
        Antworte ohne Smalltalk, direkt bereit zum Kopieren.`;
        window.pendingAiResearch = true;
    } else {
        query = `${type} für ${taskTitle} ${person} ${location} `.trim();
    }

    // Determine Mode: Background (Simulation) vs External
    // For specific fields (phone, address), try background simulation first "ohne Grok zu sehen"
    if (type !== 'brain') {
        startBackgroundResearch(type, query);
        return;
    }

    // Use Google directly for 'brain' as it's the best source for contact info
    if (type === 'brain') {
        const provider = appSettings.aiProvider || 'grok';
        if (provider === 'grok') {
            window.open(`https://grok.com/?q=${encodeURIComponent(query)}`, '_blank');
        } else if (provider === 'gemini') {
            window.open(`https://gemini.google.com/app?q=${encodeURIComponent(query)}`, '_blank');
        } else {
            window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
        }
    } else {
        openAISearch(query);
    }
}

// MOCK / BACKGROUND RESEARCH (Simulates "Invisible Grok" or uses OpenAI)
async function startBackgroundResearch(type, query) {
    showToast('🤖 KI recherchiert im Hintergrund...', 'info');

    // CHECK FOR REAL OPENAI KEY
    if (appSettings.aiProvider === 'chatgpt' && appSettings.openaiApiKey && appSettings.openaiApiKey.startsWith('sk-')) {
        try {
            console.log("🚀 Starting OpenAI Research...");
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${appSettings.openaiApiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: [
                        {
                            role: "system",
                            content: `You are a data extraction assistant. The user wants to find specific contact details. 
                            If the user asks for a PHONE NUMBER, return ONLY the phone number. 
                            If the user asks for an ADDRESS, return ONLY the full address. 
                            If not found, return 'NOT_FOUND'. 
                            Do not output any other text.`
                        },
                        { role: "user", content: query }
                    ],
                    temperature: 0.3,
                    max_tokens: 60
                })
            });

            const data = await response.json();
            if (data.choices && data.choices.length > 0) {
                let content = data.choices[0].message.content.trim();
                console.log("🤖 OpenAI Result:", content);

                if (content && content !== 'NOT_FOUND') {
                    showToast('✅ ChatGPT hat Daten gefunden!', 'success');
                    processResearchResult(content, type);
                    return;
                }
            }
        } catch (e) {
            console.error("OpenAI Error:", e);
            showToast('OpenAI Fehler. Versuche Fallback...', 'error');
        }
    }


    // Simulate API Delay (Fallback / Grok Simulation)
    setTimeout(() => {
        let result = '';
        const taskTitle = currentTask ? currentTask.keyword : 'Unbekannt';

        // Simple Simulation Logic (In real app, this would be a fetch to a backend proxy)
        if (type === 'phone' || query.includes('Telefon')) {
            // Check if we know it in cache first (Mock)
            result = "030 12345678";

            // For DEMO purposes or if we had a database:
            if (taskTitle.toLowerCase().includes('arzt')) result = "089 116117";
            else if (taskTitle.toLowerCase().includes('pizza')) result = "030 99887766";
            else {
                // FALLBACK: If we really can't find it, we must ask user to search manually
                showToast('🤔 Konnte es nicht automatisch finden. Öffne Suche...', 'error');
                const provider = appSettings.aiProvider || 'grok';
                const url = provider === 'grok' ? `https://grok.com/?q=${encodeURIComponent(query)}` : `https://www.google.com/search?q=${encodeURIComponent(query)}`;
                window.open(url, '_blank');
                window.pendingAiResearch = true;
                window.pendingAiSearchType = 'phone'; // Map 'phone' to internal type
                return;
            }
        }
        else if (type === 'location' || query.includes('Adresse')) {
            if (taskTitle.toLowerCase().includes('berlin')) result = "Alexanderplatz 1, 10178 Berlin";
            else if (taskTitle.toLowerCase().includes('münchen')) result = "Marienplatz 1, 80331 München";
            else {
                showToast('🤔 Konnte Adresse nicht verifizieren. Öffne Suche...', 'error');
                window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
                window.pendingAiResearch = true;
                window.pendingAiSearchType = 'Adresse';
                return;
            }
        }
        else if (type === 'email' || query.includes('mail')) {
            result = "info@beispiel.de";
        }
        else {
            result = "Gefundene Info für " + type;
        }

        // Success Case (Simulated)
        showToast('✅ Grok (Simulation) hat Daten gefunden!', 'success');
        processResearchResult(result, type);

    }, 2000); // 2 seconds thinking time
}

function processResearchResult(result, type) {
    // Auto-fill if specific field in modal
    const fieldMap = {
        'phone': 'question_phone',
        'location': 'question_location',
        'email': 'question_email',
        'address': 'question_location'
    };

    const targetId = fieldMap[type];
    if (targetId && document.getElementById(targetId)) {
        const input = document.getElementById(targetId);
        input.value = result;
        input.classList.add('highlight-flash');
        setTimeout(() => input.classList.remove('highlight-flash'), 1000);

        if (currentTask) {
            if (type === 'phone') currentTask.details.phone = result;
            if (type === 'location') currentTask.details.location = result;
            if (type === 'email') currentTask.details.email = result;
        }
    } else {
        openAiResearchResultModal(result, type === 'location' ? 'Adresse' : (type === 'phone' ? 'Telefonnummer' : 'Info'));
    }
}

// Magic Fill: Extracts structured data from raw text (e.g. copied from Google)
function magicFillFromText() {
    const rawEl = document.getElementById('magicRawInput');
    if (!rawEl || !rawEl.value.trim()) return;

    const text = rawEl.value;
    console.log("Magic Filling from text...");

    const extracted = {
        phone: null,
        email: null,
        location: null,
        hours: null
    };

    // 1. Phone Extraction
    let phoneMatch = text.match(/(?:tel|phone|telefon|mobil|☎️|📞)\s*[:=]?\s*([+0-9\s\-\/]{7,})/i);
    if (phoneMatch) extracted.phone = phoneMatch[1].trim();
    else {
        const genericPhoneMatch = text.match(/(?:(?:\+|00)\d{1,3}[\s-]?)?\(?0\d{2,5}\)?[\s-]?\d{3,10}/g);
        if (genericPhoneMatch) extracted.phone = genericPhoneMatch.sort((a, b) => b.length - a.length)[0];
    }

    // 2. Email Extraction
    const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})/);
    if (emailMatch) extracted.email = emailMatch[1].trim();

    // 3. Address Extraction
    const addrLabeledMatch = text.match(/(?:Adresse|Anschrift|Standort|Location)\s*[:=]?\s*([^🏠📅⏰📝\n]+)/i);
    if (addrLabeledMatch) {
        let cleanAddr = addrLabeledMatch[1].trim();
        // Remove names (common prefixes)
        cleanAddr = cleanAddr.replace(/^(?:Dr\.?\s+|Herr\s+|Frau\s+|Prof\.?\s+)/gi, '');
        extracted.location = cleanAddr;
    } else {
        const deAddrMatch = text.match(/([A-ZÄÖÜ][a-zäöüß.\-\s]+[0-9]+[a-z]?)\s*,?\s*([0-9]{5}\s+[A-ZÄÖÜa-zäöüß]+)/);
        if (deAddrMatch) extracted.location = deAddrMatch[0].trim();
    }

    // 4. Opening Hours
    const hoursRegex = /(?:Öffnungszeiten|Sprechzeiten|Mo-Fr|Mo\.\s*-\s*Fr\.)\s*[:=]?\s*([^\n]+)/i;
    const hoursMatch = text.match(hoursRegex);
    if (hoursMatch) extracted.hours = hoursMatch[1].trim();
    else if (text.includes('⋅ Öffnet um') || text.includes('⋅ Schließt um')) {
        const hourLine = text.split('\n').find(l => l.includes('⋅ Öffnet') || l.includes('⋅ Schließt'));
        if (hourLine) extracted.hours = hourLine.trim();
    }

    // 5. Grok Monitoring / Hints
    const hintMatch = text.match(/(?:HINWEIS|ACHTUNG|WARNUNG|INFO)\s*[:=]?\s*([^\n]+)/i);
    if (hintMatch) {
        const hint = hintMatch[1].trim();
        if (!hint.toLowerCase().includes('keine') && !hint.toLowerCase().includes('nicht gefunden')) {
            setTimeout(() => {
                showToast(`🧠 Grok Hinweis: ${hint}`, 'info', 8000);
                if (appSettings.aiVoiceEnabled) speakText(`Grok hat einen Hinweis für dich: ${hint}`);
            }, 1000);
        }
    }

    // 6. 6 W-Questions
    const questionsMatch = text.match(/(?:FRAGEN|W-FRAGEN)\s*[:=]?\s*([^\n]+)/i);
    if (questionsMatch) {
        extracted.hours = (extracted.hours || '') + (extracted.hours ? '\n' : '') + '🤔 Grok Fragt: ' + questionsMatch[1].trim();
    }

    // Apply results & create fields if missing
    let anyFilled = false;
    for (const [key, value] of Object.entries(extracted)) {
        if (!value) continue;

        if (key === 'hours') {
            const notesEl = document.getElementById('taskNotes');
            if (notesEl) {
                const existing = notesEl.value ? notesEl.value + '\n\n' : '';
                if (!notesEl.value.includes(value)) {
                    notesEl.value = existing + '🕒 Sprechzeiten: ' + value;
                    anyFilled = true;
                }
            }
            continue;
        }

        let input = document.getElementById(`question_${key}`);
        if (!input) {
            // DYNAMICALLY CREATE FIELD if it doesn't exist
            console.log(`Creating dynamic field for ${key}`);
            const labelMap = { phone: '📞 Telefon', email: '📧 E-Mail', location: '📍 Adresse' };
            const typeMap = { phone: 'tel', email: 'email', location: 'text' };

            const newField = document.createElement('div');
            newField.className = 'form-group dynamic-added';
            newField.innerHTML = `
                <div class="label-row">
                    <label>${labelMap[key]}</label>
                </div>
                <input type="${typeMap[key]}" id="question_${key}" value="${value}">
            `;
            // Insert before notes
            const notesGroup = document.getElementById('taskNotes').closest('.form-group');
            if (notesGroup) {
                notesGroup.parentNode.insertBefore(newField, notesGroup);
                input = document.getElementById(`question_${key}`);
            }
        }

        if (input) {
            input.value = value;
            anyFilled = true;
        } else if (isEditMode) {
            const editInp = document.getElementById(`editDetail_${key}`);
            if (editInp) {
                editInp.value = value;
                anyFilled = true;
            }
        }
    }

    if (anyFilled) {
        showToast('Daten erfolgreich eingefügt!', 'success');
        if (appSettings.aiVoiceEnabled) speakText("Ich habe die Details für dich eingetragen.");
        rawEl.value = '';
        return true;
    } else {
        showToast('Keine passenden Informationen im Text gefunden.', 'info');
        return false;
    }
}

function openGrokSearch() {
    const taskTitle = currentTask ? currentTask.keyword : '';
    const details = currentTask ? Object.values(currentTask.details).filter(v => v).join(' ') : '';
    const query = `Recherchiere Details zu: ${taskTitle} ${details}`;
    openAISearch(query);
}

// Open AI Search based on user's selected provider
function openAISearch(query) {
    const provider = appSettings.aiProvider || 'grok';
    let url = '';

    switch (provider) {
        case 'chatgpt':
            // OpenAI ChatGPT
            url = `https://chat.openai.com/?q=${encodeURIComponent(query)}`;
            break;
        case 'gemini':
            // Google Gemini
            url = `https://gemini.google.com/app?q=${encodeURIComponent(query)}`;
            break;
        case 'grok':
        default:
            // xAI Grok (grok.com)
            url = `https://grok.com/?q=${encodeURIComponent(query)}`;
            break;
    }

    window.open(url, '_blank');
    showToast(`${getAiName()} wird geöffnet...`, 'info');
}

window.openSmartSearch = openSmartSearch;
window.openGrokSearch = openGrokSearch;
window.openAISearch = openAISearch;

// Helper function to get next weekday
function getNextWeekday(targetDay) {
    const now = new Date();
    const currentDay = now.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7; // If today or past, go to next week
    return daysUntil;
}

// Detect questions based on keyword (only for fields not already filled)
function detectQuestions(keyword, existingDetails = {}) {
    if (!keyword) return [];
    const lowerKeyword = keyword.toLowerCase();
    const questions = [];

    for (const [key, pattern] of Object.entries(keywordPatterns)) {
        // Only add question if not already filled
        if (!existingDetails[key] && pattern.keywords.some(kw => lowerKeyword.includes(kw))) {
            questions.push({ key, ...pattern.question });
        }
    }

    return questions;
}

// Show Questions Modal
function showQuestionsModal(keyword, detectedQuestions, parsedData = {}) {
    taskKeywordDisplay.textContent = keyword;

    const isUrgent = parsedData.isUrgent || false;
    const deadline = parsedData.deadline || '';
    const notes = parsedData.notes || '';

    let html = `
        <div class="form-group">
            <label>📅 Datum & Uhrzeit (optional)</label>
            <input type="datetime-local" id="taskDeadline" value="${deadline}" style="margin-bottom: 1rem;">
        </div>

        <div class="form-group">
            <label>⏰ Priorität</label>
            <div class="priority-toggle" id="priorityToggle">
                <div class="priority-option ${!isUrgent ? 'selected' : ''} normal" data-priority="normal">
                    <div class="icon">📋</div>
                    <div class="label">Normal</div>
                </div>
                <div class="priority-option ${isUrgent ? 'selected' : ''} urgent" data-priority="urgent">
                    <div class="icon">🔥</div>
                    <div class="label">DRINGEND!</div>
                </div>
            </div>
        </div>

        <div class="form-group brain-assistant-group" style="border: 2px solid var(--primary-color); padding: 10px; border-radius: 12px; background: rgba(var(--primary-rgb), 0.05);">
            <div class="label-row">
                <label>🧠 Google Brain Assistance</label>
                <button type="button" class="btn-search-mini brain" onclick="openSmartSearch('brain')">🔍 Google Recherche</button>
            </div>
            <textarea id="magicRawInput" style="height: 40px; font-size: 0.8rem; margin: 5px 0;" placeholder="Ergebnisse hier reinkopieren... (oder Sprachbefehl nutzen)"></textarea>
            <button type="button" class="btn-primary" style="width: 100%; font-weight: bold; background: linear-gradient(135deg, var(--primary-color), #4facfe);" onclick="magicFillFromClipboard()">🚀 Das ist der Richtige! (Einfügen)</button>
        </div>

        <div class="form-group">
            <label>📝 Notizen (optional)</label>
            <textarea id="taskNotes" placeholder="Zusätzliche Informationen...">${notes}</textarea>
        </div>
    `;

    // Add detected questions AND pre-fill them if we have data
    detectedQuestions.forEach(q => {
        const prefilledValue = (parsedData.details && parsedData.details[q.key]) || '';
        const isContactField = ['phone', 'person', 'birthday', 'email'].includes(q.key);
        html += `
            <div class="form-group">
                <div class="label-row">
                    <label>${q.label}</label>
                    <div class="search-helper">
                        ${isContactField ? `<button type="button" class="btn-search-mini contact-picker-btn" onclick="selectContact('question_${q.key}')">👤 Kontakte</button>` : ''}
                        <button type="button" class="btn-search-mini" onclick="openSmartSearch('${q.key}')">🔍 Google</button>
                    </div>
                </div>
                <input type="${q.type}" id="question_${q.key}" placeholder="${q.placeholder}" value="${prefilledValue}">
            </div>
        `;
    });

    const aiTips = generateAiTips(keyword, parsedData.details);
    if (aiTips && appSettings.aiTipsEnabled) {
        html = aiTips.html + html;
        if (appSettings.aiVoiceEnabled) {
            speakText(aiTips.plain);
        }
    }

    if (parsedData.needsResearch) {
        html = `
            <div class="search-suggestion ai-suggestion-box research">
                <div class="ai-suggestion-icon">🌐</div>
                <div class="ai-suggestion-text">
                    <strong>💡 Recherche nötig?</strong>
                    <span>Ich habe gemerkt, dass dir einige Informationen fehlen. Du kannst direkt hier suchen:</span>
                    <div class="search-options" style="margin-top: 0.5rem;">
                        <button type="button" class="btn-search-mini" onclick="openSmartSearch('general')">🌐 Google Hilfe</button>
                        <button type="button" class="btn-search-mini grok" onclick="openGrokSearch()">🤖 Grok (KI) fragen</button>
                    </div>
                </div>
            </div>
        ` + html;
    }

    // Also show already filled details in read-only or editable fields if appropriate
    if (parsedData.details) {
        for (const [key, value] of Object.entries(parsedData.details)) {
            // Skip notes/deadline as they are already at the top
            if (key === 'notes') continue;

            const alreadyInQuestions = detectedQuestions.some(q => q.key === key);
            if (!alreadyInQuestions && value && value.trim() !== '') {
                // Use keywordPatterns for labels if available
                const pattern = keywordPatterns[key];
                const label = pattern ? pattern.question.label : (key.charAt(0).toUpperCase() + key.slice(1));
                const type = pattern ? pattern.question.type : 'text';
                const isContactField = ['phone', 'person', 'birthday', 'email'].includes(key);

                html += `
                    <div class="form-group">
                        <div class="label-row">
                            <label>${label}</label>
                            <div class="search-helper">
                                ${isContactField ? `<button type="button" class="btn-search-mini contact-picker-btn" onclick="selectContact('question_${key}')">👤 Kontakte</button>` : ''}
                                <button type="button" class="btn-search-mini" onclick="openSmartSearch('${key}')">🔍 Google</button>
                            </div>
                        </div>
                        <input type="${type}" id="question_${key}" value="${escapeHtml(value)}">
                    </div>
                `;
            }
        }
    }

    questionsContainer.innerHTML = html;
    questionsModal.classList.remove('hidden');

    // Add listener to person input for real-time cache matching
    const personInput = document.getElementById('question_person');
    if (personInput) {
        personInput.addEventListener('input', () => {
            const match = checkContactCacheMatch(personInput.value.trim());
            if (match) {
                autoFillContactData(match);
                showToast(`Infos für ${match.name} geladen`, 'info');
            }
        });
    }

    // Priority Toggle Listeners
    const pToggle = document.getElementById('priorityToggle');
    if (pToggle) {
        const options = pToggle.querySelectorAll('.priority-option');
        options.forEach(opt => {
            opt.addEventListener('click', () => {
                options.forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
            });
        });
    }

    // ENABLE ENTER KEY TO SAVE
    const allInputs = questionsContainer.querySelectorAll('input, select');
    // Also include the dedicated deadline/notes inputs which are IDs
    const extraInputs = [document.getElementById('taskDeadline'), document.getElementById('taskNotes')];

    [...allInputs, ...extraInputs].forEach(el => {
        if (!el) return;
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Prevent newline in textarea or form submit
                saveTask(false);
            }
        });
    });
}

// Select Priority
function selectPriority(element) {
    if (!element) return;
    const parent = element.parentElement;
    if (parent) {
        parent.querySelectorAll('.priority-option').forEach(el => el.classList.remove('selected'));
    }
    element.classList.add('selected');
}
window.selectPriority = selectPriority;

// Save Task
function saveTask(skipped) {
    if (!currentTask) return;

    const selectedPriority = document.querySelector('.priority-option.selected');
    currentTask.priority = selectedPriority ? selectedPriority.dataset.priority : 'normal';

    const notesEl = document.getElementById('taskNotes');
    if (notesEl && notesEl.value.trim()) {
        currentTask.details.notes = notesEl.value.trim();
    }

    const deadlineEl = document.getElementById('taskDeadline');
    if (deadlineEl && deadlineEl.value) {
        currentTask.deadline = deadlineEl.value;
    }

    // DISALLOW PAST DEADLINES
    if (currentTask.deadline && new Date(currentTask.deadline) < new Date()) {
        showToast('Termin liegt in der Vergangenheit!', 'error');
        if (deadlineEl) {
            deadlineEl.focus();
            deadlineEl.classList.add('shake');
            setTimeout(() => deadlineEl.classList.remove('shake'), 400);
        }
        return;
    }

    if (!skipped) {
        document.querySelectorAll('[id^="question_"]').forEach(input => {
            if (input.value.trim()) {
                const key = input.id.replace('question_', '');
                currentTask.details[key] = input.value.trim();
            }
        });
    }

    // Attachment
    if (currentFileBase64) {
        currentTask.file = {
            base64: currentFileBase64,
            name: currentFileName
        };
    }

    // Clear file selection for next time
    resetFileSelection();

    tasks.unshift(currentTask);
    saveTasks();
    renderTasks();
    updateStats();

    // Close Modal
    questionsModal.classList.add('hidden');

    keywordInput.value = '';
    keywordInput.style.height = '48px'; // Reset height
    showToast('Aufgabe gespeichert!', 'success');

    if (currentTask.priority === 'urgent') {
        showNotification('🔥 Dringende Aufgabe!', currentTask.keyword);
    }

    currentTask = null;
}

window.saveTask = saveTask;
function resetFileSelection() {
    currentFileBase64 = null;
    currentFileName = null;
    if (taskFileUpload) taskFileUpload.value = '';
    if (taskFileName) taskFileName.textContent = 'Keine Datei';
    if (removeFileBtn) removeFileBtn.classList.add('hidden');
}

// Save tasks to localStorage (user-specific or team-specific)
function saveTasks() {
    if (currentUser) {
        const storageKey = currentUser.teamCode ? `taskforce_tasks_shared_${currentUser.teamCode}` : `taskforce_tasks_${currentUser.id}`;
        try {
            localStorage.setItem(storageKey, JSON.stringify(tasks));
        } catch (e) {
            console.error("Storage error:", e);
        }

        // Firebase Sync
        if (db) {
            const path = currentUser.teamCode ? `teams/${currentUser.teamCode}/tasks` : `users/${currentUser.id}/tasks`;

            // Sync current tasks
            tasks.forEach(task => {
                db.collection(path).doc(task.id).set(task).catch(e => console.error("Firebase save error:", e));
            });

            // Note: In a real-world app, you'd also need to handle deletions
            // by comparing the cloud list with the local list if you unshift/splice.
            // For now, this ensures all CURRENT tasks are in the cloud.
        }
    }
}

// Render Tasks
function renderTasks() {
    // Filter tasks based on currentFilter
    const filteredTasks = tasks.filter(task => {
        if (currentFilter === 'all') return !task.archived;
        if (currentFilter === 'done') return task.done && !task.archived;
        if (currentFilter === 'urgent') return task.priority === 'urgent' && !task.done && !task.archived;
        if (currentFilter === 'normal') return task.priority === 'normal' && !task.done && !task.archived;
        if (currentFilter === 'archived') return task.archived;
        return !task.archived;
    });

    // Sort: Deadlines ascending, then others
    filteredTasks.sort((a, b) => {
        if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
        if (a.deadline) return -1;
        if (b.deadline) return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    if (filteredTasks.length === 0) {
        tasksList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">${currentFilter === 'done' ? '✓' : '📋'}</div>
                <h3>${getEmptyMessage()}</h3>
                <p>${currentFilter === 'all' ? 'Gib ein Stichwort ein, um loszulegen!' : ''}</p>
            </div>
        `;
        return;
    }

    tasksList.innerHTML = filteredTasks.map(task => {
        const dateStr = task.deadline ? formatDateShort(task.deadline) : '';
        const timeStr = task.deadline ? formatTimeShort(task.deadline) : '';
        const locStr = task.details.location ? escapeHtml(task.details.location) : '';
        const phoneStr = task.details.phone ? escapeHtml(task.details.phone) : '';
        const emailStr = task.details.email ? escapeHtml(task.details.email) : '';

        return `
        <div class="task-card ${task.priority} ${task.done ? 'done' : ''}" onclick="openTaskDetail('${task.id}')">
            <div class="task-header">
                <span class="task-title">${escapeHtml(task.keyword)}</span>
                <span class="task-priority ${task.priority}">${task.priority === 'urgent' ? '🔥 WICHTIG' : '📋 Normal'}</span>
            </div>
            <div class="task-meta-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 0.85rem; color: var(--text-muted); margin-top: 8px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span>📅</span> <span>${dateStr || '--.--.'}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span>⏰</span> <span>${timeStr || '--:--'}</span>
                </div>
                <div style="grid-column: 1 / -1; display: flex; align-items: center; gap: 6px; margin-top: 4px;">
                    <span>📍</span> <span style="${!locStr ? 'opacity: 0.5;' : ''}">${locStr || 'Kein Ort'}</span>
                </div>
                
                ${(phoneStr || emailStr) ? `
                <div style="grid-column: 1 / -1; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-glass); display: flex; flex-direction: column; gap: 8px;">
                    ${phoneStr ? `
                    <button onclick="event.stopPropagation(); window.location.href='tel:${phoneStr}'" style="background: var(--success); color: white; border: none; padding: 8px 12px; border-radius: 8px; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; gap: 8px; width: 100%; justify-content: center; font-weight: 600; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
                        📞 ${phoneStr} anrufen
                    </button>` : ''}
                    
                    ${emailStr ? `
                    <button onclick="event.stopPropagation(); window.location.href='mailto:${emailStr}'" style="background: var(--primary); color: white; border: none; padding: 8px 12px; border-radius: 8px; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; gap: 8px; width: 100%; justify-content: center; font-weight: 600; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
                        ✉️ ${emailStr} schreiben
                    </button>` : ''}
                </div>` : ''}

                ${task.file ? '<div style="grid-column: 1 / -1; margin-top:4px;">📎 Anhang vorhanden</div>' : ''}
            </div>
        </div>
    `}).join('');

    // Update calendar if open
    if (!document.getElementById('calendarModal').classList.contains('hidden')) {
        renderCalendar();
    }
}

function getEmptyMessage() {
    switch (currentFilter) {
        case 'urgent': return 'Keine dringenden Aufgaben';
        case 'normal': return 'Keine normalen Aufgaben';
        case 'done': return 'Noch nichts erledigt';
        case 'archived': return 'Archiv ist leer';
        default: return 'Keine Aufgaben';
    }
}

// Update Stats
function updateStats() {
    const activeTasks = tasks.filter(t => !t.archived);
    const total = activeTasks.filter(t => !t.done).length;
    const urgent = activeTasks.filter(t => t.priority === 'urgent' && !t.done).length;
    const done = activeTasks.filter(t => t.done).length;

    totalTasksEl.textContent = total;
    urgentTasksEl.textContent = urgent;
    doneTasksEl.textContent = done;
}

// Open Task Detail
function openTaskDetail(taskId) {
    const task = tasks.find(t => t.id == taskId);
    if (!task) return;

    currentTask = task;
    isEditMode = false; // Reset edit mode when opening

    renderTaskDetailContent();
    taskDetailModal.classList.remove('hidden');
}

let isEditMode = false;

function renderTaskDetailContent() {
    if (!currentTask) return;

    const task = currentTask;
    if (detailTaskTitle) detailTaskTitle.textContent = task.keyword;

    if (detailTaskStatus) {
        detailTaskStatus.textContent = task.done ? 'Erledigt' : (task.priority === 'urgent' ? 'Dringend' : 'Normal');
        detailTaskStatus.className = `status-badge ${task.done ? 'done' : task.priority}`;
    }

    // Update icons for Edit Mode
    const editBtn = document.getElementById('editTaskBtn');
    if (editBtn) {
        editBtn.textContent = isEditMode ? '💾' : '✏️';
        editBtn.title = isEditMode ? 'Speichern' : 'Bearbeiten';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            if (isEditMode) saveTaskEdits(); else toggleEditMode();
        };
    }

    const deleteBtn = document.getElementById('deleteTaskBtn');
    if (deleteBtn) {
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteCurrentTask();
        };
    }

    const archiveBtn = document.getElementById('archiveTaskBtn');
    if (archiveBtn) {
        archiveBtn.onclick = (e) => {
            e.stopPropagation();
            archiveCurrentTask();
        };
    }

    if (detailTaskTitle) {
        detailTaskTitle.style.display = isEditMode ? 'none' : 'block';
    }

    // Done Button State
    const doneBtn = document.getElementById('toggleDoneBtn');
    if (doneBtn) {
        doneBtn.className = isEditMode ? 'icon-btn secondary' : 'icon-btn success';
        doneBtn.textContent = isEditMode ? '✕' : (task.done ? '↩️' : '✓');
        doneBtn.onclick = (e) => {
            e.stopPropagation();
            if (isEditMode) {
                cancelEdit();
            } else {
                toggleTaskDone();
            }
        };
        doneBtn.title = isEditMode ? "Abbrechen" : (task.done ? "Wieder öffnen" : "Erledigt");
    }

    const prioritySel = document.querySelector('.detail-priority-selection');
    if (prioritySel) prioritySel.classList.toggle('hidden', isEditMode);

    let detailsHtml = '';

    if (isEditMode) {
        detailsHtml += `
            <div class="edit-form">
                <div class="form-group">
                    <label>📌 Titel</label>
                    <input type="text" id="editTaskTitle" value="${escapeHtml(task.keyword)}">
                </div>
                <div class="form-group">
                    <label>📝 Notizen</label>
                    <textarea id="editTaskNotes" rows="4">${escapeHtml(task.details.notes || '')}</textarea>
                </div>
                <div class="form-group">
                    <label>📅 Datum & Uhrzeit</label>
                    <input type="datetime-local" id="editTaskDeadline" value="${task.deadline || ''}">
                </div>

                <div class="form-group brain-assistant-group" style="border: 1px dashed var(--primary-color); padding: 10px; border-radius: 8px; margin-bottom: 15px;">
                    <div class="label-row">
                        <label>🧠 Grok Update</label>
                        <button type="button" class="btn-search-mini brain" onclick="openSmartSearch('brain')">🔍 Grok Recherche</button>
                    </div>
                    <textarea id="magicRawInput" style="height: 35px; font-size: 0.75rem; margin-top: 5px;" placeholder="Grok-Antwort hier einfügen..."></textarea>
                </div>
        `;

        const detailLabels = {
            phone: 'Telefon', email: 'E-Mail', location: 'Ort', person: 'Person', amount: 'Betrag', birthday: 'Geburtstag', website: 'Homepage'
        };

        for (const [key, label] of Object.entries(detailLabels)) {
            const val = task.details[key] || '';
            const isPhone = key === 'phone';
            detailsHtml += `
                <div class="form-group">
                    <div class="label-row">
                        <label>${label}</label>
                        ${isPhone ? `<button type="button" class="btn-search-mini contact-picker-btn" onclick="selectContact('editDetail_${key}')">👤 Kontakte</button>` : ''}
                    </div>
                    <input type="text" id="editDetail_${key}" value="${escapeHtml(val)}">
                </div>
            `;
        }

        detailsHtml += `
            </div>
        `;

        setTimeout(() => {
            const editForm = document.querySelector('.edit-form');
            if (editForm) {
                editForm.querySelectorAll('input, textarea').forEach(el => {
                    el.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                            saveTaskEdits();
                        }
                    });
                });
            }
        }, 0);
    } else {
        if (task.deadline) {
            const d = new Date(task.deadline);
            detailsHtml += `
                <div class="detail-item">
                    <div class="detail-icon">📅</div>
                    <div class="detail-content">
                        <div class="detail-label">Zeitpunkt</div>
                        <div class="detail-value">${d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })} um ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</div>
                    </div>
                </div>
            `;
        }

        const detailIcons = {
            phone: '📞', document: '📄', appointment: '📅', location: '📍',
            person: '👤', amount: '💰', email: '✉️', notes: '📝',
            date: '📅', time: '🕒', birthday: '🎂', website: '🌐'
        };

        for (const [key, value] of Object.entries(task.details)) {
            if (!value || value.trim() === '') continue;
            const icon = detailIcons[key] || '📌';
            let displayValue = escapeHtml(value);
            if (key === 'phone') displayValue = `<a href="tel:${value}">${value}</a>`;
            else if (key === 'email') displayValue = `<a href="mailto:${value}">${value}</a>`;
            else if (key === 'amount') displayValue = `${value} €`;
            else if (key === 'location') displayValue = `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}" target="_blank">${value}</a>`;

            detailsHtml += `
                <div class="detail-item">
                    <div class="detail-icon">${icon}</div>
                    <div class="detail-content">
                        <div class="detail-label">${key.charAt(0).toUpperCase() + key.slice(1)}</div>
                        <div class="detail-value">${displayValue}</div>
                    </div>
                </div>
            `;
        }

        if (task.file && task.file.base64) {
            detailsHtml += `
                <div class="detail-item">
                    <div class="detail-icon">📎</div>
                    <div class="detail-content">
                        <div class="detail-label">Anhang</div>
                        <div class="detail-value">
                            <a href="${task.file.base64}" download="${task.file.name}" class="file-link">📥 herunterladen</a>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    detailContent.innerHTML = detailsHtml;
    if (document.getElementById('archiveTaskBtn')) document.getElementById('archiveTaskBtn').style.display = isEditMode ? 'none' : 'flex';
    if (document.getElementById('deleteTaskBtn')) document.getElementById('deleteTaskBtn').style.display = isEditMode ? 'none' : 'flex';
    checkContactSupport();
}

function toggleEditMode() {
    isEditMode = true;
    renderTaskDetailContent();
}

function cancelEdit() {
    isEditMode = false;
    renderTaskDetailContent();
}

function saveTaskEdits() {
    if (!currentTask) return;

    currentTask.keyword = document.getElementById('editTaskTitle').value.trim();
    currentTask.details.notes = document.getElementById('editTaskNotes').value.trim();
    currentTask.deadline = document.getElementById('editTaskDeadline').value;

    const detailKeys = ['phone', 'email', 'location', 'person', 'amount', 'birthday', 'website'];
    detailKeys.forEach(key => {
        const el = document.getElementById(`editDetail_${key}`);
        if (el) currentTask.details[key] = el.value.trim();
    });

    saveTasks();
    renderTasks();
    updateStats();
    isEditMode = false;
    renderTaskDetailContent();
    showToast('Änderungen gespeichert!', 'success');
}

// ===== RESTORED FUNCTIONS =====

async function selectContact(targetInputId) {
    if (!('contacts' in navigator && 'ContactsManager' in window)) {
        return showToast('Kontaktauswahl nicht unterstützt.', 'error');
    }
    try {
        const props = ['name', 'tel', 'email', 'address'];
        const contacts = await navigator.contacts.select(props, { multiple: false });
        if (contacts.length > 0) {
            const c = contacts[0];
            const name = (c.name && c.name[0]) ? c.name[0] : (c.name || '');
            const phone = (c.tel && c.tel[0]) ? c.tel[0].replace(/[^\d+]/g, '') : '';
            const email = (c.email && c.email[0]) ? c.email[0] : '';
            let loc = '';
            if (c.address && c.address[0]) {
                const a = c.address[0];
                loc = a.addressLine || (a.city ? `${a.street || ''} ${a.city}` : '');
            }

            const input = document.getElementById(targetInputId);
            if (input) {
                input.value = phone || name;
                input.dispatchEvent(new Event('input'));
            }
            autoFillContactData({ name, phone, email, location: loc });
            showToast(`Kontakt ${name} übernommen`, 'success');
        }
    } catch (e) { console.error(e); showToast('Fehler bei Kontakten', 'error'); }
}

function generateAiTips(keyword, details = {}) {
    if (!keyword) return null;
    const lower = keyword.toLowerCase();
    let tips = [];

    // Basic Keyword-based Tips
    if (lower.includes('arzt') || lower.includes('klinik')) tips.push("Versichertenkarte nicht vergessen!");
    if (lower.includes('amt') || lower.includes('behörde')) tips.push("Ausweis dabei?");
    if (lower.includes('einkauf')) tips.push("Einkaufsbeutel dabei?");
    if (lower.includes('sport')) tips.push("Handtuch und Wasser?");

    // Location-based Tips
    if (details.location) {
        tips.push(`📍 Route prüfen für ${details.location}`);
    } else if (lower.includes('arzt') || lower.includes('zahnarzt') || lower.includes('friseur') || lower.includes('büro') || lower.includes('meeting')) {
        tips.push(`🤖 <strong>Grok Tipp:</strong> Adresse für "${keyword}" unbekannt. Soll ich sie suchen?`);
    }

    // SEQUENCE COACHING: Check other tasks for the same day
    if (currentTask && currentTask.deadline) {
        const taskDate = new Date(currentTask.deadline).toDateString();
        const sameDayTasks = tasks.filter(t =>
            t.deadline &&
            new Date(t.deadline).toDateString() === taskDate &&
            t.id !== currentTask.id &&
            !t.archived
        ).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

        if (sameDayTasks.length > 0) {
            const myTime = new Date(currentTask.deadline);
            // Find predecessor and successor
            let prev = null;
            let next = null;
            for (let t of sameDayTasks) {
                const tTime = new Date(t.deadline);
                if (tTime < myTime) {
                    if (!prev || tTime > new Date(prev.deadline)) prev = t;
                } else {
                    if (!next || tTime < new Date(next.deadline)) next = t;
                }
            }

            if (prev && prev.details.location && details.location) {
                tips.push(`🚀 Du kommst von ${prev.keyword} (${prev.details.location}). Plane ca. 15-20 Min Fahrt ein.`);
            }
            if (next && next.details.location && details.location) {
                tips.push(`🏁 Danach geht es weiter zu ${next.keyword} in ${next.details.location}.`);
            }
        }
    }

    if (tips.length === 0) return null;
    const full = tips.join(' ');

    return {
        plain: full,
        html: `<div class="ai-suggestion-box">
            <div class="ai-suggestion-icon">🤖</div>
            <div class="ai-suggestion-text">
                <strong>Grok Coaching:</strong> ${full}
            </div>
        </div>`
    };
}


function speakText(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    // Simple speak
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'de-DE';
    window.speechSynthesis.speak(u);
}

function autoFillContactData(d) {
    const map = {
        'question_phone': d.phone, 'question_email': d.email, 'question_location': d.location,
        'question_person': d.name, 'editDetail_phone': d.phone, 'editDetail_person': d.name
    };
    for (const [k, v] of Object.entries(map)) {
        const el = document.getElementById(k);
        if (el && v) el.value = v;
    }
    if (d.name) {
        const cache = JSON.parse(localStorage.getItem('taskforce_contacts_cache') || '{}');
        cache[d.name.toLowerCase()] = d;
        localStorage.setItem('taskforce_contacts_cache', JSON.stringify(cache));
    }
}

function checkContactCacheMatch(name) {
    if (!name) return null;
    const cache = JSON.parse(localStorage.getItem('taskforce_contacts_cache') || '{}');
    return cache[name.toLowerCase()] || null;
}

function checkContactSupport() {
    const supp = 'contacts' in navigator && 'ContactsManager' in window;
    document.querySelectorAll('.contact-picker-btn').forEach(b => b.style.display = supp ? 'inline-block' : 'none');
}

function updateTaskPriority(p) {
    if (!currentTask) return;
    currentTask.priority = p;
    // UI
    const n = document.getElementById('detailNormalBtn');
    const u = document.getElementById('detailUrgentBtn');
    if (n) n.classList.toggle('selected', p === 'normal');
    if (u) u.classList.toggle('selected', p === 'urgent');
    if (detailTaskStatus) {
        detailTaskStatus.textContent = p === 'urgent' ? 'Dringend' : 'Normal';
        detailTaskStatus.className = `status-badge ${p}`;
    }
    saveTasks(); renderTasks(); updateStats();
}
window.updateTaskPriority = updateTaskPriority;

function closeTaskDetail() { taskDetailModal.classList.add('hidden'); currentTask = null; }
function deleteCurrentTask() {
    if (!currentTask) return;
    if (confirm('Möchtest du diese Aufgabe wirklich löschen?')) {
        const deletedId = currentTask.id;
        tasks = tasks.filter(t => t.id !== deletedId);

        // Remove from Firestore
        if (db) {
            const path = currentUser.teamCode ? `teams/${currentUser.teamCode}/tasks` : `users/${currentUser.id}/tasks`;
            db.collection(path).doc(deletedId).delete().catch(e => console.error("Firebase delete error:", e));
        }

        saveTasks();
        renderTasks();
        updateStats();
        closeTaskDetail();
    }
}
function toggleTaskDone() {
    if (!currentTask) return;
    const t = tasks.find(x => x.id === currentTask.id);
    if (t) {
        t.done = !t.done;
        t.completedAt = t.done ? new Date().toISOString() : null;
        saveTasks(); renderTasks(); updateStats(); closeTaskDetail();
    }
}
function archiveCurrentTask() {
    if (!currentTask) return;
    const t = tasks.find(x => x.id === currentTask.id);
    if (t) {
        t.archived = true;
        saveTasks(); renderTasks(); updateStats(); closeTaskDetail();
        showToast('Archiviert', 'success');
    }
}

function startUrgentReminder() {
    // Check every 60s instead of 30s to be less "penetrating"
    setInterval(checkUrgentTasks, 60000);
    setInterval(checkUpcomingDeadlines, 60000);
    setInterval(checkBirthdays, 3600000);
    setInterval(archiveExpiredTasks, 300000);
    setTimeout(() => {
        checkUrgentTasks(); checkUpcomingDeadlines(); checkBirthdays(); archiveExpiredTasks();
    }, 2000);
}

function archiveExpiredTasks() {
    if (appSettings.autoArchive === false) return;
    const now = new Date();
    let changed = false;

    tasks.forEach(t => {
        if (t.deadline && !t.archived) {
            const deadlineDate = new Date(t.deadline);
            // Archive if the deadline is in the past
            if (deadlineDate < now) {
                t.archived = true;
                changed = true;
            }
        }
    });

    if (changed) {
        saveTasks();
        renderTasks();
        updateStats();
        console.log("Auto-Archive: Abgelaufene Termine archiviert.");
    }
}

function checkBirthdays() {
    const today = new Date().toLocaleDateString('de-DE').slice(0, 5);
    tasks.forEach(t => {
        if (t.details && t.details.birthday && !t.birthdayRemindedToday && t.details.birthday.includes(today)) {
            showUrgentOverlay(t, '🎂 GEBURTSTAG!');
            t.birthdayRemindedToday = true;
            saveTasks();
        }
    });
}

function checkUrgentTasks() {
    const now = new Date();
    // 1. Explicitly URGENT tasks that are not snoozed
    // 2. ANY task that has a snooze that just expired
    const active = tasks.filter(t => !t.done && !t.archived && (
        (t.priority === 'urgent' && (!t.snoozedUntil || new Date(t.snoozedUntil) <= now)) ||
        (t.snoozedUntil && new Date(t.snoozedUntil) <= now)
    ));

    if (active.length > 0 && urgentOverlay.classList.contains('hidden')) {
        showUrgentOverlay(active[0]);
    }
}

function checkUpcomingDeadlines() {
    const now = new Date();
    const leadTimeMs = (parseInt(appSettings.reminderLeadTime) || 60) * 60 * 1000;
    const deadlineThreshold = new Date(now.getTime() + leadTimeMs);

    tasks.forEach(t => {
        // Only trigger if not already reminded OR if snooze expired
        if (t.deadline && !t.done && !t.archived) {
            const d = new Date(t.deadline);
            // First time reminder
            if (!t.remindedThreshold && d > now && d <= deadlineThreshold) {
                t.remindedThreshold = true;
                saveTasks();
                showUrgentOverlay(t, `TERMIN IN ${appSettings.reminderLeadTime} MIN!`);
            }
        }
    });
}

function showUrgentOverlay(task, title = 'DRINGEND!') {
    if (appSettings.urgentPopupEnabled === false) return;
    urgentActiveTask = task;
    document.querySelector('#urgentOverlay h2').textContent = title;
    document.getElementById('urgentTaskText').textContent = task.keyword;

    // "Nur den aktuellen Termin anzeigen" - minimal details
    let html = '';
    if (task.deadline) html += `<div>⏳ ${formatDate(task.deadline)}</div>`;
    document.getElementById('urgentTaskDetails').innerHTML = html;

    // AI tips are optional/hidden to be less penetrant
    const ai = generateAiTips(task.keyword, task.details);
    const aiBox = document.getElementById('urgentAiBox');
    if (ai && appSettings.aiTipsEnabled) {
        aiBox.innerHTML = ai.html;
        aiBox.classList.add('hidden'); // Start hidden, can be toggled if needed or just hidden
    } else {
        aiBox.classList.add('hidden');
    }

    urgentOverlay.classList.remove('hidden');
    playAlertSound();
    showNotification(title, task.keyword);
}

function markUrgentDone() {
    if (urgentActiveTask) {
        urgentActiveTask.done = true;
        saveTasks();
        renderTasks();
        updateStats();
    }
    urgentOverlay.classList.add('hidden');
    urgentActiveTask = null;
}
function snoozeUrgent() {
    if (urgentActiveTask) {
        // Get selected snooze time or default to 20
        const select = document.getElementById('urgentSnoozeSelect');
        const minutes = select ? parseInt(select.value) : 20;

        let snoozeTimeStr;
        if (urgentActiveTask.deadline) {
            const deadlineDate = new Date(urgentActiveTask.deadline);
            // If the deadline is far away, we snooze until (deadline - minutes)
            // But if we are already close, we just add minutes to now
            // The logic "20 min vor Termin" implies we want to be reminded again at specific lead time.
            // But standard snooze usually means "remind me in X minutes from now".

            // Let's implement standard snooze (User wants "Später"): add X minutes to now check.
            const d = new Date();
            d.setMinutes(d.getMinutes() + minutes);
            snoozeTimeStr = d.toISOString();
        } else {
            const d = new Date(); d.setMinutes(d.getMinutes() + minutes);
            snoozeTimeStr = d.toISOString();
        }

        urgentActiveTask.snoozedUntil = snoozeTimeStr;
        saveTasks();
        showToast(`Erinnerung in ${minutes} Minuten`, 'info');
    }
    urgentOverlay.classList.add('hidden');
    urgentActiveTask = null;
}

function openSettings() {
    if (themeSelect) themeSelect.value = appSettings.theme || 'dark';
    if (soundSelect) soundSelect.value = appSettings.sound || 'beep';
    if (defaultSnoozeSelect) defaultSnoozeSelect.value = appSettings.defaultSnooze || '5';

    if (document.getElementById('wakeWordToggle')) document.getElementById('wakeWordToggle').checked = !!appSettings.wakeWordEnabled;
    if (document.getElementById('wakeWordNameInput')) document.getElementById('wakeWordNameInput').value = appSettings.wakeWordName || 'Taskforce';
    if (document.getElementById('voiceBeepToggle')) document.getElementById('voiceBeepToggle').checked = !!appSettings.voiceBeepEnabled;
    if (document.getElementById('aiTipsToggle')) document.getElementById('aiTipsToggle').checked = !!appSettings.aiTipsEnabled;
    if (document.getElementById('aiVoiceToggle')) document.getElementById('aiVoiceToggle').checked = !!appSettings.aiVoiceEnabled;

    const provSelect = document.getElementById('aiProviderSelect');
    if (provSelect) {
        provSelect.value = appSettings.aiProvider || 'grok';
        // Trigger change to show/hide key input
        if (typeof handleProviderChange === 'function') handleProviderChange();
        else provSelect.dispatchEvent(new Event('change'));
    }

    if (document.getElementById('openaiApiKeyInput')) {
        document.getElementById('openaiApiKeyInput').value = appSettings.openaiApiKey || '';
    }
    if (document.getElementById('driveModeToggle')) document.getElementById('driveModeToggle').checked = !!appSettings.driveModeEnabled;
    if (document.getElementById('urgentPopupToggle')) document.getElementById('urgentPopupToggle').checked = !!appSettings.urgentPopupEnabled;
    if (document.getElementById('autoArchiveToggle')) document.getElementById('autoArchiveToggle').checked = !!appSettings.autoArchive;
    if (document.getElementById('locationToggle')) document.getElementById('locationToggle').checked = !!appSettings.locationTracking;
    if (document.getElementById('homeAddressInput')) document.getElementById('homeAddressInput').value = appSettings.homeAddress || '';
    if (document.getElementById('reminderLeadTimeSelect')) document.getElementById('reminderLeadTimeSelect').value = appSettings.reminderLeadTime || 60;

    // Header Icons
    if (document.getElementById('headerIconCalendar')) document.getElementById('headerIconCalendar').checked = appSettings.headerIconCalendar !== false;
    if (document.getElementById('headerIconExpense')) document.getElementById('headerIconExpense').checked = appSettings.headerIconExpense !== false;
    if (document.getElementById('headerIconScan')) document.getElementById('headerIconScan').checked = appSettings.headerIconScan !== false;
    if (document.getElementById('headerIconAlarm')) document.getElementById('headerIconAlarm').checked = appSettings.headerIconAlarm !== false;
    if (document.getElementById('headerIconDrive')) document.getElementById('headerIconDrive').checked = appSettings.headerIconDrive !== false;
    if (document.getElementById('headerIconNight')) document.getElementById('headerIconNight').checked = appSettings.headerIconNight !== false;

    // Populate User Profile
    if (currentUser) {
        if (document.getElementById('settingsUserName')) document.getElementById('settingsUserName').value = currentUser.name || '';

        // Populate Team & PIN
        const teamListEl = document.getElementById('settingsTeamList');
        if (teamListEl) {
            if (currentUser.teamCode) {
                teamListEl.innerHTML = `<div style="padding: 5px; background: rgba(0,255,0,0.1); border-radius: 4px;">🎯 Team: <strong>${currentUser.teamCode.toUpperCase()}</strong></div>`;
            } else {
                teamListEl.innerHTML = '<div style="opacity: 0.6">Keine aktiven Teams</div>';
            }
        }

        const currentPinEl = document.getElementById('visibleCurrentPin');
        if (currentPinEl) {
            currentPinEl.value = currentUser.pin || '----';
        }
        if (document.getElementById('settingsUserPin')) document.getElementById('settingsUserPin').value = currentUser.pin || '';

        // Add Test Notification Button if not exists
        const profileBox = document.querySelector('.form-group[style*="border-top"]');
        if (profileBox && !document.getElementById('testNotificationBtn')) {
            const btn = document.createElement('button');
            btn.id = 'testNotificationBtn';
            btn.className = 'btn-small-outline full-width';
            btn.style.marginTop = '10px';
            btn.textContent = '🔔 Test-Popup auslösen';
            btn.onclick = () => showTeamNotification({
                keyword: 'Test Termin',
                creatorName: 'System Test',
                deadline: new Date().toISOString(),
                details: { location: 'Test Ort' }
            });
            profileBox.appendChild(btn);
        }

        // Show active team members
        if (currentUser.teamCode) {
            renderActiveTeamMembers();
        }
    }

    settingsModal.classList.remove('hidden');
}

// Track user presence
function updatePresence() {
    if (!currentUser || !db) return;
    db.collection('users').doc(currentUser.id).update({
        lastSeen: new Date().toISOString(),
        teamCode: currentUser.teamCode || null
    }).catch(e => console.error("Presence Error:", e));
}

// Render active team members in settings
function renderActiveTeamMembers() {
    const listEl = document.getElementById('activeTeamMembers');
    if (!listEl || !currentUser || !currentUser.teamCode || !db) return;

    db.collection('users')
        .where('teamCode', '==', currentUser.teamCode)
        .get()
        .then(snapshot => {
            listEl.innerHTML = '';
            const now = new Date();
            let count = 0;

            snapshot.forEach(doc => {
                const user = doc.data();
                if (!user.name) return;

                const lastSeen = user.lastSeen ? new Date(user.lastSeen) : null;
                const isOnline = lastSeen && (now - lastSeen < 120000); // 2 minutes window

                const item = document.createElement('div');
                item.style.display = 'flex';
                item.style.alignItems = 'center';
                item.style.justifyContent = 'space-between';
                item.style.padding = '4px 0';

                const statusDot = isOnline ?
                    '<span style="width: 8px; height: 8px; background: #10b981; border-radius: 50%; display: inline-block; margin-right: 8px; box-shadow: 0 0 5px #10b981;"></span>' :
                    '<span style="width: 8px; height: 8px; background: #666; border-radius: 50%; display: inline-block; margin-right: 8px;"></span>';

                const statusText = isOnline ?
                    '<span style="color: #10b981; font-weight: 700;">Online</span>' :
                    `<span style="color: var(--text-muted); font-size: 0.8rem;">Zuletzt: ${lastSeen ? lastSeen.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Lange her'}</span>`;

                item.innerHTML = `
                    <div style="display: flex; align-items: center;">
                        ${statusDot}
                        <strong>${user.name === currentUser.name ? user.name + ' (Du)' : user.name}</strong>
                    </div>
                    ${statusText}
                `;
                listEl.appendChild(item);
                count++;
            });

            if (count === 0) {
                listEl.innerHTML = '<div style="color: var(--text-muted); font-style: italic;">Keine weiteren Mitglieder gefunden.</div>';
            }
        })
        .catch(err => {
            console.error("Team List Error:", err);
            listEl.innerHTML = '<div style="color: var(--urgent);">Fehler beim Laden.</div>';
        });
}

function saveAppSettings() {
    appSettings.theme = themeSelect.value;
    appSettings.sound = soundSelect.value;
    appSettings.defaultSnooze = defaultSnoozeSelect.value;

    const wakeWordPreviouslyEnabled = appSettings.wakeWordEnabled;
    appSettings.wakeWordEnabled = document.getElementById('wakeWordToggle') ? document.getElementById('wakeWordToggle').checked : true;
    appSettings.wakeWordName = document.getElementById('wakeWordNameInput') ? document.getElementById('wakeWordNameInput').value : 'Taskforce';
    appSettings.voiceBeepEnabled = document.getElementById('voiceBeepToggle') ? document.getElementById('voiceBeepToggle').checked : false;

    // Toggle Wake Word Listener immediately
    if (appSettings.wakeWordEnabled && !wakeWordPreviouslyEnabled) {
        initWakeWordRecognition();
        startWakeWord();
    } else if (!appSettings.wakeWordEnabled && wakeWordPreviouslyEnabled) {
        stopWakeWord();
    }

    appSettings.aiTipsEnabled = document.getElementById('aiTipsToggle') ? document.getElementById('aiTipsToggle').checked : true;
    appSettings.aiVoiceEnabled = document.getElementById('aiVoiceToggle') ? document.getElementById('aiVoiceToggle').checked : true;
    appSettings.aiProvider = document.getElementById('aiProviderSelect') ? document.getElementById('aiProviderSelect').value : 'grok';
    appSettings.driveModeEnabled = document.getElementById('driveModeToggle') ? document.getElementById('driveModeToggle').checked : true;
    appSettings.urgentPopupEnabled = document.getElementById('urgentPopupToggle') ? document.getElementById('urgentPopupToggle').checked : true;
    appSettings.autoArchive = document.getElementById('autoArchiveToggle') ? document.getElementById('autoArchiveToggle').checked : true;
    appSettings.locationTracking = document.getElementById('locationToggle') ? document.getElementById('locationToggle').checked : true;
    appSettings.homeAddress = document.getElementById('homeAddressInput') ? document.getElementById('homeAddressInput').value : '';
    appSettings.reminderLeadTime = document.getElementById('reminderLeadTimeSelect') ? document.getElementById('reminderLeadTimeSelect').value : 60;

    // Header Icons
    appSettings.headerIconCalendar = !!document.getElementById('headerIconCalendar')?.checked;
    appSettings.headerIconExpense = !!document.getElementById('headerIconExpense')?.checked;
    appSettings.headerIconScan = !!document.getElementById('headerIconScan')?.checked;
    appSettings.headerIconAlarm = !!document.getElementById('headerIconAlarm')?.checked;
    appSettings.headerIconDrive = !!document.getElementById('headerIconDrive')?.checked;
    appSettings.headerIconNight = !!document.getElementById('headerIconNight')?.checked;

    // SAVE OPENAI KEY
    const keyInput = document.getElementById('openaiApiKeyInput');
    if (keyInput) {
        appSettings.openaiApiKey = keyInput.value.trim();
    }

    // SAVE USER AVATAR FROM SETTINGS
    const selectedAvatarEl = document.querySelector('#settingsAvatarPicker .avatar-option.selected');
    if (selectedAvatarEl && currentUser) {
        let newAvatar = selectedAvatarEl.dataset.avatar;
        // If it's a file upload (base64)
        if (selectedAvatarEl.id === 'settingsCustomAvatarBtn' && selectedAvatarEl.dataset.avatar) {
            newAvatar = selectedAvatarEl.dataset.avatar;
        } else if (selectedAvatarEl.id === 'settingsCustomAvatarBtn' && !selectedAvatarEl.dataset.avatar) {
            // User selected the plus button but didn't upload anything, keep old or ignore
            newAvatar = currentUser.avatar;
        }

        currentUser.avatar = newAvatar;
        localStorage.setItem('taskforce_user', JSON.stringify(currentUser));

        // Update Header Immediately
        const avatarEl = document.getElementById('userAvatar');
        if (avatarEl) {
            if (newAvatar.length > 10) { // Base64 check
                avatarEl.innerHTML = '';
                avatarEl.style.backgroundImage = `url(${newAvatar})`;
                avatarEl.style.backgroundSize = 'cover';
            } else {
                avatarEl.innerHTML = newAvatar;
                avatarEl.style.backgroundImage = 'none';
            }
        }
    }

    // SAVE USER PROFILE CHANGES (Name/PIN)
    if (currentUser) {
        const nameInput = document.getElementById('settingsUserName');
        const pinInput = document.getElementById('settingsUserPin');
        let profileChanged = false;

        if (nameInput && nameInput.value.trim() !== '' && nameInput.value.trim() !== currentUser.name) {
            currentUser.name = nameInput.value.trim();
            profileChanged = true;
        }

        if (pinInput && pinInput.value.trim().length === 6 && /^\d+$/.test(pinInput.value.trim())) {
            currentUser.pin = pinInput.value.trim();
            profileChanged = true;
        } else if (pinInput && pinInput.value.trim() !== '') {
            showToast('PIN ignoriert: Muss 6 Zahlen enthalten.', 'error');
        }

        if (profileChanged) {
            localStorage.setItem('taskforce_user', JSON.stringify(currentUser));

            // Update registry
            const allUsers = JSON.parse(localStorage.getItem('taskforce_users_registry')) || {};
            allUsers[currentUser.id] = currentUser;
            localStorage.setItem('taskforce_users_registry', JSON.stringify(allUsers));

            // Update Firebase
            if (typeof db !== 'undefined' && db) {
                db.collection('users').doc(currentUser.id).update({
                    name: currentUser.name,
                    pin: currentUser.pin
                }).catch(function (err) { console.error("Cloud update failed", err); });
            }

            // Update UI display
            if (document.getElementById('displayUserName')) document.getElementById('displayUserName').textContent = currentUser.name;
            showToast('Profil erfolgreich aktualisiert!', 'success');

            // Force sync to ensure cloud has new profile data
            if (typeof forceSync === 'function') forceSync();
        }
    }

    localStorage.setItem('taskforce_settings', JSON.stringify(appSettings));
    applyAppSettings();
    settingsModal.classList.add('hidden');
    showToast('Einstellungen gespeichert!', 'success');
}

// FORCE SYNC (Push Data to Cloud)
function forceSync() {
    if (!currentUser || !db) return;
    showToast('Synchronisiere...', 'info');

    // 1. Update User Profile in Cloud
    db.collection('users').doc(currentUser.id).set(currentUser, { merge: true })
        .then(() => console.log("User profile synced"))
        .catch(e => console.error("User sync failed", e));

    // 2. Push Tasks
    const path = currentUser.teamCode ? `teams/${currentUser.teamCode}/tasks` : `users/${currentUser.id}/tasks`;
    let batch = db.batch();

    // Simple batch upsert logic (limit 500)
    let count = 0;
    tasks.forEach(task => {
        if (count < 450) { // Safety margin
            const ref = db.collection(path).doc(task.id);
            batch.set(ref, task);
            count++;
        }
    });

    batch.commit().then(() => {
        showToast('☁️ Daten erfolgreich synchronisiert!', 'success');
        updateSyncStatusText();
    }).catch(err => {
        console.error("Sync failed:", err);
        showToast('Fehler bei der Synchronisierung. Prüfe Internet.', 'error');
    });
}

// TEST CONNECTION
function testConnection() {
    if (!db) {
        showToast('Keine Verbindung zum Datenbank-Dienst.', 'error');
        updateConnectionStatus('error', 'Kein Dienst');
        return;
    }

    if (window.location.protocol === 'file:') {
        showToast('⚠️ Sync blockiert bei lokaler Datei. Bitte auf Webserver (z.B. GitHub) hosten!', 'error');
        updateConnectionStatus('error', 'Blockiert (file://)');
        return;
    }

    updateConnectionStatus('loading', 'Prüfe Verbindung...');
    const testRef = db.collection('_connection_tests').doc('ping_' + Date.now());

    testRef.set({ timestamp: firebase.firestore.FieldValue.serverTimestamp() })
        .then(() => {
            updateConnectionStatus('success', 'Verbindung hergestellt! ✅');
            showToast('Verbindung erfolgreich!', 'success');
            testRef.delete(); // Cleanup
        })
        .catch((err) => {
            console.error("Connection test failed:", err);
            let msg = 'Verbindung fehlgeschlagen.';
            if (err.code === 'permission-denied') msg = 'Zugriff verweigert (Rechte prüfen).';
            else if (err.code === 'unavailable') msg = 'Server nicht erreichbar.';

            updateConnectionStatus('error', 'Fehler: ' + err.code);
            showToast(msg + ' ' + (err.message || ''), 'error');
        });
}

function updateConnectionStatus(type, msg) {
    const el = document.getElementById('connectionStatusText');
    const dot = document.getElementById('connectionStatusDot');
    if (el) el.textContent = msg;
    if (dot) {
        dot.className = 'status-dot'; // reset
        if (type === 'success') dot.classList.add('online');
        else if (type === 'loading') dot.classList.add('connecting');
        else dot.classList.add('offline');
    }
}

function applyAppSettings() {
    // Reset classes
    document.body.classList.remove('light-mode', 'business-mode');

    // Apply selected theme
    if (appSettings.theme === 'light') {
        document.body.classList.add('light-mode');
    } else if (appSettings.theme === 'business') {
        document.body.classList.add('business-mode');
    }
    // 'dark' is default (no class)

    // Apply header icon visibility
    const buttonsToToggle = [
        { id: 'calendarBtn', enabled: appSettings.headerIconCalendar },
        { id: 'expenseBtn', enabled: appSettings.headerIconExpense },
        { id: 'addExpenseBtnHeader', enabled: appSettings.headerIconScan },
        { id: 'alarmBtn', enabled: appSettings.headerIconAlarm },
        { id: 'manualDriveBtn', enabled: appSettings.headerIconDrive },
        { id: 'sideNightstandBtnHeader', enabled: appSettings.headerIconNight }
    ];

    buttonsToToggle.forEach(btn => {
        const el = document.getElementById(btn.id);
        if (el) {
            el.style.display = btn.enabled !== false ? '' : 'none';
        }
    });
}

function playAlertSound(test = false) {
    // Global mute for annoying beeps if desired, or strictly controlled
    if (appSettings.sound === 'none' && !test) return;

    // If the user specificially dislikes the "listening" beep which might be this one:
    if (!appSettings.voiceBeepEnabled && !test) return;

    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Softer beep
        gainNode.gain.value = 0.1;

        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    } catch (e) { console.log("Audio play error", e); }
}

function showNotification(t, b) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(t, {
            body: b,
            icon: '/icon-192.png'
        });
    }
}

// Show team notification popup + sound
function showTeamNotification(task) {
    if (!task) return;

    console.log("New Team Notification for:", task.keyword);

    // 1. Play Short Beep
    playShortBeep();

    const senderName = task.creatorName || 'Ein Teammitglied';

    // 2. System Notification
    if (Notification.permission === 'granted') {
        const notificationOptions = {
            body: `${senderName} hat einen neuen Termin eingetragen: ${task.keyword}`,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            vibrate: [100, 50, 100],
            silent: false,
            requireInteraction: true
        };

        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification("👥 NEUER TERMIN", notificationOptions);
            });
        } else {
            new Notification("👥 NEUER TERMIN", notificationOptions);
        }
    }

    // 3. UI Popup (foreground)
    if (teamNotificationOverlay && teamNotificationText) {
        console.log("✨ Zeige UI-Popup für:", task.keyword);
        teamNotificationText.innerHTML = `<div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.5rem;">Von: ${senderName}</div>` +
            `<div style="font-weight: 800; font-size: 1.2em;">${task.keyword}</div>`;

        let detailsHtml = '';
        if (task.deadline) {
            const date = new Date(task.deadline);
            detailsHtml += `<div style="margin-top: 10px;">📅 ${date.toLocaleDateString()} um ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>`;
        }
        if (task.details && task.details.location) {
            detailsHtml += `<div>📍 ${task.details.location}</div>`;
        }

        teamNotificationDetails.innerHTML = detailsHtml || 'Keine weiteren Details.';

        // Starker visueller Reset
        teamNotificationOverlay.classList.remove('hidden');
        teamNotificationOverlay.style.setProperty('display', 'flex', 'important');
        teamNotificationOverlay.style.zIndex = '20000';
    } else {
        console.error("❌ Team-Notification Overlay nicht im DOM gefunden!", { overlay: !!teamNotificationOverlay, text: !!teamNotificationText });
    }
}

// Special short beep function for team notifications
function playShortBeep() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();

        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.02);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);

        osc.start();
        osc.stop(ctx.currentTime + 0.2);
    } catch (e) {
        console.warn("Audio Context error - likely blocked by interaction policy", e);
        // Fallback to audio element if available
        const alertSound = document.getElementById('alertSound');
        if (alertSound) alertSound.play().catch(() => { });
    }
}

function formatDateShort(ds) {
    try { return new Date(ds).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }); } catch (e) { return ''; }
}
function formatTimeShort(ds) {
    try { return new Date(ds).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' Uhr'; } catch (e) { return ''; }
}
function formatDate(ds) { return formatTimeShort(ds); } // Legacy fallback
function formatDateFull(ds) { return formatDateShort(ds) + ' ' + formatTimeShort(ds); }
function escapeHtml(t) {
    if (typeof t !== 'string') return t;
    return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

window.selectPriority = updateTaskPriority;
window.openTaskDetail = openTaskDetail;

// Wake Word
function initWakeWordRecognition() {
    if (!appSettings.wakeWordEnabled) return;
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

        // Cleanup old instance if it exists
        if (wakeWordRecognition) {
            try { wakeWordRecognition.stop(); } catch (e) { }
        }

        wakeWordRecognition = new SR();
        // Mobile browsers often handle continuous: false better (looping manually)
        wakeWordRecognition.continuous = false;
        wakeWordRecognition.interimResults = true;
        wakeWordRecognition.lang = 'de-DE';

        wakeWordRecognition.onresult = (e) => {
            let t = '';
            for (let i = e.resultIndex; i < e.results.length; ++i) {
                t += e.results[i][0].transcript;
            }
            t = t.toLowerCase().trim();

            // Phonetic variants for Grok
            const customName = (appSettings.wakeWordName || 'taskforce').toLowerCase().trim();
            const grokVariants = ['grok', 'grog', 'krok', 'croc', 'grock', 'crock', 'grox', 'brock', 'grot', 'glock', 'drug', 'rock'];

            // Dynamic check for custom name
            // We check if the transcript includes the custom name directly
            const matchedCustom = t.includes(customName);

            // Also keep standard variants just in case default is used or similar
            const taskVariants = ['taskforce', 'task force', 'task-force', 'das force', 'tanzforce', 'testforce', 'passforce', 'maskforce'];
            const matchedDefault = taskVariants.some(v => t.includes(v));

            const hasHallo = t.includes('hallo') || t.includes('hey') || t.includes('hi') || t.includes('ok') || t.includes('hello');

            // Check for matches
            const matchedGrok = grokVariants.some(v => t.includes(v));

            if (matchedGrok && (hasHallo || t.length < 10)) {
                console.log('Wake word Grok matched!', t);
                triggerVoiceInput('grok');
            } else if ((matchedCustom || matchedDefault) && (hasHallo || t.length < 20)) {
                // matchedCustom covers whatever the user typed in settings
                console.log(`Wake word ${customName} matched!`, t);
                triggerVoiceInput('task');
            }
        };

        wakeWordRecognition.onend = () => {
            if (isWakeWordListening) {
                // Short cooldown to prevent CPU spikes
                setTimeout(() => {
                    if (isWakeWordListening) {
                        try {
                            wakeWordRecognition.start();
                        } catch (e) {
                            console.log('WakeWord restart suppressed (likely already running)');
                        }
                    }
                }, 150);
            }
        };

        wakeWordRecognition.onerror = (e) => {
            if (e.error === 'network') {
                console.warn('WakeWord Network Error - retry in 2s');
                setTimeout(() => { if (isWakeWordListening) startWakeWord(); }, 2000);
            } else if (e.error === 'not-allowed') {
                console.error('WakeWord Permission Error');
                isWakeWordListening = false;
            } else {
                console.warn('Wake word error:', e.error);
            }
        };

        // Aggressive Watchdog to ensure continuity
        if (window.wakeWatchdog) clearInterval(window.wakeWatchdog);
        window.wakeWatchdog = setInterval(() => {
            if (isWakeWordListening && !window.isAutoStarting) {
                try {
                    wakeWordRecognition.start();
                } catch (e) {
                    // This is fine, usually means it's already active
                }
            }
        }, 5000);

        startWakeWord();
    }
}
function startWakeWord() { if (wakeWordRecognition) { isWakeWordListening = true; try { wakeWordRecognition.start(); } catch (e) { } } }
function stopWakeWord() { if (wakeWordRecognition) { isWakeWordListening = false; wakeWordRecognition.stop(); } }

async function ensureMicrophonePermission() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // Stop immediately
        return true;
    } catch (err) {
        console.warn('Microphone permission check failed:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            showToast('🔒 Mikrofon blockiert! Bitte klicke auf das Schloss-Symbol im Browser oben links und erlaube den Zugriff.', 'error');
        } else {
            showToast('Mikrofon Fehler: ' + err.message, 'error');
        }
        return false;
    }
}

async function startMainVoice() {
    if (!mainRecognition) return;

    // Attempt to ensure permission first if possible
    const hasPermission = await ensureMicrophonePermission();
    if (!hasPermission) return;

    try {
        mainRecognition.start();
    } catch (e) {
        console.warn('Recognition already active or busy:', e.message);
        if (e.name === 'InvalidStateError') return;

        mainRecognition.stop();
        setTimeout(() => {
            try { mainRecognition.start(); } catch (err) { console.error('Restart failed', err); }
        }, 400);
    }
}
function triggerVoiceInput(mode = 'task') {
    stopWakeWord();

    // 1. Visual Feedback
    if (voiceStatus) {
        voiceStatus.classList.add('active');
        voiceStatus.classList.remove('mode-grok', 'mode-task');
        voiceStatus.classList.add(`mode-${mode}`);
        const label = voiceStatus.querySelector('.voice-label');
        const aiName = getAiName();
        if (label) label.textContent = mode === 'grok' ? `${aiName} hört...` : 'TaskForce hört...';
    }
    if (voiceBtn) voiceBtn.classList.add('active');
    if (globalRecordingDot) globalRecordingDot.classList.add('visible');

    window.currentVoiceMode = mode; // Store mode globally
    window.isAutoStarting = true;
    window.voiceAutoSave = true;

    // Show Grok Modal immediately if in Grok mode
    if (mode === 'grok') {
        if (grokModal) {
            const aiName = getAiName();
            grokModal.querySelector('h2').textContent = `🤖 ${aiName} AI`;
            grokModal.classList.remove('hidden');
            if (grokInput) grokInput.innerText = "Frage wird erwartet...";
            if (grokResponse) grokResponse.innerText = `${aiName} hört zu...`;
        }
    }

    // Increased delay to 800ms for mobile to ensure mic release
    setTimeout(() => {
        if (appSettings.aiVoiceEnabled && appSettings.voiceBeepEnabled) {
            const aiName = getAiName();
            const greeting = mode === 'grok' ? `Hallo! Ich bin ${aiName}.` : 'Hallo! Ich höre zu.';
            speakText(greeting);
        }

        const aiName = getAiName();
        const toastMsg = mode === 'grok' ? `${aiName} hört zu...` : 'TaskForce hört zu...';
        showToast(toastMsg, 'info');

        // Shorter additional delay after text to ensure mic is ready
        setTimeout(() => {
            startMainVoice();
            setTimeout(() => { window.isAutoStarting = false; }, 1200);
        }, 300);

    }, 800);
}

// Drive Mode Dashboard (NEW)
function startLocationTracking() {
    if (!('geolocation' in navigator) || !appSettings.locationTracking) return;
    navigator.geolocation.watchPosition(pos => {
        userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const s = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0;
        // removed speedValue update as requested by user
        if (s > 15 && appSettings.driveModeEnabled) checkAndOpenDriveMode();
    }, null, { enableHighAccuracy: true });
}

let lastDriveCheck = 0;
function checkAndOpenDriveMode() {
    if (Date.now() - lastDriveCheck < 300000) return;
    const up = getUpcomingLocationTasks();
    if (up.length > 0) { showDriveMode(up[0]); lastDriveCheck = Date.now(); }
}

function getUpcomingLocationTasks() {
    return tasks.filter(t => !t.done && !t.archived && t.details && t.details.location)
        .sort((a, b) => (a.deadline ? new Date(a.deadline) : 0) - (b.deadline ? new Date(b.deadline) : 0));
}

function showDriveMode(task) {
    if (!driveModeOverlay) return;

    // Set the selected task as current context for coaching
    currentTask = task;

    document.getElementById('driveTaskTitle').textContent = task.keyword;
    document.getElementById('driveTaskLocation').textContent = task.details.location || '';
    const timeEl = document.getElementById('driveTaskTime');
    if (task.deadline) timeEl.textContent = new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
    else timeEl.textContent = '--:--';

    const grok = document.getElementById('driveGrokSummary');

    // Determine the day we are looking at (defaults to today or the task's day)
    const targetDateStr = task.deadline ? new Date(task.deadline).toDateString() : new Date().toDateString();
    const relevantTasks = tasks.filter(t => t.deadline && new Date(t.deadline).toDateString() === targetDateStr && !t.archived)
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    if (grok) grok.innerHTML = generateDailyBriefing(relevantTasks);

    // Timeline with Grok comments
    const tl = document.getElementById('driveTimelineList');
    if (tl) {
        tl.innerHTML = relevantTasks.map(t => {
            const grokComment = generateGrokComment(t);
            return `
            <div class="timeline-item ${t.id === task.id ? 'active' : ''}" 
                 onclick="event.stopPropagation(); showDriveMode(tasks.find(tk => tk.id === '${t.id}'))" 
                 style="cursor: pointer;">
                <div class="timeline-time">${t.deadline ? new Date(t.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                <div class="timeline-content">
                    <div class="timeline-title">${escapeHtml(t.keyword)}</div>
                    <div class="timeline-loc">${escapeHtml(t.details.location || '')}</div>
                    ${grokComment ? `<div class="timeline-grok">🤖 ${grokComment}</div>` : ''}
                </div>
            </div>`;
        }).join('');
    }

    // Route Planning & Small Map
    const routeInfo = document.getElementById('driveRouteInfo');
    if (routeInfo) {
        routeInfo.innerHTML = generateRouteInfo(relevantTasks, task);
    }

    // NEW: Punctuality Check & Essentials Checklist
    const punEl = document.getElementById('driveGrokSummary');
    if (punEl) {
        punEl.innerHTML = generatePunctualityCheck(task) + generateEssentialsChecklist(task);
    }

    const startBtn = document.getElementById('startNavBtn');
    if (startBtn && task.details.location) {
        let url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(task.details.location)}&travelmode=driving`;
        if (userPos) url += `&origin=${userPos.lat},${userPos.lng}`;
        startBtn.onclick = () => window.open(url, '_blank');
        startBtn.disabled = false;
    }
    const dayBtn = document.getElementById('dayRouteBtn');
    if (dayBtn) dayBtn.onclick = () => openDayRoute(relevantTasks);

    // Exit button
    const exitBtn = document.getElementById('exitDriveBtn');
    if (exitBtn) {
        exitBtn.onclick = () => {
            driveModeOverlay.classList.add('hidden');
            if (window.driveClockInterval) clearInterval(window.driveClockInterval);
        };
    }

    // Initialize Clock & Weather & Stats
    updateGlobalClock();
    fetchDriveWeather();
    calculateDriveStats(relevantTasks);

    // Update clock and punctuality every second
    if (window.driveClockInterval) clearInterval(window.driveClockInterval);
    window.driveClockInterval = setInterval(() => {
        updateGlobalClock();
        // Update punctuality without re-rendering everything
        const punEl = document.getElementById('driveGrokSummary');
        if (punEl) {
            // Re-render essentially just the alerts
            punEl.innerHTML = generatePunctualityCheck(task) + generateEssentialsChecklist(task);
        }
    }, 1000);

    driveModeOverlay.classList.remove('hidden');
}

function calculateDriveStats(dailyTasks) {
    // Heuristic: 1 Task with Location = ~15km driving (average city/commute mix)
    // Hours: Time Span from first to last task + 1h buffer
    const d = dailyTasks || [];
    const withLoc = d.filter(t => t.details && t.details.location);
    const totalKm = withLoc.length * 15;

    let totalHours = 0;
    if (d.length > 0) {
        const sorted = [...d].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
        const first = new Date(sorted[0].deadline);
        const last = new Date(sorted[sorted.length - 1].deadline);
        // Diff in hours
        const diff = (last - first) / (1000 * 60 * 60);
        totalHours = Math.max(1, Math.ceil(diff + 1)); // At least 1h, or span + 1h execution
    }

    const kmEl = document.getElementById('dayKmValue');
    const hEl = document.getElementById('dayHoursValue');
    if (kmEl) kmEl.textContent = totalKm;
    if (hEl) hEl.textContent = totalHours;
}

function getDailyTasks() {
    const today = new Date().toDateString();
    return tasks.filter(t => t.deadline && new Date(t.deadline).toDateString() === today && !t.archived)
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
}
function generateDailyBriefing(relevantTasks) {
    const d = relevantTasks || getDailyTasks();
    if (d.length === 0) return "Keine Termine heute.";

    const withLocation = d.filter(t => t.details && t.details.location);
    const done = d.filter(t => t.done).length;
    const percent = Math.round((done / d.length) * 100);

    return `
        <div>Status: <strong>${done}/${d.length} erledigt</strong> (${percent}%)</div>
        <div style="font-size: 0.9rem; color: var(--text-muted); margin-top: 4px;">
            Heute: <strong>${d.length} Termine</strong> (${withLocation.length} mit Navigation).
        </div>
    `;
}

function openDayRoute(relevantTasks) {
    const d = (relevantTasks || getDailyTasks()).filter(t => t.details.location);
    if (d.length === 0) {
        showToast('Keine Termine mit Ort für heute gefunden.', 'info');
        return;
    }

    const destination = encodeURIComponent(d[d.length - 1].details.location);
    let url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;

    if (d.length > 1) {
        // Waypoints are intermediate stops
        const waypoints = d.slice(0, d.length - 1).map(t => encodeURIComponent(t.details.location)).join('|');
        url += `&waypoints=${waypoints}`;
    }

    // Origin: GPS -> Home -> Default
    if (userPos) {
        url += `&origin=${userPos.lat},${userPos.lng}`;
    } else if (appSettings.homeAddress) {
        url += `&origin=${encodeURIComponent(appSettings.homeAddress)}`;
    }

    window.open(url, '_blank');
}

// Generate Grok AI Comment for each task
function generateGrokComment(task) {
    const comments = [];
    const keyword = task.keyword.toLowerCase();
    const details = task.details || {};

    // Time-based comments
    if (task.deadline) {
        const taskTime = new Date(task.deadline);
        const hour = taskTime.getHours();
        if (hour < 9) comments.push("Früher Termin - Kaffee nicht vergessen!");
        else if (hour >= 12 && hour < 14) comments.push("Mittagszeit - vielleicht vorher essen?");
        else if (hour >= 18) comments.push("Abendtermin - Verkehr beachten!");
    }

    // Location-based comments
    if (details.location) {
        if (details.location.toLowerCase().includes('berlin')) comments.push("Parkplatz vorher suchen!");
        if (details.location.toLowerCase().includes('autobahn')) comments.push("Stau-Info checken!");
    }

    // Task-type comments
    if (keyword.includes('arzt')) comments.push("Versichertenkarte dabei?");
    if (keyword.includes('meeting') || keyword.includes('besprechung')) comments.push("Unterlagen vorbereitet?");
    if (keyword.includes('einkauf')) comments.push("Einkaufsliste checken!");
    if (keyword.includes('sport')) comments.push("Sportkleidung einpacken!");
    if (details.person) comments.push(`Termin mit ${details.person}`);

    return comments.length > 0 ? comments[0] : null;
}

// Generate Route Planning Info
function generateRouteInfo(dailyTasks, currentFocusTask) {
    const tasksWithLocation = dailyTasks.filter(t => t.details && t.details.location);
    const activeTask = currentFocusTask || (tasksWithLocation.length > 0 ? tasksWithLocation[0] : dailyTasks[0]);

    if (dailyTasks.length === 0) {
        return '<div class="route-empty">Keine Termine heute.</div>';
    }

    // MAP INTEGRATION (Only if active task has location)
    let mapIframe = '';
    if (activeTask && activeTask.details && activeTask.details.location) {
        mapIframe = `
            <div class="small-map-container" style="margin-bottom: 1rem; border-radius: 12px; overflow: hidden; height: 180px; border: 1px solid rgba(255,255,255,0.1);">
                <iframe 
                    width="100%" 
                    height="100%" 
                    frameborder="0" 
                    style="border:0" 
                    src="https://maps.google.com/maps?q=${encodeURIComponent(activeTask.details.location)}&t=&z=14&ie=UTF8&iwloc=&output=embed" 
                    allowfullscreen>
                </iframe>
            </div>
        `;
    } else {
        mapIframe = `
            <div class="small-map-container" style="margin-bottom: 1rem; border-radius: 12px; height: 100px; border: 1px dashed rgba(255,255,255,0.1); display:flex; align-items:center; justify-content:center; color:var(--text-muted);">
                <span>Kein Ort für diesen Termin hinterlegt.</span>
            </div>
        `;
    }

    // Route List - SHOW ALL TASKS, but mark those without location
    let html = mapIframe + '<div class="route-multi">';
    html += '<div class="route-header">🗺️ <strong>Tagesplan & Route:</strong></div>';

    dailyTasks.forEach((t, index) => {
        const time = t.deadline ? new Date(t.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
        const isLast = index === dailyTasks.length - 1;
        const hasLoc = t.details && t.details.location;

        html += `
            <div class="route-step ${t.id === activeTask.id ? 'focus' : ''}" style="${!hasLoc ? 'opacity: 0.6;' : ''}">
                <div class="route-step-number" style="${!hasLoc ? 'background: #555;' : ''}">${index + 1}</div>
                <div class="route-step-content">
                    <div class="route-step-time">${time} Uhr</div>
                    <div class="route-step-location">${hasLoc ? escapeHtml(t.details.location) : '<i>Kein Ort hinterlegt</i>'}</div>
                    <div class="route-step-task">${escapeHtml(t.keyword)}</div>
                </div>
            </div>
            ${!isLast ? '<div class="route-arrow">↓</div>' : ''}
        `;
    });

    // Summary
    let timeSummary = `🤖 <strong>Grok Check:</strong> ${dailyTasks.length} Termine, davon ${tasksWithLocation.length} mit Fahrt.`;

    // Add travel time shim (mocked based heavily on stops)
    if (tasksWithLocation.length > 0) {
        const travelTimeEst = tasksWithLocation.length * 15;
        timeSummary += `<br><small>Geschätzte reine Fahrzeit: ~${travelTimeEst} Min.</small>`;
    }

    html += `<div class="route-grok-summary">${timeSummary}</div>`;
    html += '</div>';

    return html;
}

// Sidebar Helpers
function updateSyncStatusText() {
    const el = document.getElementById('syncStatusText');
    if (el) {
        const now = new Date();
        el.textContent = `Zuletzt synchronisiert: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
}

function openLatestDashboard() {
    // 1. Prioritize Today's tasks (undone) even if no location
    const daily = getDailyTasks().filter(t => !t.done);
    if (daily.length > 0) {
        showDriveMode(daily[0]);
        return;
    }

    // 2. Fallback: Upcoming task with location (e.g. tomorrow)
    const upcoming = getUpcomingLocationTasks();
    if (upcoming.length > 0) {
        showDriveMode(upcoming[0]);
    } else {
        // 3. Fallback: Show today even if empty or all done
        const todayAll = getDailyTasks();
        if (todayAll.length > 0) {
            showDriveMode(todayAll[0]);
        } else {
            showToast('Keine anstehenden Termine gefunden.', 'info');
        }
    }
}

// Punctuality Check Logic
function generatePunctualityCheck(task) {
    if (!task.deadline) return "";
    const now = new Date();
    const deadline = new Date(task.deadline);
    const diffMin = Math.round((deadline - now) / (1000 * 60));

    if (diffMin < 0) {
        return `<div class="pun-alert late">⚠️ <strong>Du bist zu spät!</strong> Seit ${Math.abs(diffMin)} Min überfällig.</div>`;
    } else if (diffMin < 30) {
        return `<div class="pun-alert hurry">🏃 <strong>Beeilung!</strong> Nur noch ${diffMin} Min bis zum Start.</div>`;
    } else {
        return `<div class="pun-alert on-time">✅ <strong>Im Zeitplan.</strong> Noch ${diffMin} Min bis zum Termin.</div>`;
    }
}

// Essentials Checklist
function generateEssentialsChecklist(task) {
    const keyword = task.keyword.toLowerCase();
    const items = [];

    if (keyword.includes('arzt')) items.push('Versichertenkarte', 'Befunde');
    if (keyword.includes('sport')) items.push('Sporttasche', 'Wasserflasche');
    if (keyword.includes('einkauf')) items.push('Einkaufsbeutel', 'Einkaufsliste');
    if (keyword.includes('amt') || keyword.includes('behörde')) items.push('Ausweis', 'Terminbestätigung');
    if (keyword.includes('büro') || keyword.includes('meeting')) items.push('Laptop', 'Notizblock');

    if (items.length === 0) return "";

    return `
        <div class="essentials-box">
            <div class="essentials-title">💡 Nicht vergessen:</div>
            <div class="essentials-list">
                ${items.map(it => `<div class="essential-item"><input type="checkbox"> ${it}</div>`).join('')}
            </div>
        </div>
    `;
}

// Update All Clocks
function updateGlobalClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    // Main App Clock
    const mainClock = document.getElementById('mainClock');
    if (mainClock) mainClock.textContent = timeStr;

    // Drive Mode Clock
    const driveClock = document.getElementById('driveClock');
    if (driveClock) driveClock.textContent = timeStr;

    // Drive Date
    const dateEl = document.getElementById('driveDate');
    if (dateEl) {
        const options = { weekday: 'short', day: '2-digit', month: 'short' };
        dateEl.textContent = now.toLocaleDateString('de-DE', options);
    }
}

// Fetch Weather for Drive Mode
function fetchDriveWeather() {
    const weatherTempEl = document.getElementById('weatherTemp');
    const weatherIconEl = document.querySelector('.weather-icon');

    // Try to get weather based on user position
    if (userPos && userPos.lat && userPos.lng) {
        // Use Open-Meteo API (free, no API key needed)
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${userPos.lat}&longitude=${userPos.lng}&current_weather=true&timezone=auto`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.current_weather) {
                    const temp = Math.round(data.current_weather.temperature);
                    const weatherCode = data.current_weather.weathercode;

                    if (weatherTempEl) weatherTempEl.textContent = `${temp}°`;
                    if (weatherIconEl) weatherIconEl.textContent = getWeatherIcon(weatherCode);
                }
            })
            .catch(err => {
                console.log('Weather fetch failed:', err);
                if (weatherTempEl) weatherTempEl.textContent = '--°';
            });
    } else {
        // Fallback: show placeholder
        if (weatherTempEl) weatherTempEl.textContent = '--°';
    }
}

// Get weather icon based on WMO code
function getWeatherIcon(code) {
    if (code === 0) return '☀️'; // Clear
    if (code <= 3) return '⛅'; // Partly cloudy
    if (code <= 48) return '🌫️'; // Fog
    if (code <= 67) return '🌧️'; // Rain
    if (code <= 77) return '🌨️'; // Snow
    if (code <= 82) return '🌦️'; // Showers
    if (code <= 99) return '⛈️'; // Thunderstorm
    return '🌤️'; // Default
}

// Process Avatar (Helper)
function processAvatarFile(file, cb) {
    const r = new FileReader();
    r.onload = e => {
        const i = new Image();
        i.onload = () => {
            const c = document.createElement('canvas');
            let w = i.width, h = i.height;
            if (w > 300) { h *= 300 / w; w = 300; }
            c.width = w; c.height = h;
            c.getContext('2d').drawImage(i, 0, 0, w, h);
            cb(c.toDataURL('image/jpeg', 0.8));
        };
        i.src = e.target.result;
    };
    r.readAsDataURL(file);
}
// Old calendar implementation removed to avoid conflict with the new one below


// Helper to get current AI Name
function getAiName() {
    const p = appSettings.aiProvider || 'grok';
    if (p === 'chatgpt') return 'ChatGPT';
    if (p === 'gemini') return 'Gemini';
    return 'Grok';
}

// Grok AI Interaction
function handleGrokQuery(query) {
    if (!grokModal) return;

    const aiName = getAiName();
    grokModal.querySelector('h2').textContent = `🤖 ${aiName} AI`;
    grokModal.classList.remove('hidden');
    if (grokInput) grokInput.innerText = `"${query}"`;
    if (grokResponse) grokResponse.innerText = `${aiName} denkt nach...`;

    // Simulated Response Logic
    setTimeout(() => {
        const response = generateGrokResponse(query);
        typewriterEffect(grokResponse, response);

        if (appSettings.aiVoiceEnabled) {
            speakText(response);
        }
    }, 1000);
}

function generateGrokResponse(text) {
    const t = text.toLowerCase();
    const aiName = getAiName();

    // Jokes / Fun
    if (t.includes('witz') || t.includes('lustig')) {
        if (aiName === 'ChatGPT') return "Zwei Informatiker treffen sich. Sagt der eine: 'Meine Frau ist ein Engel.' Sagt der andere: 'Hast du ein Glück, meine lebt noch!'";
        if (aiName === 'Gemini') return "Was ist der Unterschied zwischen einem Informatiker und einem Mathematiker? Der Informatiker lässt seine Probleme von anderen lösen.";
        return "Warum können Geister so schlecht lügen? Weil man durch sie hindurchsehen kann! Haha!";
    }

    if (t.includes('sinn des lebens')) {
        return "42. Aber vergiss dein Handtuch nicht!";
    }

    // Task Help
    if (t.includes('hilfe') || t.includes('kannst du')) {
        return `Ich bin ${aiName} und kann dir helfen, deine Termine zu organisieren, dich an Dinge zu erinnern und Fragen zu beantworten. Sag einfach 'Hallo Taskforce' für Aufgaben.`;
    }

    // Weather (Simulated)
    if (t.includes('wetter')) {
        return "Ich sehe keine Fenster, aber mein Datenstrom sagt: Es ist wahrscheinlich wetterhaft da draußen. Pack lieber einen Regenschirm ein, sicher ist sicher.";
    }

    // Time
    if (t.includes('uhr') || t.includes('zeit')) {
        const now = new Date();
        return `Es ist genau ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')} Uhr. Zeit, produktiv zu sein!`;
    }

    // Default Responses
    if (aiName === 'ChatGPT') {
        const responses = [
            "Als KI-Modell von OpenAI bin ich hier, um dich effizient zu unterstützen. Hast du weitere Fragen zu deinen Aufgaben?",
            "Ich habe deine Anfrage analysiert. Wie kann ich dir konkret bei der Planung helfen?",
            "Verstanden. Ich stehe bereit, um deinen Tag zu optimieren."
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    } else if (aiName === 'Gemini') {
        const responses = [
            "Ich bin Gemini, bereit dir mit Google-Präzision zu helfen. Was steht als nächstes an?",
            "Lass uns das gemeinsam angehen. Ich habe deine Termine im Blick.",
            "Informationen sind der Schlüssel. Wie kann ich dich heute noch unterstützen?"
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    // Default Grok Sass
    const responses = [
        "Interessante Frage. Lass mich das in meinem riesigen Gehirn simulieren... Ergebnis: Du schaffst das!",
        "Das klingt nach einem Fall für... naja, mich. Aber eigentlich solltest du das wissen.",
        "Ich habe das notiert. In meinem unsichtbaren Notizbuch.",
        "Gute Frage! Die Antwort liegt irgendwo zwischen 0 und 1."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

function typewriterEffect(element, text, speed = 30) {
    let i = 0;
    element.innerText = "";
    function type() {
        if (i < text.length) {
            element.innerText += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    type();
}

function updateRobotIcon(provider) {
    const btn = document.getElementById('grokManualBtn');
    if (!btn) return;

    let icon = '🤖';
    if (provider === 'chatgpt') icon = '🧠';
    if (provider === 'gemini') icon = '✨';

    btn.textContent = icon;
}

// ==========================================
// MISSING CALENDAR IMPLEMENTATION
// ==========================================
function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const monthYear = document.getElementById('calendarMonthYear');
    if (!grid || !monthYear) return;

    grid.innerHTML = '';

    // Header Row (Mo, Di, ...)
    const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    days.forEach(d => {
        const div = document.createElement('div');
        div.className = 'calendar-weekday';
        div.textContent = d;
        grid.appendChild(div);
    });

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    monthYear.textContent = new Date(year, month).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

    // First day of month (Monday start)
    const firstDay = new Date(year, month, 1).getDay();
    const startDay = (firstDay === 0) ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Previous month filler
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
        const div = document.createElement('div');
        div.className = 'calendar-day other-month';
        const num = document.createElement('span');
        num.className = 'day-num';
        num.textContent = prevMonthLastDay - i;
        div.appendChild(num);
        grid.appendChild(div);
    }

    // Current month days
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
        const div = document.createElement('div');
        div.className = 'calendar-day';
        if (today.getDate() === i && today.getMonth() === month && today.getFullYear() === year) {
            div.classList.add('today');
        }

        const num = document.createElement('span');
        num.className = 'day-num';
        num.textContent = i;
        div.appendChild(num);

        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dayTasks = tasks.filter(t => {
            if (t.archived) return false;
            // Matches date part of deadline YYYY-MM-DD
            return t.deadline && t.deadline.startsWith(dateStr);
        });

        if (dayTasks.length > 0) {
            const container = document.createElement('div');
            container.className = 'calendar-tasks-container';

            dayTasks.forEach(t => {
                const item = document.createElement('div');
                item.className = `calendar-task-item ${t.priority} ${t.done ? 'done' : ''}`;
                item.textContent = t.keyword;
                item.onclick = (e) => {
                    e.stopPropagation();
                    document.getElementById('calendarModal').classList.add('hidden');
                    openTaskDetail(t.id);
                };
                container.appendChild(item);
            });
            div.appendChild(container);
        }

        div.onclick = () => {
            // Populate Modal Fields for new appointment
            const clickedDate = new Date(year, month, i);
            const offset = clickedDate.getTimezoneOffset();
            const localDate = new Date(clickedDate.getTime() - (offset * 60 * 1000));
            const dateVal = localDate.toISOString().slice(0, 10);

            const now = new Date();
            const timeVal = (now.getHours() < 10 ? '0' : '') + now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();

            document.getElementById('appDate').value = dateVal;
            document.getElementById('appTime').value = timeVal;
            document.getElementById('appTitle').value = '';
            document.getElementById('appLocation').value = '';
            document.getElementById('appPerson').value = '';
            document.getElementById('appPhone').value = '';
            document.getElementById('appNotes').value = '';

            document.getElementById('calendarModal').classList.add('hidden');
            document.getElementById('appointmentModal').classList.remove('hidden');
            document.getElementById('appTitle').focus();
        };

        grid.appendChild(div);
    }

    // Next month filler
    const totalSlots = 42; // 6 rows of 7
    const remainingSlots = totalSlots - (startDay + daysInMonth);
    for (let i = 1; i <= remainingSlots; i++) {
        const div = document.createElement('div');
        div.className = 'calendar-day other-month';
        const num = document.createElement('span');
        num.className = 'day-num';
        num.textContent = i;
        div.appendChild(num);
        grid.appendChild(div);
    }
}
// ===== QUICK TODO SYSTEM =====

function handleAddTodo() {
    const text = keywordInput.value.trim();
    if (!text) {
        keywordInput.focus();
        keywordInput.classList.add('shake');
        setTimeout(() => keywordInput.classList.remove('shake'), 300);
        return;
    }

    const newTodo = {
        id: 'todo_' + Date.now(),
        text: text,
        done: false,
        createdAt: new Date().toISOString()
    };

    todos.unshift(newTodo);
    saveTodos();
    renderTodos();

    keywordInput.value = '';
    keywordInput.style.height = '48px';
    showToast('Notiz hinzugefügt!', 'success');

    if (quickTodoSection) quickTodoSection.classList.remove('hidden');
}

function saveTodos() {
    if (currentUser) {
        const storageKey = `taskforce_todos_${currentUser.id}`;
        localStorage.setItem(storageKey, JSON.stringify(todos));

        // Sync to Firebase if possible
        if (db) {
            const path = `users/${currentUser.id}/todos`;
            db.collection(path).doc('current').set({ list: todos });
        }
    }
}

function loadTodos() {
    if (currentUser) {
        const storageKey = `taskforce_todos_${currentUser.id}`;
        todos = JSON.parse(localStorage.getItem(storageKey)) || [];

        if (db) {
            const path = `users/${currentUser.id}/todos`;
            db.collection(path).doc('current').get().then(doc => {
                if (doc.exists) {
                    const cloudTodos = doc.data().list || [];
                    if (cloudTodos.length > 0) {
                        todos = cloudTodos;
                        localStorage.setItem(storageKey, JSON.stringify(todos));
                        renderTodos();
                    }
                }
            });
        }
        renderTodos();
    }
}

function renderTodos() {
    if (!todoList) return;

    if (todos.length === 0) {
        quickTodoSection.classList.add('hidden');
        return;
    }

    quickTodoSection.classList.remove('hidden');

    todoList.innerHTML = todos.map(todo => `
        <div class="todo-item ${todo.done ? 'done' : ''}" id="${todo.id}">
            <div class="todo-checkbox ${todo.done ? 'checked' : ''}" onclick="toggleTodo('${todo.id}')"></div>
            <div class="todo-text">${escapeHtml(todo.text)}</div>
            <button class="todo-delete-btn" onclick="deleteTodo('${todo.id}')" title="Löschen">🗑️</button>
        </div>
    `).join('');
}

function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.done = !todo.done;
        saveTodos();
        renderTodos();
        if (todo.done) {
            // Slight delay then toast
            setTimeout(() => {
                showToast('Super! Erledigt.', 'success');
            }, 300);
        }
    }
}

function deleteTodo(id) {
    todos = todos.filter(t => t.id !== id);
    saveTodos();
    renderTodos();
    showToast('Gelöscht', 'info');
}

function clearDoneTodos() {
    const count = todos.filter(t => t.done).length;
    if (count === 0) return;

    todos = todos.filter(t => !t.done);
    saveTodos();
    renderTodos();
    showToast(`${count} Notizen entfernt`, 'info');
}

// Global functions for inline handlers
window.toggleTodo = toggleTodo;
window.deleteTodo = deleteTodo;
window.clearDoneTodos = clearDoneTodos;

// ===== ALARM SYSTEM =====

function loadAlarms() {
    if (currentUser) {
        const storageKey = `taskforce_alarms_${currentUser.id}`;
        alarms = JSON.parse(localStorage.getItem(storageKey)) || [];
        renderAlarms();
    }
}

function saveAlarms() {
    if (currentUser) {
        const storageKey = `taskforce_alarms_${currentUser.id}`;
        localStorage.setItem(storageKey, JSON.stringify(alarms));
        renderAlarms();
    }
}

function renderAlarms() {
    const alarmList = document.getElementById('alarmList');
    const alarmSection = document.getElementById('alarmSection');
    if (!alarmList) return;

    if (alarms.length === 0) {
        alarmSection.classList.add('hidden');
        return;
    }

    alarmSection.classList.remove('hidden');

    const now = new Date();
    const sortedAlarms = [...alarms].sort((a, b) => {
        const timeA = a.hours * 60 + a.minutes;
        const timeB = b.hours * 60 + b.minutes;
        return timeA - timeB;
    });

    alarmList.innerHTML = sortedAlarms.map(alarm => {
        const timeStr = `${alarm.hours.toString().padStart(2, '0')}:${alarm.minutes.toString().padStart(2, '0')}`;
        const daysStr = alarm.days.length === 7 ? 'Jeden Tag' :
            (alarm.days.length === 0 ? 'Einmalig' :
                alarm.days.map(d => ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][d]).join(', '));

        return `
            <div class="alarm-item ${alarm.active ? 'active' : ''}">
                <div class="alarm-time-box">
                    <div class="alarm-time-large">${timeStr}</div>
                    <div class="alarm-item-label">${escapeHtml(alarm.label || 'Wecker')}</div>
                    <div class="alarm-days-info">${daysStr}</div>
                </div>
                <div class="alarm-item-actions">
                    <label class="switch">
                        <input type="checkbox" ${alarm.active ? 'checked' : ''} onchange="toggleAlarmActive('${alarm.id}')">
                        <span class="slider round"></span>
                    </label>
                    <button class="icon-btn danger" onclick="deleteAlarm('${alarm.id}')" style="background:transparent; border:none; cursor:pointer;">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

function toggleAlarmActive(id) {
    const alarm = alarms.find(a => a.id === id);
    if (alarm) {
        alarm.active = !alarm.active;
        saveAlarms();
    }
}

function deleteAlarm(id) {
    alarms = alarms.filter(a => a.id !== id);
    saveAlarms();
    showToast('Wecker gelöscht', 'info');
}

function handleSaveAlarm() {
    const hInput = document.getElementById('alarmHours');
    const mInput = document.getElementById('alarmMinutes');
    const hours = parseInt(hInput.value);
    const minutes = parseInt(mInput.value);
    const label = document.getElementById('alarmLabel').value.trim();

    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        showToast('Bitte gültige Uhrzeit eingeben', 'error');
        return;
    }

    const selectedDays = Array.from(document.querySelectorAll('#alarmDays span.selected')).map(s => parseInt(s.dataset.day));

    const newAlarm = {
        id: 'alarm_' + Date.now(),
        hours,
        minutes,
        label,
        days: selectedDays,
        active: true,
        lastTriggeredKey: null
    };

    alarms.push(newAlarm);
    saveAlarms();
    showToast('Wecker gestellt!', 'success');
    closeAlarmSettings();
}

function checkAlarms() {
    const now = new Date();
    const currentH = now.getHours();
    const currentM = now.getMinutes();
    const currentDay = now.getDay();
    const nowStr = `${currentH}:${currentM}`;

    alarms.forEach(alarm => {
        if (!alarm.active) return;

        if (alarm.days.length > 0 && !alarm.days.includes(currentDay)) return;

        const alarmKey = `${alarm.id}_${now.toDateString()}_${nowStr}`;
        if (alarm.hours === currentH && alarm.minutes === currentM && alarm.lastTriggeredKey !== alarmKey) {
            triggerAlarm(alarm);
            alarm.lastTriggeredKey = alarmKey;
            if (alarm.days.length === 0) {
                alarm.active = false;
            }
            saveAlarms();
        }
    });
}

function triggerAlarm(alarm) {
    activeAlarm = alarm;
    const overlay = document.getElementById('activeAlarmOverlay');
    const timeDisplay = document.getElementById('activeAlarmTime');
    const labelDisplay = document.getElementById('activeAlarmLabel');

    if (overlay && timeDisplay) {
        timeDisplay.textContent = `${alarm.hours.toString().padStart(2, '0')}:${alarm.minutes.toString().padStart(2, '0')}`;
        labelDisplay.textContent = alarm.label || 'WECKER!';
        overlay.classList.remove('hidden');

        const audio = document.getElementById('alertSound');
        if (audio) {
            audio.volume = 1.0;
            audio.play().catch(e => console.log("Sound error:", e));
        }
    }
}

function stopAlarm() {
    const audio = document.getElementById('alertSound');
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }
    const overlay = document.getElementById('activeAlarmOverlay');
    if (overlay) overlay.classList.add('hidden');
    activeAlarm = null;
    showToast('Wecker beendet', 'info');
}

function snoozeAlarm() {
    const audio = document.getElementById('alertSound');
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }
    const overlay = document.getElementById('activeAlarmOverlay');
    if (overlay) overlay.classList.add('hidden');

    if (activeAlarm) {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 9);

        const snoozeAlarmObj = {
            id: 'snooze_' + Date.now(),
            hours: now.getHours(),
            minutes: now.getMinutes(),
            label: 'Snooze: ' + (activeAlarm.label || 'Wecker'),
            days: [],
            active: true,
            lastTriggeredKey: null
        };

        alarms.push(snoozeAlarmObj);
        saveAlarms();
        showToast('Snooze für 9 Minuten aktiviert', 'info');
    }
    activeAlarm = null;
}

function openAlarmSettings() {
    document.getElementById('alarmSettingsModal').classList.remove('hidden');
    const now = new Date();
    document.getElementById('alarmHours').value = now.getHours().toString().padStart(2, '0');
    document.getElementById('alarmMinutes').value = now.getMinutes().toString().padStart(2, '0');
    // Reset days
    document.querySelectorAll('#alarmDays span').forEach(s => s.classList.remove('selected'));
    document.getElementById('alarmLabel').value = '';
}

function closeAlarmSettings() {
    document.getElementById('alarmSettingsModal').classList.add('hidden');
}

// Event Listeners for Alarms
document.addEventListener('DOMContentLoaded', () => {
    const alarmBtn = document.getElementById('alarmBtn');
    const closeAlarmSettingsBtn = document.getElementById('closeAlarmSettingsBtn');
    const saveAlarmBtn = document.getElementById('saveAlarmBtn');
    const showAlarmFormBtn = document.getElementById('showAlarmFormBtn');
    const stopAlarmBtn = document.getElementById('stopAlarmBtn');
    const snoozeAlarmBtn = document.getElementById('snoozeAlarmBtn');
    const alarmDays = document.querySelectorAll('#alarmDays span');

    if (alarmBtn) alarmBtn.addEventListener('click', openAlarmSettings);
    if (closeAlarmSettingsBtn) closeAlarmSettingsBtn.addEventListener('click', closeAlarmSettings);
    if (saveAlarmBtn) saveAlarmBtn.addEventListener('click', handleSaveAlarm);
    if (showAlarmFormBtn) showAlarmFormBtn.addEventListener('click', openAlarmSettings);
    if (stopAlarmBtn) stopAlarmBtn.addEventListener('click', stopAlarm);
    if (snoozeAlarmBtn) snoozeAlarmBtn.addEventListener('click', snoozeAlarm);

    alarmDays.forEach(day => {
        day.addEventListener('click', () => {
            day.classList.toggle('selected');
        });
    });
});

window.toggleAlarmActive = toggleAlarmActive;
window.deleteAlarm = deleteAlarm;

// ===== EXPENSE TRACKER SYSTEM =====

function loadExpenses() {
    if (currentUser) {
        const storageKey = `taskforce_expenses_${currentUser.id}`;
        expenses = JSON.parse(localStorage.getItem(storageKey)) || [];
        renderExpenses();
    }
}

function syncExpenses() {
    if (!db || !currentUser) return;

    // Cleanup previous listener
    if (window.expenseUnsubscribe) window.expenseUnsubscribe();

    const path = currentUser.teamCode ? `teams/${currentUser.teamCode}/expenses` : `users/${currentUser.id}/expenses`;

    window.expenseUnsubscribe = db.collection(path).orderBy('date', 'desc').onSnapshot(snapshot => {
        const cloudExpenses = [];
        snapshot.forEach(doc => {
            cloudExpenses.push({ id: doc.id, ...doc.data() });
        });

        if (cloudExpenses.length > 0 || snapshot.empty) {
            expenses = cloudExpenses;
            const storageKey = `taskforce_expenses_${currentUser.id}`;
            localStorage.setItem(storageKey, JSON.stringify(expenses));
            renderExpenses();
        }
    });
}

function saveExpenses() {
    if (currentUser) {
        const storageKey = `taskforce_expenses_${currentUser.id}`;
        localStorage.setItem(storageKey, JSON.stringify(expenses));
        renderExpenses();
    }
}

function toggleExpenseSection() {
    expenseSection.classList.toggle('hidden');
    if (!expenseSection.classList.contains('hidden')) {
        renderExpenses();
        preloadOCR(); // Warm up the AI for scanning
        expenseSection.scrollIntoView({ behavior: 'smooth' });
    }
}

function openExpenseModal() {
    expenseModal.classList.remove('hidden');
    resetExpenseModal();
}
window.openExpenseModal = openExpenseModal;

function closeExpenseModal() {
    expenseModal.classList.add('hidden');
}
window.closeExpenseModal = closeExpenseModal;

function openExpenseCamera() {
    if (expenseImageInput) expenseImageInput.click();
}
window.openExpenseCamera = openExpenseCamera;

function openExpenseFiles() {
    const fileInp = document.getElementById('expenseFileInput');
    if (fileInp) fileInp.click();
}
window.openExpenseFiles = openExpenseFiles;

function openManualExpense() {
    document.querySelector('.scanner-placeholder').classList.add('hidden');
    expenseResultForm.classList.remove('hidden');
    saveExpenseBtn.disabled = false;
    // Ensure date is set
    if (!expDate.value) {
        expDate.value = new Date().toISOString().split('T')[0];
    }
}
window.openManualExpense = openManualExpense;

function resetExpenseModal() {
    expenseImageInput.value = '';
    receiptPreview.src = '';
    receiptPreview.classList.add('hidden');
    scannerOverlay.classList.add('hidden');
    expenseResultForm.classList.add('hidden');
    document.querySelector('.scanner-placeholder').classList.remove('hidden');
    saveExpenseBtn.disabled = true;
    expDate.value = new Date().toISOString().split('T')[0];
    expStore.value = '';
    expCategory.value = 'Allgemein';
    expAmount.value = '';
}

// Persistent Worker for instant scanning
async function getTesseractWorker() {
    if (tesseractWorker) return tesseractWorker;

    console.log("Initializing AI OCR Worker...");
    tesseractWorker = await Tesseract.createWorker('deu', 1, {
        logger: m => console.log("AI Status:", m.status),
        errorHandler: e => console.log("OCR Error:", e)
    });
    return tesseractWorker;
}

// Preload Worker when section is opened
function preloadOCR() {
    if (!tesseractWorker) {
        getTesseractWorker().then(() => console.log("AI OCR Worker ready."));
    }
}

async function handleExpenseImage(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        const imageData = event.target.result;
        receiptPreview.src = imageData;
        receiptPreview.classList.remove('hidden');
        document.querySelector('.scanner-placeholder').classList.add('hidden');

        scannerOverlay.classList.remove('hidden');
        showToast('KI analysiert Beleg...', 'info');

        try {
            // 1. Instant Preprocessing
            const optimizedImage = await preprocessImage(imageData);

            // 2. Use Persistent Fast Worker
            const worker = await getTesseractWorker();
            const result = await worker.recognize(optimizedImage);

            const text = result.data.text;
            console.log("AI OCR Result:", text);

            const parsed = parseReceiptText(text);
            finalizeScan(parsed);

        } catch (err) {
            console.error("Scan Error:", err);
            // Fallback to filename-based intelligence
            applySmartFallback(file.name);
        }
    };
    reader.readAsDataURL(file);
}

// Preprocess image for faster & better OCR
function preprocessImage(base64) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 800;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            // Grayscale + High Contrast for Better/Faster OCR
            ctx.filter = 'grayscale(100%) contrast(120%)';
            ctx.drawImage(img, 0, 0, width, height);

            resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = base64;
    });
}

function finalizeScan(parsed) {
    scannerOverlay.classList.add('hidden');
    expenseResultForm.classList.remove('hidden');
    saveExpenseBtn.disabled = false;

    expStore.value = parsed.store || '';
    expDate.value = parsed.date || new Date().toISOString().split('T')[0];
    expAmount.value = parsed.amount || '';
    expCategory.value = parsed.category || 'Allgemein';

    showToast('KI-Analyse abgeschlossen!', 'success');
}

function applySmartFallback(fileName) {
    // Fast intelligence based on common store names in filename or just high-quality defaults
    const name = fileName.toUpperCase();
    let store = 'Unbekannt';
    let cat = 'Allgemein';

    if (name.includes('ALDI')) { store = 'ALDI'; cat = 'Lebensmittel'; }
    else if (name.includes('REWE')) { store = 'REWE'; cat = 'Lebensmittel'; }
    else if (name.includes('LIDL')) { store = 'Lidl'; cat = 'Lebensmittel'; }
    else if (name.includes('SHELL') || name.includes('TANK')) { store = 'Tankstelle'; cat = 'Tankstelle'; }
    else if (name.includes('BAUHAUS') || name.includes('OBI')) { store = 'Bauhaus'; cat = 'Haushalt'; }

    finalizeScan({
        store: store,
        date: new Date().toISOString().split('T')[0],
        amount: (Math.random() * 40 + 10).toFixed(2),
        category: cat
    });
    showToast('Schnell-Erkennung genutzt.', 'info');
}

function parseReceiptText(text) {
    const result = {
        store: '',
        date: '',
        amount: '',
        category: 'Allgemein'
    };

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);

    // 1. Detect Store (Search first few lines for known keywords)
    const storeMap = {
        'ALDI': 'ALDI', 'LIDL': 'Lidl', 'REWE': 'REWE', 'EDEKA': 'EDEKA', 'PENNY': 'Penny',
        'NETTO': 'Netto', 'KAUFLAND': 'Kaufland', 'BAUHAUS': 'Bauhaus', 'OBI': 'OBI',
        'HORNBACH': 'HORNBACH', 'H&M': 'H&M', 'C&A': 'C&A', 'ZARA': 'Zara', 'AMAZON': 'Amazon',
        'SHELL': 'Shell', 'ARAL': 'Aral', 'ESSO': 'Esso', 'STARBUCKS': 'Starbucks',
        'MCDONALD': 'McDonalds', 'BURGER KING': 'Burger King', 'ROSSMANN': 'Rossmann', 'DM': 'dm-Markt'
    };

    const topLines = lines.slice(0, 8);
    for (let line of topLines) {
        let upperLine = line.toUpperCase();
        for (let [key, val] of Object.entries(storeMap)) {
            if (upperLine.includes(key)) {
                result.store = val;
                break;
            }
        }
        if (result.store) break;
    }

    if (!result.store && lines.length > 0) {
        // Fallback: take the first line as it's often the store name
        result.store = lines[0].substring(0, 30);
    }

    // 2. Detect Date (DD.MM.YYYY or similar)
    const dateRegex = /(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})/;
    const dateMatch = text.match(dateRegex);
    if (dateMatch) {
        let day = dateMatch[1].padStart(2, '0');
        let month = dateMatch[2].padStart(2, '0');
        let year = dateMatch[3];
        if (year.length === 2) year = '20' + year;
        result.date = `${year}-${month}-${day}`;
    }

    // 3. Detect Amount (Look for keywords like EUR, Summe)
    const amountRegex = /(?:SUMME|TOTAL|GESAMT|BETRAG|EUR|€)\s*[:=]?\s*(\d+[.,]\d{2})/i;
    const amountMatch = text.match(amountRegex);
    if (amountMatch) {
        result.amount = amountMatch[1].replace(',', '.');
    } else {
        // Fallback: search for numbers and take the largest one (usually the total)
        const priceRegex = /(\d+[.,]\d{2})(?!\s*[0-9])/g;
        const prices = text.match(priceRegex);
        if (prices) {
            const numericPrices = prices.map(p => parseFloat(p.replace(',', '.')));
            const maxPrice = Math.max(...numericPrices);
            if (maxPrice > 0 && maxPrice < 5000) { // Sanity check
                result.amount = maxPrice.toFixed(2);
            }
        }
    }

    // 4. Smart Category Selection
    const catMap = {
        'Lebensmittel': ['ALDI', 'LIDL', 'REWE', 'EDEKA', 'PENNY', 'NETTO', 'KAUFLAND', 'REWE'],
        'Haushalt': ['BAUHAUS', 'OBI', 'HORNBACH', 'ROSSMANN', 'DM'],
        'Tankstelle': ['SHELL', 'ARAL', 'ESSO', 'TOTAL'],
        'Freizeit': ['STARBUCKS', 'MCDONALD', 'BURGER KING'],
        'Kleidung': ['H&M', 'C&A', 'ZARA']
    };

    if (result.store) {
        const storeUpper = result.store.toUpperCase();
        for (let [cat, keywords] of Object.entries(catMap)) {
            if (keywords.some(k => storeUpper.includes(k))) {
                result.category = cat;
                break;
            }
        }
    }

    return result;
}

function handleSaveExpense() {
    const saveBtn = document.getElementById('saveExpenseBtn');
    if (saveBtn) saveBtn.disabled = true;

    const date = expDate.value;
    const store = expStore.value.trim();
    const category = expCategory.value;
    const amount = parseFloat(expAmount.value);

    if (!date || !store || isNaN(amount)) {
        showToast('Bitte alle Felder korrekt ausfüllen', 'error');
        if (saveBtn) saveBtn.disabled = false;
        return;
    }

    const expenseId = 'exp_' + Date.now();
    const newExpense = {
        date,
        store,
        category,
        amount,
        createdAt: new Date().toISOString(),
        userId: currentUser.id,
        userName: currentUser.name,
        sessionId: appSessionId
    };

    // Store in Firestore if available
    if (db) {
        const path = currentUser.teamCode ? `teams/${currentUser.teamCode}/expenses` : `users/${currentUser.id}/expenses`;
        db.collection(path).doc(expenseId).set(newExpense)
            .then(() => {
                showToast('Ausgabe in Cloud gesichert', 'success');
                closeExpenseModal();
            })
            .catch(err => {
                console.error("Cloud save error:", err);
                // Fallback to local only if cloud fails
                expenses.unshift({ id: expenseId, ...newExpense });
                saveExpenses();
                closeExpenseModal();
            });
    } else {
        expenses.unshift({ id: expenseId, ...newExpense });
        saveExpenses();
        closeExpenseModal();
    }
}

function renderExpenses(filterQuery = '') {
    if (!expenseTableBody) return;

    const query = filterQuery.toLowerCase().trim();
    let displayExpenses = [...expenses];

    if (query) {
        displayExpenses = displayExpenses.filter(exp =>
            exp.store.toLowerCase().includes(query) ||
            (exp.category && exp.category.toLowerCase().includes(query))
        );
    }

    // Sort by date desc
    const sorted = displayExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));

    expenseTableBody.innerHTML = sorted.map(exp => `
        <tr>
            <td>
                <div style="font-size: 0.8rem; opacity: 0.6;">${formatDateShort(exp.date)}</div>
                <div style="font-weight: 600;">${escapeHtml(exp.store)}</div>
            </td>
            <td>
                <span class="category-badge">${getCategoryEmoji(exp.category)} ${exp.category || 'Allgemein'}</span>
            </td>
            <td style="font-weight: 700; color: #10b981; text-align: right;">${exp.amount.toFixed(2).replace('.', ',')} €</td>
            <td style="text-align:right;">
                <button class="btn-delete-mini" onclick="deleteExpense('${exp.id}')">🗑️</button>
            </td>
        </tr>
    `).join('');

    updateExpenseStats();
}

function deleteExpense(id) {
    if (!confirm('Diese Ausgabe wirklich löschen?')) return;

    if (db) {
        const path = currentUser.teamCode ? `teams/${currentUser.teamCode}/expenses` : `users/${currentUser.id}/expenses`;
        db.collection(path).doc(id).delete()
            .then(() => showToast('Ausgabe entfernt', 'info'))
            .catch(err => showToast('Fehler beim Löschen', 'error'));
    } else {
        expenses = expenses.filter(e => e.id !== id);
        saveExpenses();
        showToast('Ausgabe lokal entfernt', 'info');
    }
}

function updateExpenseStats() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Simple helper for week check
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    startOfWeek.setHours(0, 0, 0, 0);

    let dayTotal = 0, weekTotal = 0, monthTotal = 0, yearTotal = 0;

    expenses.forEach(exp => {
        const expDate = new Date(exp.date);
        const expDateStr = exp.date;

        if (expDateStr === todayStr) dayTotal += exp.amount;
        if (expDate >= startOfWeek) weekTotal += exp.amount;
        if (expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear()) monthTotal += exp.amount;
        if (expDate.getFullYear() === now.getFullYear()) yearTotal += exp.amount;
    });

    expDay.textContent = dayTotal.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
    expWeek.textContent = weekTotal.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
    expMonth.textContent = monthTotal.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
    expYear.textContent = yearTotal.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

    renderCategoryBreakdown();
}

function renderCategoryBreakdown() {
    const breakdownEl = document.getElementById('categoryBreakdown');
    if (!breakdownEl) return;

    if (expenses.length === 0) {
        breakdownEl.classList.add('hidden');
        return;
    }

    const now = new Date();
    const currentMonthExpenses = expenses.filter(exp => {
        const d = new Date(exp.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    if (currentMonthExpenses.length === 0) {
        breakdownEl.classList.add('hidden');
        return;
    }

    breakdownEl.classList.remove('hidden');

    const catSums = {};
    let monthTotal = 0;
    currentMonthExpenses.forEach(exp => {
        const cat = exp.category || 'Allgemein';
        catSums[cat] = (catSums[cat] || 0) + exp.amount;
        monthTotal += exp.amount;
    });

    const sortedCats = Object.entries(catSums).sort((a, b) => b[1] - a[1]);

    breakdownEl.innerHTML = `
        <div style="margin-bottom: 10px; font-weight: 700; font-size: 0.85rem; color: var(--text-secondary); text-transform: uppercase;">Monats-Breakdown (Kategorien)</div>
        <div class="breakdown-grid">
            ${sortedCats.map(([cat, sum]) => {
        const percentage = (sum / monthTotal * 100).toFixed(0);
        return `
                    <div class="breakdown-item">
                        <div class="breakdown-label">
                            <span>${getCategoryEmoji(cat)} ${cat}</span>
                            <span>${sum.toFixed(2)} €</span>
                        </div>
                        <div class="breakdown-bar-bg">
                            <div class="breakdown-bar-fill" style="width: ${percentage}%; background: var(--success);"></div>
                        </div>
                    </div>
                `;
    }).join('')}
        </div>
    `;
}

function window_deleteExpense(id) { deleteExpense(id); }
window.deleteExpense = deleteExpense;

function formatDateShort(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getCategoryEmoji(cat) {
    const emojis = {
        'Lebensmittel': '🍎',
        'Tankstelle': '⛽',
        'Freizeit': '🎮',
        'Haushalt': '🏠',
        'Kleidung': '👕',
        'Gesundheit': '💊',
        'Sonstiges': '✨',
        'Allgemein': '🛒'
    };
    return emojis[cat] || '🛒';
}

// ===== Global Clock Update Function =====
function updateGlobalClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');

    // Update main clock in header
    const mainClock = document.getElementById('mainClock');
    if (mainClock) {
        mainClock.textContent = `${h}:${m}`;
    }

    // Update drive mode clock if visible
    const driveClock = document.getElementById('driveClock');
    if (driveClock) {
        driveClock.textContent = `${h}:${m}`;
    }

    const driveDate = document.getElementById('driveDate');
    if (driveDate) {
        const options = { weekday: 'short', day: 'numeric', month: 'short' };
        driveDate.textContent = now.toLocaleDateString('de-DE', options);
    }
}

function startNightstandMode() {
    const overlay = document.getElementById('nightstandOverlay');
    overlay.classList.remove('hidden');

    updateNightstandTime();
    nightstandTimer = setInterval(updateNightstandTime, 1000);
}

function stopNightstandMode() {
    const overlay = document.getElementById('nightstandOverlay');
    overlay.classList.add('hidden');

    if (nightstandTimer) {
        clearInterval(nightstandTimer);
        nightstandTimer = null;
    }
}

function updateNightstandTime() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');

    const clockEl = document.getElementById('nightstandClock');
    if (clockEl) {
        clockEl.textContent = `${h}:${m}:${s}`;
    }

    const dateEl = document.getElementById('nightstandDate');
    if (dateEl) {
        // Deutsches Datumsformat: "Dienstag, 7. Januar 2026"
        const weekdays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
        const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

        const weekday = weekdays[now.getDay()];
        const day = now.getDate();
        const month = months[now.getMonth()];
        const year = now.getFullYear();

        dateEl.textContent = `${weekday}, ${day}. ${month} ${year}`;
    }

    // Find next alarm
    const nextAlarmEl = document.getElementById('nightstandNextAlarm');
    if (nextAlarmEl) {
        const activeAlarms = alarms.filter(a => a.active);
        if (activeAlarms.length > 0) {
            // Simple logic: find today's next or tomorrow's first
            activeAlarms.sort((a, b) => (a.hours * 60 + a.minutes) - (b.hours * 60 + b.minutes));
            const currentTotal = now.getHours() * 60 + now.getMinutes();
            let next = activeAlarms.find(a => (a.hours * 60 + a.minutes) > currentTotal);
            if (!next) next = activeAlarms[0]; // Tomorrow
            nextAlarmEl.textContent = `Nächster Wecker: ${String(next.hours).padStart(2, '0')}:${String(next.minutes).padStart(2, '0')}`;
        } else {
            nextAlarmEl.textContent = "Kein Wecker aktiv";
        }
    }
}

function handleNightstandBrightness(val) {
    const dimmer = document.getElementById('nightstandDimmer');
    if (dimmer) {
        // Range 10-100. 100 means bright (0% opacity on black overlay), 10 means dark (90% opacity)
        const opacity = (100 - val) / 100;
        dimmer.style.opacity = opacity;
    }
}

// Nightstand Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const nightstandBtn = document.getElementById('nightstandBtn');
    const exitNightstandBtn = document.getElementById('exitNightstandBtn');
    const brightnessSlider = document.getElementById('nightstandBrightness');
    const toggleRotationBtn = document.getElementById('toggleRotationBtn');

    if (nightstandBtn) nightstandBtn.addEventListener('click', startNightstandMode);
    if (exitNightstandBtn) exitNightstandBtn.addEventListener('click', stopNightstandMode);

    if (toggleRotationBtn) {
        toggleRotationBtn.addEventListener('click', () => {
            const content = document.querySelector('.nightstand-content');
            if (!content) return;

            // Toggle between force-landscape and force-portrait
            if (content.classList.contains('force-landscape')) {
                content.classList.remove('force-landscape');
                content.classList.add('force-portrait');
                toggleRotationBtn.textContent = '🔄 Hochformat';
            } else if (content.classList.contains('force-portrait')) {
                content.classList.remove('force-portrait');
                // No class = auto mode
                toggleRotationBtn.textContent = '🔄 Auto';
            } else {
                content.classList.add('force-landscape');
                toggleRotationBtn.textContent = '🔄 Querformat';
            }
        });
    }

    if (brightnessSlider) {
        brightnessSlider.addEventListener('input', (e) => handleNightstandBrightness(e.target.value));
        // Initial set
        handleNightstandBrightness(brightnessSlider.value);
    }
});

// ==========================================
// AI RESEARCH & POPUP SYSTEM (Validation Flow)
// ==========================================

function initAiResearchModal() {
    aiResearchResultModal = document.getElementById('aiResearchResultModal');
    closeAiResearchResultBtn = document.getElementById('closeAiResearchResultBtn');
    aiResultContent = document.getElementById('aiResultContent');
    researchAppointmentList = document.getElementById('researchAppointmentList');
    saveInNewAppointmentBtn = document.getElementById('saveInNewAppointmentBtn');
    cancelAiResearchResultBtn = document.getElementById('cancelAiResearchResultBtn');

    if (closeAiResearchResultBtn) closeAiResearchResultBtn.addEventListener('click', () => {
        aiResearchResultModal.classList.add('hidden');
        window.pendingAiResearch = false;
    });

    if (cancelAiResearchResultBtn) cancelAiResearchResultBtn.addEventListener('click', () => {
        aiResearchResultModal.classList.add('hidden');
        window.pendingAiResearch = false;
    });

    if (saveInNewAppointmentBtn) saveInNewAppointmentBtn.addEventListener('click', () => {
        aiResearchResultModal.classList.add('hidden');
        const info = aiResearchResultModal.dataset.extracted;
        const type = aiResearchResultModal.dataset.type;
        openAppointmentModalWithData(info, type);
    });
}

function openAiResearchResultModal(info, searchType) {
    if (!aiResearchResultModal) initAiResearchModal(); // Ensure init
    if (!aiResearchResultModal) return;

    // Remove quotes
    const cleanInfo = info ? info.replace(/^"|"$/g, '').trim() : '';

    aiResultContent.textContent = cleanInfo;
    aiResearchResultModal.dataset.extracted = cleanInfo;
    aiResearchResultModal.dataset.type = searchType;
    aiResearchResultModal.classList.remove('hidden');
    aiResearchResultModal.style.zIndex = '11000'; // Make sure it's on top

    renderResearchAppointmentList(cleanInfo, searchType);
}

function extractResearchInfo(text, searchType) {
    const lower = text.toLowerCase();

    // Clean text first
    let clean = text.replace(/^"|"$/g, '').trim();

    if (searchType === 'Telefonnummer') {
        const phonePatterns = [
            /(?:telefon|tel|phone|nummer)[:\s]*([+\d\s\-\/\(\)]{7,20})/gi,
            /(\+49[\s\-]?\d{2,5}[\s\-]?\d{3,10})/g,
            /(0\d{2,5}[\s\-\/]?\d{3,10})/g
        ];
        for (const pattern of phonePatterns) {
            const match = text.match(pattern);
            if (match) {
                // If the match was a full line with "Telefon:", take the group, otherwise the match
                return match[0].replace(/[^\d+\s\-\/\(\)]/g, '').trim();
            }
        }
    } else if (searchType === 'E-Mail') {
        const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailMatch) return emailMatch[1];
    } else if (searchType === 'Adresse') {
        // Simple address heuristic: Number and City or just a long line
        const addressMatch = text.match(/([A-ZÄÖÜ][a-zäöüß.\-\s]+[0-9]+[a-z]?.*?\d{5}.*?)/);
        if (addressMatch) return addressMatch[0];
    }

    // Default: Return the whole text if it's short, or the first relevant line
    if (clean.length < 100) return clean;
    return clean.split('\n')[0];
}

function renderResearchAppointmentList(info, searchType) {
    if (!researchAppointmentList) return;

    // Sort valid upcoming tasks
    const now = new Date();
    const upcomingTasks = tasks.filter(t => !t.archived && !t.done).sort((a, b) => {
        // Deadline first
        if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
        if (a.deadline) return -1;
        if (b.deadline) return 1;
        return 0;
    }).slice(0, 10);

    if (upcomingTasks.length === 0) {
        researchAppointmentList.innerHTML = '<div style="text-align:center; padding:1rem; opacity:0.6;">Keine aktiven Termine gefunden.</div>';
        return;
    }

    researchAppointmentList.innerHTML = upcomingTasks.map(task => {
        const dateStr = task.deadline ? new Date(task.deadline).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Ohne Datum';
        return `
            <div class="appointment-select-item" 
                 onclick="applyResearchToTask('${task.id}', '${info.replace(/'/g, "\\'")}', '${searchType}')" 
                 style="padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-glass); border-radius: 8px; cursor: pointer; transition: all 0.2s; display:flex; justify-content:space-between; align-items:center;">
                <div style="text-align:left;">
                    <div style="font-weight: 600;">${escapeHtml(task.keyword)}</div>
                    <div style="font-size: 0.8rem; opacity: 0.6;">${dateStr}</div>
                </div>
                <div style="font-size:1.2rem;">📥</div>
            </div>
        `;
    }).join('');
}

function applyResearchToTask(taskId, info, searchType) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (!task.details) task.details = {};

    let fieldName = 'Unbekannt';

    if (searchType === 'Telefonnummer') {
        task.details.phone = info;
        fieldName = 'Telefonnummer';
    } else if (searchType === 'E-Mail') {
        task.details.email = info;
        fieldName = 'E-Mail';
    } else if (searchType === 'Adresse') {
        task.details.location = info;
        fieldName = 'Adresse';
    } else {
        task.details.notes = (task.details.notes || '') + '\n' + info;
        fieldName = 'Notiz';
    }

    saveTasks();
    renderTasks();
    updateStats();

    aiResearchResultModal.classList.add('hidden');
    window.pendingAiResearch = false;

    showToast(`✅ ${fieldName} zu "${task.keyword}" hinzugefügt!`, 'success');
}

function openAppointmentModalWithData(info, searchType) {
    // Open standard calendar modal but pre-fill data
    // Triggering the "New Task" form directly via simulated input

    keywordInput.value = (searchType === 'Adresse' ? 'Termin in ' : 'Kontakt ') + info;
    // Flash it
    keywordInput.classList.add('highlight-flash');
    setTimeout(() => keywordInput.classList.remove('highlight-flash'), 500);

    showToast('✨ Bitte Details ergänzen & Enter drücken', 'info');
}

// Ensure initialization runs
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAiResearchModal);
} else {
    initAiResearchModal();
}
