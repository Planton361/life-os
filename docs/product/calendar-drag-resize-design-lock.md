# Calendar Drag/Resize Design Lock

Stand: 2026-06-27
Status: Active
Scope: R1.7.4 Calendar Drag/Resize Design Lock + Interaction v1 Gate

## 1. Zweck

Dieses Dokument sperrt Semantik, Grid-Regeln und Sicherheitsgrenzen fuer spaetere Calendar Drag/Resize-Interaktionen. R1.7.4 liefert noch keine Pointer-Drag-Mechanik. Die erste Interaktion ist ein persistenter 15-Minuten-Fallback fuer terminierte Manual-Tasks ueber bestehende Task-Server-Actions.

## 2. Begriffe

- Planned: Ein Task hat ein Datum, aber keine Uhrzeit.
- Scheduled: Ein Task hat Datum und Startzeit; die Dauer bestimmt das Ende.
- Timed block: Sichtbare Calendar-Projektion eines scheduled Task.
- Resize: Dauer eines scheduled Task aendern, ohne den Start zwingend zu verschieben.
- Move: Startzeit eines scheduled Task aendern, Dauer beibehalten.
- Conflict: Ein Ziel-Zeitfenster ueberlappt einen anderen geladenen scheduled Task.
- Manual Override: Bewusste Nutzeraktion, die eine sichtbare Ueberlappung trotzdem speichert.

## 3. Planned vs Scheduled Semantik

Planned Tasks bleiben in Planner-Queues sichtbar und duerfen nicht als Calendar-Block erscheinen. Scheduled Tasks erscheinen als timed block im Calendar und bleiben in Today/Dashboard als geplante Arbeit sichtbar. Unschedule entfernt nur die Uhrzeit, nicht das Datum.

Calendar ist nicht Canonical Owner fuer Task-Inhalte. Calendar darf Task-Zeitfelder ueber vorhandene Task-Actions mutieren, aber keine Task-Domaene duplizieren.

## 4. Time Grid Regeln

Das bestehende Calendar Grid bleibt die visuelle Wahrheit fuer Week/Day-Projektion. Layoutwerte, Spaltenmodell, Tageshoehe, Lane-Berechnung und V5-Flächenkomposition bleiben unveraendert, solange kein expliziter Layout-Scope freigegeben ist.

Interaction v1 arbeitet nur mit den bestehenden Start-/Endzeiten der Calendar ViewModels. Es fuehrt kein neues Grid-Modell und keine neue Rendering-Library ein.

## 5. 15-Minuten-Inkremente

Move und Resize rasten in 15-Minuten-Schritten. Die minimale Dauer ist 15 Minuten. Eine Aktion darf den Block nicht ausserhalb des Kalendertags 00:00-24:00 speichern.

Spaetere Pointer-Interaktionen muessen denselben Snap verwenden. Frei schwebende Pixel-Positionen duerfen nicht direkt persistiert werden.

## 6. Drag-Regeln

Pointer-Drag ist nicht Teil von R1.7.4. Spaetere Drag-Implementierung darf erst starten, wenn Hit Testing, Keyboard-Paritaet, Mobile-Fallback, Loading-State und Konfliktverhalten im gleichen Scope validiert werden.

Drag darf keine neue externe DnD-Library einfuehren, ohne vorherigen Stop und Review. Drag darf keine Calendar-Recomposition oder Dashboard-Layout-Aenderung erzwingen.

## 7. Resize-Regeln

Resize bedeutet in der ersten freigegebenen Semantik: Startzeit bleibt gleich, Dauer aendert sich in 15-Minuten-Schritten. Negative Dauer und 0 Minuten sind verboten.

Spaetere Resize-Handles muessen tastaturbedienbar sein und duerfen keine Layout-Shifts verursachen.

## 8. Conflict Detection

R1.7.4 prueft Konflikte nur gegen geladene sichtbare scheduled Task Blocks im Calendar ViewModel. Das ist ein UI-Gate, keine DB-weite Sperre.

Ein Konflikt liegt vor, wenn `candidateStart < otherEnd` und `otherStart < candidateEnd`. Direkt angrenzende Blocks ohne Ueberlappung gelten nicht als Konflikt.

Wenn die geladene ViewModel-Liste nicht vollstaendig genug ist, darf die UI keine umfassende Sicherheit behaupten. DB-weite Konfliktsperren waeren ein eigener Data-Layer- und Produkt-Scope.

## 9. Manual Override

Normale Move-/Resize-/Reschedule-Aktionen duerfen sichtbare Konflikte nicht still speichern. Bei sichtbarem Konflikt muss der Standardbutton deaktiviert bleiben und ein separater Override sichtbar sein.

Der Override speichert ueber denselben bestehenden Server-Action-Pfad. Er ist bewusst, aber nicht DB-weit konfliktgesichert.

## 10. Keyboard Fallback

Interaction v1 ist der Keyboard-Fallback: Buttons fuer `15 min frueher`, `15 min spaeter`, `Dauer -15 min` und `Dauer +15 min`. Diese Buttons sind echte Form-Actions und bleiben ohne Pointer-Drag bedienbar.

Spaetere Pointer-Drag/Resize-Funktionen duerfen diesen Fallback nicht entfernen.

## 11. Mobile Fallback

Mobile nutzt denselben Inspector-Fallback. Kein Touch-Drag ist erforderlich, solange Buttons und Formfelder erreichbar bleiben.

Spaetere Touch-Gesten duerfen nur ergaenzen und muessen bei kleinen Viewports ohne horizontales Ueberlaufen funktionieren.

## 12. Error/Loading/Optimistic UI Regeln

R1.7.4 nutzt keine Fake-Persistenz. Sichtbare Aenderungen gelten erst nach Server-Action, Revalidation und neu gerendertem ViewModel.

Optimistische Pointer-Preview waere spaeter erlaubt, darf aber nicht als gespeicherter Zustand erscheinen. Fehler muessen den gespeicherten Zustand unveraendert lassen.

## 13. Nicht-Ziele

- Keine Pointer-Drag-Implementierung.
- Keine externe Drag-/Resize-Library.
- Keine Migration.
- Keine RLS-/Policy-Aenderung.
- Keine Remote-DB-Aktion.
- Keine wiederkehrenden Events, Routinen, Meal Blocks, Habit Blocks oder AI-Slot-Vorschlaege.
- Keine Calendar-Recomposition.
- Keine Dashboard-, Today-, Portfolio- oder Resource-Redesigns.

## 14. Akzeptanzkriterien fuer spaetere Implementierung

- Pointer-Drag und Resize verwenden 15-Minuten-Snap.
- Keyboard-Fallback bleibt funktionsgleich.
- Mobile-Fallback ist erreichbar.
- Sichtbare Konflikte werden vor normalem Speichern blockiert.
- Manual Override ist separat und eindeutig.
- Keine DB-weite Konfliktsicherheit wird behauptet, solange sie nicht serverseitig existiert.
- Persistenz laeuft ueber bestehende Feature-/Action-Schichten.
- Keine direkten Supabase-Queries in visuellen Komponenten.
- Keine Migration oder RLS-/Policy-Aenderung ohne explizite Freigabe.
- Playwright beweist Move, Resize, Conflict-Gate und Reload-Stabilitaet.
