# Test-Anleitung für Sprachbefehle

## So testest du die neuen Funktionen:

### 1. App öffnen
Öffne die `index.html` Datei in deinem Browser.

### 2. Anmelden
Falls du noch nicht angemeldet bist, melde dich mit deinen Zugangsdaten an.

### 3. Befehle testen

#### Im Stichwort-Feld eingeben:

**Test 1: Kalender öffnen**
```
Kalender öffnen
```
→ Der Kalender sollte sich öffnen

**Test 2: Ausgabe eintragen**
```
Füge 50 Euro Aldi in die Ausgaben ein
```
→ Eine neue Ausgabe von 50€ bei Aldi sollte erstellt werden
→ Die Kostenkontrolle sollte sich öffnen und die Ausgabe anzeigen

**Test 3: Wecker stellen**
```
Wecker auf 7 Uhr eintragen
```
→ Ein neuer Wecker für 7:00 Uhr sollte erstellt werden
→ Die Alarm-Sektion sollte den neuen Wecker anzeigen

**Test 4: To-Do hinzufügen**
```
Füge Milch kaufen in die To-Do Liste ein
```
→ "Milch kaufen" sollte zur To-Do Liste hinzugefügt werden

**Test 5: Nachtmodus**
```
Nachtmodus einschalten
```
→ Der Nachtmodus sollte aktiviert werden

**Test 6: PayPal öffnen**
```
Öffne PayPal
```
→ PayPal sollte in einem neuen Tab geöffnet werden

### 4. Spracheingabe testen

Klicke auf das Mikrofon-Symbol (🎤) und sage:
- "Kalender öffnen"
- "Füge 50 Euro Aldi in die Ausgaben ein"
- "Wecker auf 7 Uhr eintragen"

Die Befehle sollten genauso funktionieren wie bei der Text-Eingabe.

### 5. Erwartetes Verhalten

✅ **Erfolg**: 
- Befehle werden erkannt und ausgeführt
- Entsprechende Toast-Benachrichtigungen erscheinen
- Die richtigen Bereiche öffnen sich
- Daten werden korrekt gespeichert

❌ **Fehler**:
- Wenn ein Befehl nicht erkannt wird, wird er als normale Aufgabe behandelt
- Überprüfe die Browser-Konsole (F12) auf Fehlermeldungen

### 6. Weitere Tests

Probiere verschiedene Variationen:
- "Zeige Kalender"
- "Trage 25,50€ Rewe in die Ausgaben ein"
- "Stelle Wecker auf 14:30"
- "Öffne Ausgaben"
- "WhatsApp öffnen"

## Fehlerbehebung

Falls etwas nicht funktioniert:

1. **Browser-Konsole öffnen** (F12)
2. **Fehler prüfen** - Gibt es JavaScript-Fehler?
3. **Cache leeren** - Strg + F5 zum Neuladen
4. **Service Worker aktualisieren** - In den DevTools unter "Application" → "Service Workers" → "Update"

## Bekannte Einschränkungen

- Befehle müssen im **Stichwort-Feld** eingegeben werden
- Die Erkennung ist **case-insensitive** (Groß-/Kleinschreibung egal)
- Bei Ausgaben werden nur **gängige Geschäfte** automatisch erkannt
- Komplexe Befehle könnten als normale Aufgaben interpretiert werden

## Support

Falls du Probleme hast, überprüfe:
- Ist die `app.js` korrekt geladen?
- Sind alle Funktionen definiert?
- Gibt es Konflikte mit anderen Features?
