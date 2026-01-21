// TaskForce Pro Application Logic - v9 (Stable & Robust)

const app = {
    // Default State
    state: {
        user: { name: '', team: [], isPro: false },
        currentPage: 'dashboard',
        xp: 0,
        level: 1,
        tasks: [],
        expenses: [],
        habits: [],
        events: [],
        healthData: [],
        contacts: [],
        alarms: [],
        dailyTaskGoal: 5, // Anzahl Aufgaben pro Tag
        ui: {
            hiddenCards: [],
            dashboardMode: 'business'
        },
        aiConfig: {
            provider: 'openai',
            openaiKey: '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',
            grokKey: '',
            geminiKey: ''
        }
    },

    editingId: null,
    wakeLock: null,
    isSidebarOpen: false,

    // --- CORE INITIALIZATION ---
    init() {
        console.log("TaskForce Initializing...");
        try {
            this.loadState();
            this.runMigrations(); // Fix state if needed

            // Check Login Status & Enforce Protection
            if (!this.state.user.isLoggedIn) {
                const loginOverlay = document.getElementById('loginOverlay');
                if (loginOverlay) {
                    loginOverlay.classList.remove('hidden');
                    // Pre-fill if user exists
                    if (this.state.user && this.state.user.name) {
                        app.auth.switchTab('login');
                        document.getElementById('authName').value = this.state.user.name;
                    } else {
                        app.auth.switchTab('register');
                    }
                }
            } else {
                this.user.updateHeader();
                const loginOverlay = document.getElementById('loginOverlay');
                if (loginOverlay) loginOverlay.classList.add('hidden');
            }

            this.setupNavigation();
            this.startClock();

            // Initialize Cloud Sync
            this.cloud.init();

            // Render Initial Views
            this.tasks.render();
            this.finance.render();
            this.habits.render();
            this.health.init();
            this.health.render();
            this.team.render();
            this.calendar.init();
            this.gamification.updateUI();
            this.renderDashboard();
            if (this.shortcuts) this.shortcuts.render();
            this.dashboard.initDragAndDrop();
            this.dashboard.applyOrder();
            this.voice.init();

            // Zeit-Tracker initialisieren (mit Persistenz)
            if (this.timeTracker) this.timeTracker.init();

            // Apply User Preferences
            this.settings.applyLayoutPreference();
            this.settings.applyVoiceIconPreference();

            // Re-apply Alarm State (Show next active alarm if any)
            if (this.state.alarms && this.state.alarms.length > 0) {
                const nextAlarm = this.state.alarms.find(a => a.active);
                if (nextAlarm) {
                    const dis = document.getElementById('activeAlarmDisplay');
                    if (dis) dis.textContent = `An: ${nextAlarm.time} (${nextAlarm.title})`;
                    const ndis = document.getElementById('nightAlarmDisplay');
                    if (ndis) { ndis.classList.remove('hidden'); ndis.querySelector('span').textContent = nextAlarm.time; }
                }
            }

            // Global Click Listeners for Mobile Sidebar
            document.querySelectorAll('.nav-item').forEach(i => i.addEventListener('click', () => {
                if (this.isSidebarOpen) this.toggleSidebar();
            }));

            // Browser Back Button Support
            this.setupBackButton();

            // Background & Alert Setup
            this.notifications.requestPermission();
            this.requestWakeLock();

            // Apply Pro status to UI
            this.user.applyProStatus();

            // Create Icons safely
            if (window.lucide) lucide.createIcons();

        } catch (e) {
            console.error("Critical Init Error:", e);
            alert("Fehler beim Starten der App: " + e.message);
        }
    },

    // --- BROWSER BACK BUTTON SUPPORT ---
    navigationHistory: [],
    setupBackButton() {
        // Track initial state
        window.history.replaceState({ page: this.state.currentPage }, '', '');

        // Listen for back button
        window.addEventListener('popstate', (event) => {
            // Check if modal is open
            const o = document.getElementById('modalOverlay');
            if (o && !o.classList.contains('hidden')) {
                app.modals.close(true); // Close, but skip history.back() as we are already there
                return;
            }

            if (event.state && event.state.page) {
                this.navigateTo(event.state.page, true); // true = don't push to history
            } else {
                // If no state, go to dashboard
                this.navigateTo('dashboard', true);
            }
        });
    },

    // --- STATE MANAGEMENT ---
    loadState() {
        try {
            const s = localStorage.getItem('taskforce_state');
            if (s) {
                const parsed = JSON.parse(s);
                // Deep merge or fallback to avoid nulls
                this.state = { ...this.state, ...parsed };
            }
        } catch (e) {
            console.error("State Load Error", e);
            // If error, we keep default state
        }
    },

    runMigrations() {
        // Ensure critical objects exist
        if (!this.state.user) this.state.user = { name: 'Creator', team: [] };
        if (!this.state.user.team) this.state.user.team = [];
        if (!this.state.user.name) this.state.user.name = 'Creator';

        if (!this.state.events) this.state.events = [];
        if (!this.state.contacts) this.state.contacts = [];
        if (!this.state.expenses) this.state.expenses = [];
        if (!this.state.tasks) this.state.tasks = [];
        if (!this.state.meetings) this.state.meetings = []; // New Meetings Array
        if (!this.state.habits) this.state.habits = [];
        if (!this.state.archives) this.state.archives = [];
        if (!this.state.aiConfig) this.state.aiConfig = { provider: 'openai', openaiKey: '', grokKey: '', geminiKey: '' };
        if (!this.state.dashboardLayout) this.state.dashboardLayout = 'double';
        if (!this.state.shortcuts) this.state.shortcuts = []; // Initialize Shortcuts

        // UI Default State
        if (!this.state.ui) this.state.ui = {};

        // Migration: Move legacy hiddenCards to new mode-specific keys if valid
        if (this.state.ui.hiddenCards && Array.isArray(this.state.ui.hiddenCards)) {
            if (!this.state.ui.hiddenCardsBusiness) this.state.ui.hiddenCardsBusiness = [...this.state.ui.hiddenCards];
            if (!this.state.ui.hiddenCardsPrivate) this.state.ui.hiddenCardsPrivate = [...this.state.ui.hiddenCards];
            delete this.state.ui.hiddenCards;
        }

        // Initialize defaults if missing
        if (!this.state.ui.hiddenCardsBusiness) this.state.ui.hiddenCardsBusiness = [];
        if (!this.state.ui.hiddenCardsPrivate) this.state.ui.hiddenCardsPrivate = [];

        if (!this.state.ui.dashboardMode) this.state.ui.dashboardMode = 'business';

        // Household Migration
        if (!this.state.household) this.state.household = [];
        if (!this.state.meals) this.state.meals = new Array(7).fill('');

        // Add test data if empty
        if (this.state.contacts.length === 0) {
            this.state.contacts = [
                { id: 1, name: 'Max Müller', phone: '+49 123 456789', email: 'max@business.de', category: 'business' },
                { id: 2, name: 'Lisa Schmidt', phone: '+49 987 654321', email: 'lisa@example.de', category: 'private' },
                { id: 3, name: 'Tom Wagner', phone: '+49 555 123456', email: 'tom@company.de', category: 'business' },
            ];
            this.saveState();
        }

        if (this.state.events.length === 0) {
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            this.state.events = [
                { id: 1, title: 'Team Meeting', date: today.toISOString().split('T')[0], time: '10:00', category: 'business', start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0).toISOString() },
                { id: 2, title: 'Kaffee mit Freund', date: today.toISOString().split('T')[0], time: '15:00', category: 'private', start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 0).toISOString() },
                { id: 3, title: 'Präsentation', date: tomorrow.toISOString().split('T')[0], time: '09:00', category: 'business', start: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 9, 0).toISOString() },
            ];
            this.saveState();
        }

        // Firebase Default Config Migration
        if (!this.state.cloud) this.state.cloud = {};
        if (!this.state.cloud.firebaseConfig || this.state.cloud.firebaseConfig.length < 5) {
            this.state.cloud.firebaseConfig = JSON.stringify({
                apiKey: "AIzaSyCdiwAhgLBNnIdgvpWW3qpeTaKoSy1nTM0",
                authDomain: "taskforce-91683.firebaseapp.com",
                projectId: "taskforce-91683",
                storageBucket: "taskforce-91683.firebasestorage.app",
                messagingSenderId: "203568113458",
                appId: "1:203568113458:web:666709ae3263977a43592b",
                measurementId: "G-K8GQZGB8KE"
            }, null, 2);
            this.saveState();
        }

        // Default Key Migration
        const defKey = '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';
        if (this.state.aiConfig.provider === 'openai' && (!this.state.aiConfig.openaiKey || this.state.aiConfig.openaiKey.length < 10)) {
            this.state.aiConfig.openaiKey = defKey;
            this.saveState();
        }

        // Pro Status Migration
        if (this.state.user && this.state.user.isPro === undefined) {
            this.state.user.isPro = false;
            this.saveState();
        }

        // Multi-Alarm Migration
        if (!this.state.alarms) {
            this.state.alarms = [];
            if (this.state.alarm) {
                // Convert old single alarm to new array format
                this.state.alarms.push({
                    id: Date.now(),
                    title: 'Erster Wecker',
                    time: this.state.alarm.time || '07:00',
                    active: this.state.alarm.active || false,
                    days: this.state.alarm.days || [1, 2, 3, 4, 5],
                    sound: 'melody'
                });
                delete this.state.alarm;
            } else {
                // Add defaults if none exist
                this.state.alarms = [
                    { id: 1, title: 'Morgen-Routine', time: '07:00', active: true, days: [1, 2, 3, 4, 5], sound: 'melody' },
                    { id: 2, title: 'Wochenende-Ausschlafen', time: '09:30', active: false, days: [0, 6], sound: 'nature' }
                ];
            }
            this.saveState();
        }

        // --- PREVIOUS MIGRATIONS ---
        // Migrate Tasks to support Categories
        if (this.state.tasks.some(t => !t.category)) {
            this.state.tasks.forEach(t => {
                if (!t.category) {
                    const lower = t.title.toLowerCase();
                    if (lower.includes('kaufen') || lower.includes('einkauf') || lower.includes('shop')) {
                        t.category = 'shopping';
                    } else {
                        t.category = 'todo';
                    }
                }
            });
            this.saveState();
        }

        // Default Habits Migration
        if (this.state.habits.length === 0) {
            this.state.habits = [
                { id: 101, name: 'Tabletten einnehmen', streak: 0, goal: 30, time: '08:00', days: [0, 1, 2, 3, 4, 5, 6], urgent: true, history: [] },
                { id: 102, name: 'Hund laufen', streak: 0, goal: 30, time: '17:00', days: [0, 1, 2, 3, 4, 5, 6], urgent: false, history: [] }
            ];
            this.saveState();
        }
        // Voice Icon Preference
        if (!this.state.voiceIconMode) {
            this.state.voiceIconMode = 'logo';
            this.saveState();
        }

        // Widget Visibility Migration
        if (!this.state.ui) this.state.ui = {};
        if (!this.state.ui.hiddenCards) {
            this.state.ui.hiddenCards = [];
        }

        // Ensure Blink Style is initialized
        if (!this.state.ui.blinkStyle) {
            this.state.ui.blinkStyle = 'standard';
        }

        this.saveState();

        // --- UPDATE SETTINGS INPUTS (If validation passes) ---
        setTimeout(() => {
            const bSelect = document.getElementById('blinkStyleSelect');
            if (bSelect && this.state.ui.blinkStyle) bSelect.value = this.state.ui.blinkStyle;
        }, 100);
    },

    saveState(skipSync = false) {
        try {
            localStorage.setItem('taskforce_state', JSON.stringify(this.state));
            this.gamification.updateUI();

            // Auto-Sync Push (Debounced)
            if (!skipSync && this.cloud && this.cloud.push) {
                clearTimeout(this._syncTimer);
                this._syncTimer = setTimeout(() => this.cloud.push(), 2000);
            }
        } catch (e) { console.error("Save Error", e); }
    },

    // --- USER MOUDULE ---
    // --- AUTH MODULE ---
    auth: {
        mode: 'login', // login or register
        switchTab(m) {
            this.mode = m;
            document.getElementById('tabLogin').style.borderBottomColor = m === 'login' ? 'var(--primary)' : 'transparent';
            document.getElementById('tabLogin').style.color = m === 'login' ? '#fff' : 'var(--text-muted)';
            document.getElementById('tabRegister').style.borderBottomColor = m === 'register' ? 'var(--primary)' : 'transparent';
            document.getElementById('tabRegister').style.color = m === 'register' ? '#fff' : 'var(--text-muted)';

            document.getElementById('authActionBtn').textContent = m === 'login' ? 'Anmelden 🚀' : 'Registrieren ✨';

            // Logic: Register -> Show Pass Repeat, Hide Team
            //        Login    -> Hide Pass Repeat, Show Team
            if (m === 'register') {
                document.getElementById('authPassRepeatField').classList.remove('hidden');
                document.getElementById('authTeamField').classList.add('hidden');
                document.getElementById('teamToggleContainer').classList.add('hidden');
            } else {
                document.getElementById('authPassRepeatField').classList.add('hidden');
                document.getElementById('teamToggleContainer').classList.remove('hidden');

                // Keep team field hidden unless checkbox is checked
                this.updateTeamFieldVisibility();
            }
        },
        toggleTeamField() {
            const cb = document.getElementById('useTeamSync');
            if (cb) cb.checked = !cb.checked;
            this.updateTeamFieldVisibility();
        },
        updateTeamFieldVisibility() {
            const field = document.getElementById('authTeamField');
            const cb = document.getElementById('useTeamSync');
            if (field && cb) {
                if (cb.checked) field.classList.remove('hidden');
                else field.classList.add('hidden');
            }
        },
        logout() {
            if (confirm("Möchtest du dich abmelden?")) {
                app.state.user.isLoggedIn = false;
                app.saveState();
                location.reload();
            }
        },
        submit() {
            const name = document.getElementById('authName').value.trim();
            const pass = document.getElementById('authPass').value.trim();
            const passRep = document.getElementById('authPassRepeat').value.trim();
            const team = document.getElementById('authTeam').value.trim();

            if (!name || !pass) { alert("Bitte Name und Passwort eingeben."); return; }

            if (this.mode === 'register') {
                if (pass !== passRep) { alert("Die Passwörter stimmen nicht überein! ❌"); return; }

                // Save new user (Team Name set to empty initially or default)
                app.state.user = {
                    name: name,
                    password: pass,
                    teamName: name, // Default Team Name is Username
                    team: [{ id: Date.now(), name: name }],
                    isLoggedIn: true
                };
                app.saveState();
                alert(`Registrierung erfolgreich! Willkommen, ${name}. ✨`);
                this.closeOverlay();
                app.cloud.init();
            } else {
                // Login Check
                const useTeam = document.getElementById('useTeamSync').checked;
                const teamInput = document.getElementById('authTeam').value.trim();

                // If team sync is active, team key is REQUIRED. If not, use username.
                if (useTeam && !teamInput) {
                    alert("Bitte Team-Namen eingeben oder Haken entfernen.");
                    return;
                }

                const teamToUse = useTeam ? teamInput : name;

                if (app.state.user && app.state.user.name === name) {
                    // Update Team Name on Login
                    app.state.user.teamName = teamToUse;

                    // LEGACY MIGRATION
                    if (!app.state.user.password && pass) {
                        app.state.user.password = pass;
                        app.state.user.isLoggedIn = true;
                        app.saveState();
                        alert(`Passwort festgelegt. ✅\nTeam: ${teamToUse}`);
                        this.closeOverlay();
                        return;
                    }

                    if (app.state.user.password === pass) {
                        app.state.user.isLoggedIn = true;
                        app.saveState();
                        this.closeOverlay();
                        app.cloud.init();
                    } else {
                        alert("Falsches Passwort! Zugriff verweigert. 🔒");
                    }
                } else {
                    alert("Benutzername nicht gefunden. Bitte registrieren.");
                }
            }
        },
        closeOverlay() {
            document.getElementById('loginOverlay').classList.add('hidden');
            app.user.updateHeader();
        }
    },

    // --- USER MODULE (Profile UI) ---
    user: {
        updateHeader() {
            const n = document.getElementById('headerUserName');
            if (n) n.textContent = app.state.user.name || 'Gast';
            const ava = document.getElementById('headerUserAvatar');
            if (ava && app.state.user.name) ava.innerHTML = `<img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${app.state.user.name}" alt="User">`;
        },
        upgradeToPro() {
            app.state.user.isPro = true;
            app.saveState();
            this.applyProStatus();
            if (typeof confetti === 'function') {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#8b5cf6', '#d946ef', '#3b82f6']
                });
            }
        },
        applyProStatus() {
            const banner = document.getElementById('proUpgradeBanner');
            const badge = document.getElementById('proBadge');
            const sLabel = document.getElementById('settingsProLabel');
            const sContainer = document.getElementById('settingsProUpgradeContainer');
            const tCard = document.getElementById('toolsProCard');
            const mSupport = document.getElementById('menuSupportItem');

            if (app.state.user.isPro) {
                if (banner) banner.classList.add('hidden');
                if (badge) badge.classList.remove('hidden');
                if (sLabel) sLabel.innerHTML = '👑 TASKFORCE PRO ACTIVE';
                if (sContainer) sContainer.classList.add('hidden');
                if (tCard) tCard.classList.add('hidden');
                if (mSupport) {
                    mSupport.innerHTML = '<i data-lucide="heart" class="text-danger"></i> Support (Pro Aktiv)';
                    mSupport.onclick = () => app.navigateTo('settings');
                }
            } else {
                if (banner) banner.classList.add('hidden');
                if (badge) badge.classList.add('hidden');
                if (sLabel) sLabel.innerHTML = 'STANDARD VERSION';
                if (sContainer) sContainer.classList.remove('hidden');
                if (tCard) tCard.classList.add('hidden');
                if (mSupport) {
                    mSupport.innerHTML = '<i data-lucide="heart" class="text-danger"></i> Support & Pro';
                    mSupport.onclick = () => app.navigateTo('settings');
                }
            }
            if (window.lucide) lucide.createIcons();
        }
    },

    // --- TEAM MODULE ---
    team: {
        addMember(name) {
            if (!name) return;
            app.state.user.team.push({ id: Date.now(), name: name });
            app.saveState();
            this.render();
        },
        render() {
            const list = document.getElementById('teamMembersList');
            if (!list) return;
            if (!app.state.user.team || app.state.user.team.length === 0) {
                list.innerHTML = '<span class="text-muted text-sm">Noch keine Teammitglieder.</span>';
            } else {
                list.innerHTML = app.state.user.team.map(m => `
                    <div class="team-member-chip">
                        <div class="team-avatar">${m.name ? m.name.substring(0, 2).toUpperCase() : '??'}</div>
                        ${m.name}
                    </div>
                 `).join('');
            }

            const tasks = document.getElementById('teamTasksList');
            if (tasks) {
                tasks.innerHTML = (app.state.user.team && app.state.user.team.length) ? app.state.user.team.map(m => `
                    <div class="task-item">
                        <div style="display:flex;align-items:center;gap:10px;">
                             <div class="team-avatar" style="width:20px;height:20px;font-size:0.6rem;">${m.name.substring(0, 2)}</div>
                             <span class="text-muted">Aufgabe für ${m.name}...</span>
                        </div>
                    </div>
                 `).join('') : '<div class="text-muted text-sm">Füge Mitglieder hinzu, um Aufgaben zu teilen.</div>';
            }
        }
    },

    // --- NAVIGATION ---
    toggleSidebar() {
        this.isSidebarOpen = !this.isSidebarOpen;
        const sb = document.getElementById('mainSidebar');
        const closeBtn = document.getElementById('sidebarCloseBtn');
        if (!sb) return;

        if (this.isSidebarOpen) {
            sb.classList.remove('hidden'); // Remove hidden to show
            // Small delay to allow display:block to apply before transition
            setTimeout(() => sb.classList.add('open'), 10);

            if (closeBtn) closeBtn.style.display = 'block';
        } else {
            sb.classList.remove('open');
            // Wait for transition to finish before hiding
            setTimeout(() => {
                if (!this.isSidebarOpen) sb.classList.add('hidden');
            }, 300);

            if (closeBtn) closeBtn.style.display = 'none';
        }
    },

    setupNavigation() {
        document.querySelectorAll('.nav-item, .nav-item-mobile').forEach(i => {
            i.addEventListener('click', () => {
                const page = i.getAttribute('data-page');
                if (page) this.navigateTo(page);
            });
        });
    },

    navigateTo(page, skipHistory = false) {
        this.state.currentPage = page;
        document.querySelectorAll('.view-section').forEach(v => v.classList.add('hidden'));

        const target = document.getElementById(`view-${page}`);
        if (target) target.classList.remove('hidden');
        else {
            // Fallback
            const db = document.getElementById('view-dashboard');
            if (db) db.classList.remove('hidden');
        }

        // Update Nav Active State
        document.querySelectorAll('.nav-item, .nav-item-mobile').forEach(i => {
            if (i.getAttribute('data-page') === page) i.classList.add('active');
            else i.classList.remove('active');
        });

        // Push to browser history (unless we're navigating via back button)
        if (!skipHistory) {
            window.history.pushState({ page: page }, '', '');
        }

        if (page === 'calendar') app.calendar.render();
        if (page === 'team') app.team.render();
        if (page === 'health') app.health.render();
        if (page === 'contacts') app.contacts.render();
        if (page === 'shopping') app.shopping.render();
        if (page === 'settings') {
            app.settings.render();
            app.settings.initPayPal();
        }
    },

    // --- SHOPPING MODULE (NEW) ---
    shopping: {
        currentFilter: 'shopping',
        toggleUrgency(id) { const t = app.state.tasks.find(x => x.id === id); if (t) { t.urgent = !t.urgent; app.saveState(); this.render(); app.renderDashboard(); } },
        toggle(id) { const t = app.state.tasks.find(x => x.id === id); if (t) { t.done = !t.done; app.saveState(); this.render(); app.renderDashboard(); if (t.done) app.gamification.addXP(50); } },
        delete(id) {
            if (confirm("Artikel löschen?")) {
                const t = app.state.tasks.find(x => x.id === id);
                if (t) {
                    if (!app.state.archives) app.state.archives = [];
                    app.state.archives.push({ ...t, archivedAt: new Date().toISOString(), type: 'shopping' });
                }
                app.state.tasks = app.state.tasks.filter(x => x.id !== id);
                app.saveState();
                this.render();
                app.renderDashboard();
            }
        },
        filter(t) { this.currentFilter = t; this.render(); },
        render() {
            const l = document.getElementById('shoppingListContainer'); if (!l) return;
            let f = app.state.tasks.filter(t => t.category === 'shopping' && !t.done);

            // Additional Filter
            if (this.currentFilter === 'urgent') {
                f = f.filter(t => t.urgent);
            }

            f.sort((a, b) => (a.urgent === b.urgent) ? 0 : a.urgent ? -1 : 1);

            if (f.length === 0) {
                l.innerHTML = '<div class="text-muted text-sm" style="text-align:center; padding:40px 20px; background:rgba(255,255,255,0.02); border-radius:16px; border:1px dashed rgba(255,255,255,0.05);">Keine Einträge.</div>';
            } else {
                l.innerHTML = `<div style="display:flex; flex-direction:column; gap:8px; background:rgba(0,0,0,0.2); padding:10px; border-radius:16px; border:1px solid rgba(255,255,255,0.05);">
                    ${f.map(t => `
                    <div class="task-item" style="display:flex; align-items:center; gap:12px; padding:12px 16px; background:rgba(34, 197, 94, 0.08); border-radius:12px; border:1px solid rgba(34, 197, 94, 0.2); transition:all 0.2s; ${t.urgent ? 'border-color:rgba(239, 68, 68, 0.5); background:rgba(239, 68, 68, 0.1);' : ''}">
                        <div class="checkbox-circle" onclick="app.shopping.toggle(${t.id})" style="flex-shrink:0; cursor:pointer;"></div>
                        
                        <div style="flex:1; display:flex; flex-direction:column; min-width:0;">
                            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                                <span style="font-weight:600; color:white; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                                    ${t.title}
                                </span>
                                ${t.urgent ? `<span style="display:inline-block; padding:2px 8px; background:rgba(239, 68, 68, 0.3); color:#ff6b6b; border-radius:6px; font-size:0.65rem; font-weight:700;">🔥 Dringend</span>` : ''}
                                ${t.isShared ? `<span class="badge-${t.type || 'team'}" style="font-size:0.65rem;">${t.type === 'team' ? 'Team' : (t.type === 'public' ? 'Öffentlich' : 'Geteilt')}</span>` : ''}
                            </div>
                        </div>

                        <button class="btn" onclick="event.stopPropagation(); app.shopping.toggleUrgency(${t.id}); app.shopping.render();" title="Dringend" style="flex-shrink:0; background:${t.urgent ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255,255,255,0.05)'}; border:1px solid ${t.urgent ? 'rgba(239, 68, 68, 0.6)' : 'rgba(255,255,255,0.1)'}; color:${t.urgent ? '#ff6b6b' : 'var(--text-muted)'}; width:36px; height:36px; border-radius:8px; display:flex; align-items:center; justify-content:center; cursor:pointer;">
                            <i data-lucide="flame" size="16"></i>
                        </button>

                        <button class="btn" onclick="app.shopping.delete(${t.id})" title="Löschen" style="flex-shrink:0; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:var(--text-muted); width:36px; height:36px; border-radius:8px; display:flex; align-items:center; justify-content:center; cursor:pointer;">
                            <i data-lucide="trash-2" size="16"></i>
                        </button>
                    </div>`).join('')}
                </div>`;
            }

            // Render active class on tabs
            document.querySelectorAll('.shopping-filter-btn').forEach(b => {
                if (b.getAttribute('data-filter') === this.currentFilter) b.classList.add('active');
                else b.classList.remove('active');
            });

            if (window.lucide) lucide.createIcons();
        }
    },

    // --- MEETING NOTES MODULE (NEW) ---
    meetings: {
        add() {
            app.modals.open('addMeeting');
        },
        showAll() {
            app.modals.open('viewMeetings');
        },
        save(data) {
            if (!app.state.meetings) app.state.meetings = [];

            // If editing existing
            if (data.id) {
                const idx = app.state.meetings.findIndex(m => m.id === data.id);
                if (idx !== -1) app.state.meetings[idx] = data;
            } else {
                data.id = Date.now();
                app.state.meetings.push(data);
            }

            app.saveState();
            this.render();
            app.modals.close();
            app.renderDashboard();
        },
        delete(id) {
            if (confirm("Protokoll löschen?")) {
                app.state.meetings = app.state.meetings.filter(m => m.id !== id);
                app.saveState();
                this.render();
                app.renderDashboard();
                // If in modal, refresh or close?
                const modal = document.getElementById('viewMeetingsList');
                if (modal) {
                    // Hacky refresh of modal
                    app.modals.open('viewMeetings');
                }
            }
        },
        render() {
            const p = document.getElementById('meetingsPreview');
            const s = document.getElementById('meetingsStats');

            if (!app.state.meetings) app.state.meetings = [];
            const recent = app.state.meetings.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);

            if (s) {
                s.textContent = `${app.state.meetings.length} Protokolle`;
            }

            if (p) {
                if (recent.length === 0) {
                    p.innerHTML = `<div class="text-muted text-sm" style="padding: 20px; text-align: center;">
                                    <i data-lucide="clipboard-x" size="24" style="opacity: 0.3; margin-bottom: 5px;"></i>
                                    <div>Keine Protokolle</div>
                                    <div class="text-xs" style="opacity:0.6;">Dokumentiere Meetings!</div>
                                </div>`;
                } else {
                    p.innerHTML = recent.map(m => `
                        <div class="card" style="padding:10px; margin:0; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.05); cursor:pointer;" onclick="app.meetings.showAll()">
                            <div style="font-weight:600; font-size:0.9rem;">${m.title}</div>
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <div class="text-xs text-muted">${new Date(m.date).toLocaleDateString()}</div>
                                <div class="text-xs text-muted" style="display:flex;gap:4px;"><i data-lucide="users" size="10"></i> ${m.attendees ? m.attendees.split(',').length : 0}</div>
                            </div>
                        </div>
                    `).join('');
                }
            }
            if (window.lucide) lucide.createIcons();
        }
    },

    // --- MEAL PLANNER MODULE (NEW) ---
    meals: {
        save(dayIndex, text) {
            if (!app.state.meals) app.state.meals = new Array(7).fill('');
            app.state.meals[dayIndex] = text;
            app.saveState();
        },
        get(dayIndex) {
            if (!app.state.meals) app.state.meals = new Array(7).fill('');
            return app.state.meals[dayIndex] || '';
        }
    },

    // --- CALENDAR & EVENTS ---
    calendar: {
        currentViewDate: new Date(),
        currentFilter: 'all', // Add filter state
        dashboardEventFilter: 'all', // Dashboard filter state
        toggleUrgency(id) {
            const e = app.state.events.find(x => x.id === id);
            if (e) {
                e.urgent = !e.urgent;
                app.saveState();
                this.render();
                app.renderDashboard();
            }
        },
        filterByCategory(category) {
            this.currentFilter = category;
            this.render();
        },
        dashboardFilter(category) {
            this.dashboardEventFilter = category;

            // Update button styles
            const buttons = ['All', 'Today', 'Private', 'Business'];
            buttons.forEach(btn => {
                const el = document.getElementById(`dashboardFilter${btn}Btn`);
                if (el) {
                    if (btn.toLowerCase() === category || (btn === 'All' && category === 'all')) {
                        el.style.background = 'var(--primary)';
                    } else {
                        el.style.background = '';
                    }
                }
            });

            app.renderDashboard();
        },
        init() {
            this.render();
            setInterval(() => this.checkUrgency(), 30000);
            setInterval(() => this.archiveOldEvents(), 60000); // Check every minute
            this.checkUrgency();
            this.archiveOldEvents(); // Run on init
        },
        changeMonth(dir) {
            this.currentViewDate.setMonth(this.currentViewDate.getMonth() + dir);
            this.render();
        },
        addEvent(data) {
            try {
                const start = new Date(`${data.date}T${data.time}`);
                const now = new Date();

                // Validierung: Ungültiges Datum/Zeit
                if (isNaN(start.getTime())) {
                    alert("❌ Ungültiges Datum/Zeit\n\nBitte gib ein gültiges Datum und eine gültige Uhrzeit ein.");
                    return;
                }

                // Check for conflicts (same day, same time)
                const conflictingEvent = app.state.events.find(e => {
                    if (e.id === app.editingId) return false; // Skip if editing
                    const eStart = new Date(e.start);
                    const startTime = start.getTime();
                    const eStartTime = eStart.getTime();
                    const timeDiffMins = Math.abs(startTime - eStartTime) / (1000 * 60);
                    const sameDay = start.toDateString() === eStart.toDateString();
                    return sameDay && timeDiffMins < 60; // Conflict if within 60 mins and same day
                });

                if (conflictingEvent && !app.editingId) {
                    const confirmAdd = confirm(
                        `⚠️ Terminkonflikt erkannt!\n\n` +
                        `Es existiert bereits ein Termin:\n` +
                        `"${conflictingEvent.title}"\n\n` +
                        `Möchtest du diesen Termin trotzdem hinzufügen?`
                    );
                    if (!confirmAdd) return;
                }

                // Validierung: Termin in der Vergangenheit (nur für neue Termine)
                if (!app.editingId && start < now) {
                    const diffMinutes = Math.floor((now - start) / 1000 / 60);
                    const timeStr = start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                    const dateStr = start.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

                    alert(
                        `⏰ Termin liegt in der Vergangenheit!\n\n` +
                        `Gewählte Zeit: ${dateStr} um ${timeStr}\n` +
                        `Das war vor ${diffMinutes} Minuten.\n\n` +
                        `Bitte wähle eine Zeit in der Zukunft.`
                    );
                    return;
                }

                if (app.editingId) {
                    const idx = app.state.events.findIndex(e => e.id === app.editingId);
                    if (idx !== -1) {
                        app.state.events[idx] = {
                            ...app.state.events[idx],
                            title: data.title,
                            start: start.toISOString(),
                            location: data.location,
                            phone: data.phone,
                            email: data.email,
                            notes: data.notes, // Update notes
                            urgent: data.urgent,
                            isShared: data.isShared,
                            type: data.type,
                            category: data.category || 'private' // Add category to edited events
                        };
                    }
                    app.editingId = null;
                } else {
                    app.state.events.push({
                        id: Date.now(),
                        title: data.title,
                        start: start.toISOString(),
                        location: data.location || '',
                        phone: data.phone || '',
                        email: data.email || '',
                        notes: data.notes || '', // Add notes
                        urgent: data.urgent || false,
                        isShared: data.isShared || false,
                        type: data.type || 'private',
                        category: data.category || 'private' // 'private' or 'business'
                    });
                    app.gamification.addXP(30);
                }
                app.state.events.sort((a, b) => new Date(a.start) - new Date(b.start));
                app.saveState();
                this.render();
                app.renderDashboard();
            } catch (e) { console.error("Add Event Error", e); }
        },
        editEvent(id) {
            const e = app.state.events.find(x => x.id === id);
            if (!e) return;
            app.editingId = id;
            const d = new Date(e.start);
            app.modals.open('addEvent', {
                title: e.title,
                date: d.toISOString().slice(0, 10),
                time: d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
                location: e.location,
                phone: e.phone,
                email: e.email,
                notes: e.notes,
                urgent: e.urgent,
                category: e.category || 'private'
            });
        },
        calculateDailyRoute() {
            const today = new Date().setHours(0, 0, 0, 0);
            const routeEvents = app.state.events.filter(e => {
                const ed = new Date(e.start).setHours(0, 0, 0, 0);
                return ed === today && e.location && e.location.trim().length > 0;
            });
            if (routeEvents.length < 1) { alert("Keine Termine mit Ort für heute gefunden."); return; }
            routeEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

            const destinations = routeEvents.map(e => encodeURIComponent(e.location)).join('/');
            window.open(`https://www.google.com/maps/dir/Current+Location/${destinations}`, '_blank');
        },
        checkUrgency() {
            const now = new Date();
            app.state.events.forEach(e => {
                const start = new Date(e.start);
                const diffMins = (start - now) / 1000 / 60;

                // Blinking Logic
                const isImminent = (diffMins > -15 && diffMins < 30) || (e.urgent && diffMins > -60 && diffMins < 120);

                // Calendar view
                const el = document.getElementById(`event-card-${e.id}`);
                if (el) {
                    if (isImminent) el.classList.add('event-imminent'); else el.classList.remove('event-imminent');
                    if (e.urgent) el.classList.add('event-urgent');
                }

                // Automatic alarm before event (user-configurable)
                const reminderMinutes = parseInt(app.state.ui.eventReminderMinutes || 60);

                // Fix: Trigger if we are within the reminder timeframe (e.g. < 60 mins) and haven't notified yet.
                // This catches cases where the app was closed during the exact "60 minute" mark.
                if (diffMins > 0 && diffMins <= reminderMinutes) {
                    // Check if we already sent notification for this event
                    if (!e.notified1Hour) {
                        e.notified1Hour = true;
                        app.saveState();

                        // Send notification
                        const eventTime = start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

                        // Dynamic Time Text calculation
                        let timeText = "";
                        const hours = Math.floor(diffMins / 60);
                        const mins = Math.round(diffMins % 60);

                        if (hours > 0) {
                            timeText = `${hours} Std. ${mins > 0 ? mins + ' Min.' : ''}`;
                        } else {
                            timeText = `${mins} Minuten`;
                        }

                        app.notifications.send(
                            `⏰ Termin in ${timeText}`,
                            `${e.title} um ${eventTime}${e.location ? ' • ' + e.location : ''}`,
                            true
                        );

                        // Optional: Trigger alarm sound
                        if (app.alarms && app.alarms.trigger) {
                            app.alarms.trigger(`Termin: ${e.title}`, 'gentle');
                        }
                    }
                }

                // Reset notification flag if event is far enough away
                if (diffMins > (reminderMinutes + 60) && e.notified1Hour) {
                    e.notified1Hour = false;
                    app.saveState();
                }
            });

            // Dashboard appointments blinking
            this.updateDashboardBlinking();
        },
        updateDashboardBlinking() {
            // Check if ANY event is imminent/urgent
            const now = new Date();
            const hasUrgent = app.state.events.some(e => {
                const diffMins = (new Date(e.start) - now) / 1000 / 60;
                return (diffMins > -15 && diffMins < 60) || e.urgent;
            });

            const dashCard = document.getElementById('dashboardEventsCard');
            if (dashCard) {
                if (hasUrgent) {
                    // Apply user's chosen blink style (default to standard)
                    const style = app.state.ui.blinkStyle || 'standard';
                    dashCard.classList.add('appointment-imminent');

                    // Remove old animation classes first
                    dashCard.classList.remove('blink-standard', 'blink-flash', 'blink-neon', 'blink-shake', 'blink-extreme', 'blink-rainbow');

                    // Add new animation class
                    dashCard.classList.add(`blink-${style}`);
                } else {
                    dashCard.classList.remove('appointment-imminent', 'blink-standard', 'blink-flash', 'blink-neon', 'blink-shake', 'blink-extreme', 'blink-rainbow');
                }
            }
        },
        archiveOldEvents() {
            const now = new Date();
            // Archive all events that are in the past (started)
            const toArchive = app.state.events.filter(e => new Date(e.start) < now);

            if (toArchive.length > 0) {
                if (!app.state.archives) app.state.archives = [];
                app.state.archives.push(...toArchive.map(e => ({ ...e, archivedAt: now.toISOString(), type: 'event' })));

                // Keep only future events
                app.state.events = app.state.events.filter(e => new Date(e.start) >= now);

                app.saveState();
                console.log(`Archived ${toArchive.length} old events`);
                this.render();
                app.renderDashboard();
            }
        },
        deleteEvent(id) {
            if (confirm("Termin wirklich löschen?")) {
                const e = app.state.events.find(x => x.id === id);
                if (e) {
                    if (!app.state.archives) app.state.archives = [];
                    app.state.archives.push({ ...e, archivedAt: new Date().toISOString(), type: 'event_deleted' });
                }
                app.state.events = app.state.events.filter(e => e.id !== id);
                app.saveState();
                this.render();
                app.renderDashboard();
            }
        },
        render() {
            const grid = document.getElementById('calendarGrid');
            const label = document.getElementById('calMonthDisplay');

            if (!grid || !label) return;

            const mn = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
            label.textContent = `${mn[this.currentViewDate.getMonth()]} ${this.currentViewDate.getFullYear()}`;

            grid.innerHTML = '';
            const y = this.currentViewDate.getFullYear();
            const m = this.currentViewDate.getMonth();
            const startOffset = (new Date(y, m, 1).getDay() || 7) - 1;

            // Empty cells for offset
            for (let i = 0; i < startOffset; i++) {
                grid.innerHTML += '<div class="calendar-day empty"></div>';
            }

            const today = new Date();
            const dim = new Date(y, m + 1, 0).getDate();

            // Render days
            for (let d = 1; d <= dim; d++) {
                const cell = document.createElement('div');
                cell.className = 'calendar-day';
                if (app.state.ui.dashboardMode === 'private') cell.classList.add('mode-private-cal');

                // Highlight today
                if (today.getDate() === d && today.getMonth() === m && today.getFullYear() === y) {
                    cell.classList.add('today');
                }

                // Find events for this day (including archives)
                const allPossibleEvents = [...app.state.events, ...(app.state.archives || [])];
                let dayEvents = allPossibleEvents.filter(e => {
                    const eventDate = new Date(e.start);
                    return eventDate.getDate() === d && eventDate.getMonth() === m && eventDate.getFullYear() === y;
                });

                // Apply category filter
                if (this.currentFilter !== 'all') {
                    dayEvents = dayEvents.filter(e => (e.category || 'private') === this.currentFilter);
                }

                // Build day content
                let dayContent = `<div class="day-number">${d}</div>`;

                // Add event markers
                if (dayEvents.length > 0) {
                    dayContent += '<div class="event-markers">';
                    dayEvents.forEach(ev => {
                        const eventTime = new Date(ev.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                        const typeTag = ev.isShared ? `<span style="font-size:0.6rem; opacity:0.8; margin-left:4px; font-weight:800;">(${ev.type === 'team' ? 'T' : (ev.type === 'public' ? 'Ö' : 'G')})</span>` : '';
                        const categoryIndicator = ev.category === 'business'
                            ? `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#22c55e; margin-right:4px; margin-left:2px;"></span>`
                            : `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#a78bfa; margin-right:4px; margin-left:2px;"></span>`;
                        dayContent += `<div class="event-marker ${ev.urgent ? 'urgent' : ''}" style="display:flex; align-items:center;" title="${ev.title} - ${eventTime} (${ev.category === 'business' ? 'Business' : 'Privat'})">${categoryIndicator}${ev.title}${typeTag}</div>`;
                    });
                    dayContent += '</div>';
                }

                cell.innerHTML = dayContent;

                // Click handler: Open form with pre-filled date
                cell.onclick = () => {
                    app.editingId = null;
                    const dateStr = `${y}-${(m + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
                    app.modals.open('addEvent', { date: dateStr });
                };

                grid.appendChild(cell);
            }

            this.checkUrgency();
            if (window.lucide) lucide.createIcons();
        }
    },

    // --- DASHBOARD & HELPERS ---
    renderDashboard() {
        // Archive old events before rendering
        if (this.calendar && this.calendar.archiveOldEvents) {
            this.calendar.archiveOldEvents();
        }

        // Apply Card Visibility
        if (this.dashboard && this.dashboard.applyVisibility) {
            this.dashboard.applyVisibility();
        }

        // Render AI Insights
        if (this.ai && this.ai.renderInsights) {
            this.ai.renderInsights();
        }

        // Events (Hero)
        const dp = document.getElementById('dashboardEventsPreview');
        if (dp) {
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

            let up = app.state.events
                .filter(e => new Date(e.start) >= startOfToday)
                .sort((a, b) => new Date(a.start) - new Date(b.start))
                .slice(0, 5);

            // Apply dashboard filter
            if (app.calendar.dashboardEventFilter && app.calendar.dashboardEventFilter !== 'all') {
                if (app.calendar.dashboardEventFilter === 'today') {
                    // Show only today's events
                    up = up.filter(e => {
                        const eventDate = new Date(e.start);
                        return eventDate >= startOfToday && eventDate <= endOfToday;
                    });
                } else {
                    // Filter by category (private/business)
                    up = up.filter(e => (e.category || 'private') === app.calendar.dashboardEventFilter);
                }
            }

            if (up.length > 0) {
                dp.innerHTML = up.map((e, index) => {
                    const start = new Date(e.start);
                    const timeStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const diffMins = Math.floor((start - now) / 1000 / 60);

                    // Date Label
                    const isToday = start.toDateString() === now.toDateString();
                    const tom = new Date(now); tom.setDate(now.getDate() + 1);
                    const isTomorrow = start.toDateString() === tom.toDateString();
                    const dateLabel = isToday ? 'Heute' : (isTomorrow ? 'Morgen' : start.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }));

                    // Countdown Label
                    let countdown = "";
                    if (diffMins === 0) countdown = "jetzt";
                    else if (diffMins > 0) {
                        if (diffMins < 60) countdown = `in ${diffMins} Min.`;
                        else if (diffMins < 1440) { // Less than 24 hours
                            const h = Math.floor(diffMins / 60);
                            const m = diffMins % 60;
                            countdown = `in ${h} Std.${m > 0 ? ` ${m}m` : ""}`;
                        } else { // More than 24 hours
                            const days = Math.floor(diffMins / 1440);
                            const h = Math.floor((diffMins % 1440) / 60);
                            countdown = `in ${days} Tg.${h > 0 ? ` ${h}h` : ""}`;
                        }
                    } else {
                        const absM = Math.abs(diffMins);
                        if (absM < 60) countdown = `vor ${absM} Min.`;
                        else if (absM < 1440) countdown = `vor ${Math.floor(absM / 60)} Std.`;
                        else countdown = `vor ${Math.floor(absM / 1440)} Tg.`;
                    }

                    const categoryBadge = e.category === 'business'
                        ? `<span style="padding: 2px 6px; background: rgba(34, 197, 94, 0.15); color: #22c55e; border-radius: 4px; font-size: 0.65rem; font-weight: 700; border: 1px solid rgba(34, 197, 94, 0.2); white-space: nowrap;">Business</span>`
                        : `<span style="padding: 2px 6px; background: rgba(139, 92, 246, 0.15); color: #a78bfa; border-radius: 4px; font-size: 0.65rem; font-weight: 700; border: 1px solid rgba(139, 92, 246, 0.2); white-space: nowrap;">Privat</span>`;

                    return `
                        <div style="display: flex; flex-direction: column; padding: 12px; margin-bottom: 8px; background: rgba(255,255,255,0.04); border-radius: 12px; border: 1px solid ${e.urgent || (diffMins > -15 && diffMins < 30) ? '#06b6d4' : 'rgba(255,255,255,0.08)'}; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.1); ${e.urgent || (diffMins > -15 && diffMins < 30) ? 'animation: pulse-turquoise 2s infinite;' : ''}" onclick="app.calendar.editEvent(${e.id})">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 6px;">
                                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                    <div style="background: var(--surface); padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 0.9rem; color: #ffffff; white-space: nowrap;">${timeStr}</div>
                                    <div style="font-size: 0.95rem; font-weight: 600; color: #ffffff; line-height: 1.2; word-break: break-word;">${e.title}${e.urgent ? ' <span class="text-danger">🔥</span>' : ''}</div>
                                </div>
                                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                                    ${categoryBadge}
                                    <div style="font-size: 0.7rem; color: ${diffMins > -15 && diffMins < 30 ? '#06b6d4' : 'var(--text-muted)'}; font-weight: 600; white-space: nowrap;">${countdown}</div>
                                </div>
                            </div>
                            
                            <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center; font-size: 0.8rem; color: var(--text-muted);">
                                <div style="display: flex; align-items: center; gap: 4px;">
                                    <div style="text-transform: uppercase; font-size: 0.7rem; font-weight: 600; opacity: 0.8;">${dateLabel}</div>
                                    ${e.location ? `<span style="opacity: 0.5;">•</span> <div style="display: flex; align-items: center; gap: 4px; word-break: break-word; white-space: normal;">${e.location}</div>` : ''}
                                </div>
                                
                                ${(e.location || e.phone || e.email) ? `<div style="flex: 1; min-width: 10px;"></div>` : ''}
                                
                                <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                                     ${e.location ? `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.location)}" target="_blank" onclick="event.stopPropagation()" style="padding: 4px 8px; background: rgba(255,255,255,0.05); border-radius: 6px; color: var(--text-secondary); text-decoration: none; display: flex; align-items: center; justify-content: center;"><i data-lucide="map" size="12"></i></a>` : ''}
                                     ${e.phone ? `<a href="tel:${e.phone}" onclick="event.stopPropagation()" style="padding: 4px 8px; background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.2); border-radius: 6px; color: #22c55e; text-decoration: none; display: flex; align-items: center; gap: 4px;"><i data-lucide="phone" size="12"></i></a>` : ''}
                                     ${e.email ? `<a href="mailto:${e.email}" onclick="event.stopPropagation()" style="padding: 4px 8px; background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.2); border-radius: 6px; color: #3b82f6; text-decoration: none; display: flex; align-items: center; gap: 4px;"><i data-lucide="mail" size="12"></i></a>` : ''}
                                </div>
                            </div>
                        </div>
                        </div>
                     `;
                }).join('');
            } else {
                dp.innerHTML = '<div class="text-muted text-sm" style="padding:20px; text-align:center;">Keine anstehenden Termine.<br><span style="opacity:0.6">Tippe auf "Neu", um zu planen.</span></div>';
            }
        }
        // Tasks (Count View)
        const prev = document.getElementById('dashboardTaskPreview');
        if (prev) {
            const openTasks = app.state.tasks.filter(t => !t.done && t.category !== 'shopping');
            prev.innerHTML = `
                <div style="text-align:center; padding:5px;">
                    <div class="card-value" style="font-size: 3rem; line-height: 1.2;">${openTasks.length}</div>
                    <div class="text-muted text-sm">Aufgaben</div>
                </div>
            `;
        }
        // Expenses & Chart
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1));
        startOfWeek.setHours(0, 0, 0, 0);
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const startOfYear = new Date(new Date().getFullYear(), 0, 1);

        let sumW = 0, sumM = 0, sumY = 0;
        const expenses = app.state.expenses || [];

        expenses.forEach(e => {
            const d = new Date(e.date);
            if (d >= startOfWeek) sumW += e.amount;
            if (d >= startOfMonth) sumM += e.amount;
            if (d >= startOfYear) sumY += e.amount;
        });

        const elM = document.getElementById('dashFinMonth');
        const elW = document.getElementById('dashFinWeek');
        const elY = document.getElementById('dashFinYear');

        if (elM) elM.textContent = sumM.toFixed(0) + '€';
        if (elW) elW.textContent = sumW.toFixed(0) + '€';
        if (elY) elY.textContent = sumY.toFixed(0) + '€';

        // Finance Budget Overview Update
        const budget = app.state.monthlyBudget || 2000;
        const remaining = budget - sumM;
        const budgetPercent = Math.min((sumM / budget) * 100, 100);

        const dfB = document.getElementById('dashFinBudget');
        const dfR = document.getElementById('dashFinRemaining');
        const dfBar = document.getElementById('dashFinBudgetBar');

        if (dfB) dfB.textContent = budget.toFixed(0) + '€';
        if (dfR) {
            dfR.textContent = remaining.toFixed(0) + '€';
            dfR.style.color = remaining >= 0 ? 'var(--success)' : 'var(--danger)';
        }
        if (dfBar) {
            dfBar.style.width = budgetPercent + '%';
            // Scale color from green to red based on budget usage
            if (budgetPercent > 90) dfBar.style.background = 'var(--danger)';
            else if (budgetPercent > 70) dfBar.style.background = '#f59e0b'; // Amber
            else dfBar.style.background = 'linear-gradient(90deg, #10b981, #059669)';
        }

        // Shopping List Preview (Count View)
        const shopPreview = document.getElementById('dashboardShoppingPreview');
        if (shopPreview) {
            const shopTasks = app.state.tasks.filter(t => !t.done && t.category === 'shopping');
            const hasUrgent = shopTasks.some(t => t.urgent);
            shopPreview.innerHTML = `
                <div style="text-align:center; padding:5px;">
                    <div class="card-value ${hasUrgent ? 'blink-urgent' : ''}" style="font-size: 3rem; line-height: 1.2; border-radius:50%; width:60px; height:60px; display:flex; align-items:center; justify-content:center; margin:0 auto;">${shopTasks.length}</div>
                    <div class="text-muted text-sm">${hasUrgent ? '🔥 ' : ''}Artikel</div>
                </div>
             `;
        }

        // Habits Checklist Preview
        const habPreview = document.getElementById('dashboardHabitsPreview');
        if (habPreview && app.state.habits) {
            const today = new Date();
            const dayOfWeek = today.getDay(); // 0-6
            const todayStr = today.toISOString().split('T')[0];

            // Filter habits for today (if days specified)
            const todayHabits = app.state.habits.filter(h => {
                if (!h.days || h.days.length === 0) return true;
                return h.days.includes(dayOfWeek);
            });

            if (todayHabits.length > 0) {
                const completedCount = todayHabits.filter(h => h.history && h.history.includes(todayStr)).length;
                const habitProgress = Math.min((completedCount / todayHabits.length) * 100, 100);
                const allDone = habitProgress === 100;

                let habitsHtml = `
                    <div style="width:100%;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <span class="text-xs text-muted" style="text-transform:uppercase;">Tages-Fortschritt</span>
                            <span class="text-xs" style="font-weight:bold; color:${allDone ? 'var(--success)' : 'var(--primary)'}">${completedCount}/${todayHabits.length}</span>
                        </div>
                        <div class="habit-progress-container" style="margin-bottom:15px; height:10px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);">
                            <div class="habit-progress-bar" style="width: ${habitProgress}%; background: ${allDone ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, var(--primary), var(--accent))'}; box-shadow: ${allDone ? '0 0 10px rgba(16,185,129,0.4)' : 'none'};"></div>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:10px;">
                `;

                habitsHtml += todayHabits.filter(h => !(h.history && h.history.includes(todayStr))).map(h => {
                    const isDone = false; // They are all not done because we filtered
                    return `
                        <div style="display:flex; align-items:center; justify-content:space-between; transition: all 0.3s; ${isDone ? 'opacity: 0.5;' : ''}" class="habit-checklist-item">
                            <div style="display:flex; align-items:center; gap:12px; flex:1; cursor:pointer;" onclick="event.stopPropagation(); app.habits.toggleToday(${h.id})">
                                <div class="checkbox-circle ${isDone ? 'checked' : ''}" style="width:22px; height:22px; flex-shrink:0; display:flex; align-items:center; justify-content:center;">
                                    ${isDone ? '<i data-lucide="check" size="14" style="color:white"></i>' : ''}
                                </div>
                                <div style="display:flex; flex-direction:column;">
                                    <span style="${isDone ? 'text-decoration:line-through; color:var(--text-muted);' : 'font-weight:600; font-size:1rem;'}">${h.name}</span>
                                    <div style="display:flex; align-items:center; gap:6px;">
                                        ${h.time ? `<span class="text-xs text-muted"><i data-lucide="clock" size="10" style="vertical-align:middle;"></i> ${h.time}</span>` : ''}
                                        ${h.urgent && !isDone ? '<span class="text-xs" style="color:var(--danger); font-weight:bold;">🔥 Wichtig</span>' : ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');

                habitsHtml += `</div></div>`;
                habPreview.innerHTML = habitsHtml;
                habPreview.style.display = 'block';
            } else {
                habPreview.innerHTML = '<div style="text-align:center; padding:20px;"><i data-lucide="check-circle" class="text-success" size="32"></i><p class="text-success text-sm" style="margin-top:10px;">Alle Habits für heute erledigt!<br>Super Leistung!</p></div>';
            }
        }

        // Health Dashboard Summary - Interactive Water Card
        const todayStr = new Date().toISOString().split('T')[0];
        const waterToday = (app.state.healthData || [])
            .filter(d => d.type === 'water' && d.date === todayStr)
            .reduce((sum, d) => sum + d.value, 0);

        const waterGoal = app.state.hydrationGoal || 2.5;
        const waterPercent = Math.min((waterToday / waterGoal) * 100, 100);

        const healthPreview = document.getElementById('dashboardHealthPreview');
        if (healthPreview) {
            healthPreview.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; gap:10px; padding:10px;">
                    <button onclick="event.stopPropagation(); app.health.quickAddWater()" 
                            style="background:rgba(59, 130, 246, 0.1); border:1px solid rgba(59, 130, 246, 0.3); cursor:pointer; width:80px; height:80px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:2.5rem; transition:all 0.2s; filter:drop-shadow(0 0 15px rgba(59, 130, 246, 0.3));"
                            onmouseover="this.style.transform='scale(1.1)'; this.style.background='rgba(59, 130, 246, 0.2)';" 
                            onmouseout="this.style.transform='scale(1)'; this.style.background='rgba(59, 130, 246, 0.1)';"
                            title="Klicken um 0.25L hinzuzufügen">
                        💧
                    </button>
                    <div style="width:100%; background:rgba(255,255,255,0.1); height:8px; border-radius:4px; overflow:hidden;">
                        <div style="width:${waterPercent}%; height:100%; background:linear-gradient(90deg, #3b82f6, #06b6d4); transition:width 0.5s ease;"></div>
                    </div>
                    <div class="text-sm text-muted">${waterToday.toFixed(2)}L / ${waterGoal}L</div>
                </div>
            `;
        }

        // Update Urgency Blinking
        // Status Text Update
        const statusText = document.getElementById('statusSummaryText');
        if (statusText) {
            const openTasks = app.state.tasks.filter(t => !t.done).length;
            const urgentTasks = app.state.tasks.filter(t => !t.done && t.urgent).length;
            statusText.innerHTML = `<span class="text-primary">${openTasks} Offen</span> • <span class="text-danger">${urgentTasks} Dringend</span>`;
        }

        // --- DASHBOARD CARD URGENCY BLINKING & STYLING ---
        const toggleCardBlink = (id, condition) => {
            const el = document.getElementById(id);
            if (el) {
                // Remove all styles first
                el.classList.remove('blink-urgent', 'blink-danger', 'blink-warning', 'blink-style-standard', 'blink-style-flash', 'blink-style-neon', 'blink-style-shake', 'blink-style-extreme', 'blink-style-rainbow');

                if (condition) {
                    const style = app.state.ui.blinkStyle || 'standard';
                    // Add specific style class
                    el.classList.add(`blink-style-${style}`);
                    // Also add generic danger for good measure/fallbacks if needed, though specific style handles animation
                    el.classList.add('blink-danger');
                }
            }
        };

        // 1. Tasks
        const hasUrgentTasks = app.state.tasks.some(t => !t.done && t.category !== 'shopping' && t.urgent);
        toggleCardBlink('dashboardTasksCard', hasUrgentTasks);

        const tasksCard = document.getElementById('dashboardTasksCard');
        if (tasksCard) {
            tasksCard.onclick = () => { app.tasks.filter('todo'); app.navigateTo('tasks'); };
        }

        // 2. Shopping
        const hasUrgentShopping = app.state.tasks.some(t => !t.done && t.category === 'shopping' && t.urgent);
        toggleCardBlink('dashboardShoppingCard', hasUrgentShopping);

        const shopCard = document.getElementById('dashboardShoppingCard');
        if (shopCard) {
            shopCard.onclick = () => { app.navigateTo('shopping'); };
        }

        // 3. Communications (Check Calendar for keywords: Anruf, Call, Telefon)
        const todayEvents = app.state.events.filter(e => e.start.startsWith(todayStr));
        const hasImportantCall = todayEvents.some(e => {
            const txt = (e.title + ' ' + (e.notes || '')).toLowerCase();
            return txt.includes('anruf') || txt.includes('call') || txt.includes('telefon') || txt.includes('wichtig');
        });
        toggleCardBlink('dashboardCommunicationCard', hasImportantCall);

        // 3b. Events (Urgent or Approaching within 1h)
        const nowMsEvents = Date.now();
        const oneHourEvents = 60 * 60 * 1000;
        const hasUrgentEvt = (app.state.events || []).some(e => {
            // Urgent flag and not too old (e.g. up to 1h past start)
            if (e.urgent && new Date(e.start).getTime() > nowMsEvents - oneHourEvents) return true;

            // Approaching within 1 hour
            const diff = new Date(e.start).getTime() - nowMsEvents;
            return diff > 0 && diff < oneHourEvents;
        });
        toggleCardBlink('dashboardEventsCard', hasUrgentEvt);

        // 4. Finance (Colors instead of blinking)
        const finCard = document.getElementById('dashboardFinanceCard');
        const finTitle = finCard ? finCard.querySelector('.card-title') : null;
        if (finCard) {
            finCard.classList.remove('border-yellow', 'border-red', 'blink-urgent', 'blink-warning', 'blink-danger');

            // Reset Icon (remove warning if exists)
            if (finTitle) {
                const warningIcon = finTitle.querySelector('.fin-warning-icon');
                if (warningIcon) warningIcon.remove();
            }

            // Priority 1: Critical Budget Usage (> 85%)
            if (budgetPercent > 85) {
                finCard.classList.add('blink-danger');
                // Add Icon
                if (finTitle) {
                    finTitle.innerHTML += ` <i data-lucide="alert-triangle" class="fin-warning-icon text-danger" style="margin-left:5px;"></i>`;
                }
            }
            // Priority 2: Warning Budget Usage (> 50%)
            else if (budgetPercent > 50) {
                finCard.classList.add('blink-warning');
            }
            // Priority 3: Check for specific urgent items if budget is fine
            else {
                const hasUrgentExpense = (app.state.expenses || []).some(e => e.urgent);
                if (hasUrgentExpense) finCard.classList.add('blink-urgent');
            }
        }

        // 4. Health
        // "Vitalität soll wenn es über eine stunde nicht getrunken worden ist soll rat erscheinen"
        // Check time since last drink
        const nowMs = Date.now();
        const waterEntries = (app.state.healthData || [])
            .filter(d => d.type === 'water')
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        const lastDrinkTime = waterEntries.length > 0 ? new Date(waterEntries[0].timestamp).getTime() : 0;
        const timeSinceDrink = nowMs - lastDrinkTime;
        const oneHourMs = 60 * 60 * 1000;

        // Critical: No drink for > 1 Hour AND it is daytime (08:00 - 22:00)
        const currentHour = new Date().getHours();
        const isDaytime = currentHour >= 8 && currentHour <= 22;
        const hydrationCritical = isDaytime && (timeSinceDrink > oneHourMs);

        const healthCard = document.getElementById('dashboardHealthCard');
        if (healthCard) {
            healthCard.classList.remove('blink-urgent', 'blink-danger');

            if (hydrationCritical) {
                healthCard.classList.add('blink-danger'); // "soll rot erscheinen"
            } else {
                const hasUrgentHealth = (app.state.healthData || []).some(e => e.urgent);
                if (hasUrgentHealth) healthCard.classList.add('blink-urgent');
            }
        }

        // 5. Habits
        const hasUrgentHabits = (app.state.habits || []).some(h => h.urgent);
        toggleCardBlink('dashboardHabitsCard', hasUrgentHabits);



        // 6. Alarms Preview
        const alarmPreview = document.getElementById('dashboardAlarmsPreview');
        if (alarmPreview && app.state.alarms) {
            const activeAlarms = app.state.alarms.filter(a => a.active);
            if (activeAlarms.length > 0) {
                alarmPreview.innerHTML = activeAlarms.map(a => {
                    const daysLabels = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
                    const daysStr = a.days.length === 7 ? 'Täglich' : (a.days.length === 5 && !a.days.includes(0) && !a.days.includes(6) ? 'Mo-Fr' : a.days.map(d => daysLabels[d]).join(', '));
                    return `
                        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:8px 12px; border-radius:8px; border:1px solid rgba(59, 130, 246, 0.2);">
                            <div>
                                <div style="font-weight:bold; font-size:1rem;">${a.time}</div>
                                <div class="text-xs text-muted">${a.title || 'Wecker'} • ${daysStr}</div>
                            </div>
                            <i data-lucide="bell" size="14" class="text-primary"></i>
                        </div>
                    `;
                }).join('');
            } else {
                alarmPreview.innerHTML = '<div class="text-muted text-sm">Alle Wecker sind aus.</div>';
            }
        }
        toggleCardBlink('dashboardAlarmsCard', (app.state.alarms || []).some(a => a.active));

        // Update layout toggle button text
        const layoutBtnText = document.getElementById('layoutToggleText');
        if (layoutBtnText) {
            const currentLayout = app.state.dashboardLayout || 'double';
            layoutBtnText.textContent = currentLayout === 'single' ? '1 Spalte' : '2 Spalten';
        }

        if (this.shortcuts && this.shortcuts.render) this.shortcuts.render();
        if (this.contacts && this.contacts.renderQuick) this.contacts.renderQuick();
        if (this.quickNotes && this.quickNotes.render) this.quickNotes.render();
        if (this.projects) this.projects.render();
        if (this.meetings) this.meetings.render();
        if (this.dashboard) {
            this.dashboard.applyOrder();
            this.dashboard.applyMode(); // Ensure mode visibility is applied
        }
        if (window.lucide) lucide.createIcons();
    },



    startClock() {
        setInterval(() => {
            const now = new Date();
            const t = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            const s = now.getSeconds().toString().padStart(2, '0');
            const ds = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

            // Hero Clock Update (Dashboard)
            const ht = document.getElementById('heroClockTime');
            if (ht) ht.textContent = t;



            const hd = document.getElementById('heroClockDay');
            if (hd) hd.textContent = now.toLocaleDateString('de-DE', { weekday: 'long' }).toUpperCase();

            const hDate = document.getElementById('heroClockDate');
            if (hDate) hDate.textContent = now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });



            const clockSidebar = document.getElementById('clockTimeSidebar');
            if (clockSidebar) clockSidebar.textContent = t;

            const dateSidebar = document.getElementById('clockDateSidebar');
            if (dateSidebar) dateSidebar.textContent = ds;

            const driveClk = document.getElementById('driveClock');
            if (driveClk) driveClk.textContent = t;

            const driveDate = document.getElementById('driveDate');
            if (driveDate) driveDate.textContent = ds;

            const d = document.getElementById('currentDateDisplay');
            if (d) d.textContent = ds;

            app.nightstand.update();

            // --- ALARM & EVENT CHECK ---
            const sec = now.getSeconds();

            // Only toggle once per minute (at 00-01 sec) to prevent multi-trigger
            if (sec < 2 && !app.activeAlarm) {
                const currentDay = now.getDay();

                // 1. Regular Alarms (Wecker)
                if (app.state.alarms) {
                    app.state.alarms.forEach(alarm => {
                        if (alarm.active && alarm.time === t) {
                            const alarmDays = alarm.days || [];
                            // If no days selected, assume one-time? Or daily? Assume one-time or daily logic if needed. 
                            // Current logic implies days must be set. Adaptation: empty = daily or today? Let's check includes.
                            // If alarm has days, check match. If empty (0 len) maybe it's daily? 
                            // Existing UI enforces days selection usually (Täglich check).
                            // Let's stick to existing logic: must start with days.
                            if (alarmDays.length === 0 || alarmDays.includes(currentDay)) {
                                console.log(`⏰ WECKER: ${alarm.title}`);
                                app.alarms.trigger(alarm.title || 'Wecker', alarm.sound);
                            }
                        }
                    });
                }

                // 2. Calendar Events (Proactive Alert)
                if (app.state.events) {
                    app.state.events.forEach(e => {
                        const evtDate = new Date(e.start);
                        const evtTimeStr = evtDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                        const evtDateStr = evtDate.toLocaleDateString('de-DE');
                        const nowDayStr = now.toLocaleDateString('de-DE');

                        if (evtTimeStr === t && evtDateStr === nowDayStr) {
                            console.log(`📅 TERMIN ALARM: ${e.title}`);
                            // Digital sound is louder/more distinct
                            const sound = e.urgent ? 'digital' : 'melody';
                            app.alarms.trigger(`${e.urgent ? '🔥 DRINGEND: ' : '📅 '}${e.title}`, sound);
                        }
                    });
                }
            }

            // --- SYSTEM NOTIFICATION CHECKS ---
            // Run every minute (when seconds are 0)
            if (now.getSeconds() === 0) {
                app.notifications.check();
            }
        }, 1000);

        // Start Weather Update Loop
        this.updateWeather();
        setInterval(() => this.updateWeather(), 600000); // Update every 10 mins
    },

    async updateWeather() {
        const weatherEl = document.getElementById('heroWeather');
        if (!weatherEl) return;

        const updateUI = (temp, code) => {
            let icon = 'cloud-sun';
            if (code === 0) icon = 'sun';
            else if (code <= 3) icon = 'cloud-sun';
            else if (code <= 48) icon = 'cloud';
            else if (code <= 67) icon = 'cloud-rain';
            else if (code <= 71) icon = 'snowflake';
            else if (code <= 77) icon = 'snowflake';
            else if (code <= 82) icon = 'cloud-rain';
            else if (code <= 99) icon = 'cloud-lightning';

            weatherEl.innerHTML = `
                 <div style="font-weight:bold; display:flex; align-items:center; gap:8px; font-size: 1.2rem;">
                    <i data-lucide="${icon}" size="20"></i> ${temp}°C
                 </div>
            `;
            if (window.lucide) lucide.createIcons();
        };

        const fetchWeatherData = async (lat, lon) => {
            try {
                const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`);
                const data = await res.json();
                if (data.current) {
                    updateUI(Math.round(data.current.temperature_2m), data.current.weather_code);
                    return true;
                }
            } catch (e) { console.error("Weather fetch failed", e); }
            return false;
        };

        const runIPFallback = async () => {
            try {
                // Try multiple IP geo services
                const services = [
                    'https://ipapi.co/json/',
                    'https://freeipapi.com/api/json'
                ];
                for (const url of services) {
                    try {
                        const r = await fetch(url);
                        const d = await r.json();
                        const lat = d.latitude || d.latitude_2m;
                        const lon = d.longitude || d.longitude_2m;
                        if (lat && lon) {
                            if (await fetchWeatherData(lat, lon)) return;
                        }
                    } catch (e) { continue; }
                }
            } catch (e) { }

            // Absolute Fallback: Berlin
            await fetchWeatherData(52.52, 13.40);
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    if (!await fetchWeatherData(pos.coords.latitude, pos.coords.longitude)) {
                        runIPFallback();
                    }
                },
                (err) => {
                    console.warn("Geolocation denied or failed, using IP fallback.");
                    runIPFallback();
                },
                { timeout: 5000 }
            );
        } else {
            runIPFallback();
        }
    },

    // --- ALARMS MODULE ---
    alarms: {
        currentAudio: null,
        loopInterval: null,
        trigger(title, type = 'melody') {
            if (this.currentAudio) return;

            console.log("ALARM TRIGGERED:", title);

            // Audio Context for Sound
            this.playAlarmSound(type);

            // Visual Overlay
            const overlay = document.createElement('div');
            overlay.id = 'alarmOverlay';
            overlay.style.cssText = 'position:fixed; inset:0; background:rgba(220, 38, 38, 0.95); z-index:99999; display:flex; flex-direction:column; align-items:center; justify-content:center; animation: flash-urgent 1s infinite;';
            overlay.innerHTML = `
                <div style="margin-bottom:20px; animation: pulse-urgent 0.5s infinite;">
                    <i data-lucide="bell-ring" size="80" style="color:white;"></i>
                </div>
                <h1 style="color:white; font-size:2.5rem; text-align:center; margin-bottom:10px; padding:0 20px;">${title}</h1>
                <p style="color:white; opacity:0.8; margin-bottom:40px;">Es ist Zeit!</p>
                <button onclick="app.alarms.stop()" style="padding:20px 60px; font-size:1.5rem; border-radius:50px; border:none; background:white; color:var(--danger); font-weight:900; cursor:pointer; box-shadow:0 10px 25px rgba(0,0,0,0.3);">STOPP</button>
             `;
            document.body.appendChild(overlay);
            if (window.lucide) lucide.createIcons();

            // Native Vibrate
            if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 1000]);
        },
        stop() {
            if (this.currentAudio) {
                this.currentAudio.stop();
                this.currentAudio = null;
            }
            if (this.loopInterval) {
                clearInterval(this.loopInterval);
                this.loopInterval = null;
            }
            const overlay = document.getElementById('alarmOverlay');
            if (overlay) overlay.remove();
            app.activeAlarm = false;
        },
        playAlarmSound(type) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;

            const ctx = new AudioContext();

            const playBeep = () => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.type = type === 'digital' ? 'square' : 'sine';
                osc.frequency.setValueAtTime(type === 'digital' ? 800 : 440, ctx.currentTime);

                gain.gain.setValueAtTime(0.5, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.5);
            };

            playBeep();

            this.loopInterval = setInterval(() => {
                if (ctx.state === 'suspended') ctx.resume();
                playBeep();
            }, 1000);

            this.currentAudio = {
                stop: () => {
                    ctx.close();
                }
            };
        }
    },



    // --- NOTIFICATIONS MODULE ---
    notifications: {
        lastCheck: 0,
        permissionAsked: false,
        async requestPermission() {
            if (!("Notification" in window)) return;
            const p = await Notification.requestPermission();
            this.permissionAsked = true;
            if (p === 'granted') {
                this.send("✅ System bereit", "Benachrichtigungen sind jetzt aktiv.");
            }
        },
        async send(title, body, isUrgent = false) {
            if (Notification.permission === 'granted') {
                // Background capable notification via Service Worker
                if ('serviceWorker' in navigator) {
                    try {
                        const reg = await navigator.serviceWorker.ready;
                        if (reg) {
                            reg.showNotification(title, {
                                body: body,
                                icon: "./icon-192.png",
                                badge: "./icon-192.png",
                                vibrate: isUrgent ? [500, 200, 500, 200, 500] : [200, 100, 200],
                                requireInteraction: isUrgent,
                                tag: isUrgent ? 'tf-urgent' : 'tf-info',
                                renotify: true
                            });
                            return;
                        }
                    } catch (e) {
                        console.error("SW Notification failed", e);
                    }
                }
                // Fallback
                new Notification(title, { body: body, icon: "./icon-192.png" });
            }
        },
        check() {
            const now = new Date();

            // 1. Check for Imminent Urgent Events (15 mins before)
            app.state.events.forEach(e => {
                const start = new Date(e.start);
                const diffMins = (start - now) / 1000 / 60;

                if (e.urgent && diffMins >= 14 && diffMins <= 15) {
                    this.send("🔥 Wichtiger Termin in 15 Min!", `${e.title} um ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, true);
                }
                if (diffMins >= -1 && diffMins <= 0) {
                    this.send("🔔 Termin Jetzt!", `${e.title} beginnt jetzt.`, true);
                }
            });

            // 2. Urgent Tasks Nudge
            if (now.getMinutes() === 0) {
                const urgentTasks = app.state.tasks.filter(t => !t.done && t.urgent);
                const urgentShop = app.state.tasks.filter(t => !t.done && t.category === 'shopping' && t.urgent);

                if (urgentTasks.length > 0) {
                    this.send("🔥 Aufgaben warten!", `Du hast ${urgentTasks.length} dringende Aufgaben offen.`, true);
                }
                if (urgentShop.length > 0) {
                    this.send("🛒 Wichtiger Einkauf!", `${urgentShop.length} dringende Artikel auf der Liste.`, true);
                }
            }
        }
    },

    // --- DRIVE ASSISTANT MODULE ---
    drive: {
        currentLocation: null,
        map: null,
        marker: null,

        init() {
            this.renderRoute();
            // Async init map to allow DOM to settle
            setTimeout(() => this.initMap(), 500);
            this.getLocation();
        },

        refresh() {
            this.getLocation();
            this.renderRoute();
            if (this.map) {
                setTimeout(() => this.map.invalidateSize(), 200);
            }
        },

        initMap() {
            const mapEl = document.getElementById('driveMap');
            if (!mapEl || this.map) return;

            // Reduce map height for better readability of data below on mobile
            mapEl.style.height = "180px";

            // Init Leaflet (Default Center: Berlin)
            this.map = L.map('driveMap').setView([52.52, 13.40], 10);

            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OpenStreetMap &copy; CartoDB',
                subdomains: 'abcd',
                maxZoom: 19
            }).addTo(this.map);

            // Force redraw
            setTimeout(() => { this.map.invalidateSize(); }, 200);
        },

        getLocation() {
            const statusEl = document.getElementById('currentLocationText');
            if (statusEl) statusEl.textContent = "Suche GPS...";

            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const lat = position.coords.latitude;
                        const lon = position.coords.longitude;
                        this.currentLocation = `${lat},${lon}`;

                        if (statusEl) statusEl.textContent = "GPS Gefunden ✅";
                        this.updateMapPosition(lat, lon);
                    },
                    (error) => {
                        console.error("GPS Error", error);
                        if (statusEl) statusEl.textContent = "Kein GPS. Bitte eingeben.";
                        this.askLocation();
                    },
                    { enableHighAccuracy: true, timeout: 10000 }
                );
            } else {
                if (statusEl) statusEl.textContent = "GPS nicht verfügbar.";
                this.askLocation();
            }
        },

        updateMapPosition(lat, lon) {
            if (!this.map) this.initMap();
            if (!this.map) return;

            const latLng = [lat, lon];

            if (this.marker) {
                this.marker.setLatLng(latLng);
            } else {
                const carIcon = L.divIcon({
                    html: '<div style="background:#3b82f6; width:20px; height:20px; border-radius:50%; border:3px solid white; box-shadow:0 0 15px #3b82f6;"></div>',
                    className: 'custom-div-icon',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                });
                this.marker = L.marker(latLng, { icon: carIcon }).addTo(this.map);
            }

            this.map.flyTo(latLng, 15);
            this.map.invalidateSize();
        },

        askLocation() {
            const loc = prompt("Wo befindest du dich gerade? (Ort/Straße)", this.currentLocation || "");
            if (loc) {
                this.currentLocation = loc;
                const statusEl = document.getElementById('currentLocationText');
                if (statusEl) statusEl.textContent = "📍 " + loc;
                this.renderRoute();
            }
        },

        renderRoute() {
            const list = document.getElementById('driveRouteList');
            if (!list) return;

            const today = new Date().setHours(0, 0, 0, 0);
            const nowTime = new Date().getTime();

            const routeEvents = app.state.events.filter(e => {
                const eventDate = new Date(e.start);
                const ed = new Date(e.start).setHours(0, 0, 0, 0);
                return ed === today &&
                    eventDate.getTime() > nowTime &&
                    e.location && e.location.trim().length > 0;
            });
            routeEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

            if (routeEvents.length === 0) {
                list.innerHTML = `<div class="card" style="background:rgba(255,255,255,0.05); text-align:center; padding:20px;">
                    <i data-lucide="calendar-off" size="32" class="text-muted"></i>
                    <p class="text-muted">Keine auswärtigen Termine für heute.</p>
                </div>`;
            } else {
                let html = '';

                // Start Point
                html += `
                <div style="display:flex; gap:15px; ">
                    <div style="display:flex; flex-direction:column; align-items:center;">
                        <div style="width:12px; height:12px; background:var(--success); border-radius:50%; margin-top:5px;"></div>
                        <div style="width:2px; flex:1; background:rgba(255,255,255,0.1);"></div>
                    </div>
                    <div style="padding-bottom:15px;">
                        <div class="text-sm text-muted">Start</div>
                        <div style="font-weight:bold;">${this.currentLocation || "Standort ermitteln..."}</div>
                    </div>
                </div>`;

                // Stops
                routeEvents.forEach((e, idx) => {
                    const isLast = idx === routeEvents.length - 1;
                    const time = new Date(e.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    html += `
                    <div style="display:flex; gap:15px;">
                        <div style="display:flex; flex-direction:column; align-items:center;">
                            <div style="width:12px; height:12px; border: 2px solid var(--primary); background:#000; border-radius:50%; margin-top:5px;"></div>
                            ${!isLast ? '<div style="width:2px; flex:1; background:rgba(255,255,255,0.1);"></div>' : ''}
                        </div>
                        <div style="padding-bottom: ${isLast ? '0' : '20px'}; flex:1;">
                            <div class="card" style="margin:0 0 15px 0; padding:20px; border-left: 4px solid var(--primary); background: rgba(255,255,255,0.05); border-radius: 16px;">
                                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                                    <span style="font-weight:800; font-size:1.1rem; color:#fff;">${e.title}</span>
                                    <span style="color: var(--primary); font-weight:bold; font-size:1rem;">${time} Uhr</span>
                                </div>
                                <div class="text-sm text-muted" style="display:flex; align-items:center; gap:8px;">
                                    <i data-lucide="map-pin" size="14"></i> <span style="font-size: 0.95rem;">${e.location}</span>
                                    <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.location)}" target="_blank" style="color: var(--primary); display:flex; align-items:center; background: rgba(255,255,255,0.1); padding: 4px; border-radius: 6px;" title="In Google Maps öffnen">
                                        <i data-lucide="external-link" size="14"></i>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>`;
                });

                list.innerHTML = html;
            }
            if (window.lucide) lucide.createIcons();
        },

        openNavigation() {
            if (!this.currentLocation) {
                alert("Bitte erst Standort festlegen!");
                this.askLocation();
                return;
            }

            const today = new Date().setHours(0, 0, 0, 0);
            const nowTime = new Date().getTime();

            const routeEvents = app.state.events.filter(e => {
                const eventDate = new Date(e.start);
                const ed = new Date(e.start).setHours(0, 0, 0, 0);
                return ed === today &&
                    eventDate.getTime() > nowTime &&
                    e.location && e.location.trim().length > 0;
            });
            routeEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

            if (routeEvents.length === 0) {
                alert("Keine Ziele für heute gefunden.");
                return;
            }

            const origin = encodeURIComponent(this.currentLocation);
            const destinations = routeEvents.map(e => encodeURIComponent(e.location)).join('/');

            window.open(`https://www.google.com/maps/dir/${origin}/${destinations}`, '_blank');
        }
    },

    // --- AI MODULE ---
    ai: {
        openQuery(initialQuery = '') {
            app.modals.open('aiChat');
            if (initialQuery) {
                setTimeout(() => {
                    const input = document.getElementById('aiChatInput');
                    if (input) {
                        input.value = initialQuery;
                        app.ai.send();
                    }
                }, 100);
            }
        },
        async send() {
            const input = document.getElementById('aiChatInput');
            const log = document.getElementById('aiChatLog');
            if (!input || !log || !input.value.trim()) return;
            const q = input.value.trim();

            const config = app.state.aiConfig;
            let apiKey = '';
            if (config.provider === 'openai') apiKey = config.openaiKey;
            else if (config.provider === 'grok') apiKey = config.grokKey;
            else if (config.provider === 'gemini') apiKey = config.geminiKey;

            if (!apiKey) {
                alert("Bitte gib erst einen API Key in den Einstellungen ein.");
                app.navigateTo('settings');
                return;
            }

            // User Message
            log.innerHTML += `<div style="text-align:right; margin:5px;"><span style="background:var(--primary); padding:8px 12px; border-radius:12px; display:inline-block;">${q}</span></div>`;
            input.value = '';
            log.scrollTop = log.scrollHeight;

            // AI Response (Simulate network delay)
            log.innerHTML += `<div id="aiTempTyping" style="text-align:left; margin:5px;"><span class="text-muted">Analysiere...</span></div>`;
            log.scrollTop = log.scrollHeight;

            // Protocol Check (CORS Warning)
            if (window.location.protocol === 'file:') {
                const typing = document.getElementById('aiTempTyping');
                if (typing) typing.remove();
                log.innerHTML += `<div style="text-align:left; margin:5px; color:var(--secondary); background: rgba(234, 179, 8, 0.1); padding: 10px; border-radius: 8px;">
                    <strong>Browser-Sicherheitshinweis:</strong><br>
                    Du öffnest die App als lokale Datei (file://). Browser blockieren hierbei oft API-Anfragen an OpenAI/Grok.<br>
                    <small>Lösung: Starte die App über einen lokalen Webserver oder verwende einen Browser ohne CORS-Einschränkungen.</small>
                </div>`;
                return;
            }

            try {
                let responseText = '';
                let res;

                if (config.provider === 'openai') {
                    res = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                        body: JSON.stringify({
                            model: 'gpt-4o-mini', // Changed to mini for better compatibility
                            messages: [{ role: 'system', content: 'Du bist TaskForce AI, ein hilfreicher Produktivitäts-Assistent.' }, { role: 'user', content: q }]
                        })
                    });
                } else if (config.provider === 'grok') {
                    res = await fetch('https://api.x.ai/v1/chat/completions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                        body: JSON.stringify({
                            model: 'grok-beta',
                            messages: [{ role: 'system', content: 'Du bist Grok, integriert in TaskForce Pro.' }, { role: 'user', content: q }]
                        })
                    });
                } else if (config.provider === 'gemini') {
                    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: q }] }]
                        })
                    });
                }

                if (!res.ok) {
                    const errorBody = await res.json();
                    console.error("API Error Response:", errorBody);
                    throw new Error(errorBody.error?.message || `HTTP Fehler ${res.status}`);
                }

                const data = await res.json();

                if (config.provider === 'openai' || config.provider === 'grok') {
                    responseText = data.choices[0].message.content;
                } else if (config.provider === 'gemini') {
                    responseText = data.candidates[0].content.parts[0].text;
                }

                const typing = document.getElementById('aiTempTyping');
                if (typing) typing.remove();

                log.innerHTML += `<div style="text-align:left; margin:5px; display:flex; gap:5px;">
                    <div style="min-width:24px; height:24px; background:var(--accent); border-radius:50%; display:flex; justify-content:center; align-items:center;"><i data-lucide="bot" size="14"></i></div>
                    <span style="background:rgba(255,255,255,0.1); padding:8px 12px; border-radius:12px; display:inline-block;">${responseText}</span>
                </div>`;
                log.scrollTop = log.scrollHeight;
                if (window.lucide) lucide.createIcons();

            } catch (e) {
                console.error("AI Error:", e);
                const typing = document.getElementById('aiTempTyping');
                if (typing) typing.remove();
                log.innerHTML += `<div style="text-align:left; margin:5px; color:var(--danger); background: rgba(239, 68, 68, 0.1); padding: 10px; border-radius: 8px;">
                    <strong>Fehler:</strong> ${e.message}<br>
                    <small>Bitte prüfe deinen API Key in den Einstellungen oder dein Guthaben.</small>
                </div>`;
            }
        },
        async analyzeState() {
            const config = app.state.aiConfig;
            let apiKey = '';
            if (config.provider === 'openai') apiKey = config.openaiKey;
            else if (config.provider === 'grok') apiKey = config.grokKey;
            else if (config.provider === 'gemini') apiKey = config.geminiKey;

            const now = new Date();
            const container = document.getElementById('aiInsightsList');

            // DIRECT REDIRECT to new Briefing Modal
            this.presentBriefing();
            return;


        },

        generateLocalBriefing() {
            // 1. Gather Data (Duplicate logic but necessary for standalone execution)
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];
            const userName = app.state.user.name || 'Chef';

            // Tasks
            const allTasks = app.state.tasks || [];
            const urgentTasks = allTasks.filter(t => !t.done && t.urgent);
            const normalTasks = allTasks.filter(t => !t.done && !t.urgent && t.category !== 'shopping');
            const shopping = allTasks.filter(t => !t.done && t.category === 'shopping');

            // Events
            const nextWeek = new Date();
            nextWeek.setDate(now.getDate() + 14);
            const events = (app.state.events || [])
                .filter(e => new Date(e.start) >= now && new Date(e.start) <= nextWeek)
                .sort((a, b) => new Date(a.start) - new Date(b.start));

            // Finance
            const expenses = app.state.expenses || [];
            const spent = expenses.filter(e => e.date === todayStr).reduce((acc, curr) => acc + curr.amount, 0);

            // Construct Briefing Text
            let html = `<h6>Hallo ${userName}, hier ist dein lokaler Status-Bericht:</h6><ul>`;
            let speech = `Hallo ${userName}. Hier ist dein Status-Bericht. `;

            // Section 1: Tasks
            if (urgentTasks.length > 0) {
                html += `<li><strong class="text-danger">Dringend:</strong> ${urgentTasks.map(t => t.title).join(', ')}</li>`;
                speech += `Achtung, du hast ${urgentTasks.length} dringende Aufgaben: ${urgentTasks.map(t => t.title).join(' und ')}. `;
            }
            if (normalTasks.length > 0) {
                html += `<li><strong>To-Dos:</strong> ${normalTasks.length} offen (${normalTasks.slice(0, 3).map(t => t.title).join(', ')}...)</li>`;
                speech += `Außerdem warten ${normalTasks.length} weitere Aufgaben auf dich. `;
            } else if (urgentTasks.length === 0) {
                html += `<li>Keine offenen Aufgaben.</li>`;
                speech += `Du hast aktuell keine offenen Aufgaben. Wunderbar. `;
            }

            if (shopping.length > 0) {
                html += `<li><strong>Einkauf:</strong> ${shopping.length} Artikel</li>`;
                speech += `Auf deiner Einkaufsliste stehen ${shopping.length} Artikel. `;
            }

            // Section 2: Events
            if (events.length > 0) {
                html += `<li><strong>Nächste Termine:</strong><ul>`;
                speech += `Kommen wir zu deinen Terminen. `;
                events.forEach(e => {
                    const d = new Date(e.start);
                    const day = d.toLocaleDateString('de-DE', { weekday: 'long' });
                    const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

                    html += `<li>${day} ${time}: ${e.title} ${e.location ? `(${e.location})` : ''}</li>`;
                    speech += `Am ${day} um ${time} Uhr ist "${e.title}" ${e.location ? 'in ' + e.location : ''}. `;
                });
                html += `</ul></li>`;
            } else {
                html += `<li>Keine Termine in den nächsten 14 Tagen.</li>`;
                speech += `Dein Kalender ist für die nächsten zwei Wochen leer. `;
            }

            // Section 3: Finance
            const monthlyBudget = app.state.monthlyBudget || 2000;
            const currentMonth = now.toISOString().slice(0, 7);
            const totalMonthSpent = expenses
                .filter(e => e.date && e.date.startsWith(currentMonth))
                .reduce((sum, e) => sum + e.amount, 0);
            const remaining = monthlyBudget - totalMonthSpent;

            html += `<li><strong>Finanzen:</strong> ${totalMonthSpent.toFixed(2)}€ / ${monthlyBudget}€ (${remaining.toFixed(2)}€ übrig)</li>`;

            if (spent > 0) {
                speech += `Heute hast du bereits ${spent.toFixed(2)} Euro ausgegeben. `;
            }
            speech += `Diesen Monat stehst du bei ${totalMonthSpent.toFixed(0)} Euro von ${monthlyBudget} Euro Budget. `;
            if (remaining < 0) speech += `Dein Budget ist überschritten! `;
            else speech += `Du hast noch ${remaining.toFixed(0)} Euro übrig. `;

            html += `</ul>`;

            // Render & Speak
            app.state.aiInsights = { date: new Date().toISOString(), text: html };
            app.saveState();
            this.renderInsights();
            this.speak(speech);
        },
        renderInsights() {
            const container = document.getElementById('aiInsightsList');
            const data = app.state.aiInsights;
            if (container) {
                if (data && data.text) {
                    container.innerHTML = `<ul style="padding-left:20px; margin:0;">${data.text}</ul>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:5px;">
                         <button onclick="app.ai.speak('${data.text.replace(/'/g, "\\'").replace(/\n/g, " ").replace(/<[^>]*>/g, "")}')" class="btn-small" title="Vorlesen"><i data-lucide="volume-2" size="14"></i></button>
                         <div class="text-xs text-muted">Stand: ${new Date(data.date).toLocaleTimeString()}</div>
                    </div>`;
                } else {
                    container.innerHTML = '<div class="text-muted text-sm">Klicke auf "Analysieren", um Tipps zu erhalten.</div>';
                }
            }
            if (window.lucide) lucide.createIcons();
        },
        speak(text) {
            if (!('speechSynthesis' in window)) {
                console.error("SpeechSynthesis not supported");
                return;
            }

            // Clean text from any possible HTML residues
            const cleanText = text.replace(/<[^>]*>/g, "").trim();
            if (!cleanText) return;

            console.log("AI Speaking:", cleanText);

            window.speechSynthesis.cancel(); // Stop current speech

            // Small delay to allow cancel to settle
            setTimeout(() => {
                const utterance = new SpeechSynthesisUtterance(cleanText);
                utterance.lang = 'de-DE';
                utterance.rate = 1.0;
                utterance.pitch = 1.0;

                // Find a good German voice
                const voices = window.speechSynthesis.getVoices();
                if (voices.length > 0) {
                    const femaleVoice = voices.find(v => v.lang.includes('de') &&
                        (v.name.includes('Female') || v.name.includes('Google') || v.name.includes('Vicki') ||
                            v.name.includes('Amelie') || v.name.includes('Marlene') || v.name.includes('Katja')));

                    if (femaleVoice) {
                        utterance.voice = femaleVoice;
                    } else {
                        const anyGerman = voices.find(v => v.lang.includes('de'));
                        if (anyGerman) utterance.voice = anyGerman;
                    }
                }

                utterance.onerror = (e) => console.error("Speech Error:", e);
                window.speechSynthesis.speak(utterance);
            }, 100);
        },

        presentBriefing() {
            try {
                // 1. Gather Data (Robustly)
                const state = app.state || {}; // Safety fallback
                const now = new Date();
                const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // 00:00 Today

                const userName = (state.user && state.user.name) ? state.user.name : 'Chef';

                // Format Date nicely
                const dateOptions = { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' };
                const timeOptions = { hour: '2-digit', minute: '2-digit' };
                const dateStr = now.toLocaleDateString('de-DE', dateOptions);
                const timeStr = now.toLocaleTimeString('de-DE', timeOptions);
                const todayStr = now.toISOString().split('T')[0];

                console.log("Briefing: State loaded", state);

                // Tasks
                const allTasks = state.tasks || [];
                // Urgent: Not done AND urgent
                const urgentTasks = allTasks.filter(t => !t.done && t.urgent);
                // Normal: Not done AND not urgent AND not shopping
                const normalTasks = allTasks.filter(t => !t.done && !t.urgent && (t.category || '').toLowerCase() !== 'shopping');
                // Shopping: Not done AND category is shopping
                const shopping = allTasks.filter(t => !t.done && (t.category || '').toLowerCase() === 'shopping');

                // Events (From Today 00:00 to +14 Days)
                const nextWeek = new Date();
                nextWeek.setDate(now.getDate() + 14);

                const events = (state.events || [])
                    .filter(e => {
                        const d = new Date(e.start);
                        return d >= todayStart && d <= nextWeek;
                    })
                    .sort((a, b) => new Date(a.start) - new Date(b.start));

                // Health (Water)
                const waterToday = (state.healthData || [])
                    .filter(d => d.type === 'water' && d.date === todayStr)
                    .reduce((sum, d) => sum + d.value, 0);
                const waterGoal = state.hydrationGoal || 2.5;

                // Habits
                const habitsToday = (state.habits || []).filter(h => !h.days || h.days.includes(now.getDay()));
                const habitsOpen = habitsToday.filter(h => !(h.history && h.history.includes(todayStr)));

                // 2. Build Speech & Modal Content
                let speech = `Guten Tag ${userName}. Hier ist dein Briefing für ${dateStr}, ${timeStr}. `;

                let html = `<div style="text-align:center; padding-bottom:15px; border-bottom:1px solid var(--border);">
                    <div style="font-size:2rem; font-weight:bold; letter-spacing:-1px;">${timeStr}</div>
                    <div style="color:var(--text-muted); text-transform:uppercase; font-size:0.8rem; letter-spacing:1px;">${dateStr}</div>
                </div>`;

                // --- EVENTS ---
                html += `<div style="margin-top:20px;">
                    <h5 style="color:var(--primary); display:flex; align-items:center; gap:8px; margin-bottom:10px; font-size:0.95rem; text-transform:uppercase; letter-spacing:0.5px;"><i data-lucide="calendar" size="16"></i> Termine & Events</h5>
                    <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:12px; padding:15px;">`;

                if (events.length > 0) {
                    speech += `Du hast ${events.length} Termine anstehen. `;
                    html += `<ul style="margin:0; padding-left:0; list-style:none;">`;
                    events.forEach(e => {
                        const d = new Date(e.start);
                        const isToday = d.toDateString() === now.toDateString();
                        const dText = isToday ? 'Heute' : d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
                        const tText = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

                        html += `<li style="display:flex; gap:10px; margin-bottom:10px; align-items:flex-start;">
                            <div style="background:rgba(59, 130, 246, 0.1); color:var(--primary); padding:4px 8px; border-radius:6px; font-size:0.85rem; font-weight:bold; min-width:60px; text-align:center;">${tText}<br><span style="font-size:0.7rem; font-weight:normal;">${dText}</span></div>
                            <div>
                                <div style="font-weight:600; line-height:1.2;">${e.title}</div>
                                ${e.location ? `<div style="font-size:0.8rem; color:var(--text-muted); display:flex; align-items:center; gap:4px; margin-top:2px;">📍 ${e.location}</div>` : ''}
                                ${e.notes ? `<div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">📝 ${e.notes}</div>` : ''}
                            </div>
                        </li>`;
                        speech += `Am ${d.toLocaleDateString('de-DE', { weekday: 'long' })} um ${tText} Uhr: ${e.title}. `;
                    });
                    html += `</ul>`;
                } else {
                    speech += `Keine Termine in den nächsten zwei Wochen. `;
                    html += `<div style="text-align:center; color:var(--text-muted); padding:10px;">Keine anstehenden Termine gefunden.</div>`;
                }
                html += `</div></div>`;

                // --- TASKS ---
                html += `<div style="margin-top:20px;">
                    <h5 style="color:var(--accent); display:flex; align-items:center; gap:8px; margin-bottom:10px; font-size:0.95rem; text-transform:uppercase; letter-spacing:0.5px;"><i data-lucide="check-circle" size="16"></i> Aufgaben</h5>
                    <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:12px; padding:15px;">`;

                if (urgentTasks.length > 0) {
                    const urgentNames = urgentTasks.map(t => t.title).join(', ');
                    speech += `Achtung, ${urgentTasks.length} dringende Aufgaben: ${urgentNames}. `;
                    html += `<div style="color:var(--danger); font-weight:bold; margin-bottom:8px; display:flex; align-items:center; gap:5px;"><i data-lucide="flame" size="14"></i> ${urgentTasks.length} Dringend</div>`;
                    html += `<ul style="margin:0; padding-left:0; list-style:none; margin-bottom:10px;">`;
                    urgentTasks.forEach(t => html += `<li style="padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.05); color:var(--danger);">${t.title}</li>`);
                    html += `</ul>`;
                }

                if (normalTasks.length > 0) {
                    const taskNames = normalTasks.map(t => t.title).join(', ');
                    speech += `Auf der To-Do Liste stehen folgende Aufgaben: ${taskNames}. `;
                    html += `<div style="font-weight:bold; margin-bottom:5px;">To-Dos (${normalTasks.length})</div>`;
                    html += `<ul style="margin:0; padding-left:0; list-style:none;">`;
                    normalTasks.forEach(t => html += `<li style="padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.05); display:flex; align-items:center; gap:6px;"><span style="width:6px; height:6px; background:var(--text-muted); border-radius:50%;"></span> ${t.title}</li>`);
                    html += `</ul>`;
                }

                if (urgentTasks.length === 0 && normalTasks.length === 0) {
                    speech += `Alle Aufgaben erledigt. `;
                    html += `<div style="text-align:center; color:var(--success); padding:10px;">Alles erledigt! ✅</div>`;
                }
                html += `</div></div>`;

                // --- SHOPPING ---
                if (shopping.length > 0) {
                    const items = shopping.map(t => t.title).join(', ');
                    speech += `Auf deiner Einkaufsliste stehen: ${items}. `;
                    html += `<div style="margin-top:20px;">
                        <h5 style="color:var(--success); display:flex; align-items:center; gap:8px; margin-bottom:10px; font-size:0.95rem; text-transform:uppercase; letter-spacing:0.5px;"><i data-lucide="shopping-cart" size="16"></i> Einkauf</h5>
                        <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:12px; padding:15px; font-size:0.9rem;">
                            ${shopping.map(t => `<span style="display:inline-block; background:rgba(34,197,94,0.1); color:var(--success); padding:2px 8px; border-radius:12px; margin:2px;">${t.title}</span>`).join('')}
                        </div>
                    </div>`;
                } else {
                    speech += `Nichts einzukaufen. `;
                }

                // --- VITALITY & HABITS ---
                html += `<div style="margin-top:20px;">
                    <h5 style="color:#3b82f6; display:flex; align-items:center; gap:8px; margin-bottom:10px; font-size:0.95rem; text-transform:uppercase; letter-spacing:0.5px;"><i data-lucide="activity" size="16"></i> Vitalität & Habits</h5>
                    <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:12px; padding:15px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; padding:8px; background:rgba(0,0,0,0.2); border-radius:8px;">
                            <div style="display:flex; align-items:center; gap:10px;">
                                <div style="width:32px; height:32px; background:rgba(59,130,246,0.2); border-radius:50%; display:flex; align-items:center; justify-content:center; color:#3b82f6;"><i data-lucide="droplet" size="16"></i></div>
                                <div>
                                    <div style="font-size:0.8rem; color:var(--text-muted);">Wasser</div>
                                    <div style="font-weight:bold;">${waterToday.toFixed(1)} / ${waterGoal} L</div>
                                </div>
                            </div>
                            <div style="font-size:1.2rem;">${waterToday >= waterGoal ? '✅' : '⏳'}</div>
                        </div>`;

                speech += `Wasserstand: ${waterToday.toFixed(1)} von ${waterGoal} Litern. `;

                if (habitsOpen.length > 0) {
                    speech += `Noch ${habitsOpen.length} Routinen offen: ${habitsOpen.map(h => h.name).join(', ')}. `;
                    html += `<div style="margin-top:10px; font-weight:bold; font-size:0.85rem; margin-bottom:5px;">Offene Routinen:</div>
                             <ul style="margin:0; padding-left:0; list-style:none; font-size:0.9rem;">${habitsOpen.map(h => `<li style="margin-bottom:4px; display:flex; align-items:center; gap:6px;"><i data-lucide="circle" size="12" class="text-muted"></i> ${h.name}</li>`).join('')}</ul>`;
                } else {
                    speech += `Alle Routinen erledigt. `;
                    html += `<div style="text-align:center; color:var(--success); font-size:0.9rem; margin-top:10px;">Alle Routinen erledigt! ✨</div>`;
                }
                html += `</div></div>`;

                // --- FINANCE ---
                const expenses = state.expenses || [];
                const currentMonth = now.toISOString().slice(0, 7);
                const totalMonthSpent = expenses
                    .filter(e => e.date && e.date.startsWith(currentMonth))
                    .reduce((sum, e) => sum + e.amount, 0);
                const monthlyBudget = state.monthlyBudget || 2000;
                const remaining = monthlyBudget - totalMonthSpent;
                const budgetPercent = Math.min(100, (totalMonthSpent / monthlyBudget) * 100);

                html += `<div style="margin-top:20px;">
                    <h5 style="color:var(--danger); display:flex; align-items:center; gap:8px; margin-bottom:10px; font-size:0.95rem; text-transform:uppercase; letter-spacing:0.5px;"><i data-lucide="wallet" size="16"></i> Finanzen & Kontrolle</h5>
                    <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:12px; padding:15px;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                            <span class="text-sm">Budgetauslastung</span>
                            <span class="text-sm font-bold" style="color: ${budgetPercent > 90 ? 'var(--danger)' : 'white'}">${totalMonthSpent.toFixed(2)}€ / ${monthlyBudget}€</span>
                        </div>
                        <div style="width:100%; height:8px; background:rgba(255,255,255,0.1); border-radius:4px; overflow:hidden; margin-bottom:10px;">
                            <div style="width:${budgetPercent}%; height:100%; background:${budgetPercent > 90 ? 'var(--danger)' : budgetPercent > 75 ? 'var(--accent)' : 'var(--success)'}; transition:width 0.5s;"></div>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div class="text-xs text-muted">Noch verfügbar:</div>
                            <div style="font-weight:bold; font-size:1.1rem; color:${remaining >= 0 ? 'var(--success)' : 'var(--danger)'};">${remaining.toFixed(2)}€</div>
                        </div>
                    </div>
                </div>`;

                speech += `Finanz-Check: Du hast diesen Monat ${totalMonthSpent.toFixed(0)} Euro ausgegeben. `;
                if (remaining < 0) {
                    speech += `Dein Budget ist bereits um ${Math.abs(remaining).toFixed(0)} Euro überschritten. `;
                } else if (remaining < monthlyBudget * 0.1) {
                    speech += `Vorsicht, dein restliches Budget beträgt nur noch ${remaining.toFixed(0)} Euro. `;
                } else {
                    speech += `Dir bleiben noch ${remaining.toFixed(0)} Euro für den Rest des Monats. `;
                }

                speech += `Das war's für heute. Viel Erfolg!`;

                // Open Modal
                if (app.modals && app.modals.open) {
                    console.log("Opening Modal with content");
                    app.modals.open('aiBriefing', { html: html, speech: speech });
                } else {
                    console.error("app.modals.open not available");
                    alert("Modal System Error");
                }

                // Keep icons working
                setTimeout(() => { if (window.lucide) lucide.createIcons(); }, 100);

                // Speak
                if ('speechSynthesis' in window) {
                    // Start speaking after modal is visible
                    setTimeout(() => app.ai.speak(speech), 800);
                }

            } catch (e) {
                console.error("Briefing Error:", e);
                alert("Fehler beim Briefing: " + e.message);
            }
        },
    },

    // --- GENERIC MODULES (Compact) ---
    tasks: {
        addInline() {
            const input = document.getElementById('inlineTaskInput');
            if (input && input.value.trim()) {
                this.add(input.value.trim(), false, 'todo');
                input.value = '';
            }
        },
        toggleUrgency(id) { const t = app.state.tasks.find(x => x.id === id); if (t) { t.urgent = !t.urgent; app.saveState(); this.render(); app.renderDashboard(); } },
        add(t, u, category = 'todo', isShared = false, type = 'private') {
            app.state.tasks.push({ id: Date.now(), title: t, urgent: u, category: category, done: false, isShared: isShared, type: type });
            app.saveState();
            this.render(); // Renders Tasks
            if (category === 'shopping' && app.shopping) app.shopping.render(); // Renders Shopping if needed
            app.renderDashboard();
        },
        toggle(id) { const t = app.state.tasks.find(x => x.id === id); if (t) { t.done = !t.done; app.saveState(); this.render(); app.renderDashboard(); if (t.done) app.gamification.addXP(50); } },
        delete(id) {
            const t = app.state.tasks.find(x => x.id === id);
            if (t) {
                if (!app.state.archives) app.state.archives = [];
                app.state.archives.push({ ...t, archivedAt: new Date().toISOString(), type: 'task' });
            }
            app.state.tasks = app.state.tasks.filter(x => x.id !== id);
            app.saveState();
            this.render();
            app.renderDashboard();
        },
        filter(t) { this.currentFilter = t; this.render(); }, currentFilter: 'todo',
        render() {
            const l = document.getElementById('taskListContainer'); if (!l) return;

            let f = app.state.tasks.filter(t => t.category !== 'shopping');

            // Strict Tasks Logic (No Shopping)
            if (this.currentFilter === 'urgent') {
                f = f.filter(t => t.urgent && !t.done);
            } else if (this.currentFilter === 'done') {
                f = f.filter(t => t.done);
            } else {
                // Default 'todo' - Show only undone
                f = f.filter(t => !t.done);
            }

            // Sort: Urgent > Pending
            f.sort((a, b) => (a.urgent === b.urgent) ? 0 : a.urgent ? -1 : 1);

            if (f.length === 0) {
                l.innerHTML = '<div class="text-muted text-sm" style="text-align:center; padding:40px 20px;">Keine Aufgaben.</div>';
            } else {
                l.innerHTML = `<div style="display:flex; flex-direction:column; gap:8px;">
                    ${f.map(t => `
                    <div style="display:flex; align-items:center; gap:12px; padding:12px 16px; background:rgba(255,255,255,0.03); border-radius:12px; border:1px solid rgba(255,255,255,0.08);">
                        <div class="checkbox-circle" onclick="app.tasks.toggle(${t.id})" style="flex-shrink:0; cursor:pointer;"></div>
                        
                        <span style="font-weight:500; color:white; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                            ${t.title}
                        </span>

                        <button class="btn" onclick="event.stopPropagation(); app.tasks.toggleUrgency(${t.id}); app.tasks.render();" title="Dringend" style="flex-shrink:0; background:${t.urgent ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255,255,255,0.05)'}; border:1px solid ${t.urgent ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255,255,255,0.1)'}; color:${t.urgent ? '#ff6b6b' : 'var(--text-muted)'}; width:36px; height:36px; border-radius:8px; display:flex; align-items:center; justify-content:center; cursor:pointer;">
                            <i data-lucide="flame" size="16"></i>
                        </button>

                        <button class="btn" onclick="app.tasks.delete(${t.id})" title="Löschen" style="flex-shrink:0; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:var(--text-muted); width:36px; height:36px; border-radius:8px; display:flex; align-items:center; justify-content:center; cursor:pointer;">
                            <i data-lucide="trash-2" size="16"></i>
                        </button>
                    </div>`).join('')}
                </div>`;
            }

            // Highlight active tab
            document.querySelectorAll('.task-filter-btn').forEach(b => {
                if (b.getAttribute('data-filter') === this.currentFilter) b.classList.add('active');
                else b.classList.remove('active');
            });

            if (window.lucide) lucide.createIcons();
        }
    },
    finance: {
        toggleUrgency(id) {
            const e = app.state.expenses.find(x => x.id === id);
            if (e) {
                e.urgent = !e.urgent;
                app.saveState();
                this.render();
                app.renderDashboard();
            }
        },
        add(a, d, dateStr, urgent = false, category = 'private', isShared = false, type = 'private') {
            app.state.expenses.push({
                id: Date.now(),
                amount: parseFloat(a),
                desc: d,
                date: dateStr || new Date().toISOString().split('T')[0],
                urgent: urgent,
                category: category,
                isShared: isShared,
                type: type
            });
            app.saveState();
            this.render();
            app.renderDashboard();
            app.gamification.addXP(25);
        },
        edit(id) {
            const e = app.state.expenses.find(x => x.id === id);
            if (!e) return;

            const newDesc = prompt("Beschreibung:", e.desc);
            if (newDesc === null) return;

            const newAmount = parseFloat(prompt("Betrag (€):", e.amount));
            if (isNaN(newAmount)) return;

            e.desc = newDesc;
            e.amount = newAmount;
            app.saveState();
            this.render();
            app.renderDashboard();
            app.navigateTo('dashboard');
        },
        delete(id) {
            if (confirm("Ausgabe wirklich löschen?")) {
                app.state.expenses = app.state.expenses.filter(e => e.id !== id);
                app.saveState();
                this.render();
                app.renderDashboard();
            }
        },
        setBudget() {
            const current = app.state.monthlyBudget || 2000;
            const newBudget = parseFloat(prompt("Monatliches Budget (€):", current));
            if (newBudget && newBudget > 0) {
                app.state.monthlyBudget = newBudget;
                app.saveState();
                this.render();
                app.renderDashboard();
                app.navigateTo('dashboard');
            }
        },
        render() {
            // Calculate time periods
            const now = new Date();
            const today = now.toISOString().split('T')[0];
            const currentMonth = now.toISOString().slice(0, 7);
            const currentYear = now.getFullYear().toString();

            // Week calculation (Monday-Sunday)
            const startOfWeek = new Date(now);
            const day = startOfWeek.getDay();
            const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
            startOfWeek.setDate(diff);
            startOfWeek.setHours(0, 0, 0, 0);

            // Calculate totals for all periods
            let totalDay = 0, totalWeek = 0, totalMonth = 0, totalYear = 0;

            app.state.expenses.forEach(e => {
                const expDate = new Date(e.date);
                const amount = e.amount;

                if (e.date === today) totalDay += amount;
                if (expDate >= startOfWeek) totalWeek += amount;
                if (e.date.startsWith(currentMonth)) totalMonth += amount;
                if (e.date.startsWith(currentYear)) totalYear += amount;
            });

            // Budget
            const budget = app.state.monthlyBudget || 2000;
            const remaining = budget - totalMonth;

            // Update summary cards
            const updateSummary = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.textContent = value.toFixed(2) + '€';
            };

            updateSummary('financeDay', totalDay);
            updateSummary('financeWeek', totalWeek);
            updateSummary('financeMonth', totalMonth);
            updateSummary('financeYear', totalYear);
            updateSummary('financeBudget', budget);
            updateSummary('financeRemaining', remaining);

            // Update remaining color
            const remEl = document.getElementById('financeRemaining');
            if (remEl) {
                remEl.style.color = remaining >= 0 ? 'var(--success)' : 'var(--danger)';
            }

            // Chart Update
            const c = document.getElementById('expenseChart');
            if (c && window.Chart) {
                if (this.chartInstance) this.chartInstance.destroy();
                this.chartInstance = new Chart(c, {
                    type: 'doughnut',
                    data: {
                        labels: ['Ausgegeben', 'Übrig'],
                        datasets: [{
                            data: [totalMonth, Math.max(0, remaining)],
                            backgroundColor: ['#ef4444', '#10b981'],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        cutout: '70%',
                        plugins: {
                            legend: { display: false },
                            tooltip: { enabled: true }
                        }
                    }
                });
            }

            // List View with Edit/Delete Toolbar
            const l = document.getElementById('expenseHistory');
            if (l) {
                const sorted = app.state.expenses.slice().sort((a, b) => new Date(b.date) - new Date(a.date));

                if (sorted.length === 0) {
                    l.innerHTML = '<div class="text-muted text-sm">Noch keine Ausgaben erfasst.</div>';
                } else {
                    l.innerHTML = sorted.map(e => {
                        const d = new Date(e.date).toLocaleDateString('de-DE');
                        return `<div class="expense-entry ${e.urgent ? 'blink-urgent' : ''}">
                            <div style="flex:1;">
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <button class="btn-toggle-urgent ${e.urgent ? 'is-urgent' : ''}" onclick="app.finance.toggleUrgency(${e.id})" title="Wichtig"><i data-lucide="flame" size="14"></i></button>
                                    <div>
                                        <div style="font-weight:600;">${e.desc}</div>
                                        <div style="display:flex; align-items:center; gap:5px; margin-top:2px;">
                                            <div class="text-sm text-muted">${d}</div>
                                            ${e.isShared ? `<span class="badge-${e.type || 'shared'}" style="font-size:0.65rem; padding:1px 6px;">${e.type || 'Shared'}</span>` : ''}
                                            ${e.category && e.category !== 'private' ? `<span class="badge-business" style="font-size:0.65rem; padding:1px 6px;">${e.category}</span>` : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div style="display:flex; align-items:center; gap:10px;">
                                <span style="color:var(--danger); font-weight:700; font-size:1.1rem;">-${e.amount.toFixed(2)}€</span>
                                <div class="event-edit-toolbar" style="display:flex; gap:4px;">
                                    <button class="btn-small btn-edit" onclick="app.finance.edit(${e.id})" title="Bearbeiten">
                                        <i data-lucide="pencil" size="14"></i>
                                    </button>
                                    <button class="btn-small btn-delete" onclick="app.finance.delete(${e.id})" title="Löschen">
                                        <i data-lucide="trash" size="14"></i>
                                    </button>
                                </div>
                            </div>
                        </div>`;
                    }).join('');
                }
            }
            if (window.lucide) lucide.createIcons();
        }
    },
    habits: {
        toggleUrgency(id) {
            const h = app.state.habits.find(x => x.id === id);
            if (h) {
                h.urgent = !h.urgent;
                app.saveState();
                this.render();
            }
        },
        add() {
            app.modals.open('addHabit');
        },
        increment(id) {
            const h = app.state.habits.find(x => x.id === id);
            if (h) {
                h.streak++;
                app.gamification.addXP(10);
                app.saveState();
                this.render();
                app.renderDashboard();
            }
        },
        toggleToday(id) {
            const h = app.state.habits.find(x => x.id === id);
            if (!h) return;
            if (!h.history) h.history = [];

            const today = new Date().toISOString().split('T')[0];
            const idx = h.history.indexOf(today);

            if (idx === -1) {
                h.history.push(today);
                h.streak++;
                app.gamification.addXP(20);
                // Trigger confetti if all today's habits done
                const todayHabits = app.state.habits.filter(hab => !hab.days || hab.days.length === 0 || hab.days.includes(new Date().getDay()));
                const allDone = todayHabits.every(hab => hab.history && hab.history.includes(today));
                if (allDone) app.gamification.triggerConfetti();
            } else {
                h.history.splice(idx, 1);
                if (h.streak > 0) h.streak--;
            }

            app.saveState();
            this.render();
            app.renderDashboard();
        },
        decrement(id) {
            const h = app.state.habits.find(x => x.id === id);
            if (h && h.streak > 0) {
                h.streak--;
                app.saveState();
                this.render();
            }
        },
        render() {
            const g = document.getElementById('habitsGrid');
            if (!g) return;
            g.innerHTML = app.state.habits.map(h => {
                const progress = h.goal ? Math.min((h.streak / h.goal) * 100, 100) : 0;
                const daysLabels = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
                const daysString = h.days && h.days.length > 0 ? h.days.map(d => daysLabels[d]).join(', ') : 'Täglich';

                return `
                    <div class="card ${h.urgent ? 'blink-urgent' : ''}">
                        <div class="card-header">
                            <div>
                                <span class="card-title">${h.name}</span>
                                <div class="text-xs text-muted">${daysString} ${h.time ? '• ' + h.time : ''}</div>
                            </div>
                            <button class="btn-toggle-urgent ${h.urgent ? 'is-urgent' : ''}" onclick="event.stopPropagation(); app.habits.toggleUrgency(${h.id})"><i data-lucide="flame" size="14"></i></button>
                        </div>
                        <div class="card-value">${h.streak} 🔥</div>
                        <div class="text-muted text-sm">Ziel: ${h.goal || 30} Tage</div>
                        <div class="habit-progress-container">
                            <div class="habit-progress-bar" style="width: ${progress}%"></div>
                        </div>
                        <div class="habit-controls">
                            <button class="habit-btn decrement" onclick="event.stopPropagation(); app.habits.decrement(${h.id})">−</button>
                            <button class="habit-btn increment" onclick="event.stopPropagation(); app.habits.increment(${h.id})">+</button>
                        </div>
                        <button class="btn btn-primary" style="width:100%; margin-top:10px;" onclick="app.habits.toggleToday(${h.id})">
                            Heute erledigt?
                        </button>
                    </div>
                `;
            }).join('');
            if (window.lucide) lucide.createIcons();
        }
    },
    health: {
        toggleUrgency(id) { const e = app.state.healthData.find(x => x.id === id); if (e) { e.urgent = !e.urgent; app.saveState(); this.render(); } },
        add() {
            const type = prompt("Typ (wasser/schritte/schlaf/gewicht):", "wasser");
            if (!type) return;

            let value, reminder;
            if (type === "wasser") {
                value = parseFloat(prompt("Wasser in Liter:", "0.25")) || 0.25;
                reminder = confirm("Möchtest du eine Erinnerung für regelmäßiges Trinken?");
                this.addWater(value, reminder);
            } else if (type === "schritte") {
                value = parseInt(prompt("Anzahl Schritte:", "1000")) || 1000;
                this.addSteps(value);
            } else if (type === "schlaf") {
                value = parseFloat(prompt("Schlaf in Stunden:", "8")) || 8;
                reminder = confirm("Möchtest du eine Erinnerung für Schlafenszeit?");
                this.addSleep(value, reminder);
            } else if (type === "gewicht") {
                value = parseFloat(prompt("Gewicht in kg:", "70")) || 70;
                reminder = confirm("Möchtest du eine wöchentliche Erinnerung?");
                this.addWeight(value, reminder);
            }
            app.navigateTo('dashboard');
        },
        lastWaterReminder: null,
        hydrationCheckInterval: null,

        init() {
            // Initialize hydration tracking
            if (!app.state.hydrationGoal) app.state.hydrationGoal = 2.5; // Default 2.5L
            if (!app.state.hydrationReminderInterval) app.state.hydrationReminderInterval = 120; // Default 2 hours in minutes
            if (!app.state.hydrationReminderMethod) app.state.hydrationReminderMethod = 'popup'; // popup, sound, blink

            // Start hydration monitoring
            this.startHydrationMonitoring();

            // Start weekly weight reminder
            this.startWeightReminder();
        },

        startWeightReminder() {
            // Check once per day
            setInterval(() => {
                this.checkWeightReminder();
            }, 24 * 60 * 60 * 1000); // Every 24 hours

            // Check immediately
            this.checkWeightReminder();
        },

        checkWeightReminder() {
            if (!app.state.weightReminderEnabled) return;

            const now = new Date();
            const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
            const reminderDay = app.state.weightReminderDay || 1; // Default Monday

            // Check if today is the reminder day
            if (dayOfWeek !== reminderDay) return;

            // Check if already weighed this week
            const today = now.toISOString().split('T')[0];
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
            weekStart.setHours(0, 0, 0, 0);

            const weightThisWeek = (app.state.healthData || [])
                .filter(d => d.type === 'weight')
                .filter(d => new Date(d.timestamp) >= weekStart);

            // If no weight entry this week, remind
            if (weightThisWeek.length === 0) {
                // Check if we already reminded today
                if (app.state.lastWeightReminder === today) return;

                this.triggerWeightReminder();
                app.state.lastWeightReminder = today;
                app.saveState();
            }
        },

        triggerWeightReminder() {
            const method = app.state.hydrationReminderMethod || 'popup';

            if (method === 'popup' || method === 'all') {
                if (Notification.permission === 'granted') {
                    new Notification('⚖️ Wiegen nicht vergessen!', {
                        body: 'Zeit für deine wöchentliche Gewichtskontrolle!',
                        icon: '⚖️'
                    });
                } else {
                    alert('⚖️ Wiegen nicht vergessen! Zeit für deine wöchentliche Gewichtskontrolle!');
                }
            }

            if (method === 'blink' || method === 'all') {
                const healthCard = document.querySelector('#dashboardHealthCard');
                if (healthCard) {
                    healthCard.classList.add('blink-urgent');
                    setTimeout(() => healthCard.classList.remove('blink-urgent'), 10000);
                }
            }
        },
        startHydrationMonitoring() {
            // Clear existing interval
            if (this.hydrationCheckInterval) {
                clearInterval(this.hydrationCheckInterval);
            }

            // Check every minute
            this.hydrationCheckInterval = setInterval(() => {
                this.checkHydrationReminder();
            }, 60000); // Every minute

            // Check immediately
            this.checkHydrationReminder();
        },

        checkHydrationReminder() {
            if (!app.state.hydrationReminderEnabled) return;

            const now = Date.now();
            const intervalMs = (app.state.hydrationReminderInterval || 120) * 60 * 1000;

            // Find last water entry
            const waterEntries = (app.state.healthData || [])
                .filter(d => d.type === 'water')
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            const lastEntry = waterEntries[0];
            const lastTime = lastEntry ? new Date(lastEntry.timestamp).getTime() : 0;
            const timeSinceLastDrink = now - lastTime;

            // Check if reminder needed
            if (timeSinceLastDrink >= intervalMs) {
                // Check if we already reminded recently (don't spam)
                if (!this.lastWaterReminder || (now - this.lastWaterReminder) >= intervalMs) {
                    this.triggerHydrationReminder();
                    this.lastWaterReminder = now;
                }
            }
        },

        triggerHydrationReminder() {
            const method = app.state.hydrationReminderMethod || 'popup';

            if (method === 'popup' || method === 'all') {
                if (Notification.permission === 'granted') {
                    new Notification('💧 Trink Wasser!', {
                        body: 'Es ist Zeit, etwas zu trinken!',
                        icon: '💧'
                    });
                } else {
                    alert('💧 Trink Wasser! Es ist Zeit, etwas zu trinken!');
                }
            }

            if (method === 'sound' || method === 'all') {
                // Play notification sound
                const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGWi77eafTRAMUKfj8LZjHAY4ktfyzHksBSR3x/DdkEAKFF606+uoVRQKRp/g8r5sIQUrgs7y2Yk2CBlou+3mn00QDFCn4/C2YxwGOJLX8sx5LAUkd8fw3ZBAC');
                audio.play().catch(() => { });
            }

            if (method === 'blink' || method === 'all') {
                // Add blinking effect to health card
                const healthCard = document.querySelector('[data-card="health"]');
                if (healthCard) {
                    healthCard.classList.add('blink-urgent');
                    setTimeout(() => healthCard.classList.remove('blink-urgent'), 10000);
                }
            }
        },

        addReminder(data) {
            if (!app.state.healthReminders) app.state.healthReminders = [];

            app.state.healthReminders.push({
                id: Date.now(),
                name: data.name,
                type: data.type, // medication, vitamin, water
                time: data.time,
                repeat: data.repeat, // daily, weekly, custom
                stock: data.stock || 0,
                notes: data.notes || '',
                enabled: true,
                created: new Date().toISOString()
            });

            app.saveState();
            this.render();
        },

        deleteReminder(id) {
            if (confirm('Erinnerung wirklich löschen?')) {
                app.state.healthReminders = (app.state.healthReminders || []).filter(r => r.id !== id);
                app.saveState();
                this.render();
            }
        },

        toggleReminder(id) {
            const reminder = (app.state.healthReminders || []).find(r => r.id === id);
            if (reminder) {
                reminder.enabled = !reminder.enabled;
                app.saveState();
                this.render();
            }
        },

        updateStock(id, amount) {
            const reminder = (app.state.healthReminders || []).find(r => r.id === id);
            if (reminder) {
                reminder.stock = Math.max(0, (reminder.stock || 0) + amount);
                app.saveState();
                this.render();
            }
        },

        addWater(liters, reminder = false) {
            if (!app.state.healthData) app.state.healthData = [];
            const today = new Date().toISOString().split('T')[0];

            app.state.healthData.push({
                id: Date.now(),
                type: 'water',
                value: liters,
                date: today,
                timestamp: new Date().toISOString(),
                reminder: reminder
            });

            app.saveState();
            this.render();
            app.renderDashboard();

            // Reset reminder timer
            this.lastWaterReminder = Date.now();
        },
        quickAddWater() {
            // Quick add 0.25L (one glass)
            this.addWater(0.25);

            // Visual feedback
            const btn = event.target;
            if (btn) {
                btn.style.transform = 'scale(1.3)';
                setTimeout(() => btn.style.transform = 'scale(1)', 200);
            }
        },
        addSteps(steps) {
            if (!app.state.healthData) app.state.healthData = [];
            const today = new Date().toISOString().split('T')[0];

            app.state.healthData.push({
                id: Date.now(),
                type: 'steps',
                value: steps,
                date: today,
                timestamp: new Date().toISOString()
            });

            app.saveState();
            this.render();
            app.renderDashboard();
        },
        addSleep(hours, reminder = false) {
            if (!app.state.healthData) app.state.healthData = [];
            const today = new Date().toISOString().split('T')[0];

            app.state.healthData.push({
                id: Date.now(),
                type: 'sleep',
                value: hours,
                date: today,
                timestamp: new Date().toISOString(),
                reminder: reminder
            });

            app.saveState();
            this.render();
            app.renderDashboard();

            if (reminder) {
                alert('✅ Erinnerung aktiviert! Du wirst täglich um 22:00 Uhr ans Schlafen erinnert.');
            }
        },
        addWeight(kg, reminder = false) {
            if (!app.state.healthData) app.state.healthData = [];
            const today = new Date().toISOString().split('T')[0];

            app.state.healthData.push({
                id: Date.now(),
                type: 'weight',
                value: kg,
                date: today,
                timestamp: new Date().toISOString(),
                reminder: reminder
            });

            app.saveState();
            this.render();
            app.renderDashboard();

            if (reminder) {
                alert('✅ Erinnerung aktiviert! Du wirst wöchentlich ans Wiegen erinnert.');
            }
        },
        toggleUrgency(id) {
            const item = app.state.healthData.find(x => x.id === id);
            if (item) {
                item.urgent = !item.urgent;
                app.saveState();
                this.render();
            }
        },
        edit(id) {
            const item = app.state.healthData.find(x => x.id === id);
            if (!item) return;

            const newValue = parseFloat(prompt(`Neuer Wert:`, item.value));
            if (!isNaN(newValue)) {
                item.value = newValue;
                app.saveState();
                this.render();
                app.navigateTo('dashboard');
            }
        },
        delete(id) {
            if (confirm('Eintrag wirklich löschen?')) {
                app.state.healthData = app.state.healthData.filter(x => x.id !== id);
                app.saveState();
                this.render();
            }
        },
        render() {
            if (!app.state.healthData) app.state.healthData = [];
            const today = new Date().toISOString().split('T')[0];

            // Water today
            const waterToday = app.state.healthData
                .filter(d => d.type === 'water' && d.date === today)
                .reduce((sum, d) => sum + d.value, 0);
            const waterGoal = app.state.waterGoal || 2.5;

            const waterEl = document.getElementById('healthWaterToday');
            if (waterEl) waterEl.textContent = waterToday.toFixed(2) + 'L';

            const waterGoalEl = document.getElementById('healthWaterGoal');
            if (waterGoalEl) waterGoalEl.textContent = waterGoal + 'L';

            const waterBarEl = document.getElementById('healthWaterProgress');
            if (waterBarEl) waterBarEl.style.width = Math.min((waterToday / waterGoal) * 100, 100) + '%';

            // Steps today
            const stepsToday = app.state.healthData
                .filter(d => d.type === 'steps' && d.date === today)
                .reduce((sum, d) => sum + d.value, 0);
            const stepsEl = document.getElementById('healthStepsToday');
            if (stepsEl) stepsEl.textContent = stepsToday.toLocaleString();

            // Sleep last night
            const sleepData = app.state.healthData
                .filter(d => d.type === 'sleep')
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
            const sleepEl = document.getElementById('healthSleepToday');
            if (sleepEl) sleepEl.textContent = sleepData ? sleepData.value + 'h' : '0h';

            // Latest weight
            const weightData = app.state.healthData
                .filter(d => d.type === 'weight')
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
            const weightEl = document.getElementById('healthWeightLatest');
            if (weightEl) weightEl.textContent = weightData ? weightData.value + 'kg' : '--kg';

            // History
            const historyEl = document.getElementById('healthHistory');
            if (historyEl) {
                const recent = app.state.healthData
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                    .slice(0, 10);

                if (recent.length === 0) {
                    historyEl.innerHTML = '<div class="text-muted text-sm">Keine Einträge vorhanden.</div>';
                } else {
                    historyEl.innerHTML = recent.map(d => {
                        const icons = {
                            water: '💧',
                            steps: '👣',
                            sleep: '😴',
                            weight: '⚖️'
                        };
                        const labels = {
                            water: 'Wasser',
                            steps: 'Schritte',
                            sleep: 'Schlaf',
                            weight: 'Gewicht'
                        };
                        const units = {
                            water: 'L',
                            steps: '',
                            sleep: 'h',
                            weight: 'kg'
                        };

                        return `
                            <div class="health-entry ${d.urgent ? 'blink-urgent' : ''}">
                                <div style="flex:1;">
                                    <div style="display:flex; align-items:center; gap:8px;">
                                        <button class="btn-toggle-urgent ${d.urgent ? 'is-urgent' : ''}" onclick="app.health.toggleUrgency(${d.id})" title="Wichtig"><i data-lucide="flame" size="14"></i></button>
                                        <span>${icons[d.type]} ${labels[d.type]}</span>
                                        ${d.reminder ? '<span class="text-sm" style="background:var(--primary);padding:2px 6px;border-radius:4px;font-size:0.7rem;">🔔</span>' : ''}
                                    </div>
                                    <div class="text-muted text-sm">${new Date(d.timestamp).toLocaleString('de-DE')}</div>
                                </div>
                                <div style="display:flex; align-items:center; gap:10px;">
                                    <div style="font-weight:bold;">${d.value}${units[d.type]}</div>
                                    <div style="display:flex; gap:4px;">
                                        <button class="btn-small btn-edit" onclick="app.health.edit(${d.id})" title="Bearbeiten">
                                            <i data-lucide="pencil" size="14"></i>
                                        </button>
                                        <button class="btn-small btn-delete" onclick="app.health.delete(${d.id})" title="Löschen">
                                            <i data-lucide="trash" size="14"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('');
                }
            }

            // Also update Dashboard since health was saved
            app.renderDashboard();

            if (window.lucide) lucide.createIcons();
        }
    },
    gamification: {
        addXP(a) {
            app.state.xp += a;
            const l = Math.floor(app.state.xp / 1000) + 1;
            if (l > app.state.level) { alert("🎉 LEVEL UP! " + l); this.triggerConfetti(); }
            app.state.level = l;
            app.saveState();
            this.updateUI();
        },
        setDailyGoal() {
            const current = app.state.dailyTaskGoal || 5;
            const goal = parseInt(prompt("Tägliches Ziel (Anzahl Aufgaben):", current));
            if (goal && goal > 0) {
                app.state.dailyTaskGoal = goal;
                app.saveState();
                this.updateUI();
                app.navigateTo('dashboard');
            }
        },
        updateUI() {
            const l = document.getElementById('userLevel'); if (l) l.textContent = app.state.level;
            const x = document.getElementById('userXP'); if (x) x.textContent = app.state.xp;
            const b = document.getElementById('sidebarLevelBar'); if (b) b.style.width = ((app.state.xp % 1000) / 10) + '%';

            const goal = app.state.dailyTaskGoal || 5;
            const d = document.getElementById('dailyProgressBar');
            const dt = document.getElementById('dailyProgressText');

            const count = app.state.tasks ? app.state.tasks.filter(t => t.done).length : 0;

            if (d) d.style.width = Math.min((count / goal) * 100, 100) + '%';
            if (dt) dt.textContent = `${count}/${goal}`;
        },
        triggerConfetti() { if (window.confetti) confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } }); }
    },
    voice: {
        recognition: null, targetInput: null,
        init() {
            if (('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window)) {
                const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
                this.recognition = new SR();
                this.recognition.lang = 'de-DE';
                this.recognition.continuous = false;
                this.recognition.onstart = () => document.body.classList.add('voice-listening-active');
                this.recognition.onend = () => { document.body.classList.remove('voice-listening-active'); this.targetInput = null; };
                this.recognition.onresult = (e) => this.processCommand(e.results[0][0].transcript);
            }
        },
        startGlobal() {
            if (this.recognition) {
                this.targetInput = null;
                // alert removed for seamless interaction
                this.recognition.start();
            } else alert("Sprachsteuerung wird von diesem Browser nicht unterstützt.");
        },
        listenTo(id) {
            if (this.recognition) {
                this.targetInput = id;
                const el = document.getElementById(id);
                if (el) {
                    el.classList.add('voice-listening');
                    this.recognition.start();
                }
            }
        },
        processCommand(text) {
            if (this.targetInput) {
                const el = document.getElementById(this.targetInput);
                if (el) { el.value = text; el.classList.remove('voice-listening'); }
                return;
            }

            // Intelligent voice processing
            const handled = this.intelligentProcess(text);
            if (handled) return;

            // Fallback to simple navigation
            const t = text.toLowerCase();
            if (t.includes('kalender')) app.navigateTo('calendar');
            else if (t.includes('aufgabe')) app.navigateTo('tasks');
            else if (t.includes('fahrt')) app.navigateTo('drive');
            else if (t.includes('dashboard')) app.navigateTo('dashboard');
            else if (t.includes('kontakt')) app.navigateTo('contacts');
        },

        intelligentProcess(text) {
            const lower = text.toLowerCase();

            // Extract information from speech
            const info = this.extractInfo(text);

            // Determine intent
            if (this.isContactAction(lower)) {
                return this.processContactAction(text, lower, info);
            } else if (this.isEventIntent(lower)) {
                // Open modal to allow review of all extracted details and see the transcript
                app.modals.open('addEvent', info);
                return true;
            } else if (this.isExpenseIntent(lower)) {
                // Direct add if possible
                if (info.amount && info.title) {
                    app.finance.add(info.amount, info.title, info.date || new Date().toISOString().split('T')[0], false);
                    app.navigateTo('dashboard');
                    return true;
                }
                app.modals.open('addExpense', info);
                return true;
            } else if (this.isTaskIntent(lower)) {
                const category = lower.includes('kaufen') || lower.includes('einkauf') || lower.includes('shop') ? 'shopping' : 'todo';
                // Tasks are safe to add directly usually
                app.tasks.add(info.title || text, false, category);
                app.navigateTo('dashboard');
                return true;
            }

            // Try smartCommand as fallback
            return app.smartCommand(text);
        },

        extractInfo(text) {
            const info = {};
            const lower = text.toLowerCase();
            info.rawTranscript = text;

            // Extract phone numbers
            const phoneMatch = text.match(/(\+?\d{1,4}[\s-]?)?(\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{3,4}/);
            if (phoneMatch) info.phone = phoneMatch[0].trim();

            // Extract email
            const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
            if (emailMatch) info.email = emailMatch[0];

            // Extract amounts
            const amountMatch = text.match(/(\d+[,.]?\d*)\s*(euro|€)/i);
            if (amountMatch) info.amount = parseFloat(amountMatch[1].replace(',', '.'));

            // Extract time
            const timeMatch = text.match(/(\d{1,2}):(\d{2})|um\s+(\d{1,2})\s*(uhr)?/i);
            if (timeMatch) {
                if (timeMatch[1] && timeMatch[2]) info.time = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
                else if (timeMatch[3]) info.time = `${timeMatch[3].padStart(2, '0')}:00`;
            }

            // Extract date
            if (lower.includes('heute')) info.date = new Date().toISOString().split('T')[0];
            else if (lower.includes('morgen')) {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                info.date = tomorrow.toISOString().split('T')[0];
            } else if (lower.includes('übermorgen')) {
                const day = new Date();
                day.setDate(day.getDate() + 2);
                info.date = day.toISOString().split('T')[0];
            } else {
                // Check for weekdays
                const weekdays = ['sonntag', 'montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag'];
                const dayIdx = weekdays.findIndex(d => lower.includes(d));
                if (dayIdx !== -1) {
                    const d = new Date();
                    const currentDay = d.getDay();
                    let diff = dayIdx - currentDay;
                    if (diff <= 0) diff += 7; // Next week
                    d.setDate(d.getDate() + diff);
                    info.date = d.toISOString().split('T')[0];
                    info.weekdayMatch = weekdays[dayIdx];
                }
            }

            // Extract location
            const locationRegex = /(in|straße|platz|weg|allee|dorf|stadt|bahnhof|flughafen)\s+([A-ZÄÖÜ][a-zäöüß\s]+(?:straße|platz|weg|allee|dorf|stadt)?)/i;
            const locationMatch = text.match(locationRegex);
            if (locationMatch) info.location = locationMatch[2].trim();

            // Extract title/description
            let title = text;
            if (info.phone) title = title.replace(info.phone, '');
            if (info.email) title = title.replace(info.email, '');
            if (info.amount) title = title.replace(/(\d+[,.]?\d*)\s*(euro|€)/i, '');
            if (info.time) title = title.replace(/(\d{1,2}):(\d{2})|um\s+(\d{1,2})\s*(uhr)?/i, '');
            if (info.location) title = title.replace(new RegExp(`(in|straße|platz|weg|allee|dorf|stadt|bahnhof|flughafen)\\s+${info.location}`, 'i'), '');

            // Remove extracted date keywords from title
            if (info.date) {
                title = title.replace(/heute|morgen|übermorgen/gi, '');
                if (info.weekdayMatch) title = title.replace(new RegExp(`(am\\s+)?${info.weekdayMatch}`, 'i'), '');
            }

            // Specific Cleanup for Task/Shopping/Event phrasing (German)
            // 1. Remove list destinations
            title = title.replace(/(auf|in|zu|für|von|mit)(\s+(die|der|meine|meiner|den|dem|das|einer|einer))?\s+(einkaufsliste|liste|artikelliste|todo-liste|todo|aufgabenliste|tasks|finanzliste|ausgaben|kalender|terminen|shoppingliste)/gi, '');

            // 2. Remove common action triggers at the start
            title = title.replace(/^(termin|meeting|einkauf|kaufen|ausgabe|kosten|todo|aufgabe|erinnere\s+mich\s+an|setz(e)?(\s+mal)?|pack(en)?(\s+mal)?|schreib(en)?(\s+mal)?|notier(en)?(\s+mal)?|füge(\s+mal)?\s+hinzu|bitte|mach(e)?(\s+mal)?|neuer|neues|erstell(e)?|ich\s+möchte|kannst\s+du|sollte\s+ich)\s*/i, '');

            // 3. Remove subject-prepositions if they are now at the start
            title = title.replace(/^(beim|am|im|zu|zum|zur|an|für|mit|ein(en)?)\s+/i, '');

            // 4. Remove trailing filler words
            title = title.replace(/\s+(bitte|notieren|aufschreiben|setzen|packen|schreiben|erinnern|hinzufügen|dazu|drauf|liste|melden|erstellen|machen|am|um|gerne|noch|eintragen|aufnehmen)\s*$/i, '');

            // Final cleaning
            title = title.replace(/\s+/g, ' ').trim();

            if (title.length > 0) {
                // Ensure first letter is capitalized
                info.title = title.charAt(0).toUpperCase() + title.slice(1);
                info.desc = info.title;
            }

            return info;
        },

        isEventIntent(text) {
            const eventKeywords = ['termin', 'meeting', 'treffen', 'verabredung', 'arzt', 'zahnarzt', 'friseur', 'besprechung'];
            return eventKeywords.some(kw => text.includes(kw)) ||
                (text.match(/\d{1,2}:\d{2}/) && text.match(/[A-ZÄÖÜ][a-zäöüß]+/)); // Time + capitalized word
        },

        isExpenseIntent(text) {
            const expenseKeywords = ['euro', '€', 'ausgabe', 'kosten', 'bezahlt', 'gekauft'];
            return expenseKeywords.some(kw => text.includes(kw));
        },

        isTaskIntent(text) {
            const taskKeywords = ['erinner', 'aufgabe', 'todo', 'kaufen', 'einkauf', 'merken', 'notier'];
            return taskKeywords.some(kw => text.includes(kw));
        },

        isContactAction(text) {
            return text.includes('ruf') || text.includes('anruf') || text.includes('schreib') || text.includes('mail') || text.includes('nachricht');
        },

        processContactAction(text, lower, info) {
            // Find contact name in text
            // Strategy: Look for capitalized words that match an existing contact name
            const contacts = app.state.contacts || [];
            let targetContact = null;

            // 1. Direct match with extracted info title if available
            if (info.title) {
                targetContact = contacts.find(c =>
                    c.name.toLowerCase().includes(info.title.toLowerCase()) ||
                    info.title.toLowerCase().includes(c.name.toLowerCase())
                );
            }

            // 2. Scan text for known contact names if no direct match
            if (!targetContact) {
                targetContact = contacts.find(c => lower.includes(c.name.toLowerCase()));
            }

            if (!targetContact) {
                alert("Keinen passenden Kontakt gefunden. Bitte prüfe den Namen.");
                return true; // Handle visually but fail logic
            }

            // Determine action type
            if (lower.includes('ruf') || lower.includes('anruf')) {
                if (targetContact.phone) {
                    app.contacts.call(targetContact.phone);
                    return true;
                } else {
                    alert(`Keine Telefonnummer für ${targetContact.name} hinterlegt.`);
                    return true;
                }
            } else if (lower.includes('mail') || lower.includes('email')) {
                if (targetContact.email) {
                    app.contacts.mail(targetContact.email);
                    return true;
                } else {
                    alert(`Keine E-Mail für ${targetContact.name} hinterlegt.`);
                    return true;
                }
            } else if (lower.includes('nachricht') || lower.includes('schreib') || lower.includes('whatsapp')) {
                if (targetContact.phone) {
                    app.contacts.whatsapp(targetContact.phone);
                    return true;
                } else {
                    alert(`Keine Nummer für WhatsApp bei ${targetContact.name}.`);
                    return true;
                }
            }

            return false; // unmatched action
        },

        isCommonWord(word) {
            const taskKeywords = ['kaufen', 'einkauf', 'besorgen', 'todo', 'aufgabe', 'erledigen', 'machen'];
            return taskKeywords.some(kw => text.includes(kw));
        },

        isCommonWord(word) {
            const common = ['Termin', 'Meeting', 'Einkauf', 'Ausgabe', 'Euro', 'Heute', 'Morgen'];
            return common.includes(word);
        }
    },
    comms: {
        call() {
            if (app.state.contacts && app.state.contacts.length > 0) {
                const recent = app.state.contacts[app.state.contacts.length - 1];
                if (confirm(`${recent.name} anrufen?`)) {
                    app.contacts.call(recent.phone);
                }
            } else {
                app.navigateTo('contacts');
                alert("Keine Kontakte vorhanden. Bitte füge einen Kontakt hinzu.");
            }
        },
        whatsapp() {
            if (app.state.contacts && app.state.contacts.length > 0) {
                const recent = app.state.contacts[app.state.contacts.length - 1];
                app.contacts.whatsapp(recent.phone);
            } else {
                app.navigateTo('contacts');
                alert("Keine Kontakte für WhatsApp gefunden.");
            }
        },
        email() {
            if (app.state.contacts && app.state.contacts.length > 0) {
                const recent = app.state.contacts[app.state.contacts.length - 1];
                app.contacts.mail(recent.email);
            } else {
                app.navigateTo('contacts');
                alert("Keine Kontakte für E-Mail gefunden.");
            }
        }
    },
    nightstand: {
        isActive: false,
        toggle() {
            this.isActive = !this.isActive;
            const el = document.getElementById('view-nightstand');
            if (this.isActive) {
                el.classList.remove('hidden');
                app.requestWakeLock();
                try { document.documentElement.requestFullscreen(); } catch (e) { }
            } else {
                el.classList.add('hidden');
                app.releaseWakeLock();
                if (document.fullscreenElement) document.exitFullscreen();
            }
        },
        update() {
            if (!this.isActive) return;
            const now = new Date();
            const timeEl = document.getElementById('nightClock');
            const dateEl = document.getElementById('nightDate');
            if (timeEl) timeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            if (dateEl) dateEl.textContent = now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' });
            // Screen Burn-in prevention
            if (now.getSeconds() === 0) {
                const x = Math.floor(Math.random() * 20) - 10;
                const y = Math.floor(Math.random() * 20) - 10;
                if (timeEl) timeEl.parentElement.style.transform = `translate(${x}px, ${y}px)`;
            }
        }
    },
    // --- ALARM & EVENT RINGING STATE ---
    activeAlarm: null,

    alarms: {
        trigger(title, soundId = 'melody') {
            if (app.activeAlarm) return; // Already ringing

            // --- SYSTEM NOTIFICATION (For background/closed app) ---
            app.notifications.send(`⏰ ${title}`, "Es ist Zeit! Tippe hier zum Stoppen.", true);

            // 1. Sounds
            const sounds = {
                'melody': 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
                'digital': 'https://assets.mixkit.co/active_storage/sfx/1003/1003-preview.mp3',
                'nature': 'https://assets.mixkit.co/active_storage/sfx/2434/2434-preview.mp3',
                'classic': 'https://assets.mixkit.co/active_storage/sfx/2192/2192-preview.mp3'
            };
            const soundUrl = sounds[soundId] || sounds['melody'];

            const audio = new Audio(soundUrl);
            audio.loop = true; // Loop until stopped

            // "Smooth eingeschaltet" (Volume Fade In)
            audio.volume = 0;
            audio.play().catch(e => console.warn("Audio play failed (user interaction needed?)", e));

            // Fade in over 3 seconds
            let vol = 0;
            const fadeIn = setInterval(() => {
                if (!audio || audio.paused) { clearInterval(fadeIn); return; }
                vol = Math.min(1, vol + 0.1);
                audio.volume = vol;
                if (vol >= 1) clearInterval(fadeIn);
            }, 300);

            // 2. Vibration (Pattern: 500ms vibe, 300ms pause)
            let vibInterval = null;
            if (navigator.vibrate) {
                navigator.vibrate([500, 300, 500]);
                vibInterval = setInterval(() => {
                    navigator.vibrate([500, 300, 500]);
                }, 1500);
            }

            // Save state
            app.activeAlarm = {
                audio: audio,
                vibrationInterval: vibInterval
            };

            // 3. Show Fullscreen Overlay (Modal)
            const overlay = document.createElement('div');
            overlay.id = 'alarmOverlay';
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100vw';
            overlay.style.height = '100vh';
            overlay.style.background = 'rgba(0,0,0,0.9)';
            overlay.style.zIndex = '9999';
            overlay.style.display = 'flex';
            overlay.style.flexDirection = 'column';
            overlay.style.justifyContent = 'center';
            overlay.style.alignItems = 'center';
            overlay.style.backdropFilter = 'blur(10px)';

            overlay.innerHTML = `
                <div style="font-size: 4rem; margin-bottom: 20px;">⏰</div>
                <h1 style="color:white; margin-bottom: 10px; font-size: 2rem; text-align:center;">${title}</h1>
                <p style="color:var(--text-muted); margin-bottom: 40px;">Es ist Zeit!</p>
                
                <div class="blink-danger" style="border-radius:50%; width:150px; height:150px; display:flex; align-items:center; justify-content:center; border: 4px solid var(--danger);">
                    <button onclick="app.alarms.stop()" style="background:var(--danger); border:none; color:white; font-size:1.5rem; font-weight:bold; padding:20px; border-radius:50%; width:120px; height:120px; cursor:pointer; box-shadow: 0 0 30px var(--danger);">
                        STOP
                    </button>
                </div>
            `;
            document.body.appendChild(overlay);
        },

        stop() {
            if (app.activeAlarm) {
                if (app.activeAlarm.audio) {
                    app.activeAlarm.audio.pause();
                    app.activeAlarm.audio.currentTime = 0;
                }
                if (app.activeAlarm.vibrationInterval) {
                    clearInterval(app.activeAlarm.vibrationInterval);
                }
                if (navigator.vibrate) navigator.vibrate(0);
                app.activeAlarm = null;
            }
            const overlay = document.getElementById('alarmOverlay');
            if (overlay) overlay.remove();
        },

        toggle(id) {
            const a = app.state.alarms.find(x => x.id === id);
            if (a) {
                a.active = !a.active;
                app.saveState();
                app.modals.open('setAlarm');
                app.renderDashboard();
            }
        },
        delete(id) {
            if (confirm("Wecker wirklich löschen?")) {
                app.state.alarms = app.state.alarms.filter(a => a.id !== id);
                app.saveState();
                app.modals.open('setAlarm');
                app.renderDashboard();
            }
        },
        save(id) {
            const title = document.getElementById('alarmTitle').value || 'Alarm';
            const time = document.getElementById('alarmTime').value;
            const sound = document.getElementById('alarmSound').value;
            const days = Array.from(document.querySelectorAll('input[name="alarmDays"]:checked')).map(cb => parseInt(cb.value));

            // Fix for string 'null' from template literal:
            const isNew = (id === null || id === 'null' || typeof id === 'undefined');

            if (isNew) {
                if (!app.state.alarms) app.state.alarms = [];
                app.state.alarms.push({ id: Date.now(), title, time, sound, days, active: true });
            } else {
                const a = app.state.alarms.find(x => x.id === id);
                if (a) Object.assign(a, { title, time, sound, days });
            }

            app.saveState();
            app.renderDashboard();
            app.modals.close();
            app.navigateTo('dashboard');
            app.dashboard.scrollToCard('dashboardAlarmsCard');
        }
    },
    async requestWakeLock() { if ('wakeLock' in navigator) { try { this.wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { } } },
    releaseWakeLock() { if (this.wakeLock) { this.wakeLock.release(); this.wakeLock = null; } },

    smartCommand(raw) {
        if (!raw) return;
        const text = raw.trim().toLowerCase();
        const info = app.voice.extractInfo(raw);
        const finalTitle = info.title || raw;

        // 1. Water Tracking
        if (text.startsWith('w ') || text.startsWith('wasser ') || text.startsWith('trinken ') || (/^\d+(\.\d+)?(l|ml)/i.test(text))) {
            let val = parseFloat(text.replace(/[^0-9.]/g, ''));
            if (text.includes('ml')) val = val / 1000;
            if (val > 0) {
                app.health.addWater(val);
                app.navigateTo('dashboard');
                return true;
            }
        }

        // 2. Expenses
        if (text.startsWith('e ') || text.includes('euro') || text.startsWith('ausgabe ') || info.amount) {
            const amount = info.amount || parseFloat(text.replace(/[^0-9.]/g, ''));
            if (amount > 0) {
                app.finance.add(amount, finalTitle || "Unbekannt", info.date || new Date().toISOString().split('T')[0], false);
                app.navigateTo('dashboard');
                return true;
            }
        }

        // 3. Tasks / Shopping / List
        if (app.voice.isTaskIntent(text) || text.startsWith('k ') || text.startsWith('a ')) {
            const isShop = text.includes('kaufen') || text.includes('einkauf') || text.includes('liste') || text.includes('shop');
            app.tasks.add(finalTitle, false, isShop ? 'shopping' : 'todo');
            app.navigateTo('dashboard');
            return true;
        }

        // 4. Events
        if (app.voice.isEventIntent(text)) {
            app.modals.open('addEvent', info);
            return true;
        }

        // Default Case: Add as Task
        if (raw.length > 2) {
            app.tasks.add(finalTitle, false, 'todo');
            app.navigateTo('dashboard');
            return true;
        }
        return false;
    },

    actions: {
        toggleDriveMode() {
            const d = document.getElementById('view-drive');
            if (d.classList.contains('hidden')) {
                // Archive old events before showing Drive Mode
                app.calendar.archiveOldEvents();
                app.navigateTo('drive');
                app.drive.init();
            }
            else { app.navigateTo('dashboard'); }
        }
    },

    // --- DRIVE MODE MODULE ---
    drive: {
        map: null,
        markers: [],

        init() {
            this.updateClock();
            this.updateLocation();
            this.renderRoute();
            this.initMap();

            // Update clock every second
            setInterval(() => this.updateClock(), 1000);
        },

        updateClock() {
            const now = new Date();
            const clockEl = document.getElementById('driveClock');
            const dateEl = document.getElementById('driveDate');

            if (clockEl) {
                clockEl.textContent = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            }
            if (dateEl) {
                const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                dateEl.textContent = now.toLocaleDateString('de-DE', options);
            }
        },

        updateLocation() {
            const locationEl = document.getElementById('currentLocationText');
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        if (locationEl) {
                            locationEl.textContent = `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
                        }
                    },
                    (error) => {
                        if (locationEl) {
                            locationEl.textContent = 'Standort nicht verfügbar';
                        }
                    }
                );
            }
        },

        askLocation() {
            const newLocation = prompt('Aktuellen Standort eingeben:', 'Mein Standort');
            if (newLocation) {
                const locationEl = document.getElementById('currentLocationText');
                if (locationEl) {
                    locationEl.textContent = newLocation;
                }
            }
        },

        renderRoute() {
            const routeList = document.getElementById('driveRouteList');
            if (!routeList) return;

            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

            // Get today's events with locations
            const todayEvents = app.state.events
                .filter(e => {
                    const eventDate = new Date(e.start);
                    return eventDate >= startOfToday && eventDate <= endOfToday && e.location && e.location.trim().length > 0;
                })
                .sort((a, b) => new Date(a.start) - new Date(b.start));

            if (todayEvents.length === 0) {
                routeList.innerHTML = `
                    <div style="text-align:center; padding:40px 20px; background:rgba(255,255,255,0.03); border-radius:16px;">
                        <i data-lucide="map-pin-off" size="48" style="opacity:0.3; margin-bottom:15px;"></i>
                        <div class="text-muted" style="font-size:1.1rem;">Keine Termine mit Ort für heute</div>
                        <div class="text-muted text-sm" style="margin-top:8px; opacity:0.6;">Füge Termine mit Ortsangaben hinzu</div>
                    </div>
                `;
                if (window.lucide) lucide.createIcons();
                return;
            }

            routeList.innerHTML = todayEvents.map((event, index) => {
                const eventTime = new Date(event.start);
                const timeStr = eventTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                const diffMins = Math.floor((eventTime - now) / 1000 / 60);

                let statusBadge = '';
                let statusColor = 'rgba(255,255,255,0.1)';

                if (diffMins < 0) {
                    statusBadge = 'Vorbei';
                    statusColor = 'rgba(107, 114, 128, 0.2)';
                } else if (diffMins < 15) {
                    statusBadge = 'Jetzt!';
                    statusColor = 'rgba(239, 68, 68, 0.2)';
                } else if (diffMins < 60) {
                    statusBadge = `in ${diffMins} Min`;
                    statusColor = 'rgba(234, 179, 8, 0.2)';
                } else {
                    const hours = Math.floor(diffMins / 60);
                    statusBadge = `in ${hours}h`;
                    statusColor = 'rgba(59, 130, 246, 0.2)';
                }

                const categoryBadge = event.category === 'business'
                    ? '<span style="padding:2px 6px; background:rgba(34,197,94,0.15); color:#22c55e; border-radius:4px; font-size:0.65rem; font-weight:700;">Business</span>'
                    : '<span style="padding:2px 6px; background:rgba(139,92,246,0.15); color:#a78bfa; border-radius:4px; font-size:0.65rem; font-weight:700;">Privat</span>';

                return `
                    <div style="position:relative; padding:16px; background:${statusColor}; border-left:4px solid ${diffMins < 15 ? '#ef4444' : (diffMins < 60 ? '#eab308' : '#3b82f6')}; border-radius:12px; margin-bottom:12px; transition:all 0.3s;" onclick="window.open('https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}', '_blank')">
                        <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
                            <div style="background:rgba(255,255,255,0.1); width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:1.2rem;">
                                ${index + 1}
                            </div>
                            <div style="flex:1;">
                                <div style="font-weight:700; font-size:1.1rem; margin-bottom:4px;">${event.title}</div>
                                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                                    <span style="padding:4px 8px; background:rgba(0,0,0,0.3); border-radius:6px; font-weight:600; font-size:0.9rem;">${timeStr}</span>
                                    <span style="padding:4px 8px; background:rgba(0,0,0,0.3); border-radius:6px; font-size:0.85rem; color:#06b6d4;">${statusBadge}</span>
                                    ${categoryBadge}
                                    ${event.urgent ? '<span style="padding:4px 8px; background:rgba(239,68,68,0.3); color:#ff6b6b; border-radius:6px; font-size:0.75rem; font-weight:700;">🔥 Dringend</span>' : ''}
                                </div>
                            </div>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px; padding:8px 12px; background:rgba(0,0,0,0.2); border-radius:8px;">
                            <i data-lucide="map-pin" size="16" class="text-primary"></i>
                            <span style="font-size:0.95rem; font-weight:500;">${event.location}</span>
                        </div>
                        ${event.phone || event.email ? `
                            <div style="display:flex; gap:8px; margin-top:8px;">
                                ${event.phone ? `<a href="tel:${event.phone}" onclick="event.stopPropagation()" style="padding:6px 12px; background:rgba(34,197,94,0.2); border:1px solid rgba(34,197,94,0.3); border-radius:8px; color:#22c55e; text-decoration:none; display:flex; align-items:center; gap:6px; font-size:0.85rem;"><i data-lucide="phone" size="14"></i> Anrufen</a>` : ''}
                                ${event.email ? `<a href="mailto:${event.email}" onclick="event.stopPropagation()" style="padding:6px 12px; background:rgba(59,130,246,0.2); border:1px solid rgba(59,130,246,0.3); border-radius:8px; color:#3b82f6; text-decoration:none; display:flex; align-items:center; gap:6px; font-size:0.85rem;"><i data-lucide="mail" size="14"></i> E-Mail</a>` : ''}
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');

            if (window.lucide) lucide.createIcons();
        },

        initMap() {
            const mapEl = document.getElementById('driveMap');
            if (!mapEl || !window.L) return;

            // Clear existing map
            if (this.map) {
                this.map.remove();
            }

            // Initialize map
            this.map = L.map('driveMap').setView([51.1657, 10.4515], 6); // Germany center

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(this.map);
        },

        openNavigation() {
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

            const todayEvents = app.state.events
                .filter(e => {
                    const eventDate = new Date(e.start);
                    return eventDate >= startOfToday && eventDate <= endOfToday && e.location && e.location.trim().length > 0;
                })
                .sort((a, b) => new Date(a.start) - new Date(b.start));

            if (todayEvents.length === 0) {
                alert('Keine Termine mit Ort für heute gefunden.');
                return;
            }

            // Build Google Maps route
            const destinations = todayEvents.map(e => encodeURIComponent(e.location)).join('/');
            window.open(`https://www.google.com/maps/dir/Current+Location/${destinations}`, '_blank');
        },

        refresh() {
            this.renderRoute();
            this.updateLocation();
            this.initMap();
        }
    },

    // --- CLOUD SYNC MODULE (Firebase) ---
    cloud: {
        db: null,
        unsubscribe: null,
        init() {
            if (app.state.cloud && app.state.cloud.firebaseConfig && window.firebase) {
                try {
                    const config = JSON.parse(app.state.cloud.firebaseConfig);
                    if (!firebase.apps.length) {
                        firebase.initializeApp(config);
                    }
                    this.db = firebase.firestore();
                    console.log("Firebase Initialized");

                    this.listen(); // Start Real-Time Listener
                    this.startPresence(); // Start Heartbeat
                } catch (e) {
                    console.error("Firebase Init Failed", e);
                    this.updateIndicator(false);
                }
            } else {
                this.updateIndicator(false);
            }
        },
        activeMembers: [],
        presenceInterval: null,
        presenceUnsubscribe: null,
        startPresence() {
            if (!this.db || !app.state.user.teamName) {
                this.updateIndicator(false);
                return;
            }

            const team = app.state.user.teamName;
            const userName = app.state.user.name || 'Unbekannt';

            const writePresence = async () => {
                try {
                    await this.db.collection('taskforce_presence')
                        .doc(`${team}_${userName}`)
                        .set({
                            userName,
                            team,
                            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                        }, { merge: true });
                } catch (e) { console.error("Presence Write Failed", e); }
            };

            writePresence();
            if (this.presenceInterval) clearInterval(this.presenceInterval);
            this.presenceInterval = setInterval(writePresence, 30000); // 30s heartbeat

            this.listenPresence();
        },
        listenPresence() {
            if (!this.db || !app.state.user.teamName) return;
            const team = app.state.user.teamName;

            if (this.presenceUnsubscribe) this.presenceUnsubscribe();

            this.presenceUnsubscribe = this.db.collection('taskforce_presence')
                .where('team', '==', team)
                .onSnapshot((snapshot) => {
                    const now = Date.now();
                    const members = [];
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        if (data.lastSeen && data.userName !== app.state.user.name) {
                            const lastSeenMs = data.lastSeen.toMillis ? data.lastSeen.toMillis() : 0;
                            // Active if seen in last 90 seconds
                            if (now - lastSeenMs < 90000) {
                                members.push(data.userName);
                            }
                        }
                    });
                    this.activeMembers = members;
                    this.updateIndicator(true);

                    // Simple live update in settings if possible
                    const mList = document.getElementById('settingsPresenceList');
                    if (mList) {
                        mList.innerHTML = this.activeMembers.length > 0
                            ? this.activeMembers.map(m => `<span style="background:rgba(34,197,94,0.15); color:var(--success); padding:2px 8px; border-radius:10px; font-size:0.8rem; border:1px solid var(--success);">🟢 ${m}</span>`).join(' ')
                            : '<span class="text-muted text-xs">Keine anderen Mitglieder online.</span>';
                    }
                });
        },
        listen() {
            if (!this.db || !app.state.user.teamName) return;
            if (this.unsubscribe) this.unsubscribe(); // Clear old listener

            const team = app.state.user.teamName;
            console.log("Starting Sync Listener for Team:", team);

            this.unsubscribe = this.db.collection('taskforce_sync').doc(team)
                .onSnapshot((doc) => {
                    if (doc.exists && !doc.metadata.hasPendingWrites) {
                        const cloudState = doc.data().data;
                        this.mergeIncoming(cloudState); // Load Cloud Data

                        const status = document.getElementById('syncStatus');
                        if (status) status.innerHTML = `<span style="color:var(--success)">⚡ Live Sync (${new Date().toLocaleTimeString()})</span>`;
                    } else if (!doc.exists && !doc.metadata.hasPendingWrites) {
                        // NEW TEAM DETECTED (No cloud data found)
                        // "sollen meine ganzen anderen termine nicht drin stehen"
                        // Clear local data to start fresh for this new individual team
                        console.log("New Team detected. Clearing local state.");
                        app.state.tasks = [];
                        app.state.events = [];
                        app.state.expenses = [];
                        app.state.habits = [];
                        app.state.healthData = [];
                        app.state.alarms = [];

                        app.saveState(); // Save empty state locally
                        app.renderDashboard(); // Update UI

                        // Optional: Create initial empty doc in cloud? 
                        // Or wait for first user action to create it via pushState.
                    }
                });
        },
        mergeIncoming(cloudState) {
            if (!cloudState) return;

            const merge = (key, fallback) => {
                if (cloudState[key] !== undefined) return cloudState[key];
                return app.state[key] || fallback;
            };

            // Compare versions for quick dirty check
            const localCompare = {
                tasks: app.state.tasks,
                events: app.state.events,
                expenses: app.state.expenses,
                habits: app.state.habits,
                healthData: app.state.healthData || [],
                alarms: app.state.alarms || [],
                contacts: app.state.contacts || [],
                shortcuts: app.state.shortcuts || [],
                xp: app.state.xp || 0,
                level: app.state.level || 1,
                ui: app.state.ui || {}
            };

            const cloudCompare = {
                tasks: merge('tasks', []),
                events: merge('events', []),
                expenses: merge('expenses', []),
                habits: merge('habits', []),
                healthData: merge('healthData', []),
                alarms: merge('alarms', []),
                contacts: merge('contacts', []),
                shortcuts: merge('shortcuts', []),
                xp: merge('xp', 0),
                level: merge('level', 1),
                ui: merge('ui', {})
            };

            if (JSON.stringify(localCompare) !== JSON.stringify(cloudCompare)) {
                app.state.tasks = cloudCompare.tasks;
                app.state.events = cloudCompare.events;
                app.state.expenses = cloudCompare.expenses;
                app.state.habits = cloudCompare.habits;
                app.state.healthData = cloudCompare.healthData;
                app.state.alarms = cloudCompare.alarms;
                app.state.contacts = cloudCompare.contacts;
                app.state.shortcuts = cloudCompare.shortcuts;
                app.state.xp = cloudCompare.xp;
                app.state.level = cloudCompare.level;
                app.state.ui = cloudCompare.ui;

                app.saveState(true); // Skip Push to avoid loop
                app.renderDashboard();
                if (app.tasks) app.tasks.render();
                if (app.calendar) app.calendar.render();
                if (app.finance) app.finance.render();
                if (app.habits) app.habits.render();
                if (app.health) app.health.render();
                console.log("☁️ Data Synchronized from Cloud");

                this.updateIndicator(true);
            }
        },
        updateIndicator(active) {
            const el = document.getElementById('headerSyncIndicator');
            const teamName = app.state.user.teamName;
            const isActiveTeam = active && teamName;

            if (el) {
                el.style.opacity = isActiveTeam ? '1' : '0.4';
                el.title = isActiveTeam ? 'Team Verbindung aktiv: ' + teamName : 'Verbindung getrennt';

                // Dot color
                const dot = el.querySelector('div');
                if (dot) dot.style.background = isActiveTeam ? 'var(--success)' : '#666';

                if (isActiveTeam) el.classList.add('pulse-sync');
                else el.classList.remove('pulse-sync');
            }
            const statusLabel = document.getElementById('syncStatusHeader');
            if (statusLabel) statusLabel.textContent = isActiveTeam ? teamName : 'Offline';

            const syncStatusCard = document.getElementById('syncStatus');
            if (syncStatusCard) {
                syncStatusCard.innerHTML = isActiveTeam
                    ? `<span style="color:var(--success)">🟢 Team: ${teamName}</span>`
                    : '<span style="color:var(--danger)">🔴 Nicht verbunden</span>';
            }
        },
        async push() {
            if (!this.db || !app.state.user.teamName) { this.updateIndicator(false); return; }
            const team = app.state.user.teamName;

            const payload = {
                data: {
                    tasks: app.state.tasks,
                    events: app.state.events,
                    expenses: app.state.expenses,
                    habits: app.state.habits,
                    healthData: app.state.healthData || [],
                    alarms: app.state.alarms || [],
                    contacts: app.state.contacts || [],
                    shortcuts: app.state.shortcuts || [],
                    xp: app.state.xp || 0,
                    level: app.state.level || 1,
                    ui: app.state.ui || {},
                    last_updated: new Date().toISOString()
                },
                updated_at: new Date().toISOString()
            };

            try {
                await this.db.collection('taskforce_sync').doc(team).set(payload, { merge: true });
                const status = document.getElementById('syncStatus');
                if (status) status.innerHTML = `<span style="color:var(--success)">⬆️ Gesendet (${new Date().toLocaleTimeString()})</span>`;
                this.updateIndicator(true);
            } catch (e) { console.error("Push Error", e); this.updateIndicator(false); }
        },
        async sync(manual = false) {
            if (!this.db) { if (manual) alert("Kein Sync möglich (Config fehlt)."); return; }
            this.push();
            this.listen();
            if (manual) alert("Sync & Push ausgeführt.");
        }
    },

    // --- SETTINGS MODULE ---
    settings: {
        render() {
            const config = app.state.aiConfig;
            document.getElementById('aiProviderSelect').value = config.provider;
            document.getElementById('openaiKeyInput').value = config.openaiKey || '';
            document.getElementById('grokKeyInput').value = config.grokKey || '';
            document.getElementById('geminiKeyInput').value = config.geminiKey || '';
            document.getElementById('settingsUserName').value = app.state.user.name || '';

            const layoutSelect = document.getElementById('dashboardLayoutSelect');
            if (layoutSelect) layoutSelect.value = app.state.dashboardLayout || 'double';

            const voiceIconSelect = document.getElementById('voiceIconModeSelect');
            if (voiceIconSelect) voiceIconSelect.value = app.state.voiceIconMode || 'logo';


            // Render Blink Style Preference
            const blinkSelect = document.getElementById('blinkStyleSelect');
            if (blinkSelect) blinkSelect.value = app.state.ui.blinkStyle || 'standard';

            // Render Event Reminder Preference
            const reminderSelect = document.getElementById('eventReminderSelect');
            if (reminderSelect) reminderSelect.value = app.state.ui.eventReminderMinutes || 60;

            // Render Cloud Config
            if (app.state.cloud) {
                const confInput = document.getElementById('firebaseConfigInput');
                if (confInput) confInput.value = app.state.cloud.firebaseConfig || '';

                if (app.state.cloud.firebaseConfig && app.cloud.db) {
                    document.getElementById('syncStatus').innerHTML = '<span style="color:var(--success)">🟢 Bereit</span>';
                }
            }

            // Render Team & Password Info
            const teamInfo = document.getElementById('settingsTeamInfo');
            if (teamInfo) {
                const tm = app.state.user.teamName || 'Kein Team (Offline)';
                teamInfo.innerHTML = `
                    <div style="background:rgba(59, 130, 246, 0.1); padding:15px; border-radius:8px; border:1px solid rgba(59, 130, 246, 0.3); margin-bottom:15px;">
                        <label class="text-sm text-primary" style="display:block; margin-bottom:5px;">AKTIVES TEAM (SYNC KEY)</label>
                        <div style="font-size:1.2rem; font-weight:bold; display:flex; justify-content:space-between; align-items:center;">
                            <span>${tm}</span>
                            <i data-lucide="wifi" class="text-success"></i>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Neues Passwort</label>
                        <input type="password" id="settingsPass1" class="form-input" placeholder="Neu eingeben">
                    </div>
                     <div class="form-group">
                        <label class="form-label">Wiederholen</label>
                        <input type="password" id="settingsPass2" class="form-input" placeholder="Bestätigen">
                    </div>
                    <button class="btn btn-primary" style="width:100%;" onclick="app.settings.savePassword()">Passwort Update</button>
                    <div style="margin-top:15px; padding-top:15px; border-top:1px solid var(--border);">
                        <label class="text-xs text-muted" style="display:block; margin-bottom:8px; text-transform:uppercase;">Aktive Team Mitglieder</label>
                        <div id="settingsPresenceList" style="display:flex; flex-wrap:wrap; gap:8px;">
                            ${app.cloud.activeMembers.length > 0
                        ? app.cloud.activeMembers.map(m => `<span style="background:rgba(34,197,94,0.15); color:var(--success); padding:2px 8px; border-radius:10px; font-size:0.8rem; border:1px solid var(--success);">🟢 ${m}</span>`).join(' ')
                        : '<span class="text-muted text-xs">Keine anderen Mitglieder online.</span>'}
                        </div>
                    </div>
                    <hr style="border-color:var(--border); margin:20px 0;">
                `;
            }

            this.updateAIProvider();
        },
        applyVoiceIconPreference() {
            const mode = app.state.voiceIconMode || 'logo';
            const micIcon = document.getElementById('voiceMicIcon');
            const logoIcon = document.getElementById('voiceLogoIcon');

            if (micIcon && logoIcon) {
                if (mode === 'logo') {
                    micIcon.classList.add('hidden');
                    logoIcon.classList.remove('hidden');
                } else {
                    micIcon.classList.remove('hidden');
                    logoIcon.classList.add('hidden');
                }
            }
        },
        applyLayoutPreference() {
            const grids = document.querySelectorAll('.dashboard-grid');
            grids.forEach(g => {
                if (app.state.dashboardLayout === 'single') {
                    g.classList.add('single-column-mode');
                } else {
                    g.classList.remove('single-column-mode');
                }
            });
        },
        initPayPal() {
            if (app.state.user.isPro) return;
            const container = document.getElementById('paypal-button-container-settings');
            if (!container) return;
            container.innerHTML = '';

            setTimeout(() => {
                if (window.paypal) {
                    paypal.Buttons({
                        style: { layout: 'vertical', color: 'blue', shape: 'rect', label: 'pay' },
                        createOrder: (data, actions) => {
                            return actions.order.create({ purchase_units: [{ amount: { value: '9.99' } }] });
                        },
                        onApprove: (data, actions) => {
                            return actions.order.capture().then(details => {
                                app.user.upgradeToPro();
                                alert('Danke für dein Vertrauen, ' + details.payer.name.given_name + '! Du bist jetzt PRO! 👑');
                            });
                        }
                    }).render('#paypal-button-container-settings');
                }
            }, 100);
        },
        saveLayout() {
            const val = document.getElementById('dashboardLayoutSelect').value;
            app.state.dashboardLayout = val;
            app.saveState();
            this.applyLayoutPreference();
        },
        saveVoiceIconMode() {
            const val = document.getElementById('voiceIconModeSelect').value;
            app.state.voiceIconMode = val;
            app.saveState();
            this.applyVoiceIconPreference();
        },
        saveBlinkStyle() {
            const sel = document.getElementById('blinkStyleSelect');
            if (sel) {
                app.state.ui.blinkStyle = sel.value;
                app.saveState();
                app.renderDashboard(); // Re-render to apply new blinking style
                alert(`Blinking-Stil auf "${sel.options[sel.selectedIndex].text}" gesetzt!`);
            }
        },
        saveEventReminder() {
            const sel = document.getElementById('eventReminderSelect');
            if (sel) {
                app.state.ui.eventReminderMinutes = parseInt(sel.value);
                app.saveState();
                alert(`Termin-Voralarm auf ${sel.options[sel.selectedIndex].text} gesetzt!`);
            }
        },
        toggleLayoutQuick() {
            // Toggle between single and double column
            const currentLayout = app.state.dashboardLayout || 'double';
            const newLayout = currentLayout === 'single' ? 'double' : 'single';

            app.state.dashboardLayout = newLayout;
            app.saveState();
            this.applyLayoutPreference();

            // Update button text and icon
            const btnText = document.getElementById('layoutToggleText');
            const btnIcon = document.getElementById('layoutToggleIcon');

            if (btnText) {
                btnText.textContent = newLayout === 'single' ? '1 Spalte' : '2 Spalten';
            }

            // Optional: Show brief feedback
            if (window.lucide) lucide.createIcons();

            // Update settings dropdown if on settings page
            const settingsSelect = document.getElementById('dashboardLayoutSelect');
            if (settingsSelect) {
                settingsSelect.value = newLayout;
            }
        },
        updateAIProvider() {
            const provider = document.getElementById('aiProviderSelect').value;
            document.querySelectorAll('.ai-config-fields').forEach(el => el.classList.add('hidden'));
            document.getElementById(`${provider}Config`).classList.remove('hidden');
            this.saveAIConfig(true); // Silent save
        },
        saveAIConfig(silent = false) {
            app.state.aiConfig.provider = document.getElementById('aiProviderSelect').value;
            app.state.aiConfig.openaiKey = document.getElementById('openaiKeyInput').value;
            app.state.aiConfig.grokKey = document.getElementById('grokKeyInput').value;
            app.state.aiConfig.geminiKey = document.getElementById('geminiKeyInput').value;

            // Save User Name as well if present
            const nameInput = document.getElementById('settingsUserName');
            if (nameInput) app.state.user.name = nameInput.value;

            if (!silent) {
                // User requested behavior: Deactivate Membership on Save
                app.state.user.isPro = false;
                app.user.applyProStatus();
            }

            app.saveState();

            if (!silent) {
                app.user.updateHeader();
                app.renderDashboard();
                app.navigateTo('dashboard');
            }
        },
        saveCloudConfig() {
            if (!app.state.cloud) app.state.cloud = {};
            app.state.cloud.firebaseConfig = document.getElementById('firebaseConfigInput').value.trim();
            app.saveState();
            app.cloud.init();
            app.navigateTo('dashboard');
        },
        saveProfile() {
            app.state.user.name = document.getElementById('settingsUserName').value;
            app.saveState();
            app.user.updateHeader();
            app.navigateTo('dashboard');
        },
        savePassword() {
            const p1 = document.getElementById('settingsPass1').value;
            const p2 = document.getElementById('settingsPass2').value;
            if (p1 && p1 === p2) {
                app.state.user.password = p1;
                app.saveState();
                app.navigateTo('dashboard');
            } else {
                alert("Passwörter stimmen nicht überein.");
            }
        },
        resetApp() {
            if (confirm("Möchtest du wirklich alle Daten löschen? Dies kann nicht rückgängig gemacht werden!")) {
                localStorage.clear();
                location.reload();
            }
        }
    },

    // --- MODALS ---
    modals: {
        open(type, data = {}) {
            const o = document.getElementById('modalOverlay');
            const c = document.getElementById('modalContent');
            if (!o || !c) return;
            o.classList.remove('hidden');

            // Push history state so back button closes modal
            window.history.pushState({ modal: true, page: app.state.currentPage }, '', '');

            if (type === 'addContact') {
                const isEditing = data && data.id;
                const title = isEditing ? 'Kontakt bearbeiten' : 'Neuer Kontakt';
                const icon = isEditing ? 'edit-2' : 'user-plus';

                c.innerHTML = `
                    <div style="padding:24px;">
                        <h3 style="margin-bottom:20px; display:flex; align-items:center; gap:10px;"><i data-lucide="${icon}" class="text-primary"></i> ${title}</h3>
                        <div class="form-group">
                            <label class="form-label">Kategorie</label>
                            <select id="newContactCategory" class="form-input">
                                <option value="private" ${data.category === 'private' || !data.category ? 'selected' : ''}>Privat</option>
                                <option value="business" ${data.category === 'business' ? 'selected' : ''}>Business</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Name / Firma</label>
                            <input id="newContactName" class="form-input" placeholder="Nachname, Vorname oder Firmenname" value="${data.name || ''}">
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                            <div class="form-group">
                                <label class="form-label">Telefon</label>
                                <input id="newContactPhone" class="form-input" placeholder="+49 123 456789" value="${data.phone || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">E-Mail</label>
                                <input id="newContactEmail" class="form-input" type="email" placeholder="email@firma.de" value="${data.email || ''}">
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Adresse / Standort</label>
                            <input id="newContactAddress" class="form-input" placeholder="Straße 1, 12345 Stadt" value="${data.address || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Homepage (URL)</label>
                            <input id="newContactHomepage" class="form-input" placeholder="https://www.beispiel.de" value="${data.homepage || ''}">
                        </div>
                        <div style="display:flex;justify-content:end;gap:12px;margin-top:24px; padding-top:20px; border-top:1px solid rgba(255,255,255,0.05);">
                            <button class="btn" onclick="app.modals.close()">Abbrechen</button>
                            <button class="btn btn-primary" onclick="app.contacts.submit()"><i data-lucide="save"></i> Speichern</button>
                        </div>
                    </div>`;
            }
            else if (type === 'addTask') {
                const cat = data.category || 'todo';
                const isShopping = cat === 'shopping';
                const title = data.title || '';

                let formContent = '';

                if (isShopping) {
                    // Shopping "Special Form"
                    formContent = `
                        <div style="padding:20px;">
                            <h3 style="color:var(--success);"><i data-lucide="shopping-cart"></i> Neuer Einkauf</h3>
                            <div class="form-group" style="display:flex;gap:5px;">
                                <input id="newTaskTitle" class="form-input" value="${title}" placeholder="Was einkaufen? (z.B. Milch)">
                                <button class="btn-secondary" onclick="app.voice.listenTo('newTaskTitle')"><i data-lucide="mic"></i></button>
                            </div>
                            
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:15px;">
                                <div class="form-group">
                                    <label class="form-label" style="font-size:0.75rem;">Kategorie</label>
                                    <select id="taskCategorySelect" class="form-input" style="font-size:0.85rem; padding:8px;">
                                        <option value="private">Privat / Familie</option>
                                        <option value="business">Business</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label" style="font-size:0.75rem;">Sichtbarkeit</label>
                                    <select id="taskVisibility" class="form-input" style="font-size:0.85rem; padding:8px;">
                                        <option value="private">Nur ich</option>
                                        <option value="team">Team Sichtbarkeit</option>
                                        <option value="public">Öffentlich</option>
                                    </select>
                                </div>
                            </div>

                            <!-- Hidden Category Input -->
                            <input type="hidden" name="taskCategory" value="shopping">

                            <div class="form-group">
                                <label><input type="checkbox" id="newTaskUrgent"> 🔥 Dringend?</label>
                            </div>
                            <div style="display:flex;justify-content:end;gap:10px;">
                                <button class="btn" onclick="app.modals.close()">Abbrechen</button>
                                <button class="btn btn-primary" style="background:var(--success);" onclick="app.modals.submitTask()">Artikel hinzufügen</button>
                            </div>
                        </div>`;
                } else {
                    // Task "Special Form"
                    formContent = `
                        <div style="padding:20px;">
                            <h3><i data-lucide="check-square"></i> Neue Aufgabe</h3>
                            <div class="form-group" style="display:flex;gap:5px;">
                                <input id="newTaskTitle" class="form-input" value="${title}" placeholder="Titel (z.B. Meeting)">
                                <button class="btn-secondary" onclick="app.voice.listenTo('newTaskTitle')"><i data-lucide="mic"></i></button>
                            </div>
                            
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:15px;">
                                <div class="form-group">
                                    <label class="form-label" style="font-size:0.75rem;">Kategorie</label>
                                    <select id="taskCategorySelect" class="form-input" style="font-size:0.85rem; padding:8px;">
                                        <option value="private">Privat / Familie</option>
                                        <option value="business">Business</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label" style="font-size:0.75rem;">Sichtbarkeit</label>
                                    <select id="taskVisibility" class="form-input" style="font-size:0.85rem; padding:8px;">
                                        <option value="private">Nur ich</option>
                                        <option value="team">Team Sichtbarkeit</option>
                                        <option value="public">Öffentlich</option>
                                    </select>
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="form-label" style="font-size:0.75rem;">Liste</label>
                                <div style="display:flex; gap:10px;">
                                    <label style="display:flex; align-items:center; gap:5px; cursor:pointer;">
                                        <input type="radio" name="taskCategory" value="todo" checked> To-Do
                                    </label>
                                    <label style="display:flex; align-items:center; gap:5px; cursor:pointer;">
                                        <input type="radio" name="taskCategory" value="shopping"> Einkauf
                                    </label>
                                </div>
                            </div>

                            <div class="form-group">
                                <label><input type="checkbox" id="newTaskUrgent"> 🔥 Dringend?</label>
                            </div>
                            <div style="display:flex;justify-content:end;gap:10px;">
                                <button class="btn" onclick="app.modals.close()">Abbrechen</button>
                                <button class="btn btn-primary" onclick="app.modals.submitTask()">Speichern</button>
                            </div>
                        </div>`;
                }

                c.innerHTML = formContent + (data.rawTranscript ? `
                        <div style="margin-top:20px; padding:10px; background:rgba(255,255,255,0.03); border-radius:8px; border:1px dashed rgba(255,255,255,0.1);">
                            <div class="text-xs text-muted" style="text-transform:uppercase; margin-bottom:5px;">Erkannt:</div>
                            <div style="font-style:italic; font-size:0.9rem; color:var(--text-muted);">"${data.rawTranscript}"</div>
                        </div>` : '');
            } else if (type === 'setAlarm') {
                const alarms = app.state.alarms || [];
                const sounds = [
                    { id: 'melody', name: 'Sanfte Melodie' },
                    { id: 'digital', name: 'Digitaler Piep' },
                    { id: 'nature', name: 'Vogelgezwitscher' },
                    { id: 'classic', name: 'Klassisch' }
                ];

                let alarmsHtml = alarms.map(a => {
                    const daysLabels = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
                    const activeDays = a.days || [];
                    const daysStr = activeDays.length === 7 ? 'Täglich' : activeDays.map(d => daysLabels[d]).join(', ');

                    return `
                        <div class="card" style="margin-bottom:10px; padding:12px; background:rgba(255,255,255,0.03); border:1px solid ${a.active ? 'var(--primary)' : 'var(--border)'}">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <div onclick="app.modals.open('editAlarm', { id: ${a.id} })" style="flex:1; cursor:pointer;">
                                    <div style="font-weight:bold; font-size:1.1rem; color:${a.active ? 'white' : 'var(--text-muted)'}">${a.time} - ${a.title || 'Alarm'}</div>
                                    <div class="text-xs text-muted">${daysStr} | 🎵 ${sounds.find(s => s.id === a.sound)?.name || 'Standard'}</div>
                                </div>
                                <div style="display:flex; gap:10px; align-items:center;">
                                    <div class="checkbox-circle ${a.active ? 'checked' : ''}" style="width:20px; height:20px;" onclick="app.alarms.toggle(${a.id})"></div>
                                    <button class="btn-small" onclick="app.alarms.delete(${a.id})" style="background:rgba(239,68,68,0.1); color:var(--danger); border:none;"><i data-lucide="trash" size="14"></i></button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');

                c.innerHTML = `
                <div style="padding:20px; max-height:80vh; overflow-y:auto;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                        <h3>⏰ Deine Wecker</h3>
                        <button class="btn btn-primary btn-small" onclick="app.modals.open('editAlarm', { addNew: true })">
                            <i data-lucide="plus"></i> Neu
                        </button>
                    </div>
                    <div id="alarmListContainer">
                        ${alarmsHtml || '<div class="text-muted text-sm" style="text-align:center; padding:20px;">Keine Wecker gestellt.</div>'}
                    </div>
                    <button class="btn btn-secondary" onclick="app.modals.close()" style="width:100%; margin-top:10px;">Fertig</button>
                </div>`;
            } else if (type === 'editAlarm') {
                const isNew = data.addNew;
                const alarm = isNew ? { title: '', time: '07:00', active: true, days: [1, 2, 3, 4, 5], sound: 'melody' } : app.state.alarms.find(a => a.id === data.id);
                if (!alarm) return app.modals.open('setAlarm');

                const daysLabels = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
                const sounds = [
                    { id: 'melody', name: 'Sanfte Melodie' },
                    { id: 'digital', name: 'Digitaler Piep' },
                    { id: 'nature', name: 'Vogelgezwitscher' },
                    { id: 'classic', name: 'Klassisch' }
                ];

                c.innerHTML = `
                <div style="padding:20px;">
                    <h3>${isNew ? '⏰ Neuer Wecker' : '⏰ Wecker bearbeiten'}</h3>
                    <div class="form-group">
                        <label class="form-label">Titel</label>
                        <input id="alarmTitle" class="form-input" value="${alarm.title}" placeholder="z.B. Arbeit">
                    </div>
                    <div class="form-group">
                        <input type="time" id="alarmTime" class="form-input" value="${alarm.time}" style="font-size:2.5rem; text-align:center; height:auto;">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Wiederholung</label>
                        <div style="display:flex; flex-wrap:wrap; gap:5px; justify-content:center; margin-top:5px;">
                            ${daysLabels.map((label, i) => `
                                <div onclick="this.querySelector('input').click()" 
                                     style="width:36px; height:36px; border-radius:50%; border: 1px solid var(--border); display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:0.75rem; transition:all 0.2s; ${alarm.days.includes(i) ? 'background:var(--primary); border-color:var(--primary); color:white;' : 'background:rgba(255,255,255,0.05); color:var(--text-muted)'}"
                                     class="alarm-day-toggle">
                                    <input type="checkbox" name="alarmDays" value="${i}" ${alarm.days.includes(i) ? 'checked' : ''} style="display:none;" onchange="event.stopPropagation(); this.parentElement.style.background = this.checked ? 'var(--primary)' : 'rgba(255,255,255,0.05)'; this.parentElement.style.color = this.checked ? 'white' : 'var(--text-muted)'; this.parentElement.style.borderColor = this.checked ? 'var(--primary)' : 'var(--border)';">
                                    ${label}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Alarmton</label>
                        <select id="alarmSound" class="form-input">
                            ${sounds.map(s => `<option value="${s.id}" ${s.id === alarm.sound ? 'selected' : ''}>${s.name}</option>`).join('')}
                        </select>
                    </div>
                    <div style="display:flex; gap:10px; margin-top:20px;">
                        <button class="btn" style="flex:1" onclick="app.modals.open('setAlarm')">Zurück</button>
                        <button class="btn btn-primary" style="flex:1" onclick="app.alarms.save(${alarm.id || 'null'})">Speichern</button>
                    </div>
                </div>`;
            } else if (type === 'addEvent') {
                const d = data.date || new Date().toISOString().slice(0, 10);
                const t = data.title || '';
                const ti = data.time || '12:00';
                const l = data.location || '';
                const ph = data.phone || '';
                const em = data.email || '';
                const no = data.notes || ''; // New Notes Field
                const cat = data.category || 'private'; // Category Field

                c.innerHTML = `
                <div style="padding:20px;max-height:80vh;overflow-y:auto;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                        <h3>${app.editingId ? 'Bearbeiten' : 'Neuer Termin'}</h3>
                        <button class="btn-small" style="background:var(--accent); color:white;" onclick="app.ai.openQuery('Finde Details zu: '+document.getElementById('evtTitle').value)">
                            <i data-lucide="sparkles"></i> AI Info
                        </button>
                    </div>

                    <div class="form-group" style="display:flex;gap:5px;">
                        <input id="evtTitle" class="form-input" value="${t}" placeholder="Titel (z.B. Zahnarzt)">
                        <button class="btn-secondary" onclick="app.voice.listenTo('evtTitle')"><i data-lucide="mic"></i></button>
                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:15px;">
                        <div class="form-group">
                            <label class="form-label" style="font-size:0.75rem;">Kategorie</label>
                            <select id="evtCategory" class="form-input" style="font-size:0.85rem; padding:8px;">
                                <option value="private" ${cat === 'private' ? 'selected' : ''}>Privat / Familie</option>
                                <option value="business" ${cat === 'business' ? 'selected' : ''}>Business</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label" style="font-size:0.75rem;">Sichtbarkeit</label>
                            <select id="evtVisibility" class="form-input" style="font-size:0.85rem; padding:8px;">
                                <option value="private">Nur ich</option>
                                <option value="team">Team Sichtbarkeit</option>
                                <option value="public">Öffentlich</option>
                            </select>
                        </div>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                         <div class="form-group"><input type="date" id="evtDate" class="form-input" value="${d}" onclick="this.showPicker()" style="cursor:pointer;"></div>
                         <div class="form-group"><input type="time" id="evtTime" class="form-input" value="${ti}" onclick="this.showPicker()" style="cursor:pointer;"></div>
                    </div>

                    <div class="form-group" style="display:flex;gap:5px;">
                        <input id="evtLocation" class="form-input" value="${l}" placeholder="Ort / Adresse">
                        <button class="btn-secondary" onclick="app.voice.listenTo('evtLocation')"><i data-lucide="map-pin"></i></button>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                        <div class="form-group"><input id="evtPhone" class="form-input" value="${ph}" placeholder="Telefon"></div>
                        <div class="form-group"><input id="evtEmail" class="form-input" value="${em}" placeholder="Email"></div>
                    </div>

                    <div class="form-group">
                        <textarea id="evtNotes" class="form-input" rows="3" placeholder="Bemerkungen / Notizen...">${no}</textarea>
                    </div>

                    <div class="form-group">
                        <label><input type="checkbox" id="evtUrgent" ${data.urgent ? 'checked' : ''}> 🔥 Dringend?</label>
                    </div>

                    <div style="display:flex;justify-content:space-between; gap:10px; margin-top:20px;">
                        <div>
                            ${app.editingId ? `<button class="btn btn-delete" onclick="app.calendar.deleteEvent(${app.editingId}); app.modals.close();">Löschen</button>` : ''}
                        </div>
                        <div style="display:flex; gap:10px;">
                            <button class="btn" onclick="app.modals.close()">Abbrechen</button>
                            <button class="btn btn-primary" onclick="app.modals.submitEvent()">Speichern</button>
                        </div>
                    </div>
                    
                    ${data.rawTranscript ? `
                    <div style="margin-top:20px; padding:10px; background:rgba(255,255,255,0.03); border-radius:8px; border:1px dashed rgba(255,255,255,0.1);">
                        <div class="text-xs text-muted" style="text-transform:uppercase; margin-bottom:5px;">Gesprochen:</div>
                        <div style="font-style:italic; font-size:0.9rem; color:var(--text-muted);">"${data.rawTranscript}"</div>
                    </div>` : ''}
                </div>`;
            } else if (type === 'aiChat') {
                c.innerHTML = `
                 <div style="padding:20px; height:60vh; display:flex; flex-direction:column;">
                    <h3 style="display:flex; align-items:center; gap:10px;"><i data-lucide="bot" class="text-accent"></i> AI Assistant</h3>
                    <div id="aiChatLog" style="flex:1; background:rgba(0,0,0,0.2); border-radius:8px; margin:10px 0; padding:10px; overflow-y:auto; font-size:0.9rem;">
                        <div class="text-muted">Hallo! Ich bin dein AI-Assistent. Frag mich nach Telefonnummern, Bewertungen oder hilfe beim Planen.</div>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <input id="aiChatInput" class="form-input" placeholder="Frag mich etwas..." onkeypress="if(event.key==='Enter') app.ai.send()">
                        <button class="btn-primary" onclick="app.ai.send()"><i data-lucide="send"></i></button>
                    </div>
                 </div>`;
            } else if (type === 'aiBriefing') {
                c.innerHTML = `
                <div style="padding:20px 20px 80px 20px; max-height:85vh; overflow-y:auto; position:relative;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid var(--border); padding-bottom:10px;">
                        <h3 style="display:flex; align-items:center; gap:8px; margin:0;"><i data-lucide="sparkles" class="text-accent" size="20"></i> Dein Tagesbericht</h3>
                            <button class="btn-small" style="background:rgba(255,255,255,0.1);" onclick="app.ai.speak('${(data.speech || "").replace(/'/g, "\\'").replace(/\n/g, " ").replace(/\r/g, "")}')">
                                <i data-lucide="volume-2" size="18"></i>
                            </button>
                            <button style="background:none; border:none; color:var(--text-muted); cursor:pointer;" 
                                    onclick="app.modals.close(); if(window.speechSynthesis) window.speechSynthesis.cancel();">
                                <i data-lucide="x" size="24"></i>
                            </button>
                        </div>
                    </div>
                    ${data.html}
                    <div style="margin-top:30px; text-align:center; display:flex; gap:10px; justify-content:center;">
                         <button class="btn" style="background:rgba(255,255,255,0.1);" onclick="app.ai.speak('${(data.speech || "").replace(/'/g, "\\'").replace(/\n/g, " ").replace(/\r/g, "")}')"><i data-lucide="volume-2"></i> Nochmals vorlesen</button>
                         <button class="btn btn-primary" onclick="app.modals.close(); if(window.speechSynthesis) window.speechSynthesis.cancel();">Danke, verstanden</button>
                    </div>
                </div>
            `;
            } else if (type === 'addExpense') {
                const today = new Date().toISOString().split('T')[0];
                const desc = data.desc || data.title || '';
                const amount = data.amount || '';
                c.innerHTML = `
                <div style="padding:20px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; position:sticky; top:0; background:var(--bg-card); z-index:10; padding:10px 0; border-bottom:1px solid var(--border);">
                        <h3 style="margin:0;">Ausgabe erfassen</h3>
                        <button class="btn btn-primary btn-small" onclick="app.modals.submitExpense()">▼ Speichern</button>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Wofür?</label>
                        <div style="display:flex; gap:5px;">
                            <input id="expDesc" class="form-input" value="${desc}" placeholder="z.B. Lebensmittel">
                            <button class="btn-secondary" onclick="app.voice.listenTo('expDesc')" title="Spracheingabe"><i data-lucide="mic"></i></button>
                        </div>
                    </div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:15px;">
                        <div class="form-group">
                            <label class="form-label" style="font-size:0.75rem;">Kategorie</label>
                            <select id="expCategory" class="form-input" style="font-size:0.85rem; padding:8px;">
                                <option value="private">Privat / Familie</option>
                                <option value="business">Business</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label" style="font-size:0.75rem;">Sichtbarkeit</label>
                            <select id="expVisibility" class="form-input" style="font-size:0.85rem; padding:8px;">
                                <option value="private">Nur ich</option>
                                <option value="team">Team Sichtbarkeit</option>
                                <option value="public">Öffentlich</option>
                            </select>
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                        <div class="form-group">
                            <label class="form-label">Betrag (€)</label>
                            <input type="number" id="expAmount" class="form-input" value="${amount}" placeholder="0.00" step="0.01">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Datum</label>
                            <input type="date" id="expDate" class="form-input" value="${today}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label><input type="checkbox" id="expUrgent"> 🔥 Wichtig / Dringend</label>
                    </div>
                    <div style="position: sticky; bottom: -20px; background: var(--bg-card); padding-top: 10px; padding-bottom: 20px; border-top: 1px solid var(--border); margin-top: 20px; margin-left: -20px; margin-right: -20px; padding-left: 20px; padding-right: 20px;">
                         <button class="btn btn-primary" onclick="app.modals.submitExpense()" style="width:100%;">Speichern</button>
                    </div>

                    ${data.rawTranscript ? `
                    <div style="margin-top:20px; padding:10px; background:rgba(255,255,255,0.03); border-radius:8px; border:1px dashed rgba(255,255,255,0.1);">
                        <div class="text-xs text-muted" style="text-transform:uppercase; margin-bottom:5px;">Gesprochen:</div>
                        <div style="font-style:italic; font-size:0.9rem; color:var(--text-muted);">"${data.rawTranscript}"</div>
                    </div>` : ''}
                </div>`;
            } else if (type === 'addHealthReminder') {
                c.innerHTML = `
                <div style="padding:20px;">
                    <h3>💊 Gesundheits-Erinnerung</h3>
                    <div class="form-group">
                        <label class="form-label">Name</label>
                        <input id="reminderName" class="form-input" placeholder="z.B. Vitamin D">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Typ</label>
                        <select id="reminderType" class="form-input">
                            <option value="medication">Medikament</option>
                            <option value="vitamin">Vitamin</option>
                            <option value="water">Wasser</option>
                            <option value="other">Sonstiges</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Uhrzeit</label>
                        <input type="time" id="reminderTime" class="form-input" value="08:00">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Wiederholung</label>
                        <select id="reminderRepeat" class="form-input">
                            <option value="daily">Täglich</option>
                            <option value="weekly">Wöchentlich</option>
                            <option value="custom">Benutzerdefiniert</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Aktueller Vorrat</label>
                        <input type="number" id="reminderStock" class="form-input" placeholder="0" min="0">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Notizen</label>
                        <textarea id="reminderNotes" class="form-input" rows="2" placeholder="Zusätzliche Informationen..."></textarea>
                    </div>
                    <button class="btn btn-primary" onclick="app.modals.submitHealthReminder()" style="margin-top:10px;width:100%;">Speichern</button>
                </div>`;
            } else if (type === 'hydrationSettings') {
                const goal = app.state.hydrationGoal || 2.5;
                const interval = app.state.hydrationReminderInterval || 120;
                const method = app.state.hydrationReminderMethod || 'popup';
                const enabled = app.state.hydrationReminderEnabled || false;
                const weightEnabled = app.state.weightReminderEnabled || false;
                const weightDay = app.state.weightReminderDay || 1; // Monday

                const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

                c.innerHTML = `
                <div style="padding:20px; max-height:80vh; overflow-y:auto;">
                    <h3>💧 Gesundheits-Erinnerungen</h3>
                    
                    <h4 style="margin-top:20px; border-bottom:1px solid var(--border); padding-bottom:5px;">Hydration</h4>
                    <div class="form-group">
                        <label class="form-label">Tägliches Ziel (Liter)</label>
                        <input type="number" id="hydrationGoal" class="form-input" value="${goal}" step="0.1" min="0.5">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Erinnerungsintervall (Minuten)</label>
                        <input type="number" id="hydrationInterval" class="form-input" value="${interval}" step="15" min="15">
                    </div>
                    <div class="form-group">
                        <label><input type="checkbox" id="hydrationEnabled" ${enabled ? 'checked' : ''}> Wasser-Erinnerungen aktivieren</label>
                    </div>
                    
                    <h4 style="margin-top:20px; border-bottom:1px solid var(--border); padding-bottom:5px;">Gewicht</h4>
                    <div class="form-group">
                        <label class="form-label">Wiegetag</label>
                        <select id="weightDay" class="form-input">
                            ${days.map((day, i) => `<option value="${i}" ${i === weightDay ? 'selected' : ''}>${day}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label><input type="checkbox" id="weightEnabled" ${weightEnabled ? 'checked' : ''}> Wöchentliche Gewichts-Erinnerung aktivieren</label>
                    </div>
                    
                    <h4 style="margin-top:20px; border-bottom:1px solid var(--border); padding-bottom:5px;">Erinnerungsmethode</h4>
                    <div class="form-group">
                        <select id="hydrationMethod" class="form-input">
                            <option value="popup" ${method === 'popup' ? 'selected' : ''}>Popup</option>
                            <option value="sound" ${method === 'sound' ? 'selected' : ''}>Sound</option>
                            <option value="blink" ${method === 'blink' ? 'selected' : ''}>Blinken</option>
                            <option value="all" ${method === 'all' ? 'selected' : ''}>Alle</option>
                        </select>
                    </div>
                    
                    <button class="btn btn-primary" onclick="app.modals.submitHydrationSettings()" style="margin-top:10px;width:100%;">Speichern</button>
                </div>`;
            } else if (type === 'viewArchive') {
                const archives = (app.state.archives || []).filter(a => a.type === 'task').sort((a, b) => new Date(b.archivedAt) - new Date(a.archivedAt));
                c.innerHTML = `
                <div style="padding:20px; max-height:80vh; overflow-y:auto;">
                    <h3><i data-lucide="archive" class="text-muted"></i> Aufgaben Archiv</h3>
                    <p class="text-sm text-muted mb-4">Hier landen erledigte Aufgaben.</p>
                    
                    ${archives.length === 0 ? '<div class="text-center text-muted p-4">Das Archiv ist leer.</div>' : ''}
                    
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        ${archives.map(t => `
                            <div class="card" style="padding:12px; margin:0; display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <div style="font-weight:600; text-decoration:line-through; opacity:0.7;">${t.title}</div>
                                    <div class="text-xs text-muted">Archiviert: ${new Date(t.archivedAt).toLocaleDateString()}</div>
                                </div>
                                <button class="btn-small" onclick="app.tasks.add('${t.title}', ${t.urgent}, 'todo'); app.modals.close();">
                                    <i data-lucide="rotate-ccw"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                    
                    <button class="btn" style="width:100%; margin-top:20px;" onclick="app.modals.close()">Schließen</button>
                    ${window.lucide ? '<script>lucide.createIcons();</script>' : ''}
                </div>`;
            } else if (type === 'addMeeting') {
                const today = new Date().toISOString().split('T')[0];
                c.innerHTML = `
                <div style="padding:20px;">
                    <h3><i data-lucide="users-2"></i> Meeting Protokoll</h3>
                    <div class="form-group">
                        <label class="form-label">Titel / Thema</label>
                        <input id="meetTitle" class="form-input" placeholder="z.B. Kickoff Projekt X">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Datum</label>
                        <input type="date" id="meetDate" class="form-input" value="${today}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Teilnehmer</label>
                        <input id="meetAttendees" class="form-input" placeholder="Namen, durch Komma getrennt">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Notizen & Beschlüsse</label>
                        <textarea id="meetNotes" class="form-input" rows="6" placeholder="Was wurde besprochen?"></textarea>
                    </div>
                    <button class="btn btn-primary" onclick="app.modals.submitMeeting()" style="width:100%; margin-top:10px;">Speichern</button>
                </div>`;
            } else if (type === 'viewMeetings') {
                const ms = (app.state.meetings || []).sort((a, b) => new Date(b.date) - new Date(a.date));
                c.innerHTML = `
                <div style="padding:20px; max-height:80vh; overflow-y:auto;" id="viewMeetingsList">
                    <h3><i data-lucide="file-text"></i> Alle Protokolle</h3>
                    ${ms.length === 0 ? '<div class="text-muted text-center p-4">Keine Einträge.</div>' : ''}
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        ${ms.map(m => `
                            <div class="card" style="padding:15px; margin:0;">
                                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                                    <div style="font-weight:bold;">${m.title}</div>
                                    <div class="text-xs text-muted">${new Date(m.date).toLocaleDateString()}</div>
                                </div>
                                <div class="text-xs text-muted mb-2"><i data-lucide="users" size="10"></i> ${m.attendees || 'Keine Teilnehmer'}</div>
                                <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:8px; font-size:0.9rem; white-space:pre-wrap;">${m.notes}</div>
                                <button class="btn-small" onclick="app.meetings.delete(${m.id})" style="margin-top:10px; background:rgba(239,68,68,0.1); color:var(--danger); border:none; width:100%;">
                                    <i data-lucide="trash-2" size="14"></i> Löschen
                                </button>
                            </div>
                        `).join('')}
                    </div>
                    <button class="btn" style="width:100%; margin-top:20px;" onclick="app.modals.close()">Schließen</button>
                    ${window.lucide ? '<script>lucide.createIcons();</script>' : ''}
                </div>`;
            } else if (type === 'viewMealPlan') {
                const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
                const meals = app.state.meals || new Array(7).fill('');

                c.innerHTML = `
                <div style="padding:20px; max-height:80vh; overflow-y:auto;">
                    <h3><i data-lucide="utensils" class="text-success"></i> Wochen-Menüplan</h3>
                    <p class="text-muted text-sm mb-4">Was koche ich heute?</p>
                    
                    <div style="display:flex; flex-direction:column; gap:15px;">
                        ${days.map((d, i) => `
                            <div>
                                <label class="text-xs text-muted" style="text-transform:uppercase; font-weight:600;">${d}</label>
                                <div style="display:flex; gap:10px;">
                                    <input type="text" class="form-input" value="${meals[i] || ''}" placeholder="Gericht planen..." 
                                        onchange="app.meals.save(${i}, this.value)" style="border-left:3px solid var(--success);">
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <button class="btn" style="width:100%; margin-top:20px;" onclick="app.modals.close()">Fertig</button>
                    ${window.lucide ? '<script>lucide.createIcons();</script>' : ''}
                </div>`;
            } else if (type === 'addTeamMember') {
                c.innerHTML = `<div style="padding:20px;"><h3>Mitarbeiter hinzufügen</h3><input id="teamMemberName" class="form-input" placeholder="Name"><button class="btn btn-primary" onclick="app.modals.submitTeamMember()" style="margin-top:10px;width:100%;">Hinzufügen</button></div>`;
            } else if (type === 'dailyStatus') {
                const now = new Date();
                const todayStr = now.toISOString().split('T')[0];
                const dateDisplay = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

                // --- DATA ---
                const events = (app.state.events || [])
                    .filter(e => e.start.startsWith(todayStr))
                    .sort((a, b) => new Date(a.start) - new Date(b.start));

                const tasksOpen = (app.state.tasks || []).filter(t => !t.done && t.category !== 'shopping');
                const tasksUrgent = tasksOpen.filter(t => t.urgent);

                const habitsToday = (app.state.habits || []).filter(h => !h.days || h.days.includes(now.getDay()));
                const habitsDone = habitsToday.filter(h => h.history && h.history.includes(todayStr)).length;

                const spentToday = (app.state.expenses || [])
                    .filter(e => e.date === todayStr)
                    .reduce((sum, e) => sum + e.amount, 0);

                const waterToday = (app.state.healthData || [])
                    .filter(d => d.type === 'water' && d.date === todayStr)
                    .reduce((sum, d) => sum + d.value, 0);
                const waterGoal = app.state.hydrationGoal || 2.5;

                // --- UI ---
                c.innerHTML = `
                <div style="padding: 20px 20px 80px 20px; max-height: 85vh; overflow-y: auto;">
                    <button style="position:absolute; top:15px; right:15px; background:none; border:none; color:var(--text-muted);" onclick="app.modals.close()"><i data-lucide="x"></i></button>
                    
                    <div style="text-align: center; margin-bottom: 25px;">
                        <h2 style="font-size: 1.8rem; margin-bottom: 5px;">Tages-Check</h2>
                        <div class="text-muted">${dateDisplay}</div>
                    </div>

                    ${tasksUrgent.length > 0 ? `
                    <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid var(--danger); border-radius: 12px; padding: 15px; margin-bottom: 25px;">
                        <div style="color: var(--danger); font-weight: bold; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                            <i data-lucide="alert-triangle"></i> Dringend!
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            ${tasksUrgent.map(t => `<div style="background: rgba(0,0,0,0.2); padding: 8px 12px; border-radius: 8px; font-size: 0.95rem;">${t.title}</div>`).join('')}
                        </div>
                    </div>` : ''}

                    <div style="margin-bottom: 25px;">
                        <h4 style="margin-bottom: 15px; display:flex; align-items:center; gap:8px;"><i data-lucide="calendar" size="18" class="text-primary"></i> Termine Heute</h4>
                        ${events.length > 0 ? `
                            <div style="display: flex; flex-direction: column; gap: 12px;">
                                ${events.map(e => {
                    const time = new Date(e.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const isPast = new Date(e.start) < now;
                    return `
                                    <div style="display: flex; align-items: center; gap: 15px; opacity: ${isPast ? 0.5 : 1}; padding: 10px; background: rgba(255,255,255,0.03); border-radius: 10px;">
                                        <div style="background: var(--surface); padding: 5px 10px; border-radius: 8px; font-weight: bold; min-width: 60px; text-align: center;">${time}</div>
                                        <div>
                                            <div style="font-weight: 600;">${e.title}</div>
                                            ${e.location ? `<div class="text-xs text-muted">📍 ${e.location}</div>` : ''}
                                        </div>
                                    </div>`;
                }).join('')}
                            </div>
                        ` : `<div class="text-muted text-sm" style="padding:10px; text-align:center; background:rgba(255,255,255,0.03); border-radius:10px;">Heute keine Termine mehr.</div>`}
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px;">
                        <div class="card" style="padding: 15px; margin: 0; background: rgba(255,255,255,0.03);">
                            <div class="text-muted text-xs mb-1">Aufgaben</div>
                            <div style="font-size: 1.4rem; font-weight: bold;">${tasksOpen.length} <span class="text-sm text-muted font-normal">Offen</span></div>
                        </div>
                        <div class="card" style="padding: 15px; margin: 0; background: rgba(255,255,255,0.03);">
                            <div class="text-muted text-xs mb-1">Habits</div>
                            <div style="font-size: 1.4rem; font-weight: bold;">${habitsDone}/${habitsToday.length}</div>
                            <div style="width: 100%; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; margin-top: 8px; overflow: hidden;">
                                <div style="height: 100%; width: ${habitsToday.length ? (habitsDone / habitsToday.length) * 100 : 0}%; background: var(--success);"></div>
                            </div>
                        </div>
                    </div>

                    <div style="margin-bottom: 25px;">
                        <h4 style="margin-bottom: 15px; display:flex; align-items:center; gap:8px;"><i data-lucide="bar-chart-2" size="18" class="text-accent"></i> Status</h4>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 12px;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <i data-lucide="droplet" class="text-primary"></i>
                                    <span>Wasser</span>
                                </div>
                                <div style="font-weight: bold;">${waterToday.toFixed(1)} / ${waterGoal} L</div>
                            </div>
                            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 12px;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <i data-lucide="euro" class="text-danger"></i>
                                    <span>Ausgaben</span>
                                </div>
                                <div style="font-weight: bold;">${spentToday.toFixed(2)} €</div>
                            </div>
                        </div>
                    </div>

                    <button class="btn btn-primary" style="width: 100%; padding: 15px; font-size:1.1rem;" onclick="app.modals.close()">
                        Alles Klar ✅
                    </button>
                    ${window.lucide ? '<script>lucide.createIcons();</script>' : ''}
                </div>`;
            } else if (type === 'addShortcut') {
                const s = data.id ? app.state.shortcuts.find(x => x.id === data.id) : { name: '', url: '', icon: 'external-link' };
                c.innerHTML = `
                <div style="padding:20px;">
                    <h3>🚀 App / Link hinzufügen</h3>
                    <div class="form-group">
                        <label class="form-label">Name der App</label>
                        <input id="shortcutName" class="form-input" value="${s.name}" placeholder="z.B. Facebook">
                    </div>
                    <div class="form-group">
                        <label class="form-label">URL / Link</label>
                        <input id="shortcutUrl" class="form-input" value="${s.url}" placeholder="https://facebook.com">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Icon (Emoji, Lucide oder Bild)</label>
                        <div style="display:flex; gap:5px; align-items:center;">
                            <div id="shortcutIconPreview" style="width:40px; height:40px; background:rgba(255,255,255,0.05); border-radius:8px; display:flex; align-items:center; justify-content:center; border:1px solid var(--border);">
                                ${s.icon && s.icon.startsWith('data:image') ? `<img src="${s.icon}" style="width:24px; height:24px; object-fit:contain;">` : `<i data-lucide="${s.icon || 'external-link'}"></i>`}
                            </div>
                            <input id="shortcutIcon" class="form-input" value="${s.icon}" placeholder="Icon Name oder Emoji" style="flex:1;">
                            <button class="btn btn-secondary" onclick="app.ai.openQuery('Welches Lucide Icon passt zu '+document.getElementById('shortcutName').value + '? Antworte nur mit dem Namen.')" title="KI Vorschlag"><i data-lucide="sparkles"></i></button>
                            <button class="btn btn-secondary" onclick="document.getElementById('shortcutImageInput').click()" title="Bild hochladen"><i data-lucide="image"></i></button>
                            <input type="file" id="shortcutImageInput" accept="image/*" style="display:none" onchange="app.shortcuts.handleImageUpload(this)">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Position auf Dashboard</label>
                        <select id="shortcutOrder" class="form-input">
                            <option value="5" ${s.order == 5 ? 'selected' : ''}>Ganz oben</option>
                            <option value="15" ${s.order == 15 ? 'selected' : ''}>Nach Kommunikation</option>
                            <option value="35" ${s.order == 35 ? 'selected' : ''}>Nach Zeitplan</option>
                            <option value="55" ${s.order == 55 ? 'selected' : ''}>Nach Aufgaben</option>
                            <option value="75" ${s.order == 75 ? 'selected' : ''}>Nach Gesundheit</option>
                            <option value="95" ${s.order == 95 ? 'selected' : ''}>Nach Finanzen</option>
                            <option value="115" ${s.order == 115 || !s.order ? 'selected' : ''}>Ganz unten</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                            <input type="checkbox" id="shortcutIsCard" ${s.isCard ? 'checked' : ''}>
                            Als eigene Kachel auf Dashboard anzeigen
                        </label>
                    </div>
                    <div style="display:flex; gap:10px; margin-top:20px;">
                        <button class="btn" style="flex:1" onclick="app.modals.close()">Abbrechen</button>
                        <button class="btn btn-primary" style="flex:1" onclick="app.modals.submitShortcut(${data.id || 'null'})">Speichern</button>
                    </div>
                </div>`;
            } else if (type === 'addHabit') {
                const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
                c.innerHTML = `
                <div style="padding:20px;">
                    <h3>Neue Gewohnheit</h3>
                    <div class="form-group">
                        <label class="form-label">Name</label>
                        <input id="habitName" class="form-input" placeholder="z.B. Hund laufen">
                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:15px;">
                        <div class="form-group">
                            <label class="form-label" style="font-size:0.75rem;">Kategorie</label>
                            <select id="habitCategory" class="form-input" style="font-size:0.85rem; padding:8px;">
                                <option value="private">Privat / Familie</option>
                                <option value="business">Business</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label" style="font-size:0.75rem;">Sichtbarkeit</label>
                            <select id="habitVisibility" class="form-input" style="font-size:0.85rem; padding:8px;">
                                <option value="private">Nur ich</option>
                                <option value="team">Team Sichtbarkeit</option>
                                <option value="public">Öffentlich</option>
                            </select>
                        </div>
                    </div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                        <div class="form-group">
                            <label class="form-label">Uhrzeit (Optional)</label>
                            <input type="time" id="habitTime" class="form-input">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Ziel (Tage)</label>
                            <input type="number" id="habitGoal" class="form-input" value="30">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Tage</label>
                        <div style="display:flex; flex-wrap:wrap; gap:8px;">
                            ${days.map((d, i) => `
                                <label style="display:flex; align-items:center; gap:3px; background:rgba(255,255,255,0.05); padding:5px 8px; border-radius:5px; cursor:pointer; font-size:0.8rem;">
                                    <input type="checkbox" name="habitDays" value="${i}" checked> ${d}
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    <div class="form-group">
                        <label><input type="checkbox" id="habitUrgent"> 🔥 Dringend?</label>
                    </div>
                    <button class="btn btn-primary" onclick="app.modals.submitHabit()" style="margin-top:10px;width:100%;">Speichern</button>
                </div>`;
            } else if (type === 'editContact') {
                const con = data;
                c.innerHTML = `
                <div style="padding:20px; max-height:80vh; overflow-y:auto;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                        <h3><i data-lucide="edit-2" class="text-primary"></i> Kontakt bearbeiten</h3>
                        <button onclick="app.modals.close()" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:1.5rem;"><i data-lucide="x"></i></button>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Name</label>
                        <input id="editContactName" class="form-input" value="${con.name}" placeholder="Name">
                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                        <div class="form-group">
                            <label class="form-label">Telefon</label>
                            <input id="editContactPhone" class="form-input" value="${con.phone || ''}" placeholder="Telefon" style="font-size:1rem; padding:12px;">
                        </div>
                        <div class="form-group">
                            <label class="form-label">E-Mail</label>
                            <input id="editContactEmail" class="form-input" type="email" value="${con.email || ''}" placeholder="Email" style="font-size:1rem; padding:12px;">
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Adresse / Standort</label>
                        <textarea id="editContactAddress" class="form-input" placeholder="Straße und Hausnummer&#10;Postleitzahl Stadt" style="font-size:1rem; padding:12px; min-height:80px; resize:vertical;">${con.address || ''}</textarea>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Website / Homepage</label>
                        <input id="editContactHomepage" class="form-input" value="${con.homepage || ''}" placeholder="https://www.beispiel.de" style="font-size:1rem; padding:12px;">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Kategorie</label>
                        <select id="editContactCategory" class="form-input" style="font-size:0.85rem; padding:8px;">
                            <option value="private" ${(con.category || 'private') === 'private' ? 'selected' : ''}>Privat / Familie</option>
                            <option value="business" ${(con.category || 'private') === 'business' ? 'selected' : ''}>Business</option>
                        </select>
                    </div>

                    <div style="display:flex; gap:10px; margin-top:20px;">
                        <button class="btn" style="flex:1;" onclick="app.modals.close()">Abbrechen</button>
                        <button class="btn btn-primary" style="flex:1;" onclick="app.contacts.saveEdit(${con.id})"><i data-lucide="save"></i> Speichern</button>
                    </div>
                </div>`;
            } else if (type === 'viewContactCard') {
                const con = data;
                c.innerHTML = `
                <div style="width:100%; max-width:380px; background: #0c0c0c; border-radius: 28px; overflow:hidden; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 30px 60px rgba(0,0,0,0.8);">
                    <div style="padding: 24px; background: linear-gradient(135deg, var(--primary), var(--accent)); text-align:center; position:relative;">
                        <button onclick="app.modals.close()" style="position:absolute; top:15px; right:15px; background:rgba(0,0,0,0.2); border:none; color:white; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer;"><i data-lucide="x" size="16"></i></button>
                        <div style="width:70px; height:70px; background:rgba(255,255,255,0.2); border-radius:20px; display:flex; align-items:center; justify-content:center; margin:0 auto 12px auto; font-size:2rem; font-weight:bold; color:white; backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,0.3);">${con.name.charAt(0).toUpperCase()}</div>
                        <h2 style="margin:0; font-size:1.5rem; letter-spacing:-0.5px;">${con.name}</h2>
                        <div style="font-size:0.7rem; opacity:0.8; text-transform:uppercase; margin-top:4px; font-weight:700; letter-spacing:1px;">
                            ${con.category === 'business' ? '🏢 Business Partner' : '👤 Kontakt'}
                        </div>
                    </div>

                    <div style="padding:20px; display:flex; flex-direction:column; gap:12px;">
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                            ${con.phone ? `
                            <button onclick="app.contacts.call('${con.phone}')" style="background:rgba(59, 130, 246, 0.1); border:1px solid rgba(59, 130, 246, 0.2); padding:12px; border-radius:16px; color:white; display:flex; flex-direction:column; align-items:center; gap:5px; cursor:pointer;">
                                <i data-lucide="phone" size="18" class="text-primary"></i>
                                <span style="font-size:0.75rem; font-weight:600;">Anruf</span>
                            </button>
                            <button onclick="app.contacts.whatsapp('${con.phone}')" style="background:rgba(37, 211, 102, 0.1); border:1px solid rgba(37, 211, 102, 0.2); padding:12px; border-radius:16px; color:white; display:flex; flex-direction:column; align-items:center; gap:5px; cursor:pointer;">
                                <i data-lucide="message-circle" size="18" style="color:#25D366;"></i>
                                <span style="font-size:0.75rem; font-weight:600;">WhatsApp</span>
                            </button>` : ''}
                        </div>

                        ${con.email ? `
                        <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.03); padding:12px; border-radius:16px; border:1px solid rgba(255,255,255,0.05);">
                            <div style="display:flex; align-items:center; gap:12px;">
                                <i data-lucide="mail" size="16" class="text-accent"></i>
                                <span style="font-size:0.85rem; font-weight:500;">${con.email}</span>
                            </div>
                            <button onclick="app.contacts.mail('${con.email}')" style="background:none; border:none; color:var(--accent); cursor:pointer;"><i data-lucide="send" size="16"></i></button>
                        </div>` : ''}

                        ${con.address ? `
                        <div style="background:rgba(255,255,255,0.03); padding:12px; border-radius:16px; border:1px solid rgba(255,255,255,0.05);">
                            <div style="display:flex; align-items:flex-start; gap:12px; margin-bottom:10px;">
                                <i data-lucide="map-pin" size="16" style="opacity:0.6;"></i>
                                <span style="font-size:0.8rem; line-height:1.4;">${con.address}</span>
                            </div>
                            <iframe 
                                width="100%" 
                                height="150" 
                                style="border:0; border-radius:12px; margin-bottom:10px; opacity: 0.8;" 
                                loading="lazy" 
                                allowfullscreen 
                                src="https://maps.google.com/maps?q=${encodeURIComponent(con.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed">
                            </iframe>
                            <button class="btn btn-primary" onclick="window.open('https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(con.address)}', '_blank')" style="width:100%; height:36px; border-radius:10px; font-size:0.85rem;">
                                <i data-lucide="navigation" size="14"></i> Navigation starten
                            </button>
                        </div>` : ''}

                        ${con.homepage ? `
                        <button class="btn" style="width:100%; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:12px; height:36px; font-size:0.85rem;" onclick="window.open('${con.homepage.startsWith('http') ? con.homepage : 'https://' + con.homepage}', '_blank')">
                            <i data-lucide="globe"></i> Website öffnen
                        </button>` : ''}

                        <div style="display:flex; gap:10px; margin-top:12px; padding:0 10px;">
                            <button class="btn" style="flex:1; background:rgba(59, 130, 246, 0.3); border:1px solid rgba(59, 130, 246, 0.6); height:44px; font-size:0.8rem; font-weight:600; color:var(--primary); border-radius:12px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;" onclick="app.contacts.editContact(${con.id})"><i data-lucide="edit" size="18"></i> Bearbeiten</button>
                            <button class="btn" style="flex:1; background:rgba(239, 68, 68, 0.3); border:1px solid rgba(239, 68, 68, 0.5); height:44px; font-size:0.8rem; font-weight:600; color:#ff6b6b; border-radius:12px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;" onclick="if(confirm('Kontakt wirklich löschen?')) { app.contacts.delete(${con.id}); app.modals.close(); }"><i data-lucide="trash-2" size="18"></i> Löschen</button>
                        </div>
                            <button class="btn" style="flex:1; background:rgba(239, 68, 68, 0.05); height:32px; font-size:0.7rem; color:var(--danger);" onclick="if(confirm('Entfernen?')) { app.contacts.delete(${con.id}); app.modals.close(); }"><i data-lucide="trash-2" size="12"></i> Löschen</button>
                        </div>
                    </div>
                </div>`;
            } else if (type === 'configureWidgets') {
                const mode = app.state.ui && app.state.ui.dashboardMode ? app.state.ui.dashboardMode : 'business';
                const modeKey = 'hiddenCards' + (mode.charAt(0).toUpperCase() + mode.slice(1));

                // Migration: If old global array exists, distribute it
                if (app.state.ui && app.state.ui.hiddenCards && Array.isArray(app.state.ui.hiddenCards)) {
                    app.state.ui.hiddenCardsBusiness = [...app.state.ui.hiddenCards];
                    app.state.ui.hiddenCardsPrivate = [...app.state.ui.hiddenCards];
                    delete app.state.ui.hiddenCards;
                    app.saveState();
                }

                const hidden = (app.state.ui && app.state.ui[modeKey]) ? app.state.ui[modeKey] : [];
                let cards = [
                    { id: 'dashboardAiCard', name: 'AI Assistant', icon: 'sparkles' },
                    { id: 'dashboardCommunicationCard', name: 'Kommunikation', icon: 'message-square' },
                    { id: 'dashboardStatusCard', name: 'Tages-Check', icon: 'clipboard-check' },
                    { id: 'dashboardEventsCard', name: 'Zeitplan / Termine', icon: 'calendar' },
                    { id: 'dashboardTasksCard', name: 'Aufgaben (To-Do)', icon: 'check-square' },
                    { id: 'dashboardShoppingCard', name: 'Einkaufsliste', icon: 'shopping-cart' },
                    { id: 'dashboardContactsCard', name: 'Kontakte (Favoriten)', icon: 'users' },
                    { id: 'dashboardHealthCard', name: 'Gesundheits-Tracker', icon: 'heart' },
                    { id: 'dashboardHabitsCard', name: 'Gewohnheiten', icon: 'flame' },
                    { id: 'dashboardFinanceCard', name: 'Finanzen', icon: 'pie-chart' },
                    { id: 'dashboardAlarmsCard', name: 'Wecker', icon: 'alarm-clock' },
                    { id: 'dashboardDriveCard', name: 'Drive / Fahrt-Modus', icon: 'navigation' },
                    { id: 'dashboardShortcutsCard', name: 'Apps & Links', icon: 'layers' },
                    { id: 'dashboardSearchCard', name: 'Business Suche', icon: 'search' },
                    { id: 'dashboardTimeTrackerCard', name: 'Zeit-Tracker', icon: 'clock' },
                    { id: 'dashboardNotesCard', name: 'Notizen', icon: 'sticky-note' },
                    { id: 'dashboardProjectsCard', name: 'Projekt-Management', icon: 'briefcase' },
                    { id: 'dashboardMeetingsCard', name: 'Meeting-Protokolle', icon: 'users-2' },
                    { id: 'dashboardHouseholdCard', name: 'Haushalt', icon: 'home' },
                    { id: 'dashboardMealPlanCard', name: 'Wochenmenü', icon: 'utensils' },
                    { id: 'dashboardPrivateDriveCard', name: 'Privater Drive Mode', icon: 'car' }
                ];

                // Strict Mode Filtering for Configuration
                const businessOnly = ['dashboardProjectsCard', 'dashboardMeetingsCard', 'dashboardSearchCard', 'dashboardTimeTrackerCard', 'dashboardDriveCard'];
                const privateOnly = ['dashboardHouseholdCard', 'dashboardMealPlanCard', 'dashboardPrivateDriveCard', 'dashboardHabitsCard', 'dashboardHealthCard', 'dashboardShoppingCard', 'dashboardAlarmsCard'];

                if (mode === 'business') {
                    cards = cards.filter(c => !privateOnly.includes(c.id));
                } else {
                    cards = cards.filter(c => !businessOnly.includes(c.id));
                }

                c.innerHTML = `
                <div style="padding:20px; max-height:80vh; overflow-y:auto;">
                    <h3><i data-lucide="layout" class="text-primary"></i> Dashboard Widgets (${mode === 'business' ? 'Business' : 'Privat'})</h3>
                    <p class="text-muted text-sm mb-4">Wähle aus, welche Karten im <strong>${mode === 'business' ? 'Business' : 'Privat'}</strong> Modus angezeigt werden sollen.</p>
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        ${cards.map(card => {
                    const isVisible = !hidden.includes(card.id);
                    return `
                            <div class="card" style="display:flex; align-items:center; justify-content:space-between; padding:15px; margin:0; cursor:pointer;" onclick="app.dashboard.toggleCardVisibility('${card.id}')">
                                <div style="display:flex; align-items:center; gap:15px;">
                                    <i data-lucide="${card.icon}" class="text-muted"></i>
                                    <span style="font-weight:600; ${!isVisible ? 'opacity:0.5' : ''}">${card.name}</span>
                                </div>
                                <div class="checkbox-circle ${isVisible ? 'checked' : ''}" style="width:24px; height:24px;"></div>
                            </div>
                            `;
                }).join('')}
                    </div>
                     <button class="btn btn-primary" onclick="app.modals.close()" style="margin-top:20px;width:100%;">Fertig</button>
                     ${window.lucide ? '<script>lucide.createIcons();</script>' : ''}
                </div>`;
            } else if (type === 'aiBriefing') {
                c.innerHTML = `
                <div style="padding:20px; max-height:85vh; overflow-y:auto;">
                    <button style="position:absolute; top:15px; right:15px; background:none; border:none; color:var(--text-muted);" onclick="app.modals.close()"><i data-lucide="x"></i></button>
                    ${data.html}
                    <button class="btn btn-primary" style="width:100%; margin-top:15px; padding:12px;" onclick="app.modals.close(); window.speechSynthesis.cancel();">Danke, Verstanden</button>
                </div>`;
            } else if (type === 'householdAdd') {
                c.innerHTML = `
                <div style="padding:20px;">
                    <h3><i data-lucide="home" class="text-success"></i> Haushaltsaufgabe</h3>
                    <div class="form-group">
                        <label class="form-label">Aufgabe</label>
                        <input id="householdTask" class="form-input" placeholder="z.B. Wäsche waschen">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Kategorie</label>
                        <select id="householdCategory" class="form-input">
                            <option value="cleaning">Putzen</option>
                            <option value="laundry">Wäsche</option>
                            <option value="cooking">Kochen</option>
                            <option value="shopping">Einkaufen</option>
                            <option value="maintenance">Reparatur</option>
                            <option value="garden">Garten</option>
                            <option value="other">Sonstiges</option>
                        </select>
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                        <div class="form-group">
                            <label class="form-label">Datum (Optional)</label>
                            <input type="date" id="householdDate" class="form-input">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Uhrzeit (Optional)</label>
                            <input type="time" id="householdTime" class="form-input">
                        </div>
                    </div>
                    <div class="form-group">
                        <label><input type="checkbox" id="householdUrgent"> 🔥 Dringend?</label>
                    </div>
                    <div style="display:flex; gap:10px; margin-top:20px;">
                        <button class="btn" style="flex:1" onclick="app.modals.close()">Abbrechen</button>
                        <button class="btn btn-primary" style="flex:1" onclick="app.modals.submitHousehold()">Speichern</button>
                    </div>
                </div>`;
            } else if (type === 'importBusiness') {
                c.innerHTML = `
                <div style="padding:28px; max-width: 550px; background: linear-gradient(135deg, rgba(20, 20, 20, 0.95), rgba(0, 0, 0, 0.98)); border-radius: 28px;">
                    <div style="display:flex; align-items:center; gap:16px; margin-bottom:24px;">
                        <div style="width:52px; height:52px; background:linear-gradient(135deg, var(--primary), var(--accent)); border-radius:16px; display:flex; align-items:center; justify-content:center; box-shadow: 0 8px 20px rgba(255,255,255,0.1);">
                            <i data-lucide="sparkles" color="white" size="24"></i>
                        </div>
                        <div>
                            <h2 style="margin:0; font-size:1.5rem; letter-spacing:-0.5px;">Smart Business Import</h2>
                            <p class="text-muted text-sm">Präzise Datenextraktion mit AI</p>
                        </div>
                    </div>
                    
                    <div style="background: rgba(255,255,255,0.03); padding: 20px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 24px;">
                        <div class="form-group" style="margin-bottom:15px;">
                            <label class="form-label" style="font-weight:600; font-size:0.75rem; text-transform:uppercase; letter-spacing:1px; opacity:0.6;">Schritt 1: Website Link</label>
                            <input id="importUrl" class="form-input" placeholder="https://www.firma.de" style="border-radius:12px; background:rgba(0,0,0,0.5);">
                        </div>

                        <div class="form-group" style="margin:0;">
                            <label class="form-label" style="font-weight:600; font-size:0.75rem; text-transform:uppercase; letter-spacing:1px; opacity:0.6;">Schritt 2: Deep Analysis (Empfohlen)</label>
                            <p class="text-xs text-muted" style="margin-bottom:8px;">Kopiere den Text aus dem <strong>Impressum</strong> oder <strong>Footer</strong> hier hinein für 100% Genauigkeit:</p>
                            <textarea id="importManualText" class="form-input" rows="4" placeholder="Kopierte Daten hier einfügen..." style="background:rgba(0,0,0,0.5); border-radius:12px; font-size:0.85rem;"></textarea>
                        </div>
                        
                        <button class="btn btn-primary" onclick="app.businessSearch.importFromUrl()" style="width:100%; margin-top:20px; height:48px; border-radius:12px; border-width:2px; font-weight:bold;">
                            <i data-lucide="scan-search"></i> Daten jetzt analysieren
                        </button>
                    </div>
                    
                    <div id="importResults" class="hidden" style="animation: fadeIn 0.4s ease-out;">
                        <div style="display:flex; flex-direction:column; gap:14px; background: rgba(59, 130, 246, 0.05); padding: 20px; border-radius: 20px; border: 1px solid rgba(59, 130, 246, 0.2);">
                            <div class="form-group" style="margin:0;">
                                <label class="form-label">Name / Firma</label>
                                <input id="impName" class="form-input" style="background:rgba(0,0,0,0.4); border-radius:10px;">
                            </div>
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                                <div class="form-group" style="margin:0;">
                                    <label class="form-label">Telefon</label>
                                    <input id="impPhone" class="form-input" style="background:rgba(0,0,0,0.4); border-radius:10px;">
                                </div>
                                <div class="form-group" style="margin:0;">
                                    <label class="form-label">Email</label>
                                    <input id="impEmail" class="form-input" style="background:rgba(0,0,0,0.4); border-radius:10px;">
                                </div>
                            </div>
                            <div class="form-group" style="margin:0;">
                                <label class="form-label">Adresse / Standort</label>
                                <input id="impAddress" class="form-input" style="background:rgba(0,0,0,0.4); border-radius:10px;">
                            </div>
                            <div class="form-group" style="margin:0;">
                                <label class="form-label">Website</label>
                                <input id="impUrl" class="form-input" style="background:rgba(0,0,0,0.4); border-radius:10px;">
                            </div>
                            <button class="btn btn-primary" style="width:100%; margin-top:8px; height:52px; font-size:1.1rem; border-radius:14px;" onclick="app.businessSearch.saveImported()">
                                <i data-lucide="check-circle"></i> In Adressbuch speichern
                            </button>
                        </div>
                    </div>
                    
                    <div id="importLoading" class="hidden" style="text-align:center; padding:40px;">
                        <div style="display:inline-block; margin-bottom:20px; position:relative;">
                             <div class="spinner" style="width:60px; height:60px; border-width:4px;"></div>
                             <i data-lucide="bot" size="24" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); opacity:0.8;" class="text-primary"></i>
                        </div>
                        <h4 style="margin-bottom:8px;">Extrahiere Business-Daten...</h4>
                        <p class="text-muted text-sm">Die AI analysiert den Text auf Firmennamen, Nummern und Adressen.</p>
                    </div>

                    <div style="margin-top:24px; text-align:center; padding-top:20px; border-top: 1px solid rgba(255,255,255,0.05);">
                         <button class="btn" style="background:transparent; border:none; color:var(--text-muted);" onclick="app.modals.close()">Abbrechen</button>
                    </div>
                </div>`;
            }
            if (window.lucide) lucide.createIcons();
        },
        close(fromHistory = false) {
            const o = document.getElementById('modalOverlay');
            if (o) o.classList.add('hidden');
            app.editingId = null;

            // Create loop breaker
            if (!fromHistory) {
                window.history.back();
            }
        },
        // Old saveAlarm removed - now handled by app.alarms.save
        submitTask() {
            const t = document.getElementById('newTaskTitle').value;
            if (t) {
                let cat = 'todo';
                const radio = document.querySelector('input[name="taskCategory"]:checked');
                if (radio) {
                    cat = radio.value;
                } else {
                    const hidden = document.querySelector('input[name="taskCategory"][type="hidden"]');
                    if (hidden) cat = hidden.value;
                }

                const category = document.getElementById('taskCategorySelect')?.value || 'private';
                const visibility = document.getElementById('taskVisibility')?.value || 'private';
                const isShared = visibility !== 'private';
                const shareType = visibility === 'private' ? 'private' : visibility;

                if (isShared) {
                    const confirmed = confirm(`Diesen ${cat === 'shopping' ? 'Einkauf' : 'Eintrag'} wirklich unter "${visibility}" TEILEN?`);
                    if (!confirmed) return;
                }

                app.tasks.add(t, document.getElementById('newTaskUrgent').checked, cat, isShared, shareType);
                this.close();

                // Smart Navigation
                // If we are already on the correct page, stay there and just re-render
                if (cat === 'shopping' && app.state.currentPage === 'shopping') {
                    app.shopping.render();
                } else if (cat !== 'shopping' && app.state.currentPage === 'tasks') {
                    app.tasks.render();
                } else {
                    app.navigateTo('dashboard');
                    app.dashboard.scrollToCard(cat === 'shopping' ? 'dashboardShoppingCard' : 'dashboardTasksCard');
                }
            }
        },
        submitMeeting() {
            const title = document.getElementById('meetTitle').value;
            const date = document.getElementById('meetDate').value;
            if (title && date) {
                const data = {
                    title: title,
                    date: date,
                    attendees: document.getElementById('meetAttendees').value,
                    notes: document.getElementById('meetNotes').value
                };
                app.meetings.save(data);
            } else {
                alert("Bitte Titel und Datum angeben.");
            }
        },
        submitExpense() {
            const d = document.getElementById('expDesc').value;
            const a = document.getElementById('expAmount').value;
            const date = document.getElementById('expDate').value;
            const u = document.getElementById('expUrgent').checked;
            const category = document.getElementById('expCategory')?.value || 'private';
            const visibility = document.getElementById('expVisibility')?.value || 'private';
            const isShared = visibility !== 'private';

            if (d && a && date) {
                if (isShared) {
                    if (!confirm(`Diese Ausgabe wirklich unter "${visibility}" TEILEN?`)) return;
                }
                app.finance.add(a, d, date, u, category, isShared, visibility);
                this.close();
                app.navigateTo('dashboard');
                app.dashboard.scrollToCard('dashboardFinanceCard');
            }
        },
        submitHousehold() {
            const task = document.getElementById('householdTask').value;
            const category = document.getElementById('householdCategory').value;
            const date = document.getElementById('householdDate').value;
            const time = document.getElementById('householdTime').value;
            const urgent = document.getElementById('householdUrgent').checked;

            if (task) {
                if (!app.state.household) app.state.household = [];
                app.state.household.push({
                    id: Date.now(),
                    task: task,
                    category: category,
                    date: date || null,
                    time: time || null,
                    urgent: urgent,
                    done: false,
                    createdAt: new Date().toISOString()
                });
                app.saveState();
                this.close();
                app.renderDashboard();
                app.navigateTo('dashboard');
            } else {
                alert("Bitte Aufgabe eingeben.");
            }
        },
        submitTeamMember() { const n = document.getElementById('teamMemberName').value; if (n) { app.team.addMember(n); this.close(); app.navigateTo('dashboard'); } },
        submitHealthReminder() {
            const data = {
                name: document.getElementById('reminderName').value,
                type: document.getElementById('reminderType').value,
                time: document.getElementById('reminderTime').value,
                repeat: document.getElementById('reminderRepeat').value,
                stock: parseInt(document.getElementById('reminderStock').value) || 0,
                notes: document.getElementById('reminderNotes').value
            };
            app.health.addReminder(data);
            this.close();
            app.navigateTo('dashboard');
            app.dashboard.scrollToCard('dashboardHealthCard');
        },
        submitHydrationSettings() {
            // (Setting update stays on page or optionally dashboard... User said "whatever I save")
            // Assuming settings might be fine to stay, but strictly "egal was speichere" -> Home
            app.state.hydrationGoal = parseFloat(document.getElementById('hydrationGoal').value) || 2.5;
            app.state.hydrationReminderInterval = parseInt(document.getElementById('hydrationInterval').value) || 120;
            app.state.hydrationReminderMethod = document.getElementById('hydrationMethod').value;
            app.state.hydrationReminderEnabled = document.getElementById('hydrationEnabled').checked;

            // Weight settings
            app.state.weightReminderEnabled = document.getElementById('weightEnabled').checked;
            app.state.weightReminderDay = parseInt(document.getElementById('weightDay').value);

            app.saveState();
            app.health.startHydrationMonitoring();
            app.health.startWeightReminder();
            app.health.render();
            this.close();
            app.navigateTo('dashboard');
            app.dashboard.scrollToCard('dashboardHealthCard');
        },
        submitShortcut(id) {
            const name = document.getElementById('shortcutName').value;
            const url = document.getElementById('shortcutUrl').value;
            let icon = document.getElementById('shortcutIcon').value || 'external-link';
            const isCard = document.getElementById('shortcutIsCard').checked;
            const order = parseInt(document.getElementById('shortcutOrder').value) || 115;
            if (name && url) {
                if (!app.state.shortcuts) app.state.shortcuts = [];
                if (id) {
                    const idx = app.state.shortcuts.findIndex(s => s.id === id);
                    if (idx !== -1) app.state.shortcuts[idx] = { ...app.state.shortcuts[idx], name, url, icon, isCard, order };
                } else {
                    app.state.shortcuts.push({ id: Date.now(), name, url, icon, isCard, order });
                }
                app.saveState();
                app.shortcuts.render();
                this.close();
                app.navigateTo('dashboard');
                app.dashboard.scrollToCard('dashboardShortcutsCard');
            }
        },
        submitHabit() {
            const name = document.getElementById('habitName').value;
            if (name) {
                const goal = parseInt(document.getElementById('habitGoal').value) || 30;
                const time = document.getElementById('habitTime').value;
                const urgent = document.getElementById('habitUrgent').checked;
                const days = Array.from(document.querySelectorAll('input[name="habitDays"]:checked')).map(cb => parseInt(cb.value));
                const category = document.getElementById('habitCategory')?.value || 'private';
                const visibility = document.getElementById('habitVisibility')?.value || 'private';

                if (!app.state.habits) app.state.habits = [];
                app.state.habits.push({
                    id: Date.now(),
                    name,
                    streak: 0,
                    goal,
                    time,
                    days,
                    urgent,
                    history: [],
                    category: category,
                    isShared: visibility !== 'private',
                    type: visibility
                });
                app.saveState();
                app.habits.render();
                app.renderDashboard();
                this.close();
                app.navigateTo('dashboard');
                app.dashboard.scrollToCard('dashboardHabitsCard');
            }
        },
        submitEvent() {
            const data = {
                title: document.getElementById('evtTitle').value,
                date: document.getElementById('evtDate').value,
                time: document.getElementById('evtTime').value,
                location: document.getElementById('evtLocation').value,
                phone: document.getElementById('evtPhone').value,
                email: document.getElementById('evtEmail').value,
                notes: document.getElementById('evtNotes').value,
                urgent: document.getElementById('evtUrgent').checked,
                category: document.getElementById('evtCategory')?.value || 'private',
                visibility: document.getElementById('evtVisibility')?.value || 'private',
                isShared: document.getElementById('evtVisibility')?.value !== 'private',
                type: document.getElementById('evtVisibility')?.value || 'private'
            };
            if (data.title && data.date && data.time) {
                if (data.isShared) {
                    const confirmed = confirm(`Diesen Termin wirklich unter "${data.visibility}" TEILEN?`);
                    if (!confirmed) return;
                }
                app.calendar.addEvent(data);
                this.close();
                app.navigateTo('dashboard');
                app.dashboard.scrollToCard('dashboardEventsCard');
            }
        }
    },
    contacts: {
        currentFilter: 'all', // Filter state for contacts
        add(n, p, e, a, h = '') {
            if (!app.state.contacts) app.state.contacts = [];
            app.state.contacts.push({ id: Date.now(), name: n, phone: p, email: e, address: a, homepage: h, category: 'private' });
            app.saveState();
            this.render();
            app.renderDashboard();
            app.modals.close(); // Close if open
            app.navigateTo('dashboard');
        },
        filterContacts(category) {
            this.currentFilter = category;
            // Update button styles
            const allBtn = document.getElementById('contactTabAll');
            const privBtn = document.getElementById('contactTabPrivate');
            const bizBtn = document.getElementById('contactTabBusiness');

            if (allBtn) allBtn.style.background = category === 'all' ? 'var(--primary)' : '';
            if (privBtn) privBtn.style.background = category === 'private' ? 'var(--primary)' : '';
            if (bizBtn) bizBtn.style.background = category === 'business' ? 'var(--primary)' : '';

            this.render();
        },
        delete(id) {
            app.state.contacts = app.state.contacts.filter(c => c.id !== id);
            app.saveState();
            this.render();
            app.renderDashboard();
        },
        call(num) { if (num) window.location.href = `tel:${num}`; },
        whatsapp(num) { if (num) window.open(`https://wa.me/${num.replace(/\D/g, '')}`, '_blank'); },
        mail(email) { if (email) window.location.href = `mailto:${email}`; },
        async importBrowser() {
            try {
                if ('contacts' in navigator && 'ContactsManager' in window) {
                    const props = ['name', 'email', 'tel', 'address'];
                    const contacts = await navigator.contacts.select(props, { multiple: true });
                    if (contacts.length > 0) {
                        contacts.forEach(c => {
                            const name = c.name ? c.name[0] : 'Unbekannt';
                            const phone = c.tel ? c.tel[0] : '';
                            const email = c.email ? c.email[0] : '';
                            if (phone && app.state.contacts.some(existing => existing.phone === phone)) return;
                            this.add(name, phone, email, '', '');
                        });
                        alert(`${contacts.length} Kontakte erfolgreich importiert! ✨`);
                    }
                }
            } catch (err) {
                console.error("Contact Import Error:", err);
            }
        },
        search(q) {
            const list = document.getElementById('contactsList');
            if (!list) return;
            let contacts = (app.state.contacts || []).filter(c =>
                c.name.toLowerCase().includes(q.toLowerCase()) ||
                (c.phone && c.phone.includes(q)) ||
                (c.email && c.email.toLowerCase().includes(q.toLowerCase()))
            );
            // Apply category filter
            if (this.currentFilter !== 'all') {
                contacts = contacts.filter(c => (c.category || 'private') === this.currentFilter);
            }
            this.renderFiltered(contacts);
        },
        renderFiltered(contacts) {
            const list = document.getElementById('contactsList');
            if (!list) return;
            if (contacts.length === 0) {
                list.innerHTML = `<div class="text-muted" style="text-align:center; padding:20px;">Keine Kontakte gefunden.</div>`;
            } else {
                list.style.display = 'flex';
                list.style.flexDirection = 'column';
                list.style.gap = '12px';
                list.style.background = 'rgba(0,0,0,0.2)';
                list.style.padding = '15px';
                list.style.borderRadius = '20px';
                list.style.border = '1px solid rgba(255,255,255,0.05)';

                list.innerHTML = contacts.map(c => `
                    <div class="contact-list-item" style="display:flex; flex-direction:column; gap:12px; padding:16px 20px; background:rgba(255,255,255,0.05); border-radius:14px; transition:all 0.2s ease; border:1px solid rgba(255,255,255,0.08);">
                        <div style="display:flex; align-items:center; justify-content:space-between; gap:15px;">
                            <div onclick="app.contacts.openCard(${c.id})" style="flex:1; display:flex; align-items:center; gap:15px; cursor:pointer;">
                                <div style="width:50px; height:50px; background:linear-gradient(135deg, var(--primary), var(--accent)); border-radius:12px; display:flex; align-items:center; justify-content:center; color:white; font-weight:bold; font-size:1.3rem; flex-shrink:0;">
                                    ${c.name.charAt(0).toUpperCase()}
                                </div>
                                <div style="flex:1; min-width:0;">
                                    <div style="font-weight:700; font-size:1.2rem; color:white; margin-bottom:4px;">${c.name}</div>
                                    <div style="font-size:0.85rem; color:var(--text-muted);">
                                        ${c.phone || c.email || c.address || 'Kontakt'}
                                    </div>
                                </div>
                            </div>
                            <button onclick="event.stopPropagation(); app.contacts.editContact(${c.id})" style="background:rgba(59, 130, 246, 0.2); border:1px solid rgba(59, 130, 246, 0.4); color:var(--primary); padding:10px 16px; border-radius:10px; cursor:pointer; font-size:0.8rem; font-weight:600; transition:all 0.2s; display:flex; align-items:center; gap:6px; white-space:nowrap;" onmouseover="this.style.background='rgba(59, 130, 246, 0.4)'" onmouseout="this.style.background='rgba(59, 130, 246, 0.2)'">
                                <i data-lucide="edit-2" size="14"></i>Bearbeiten
                            </button>
                        </div>
                        
                        <!-- Action Buttons -->
                        <div style="display:flex; gap:8px; flex-wrap:wrap;">
                            ${c.phone ? `
                                <button onclick="window.location.href='tel:${c.phone}'" style="flex:1; min-width:120px; padding:12px 16px; background:rgba(34,197,94,0.15); border:1px solid rgba(34,197,94,0.3); border-radius:10px; color:#22c55e; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; font-size:0.9rem; font-weight:600; transition:all 0.2s;" onmouseover="this.style.background='rgba(34,197,94,0.25)'" onmouseout="this.style.background='rgba(34,197,94,0.15)'">
                                    <i data-lucide="phone" size="16"></i>
                                    <span>Anrufen</span>
                                </button>
                            ` : ''}
                            ${c.email ? `
                                <button onclick="window.location.href='mailto:${c.email}'" style="flex:1; min-width:120px; padding:12px 16px; background:rgba(59,130,246,0.15); border:1px solid rgba(59,130,246,0.3); border-radius:10px; color:#3b82f6; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; font-size:0.9rem; font-weight:600; transition:all 0.2s;" onmouseover="this.style.background='rgba(59,130,246,0.25)'" onmouseout="this.style.background='rgba(59,130,246,0.15)'">
                                    <i data-lucide="mail" size="16"></i>
                                    <span>E-Mail</span>
                                </button>
                            ` : ''}
                            ${c.address ? `
                                <div style="width:100%; margin-top: 8px;">
                                    <iframe 
                                        width="100%" 
                                        height="120" 
                                        style="border:0; border-radius:12px; margin-bottom:8px; opacity: 0.9;" 
                                        loading="lazy" 
                                        allowfullscreen 
                                        src="https://maps.google.com/maps?q=${encodeURIComponent(c.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed">
                                    </iframe>
                                    <button onclick="window.open('https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}', '_blank')" style="width:100%; padding:10px 16px; background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.3); border-radius:10px; color:#ef4444; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; font-size:0.9rem; font-weight:600; transition:all 0.2s;" onmouseover="this.style.background='rgba(239,68,68,0.25)'" onmouseout="this.style.background='rgba(239,68,68,0.15)'">
                                        <i data-lucide="map-pin" size="16"></i>
                                        <span>Maps Navigation</span>
                                    </button>
                                </div>
                            ` : ''}
                            ${c.phone ? `
                                <button onclick="window.open('https://wa.me/${c.phone.replace(/\\D/g, '')}', '_blank')" style="flex:1; min-width:120px; padding:12px 16px; background:rgba(34,197,94,0.15); border:1px solid rgba(34,197,94,0.3); border-radius:10px; color:#22c55e; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; font-size:0.9rem; font-weight:600; transition:all 0.2s;" onmouseover="this.style.background='rgba(34,197,94,0.25)'" onmouseout="this.style.background='rgba(34,197,94,0.15)'">
                                    <i data-lucide="message-circle" size="16"></i>
                                    <span>WhatsApp</span>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `).join('');
            }
            if (window.lucide) lucide.createIcons();
        },
        render() {
            const list = document.getElementById('contactsList');
            if (!list) return;

            let contacts = app.state.contacts || [];

            // Apply category filter
            if (this.currentFilter !== 'all') {
                contacts = contacts.filter(c => (c.category || 'private') === this.currentFilter);
            }

            // Update filter button styles
            const allBtn = document.getElementById('contactTabAll');
            const privBtn = document.getElementById('contactTabPrivate');
            const bizBtn = document.getElementById('contactTabBusiness');
            if (allBtn) allBtn.style.background = this.currentFilter === 'all' ? 'var(--primary)' : '';
            if (privBtn) privBtn.style.background = this.currentFilter === 'private' ? 'var(--primary)' : '';
            if (bizBtn) bizBtn.style.background = this.currentFilter === 'business' ? 'var(--primary)' : '';

            if (contacts.length === 0) {
                list.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align:center; padding: 60px 20px; background: rgba(255,255,255,0.02); border-radius: 24px; border: 1px dashed var(--border);">
                        <div style="width: 80px; height: 80px; background: rgba(59, 130, 246, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto;">
                            <i data-lucide="contact-2" size="40" class="text-primary"></i>
                        </div>
                        <h3 style="margin-bottom: 10px;">Keine Kontakte gefunden</h3>
                        <p class="text-muted">${this.currentFilter === 'all' ? 'Füge deinen ersten Kontakt hinzu.' : `Keine ${this.currentFilter === 'business' ? 'Business' : 'privaten'} Kontakte vorhanden.`}</p>
                        <button class="btn btn-primary" style="margin-top: 20px;" onclick="app.modals.open('addContact')">
                            <i data-lucide="plus"></i> Kontakt hinzufügen
                        </button>
                    </div>
                `;
            } else {
                list.style.display = 'flex';
                list.style.flexDirection = 'column';
                list.style.gap = '8px';
                list.style.background = 'rgba(0,0,0,0.2)';
                list.style.padding = '10px';
                list.style.borderRadius = '20px';
                list.style.border = '1px solid rgba(255,255,255,0.05)';

                list.innerHTML = contacts.map(c => `
                    <div class="contact-list-item" style="display:flex; align-items:center; justify-content:space-between; gap:15px; padding:12px 20px; background:rgba(255,255,255,0.03); border-radius:14px; cursor:pointer; transition:all 0.2s ease; border:1px solid transparent;">
                        <div onclick="app.contacts.openCard(${c.id})" style="flex:1; display:flex; align-items:center; gap:15px; cursor:pointer;">
                            <div style="width:40px; height:40px; background:linear-gradient(135deg, var(--primary), var(--accent)); border-radius:10px; display:flex; align-items:center; justify-content:center; color:white; font-weight:bold; font-size:1.1rem; flex-shrink:0;">
                                ${c.name.charAt(0).toUpperCase()}
                            </div>
                            <div style="flex:1; min-width:0;">
                                <div style="font-weight:700; font-size:1.1rem; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${c.name}</div>
                                <div style="font-size:0.8rem; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                                    ${c.phone || c.email || 'Kontakt'}
                                </div>
                            </div>
                            <div style="display:flex; gap:10px; align-items:center;">
                                 ${c.phone ? `<i data-lucide="phone" size="14" class="text-primary" style="opacity:0.6;"></i>` : ''}
                                 ${c.email ? `<i data-lucide="mail" size="14" class="text-accent" style="opacity:0.6;"></i>` : ''}
                                 <i data-lucide="chevron-right" size="18" style="opacity:0.3;"></i>
                            </div>
                        </div>
                        <div style="flex-shrink:0;">
                            <button onclick="event.stopPropagation(); app.contacts.editContact(${c.id})" style="background:rgba(59, 130, 246, 0.3); border:1px solid rgba(59, 130, 246, 0.5); color:var(--primary); padding:8px 14px; border-radius:8px; cursor:pointer; font-size:0.75rem; font-weight:600; transition:all 0.2s; display:flex; align-items:center; gap:6px; white-space:nowrap;" onmouseover="this.style.background='rgba(59, 130, 246, 0.5)'" onmouseout="this.style.background='rgba(59, 130, 246, 0.3)'">
                                <i data-lucide="edit-2" size="14"></i>Bearbeiten
                            </button>
                        </div>
                    </div>
                `).join('');
            }
            if (window.lucide) lucide.createIcons();

            if (!document.getElementById('contactListStyles')) {
                const style = document.createElement('style');
                style.id = 'contactListStyles';
                style.innerHTML = `.contact-list-item:hover { background: rgba(255,255,255,0.08) !important; border-color: rgba(59, 130, 246, 0.3) !important; }`;
                document.head.appendChild(style);
            }


            const importBtn = document.getElementById('importContactsBtn');
            if (importBtn) {
                importBtn.style.display = ('contacts' in navigator && 'ContactsManager' in window) ? 'flex' : 'none';
            }
        },
        renderQuick() {
            const container = document.getElementById('dashboardQuickContacts');
            if (!container) return;
            const contacts = (app.state.contacts || []).slice(0, 3);
            if (contacts.length === 0) {
                container.innerHTML = `<div class="text-xs text-muted" style="text-align:center; padding:10px; background:rgba(255,255,255,0.02); border-radius:12px; border:1px dashed rgba(255,255,255,0.05);">Keine Favoriten für Schnellzugriff.</div>`;
                return;
            }
            container.innerHTML = `
                <div style="font-size:0.65rem; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-bottom:10px; letter-spacing:1px; display:flex; align-items:center; gap:8px;">
                    <i data-lucide="star" size="10" class="text-primary"></i> Business Favoriten
                </div>
                <div style="display:flex; flex-direction:column; gap:8px;">
                    ${contacts.map(c => `
                        <div onclick="app.contacts.openCard(${c.id})" style="display:flex; align-items:center; gap:12px; padding:10px; background:rgba(255,255,255,0.03); border-radius:12px; cursor:pointer; transition:all 0.2s; border:1px solid transparent;" onmouseover="this.style.background='rgba(255,255,255,0.06)'; this.style.borderColor='rgba(59, 130, 246, 0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'; this.style.borderColor='transparent'">
                            <div style="width:32px; height:32px; background:linear-gradient(135deg, var(--primary), var(--accent)); border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:0.9rem; font-weight:bold; color:white; flex-shrink:0;">${c.name.charAt(0).toUpperCase()}</div>
                            <div style="flex:1; min-width:0;">
                                <div style="font-size:0.85rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${c.name}</div>
                                <div style="font-size:0.7rem; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${c.phone || c.email || 'Business Partner'}</div>
                            </div>
                            <i data-lucide="chevron-right" size="14" style="opacity:0.3;"></i>
                        </div>
                    `).join('')}
                </div>
            `;
            if (window.lucide) lucide.createIcons();
        },
        openCard(id) {
            const contact = app.state.contacts.find(c => c.id === id);
            if (!contact) return;
            app.modals.open('viewContactCard', contact);
        },
        editContact(id) {
            const contact = app.state.contacts.find(c => c.id === id);
            if (!contact) return;
            app.modals.open('editContact', contact);
        },
        saveEdit(id) {
            const contact = app.state.contacts.find(c => c.id === id);
            if (!contact) return;

            const name = document.getElementById('editContactName').value.trim();
            if (!name) {
                alert('Bitte mindestens einen Namen eingeben.');
                return;
            }

            contact.name = name;
            contact.phone = document.getElementById('editContactPhone').value.trim();
            contact.email = document.getElementById('editContactEmail').value.trim();
            contact.address = document.getElementById('editContactAddress').value.trim();
            contact.homepage = document.getElementById('editContactHomepage').value.trim();
            contact.category = document.getElementById('editContactCategory')?.value || 'private';

            app.saveState();
            this.render();
            app.renderDashboard();
            app.modals.close();
            alert('✅ Kontakt erfolgreich aktualisiert!');
        },
        submit() {
            const n = document.getElementById('newContactName').value;
            const p = document.getElementById('newContactPhone').value;
            const e = document.getElementById('newContactEmail').value;
            const a = document.getElementById('newContactAddress').value;
            const h = document.getElementById('newContactHomepage')?.value || '';
            if (n) { this.add(n, p, e, a, h); app.modals.close(); }
        }
    },
    businessSearch: {
        perform(q) {
            if (!q) return;
            window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, '_blank');
            if (app.notifications) app.notifications.send("🔍 Business Suche", "Suche die Firma und kopiere die URL für den Import.");
        },
        async importFromUrl() {
            let urlLink = document.getElementById('importUrl').value;
            const manualText = document.getElementById('importManualText').value;

            if (!urlLink && !manualText) {
                alert("Bitte gib einen Link oder Website-Inhalt ein.");
                return;
            }

            const loading = document.getElementById('importLoading');
            const results = document.getElementById('importResults');
            if (loading) loading.classList.remove('hidden');
            if (results) results.classList.add('hidden');

            try {
                let data = { name: "Neues Business", phone: "", email: "", address: "", url: urlLink };

                // 1. If we have manual text, we use the AI to extract everything perfectly
                if (manualText) {
                    const config = app.state.aiConfig;
                    let apiKey = config.openaiKey || config.grokKey || config.geminiKey;

                    if (apiKey) {
                        try {
                            const prompt = `Extrahiere Business-Informationen aus folgendem Text. Antworte NUR mit einem validen JSON Objekt: {"name": "...", "phone": "...", "email": "...", "address": "...", "url": "..."}. Wenn Informationen fehlen, lass das Feld leer. Text: "${manualText}"`;

                            let res;
                            if (config.provider === 'openai') {
                                res = await fetch('https://api.openai.com/v1/chat/completions', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                                    body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }] })
                                });
                            } else if (config.provider === 'gemini') {
                                res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                                });
                            }

                            if (res && res.ok) {
                                const result = await res.json();
                                let content = "";
                                if (config.provider === 'openai') content = result.choices[0].message.content;
                                else if (config.provider === 'gemini') content = result.candidates[0].content.parts[0].text;

                                // Clean JSON from markdown if exists
                                const jsonStr = content.replace(/```json|```/g, '').trim();
                                const aiData = JSON.parse(jsonStr);
                                if (aiData) {
                                    data = { ...data, ...aiData };
                                    if (urlLink) data.url = urlLink; // Prefer actual URL
                                }
                            }
                        } catch (e) { console.error("Extraction error:", e); }
                    }
                } else if (urlLink) {
                    // Fallback to heuristic if no text provided
                    if (!urlLink.startsWith('http')) urlLink = 'https://' + urlLink;
                    await new Promise(r => setTimeout(r, 1000));
                    try {
                        const parsed = new URL(urlLink);
                        let domainName = parsed.hostname.replace('www.', '').split('.')[0];
                        data.name = domainName.charAt(0).toUpperCase() + domainName.slice(1);
                        data.email = "info@" + parsed.hostname.replace('www.', '');
                        data.url = urlLink;
                    } catch (e) { }
                }

                if (loading) loading.classList.add('hidden');
                if (results) {
                    results.classList.remove('hidden');
                    document.getElementById('impName').value = data.name || "";
                    document.getElementById('impPhone').value = data.phone || "";
                    document.getElementById('impEmail').value = data.email || "";
                    document.getElementById('impAddress').value = data.address || "";
                    document.getElementById('impUrl').value = data.url || "";
                }
                if (window.lucide) lucide.createIcons();
            } catch (e) {
                if (loading) loading.classList.add('hidden');
            }
        },
        saveImported() {
            const n = document.getElementById('impName').value;
            const p = document.getElementById('impPhone').value;
            const e = document.getElementById('impEmail').value;
            const a = document.getElementById('impAddress').value;
            const h = document.getElementById('impUrl').value;

            if (n) {
                app.contacts.add(n, p, e, a, h);
                app.modals.close();
                app.navigateTo('contacts');
                if (typeof confetti === 'function') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            }
        }
    },

    shortcuts: {
        add() {
            app.modals.open('addShortcut');
        },
        delete(id) {
            if (confirm("Link wirklich löschen?")) {
                app.state.shortcuts = app.state.shortcuts.filter(s => s.id !== id);
                app.saveState();
                this.render();
            }
        },
        handleImageUpload(input) {
            if (input.files && input.files[0]) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const base64 = e.target.result;
                    document.getElementById('shortcutIcon').value = base64;
                    const preview = document.getElementById('shortcutIconPreview');
                    if (preview) preview.innerHTML = `<img src="${base64}" style="width:24px; height:24px; object-fit:contain;">`;
                };
                reader.readAsDataURL(input.files[0]);
            }
        },
        render() {
            const preview = document.getElementById('dashboardShortcutsPreview');
            const cardContainer = document.getElementById('dashboardAppCardsContainer');
            if (!preview) return;

            const shortcuts = app.state.shortcuts || [];

            // Filter into tiles and standalone cards
            const tiles = shortcuts.filter(s => !s.isCard);
            const cards = shortcuts.filter(s => s.isCard);

            // Render Tiles
            if (tiles.length === 0) {
                preview.innerHTML = '<div class="text-muted text-xs" style="grid-column: span 3; text-align:center; padding:10px;">Noch keine Apps hinzugefügt.</div>';
            } else {
                preview.innerHTML = tiles.map(s => {
                    const isEmoji = /\p{Emoji}/u.test(s.icon);
                    const isImage = s.icon && s.icon.startsWith('data:image');
                    let iconHtml = '';

                    if (isImage) {
                        iconHtml = `<img src="${s.icon}" style="width:24px; height:24px; object-fit:contain;">`;
                    } else if (isEmoji) {
                        iconHtml = `<span style="font-size: 1.5rem;">${s.icon}</span>`;
                    } else {
                        iconHtml = `<i data-lucide="${s.icon}" size="24"></i>`;
                    }

                    return `
                        <div style="display:flex; flex-direction:column; align-items:center; gap:5px; position:relative;" class="shortcut-item">
                            <a href="${s.url}" target="_blank" class="comm-tile" style="width:50px; height:50px; background:rgba(255,255,255,0.05); border-radius:12px; display:flex; align-items:center; justify-content:center; border:1px solid var(--border); transition: all 0.2s; position:relative;">
                                ${iconHtml}
                            </a>
                            <span class="text-xs text-muted" style="max-width:60px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${s.name}</span>
                            <div style="position:absolute; top:-5px; right:-5px; display:flex; gap:2px;">
                                <button onclick="app.modals.open('addShortcut', {id: ${s.id}})" style="background:rgba(59,130,246,0.8); border:none; color:white; border-radius:50%; width:16px; height:16px; font-size:10px; display:flex; align-items:center; justify-content:center; cursor:pointer;" title="Bearbeiten">✎</button>
                                <button onclick="app.shortcuts.delete(${s.id})" style="background:rgba(239,68,68,0.8); border:none; color:white; border-radius:50%; width:16px; height:16px; font-size:10px; display:flex; align-items:center; justify-content:center; cursor:pointer;" title="Löschen">×</button>
                            </div>
                        </div>
                    `;
                }).join('');
            }

            // Render Cards
            if (cardContainer) {
                cardContainer.innerHTML = cards.map(s => {
                    const isEmoji = /\p{Emoji}/u.test(s.icon);
                    const isImage = s.icon && s.icon.startsWith('data:image');
                    let iconHtml = '';

                    if (isImage) {
                        iconHtml = `<img src="${s.icon}" style="width:32px; height:32px; object-fit:contain;">`;
                    } else if (isEmoji) {
                        iconHtml = `<span style="font-size: 2rem;">${s.icon}</span>`;
                    } else {
                        iconHtml = `<i data-lucide="${s.icon}" size="32" class="text-primary"></i>`;
                    }

                    return `
                        <div id="shortcut-card-${s.id}" class="card dash-card" style="grid-column: span 1; cursor:pointer; position:relative; min-height: 120px; display:flex; flex-direction:column; align-items:center; justify-content:center; transition: all 0.2s; order: ${s.order || 115};" onclick="window.open('${s.url}', '_blank')" draggable="true">
                            <div style="position:absolute; top:10px; right:10px; display:flex; gap:5px; z-index:10;">
                                <button class="btn-small" style="background:rgba(255,255,255,0.05); width:24px; height:24px; display:flex; align-items:center; justify-content:center;" onclick="event.stopPropagation(); app.modals.open('addShortcut', {id: ${s.id}})"><i data-lucide="edit-2" size="12"></i></button>
                                <button class="btn-small" style="background:rgba(255,255,255,0.05); width:24px; height:24px; display:flex; align-items:center; justify-content:center;" onclick="event.stopPropagation(); app.shortcuts.delete(${s.id})"><i data-lucide="trash" size="12"></i></button>
                            </div>
                            <div style="width:60px; height:60px; background:rgba(255,255,255,0.05); border-radius:16px; display:flex; align-items:center; justify-content:center; border:1px solid var(--border); margin-bottom:12px;">
                                ${iconHtml}
                            </div>
                            <div style="font-weight:700; font-size:1.1rem; text-align:center;">${s.name}</div>
                        </div>
                    `;
                }).join('');
            }

            if (window.lucide) lucide.createIcons();
            if (app.dashboard) app.dashboard.applyOrder();
        }
    },
    dashboard: {
        setMode(mode) {
            app.state.ui.dashboardMode = mode;
            app.saveState();
            this.applyMode();
            app.renderDashboard();
            if (app.state.currentPage === 'calendar') app.calendar.render();
            if (app.state.currentPage === 'tasks') app.tasks.render();
            if (app.state.currentPage === 'shopping') app.shopping.render();
        },
        applyMode() {
            const mode = app.state.ui.dashboardMode || 'business';
            const btnBiz = document.getElementById('btnModeBusiness');
            const btnPri = document.getElementById('btnModePrivate');

            // Update Buttons
            if (btnBiz && btnPri) {
                if (mode === 'business') {
                    btnBiz.classList.add('active');
                    btnBiz.style.background = 'var(--primary)';
                    btnBiz.style.color = 'white';
                    btnPri.classList.remove('active');
                    btnPri.style.background = 'transparent';
                    btnPri.style.color = 'var(--text-muted)';
                } else {
                    btnPri.classList.add('active');
                    btnPri.style.background = 'var(--primary)';
                    btnPri.style.color = 'white';
                    btnBiz.classList.remove('active');
                    btnBiz.style.background = 'transparent';
                    btnBiz.style.color = 'var(--text-muted)';
                }
            }

            // Update UI Indicators
            const statusPill = document.querySelector('.status-pill');
            if (statusPill) {
                statusPill.innerHTML = `<span class="status-dot"></span> ${mode === 'business' ? 'Business OS' : 'Privat Modus'}`;
            }
            document.body.classList.remove('mode-business', 'mode-private');
            document.body.classList.add(`mode-${mode}`);

            // Define which sidebar items belong to which mode
            // Note: Dashboard cards are now handled exclusively by applyVisibility() based on user config
            const businessItems = [
                // Sidebar items
                'cat-business',
                'nav-projects',
                'nav-contacts',
                'nav-finance',
                'nav-meetings',
                'nav-drive',
                'nav-team'
            ];

            const privateItems = [
                // Sidebar items
                'cat-private',
                'nav-tasks',
                'nav-habits',
                'nav-household',
                'nav-shopping',
                'nav-health',
                'nav-alarms',
                'nav-tools'
            ];

            // Always visible sidebar items
            const sharedItems = [
                'cat-general',
                'nav-dashboard',
                'nav-calendar'
            ];

            // Hide/Show based on mode
            businessItems.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = (mode === 'business') ? (el.tagName === 'A' || el.classList.contains('nav-category') ? 'flex' : 'flex') : 'none';
            });

            privateItems.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = (mode === 'private') ? (el.tagName === 'A' || el.classList.contains('nav-category') ? 'flex' : 'flex') : 'none';
            });

            sharedItems.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = 'flex';
            });

            // Re-apply visibility for individual cards (user preference)
            this.applyVisibility();
        },
        initDragAndDrop() {
            const grid = document.querySelector('.dashboard-grid');
            if (!grid) return;

            grid.addEventListener('dragstart', (e) => {
                const card = e.target.closest('.dash-card');
                if (card) {
                    e.dataTransfer.setData('text/plain', card.id);
                    card.classList.add('dragging');
                }
            });

            grid.addEventListener('dragend', (e) => {
                const card = e.target.closest('.dash-card');
                if (card) card.classList.remove('dragging');
            });

            grid.addEventListener('dragover', (e) => {
                e.preventDefault();
                const card = e.target.closest('.dash-card');
                if (card) {
                    const dragging = document.querySelector('.dragging');
                    if (dragging && dragging !== card) {
                        const dragOrder = dragging.style.order;
                        const targetOrder = card.style.order;
                        if (dragOrder !== targetOrder) {
                            dragging.style.order = targetOrder;
                            card.style.order = dragOrder;
                        }
                    }
                }
            });

            grid.addEventListener('drop', (e) => {
                e.preventDefault();
                this.saveOrder();
            });
        },
        saveOrder() {
            const orders = {};
            document.querySelectorAll('.dash-card').forEach(c => {
                orders[c.id] = c.style.order;
                if (c.id.startsWith('shortcut-card-')) {
                    const id = parseInt(c.id.replace('shortcut-card-', ''));
                    const s = app.state.shortcuts.find(x => x.id === id);
                    if (s) s.order = parseInt(c.style.order);
                }
            });
            app.state.ui = app.state.ui || {};
            app.state.ui.dashboardOrders = orders;
            app.saveState();
        },
        applyOrder() {
            if (app.state.ui && app.state.ui.dashboardOrders) {
                for (const [id, order] of Object.entries(app.state.ui.dashboardOrders)) {
                    const el = document.getElementById(id);
                    if (el) el.style.order = order;
                }
            }
        },
        applyVisibility() {
            const mode = app.state.ui.dashboardMode || 'business';
            const modeKey = 'hiddenCards' + (mode.charAt(0).toUpperCase() + mode.slice(1));

            const hidden = (app.state.ui && app.state.ui[modeKey]) ? app.state.ui[modeKey] : [];
            const allCards = [
                'dashboardAiCard', 'dashboardCommunicationCard', 'dashboardStatusCard', 'dashboardEventsCard',
                'dashboardTasksCard', 'dashboardShoppingCard', 'dashboardHealthCard',
                'dashboardContactsCard', 'dashboardHabitsCard', 'dashboardFinanceCard', 'dashboardAlarmsCard',
                'dashboardDriveCard', 'dashboardShortcutsCard', 'dashboardSearchCard',
                'dashboardTimeTrackerCard', 'dashboardNotesCard', 'dashboardProjectsCard', 'dashboardMeetingsCard',
                'dashboardHouseholdCard', 'dashboardMealPlanCard', 'dashboardPrivateDriveCard'
            ];

            // Strict Mode Filtering Lists
            const businessOnly = ['dashboardProjectsCard', 'dashboardMeetingsCard', 'dashboardSearchCard', 'dashboardTimeTrackerCard', 'dashboardDriveCard'];
            const privateOnly = ['dashboardHouseholdCard', 'dashboardMealPlanCard', 'dashboardPrivateDriveCard', 'dashboardHabitsCard', 'dashboardHealthCard', 'dashboardShoppingCard', 'dashboardAlarmsCard'];

            allCards.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    let isStrictlyHidden = false;

                    // Strict Mode Logic (Overrides User Preference)
                    if (mode === 'business' && privateOnly.includes(id)) isStrictlyHidden = true;
                    if (mode === 'private' && businessOnly.includes(id)) isStrictlyHidden = true;

                    // Apply Visibility
                    if (isStrictlyHidden || hidden.includes(id)) {
                        el.style.display = 'none'; // Force hide
                        el.classList.add('hidden');
                    } else {
                        el.style.display = 'flex'; // Force show (restores from display:none)
                        el.classList.remove('hidden');
                    }
                }
            });
        },
        toggleCardVisibility(id) {
            if (!app.state.ui) app.state.ui = {};
            const mode = app.state.ui.dashboardMode || 'business';
            const modeKey = 'hiddenCards' + (mode.charAt(0).toUpperCase() + mode.slice(1));

            if (!app.state.ui[modeKey]) app.state.ui[modeKey] = [];

            const index = app.state.ui[modeKey].indexOf(id);
            if (index > -1) {
                app.state.ui[modeKey].splice(index, 1); // Remove from hidden (Show it)
            } else {
                app.state.ui[modeKey].push(id); // Add to hidden
            }
            app.saveState();
            this.applyVisibility(); // Apply immediately

            // Sync with modal if open
            app.modals.open('configureWidgets');
        },
        scrollToCard(id) {
            setTimeout(() => {
                const card = document.getElementById(id);
                if (card) {
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    const oldTrans = card.style.transition;
                    const oldBorder = card.style.borderColor;
                    const oldShadow = card.style.boxShadow;

                    card.style.transition = 'all 0.5s ease';
                    card.style.borderColor = 'var(--primary)';
                    card.style.boxShadow = '0 0 15px rgba(59, 130, 246, 0.3)';

                    setTimeout(() => {
                        card.style.borderColor = oldBorder || '';
                        card.style.boxShadow = oldShadow || '';
                        setTimeout(() => card.style.transition = oldTrans || '', 500);
                    }, 2000);
                }
            }, 300);
        }
    },

    // --- TIME TRACKER MODULE - MIT PERSISTENZ ---
    timeTracker: {
        isRunning: false,
        startTime: null,
        currentTask: '',
        totalToday: 0,
        intervalId: null,

        init() {
            // Lade gespeicherten Timer-Status
            const saved = localStorage.getItem('timeTracker_state');
            if (saved) {
                try {
                    const state = JSON.parse(saved);
                    if (state.isRunning && state.startTime) {
                        this.currentTask = state.currentTask || 'Fortgesetzte Arbeit';
                        this.startTime = state.startTime;
                        this.totalToday = state.totalToday || 0;
                        this.isRunning = true;

                        // UI aktualisieren
                        const btn = document.getElementById('timeTrackerToggle');
                        if (btn) {
                            btn.innerHTML = '<i data-lucide="pause" size="14"></i>';
                            btn.style.background = 'rgba(239, 68, 68, 0.1)';
                            btn.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                        }

                        const taskEl = document.getElementById('timeTrackerTask');
                        if (taskEl) taskEl.textContent = this.currentTask;

                        // Timer neu starten
                        this.intervalId = setInterval(() => this.updateDisplay(), 1000);
                        this.updateDisplay();

                        console.log('⏱️ Zeit-Tracker wiederhergestellt!');
                    }
                } catch (e) {
                    console.error('Fehler beim Laden des Timer-Status:', e);
                }
            }
        },

        saveState() {
            const state = {
                isRunning: this.isRunning,
                startTime: this.startTime,
                currentTask: this.currentTask,
                totalToday: this.totalToday
            };
            localStorage.setItem('timeTracker_state', JSON.stringify(state));
        },

        toggle() {
            if (this.isRunning) {
                this.stop();
            } else {
                const task = prompt('Woran arbeitest du?', this.currentTask || 'Allgemeine Arbeit');
                if (task) {
                    this.start(task);
                }
            }
        },

        start(task) {
            this.currentTask = task;
            this.startTime = Date.now();
            this.isRunning = true;

            const btn = document.getElementById('timeTrackerToggle');
            if (btn) {
                btn.innerHTML = '<i data-lucide="pause" size="14"></i>';
                btn.style.background = 'rgba(239, 68, 68, 0.1)';
                btn.style.borderColor = 'rgba(239, 68, 68, 0.3)';
            }

            const taskEl = document.getElementById('timeTrackerTask');
            if (taskEl) taskEl.textContent = task;

            this.intervalId = setInterval(() => this.updateDisplay(), 1000);
            this.saveState(); // Speichern!
            if (window.lucide) lucide.createIcons();
        },

        stop() {
            if (!this.isRunning) return;

            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            this.totalToday += elapsed;

            // Save to state
            if (!app.state.timeTracking) app.state.timeTracking = [];
            app.state.timeTracking.push({
                id: Date.now(),
                task: this.currentTask,
                duration: elapsed,
                date: new Date().toISOString()
            });
            app.saveState();

            this.isRunning = false;
            clearInterval(this.intervalId);

            const btn = document.getElementById('timeTrackerToggle');
            if (btn) {
                btn.innerHTML = '<i data-lucide="play" size="14"></i>';
                btn.style.background = 'rgba(16, 185, 129, 0.1)';
                btn.style.borderColor = 'rgba(16, 185, 129, 0.3)';
            }

            const taskEl = document.getElementById('timeTrackerTask');
            if (taskEl) taskEl.textContent = `${this.currentTask} (${this.formatTime(elapsed)})`;

            this.updateTodayDisplay();
            this.saveState(); // Speichern!
            if (window.lucide) lucide.createIcons();
        },

        updateDisplay() {
            if (!this.isRunning) return;
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            const display = document.getElementById('timeTrackerDisplay');
            if (display) {
                const timeStr = this.formatTime(elapsed);
                display.querySelector('div').textContent = timeStr;
            }
        },

        updateTodayDisplay() {
            const el = document.getElementById('timeTrackerToday');
            if (el) {
                const hours = Math.floor(this.totalToday / 3600);
                const mins = Math.floor((this.totalToday % 3600) / 60);
                el.textContent = `Heute: ${hours}h ${mins}m`;
            }
        },

        formatTime(seconds) {
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = seconds % 60;
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
    },

    // --- QUICK NOTES MODULE ---
    quickNotes: {
        add() {
            const content = prompt('Neue Notiz:');
            if (!content || !content.trim()) return;

            if (!app.state.quickNotes) app.state.quickNotes = [];
            app.state.quickNotes.unshift({
                id: Date.now(),
                content: content.trim(),
                date: new Date().toISOString()
            });
            app.saveState();
            this.render();
            app.gamification.addXP(5);
        },

        delete(id) {
            if (confirm('Notiz löschen?')) {
                app.state.quickNotes = app.state.quickNotes.filter(n => n.id !== id);
                app.saveState();
                this.render();
            }
        },

        render() {
            const container = document.getElementById('quickNotesPreview');
            if (!container) return;

            if (!app.state.quickNotes || app.state.quickNotes.length === 0) {
                container.innerHTML = '<div class="text-muted text-sm" style="padding: 10px; text-align: center;">Keine Notizen</div>';
                return;
            }

            container.innerHTML = app.state.quickNotes.slice(0, 3).map(note => `
                <div style="padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 6px; cursor: pointer;"
                    onclick="app.quickNotes.delete(${note.id})">
                    <div style="font-size: 0.85rem; line-height: 1.4;">${note.content}</div>
                    <div class="text-muted text-xs" style="margin-top: 4px;">${new Date(note.date).toLocaleDateString('de-DE')}</div>
                </div>
            `).join('');
        }
    },

    // --- PROJECTS MODULE ---
    projects: {
        add() {
            const name = prompt('Projekt-Name:');
            if (!name || !name.trim()) return;

            const description = prompt('Beschreibung (optional):') || '';

            if (!app.state.projects) app.state.projects = [];
            app.state.projects.push({
                id: Date.now(),
                name: name.trim(),
                description: description.trim(),
                status: 'active',
                progress: 0,
                createdAt: new Date().toISOString()
            });
            app.saveState();
            this.render();
            app.gamification.addXP(20);
        },

        updateProgress(id) {
            const project = app.state.projects.find(p => p.id === id);
            if (!project) return;

            const progress = prompt(`Fortschritt für "${project.name}" (0-100):`, project.progress);
            if (progress === null) return;

            const num = parseInt(progress);
            if (isNaN(num) || num < 0 || num > 100) {
                alert('Bitte eine Zahl zwischen 0 und 100 eingeben.');
                return;
            }

            project.progress = num;
            if (num >= 100) {
                project.status = 'completed';
                app.gamification.addXP(50);
            }
            app.saveState();
            this.render();
        },

        delete(id) {
            if (confirm('Projekt löschen?')) {
                app.state.projects = app.state.projects.filter(p => p.id !== id);
                app.saveState();
                this.render();
            }
        },

        render() {
            const container = document.getElementById('projectsPreview');
            if (!container) return;

            if (!app.state.projects || app.state.projects.length === 0) {
                container.innerHTML = '<div class="text-muted text-sm" style="padding: 10px; text-align: center;">Keine aktiven Projekte</div>';
                return;
            }

            const activeProjects = app.state.projects.filter(p => p.status === 'active').slice(0, 2);

            if (activeProjects.length === 0) {
                container.innerHTML = '<div class="text-muted text-sm" style="padding: 10px; text-align: center;">Alle Projekte abgeschlossen! 🎉</div>';
                return;
            }

            container.innerHTML = activeProjects.map(project => `
                <div style="padding: 10px; background: rgba(255,255,255,0.03); border-radius: 8px; cursor: pointer;"
                    onclick="app.projects.updateProgress(${project.id})">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <div style="font-weight: 600; font-size: 0.9rem;">${project.name}</div>
                        <div style="font-size: 0.75rem; color: #8b5cf6;">${project.progress}%</div>
                    </div>
                    <div style="width: 100%; background: rgba(255,255,255,0.1); height: 4px; border-radius: 2px; overflow: hidden;">
                        <div style="width: ${project.progress}%; height: 100%; background: #8b5cf6; transition: width 0.3s;"></div>
                    </div>
                </div>
            `).join('');
        }
    },

    // --- MEETINGS MODULE ---
    meetings: {
        add() {
            const title = prompt('Meeting-Titel:');
            if (!title || !title.trim()) return;

            const notes = prompt('Notizen (optional):') || '';
            const participants = prompt('Teilnehmer (optional):') || '';

            if (!app.state.meetings) app.state.meetings = [];
            app.state.meetings.unshift({
                id: Date.now(),
                title: title.trim(),
                notes: notes.trim(),
                participants: participants.trim(),
                date: new Date().toISOString()
            });
            app.saveState();
            this.render();
            app.gamification.addXP(15);
        },

        view(id) {
            const meeting = app.state.meetings.find(m => m.id === id);
            if (!meeting) return;

            const date = new Date(meeting.date).toLocaleString('de-DE');
            alert(
                `📋 ${meeting.title}\n\n` +
                `📅 ${date}\n` +
                (meeting.participants ? `👥 ${meeting.participants}\n\n` : '\n') +
                (meeting.notes ? `📝 ${meeting.notes}` : 'Keine Notizen')
            );
        },

        delete(id) {
            if (confirm('Meeting-Notiz löschen?')) {
                app.state.meetings = app.state.meetings.filter(m => m.id !== id);
                app.saveState();
                this.render();
            }
        },

        render() {
            const container = document.getElementById('meetingsPreview');
            if (!container) return;

            if (!app.state.meetings || app.state.meetings.length === 0) {
                container.innerHTML = '<div class="text-muted text-sm" style="padding: 10px; text-align: center;">Keine Meeting-Notizen</div>';
                return;
            }

            container.innerHTML = app.state.meetings.slice(0, 3).map(meeting => `
                <div style="padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 6px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;"
                    onclick="app.meetings.view(${meeting.id})">
                    <div style="flex: 1;">
                        <div style="font-size: 0.85rem; font-weight: 600;">${meeting.title}</div>
                        <div class="text-muted text-xs" style="margin-top: 2px;">${new Date(meeting.date).toLocaleDateString('de-DE')}</div>
                    </div>
                    <button onclick="event.stopPropagation(); app.meetings.delete(${meeting.id})" 
                        style="background: none; border: none; color: var(--danger); opacity: 0.6; cursor: pointer; padding: 4px;"
                        onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'">
                        <i data-lucide="trash-2" size="14"></i>
                    </button>
                </div>
            `).join('');

            if (window.lucide) lucide.createIcons();
        }
    },

    // --- CONTACTS MODULE ---
    contacts: {
        currentFilter: 'all',
        widgetFilter: 'all',

        filterContactsWidget(category) {
            this.widgetFilter = category;
            this.renderQuick();
        },

        renderQuick() {
            const container = document.getElementById('dashboardContactsPreview');
            if (!container) return;

            const contacts = app.state.contacts || [];
            if (contacts.length === 0) {
                container.innerHTML = '<div class="text-muted text-xs" style="grid-column:span 2; text-align:center;">Keine Kontakte.</div>';
                return;
            }

            let filtered = contacts;
            if (this.widgetFilter !== 'all') {
                filtered = contacts.filter(c => (c.category || 'private') === this.widgetFilter);
            }

            // Always respect dashboard mode if widget is "all" or matching?
            // Actually, let's keep the widget filter independent but default it to match dashboard mode on init if we wanted.

            if (filtered.length === 0) {
                container.innerHTML = '<div class="text-muted text-xs" style="grid-column:span 2; text-align:center;">Keine Kontakte in dieser Kategorie.</div>';
                return;
            }

            container.innerHTML = filtered.map(c => `
                <div style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.05); border-radius:10px; padding:10px; cursor:pointer; transition:all 0.2s;"
                    onclick="app.contacts.edit(${c.id})"
                    onmouseover="this.style.background='rgba(255,255,255,0.1)'"
                    onmouseout="this.style.background='rgba(255,255,255,0.05)'">
                    <div style="font-weight:600; font-size:0.9rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c.name}</div>
                    <div style="display:flex; gap:5px; margin-top:5px;">
                        ${c.phone ? `<a href="tel:${c.phone}" onclick="event.stopPropagation()" style="color:var(--success);"><i data-lucide="phone" size="14"></i></a>` : ''}
                        ${c.email ? `<a href="mailto:${c.email}" onclick="event.stopPropagation()" style="color:var(--primary);"><i data-lucide="mail" size="14"></i></a>` : ''}
                    </div>
                </div>
            `).join('');

            if (window.lucide) lucide.createIcons();
        },
        async importFromPhone() {
            try {
                // Check if Contact Picker API is supported
                if (!('contacts' in navigator)) {
                    alert('❌ Telefonbuch-Import wird von diesem Browser nicht unterstützt.\n\nBitte nutze Chrome oder Edge auf Android.');
                    return;
                }

                // Request contacts with specific properties
                const props = ['name', 'tel', 'email', 'address'];
                const opts = { multiple: true };

                const contacts = await navigator.contacts.select(props, opts);

                if (!contacts || contacts.length === 0) {
                    alert('Keine Kontakte ausgewählt.');
                    return;
                }

                // Import contacts
                let imported = 0;
                if (!app.state.contacts) app.state.contacts = [];

                contacts.forEach(contact => {
                    const name = contact.name?.[0] || 'Unbekannt';
                    const phone = contact.tel?.[0] || '';
                    const email = contact.email?.[0] || '';
                    const address = contact.address?.[0]?.formatted || '';

                    // Check if contact already exists
                    const exists = app.state.contacts.find(c =>
                        c.name === name || (phone && c.phone === phone)
                    );

                    if (!exists) {
                        app.state.contacts.push({
                            id: Date.now() + imported,
                            name: name,
                            phone: phone,
                            email: email,
                            address: address,
                            homepage: '',
                            category: 'private', // Default to private
                            createdAt: new Date().toISOString()
                        });
                        imported++;
                    }
                });

                app.saveState();
                this.render();
                alert(`✅ ${imported} Kontakte erfolgreich importiert!`);
                app.gamification.addXP(imported * 5);
            } catch (error) {
                console.error('Contact import error:', error);
                if (error.name === 'AbortError') {
                    // User cancelled
                    return;
                }
                alert('❌ Fehler beim Importieren der Kontakte:\n' + error.message);
            }
        },

        submit() {
            const name = document.getElementById('newContactName').value.trim();
            const phone = document.getElementById('newContactPhone').value.trim();
            const email = document.getElementById('newContactEmail').value.trim();
            const address = document.getElementById('newContactAddress').value.trim();
            const homepage = document.getElementById('newContactHomepage').value.trim();
            const category = document.getElementById('newContactCategory')?.value || 'private';

            if (!name) {
                alert('Bitte mindestens einen Namen eingeben.');
                return;
            }

            if (!app.state.contacts) app.state.contacts = [];

            // Check if editing existing contact
            if (app.editingId) {
                const contact = app.state.contacts.find(c => c.id === app.editingId);
                if (contact) {
                    contact.name = name;
                    contact.phone = phone;
                    contact.email = email;
                    contact.address = address;
                    contact.homepage = homepage;
                    contact.category = category;
                }
                app.editingId = null;
            } else {
                app.state.contacts.push({
                    id: Date.now(),
                    name: name,
                    phone: phone,
                    email: email,
                    address: address,
                    homepage: homepage,
                    category: category,
                    createdAt: new Date().toISOString()
                });
            }

            app.saveState();
            app.modals.close();
            this.render();
            app.gamification.addXP(10);
        },

        edit(id) {
            const contact = app.state.contacts.find(c => c.id === id);
            if (!contact) return;

            app.editingId = id;
            app.modals.open('addContact', contact);
        },

        delete(id) {
            if (confirm('Kontakt wirklich löschen?')) {
                app.state.contacts = app.state.contacts.filter(c => c.id !== id);
                app.saveState();
                this.render();
            }
        },

        search(query) {
            this.render(query);
        },

        filterContacts(category) {
            this.currentFilter = category;
            this.render();
        },

        render(searchQuery = '') {
            const container = document.getElementById('contactsList');
            if (!container) return;

            if (!app.state.contacts || app.state.contacts.length === 0) {
                container.innerHTML = '<div class="text-muted text-sm" style="padding: 20px; text-align: center;">Noch keine Kontakte vorhanden.<br>Importiere Kontakte oder füge manuell hinzu.</div>';
                return;
            }

            let contacts = app.state.contacts;

            // Filter by category
            if (this.currentFilter && this.currentFilter !== 'all') {
                contacts = contacts.filter(c => (c.category || 'private') === this.currentFilter);
            }

            // Filter by search query
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                contacts = contacts.filter(c =>
                    c.name.toLowerCase().includes(q) ||
                    (c.phone && c.phone.includes(q)) ||
                    (c.email && c.email.toLowerCase().includes(q)) ||
                    (c.address && c.address.toLowerCase().includes(q))
                );
            }

            if (contacts.length === 0) {
                container.innerHTML = '<div class="text-muted text-sm" style="padding: 20px; text-align: center;">Keine Kontakte gefunden.</div>';
                return;
            }

            // Sort alphabetically
            contacts.sort((a, b) => a.name.localeCompare(b.name));

            container.innerHTML = contacts.map(contact => `
                <div style="padding: 15px; background: rgba(255,255,255,0.03); border-radius: 12px; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.05); cursor: pointer; transition: all 0.2s;" 
                     onclick="app.contacts.edit(${contact.id})"
                     onmouseover="this.style.background='rgba(255,255,255,0.06)'; this.style.borderColor='rgba(255,255,255,0.1)'"
                     onmouseout="this.style.background='rgba(255,255,255,0.03)'; this.style.borderColor='rgba(255,255,255,0.05)'">
                    <div style="display: flex; justify-content: space-between; align-items: start; gap: 15px;">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                <div style="font-weight: 700; font-size: 1.1rem;">${contact.name}</div>
                                ${contact.category === 'business' ? '<span style="background: rgba(59,130,246,0.2); color: #3b82f6; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: 600;">Business</span>' : '<span style="background: rgba(34,197,94,0.2); color: #22c55e; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: 600;">Privat</span>'}
                            </div>
                            ${contact.phone ? `<div class="text-sm" style="margin-bottom: 4px;"><i data-lucide="phone" size="12" style="display: inline; opacity: 0.6;"></i> ${contact.phone}</div>` : ''}
                            ${contact.email ? `<div class="text-sm" style="margin-bottom: 4px;"><i data-lucide="mail" size="12" style="display: inline; opacity: 0.6;"></i> ${contact.email}</div>` : ''}
                            ${contact.address ? `<div class="text-sm text-muted"><i data-lucide="map-pin" size="12" style="display: inline; opacity: 0.6;"></i> ${contact.address}</div>` : ''}
                            
                            <div style="display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap;" onclick="event.stopPropagation()">
                                ${contact.phone ? `<a href="tel:${contact.phone}" style="display:flex; align-items:center; gap:4px; padding:6px 12px; background:rgba(34,197,94,0.15); border:1px solid rgba(34,197,94,0.3); border-radius:8px; color:#22c55e; font-size:0.85rem; font-weight:600; text-decoration:none; transition:all 0.2s;" onmouseover="this.style.background='rgba(34,197,94,0.25)'" onmouseout="this.style.background='rgba(34,197,94,0.15)'" title="Anrufen"><i data-lucide="phone" size="14"></i> Anrufen</a>` : ''}
                                ${contact.email ? `<a href="mailto:${contact.email}" style="display:flex; align-items:center; gap:4px; padding:6px 12px; background:rgba(59,130,246,0.15); border:1px solid rgba(59,130,246,0.3); border-radius:8px; color:#3b82f6; font-size:0.85rem; font-weight:600; text-decoration:none; transition:all 0.2s;" onmouseover="this.style.background='rgba(59,130,246,0.25)'" onmouseout="this.style.background='rgba(59,130,246,0.15)'" title="E-Mail schreiben"><i data-lucide="mail" size="14"></i> E-Mail</a>` : ''}
                            </div>
                        </div>
                        <div style="display: flex; gap: 6px; flex-shrink: 0;" onclick="event.stopPropagation()">
                            <button onclick="app.contacts.edit(${contact.id})" 
                                style="background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.3); color: #3b82f6; padding: 8px; border-radius: 8px; cursor: pointer; transition: all 0.2s;"
                                onmouseover="this.style.background='rgba(59,130,246,0.2)'" onmouseout="this.style.background='rgba(59,130,246,0.1)'"
                                title="Bearbeiten">
                                <i data-lucide="edit-2" size="16"></i>
                            </button>
                            <button onclick="app.contacts.delete(${contact.id})" 
                                style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: var(--danger); padding: 8px; border-radius: 8px; cursor: pointer; transition: all 0.2s;"
                                onmouseover="this.style.background='rgba(239,68,68,0.2)'" onmouseout="this.style.background='rgba(239,68,68,0.1)'"
                                title="Löschen">
                                <i data-lucide="trash-2" size="16"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');

            if (window.lucide) lucide.createIcons();
        }
    }
};

// --- BOOTSTRAP ---
document.addEventListener('DOMContentLoaded', () => app.init());
