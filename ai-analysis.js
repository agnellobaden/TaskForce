// ===== AI DEEP ANALYSIS MODULE =====

if (!app.ai) app.ai = {};

app.ai.startDeepAnalysis = async function () {
    console.log("Starting Deep Analysis...");

    // 1. Show Loading State
    const btn = document.querySelector('button[onclick="app.ai.startDeepAnalysis()"]');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = '<span class="loading-spinner"></span> Analysiere...';
        btn.disabled = true;
    }

    if (typeof speakAI === 'function') {
        speakAI("Ich starte die Tiefenanalyse Ihrer Daten. Einen Moment bitte.");
    }

    try {
        // 2. Gather Data
        const context = app.ai.getSystemContext();

        // 3. Construct Prompt
        const systemPrompt = `Du bist der TaskForce Butler. Führe eine tiefe, holistische Analyse des Lebens des Nutzers durch.
        
        Nutzerdaten:
        Name: ${app.state.user.name}
        Job: ${app.state.user.job || 'Nicht angegeben'}
        Level: ${app.state.level} (XP: ${app.state.xp})

        DATEN:
        ${JSON.stringify(context, null, 2)}

        AUFGABE:
        Erstelle einen detaillierten "Master-Plan" Bericht in HTML.
        
        STRUKTUR DES BERICHTS (HTML):
        <div class="analysis-report">
            <div class="score-card">
                <div class="score-circle">[0-100]</div>
                <h3>Gesamt-Produktivität</h3>
            </div>
            
            <div class="analysis-section">
                <h4>🎯 Fokus & Aufgaben</h4>
                <p>...Analyse der offenen Aufgaben, Überfälligkeiten und Empfehlungen...</p>
            </div>

            <div class="analysis-section">
                <h4>⚖️ Work-Life-Balance</h4>
                <p>...Verhältnis von Business zu Privat Terminen/Aufgaben...</p>
            </div>

            <div class="analysis-section">
                <h4>💰 Finanzen & Ressourcen</h4>
                <p>...Budget-Check basierend auf den Ausgaben...</p>
            </div>

            <div class="analysis-summary">
                <h4>🔮 Butler-Fazit & Nächste Schritte</h4>
                <ul>
                    <li>Konkrete Handlungsempfehlung 1</li>
                    <li>Konkrete Handlungsempfehlung 2</li>
                    <li>Konkrete Handlungsempfehlung 3</li>
                </ul>
            </div>
        </div>

        Tone: Professionell, analytisch, aber motivierend und "Butler-like" (höflich).
        Nutze Icons und Fettgedrucktes.
        `;

        // 4. Call AI
        // Using global callAI from personal-ai.js
        if (typeof callAI !== 'function') throw new Error("AI Modul nicht geladen.");

        const response = await callAI([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: "Starte die Analyse jetzt." }
        ], { temperature: 0.7, max_tokens: 1500 });

        // 5. Display Result
        app.modals.open('aiAnalysisResult', { html: response });

        if (typeof speakAI === 'function') {
            speakAI("Analyse abgeschlossen. Ich habe Ihnen den Bericht erstellt.");
        }

    } catch (err) {
        console.error("Deep Analysis Failed:", err);
        const msg = err.message || JSON.stringify(err);
        alert(`❌ Fehler bei der Analyse:\n${msg}\n\nBitte prüfen Sie den API Key in den Einstellungen.`);
        if (typeof speakAI === 'function') speakAI("Es gab leider einen Fehler bei der Analyse.");
    } finally {
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
};

app.ai.getSystemContext = function () {
    // Helper to gather all relevant state
    const now = new Date();
    const todayISO = now.toISOString().split('T')[0];

    // Filter generic lists to save tokens
    const tasks = app.state.tasks || [];
    const events = app.state.events || [];
    const expenses = app.state.expenses || [];
    const habits = app.state.habits || [];

    const openTasks = tasks.filter(t => !t.done).map(t => ({ title: t.title, urgent: t.urgent, due: t.deadline }));
    const recentEvents = events.filter(e => e.date >= todayISO).slice(0, 5); // Next 5 events
    const financeTotal = expenses.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
    const habitsScore = habits.filter(h => h.history && h.history.length > 0).length;

    return {
        date: now.toLocaleString(),
        openTasksCount: openTasks.length,
        urgentTasksCount: openTasks.filter(t => t.urgent).length,
        nextEvents: recentEvents,
        financeTotalOut: financeTotal,
        activeHabits: habitsScore,
        rawTasksSample: openTasks.slice(0, 10) // Top 10 tasks
    };
};
