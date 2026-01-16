// PROFESSIONAL PROJECTS & MEETINGS MODULES
// Copy these into app.js to replace the existing modules

// --- PROJECTS MODULE - PROFESSIONAL UPGRADE ---
projects: {
    add() {
        const name = prompt('📋 Projekt-Name:');
        if (!name || !name.trim()) return;

        const client = prompt('👤 Kunde/Auftraggeber (optional):') || '';
        const deadline = prompt('📅 Deadline (TT.MM.JJJJ, optional):') || '';
        const priority = prompt('⚡ Priorität (1=Niedrig, 2=Mittel, 3=Hoch):', '2');
        const team = prompt('👥 Team-Mitglieder (kommagetrennt, optional):') || '';

        if (!app.state.projects) app.state.projects = [];
        app.state.projects.push({
            id: Date.now(),
            name: name.trim(),
            client: client.trim(),
            deadline: deadline.trim(),
            priority: parseInt(priority) || 2,
            team: team.split(',').map(m => m.trim()).filter(m => m),
            status: 'active',
            progress: 0,
            tasks: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        app.saveState();
        this.render();
        app.gamification.addXP(30);
    },

    edit(id) {
        const project = app.state.projects.find(p => p.id === id);
        if (!project) return;

        const menu = `Projekt: ${project.name}

1️⃣ Fortschritt aktualisieren (${project.progress}%)
2️⃣ Status ändern (${project.status})
3️⃣ Priorität ändern (${project.priority})
4️⃣ Deadline ändern
5️⃣ Team bearbeiten
6️⃣ Details ansehen
7️⃣ Löschen

Wähle eine Option (1-7):`;

        const choice = prompt(menu);

        switch (choice) {
            case '1': this.updateProgress(id); break;
            case '2': this.changeStatus(id); break;
            case '3': this.changePriority(id); break;
            case '4': this.updateDeadline(id); break;
            case '5': this.updateTeam(id); break;
            case '6': this.viewDetails(id); break;
            case '7': this.delete(id); break;
        }
    },

    updateProgress(id) {
        const project = app.state.projects.find(p => p.id === id);
        if (!project) return;

        const progress = prompt(`📊 Fortschritt für "${project.name}" (0-100):`, project.progress);
        if (progress === null) return;

        const num = parseInt(progress);
        if (isNaN(num) || num < 0 || num > 100) {
            alert('❌ Bitte eine Zahl zwischen 0 und 100 eingeben.');
            return;
        }

        project.progress = num;
        project.updatedAt = new Date().toISOString();

        if (num >= 100 && project.status !== 'completed') {
            project.status = 'completed';
            app.gamification.addXP(100);
            if (typeof confetti === 'function') {
                confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            }
            alert('🎉 Projekt abgeschlossen! +100 XP');
        }
        app.saveState();
        this.render();
    },

    changeStatus(id) {
        const project = app.state.projects.find(p => p.id === id);
        if (!project) return;

        const status = prompt('Status:\n1 = Aktiv\n2 = Pausiert\n3 = Abgeschlossen\n4 = Abgebrochen',
            project.status === 'active' ? '1' : project.status === 'paused' ? '2' : project.status === 'completed' ? '3' : '4');

        const statusMap = { '1': 'active', '2': 'paused', '3': 'completed', '4': 'cancelled' };
        if (statusMap[status]) {
            project.status = statusMap[status];
            project.updatedAt = new Date().toISOString();
            app.saveState();
            this.render();
        }
    },

    changePriority(id) {
        const project = app.state.projects.find(p => p.id === id);
        if (!project) return;

        const priority = prompt('⚡ Priorität:\n1 = Niedrig\n2 = Mittel\n3 = Hoch', project.priority);
        const num = parseInt(priority);
        if (num >= 1 && num <= 3) {
            project.priority = num;
            project.updatedAt = new Date().toISOString();
            app.saveState();
            this.render();
        }
    },

    updateDeadline(id) {
        const project = app.state.projects.find(p => p.id === id);
        if (!project) return;

        const deadline = prompt('📅 Deadline (TT.MM.JJJJ):', project.deadline);
        if (deadline !== null) {
            project.deadline = deadline.trim();
            project.updatedAt = new Date().toISOString();
            app.saveState();
            this.render();
        }
    },

    updateTeam(id) {
        const project = app.state.projects.find(p => p.id === id);
        if (!project) return;

        const team = prompt('👥 Team-Mitglieder (kommagetrennt):', project.team.join(', '));
        if (team !== null) {
            project.team = team.split(',').map(m => m.trim()).filter(m => m);
            project.updatedAt = new Date().toISOString();
            app.saveState();
            this.render();
        }
    },

    viewDetails(id) {
        const project = app.state.projects.find(p => p.id === id);
        if (!project) return;

        const statusLabels = { active: 'Aktiv', paused: 'Pausiert', completed: 'Abgeschlossen', cancelled: 'Abgebrochen' };
        const priorityLabels = { 1: 'Niedrig', 2: 'Mittel', 3: 'Hoch' };

        alert(
            `📋 ${project.name}\n\n` +
            (project.client ? `👤 Kunde: ${project.client}\n` : '') +
            `📊 Fortschritt: ${project.progress}%\n` +
            `⚡ Priorität: ${priorityLabels[project.priority]}\n` +
            `📌 Status: ${statusLabels[project.status]}\n` +
            (project.deadline ? `📅 Deadline: ${project.deadline}\n` : '') +
            (project.team.length > 0 ? `👥 Team: ${project.team.join(', ')}\n` : '') +
            `\n📅 Erstellt: ${new Date(project.createdAt).toLocaleDateString('de-DE')}\n` +
            `🔄 Aktualisiert: ${new Date(project.updatedAt).toLocaleDateString('de-DE')}`
        );
    },

    delete (id) {
        const project = app.state.projects.find(p => p.id === id);
        if (!project) return;

        if (confirm(`🗑️ Projekt "${project.name}" wirklich löschen?`)) {
            app.state.projects = app.state.projects.filter(p => p.id !== id);
            app.saveState();
            this.render();
        }
    },

    showAll() {
        if (!app.state.projects || app.state.projects.length === 0) {
            alert('📋 Keine Projekte vorhanden.');
            return;
        }

        const statusLabels = { active: '🟢 Aktiv', paused: '🟡 Pausiert', completed: '✅ Abgeschlossen', cancelled: '❌ Abgebrochen' };
        const list = app.state.projects.map((p, i) =>
            `${i + 1}. ${p.name} - ${statusLabels[p.status]} (${p.progress}%)`
        ).join('\n');

        alert(`📋 Alle Projekte:\n\n${list}\n\nKlicke auf ein Projekt im Dashboard für Details.`);
    },

    render() {
        const container = document.getElementById('projectsPreview');
        const statsEl = document.getElementById('projectsStats');

        if (!container) return;

        if (!app.state.projects || app.state.projects.length === 0) {
            container.innerHTML = `
                <div class="text-muted text-sm" style="padding: 20px; text-align: center;">
                    <i data-lucide="folder-open" size="32" style="opacity: 0.3; margin-bottom: 10px;"></i>
                    <div>Keine aktiven Projekte</div>
                    <div class="text-xs" style="opacity: 0.6; margin-top: 5px;">Starte dein erstes Projekt!</div>
                </div>
            `;
            if (statsEl) statsEl.textContent = '0 Aktiv • 0 Abgeschlossen';
            return;
        }

        const activeProjects = app.state.projects.filter(p => p.status === 'active' || p.status === 'paused');
        const completedCount = app.state.projects.filter(p => p.status === 'completed').length;

        if (statsEl) {
            statsEl.textContent = `${activeProjects.length} Aktiv • ${completedCount} Abgeschlossen`;
        }

        if (activeProjects.length === 0) {
            container.innerHTML = `
                <div class="text-muted text-sm" style="padding: 20px; text-align: center;">
                    <div style="font-size: 2rem; margin-bottom: 10px;">🎉</div>
                    <div>Alle Projekte abgeschlossen!</div>
                    <div class="text-xs" style="opacity: 0.6; margin-top: 5px;">${completedCount} Projekt${completedCount !== 1 ? 'e' : ''} erfolgreich beendet</div>
                </div>
            `;
            return;
        }

        const priorityColors = { 1: '#10b981', 2: '#f59e0b', 3: '#ef4444' };
        const priorityLabels = { 1: 'Niedrig', 2: 'Mittel', 3: 'Hoch' };
        const statusIcons = { active: '🟢', paused: '⏸️', completed: '✅', cancelled: '❌' };

        container.innerHTML = activeProjects.slice(0, 3).map(project => {
            const isOverdue = project.deadline && new Date(project.deadline.split('.').reverse().join('-')) < new Date();

            return `
                <div style="padding: 14px; background: rgba(255,255,255,0.04); border-radius: 12px; border: 1px solid rgba(139, 92, 246, 0.2); cursor: pointer; transition: all 0.2s;"
                    onclick="app.projects.edit(${project.id})"
                    onmouseover="this.style.background='rgba(255,255,255,0.06)'; this.style.borderColor='rgba(139, 92, 246, 0.4)';"
                    onmouseout="this.style.background='rgba(255,255,255,0.04)'; this.style.borderColor='rgba(139, 92, 246, 0.2)';">
                    
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <div style="flex: 1;">
                            <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                                ${statusIcons[project.status]} ${project.name}
                            </div>
                            ${project.client ? `<div class="text-muted text-xs" style="margin-bottom: 4px;">👤 ${project.client}</div>` : ''}
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                            <span style="background: ${priorityColors[project.priority]}22; color: ${priorityColors[project.priority]}; padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: 600;">
                                ${priorityLabels[project.priority]}
                            </span>
                            ${project.deadline ? `<span class="text-xs ${isOverdue ? 'text-danger' : 'text-muted'}" style="display: flex; align-items: center; gap: 3px;">
                                <i data-lucide="calendar" size="10"></i> ${project.deadline}
                            </span>` : ''}
                        </div>
                    </div>

                    <div style="margin-bottom: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                            <span class="text-xs text-muted">Fortschritt</span>
                            <span style="font-size: 0.75rem; font-weight: 700; color: #8b5cf6;">${project.progress}%</span>
                        </div>
                        <div style="width: 100%; background: rgba(255,255,255,0.08); height: 6px; border-radius: 3px; overflow: hidden;">
                            <div style="width: ${project.progress}%; height: 100%; background: linear-gradient(90deg, #8b5cf6, #a78bfa); transition: width 0.3s;"></div>
                        </div>
                    </div>

                    ${project.team.length > 0 ? `
                        <div style="display: flex; align-items: center; gap: 6px; margin-top: 8px;">
                            <i data-lucide="users" size="12" class="text-muted"></i>
                            <div class="text-xs text-muted">${project.team.slice(0, 3).join(', ')}${project.team.length > 3 ? ` +${project.team.length - 3}` : ''}</div>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        if (window.lucide) lucide.createIcons();
    }
},

// --- MEETINGS MODULE - PROFESSIONAL UPGRADE ---
meetings: {
    add() {
        const title = prompt('📋 Meeting-Titel:');
        if (!title || !title.trim()) return;

        const participants = prompt('👥 Teilnehmer (kommagetrennt):') || '';
        const agenda = prompt('📝 Agenda/Themen:') || '';
        const actionItems = prompt('✅ Action Items (kommagetrennt):') || '';
        const nextMeeting = prompt('📅 Nächstes Meeting (TT.MM.JJJJ, optional):') || '';

        if (!app.state.meetings) app.state.meetings = [];
        app.state.meetings.unshift({
            id: Date.now(),
            title: title.trim(),
            participants: participants.split(',').map(p => p.trim()).filter(p => p),
            agenda: agenda.trim(),
            actionItems: actionItems.split(',').map(a => a.trim()).filter(a => a).map(item => ({ text: item, done: false })),
            nextMeeting: nextMeeting.trim(),
            date: new Date().toISOString(),
            duration: 0
        });
        app.saveState();
        this.render();
        app.gamification.addXP(20);
    },

    view(id) {
        const meeting = app.state.meetings.find(m => m.id === id);
        if (!meeting) return;

        const date = new Date(meeting.date).toLocaleString('de-DE');
        const openActions = meeting.actionItems.filter(a => !a.done).length;

        const details =
            `📋 ${meeting.title}\n\n` +
            `📅 ${date}\n` +
            (meeting.participants.length > 0 ? `👥 Teilnehmer: ${meeting.participants.join(', ')}\n\n` : '\n') +
            (meeting.agenda ? `📝 Agenda:\n${meeting.agenda}\n\n` : '') +
            (meeting.actionItems.length > 0 ? `✅ Action Items (${openActions} offen):\n${meeting.actionItems.map((a, i) => `${i + 1}. ${a.done ? '✅' : '⬜'} ${a.text}`).join('\n')}\n\n` : '') +
            (meeting.nextMeeting ? `📅 Nächstes Meeting: ${meeting.nextMeeting}` : '');

        const choice = prompt(details + '\n\n1️⃣ Action Item abhaken\n2️⃣ Bearbeiten\n3️⃣ Löschen\n\nWähle (1-3):');

        switch (choice) {
            case '1':
                this.toggleActionItem(id);
                break;
            case '2':
                this.edit(id);
                break;
            case '3':
                this.delete(id);
                break;
        }
    },

    edit(id) {
        const meeting = app.state.meetings.find(m => m.id === id);
        if (!meeting) return;

        const title = prompt('📋 Meeting-Titel:', meeting.title);
        if (title) meeting.title = title.trim();

        const participants = prompt('👥 Teilnehmer (kommagetrennt):', meeting.participants.join(', '));
        if (participants !== null) {
            meeting.participants = participants.split(',').map(p => p.trim()).filter(p => p);
        }

        const agenda = prompt('📝 Agenda:', meeting.agenda);
        if (agenda !== null) meeting.agenda = agenda.trim();

        const nextMeeting = prompt('📅 Nächstes Meeting:', meeting.nextMeeting);
        if (nextMeeting !== null) meeting.nextMeeting = nextMeeting.trim();

        app.saveState();
        this.render();
    },

    toggleActionItem(id) {
        const meeting = app.state.meetings.find(m => m.id === id);
        if (!meeting || meeting.actionItems.length === 0) return;

        const list = meeting.actionItems.map((a, i) =>
            `${i + 1}. ${a.done ? '✅' : '⬜'} ${a.text}`
        ).join('\n');

        const choice = prompt(`Action Items:\n\n${list}\n\nWelches Item abhaken? (1-${meeting.actionItems.length}):`);
        const index = parseInt(choice) - 1;

        if (index >= 0 && index < meeting.actionItems.length) {
            meeting.actionItems[index].done = !meeting.actionItems[index].done;
            if (meeting.actionItems[index].done) {
                app.gamification.addXP(5);
            }
            app.saveState();
            this.render();
        }
    },

    delete (id) {
        if (confirm('🗑️ Meeting-Protokoll löschen?')) {
            app.state.meetings = app.state.meetings.filter(m => m.id !== id);
            app.saveState();
            this.render();
        }
    },

    showAll() {
        if (!app.state.meetings || app.state.meetings.length === 0) {
            alert('📋 Keine Meeting-Protokolle vorhanden.');
            return;
        }

        const list = app.state.meetings.map((m, i) => {
            const date = new Date(m.date).toLocaleDateString('de-DE');
            const openActions = m.actionItems.filter(a => !a.done).length;
            return `${i + 1}. ${m.title} (${date})${openActions > 0 ? ` - ${openActions} offene Action Items` : ''}`;
        }).join('\n');

        alert(`📋 Alle Meetings:\n\n${list}\n\nKlicke auf ein Meeting im Dashboard für Details.`);
    },

    render() {
        const container = document.getElementById('meetingsPreview');
        const statsEl = document.getElementById('meetingsStats');

        if (!container) return;

        if (!app.state.meetings || app.state.meetings.length === 0) {
            container.innerHTML = `
                <div class="text-muted text-sm" style="padding: 20px; text-align: center;">
                    <i data-lucide="calendar-x" size="32" style="opacity: 0.3; margin-bottom: 10px;"></i>
                    <div>Keine Meeting-Protokolle</div>
                    <div class="text-xs" style="opacity: 0.6; margin-top: 5px;">Dokumentiere dein nächstes Meeting!</div>
                </div>
            `;
            if (statsEl) statsEl.textContent = '0 Meetings • 0 Action Items';
            return;
        }

        const totalActionItems = app.state.meetings.reduce((sum, m) => sum + m.actionItems.filter(a => !a.done).length, 0);

        if (statsEl) {
            statsEl.textContent = `${app.state.meetings.length} Meetings • ${totalActionItems} Action Items`;
        }

        container.innerHTML = app.state.meetings.slice(0, 3).map(meeting => {
            const openActions = meeting.actionItems.filter(a => !a.done).length;
            const totalActions = meeting.actionItems.length;
            const hasNextMeeting = meeting.nextMeeting && meeting.nextMeeting.trim();

            return `
                <div style="padding: 14px; background: rgba(255,255,255,0.04); border-radius: 12px; border: 1px solid rgba(236, 72, 153, 0.2); cursor: pointer; transition: all 0.2s;"
                    onclick="app.meetings.view(${meeting.id})"
                    onmouseover="this.style.background='rgba(255,255,255,0.06)'; this.style.borderColor='rgba(236, 72, 153, 0.4)';"
                    onmouseout="this.style.background='rgba(255,255,255,0.04)'; this.style.borderColor='rgba(236, 72, 153, 0.2)';">
                    
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                        <div style="flex: 1;">
                            <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 4px;">
                                ${meeting.title}
                            </div>
                            <div class="text-muted text-xs">${new Date(meeting.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        ${totalActions > 0 ? `
                            <span style="background: ${openActions > 0 ? '#f59e0b22' : '#10b98122'}; color: ${openActions > 0 ? '#f59e0b' : '#10b981'}; padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: 600;">
                                ${totalActions - openActions}/${totalActions} ✓
                            </span>
                        ` : ''}
                    </div>

                    ${meeting.participants.length > 0 ? `
                        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                            <i data-lucide="users" size="12" class="text-muted"></i>
                            <div class="text-xs text-muted">${meeting.participants.slice(0, 3).join(', ')}${meeting.participants.length > 3 ? ` +${meeting.participants.length - 3}` : ''}</div>
                        </div>
                    ` : ''}

                    ${openActions > 0 ? `
                        <div style="background: rgba(245, 158, 11, 0.1); padding: 6px 8px; border-radius: 6px; margin-top: 8px;">
                            <div class="text-xs" style="color: #f59e0b; font-weight: 600;">⚠️ ${openActions} offene Action Item${openActions !== 1 ? 's' : ''}</div>
                        </div>
                    ` : ''}

                    ${hasNextMeeting ? `
                        <div style="display: flex; align-items: center; gap: 6px; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.05);">
                            <i data-lucide="calendar-clock" size="12" class="text-primary"></i>
                            <div class="text-xs text-primary">Nächstes Meeting: ${meeting.nextMeeting}</div>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        if (window.lucide) lucide.createIcons();
    }
}
