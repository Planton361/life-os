# SECURITY.md

Stand: 2026-06-17  
Status: Active  
Zweck: operative Security-Regeln.  
Quelle der Wahrheit: Diese Datei.  
Gilt für: Auth, RLS, Validierung, Secrets, Agenten/MCP.  
Nicht gilt für: Rechtsberatung.

## Regeln

- Keine selbstgebaute Passwortlogik im MVP.
- Supabase Auth oder gleichwertige Auth nutzen.
- RLS für alle nutzerspezifischen Tabellen.
- Jede nutzerspezifische Tabelle braucht `user_id`.
- Zod serverseitig für Mutations.
- Keine Secrets in Git.
- `.env.local` nicht committen.
- Service Role Key nie im Client.
- Fehler dürfen keine Secrets preisgeben.
- MCP-Tools nur mit minimalen Rechten und explizitem Zweck.
- KI-generierte kritische Daten brauchen Review.

## Security DoD

- [ ] Daten gehören einem User.
- [ ] RLS ist definiert.
- [ ] Input wird validiert.
- [ ] Keine Secrets im Client.
- [ ] Mutations sind serverseitig geschützt.
- [ ] UI zeigt keine fremden Daten.


## Geplante Work-Graph-/Obsidian-Grenzen

R2-09 bleibt aktiv. Die Planung erlaubt keine Installation von Obsidian oder
Community-Plugins, Nutzung eines persönlichen Vaults, Exporte persönlicher Daten,
Cloud-Synchronisation, Notion-Anbindung, externe APIs oder Remote-DB-Aktionen.
Dafür braucht es den vorgesehenen expliziten Scope und die jeweilige Freigabe.
R2-11 verwendet ausschließlich synthetische Daten; Plugin-Fähigkeiten und
Vertrauensmodell werden vor Verwendung im Lab geprüft. Lokale Plugin-Ausführung
ist keine automatische Vertrauensfreigabe für persönliche Inhalte.

Keine Service-Role-Keys, DB-Passwörter oder andere Secrets in Plugins, Obsidian
oder Vault-Dateien. Kein direkter PostgreSQL-/Data-API-Writer aus Obsidian. Bei
Option A bleibt Life OS kanonisch; freie Notizen/Canvas-Kanten sind unvertrauens-
würdiger Input und werden nur nach expliziter Auswahl durch validierte Commands
zu Fachrelationen. Persönliche Inhalte und Layout dürfen nicht überschrieben
werden; Export-/Dateipfade müssen auf die ausdrücklich gewählte Projektionsregion
begrenzt werden. Kein Cloud-Sync als stiller Transportweg.

R2-14 muss vor Write-back einen explizit nutzerakzeptierten Security-/Conflict-
Vertrag liefern: lokales Pairing, Authentifizierung, minimale Command-Berechtigungen,
Widerruf, lokale Endpoint-/Origin-Grenze, sichere Credential-Aufbewahrung außerhalb
des Vaults, Community-Plugin-Trust, Feld-Ownership, expected revision, Idempotenz,
sichtbare Konflikte, Retry, Offline-Queue/Replay und Delete-Semantik. Kein pauschales
Last-Write-Wins. R2-15 nutzt eine lokale authentifizierte Bridge mit bestehenden
Auth-/Zod-/Ownership-/RPC-Grenzen; keine Lost Updates, Duplikate oder stillen
Konflikte. Vollautomatischer Zwei-Wege-Sync braucht einen weiteren expliziten Scope.

R2-10 muss Dependencies auch bei direkten API-/RPC- und gekoppelten Domain-Writes
server-/datenbankseitig erzwingen, einschließlich konkurrierender Mutationen.
UI-Sperren allein reichen nicht. Keine Migration oder Security-Implementierung
ist mit diesem Dokumentationsschritt erfolgt.
