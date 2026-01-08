# KI-Recherche System - Dokumentation

## 🔍 Übersicht
Die App kann jetzt **automatisch Informationen recherchieren** und direkt in deine Termine eintragen! Du musst nur fragen, und die KI sucht für dich.

## 🚀 Wie funktioniert es?

### 1. Stelle eine Recherche-Anfrage
Gib im Stichwort-Feld oder per Sprache eine Anfrage ein wie:

```
"Finde die Telefonnummer von Anwalt Vetter in Rastatt"
```

### 2. Die KI recherchiert automatisch
- Die App öffnet deine ausgewählte KI (Grok/ChatGPT/Gemini)
- Die KI sucht nach der gewünschten Information
- Ein Termin-Formular wird vorbereitet

### 3. Information wird automatisch eingefügt
- Kopiere die Antwort der KI (Strg+C)
- Kehre zur App zurück
- Die Information wird **automatisch** ins richtige Feld eingefügt!

## 📋 Unterstützte Recherche-Typen

### 📞 Telefonnummern
```
"Finde die Telefonnummer von Anwalt Vetter in Rastatt"
"Suche die Nummer von Dr. Müller in Berlin"
"Ermittle die Telefonnummer der Stadtverwaltung Karlsruhe"
```
→ Wird automatisch ins **Telefon-Feld** eingefügt

### 📍 Adressen
```
"Finde die Adresse von Anwalt Vetter in Rastatt"
"Suche die Adresse der Praxis Dr. Schmidt"
```
→ Wird automatisch ins **Ort-Feld** eingefügt

### ✉️ E-Mail-Adressen
```
"Finde die E-Mail von Firma XY"
"Suche die E-Mail-Adresse von Dr. Müller"
```
→ Wird automatisch ins **Notizen-Feld** eingefügt

### 🌐 Websites
```
"Finde die Website von Anwalt Vetter"
"Suche die Webseite der Stadtverwaltung"
```
→ Wird automatisch ins **Notizen-Feld** eingefügt

### ⏰ Öffnungszeiten
```
"Finde die Öffnungszeiten von Aldi in Rastatt"
"Suche die Öffnungszeiten der Bibliothek"
```
→ Wird automatisch ins **Notizen-Feld** eingefügt

## 🎯 Beispiel-Workflow

### Szenario: Termin beim Anwalt eintragen

**Schritt 1:** Eingabe
```
"Finde die Telefonnummer von Anwalt Vetter in Rastatt und trage es in meinen Termin ein"
```

**Schritt 2:** Automatische Recherche
- App öffnet Grok/ChatGPT/Gemini
- Sucht nach: "Finde die Telefonnummer von Anwalt Vetter in Rastatt"
- Termin-Formular wird geöffnet mit:
  - Titel: "Anwalt Vetter"
  - Ort: "Rastatt"

**Schritt 3:** KI findet die Information
```
Grok antwortet: "Telefonnummer: 07222 123456"
```

**Schritt 4:** Kopieren & Zurückkehren
- Kopiere die Antwort (Strg+C)
- Kehre zur App zurück (Alt+Tab)

**Schritt 5:** Automatisches Einfügen
- Die Telefonnummer "07222 123456" wird automatisch ins Telefon-Feld eingefügt
- Das Feld blinkt kurz auf (Highlight-Effekt)
- ✅ Fertig! Du kannst den Termin jetzt speichern

## 🔧 Erkennungsmuster

Die KI erkennt Recherche-Anfragen durch:

### Trigger-Wörter:
- **"Finde"** - "Finde die Telefonnummer..."
- **"Suche"** - "Suche die Adresse..."
- **"Such"** - "Such mir die E-Mail..."
- **"Recherchier"** - "Recherchiere die Öffnungszeiten..."
- **"Ermittle"** - "Ermittle die Website..."
- **"Zeige mir"** - "Zeige mir die Nummer..."

