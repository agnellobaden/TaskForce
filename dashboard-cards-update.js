// Dashboard Cards Update Script
// Aktualisiert die Dashboard-Karten mit echten Daten

function updateDashboardCards() {
    if (typeof app === 'undefined' || !app.state) return;

    const tasks = app.state.tasks || [];
    const events = app.state.events || [];
    const healthData = app.state.healthData || [];
    // Fix: Use Local Date to avoid UTC issues
    const d = new Date();
    const todayISO = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    // 1. HAUSHALT KARTE
    const householdTasks = tasks.filter(t => !t.done && t.category === 'household');
    const householdPreview = document.getElementById('dashboardHouseholdPreview');
    if (householdPreview) {
        if (householdTasks.length > 0) {
            householdPreview.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:6px;">
                    ${householdTasks.slice(0, 3).map(t => `
                        <div style="display:flex; align-items:center; gap:8px; padding:6px; background:rgba(34, 197, 94, 0.1); border-radius:8px;">
                            <i data-lucide="check-circle" size="14" style="color:#22c55e;"></i>
                            <span style="font-size:0.85rem; flex:1;">${t.title}</span>
                        </div>
                    `).join('')}
                    ${householdTasks.length > 3 ? `<div class="text-muted text-xs" style="text-align:center;">+${householdTasks.length - 3} weitere</div>` : ''}
                </div>
            `;
        } else {
            householdPreview.innerHTML = '<div class="text-muted text-sm" style="text-align: center;">Keine anstehenden Aufgaben</div>';
        }
        if (window.lucide) lucide.createIcons();
    }

    // 2. WOCHENMENÜ KARTE
    let menuTasks = tasks.filter(t => !t.done && t.category === 'menu');

    // Fallback: Check app.state.meals array (Index 0 = Monday)
    if (app.state.meals && Array.isArray(app.state.meals)) {
        const dayIdx = (new Date().getDay() + 6) % 7;
        if (app.state.meals[dayIdx]) {
            menuTasks.push({ title: app.state.meals[dayIdx], deadline: todayISO, category: 'menu' });
        }
        // Optionally add future meals to list?
        // For simplicity, we just ensure "Heute" is correct first.
    }
    const mealPlanPreview = document.getElementById('dashboardMealPlanPreview');

    if (mealPlanPreview) {
        const todayMeal = menuTasks.find(t => t.deadline === todayISO);

        if (todayMeal) {
            // Appetizing Card Design for Today
            mealPlanPreview.innerHTML = `
                <div style="background: linear-gradient(135deg, rgba(234, 179, 8, 0.15), rgba(234, 179, 8, 0.05)); border-radius: 12px; padding: 15px; text-align: center; border: 1px solid rgba(234, 179, 8, 0.3); box-shadow: 0 4px 12px rgba(0,0,0,0.1); position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -10px; right: -10px; opacity: 0.1; font-size: 4rem;">🍽️</div>
                    <div style="font-size: 0.7rem; text-transform: uppercase; color: #facc15; letter-spacing: 1.5px; margin-bottom: 8px; font-weight: 800; display:flex; align-items:center; justify-content:center; gap:6px;">
                        <i data-lucide="chef-hat" size="14"></i> MENÜ DES TAGES
                    </div>
                    <div style="font-size: 1.3rem; font-weight: 700; color: #fff; line-height: 1.3; margin-bottom: 8px; font-family: 'Segoe UI', sans-serif; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                        ${todayMeal.title}
                    </div>
                    <div style="font-size: 0.85rem; color: rgba(255,255,255,0.8); font-style: italic; background: rgba(0,0,0,0.2); display: inline-block; padding: 4px 12px; border-radius: 20px;">
                        Guten Appetit! ✨
                    </div>
                </div>
            `;
        } else if (menuTasks.length > 0) {
            // Appetizing List Design for Upcoming
            mealPlanPreview.innerHTML = `
                <div style="background: rgba(255,255,255,0.03); border-radius: 12px; padding: 12px; border: 1px solid rgba(255,255,255,0.05);">
                    <div style="font-size: 0.75rem; text-transform: uppercase; color: #a1a1aa; margin-bottom: 10px; text-align:center; font-weight: 600; letter-spacing: 0.5px;">
                        Demnächst auf dem Tisch
                    </div>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        ${menuTasks.slice(0, 3).map(t => `
                            <div style="display:flex; align-items:center; gap:12px; padding:8px; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                                <span style="font-size:1.2rem; background: rgba(234, 179, 8, 0.1); width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%;">🍲</span>
                                <span style="font-size:0.95rem; color:#e4e4e7; font-weight: 500;">${t.title}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else {
            // Empty State
            mealPlanPreview.innerHTML = `
                <div style="text-align:center; padding:20px; opacity:0.6; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;">
                    <i data-lucide="utensils-crossed" size="24" style="opacity: 0.5;"></i>
                    <div style="font-size:0.9rem; font-weight: 500;">Kein Menü geplant</div>
                    <div style="font-size:0.75rem; opacity: 0.7;">Tippe zum Planen</div>
                </div>
             `;
        }
        if (window.lucide) lucide.createIcons();
    }

    // 3. PRIVATE DRIVE MODE KARTE
    const privateDriveCard = document.getElementById('dashboardPrivateDriveCard');
    if (privateDriveCard) {
        const todayEvents = events.filter(e => e.date === todayISO);
        const upcomingEvents = events.filter(e => e.date > todayISO).slice(0, 3);

        let driveInfo = 'Fahrt-Assistent für private Termine';
        if (todayEvents.length > 0) {
            driveInfo = `${todayEvents.length} Termin${todayEvents.length > 1 ? 'e' : ''} heute`;
        } else if (upcomingEvents.length > 0) {
            driveInfo = `${upcomingEvents.length} anstehende Termine`;
        }

        const driveDesc = privateDriveCard.querySelector('.text-muted');
        if (driveDesc) {
            driveDesc.textContent = driveInfo;
            if (todayEvents.length > 0) {
                driveDesc.style.color = '#3b82f6';
                driveDesc.style.fontWeight = '600';
            }
        }
    }

    // 4. VITALITÄT KARTE (falls vorhanden)
    const healthCard = document.getElementById('dashboardHealthCard');
    if (healthCard) {
        const waterToday = healthData
            .filter(d => d.type === 'water' && d.date === todayISO)
            .reduce((sum, d) => sum + d.value, 0);
        const waterGoal = app.state.hydrationGoal || 2.5;

        const healthPreview = healthCard.querySelector('#dashboardHealthPreview');
        if (healthPreview) {
            healthPreview.innerHTML = `
                <div style="display:flex; align-items:center; justify-content:space-between; padding:10px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <button onclick="app.health.addWater(0.25); updateDashboardCards();" 
                                style="background:rgba(59, 130, 246, 0.2); border:2px solid rgba(59, 130, 246, 0.5); color:#3b82f6; width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:1.5rem; transition:all 0.2s;"
                                onmouseover="this.style.transform='scale(1.1)'"
                                onmouseout="this.style.transform='scale(1)'">
                            💧
                        </button>
                        <span style="font-size:0.85rem; font-weight:600;">Wasser</span>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:1.2rem; font-weight:700; color:#3b82f6;">${waterToday.toFixed(1)}L</div>
                        <div class="text-muted text-xs">von ${waterGoal}L</div>
                    </div>
                </div>
            `;
        }
    }
}

// Beim Laden der Seite ausführen
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateDashboardCards);
} else {
    updateDashboardCards();
}

// Bei Änderungen aktualisieren
if (typeof app !== 'undefined') {
    const originalSaveState = app.saveState;
    app.saveState = function () {
        originalSaveState.call(app);
        setTimeout(updateDashboardCards, 100);
    };
}
