// TaskForce Pro Application Logic - v9 (Stable & Robust)

const app = {
    // Default State
    state: {
        user: { name: '', team: [] },
        currentPage: 'dashboard',
        xp: 0,
        level: 1,
        tasks: [],
        expenses: [],
        habits: [],
        events: [],
        healthData: [],
        archives: [], // New Archive for old events
        waterGoal: 2.5, // Liter pro Tag
        dailyTaskGoal: 5, // Anzahl Aufgaben pro Tag
        alarm: { time: '07:00', active: false },
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
            this.health.render();
            this.team.render();
            this.calendar.init();
            this.gamification.updateUI();
            this.renderDashboard();
            this.voice.init();

            // Apply User Preferences
            this.settings.applyLayoutPreference();

            // Re-apply Alarm State
            if (this.state.alarm && this.state.alarm.active) {
                const dis = document.getElementById('activeAlarmDisplay');
                if (dis) dis.textContent = `An: ${this.state.alarm.time} Uhr`;
                const ndis = document.getElementById('nightAlarmDisplay');
                if (ndis) { ndis.classList.remove('hidden'); ndis.querySelector('span').textContent = this.state.alarm.time; }
            }

            // Global Click Listeners for Mobile Sidebar
            document.querySelectorAll('.nav-item').forEach(i => i.addEventListener('click', () => {
                if (this.isSidebarOpen) this.toggleSidebar();
            }));

            // Create Icons safely
            if (window.lucide) lucide.createIcons();

        } catch (e) {
            console.error("Critical Init Error:", e);
            alert("Fehler beim Starten der App: " + e.message);
        }
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
        if (!this.state.tasks) this.state.tasks = [];
        if (!this.state.habits) this.state.habits = [];
        if (!this.state.archives) this.state.archives = [];
        if (!this.state.archives) this.state.archives = [];
        if (!this.state.aiConfig) this.state.aiConfig = { provider: 'openai', openaiKey: '', grokKey: '', geminiKey: '' };
        if (!this.state.dashboardLayout) this.state.dashboardLayout = 'double'; // Default to 2 columns

        // Default Key Migration
        const defKey = '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';
        if (this.state.aiConfig.provider === 'openai' && (!this.state.aiConfig.openaiKey || this.state.aiConfig.openaiKey.length < 10)) {
            this.state.aiConfig.openaiKey = defKey;
            this.saveState();
        }

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
    },

    saveState() {
        try {
            localStorage.setItem('taskforce_state', JSON.stringify(this.state));
            this.gamification.updateUI();
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
            } else {
                document.getElementById('authPassRepeatField').classList.add('hidden');
                document.getElementById('authTeamField').classList.remove('hidden');
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
                    teamName: '',
                    team: [],
                    isLoggedIn: true
                };
                app.saveState();
                alert(`Registrierung erfolgreich! Bitte beim nächsten Login deinen Team-Namen angeben.`);
                this.closeOverlay();
            } else {
                // Login Check
                if (!team) { alert("Bitte deinen Team-Namen (Sync-Key) eingeben!"); return; }

                if (app.state.user && app.state.user.name === name) {

                    // Update Team Name on Login
                    app.state.user.teamName = team;

                    // LEGACY MIGRATION
                    if (!app.state.user.password && pass) {
                        app.state.user.password = pass;
                        app.state.user.isLoggedIn = true;
                        app.saveState();
                        alert("Passwort festgelegt. ✅");
                        this.closeOverlay();
                        return;
                    }

                    if (app.state.user.password === pass) {
                        app.state.user.isLoggedIn = true;
                        app.saveState();
                        this.closeOverlay();
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
            sb.classList.add('open');
            if (closeBtn) closeBtn.style.display = 'block';
        } else {
            sb.classList.remove('open');
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

    navigateTo(page) {
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

        if (page === 'calendar') app.calendar.render();
        if (page === 'team') app.team.render();
        if (page === 'health') app.health.render();
        if (page === 'settings') app.settings.render();
    },

    // --- CALENDAR & EVENTS ---
    calendar: {
        currentViewDate: new Date(),
        toggleUrgency(id) {
            const e = app.state.events.find(x => x.id === id);
            if (e) {
                e.urgent = !e.urgent;
                app.saveState();
                this.render();
                app.renderDashboard();
            }
        },
        init() {
            this.render();
            setInterval(() => this.checkUrgency(), 30000);
            setInterval(() => this.archiveOldEvents(), 3600000); // Check every hour
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
                // Simple validation
                if (isNaN(start.getTime())) { alert("Ungültiges Datum/Zeit"); return; }

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
                            urgent: data.urgent
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
                        urgent: data.urgent || false
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
                urgent: e.urgent
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
            });

            // Dashboard appointments blinking
            this.updateDashboardBlinking();
        },
        updateDashboardBlinking() {
            const now = new Date();
            const dashCard = document.getElementById('dashboardEventsCard');
            if (!dashCard) return;

            // Check if any upcoming event is imminent
            const upcomingEvents = app.state.events.filter(e => new Date(e.start) >= now);

            // If No events, definitely no blinking
            if (upcomingEvents.length === 0) {
                dashCard.classList.remove('appointment-imminent');
                return;
            }

            const hasImminentEvent = upcomingEvents.some(e => {
                const start = new Date(e.start);
                const diffMins = (start - now) / 1000 / 60;
                return (diffMins > -15 && diffMins < 30) || (e.urgent && diffMins > -60 && diffMins < 120);
            });

            if (hasImminentEvent) {
                dashCard.classList.add('appointment-imminent');
            } else {
                dashCard.classList.remove('appointment-imminent');
            }
        },
        archiveOldEvents() {
            const now = new Date();
            // Aggressive archival: Events that started more than 15 minutes ago are moved to archives
            const archiveThreshold = new Date(now.getTime() - 15 * 60 * 1000);

            const toArchive = app.state.events.filter(e => new Date(e.start) < archiveThreshold);

            if (toArchive.length > 0) {
                if (!app.state.archives) app.state.archives = [];
                app.state.archives.push(...toArchive);

                // Keep only events that are still upcoming or barely started
                app.state.events = app.state.events.filter(e => new Date(e.start) >= archiveThreshold);

                app.saveState();
                console.log(`Archived ${toArchive.length} old events`);
                this.render(); // Re-render calendar
                app.renderDashboard();
            }
        },
        render() {
            const grid = document.getElementById('calendarGrid');
            const label = document.getElementById('calMonthDisplay');
            const list = document.getElementById('upcomingEventsList');
            const routeBtn = document.getElementById('calcDailyRouteBtn');

            if (!grid || !label) return;

            const mn = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
            label.textContent = `${mn[this.currentViewDate.getMonth()]} ${this.currentViewDate.getFullYear()}`;

            if (routeBtn) routeBtn.classList.remove('hidden');

            grid.innerHTML = '';
            const y = this.currentViewDate.getFullYear();
            const m = this.currentViewDate.getMonth();
            const startOffset = (new Date(y, m, 1).getDay() || 7) - 1;

            for (let i = 0; i < startOffset; i++) grid.innerHTML += '<div class="calendar-day empty"></div>';

            const today = new Date();
            const dim = new Date(y, m + 1, 0).getDate();

            for (let d = 1; d <= dim; d++) {
                const cell = document.createElement('div');
                cell.className = 'calendar-day';
                if (today.getDate() === d && today.getMonth() === m && today.getFullYear() === y) cell.classList.add('today');

                const de = app.state.events.filter(e => {
                    const x = new Date(e.start);
                    return x.getDate() === d && x.getMonth() === m && x.getFullYear() === y;
                });

                cell.innerHTML = `<div class="day-number">${d}</div>` + de.map(ev => `<div class="event-marker" style="${ev.urgent ? 'background:var(--danger)' : ''}">${ev.title}</div>`).join('');
                cell.onclick = () => {
                    app.editingId = null;
                    app.modals.open('addEvent', { date: `${y}-${(m + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}` });
                };
                grid.appendChild(cell);
            }

            if (list) {
                list.innerHTML = '';
                const up = app.state.events.filter(e => new Date(e.start) >= new Date().setHours(0, 0, 0, 0)).slice(0, 10);

                if (!up.length) list.innerHTML = '<div class="text-muted text-sm">Keine Termine.</div>';
                else up.forEach(e => {
                    const ed = new Date(e.start);
                    const row = document.createElement('div');
                    row.id = `event-card-${e.id}`;
                    row.className = `event-card-detail ${e.urgent ? 'blink-urgent' : ''}`;
                    row.innerHTML = `
                        <div style="font-weight:bold; display:flex; justify-content:space-between; align-items:center;">
                            <div style="display:flex;align-items:center;gap:8px;">
                                <button class="btn-toggle-urgent ${e.urgent ? 'is-urgent' : ''}" onclick="event.stopPropagation(); app.calendar.toggleUrgency(${e.id})"><i data-lucide="flame" size="14"></i></button>
                                <span style="font-size:1.1rem;">${e.title}</span>
                            </div>
                        <div class="text-muted text-sm" style="margin-bottom:8px;">
                            ${ed.toLocaleDateString()} ${ed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        ${e.location ? `<div class="event-meta-row"><i data-lucide="map-pin" size="14"></i> ${e.location}</div>` : ''}
                        ${e.phone ? `<div class="event-meta-row"><i data-lucide="phone" size="14"></i> ${e.phone}</div>` : ''}
                        
                        <div class="event-edit-toolbar">
                             <button class="btn-small btn-edit" onclick="app.calendar.editEvent(${e.id})"><i data-lucide="pencil" size="14"></i> Bearbeiten</button>
                             ${e.location ? `<button class="btn-small btn-nav" onclick="window.open('https://maps.google.com/?q=${encodeURIComponent(e.location)}','_blank')"><i data-lucide="navigation" size="14"></i> Navi</button>` : ''}
                             <button class="btn-small btn-delete" onclick="app.calendar.deleteEvent(${e.id})"><i data-lucide="trash" size="14"></i></button>
                        </div>
                    `;
                    list.appendChild(row);
                });
            }
            this.checkUrgency();
        }
    },

    // --- DASHBOARD & HELPERS ---
    renderDashboard() {
        // Events (Hero)
        const dp = document.getElementById('dashboardEventsPreview');
        if (dp) {
            const now = new Date();
            const up = app.state.events
                .filter(e => new Date(e.start) >= now)
                .sort((a, b) => new Date(a.start) - new Date(b.start))
                .slice(0, 5);

            if (up.length > 0) {
                dp.innerHTML = up.map((e, index) => {
                    const isFirst = index === 0; // Highlight the very first one
                    const start = new Date(e.start);
                    return `
                        <div class="hero-event-item ${e.urgent ? 'blink-urgent' : ''}" style="${isFirst ? 'border-width: 6px; background: rgba(255,255,255,0.08);' : ''}">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <div style="font-weight: bold; font-size: ${isFirst ? '1.3rem' : '1.1rem'}; color: white;">${e.title}${e.urgent ? ' 🔥' : ''}</div>
                                    <div class="text-muted text-sm" style="margin-top:4px;">
                                        <i data-lucide="clock" size="14"></i> ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        <span style="margin: 0 8px;">|</span>
                                        ${e.location ? `<i data-lucide="map-pin" size="14"></i> ${e.location}` : '<i data-lucide="home" size="14"></i> Kein Ort'}
                                    </div>
                                </div>
                                <div style="display:flex; gap:8px;">
                                    <button class="btn-toggle-urgent ${e.urgent ? 'is-urgent' : ''}" style="width:36px;height:36px;" onclick="event.stopPropagation(); app.calendar.toggleUrgency(${e.id})"><i data-lucide="flame"></i></button>
                                    ${e.location ? `<button class="btn-primary" style="padding: 8px;" onclick="window.open('https://maps.google.com/?q=${encodeURIComponent(e.location)}','_blank')"><i data-lucide="navigation"></i></button>` : ''}
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

        // Chart
        const ctx = document.getElementById('dashboardFinanceChart');
        if (ctx) {
            // Destroy old chart instance if exists
            if (app.dashboardChart) app.dashboardChart.destroy();

            app.dashboardChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Woche', 'Rest (Monat)'],
                    datasets: [{
                        data: [sumW, Math.max(0, sumM - sumW)],
                        backgroundColor: ['#dc2626', '#334155'],
                        borderWidth: 0
                    }]
                },
                options: {
                    cutout: '70%',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { enabled: false } }
                }
            });
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

        // Habits Preview
        const habPreview = document.getElementById('dashboardHabitsPreview');
        if (habPreview && app.state.habits) {
            const activeH = app.state.habits.slice(0, 4);
            if (activeH.length > 0) {
                habPreview.innerHTML = activeH.map(h => {
                    // Check if done today logic (simplified)
                    const todayStr = new Date().toISOString().split('T')[0];
                    const isDone = h.history && h.history.includes(todayStr);
                    return `<div style="width:10px; height:10px; border-radius:50%; background:${isDone ? 'var(--success)' : 'var(--bg-surface)'}; border:1px solid var(--border);" class="${h.urgent ? 'blink-urgent' : ''}" title="${h.name}"></div>`;
                }).join('');
            } else {
                habPreview.innerHTML = '<span class="text-muted text-sm">Keine Habits.</span>';
            }
        }

        // Health Dashboard Summary
        const todayStr = new Date().toISOString().split('T')[0];
        const waterToday = (app.state.healthData || [])
            .filter(d => d.type === 'water' && d.date === todayStr)
            .reduce((sum, d) => sum + d.value, 0);
        const waterGoal = app.state.waterGoal || 2.5;

        const dashWaterText = document.getElementById('dashboardWaterText');
        const dashWaterBar = document.getElementById('dashboardWaterBar');
        if (dashWaterText) dashWaterText.textContent = `${waterToday.toFixed(1)} / ${waterGoal}L`;
        if (dashWaterBar) dashWaterBar.style.width = Math.min((waterToday / waterGoal) * 100, 100) + '%';

        // Status Text Update
        const statusText = document.getElementById('statusSummaryText');
        if (statusText) {
            const openTasks = app.state.tasks.filter(t => !t.done).length;
            const urgentTasks = app.state.tasks.filter(t => !t.done && t.urgent).length;
            statusText.innerHTML = `<span class="text-primary">${openTasks} Offen</span> • <span class="text-danger">${urgentTasks} Dringend</span>`;
        }

        // --- DASHBOARD CARD URGENCY BLINKING ---
        const toggleCardBlink = (id, condition) => {
            const el = document.getElementById(id);
            if (el) {
                if (condition) el.classList.add('blink-urgent');
                else el.classList.remove('blink-urgent');
            }
        };

        // 1. Tasks
        const hasUrgentTasks = app.state.tasks.some(t => !t.done && t.category !== 'shopping' && t.urgent);
        toggleCardBlink('dashboardTasksCard', hasUrgentTasks);

        // 2. Shopping (Already handled in preview potentially, but applied to container now)
        const hasUrgentShopping = app.state.tasks.some(t => !t.done && t.category === 'shopping' && t.urgent);
        toggleCardBlink('dashboardShoppingCard', hasUrgentShopping);

        // 3. Finance
        const hasUrgentFinance = (app.state.expenses || []).some(e => e.urgent);
        toggleCardBlink('dashboardFinanceCard', hasUrgentFinance);

        // 4. Health
        const hasUrgentHealth = (app.state.healthData || []).some(e => e.urgent);
        toggleCardBlink('dashboardHealthCard', hasUrgentHealth);

        // 5. Habits
        const hasUrgentHabits = (app.state.habits || []).some(h => h.urgent);
        toggleCardBlink('dashboardHabitsCard', hasUrgentHabits);

        if (window.lucide) lucide.createIcons();
    },

    startClock() {
        setInterval(() => {
            const now = new Date();
            const t = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

            const clockEl = document.getElementById('clockTime');
            if (clockEl) clockEl.textContent = t;

            const driveClk = document.getElementById('driveClock');
            if (driveClk) driveClk.textContent = t;

            const driveDate = document.getElementById('driveDate');
            if (driveDate) driveDate.textContent = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

            const d = document.getElementById('currentDateDisplay');
            if (d) d.textContent = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

            app.nightstand.update();

            // Check Alarm (Active & exact minute match, run once per minute by checking seconds < 2)
            if (app.state.alarm && app.state.alarm.active && now.getSeconds() < 2) {
                if (t === app.state.alarm.time) {
                    alert("⏰ WECKER: Es ist " + t + " Uhr!");
                    // Simple blocking alert for now, could be sound later
                }
            }

            // --- SYSTEM NOTIFICATION CHECKS ---
            // Run every minute (when seconds are 0)
            if (now.getSeconds() === 0) {
                app.notifications.check();
            }
        }, 1000);
    },

    // --- NOTIFICATIONS MODULE ---
    notifications: {
        lastCheck: 0,
        permissionAsked: false,
        requestPermission() {
            if (!("Notification" in window)) {
                alert("Dieser Browser unterstützt keine System-Benachrichtigungen.");
                return;
            }
            Notification.requestPermission().then(p => {
                this.permissionAsked = true;
                if (p === 'granted') {
                    new Notification("Benachrichtigungen aktiviert ✅", {
                        body: "TaskForce erinnert dich jetzt an Wichtiges!",
                        icon: "https://api.dicebear.com/7.x/identicon/svg?seed=TaskForce"
                    });
                }
            });
        },
        send(title, body) {
            if (Notification.permission === 'granted') {
                new Notification(title, { body: body, icon: "https://api.dicebear.com/7.x/identicon/svg?seed=Urgent" });
            }
        },
        check() {
            const now = new Date();

            // 1. Check for Imminent Urgent Events (15 mins before)
            // stored in app.state.events
            app.state.events.forEach(e => {
                const start = new Date(e.start);
                const diffMins = (start - now) / 1000 / 60;

                // Exact trigger at 15 mins (allow wiggle room of 1 min loop)
                if (e.urgent && diffMins >= 14 && diffMins <= 15) {
                    this.send("🔥 Wichtiger Termin in 15 Min!", `${e.title} um ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
                }
                // Also trigger at start time
                if (diffMins >= -1 && diffMins <= 0) {
                    this.send("🔔 Termin Jetzt!", `${e.title} beginnt jetzt.`);
                }
            });

            // 2. Urgent Tasks Nudge (Every hour on the hour: 9:00, 10:00...)
            if (now.getMinutes() === 0) {
                const urgentTasks = app.state.tasks.filter(t => !t.done && t.urgent);
                const urgentShop = app.state.tasks.filter(t => !t.done && t.category === 'shopping' && t.urgent);

                if (urgentTasks.length > 0) {
                    this.send("🔥 Aufgaben warten!", `Du hast ${urgentTasks.length} dringende Aufgaben offen.`);
                }
                if (urgentShop.length > 0) {
                    this.send("🛒 Wichtiger Einkauf!", `${urgentShop.length} dringende Artikel auf der Liste.`);
                }
            }
        }
    },

    // --- DRIVE ASSISTANT MODULE ---
    drive: {
        currentLocation: null,

        init() {
            this.renderRoute();
            this.getLocation();
        },

        refresh() {
            this.getLocation();
            this.renderRoute();
        },

        getLocation() {
            const statusEl = document.getElementById('currentLocationText');
            if (statusEl) statusEl.textContent = "Suche GPS...";

            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        this.currentLocation = `${position.coords.latitude},${position.coords.longitude}`;
                        if (statusEl) statusEl.textContent = "GPS Gefunden ✅";
                    },
                    (error) => {
                        console.error("GPS Error", error);
                        if (statusEl) statusEl.textContent = "Kein GPS. Bitte eingeben.";
                        this.askLocation();
                    }
                );
            } else {
                if (statusEl) statusEl.textContent = "GPS nicht verfügbar.";
                this.askLocation();
            }
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

                // Only show if it matches today AND hasn't expired > 30 mins ago
                return ed === today &&
                    (eventDate.getTime() + (30 * 60 * 1000)) > nowTime &&
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
                            <div class="card" style="margin:0; padding:15px; border-left: 3px solid var(--primary);">
                                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                                    <span style="font-weight:bold;">${e.title}</span>
                                    <span class="text-muted text-sm">${time} Uhr</span>
                                </div>
                                <div class="text-sm text-muted"><i data-lucide="map-pin" size="12"></i> ${e.location}</div>
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
            const routeEvents = app.state.events.filter(e => {
                const ed = new Date(e.start).setHours(0, 0, 0, 0);
                return ed === today && e.location && e.location.trim().length > 0;
            });
            routeEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

            if (routeEvents.length === 0) {
                alert("Keine Ziele für heute gefunden.");
                return;
            }

            // Construct Google Maps URL
            // Format: https://www.google.com/maps/dir/Start/Stop1/Stop2/...
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
        }
    },

    // --- GENERIC MODULES (Compact) ---
    tasks: {
        toggleUrgency(id) { const t = app.state.tasks.find(x => x.id === id); if (t) { t.urgent = !t.urgent; app.saveState(); this.render(); app.renderDashboard(); } },
        add(t, u, category = 'todo') { app.state.tasks.push({ id: Date.now(), title: t, urgent: u, category: category, done: false }); app.saveState(); this.render(); app.renderDashboard(); },
        toggle(id) { const t = app.state.tasks.find(x => x.id === id); if (t) { t.done = !t.done; app.saveState(); this.render(); app.renderDashboard(); if (t.done) app.gamification.addXP(50); } },
        delete(id) { app.state.tasks = app.state.tasks.filter(x => x.id !== id); app.saveState(); this.render(); app.renderDashboard(); },
        filter(t) { this.currentFilter = t; this.render(); }, currentFilter: 'todo',
        render() {
            const l = document.getElementById('taskListContainer'); if (!l) return;
            let f = app.state.tasks;

            // Explicit Category Filtering
            if (this.currentFilter === 'shopping') {
                f = f.filter(t => t.category === 'shopping' && !t.done);
            } else if (this.currentFilter === 'urgent') {
                f = f.filter(t => t.urgent && !t.done);
            } else if (this.currentFilter === 'done') {
                f = f.filter(t => t.done);
            } else {
                // Default 'todo' or 'all' - exclude shopping from main todo list
                f = f.filter(t => t.category !== 'shopping' && !t.done);
            }
            f.sort((a, b) => (a.done === b.done) ? 0 : a.done ? 1 : -1);
            l.innerHTML = f.map(t => `<div class="task-item ${t.done ? 'opacity-50' : ''} ${t.urgent ? 'blink-urgent' : ''}"><div style="display:flex;align-items:center;gap:10px;"><div class="checkbox-circle ${t.done ? 'checked' : ''}" onclick="app.tasks.toggle(${t.id})"></div><button class="btn-toggle-urgent ${t.urgent ? 'is-urgent' : ''}" onclick="event.stopPropagation(); app.tasks.toggleUrgency(${t.id})"><i data-lucide="flame" size="14"></i></button><span style="${t.done ? 'text-decoration:line-through;color:var(--text-muted)' : ''}">${t.title}</span></div><button class="btn" onclick="app.tasks.delete(${t.id})"><i data-lucide="trash-2" size="16"></i></button></div>`).join('');
            if (window.lucide) lucide.createIcons();
        }
    },
    finance: {
        toggleUrgency(id) { const e = app.state.expenses.find(x => x.id === id); if (e) { e.urgent = !e.urgent; app.saveState(); this.render(); } },
        add(a, d, dateStr, urgent = false) {
            app.state.expenses.push({
                id: Date.now(),
                amount: parseFloat(a),
                desc: d,
                date: dateStr || new Date().toISOString().split('T')[0],
                urgent: urgent
            });
            app.saveState();
            this.render();
            app.renderDashboard();
        },
        render() {
            // Calculate totals
            const now = new Date();
            const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM

            const monthExpenses = app.state.expenses.filter(e => e.date && e.date.startsWith(currentMonth));
            const totalMonth = monthExpenses.reduce((s, e) => s + e.amount, 0);

            // Chart Update (Monthly Focus)
            const c = document.getElementById('expenseChart');
            if (c && window.Chart) {
                if (this.chartInstance) this.chartInstance.destroy();
                this.chartInstance = new Chart(c, {
                    type: 'doughnut',
                    data: {
                        labels: ['Ausgaben (Monat)', 'Rest-Budget'],
                        datasets: [{
                            data: [totalMonth, Math.max(0, 2000 - totalMonth)],
                            backgroundColor: ['#ef4444', '#334155'],
                            borderWidth: 0
                        }]
                    },
                    options: { responsive: true, cutout: '70%', plugins: { legend: { position: 'bottom' } } }
                });
            }

            // List View
            const l = document.getElementById('expenseHistory');
            if (l) {
                l.innerHTML = app.state.expenses.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).map(e => {
                    const d = new Date(e.date).toLocaleDateString();
                    return `<div class="${e.urgent ? 'blink-urgent' : ''}" style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:rgba(255,255,255,0.05);border-radius:8px;margin-bottom:5px;">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <button class="btn-toggle-urgent ${e.urgent ? 'is-urgent' : ''}" onclick="app.finance.toggleUrgency(${e.id})"><i data-lucide="flame" size="12"></i></button>
                            <div>
                                <div style="font-weight:500;">${e.desc}</div>
                                <div class="text-sm text-muted">${d}</div>
                            </div>
                        </div>
                        <span style="color:var(--danger)">-${e.amount.toFixed(2)} €</span>
                    </div>`;
                }).join('');
            }
            if (window.lucide) lucide.createIcons();
        }
    },
    habits: {
        toggleUrgency(id) { const h = app.state.habits.find(x => x.id === id); if (h) { h.urgent = !h.urgent; app.saveState(); this.render(); } },
        add() {
            const n = prompt("Gewohnheit Name:");
            if (n) {
                const goal = parseInt(prompt("Ziel (Tage):", "30")) || 30;
                app.state.habits.push({ id: Date.now(), name: n, streak: 0, goal: goal, urgent: false });
                app.saveState();
                this.render();
            }
        },
        increment(id) {
            const h = app.state.habits.find(x => x.id === id);
            if (h) {
                h.streak++;
                app.gamification.addXP(10);
                app.saveState();
                this.render();
            }
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
                return `
                    <div class="card ${h.urgent ? 'blink-urgent' : ''}">
                        <div class="card-header">
                            <span class="card-title">${h.name}</span>
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
        },
        edit(id) {
            const entry = app.state.healthData.find(e => e.id === id);
            if (!entry) return;

            const newValue = parseFloat(prompt(`Neuer Wert (${entry.type}):`, entry.value));
            if (newValue && !isNaN(newValue)) {
                entry.value = newValue;
                entry.timestamp = new Date().toISOString();
                app.saveState();
                this.render();
            }
        },
        delete(id) {
            if (confirm("Eintrag wirklich löschen?")) {
                app.state.healthData = app.state.healthData.filter(e => e.id !== id);
                app.saveState();
                this.render();
            }
        },
        setWaterGoal() {
            const goal = parseFloat(prompt("Tägliches Wasser-Ziel in Litern:", app.state.waterGoal || "2.5"));
            if (goal && goal > 0) {
                app.state.waterGoal = goal;
                app.saveState();
                this.render();
            }
        },
        addWater(amount = 0.25, reminder = false) {
            if (!app.state.healthData) app.state.healthData = [];
            const today = new Date().toISOString().split('T')[0];

            app.state.healthData.push({
                id: Date.now(),
                type: 'water',
                value: amount,
                date: today,
                timestamp: new Date().toISOString(),
                reminder: reminder
            });

            app.saveState();
            this.render();

            if (reminder) {
                alert('✅ Erinnerung aktiviert! Du wirst alle 2 Stunden ans Trinken erinnert.');
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

            if (reminder) {
                alert('✅ Erinnerung aktiviert! Du wirst wöchentlich ans Wiegen erinnert.');
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
                alert("🎤 Ich höre! (Versuch mal: 'W 0.5', 'Milch kaufen', '10 Euro für Pizza'...)");
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
            // Use smartCommand for voice results too
            const handled = app.smartCommand(text);
            if (handled) return;

            const t = text.toLowerCase();
            if (t.includes('kalender')) app.navigateTo('calendar');
            else if (t.includes('aufgabe')) app.navigateTo('tasks');
            else if (t.includes('fahrt')) app.navigateTo('drive');
            else if (t.includes('dashboard')) app.navigateTo('dashboard');
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
    async requestWakeLock() { if ('wakeLock' in navigator) { try { this.wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { } } },
    releaseWakeLock() { if (this.wakeLock) { this.wakeLock.release(); this.wakeLock = null; } },

    smartCommand(raw) {
        if (!raw) return;
        const text = raw.trim().toLowerCase();

        // 1. Water Tracking ("W", "Trinken", "Wasser", "0.5L")
        if (text.startsWith('w ') || text.startsWith('wasser ') || text.startsWith('trinken ') || (/^\d+(\.\d+)?(l|ml)/i.test(text))) {
            let val = parseFloat(text.replace(/[^0-9.]/g, ''));
            if (text.includes('ml')) val = val / 1000;
            if (val > 0) {
                app.health.addWater(val);
                alert(`💧 ${val}L Wasser hinzugefügt!`);
                return true;
            }
        }

        // 2. Expenses ("E ", "Euro", "Ausgabe", "10 Pizza")
        if (text.startsWith('e ') || text.includes('euro') || text.startsWith('ausgabe ')) {
            const amount = parseFloat(text.replace(/[^0-9.]/g, ''));
            const desc = raw.replace(/[0-9.]/g, '').replace(/euro|ausgabe|e /gi, '').trim();
            if (amount > 0) {
                app.finance.add(amount, desc || "Unbekannt");
                alert(`💰 ${amount}€ für "${desc}" erfasst!`);
                return true;
            }
        }

        // 3. Tasks / Shopping / List ("K ", "Kaufen", "A ", "Task", "Aufgabe", "Liste")
        if (text.startsWith('k ') || text.startsWith('kaufen ') || text.startsWith('a ') ||
            text.startsWith('aufgabe ') || text.startsWith('liste ')) {
            const title = raw.replace(/kaufen|aufgabe|liste|k |a /gi, '').trim();
            if (title) {
                // If keywords suggest shopping, add to shopping category
                const isShop = text.includes('kaufen') || text.includes('liste');
                app.tasks.add(title, false, isShop ? 'shopping' : 'todo');
                alert(`✅ ${isShop ? 'Einkauf' : 'Aufgabe'} "${title}" erstellt!`);
                return true;
            }
        }

        // 4. Events ("Termin", "Meeting")
        if (text.startsWith('t ') || text.startsWith('termin ') || text.startsWith('meeting ')) {
            const title = raw.replace(/termin|meeting|t /gi, '').trim();
            if (title) {
                app.modals.open('addEvent', { title: title });
                return true;
            }
        }

        // Default: Add as Task if not recognized
        // Default: Add as Task if not recognized
        if (raw.length > 2) {
            app.tasks.add(raw, false, 'todo'); // Default to todo
            alert(`✅ Als Aufgabe gespeichert: "${raw}"`);
            return true;
        }
        return false;
    },

    actions: {
        toggleDriveMode() {
            const d = document.getElementById('view-drive');
            if (d.classList.contains('hidden')) {
                app.navigateTo('drive');
                app.drive.init();
            }
            else { app.navigateTo('dashboard'); }
        }
    },

    // --- CLOUD SYNC MODULE (Supabase) ---
    cloud: {
        client: null,
        init() {
            if (app.state.cloud && app.state.cloud.url && app.state.cloud.key && window.createClient) {
                try {
                    this.client = window.createClient(app.state.cloud.url, app.state.cloud.key);
                    const status = document.getElementById('syncStatus');
                    if (status) status.innerHTML = '<span style="color:var(--success)">🟢 Bereit</span>';
                    console.log("Supabase Client Initialized");
                    // Auto-pull on init
                    this.sync(false);
                } catch (e) { console.error("Cloud Init Failed", e); }
            }
        },
        async sync(manual = false) {
            if (!this.client) {
                if (manual) alert("Bitte erst Supabase URL & Key in den Einstellungen hinterlegen.");
                return;
            }
            const team = app.state.user.teamName;
            if (!team) {
                if (manual) alert("Kein Team-Name gefunden. Bitte erst anmelden.");
                return;
            }

            const status = document.getElementById('syncStatus');
            if (status) status.innerHTML = '🟡 Sync läuft...';

            try {
                // 1. PULL: Get latest data from cloud
                // Table 'taskforce_sync' must exist with columns: id (text, PK), data (jsonb), updated_at (timestamptz)
                // We use 'team' as the ID.
                const { data, error } = await this.client
                    .from('taskforce_sync')
                    .select('*')
                    .eq('id', team)
                    .single();

                if (error && error.code !== 'PGRST116') throw error; // 116 is 'not found' which is fine for first time

                let cloudState = data ? data.data : null;

                // MERGE STRATEGY: 
                // Simple strategy: Cloud wins if timestamp is newer, OR merge arrays unique by ID
                if (cloudState) {
                    // Merge Tasks
                    if (cloudState.tasks) {
                        const localIds = new Set(app.state.tasks.map(x => x.id));
                        cloudState.tasks.forEach(t => {
                            if (!localIds.has(t.id)) app.state.tasks.push(t);
                        });
                    }
                    // Merge Events
                    if (cloudState.events) {
                        const localIds = new Set(app.state.events.map(x => x.id));
                        cloudState.events.forEach(e => {
                            if (!localIds.has(e.id)) app.state.events.push(e);
                        });
                    }
                    // Merge Expenses
                    if (cloudState.expenses) {
                        const localIds = new Set(app.state.expenses.map(x => x.id));
                        cloudState.expenses.forEach(e => {
                            if (!localIds.has(e.id)) app.state.expenses.push(e);
                        });
                    }

                    // Note: We don't overwrite settings/user, only content
                    app.saveState();
                    console.log("Cloud Data Merged");
                }

                // 2. PUSH: Save merged state back to cloud
                const payload = {
                    id: team,
                    data: {
                        tasks: app.state.tasks,
                        events: app.state.events,
                        expenses: app.state.expenses,
                        habits: app.state.habits,
                        healthData: app.state.healthData,
                        last_updated: new Date().toISOString()
                    },
                    updated_at: new Date().toISOString()
                };

                const { error: pushError } = await this.client
                    .from('taskforce_sync')
                    .upsert(payload);

                if (pushError) throw pushError;

                if (status) status.innerHTML = `<span style="color:var(--success)">🟢 Sync OK (${new Date().toLocaleTimeString()})</span>`;
                if (manual) alert("Synchronisation erfolgreich! ✅");

                // Refresh UI
                app.renderDashboard();

            } catch (e) {
                console.error("Sync Error:", e);
                if (status) status.innerHTML = '<span style="color:var(--danger)">🔴 Fehler</span>';
                if (manual) alert("Sync Fehler: " + e.message + "\n\n(Prüfe ob Tabelle 'taskforce_sync' existiert!)");
            }
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
            document.getElementById('settingsUserName').value = app.state.user.name || '';

            // Set Layout Dropdown
            const layoutSelect = document.getElementById('dashboardLayoutSelect');
            if (layoutSelect) layoutSelect.value = app.state.dashboardLayout || 'double';

            document.getElementById('settingsUserName').value = app.state.user.name || '';

            // Render Cloud Config
            if (app.state.cloud) {
                document.getElementById('syncUrl').value = app.state.cloud.url || '';
                document.getElementById('syncKey').value = app.state.cloud.key || '';
                if (app.state.cloud.url && app.state.cloud.key && app.cloud.client) {
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
                    <hr style="border-color:var(--border); margin:20px 0;">
                `;
            }

            this.updateAIProvider();
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
        saveLayout() {
            const val = document.getElementById('dashboardLayoutSelect').value;
            app.state.dashboardLayout = val;
            app.saveState();
            this.applyLayoutPreference();
        },
        updateAIProvider() {
            const provider = document.getElementById('aiProviderSelect').value;
            document.querySelectorAll('.ai-config-fields').forEach(el => el.classList.add('hidden'));
            document.getElementById(`${provider}Config`).classList.remove('hidden');
            this.saveAIConfig();
        },
        saveAIConfig() {
            app.state.aiConfig.provider = document.getElementById('aiProviderSelect').value;
            app.state.aiConfig.openaiKey = document.getElementById('openaiKeyInput').value;
            app.state.aiConfig.grokKey = document.getElementById('grokKeyInput').value;
            app.state.aiConfig.geminiKey = document.getElementById('geminiKeyInput').value;
            app.saveState();
            alert("AI-Einstellungen wurden erfolgreich gespeichert! ✅");
        },
        saveCloudConfig() {
            if (!app.state.cloud) app.state.cloud = {};
            app.state.cloud.url = document.getElementById('syncUrl').value.trim();
            app.state.cloud.key = document.getElementById('syncKey').value.trim();
            app.saveState();
            // Try to init immediately
            app.cloud.init();
        },
        saveProfile() {
            app.state.user.name = document.getElementById('settingsUserName').value;
            app.saveState();
            app.user.updateHeader();
        },
        savePassword() {
            const p1 = document.getElementById('settingsPass1').value;
            const p2 = document.getElementById('settingsPass2').value;
            if (p1 && p1 === p2) {
                app.state.user.password = p1;
                app.saveState();
                alert("Passwort geändert! ✅");
            } else {
                alert("Passwörter stimmen nicht überein.");
            }
        },
        resetApp() {
            if (confirm("Möchtest du wirklich alle Daten löschen? Dies kann nicht rückgängig gemacht werden.")) {
                localStorage.removeItem('taskforce_state');
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

            if (type === 'addTask') {
                const cat = data.category || 'todo';
                const isShopping = cat === 'shopping';
                c.innerHTML = `
                    <div style="padding:20px;">
                        <h3>${isShopping ? 'Neuer Einkauf' : 'Neue Aufgabe'}</h3>
                        <div class="form-group" style="display:flex;gap:5px;">
                            <input id="newTaskTitle" class="form-input" placeholder="Titel (z.B. ${isShopping ? 'Milch' : 'Meeting'})">
                            <button class="btn-secondary" onclick="app.voice.listenTo('newTaskTitle')"><i data-lucide="mic"></i></button>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Liste</label>
                            <div style="display:flex; gap:10px;">
                                <label style="display:flex; align-items:center; gap:5px; cursor:pointer;">
                                    <input type="radio" name="taskCategory" value="todo" ${!isShopping ? 'checked' : ''}> To-Do
                                </label>
                                <label style="display:flex; align-items:center; gap:5px; cursor:pointer;">
                                    <input type="radio" name="taskCategory" value="shopping" ${isShopping ? 'checked' : ''}> Einkauf
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
            } else if (type === 'setAlarm') {
                const current = app.state.alarm ? app.state.alarm.time : '07:00';
                const isActive = app.state.alarm ? app.state.alarm.active : false;
                c.innerHTML = `<div style="padding:20px;"><h3>⏰ Wecker stellen</h3><div class="form-group"><input type="time" id="alarmTime" class="form-input" value="${current}" style="font-size:2rem; text-align:center;"></div><div class="form-group"><label class="form-label" style="text-align:center; display:block;"><input type="checkbox" id="alarmActive" ${isActive ? 'checked' : ''}> Wecker Aktiv</label></div><div style="display:flex;justify-content:end;gap:10px;"><button class="btn" onclick="app.modals.close()">Fertig</button><button class="btn btn-primary" onclick="app.modals.saveAlarm()">Speichern</button></div></div>`;
            } else if (type === 'addEvent') {
                const d = data.date || new Date().toISOString().slice(0, 10);
                const t = data.title || '';
                const ti = data.time || '12:00';
                const l = data.location || '';
                const ph = data.phone || '';
                const em = data.email || '';
                const no = data.notes || ''; // New Notes Field

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

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                         <div class="form-group"><input type="date" id="evtDate" class="form-input" value="${d}"></div>
                         <div class="form-group"><input type="time" id="evtTime" class="form-input" value="${ti}"></div>
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

                    <div style="display:flex;justify-content:end;gap:10px; margin-top:20px;">
                        <button class="btn" onclick="app.modals.close()">Abbrechen</button>
                        <button class="btn btn-primary" onclick="app.modals.submitEvent()">Speichern</button>
                    </div>
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
            } else if (type === 'addExpense') {
                const today = new Date().toISOString().split('T')[0];
                c.innerHTML = `
                <div style="padding:20px;">
                    <h3>Ausgabe erfassen</h3>
                    <div class="form-group">
                        <label class="form-label">Wofür?</label>
                        <input id="expDesc" class="form-input" placeholder="z.B. Lebensmittel">
                    </div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                        <div class="form-group">
                            <label class="form-label">Betrag (€)</label>
                            <input type="number" id="expAmount" class="form-input" placeholder="0.00" step="0.01">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Datum</label>
                            <input type="date" id="expDate" class="form-input" value="${today}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label><input type="checkbox" id="expUrgent"> 🔥 Wichtig / Dringend</label>
                    </div>
                    <button class="btn btn-primary" onclick="app.modals.submitExpense()" style="margin-top:10px;width:100%;">Speichern</button>
                </div>`;
            } else if (type === 'addTeamMember') {
                c.innerHTML = `<div style="padding:20px;"><h3>Mitarbeiter hinzufügen</h3><input id="teamMemberName" class="form-input" placeholder="Name"><button class="btn btn-primary" onclick="app.modals.submitTeamMember()" style="margin-top:10px;width:100%;">Hinzufügen</button></div>`;
            } else if (type === 'dailyStatus') {
                // Calculate Stats
                const t = app.state.tasks || [];
                const tot = t.length;
                const done = t.filter(x => x.done).length;
                const urg = t.filter(x => !x.done && x.urgent).length;
                const open = tot - done;

                // Finance Today
                const todayStr = new Date().toISOString().split('T')[0];
                const finToday = (app.state.expenses || []).filter(e => e.date && e.date.startsWith(todayStr)).reduce((a, b) => a + b.amount, 0);

                // Events Today
                const evToday = (app.state.events || []).filter(e => e.start.startsWith(todayStr)).length;

                // Lists Generation
                const urgentItems = t.filter(x => !x.done && x.urgent).map(task =>
                    `<div style="display:flex; justify-content:space-between; padding:8px; border-bottom:1px solid rgba(255,255,255,0.05); color:var(--danger);">
                        <span>🔥 ${task.title}</span>
                    </div>`
                ).join('') || '<div class="text-muted text-sm" style="padding:8px;">Keine dringenden Aufgaben.</div>';

                const openItems = t.filter(x => !x.done && !x.urgent && x.category !== 'shopping').map(task =>
                    `<div style="display:flex; justify-content:space-between; padding:8px; border-bottom:1px solid rgba(255,255,255,0.05);">
                        <span>${task.title}</span>
                    </div>`
                ).join('') || '<div class="text-muted text-sm" style="padding:8px;">Alles erledigt.</div>';

                const doneItems = t.filter(x => x.done).slice(0, 5).map(task =>
                    `<div style="display:flex; justify-content:space-between; padding:8px; border-bottom:1px solid rgba(255,255,255,0.05); text-decoration:line-through; color:var(--text-muted);">
                        <span>${task.title}</span>
                    </div>`
                ).join('') || '<div class="text-muted text-sm" style="padding:8px;">Noch nichts erledigt.</div>';

                c.innerHTML = `
                <div style="padding:20px; max-height:80vh; overflow-y:auto;">
                    <h3><i data-lucide="activity"></i> Tages-Check</h3>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px; margin-top:10px;">
                        <div class="card" style="margin:0; text-align:center; padding:15px; background:rgba(239,68,68,0.1);">
                            <div style="font-size:1.5rem; font-weight:bold; color:var(--danger);">${urg}</div>
                            <div class="text-muted text-xs">Dringend</div>
                        </div>
                        <div class="card" style="margin:0; text-align:center; padding:15px; background:rgba(255,255,255,0.05);">
                            <div style="font-size:1.5rem; font-weight:bold;">${open}</div>
                            <div class="text-muted text-xs">Offen</div>
                        </div>
                         <div class="card" style="margin:0; text-align:center; padding:15px; background:rgba(34,197,94,0.1);">
                            <div style="font-size:1.5rem; font-weight:bold; color:var(--success);">${done}</div>
                            <div class="text-muted text-xs">Erledigt</div>
                        </div>
                         <div class="card" style="margin:0; text-align:center; padding:15px; background:rgba(59,130,246,0.1);">
                            <div style="font-size:1.5rem; font-weight:bold; color:var(--primary);">${finToday}€</div>
                            <div class="text-muted text-xs">Ausgaben</div>
                        </div>
                    </div>

                    <!-- Detailed Lists -->
                    <div style="margin-bottom:15px;">
                        <h4 style="color:var(--danger); border-bottom:1px solid var(--border); padding-bottom:5px; margin-bottom:5px;">Dringend</h4>
                        ${urgentItems}
                    </div>

                    <div style="margin-bottom:15px;">
                        <h4 style="color:var(--text-main); border-bottom:1px solid var(--border); padding-bottom:5px; margin-bottom:5px;">Offen</h4>
                        ${openItems}
                    </div>

                    <div style="margin-bottom:15px;">
                        <h4 style="color:var(--success); border-bottom:1px solid var(--border); padding-bottom:5px; margin-bottom:5px;">Erledigt (Top 5)</h4>
                        ${doneItems}
                    </div>

                    <button class="btn btn-primary" onclick="app.modals.close()" style="width:100%;">Alles Klar 👍</button>
                </div>`;
            }
            if (window.lucide) lucide.createIcons();
        },
        close() {
            const o = document.getElementById('modalOverlay');
            if (o) o.classList.add('hidden');
            app.editingId = null;
        },
        saveAlarm() {
            const t = document.getElementById('alarmTime').value;
            const a = document.getElementById('alarmActive').checked;
            app.state.alarm = { time: t, active: a };
            app.saveState();
            const dis = document.getElementById('activeAlarmDisplay');
            if (dis) dis.textContent = a ? `An: ${t} Uhr` : 'Aus';
            const ndis = document.getElementById('nightAlarmDisplay');
            if (ndis) { ndis.classList.toggle('hidden', !a); ndis.querySelector('span').textContent = t; }
            this.close();
        },
        submitTask() {
            const t = document.getElementById('newTaskTitle').value;
            if (t) {
                const cat = document.querySelector('input[name="taskCategory"]:checked').value;
                app.tasks.add(t, document.getElementById('newTaskUrgent').checked, cat);
                this.close();
            }
        },
        submitExpense() {
            const d = document.getElementById('expDesc').value;
            const a = document.getElementById('expAmount').value;
            const date = document.getElementById('expDate').value;
            const u = document.getElementById('expUrgent').checked;
            if (d && a && date) {
                app.finance.add(a, d, date, u);
                this.close();
            }
        },
        submitTeamMember() { const n = document.getElementById('teamMemberName').value; if (n) { app.team.addMember(n); this.close(); } },
        submitEvent() {
            const data = {
                title: document.getElementById('evtTitle').value,
                date: document.getElementById('evtDate').value,
                time: document.getElementById('evtTime').value,
                location: document.getElementById('evtLocation').value,
                phone: document.getElementById('evtPhone').value,
                email: document.getElementById('evtEmail').value,
                notes: document.getElementById('evtNotes').value,
                urgent: document.getElementById('evtUrgent').checked
            };
            if (data.title && data.date && data.time) { app.calendar.addEvent(data); this.close(); }
        }
    }
};

// --- BOOTSTRAP ---
document.addEventListener('DOMContentLoaded', () => app.init());
