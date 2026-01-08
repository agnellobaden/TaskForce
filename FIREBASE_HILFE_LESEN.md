# 🛑 WICHTIGE SICHERHEITSWARNUNG

Du hast gerade eine Datei gepostet, die einen **privaten Service-Account-Schlüssel** enthält (`private_key`).
**Benutze diese Datei NIEMALS in deiner App (`app.js` oder `index.html`)!**
Wenn du diesen Schlüssel in die App einbaust, kann jeder Besucher deiner Webseite die volle Kontrolle über deine Datenbank übernehmen.

---

## ✅ Wie wir die Synchronisierung reparieren

In deiner `app.js` steht bereits eine Konfiguration für das Projekt `taskforce-91683`. Das ist gut!

Es gibt zwei wahrscheinliche Gründe, warum die Synchronisierung trotzdem nicht geht:

### 1. Datenbak-Regeln (Firestore Rules)
Da deine App eine einfache Login-Methode (Name/PIN) ohne E-Mail nutzt, blockiert Firebase standardmäßig den Zugriff. Du musst die Regeln öffnen.

**Schritt-für-Schritt:**
1. Gehe zur [Firebase Konsole](https://console.firebase.google.com/).
2. Wähle dein Projekt **taskforce-91683**.
3. Klicke im linken Menü auf **Firestore Database**.
4. Klicke oben auf den Reiter **Regeln** (Rules).
5. Lösche den vorhandenen Code und füge diesen ein (erlaubt Zugriff für alle Benutzer deiner App):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

6. Klicke auf **Veröffentlichen**.

### 2. Die richtige Config finden (Falls der API Key falsch ist)
Falls der Key in deiner `app.js` (`AIzaSy...`) nicht stimmt, brauchen wir die **Web-Konfiguration**, nicht den Service-Account.

**So findest du sie:**
1. In der Firebase Konsole, klicke auf das **Zahnrad** ⚙️ (Projektübersicht) -> **Projekteinstellungen**.
2. Scrolle ganz nach unten zu **"Meine Apps"**.
3. Wähle die Web-App (</> Symbol).
4. Kopiere den Code, der so aussieht:
   ```javascript
   const firebaseConfig = {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "..."
   };
   ```
5. Diesen Code kannst du mir schicken oder in `app.js` (Zeile 4) ersetzen.

### 3. Nicht lokal öffnen
Öffne die App nicht direkt per Doppelklick (`file://...`), da Firebase das oft blockiert.
Lade die Dateien auf GitHub hoch und nutze **GitHub Pages**, oder nutze einen lokalen Server (z.B. Live Server in VS Code).
