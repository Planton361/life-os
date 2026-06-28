# AI Inbox Suggestions v1

Stand: 2026-06-28
Status: Active
Zweck: Model Lock fuer R1.8.0 AI Inbox Suggestions v1.
Quelle der Wahrheit: `PRODUCT.md`, `DATA_MODEL.md`, `SECURITY.md`, `docs/product/inbox-routing-model.md`, `docs/product/task-inbox-calendar-workflow.md`.
Gilt fuer: Inbox AI Suggestions, Mock Provider, Review UI, Draft-Uebernahme.
Nicht gilt fuer: autonome Automation, externe LLM-Provider, Migrationen, RLS/Policies, Skill Map oder Graph.

## 1. Zweck

AI Inbox Suggestions v1 hilft, rohe Inbox Captures schneller zu klaeren. Die Schicht schlaegt eine Outcome Route, Draft-Felder und Planning Signals vor. Sie ersetzt keine User-Entscheidung und keine bestehende Server Action.

## 2. Nicht-Ziele

- Keine automatische Task-, Project-, Goal- oder Resource-Erstellung.
- Kein automatisches Archivieren oder Resolven von Inbox Items.
- Kein externer LLM Call.
- Kein API-Key im Client.
- Keine Migration, neue Tabelle oder neue RLS-/Policy-Regel.
- Keine AI-Inference als Quelle der Wahrheit.

## 3. Suggestion vs Action

Eine Suggestion ist ein transienter Vorschlag. Eine Action ist ein bestaetigter Write ueber bestehende Server Actions.

```text
Inbox Item lesen
-> Suggestion erzeugen
-> User prueft
-> User uebernimmt in Draft
-> User editiert
-> bestehende Confirm Action persistiert
```

AI Output ist niemals Quelle der Wahrheit. AI Output wird erst nach User-Bestaetigung persistiert.

## 4. Reviewpflicht

Jeder AI-Vorschlag gilt als `review_needed`. Die UI muss sichtbar machen, dass Uebernehmen nur Draft-Felder fuellt. Kritische Daten wie Prioritaet, Energie, Dauer, Tagesplanung, Target und Archive bleiben pruefpflichtig.

## 5. Unterstuetzte Vorschlaege

- Outcome Route: standalone task, add to existing, create new, resource, solved/archive.
- Task Draft: Titel, Beschreibung, naechste Aktion, Priority, Energy, Dauer, Today Candidate.
- Create New Draft: Project oder Goal, Titel, Summary.
- Resource Draft: Titel, Summary, Typ, Source/URL-Hinweis.
- Target Suggestion: nur anzeigen, wenn ein Label sicher vorhanden ist.
- Warnings: Hinweise auf Grenzen, Unsicherheit oder Reviewbedarf.

## 6. Daten, die an AI gehen duerfen

In R1.8.0 geht nichts an externe AI. Der lokale Mock Provider darf serverseitig lesen:

- Inbox Item Titel.
- Inbox Item Body/Notiz.
- Inbox Item Typ.
- vorhandene, label-resolved Target-Metadaten, falls spaeter fuer Target Suggestions noetig.

## 7. Daten, die nicht an AI gehen duerfen

- Secrets, Tokens, API Keys.
- Service Role Keys.
- Fremde User-Daten.
- Rohdaten aus Health, Journal, Work oder anderen sensiblen Bereichen ohne spaeteren expliziten AI-Access-Policy-Block.
- Auth-Sessiondaten.
- Nicht benoetigte private Kontextdaten.

## 8. Provider-/Mock-Grenze

R1.8.0 nutzt ausschliesslich einen deterministischen lokalen Mock Provider. Ein echter Provider braucht einen separaten Block mit:

- serverseitiger Provider-Abstraktion,
- Env-Gate,
- Datenschutzcheck,
- Fehler- und Timeout-Handling,
- keine Test-Calls ohne Mock,
- keine sensiblen Logs.

## 9. UI Flow

Die AI Suggestion erscheint im bestehenden Inbox Assistant. Der User kann:

- `AI Vorschlag erzeugen`,
- Route, Confidence, Reason, Draft-Felder und Warnings pruefen,
- `Vorschlag uebernehmen`,
- `Verwerfen`,
- danach den sichtbaren Draft editieren,
- danach erst die bestehende Action wie `Task erstellen`, `Resource erstellen` oder `Als erledigt archivieren` ausfuehren.

## 10. Security / Privacy / Logging

- Server Action authentifiziert im Manual-Profil serverseitig.
- Inbox Item Ownership wird ueber user-scoped Repository-Reads geprueft.
- Der Client sendet keine `userId`.
- Es gibt keinen Client API Key.
- Es gibt keine externe AI API.
- Suggestion-Inhalte werden nicht geloggt.
- Fehlertexte bleiben generisch und enthalten keine Secrets.

## 11. Failure States

- Kein aktiver Inbox-Eintrag: Suggestion disabled.
- Manual ohne Auth: Auth-Hinweis, kein Vorschlag.
- Inbox Item nicht user-owned oder archiviert: Blocked/Error.
- Mock kann nur niedrige Confidence liefern: Vorschlag bleibt pruefpflichtig.
- Add-to-existing ohne sicheres Target: nur vorbereiteter Hinweis, keine automatische Verlinkung.

## 12. Akzeptanzkriterien

- Suggestion Contract existiert.
- Deterministischer Mock Provider existiert.
- Server Action liest user-owned Inbox Item und persistiert nichts.
- UI zeigt Vorschlag, Reason, Confidence und Warnings.
- Uebernehmen fuellt nur Draft-Felder.
- Finaler Write passiert nur ueber bestehende Confirm Actions.
- Reload ohne Uebernehmen oder Persistieren erzeugt kein Zielobjekt.
- Keine externe AI API, keine Secrets, keine Migration.