### Informations-Typen:
- **Telefon**: telefon, nummer, tel, phone
- **Adresse**: adresse, address
- **E-Mail**: email, e-mail
- **Website**: website, webseite
- **Öffnungszeiten**: öffnungszeiten

### Kontext:
- **"von [Name]"** - Wer/Was wird gesucht
- **"in [Stadt]"** - Wo wird gesucht

## 💡 Tipps & Tricks

### ✅ Gute Anfragen:
```
✓ "Finde die Telefonnummer von Anwalt Vetter in Rastatt"
✓ "Suche die Adresse der Praxis Dr. Müller in Berlin"
✓ "Ermittle die E-Mail von Firma XY"
✓ "Finde die Öffnungszeiten von Aldi in Karlsruhe"
```

### ❌ Ungenaue Anfragen:
```
✗ "Telefonnummer" (zu unspezifisch)
✗ "Finde etwas" (kein Informationstyp)
✗ "Anwalt" (kein Suchbefehl)
```

### 🎯 Beste Ergebnisse:
1. **Sei spezifisch**: Nenne Name UND Ort
2. **Verwende Trigger-Wörter**: "Finde", "Suche", etc.
3. **Nenne den Informationstyp**: "Telefonnummer", "Adresse", etc.

## 🔄 Automatische Verarbeitung

Die App extrahiert automatisch:

### Telefonnummern:
- Deutsche Formate: `0123 456789`, `+49 123 456789`
- Mit Trennzeichen: `0123-456789`, `0123/456789`
- Mit Klammern: `(0123) 456789`

### E-Mail-Adressen:
- Standard-Format: `name@example.de`
- Alle gängigen Domains

### Adressen:
- PLZ + Stadt: `76437 Rastatt`
- Straße + Nummer: `Hauptstraße 123`

### URLs:
- Mit Protokoll: `https://example.com`
- Ohne Protokoll: `www.example.com`

## ⚙️ Einstellungen

### KI-Anbieter wählen:
In den Einstellungen kannst du wählen:
- **Grok** (Standard)
- **ChatGPT**
- **Gemini**

Die Recherche verwendet automatisch deine ausgewählte KI.

## 🆘 Fehlerbehebung

### Problem: Information wird nicht automatisch eingefügt
**Lösung:**
1. Stelle sicher, dass du die Antwort kopiert hast (Strg+C)
2. Kehre zur App zurück (Alt+Tab oder Klick)
3. Warte kurz (ca. 0,5 Sekunden)
4. Falls es nicht klappt: Füge manuell ein (Strg+V)

### Problem: Falsche Information wird eingefügt
**Lösung:**
1. Die KI extrahiert automatisch - manchmal unpräzise
2. Korrigiere die Information manuell im Feld
3. Formuliere die Anfrage spezifischer

### Problem: KI findet nichts
**Lösung:**
1. Überprüfe die Schreibweise
2. Füge mehr Kontext hinzu (Stadt, Straße, etc.)
3. Versuche eine andere Formulierung

## 🔐 Datenschutz

- Die Recherche erfolgt über die ausgewählte KI (Grok/ChatGPT/Gemini)
- Keine Daten werden dauerhaft gespeichert
- Die Zwischenablage wird nur temporär gelesen
- Nach 5 Minuten wird die Überwachung automatisch beendet

## 🎓 Erweiterte Nutzung

### Kombinationen:
Du kannst auch komplexere Anfragen stellen:

```
"Finde die Telefonnummer und Adresse von Anwalt Vetter in Rastatt"
```

Die App:
1. Öffnet die KI mit der Anfrage
2. Bereitet das Formular vor
3. Fügt beide Informationen automatisch ein (wenn kopiert)

### Mehrere Informationen:
```
"Suche die Telefonnummer, E-Mail und Website von Firma XY"
```

Die KI findet alle Informationen, und du kannst sie nacheinander kopieren und einfügen.

---

**Viel Erfolg mit der automatischen Recherche! 🎉**
