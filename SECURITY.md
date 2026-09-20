# SECURITY.md

Stand: 2026-06-17  
Status: Active  
Zweck: operative Security-Regeln.  
Quelle der Wahrheit: Diese Datei.  
Gilt für: Auth, RLS, Validierung, Secrets, Agenten/MCP.  
Nicht gilt für: Rechtsberatung.

## Durable work-graph / knowledge ownership security decision

Product Target v0.4 is accepted: Life OS / PostgreSQL owns operational truth
and Resource/reference identity; Obsidian owns long-form Knowledge Content and
Notes. Obsidian receives no direct database credentials or privileged access.
Free Vault/Canvas content is untrusted input and cannot become an operational
relation without a separately accepted, validated Life OS command contract.

Any write-back requires a separately accepted security/conflict contract covering pairing, authentication, revocation, permissions, origin/endpoint scope, credential storage, plugin trust, field ownership, expected revision, idempotency, conflicts, retry, offline replay and delete semantics.

Current work status is not a security fact; read it from GitHub Project #3/Issues and `ROADMAP.md`.

## Accepted target-model security boundaries

- Obsidian content ownership is not database or Vault write permission. A
  vault-relative path is a locator only; `life_os_id` is stable identity. Absolute
  personal Vault paths are not portable domain identity, and missing/colliding
  IDs never authorize filename/path matching.
- Existing `type=note` Resources remain intact. No automatic association,
  migration, watcher, sync or write-back is authorized by this target.
- New Skill Graph relations must be same-user and explicit. `prerequisite` is
  directed and acyclic; `related` is symmetric. Shared Tasks, Projects or
  Resources never create implicit edges.
- AI is server-side only and receives an allowlisted, user-scoped structured
  projection for the read-only Morning Briefing. Journal content, full
  Obsidian content and system-restricted data are excluded by default.
  Health/Fitness/Nutrition and work-restricted data require explicit privacy
  opt-in. No direct DB credentials, model writes, reprioritization, plan change
  or autonomous action is allowed.
- Provider selection is a later gate: credentials stay server-side, provider
  privacy/retention must be accepted, and Life OS does not durably store prompts
  or responses by default.

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

R2-11 ist historische synthetische Entscheidungsevidenz. Die damalige Evaluation erlaubte nur eine vorhandene oder rein temporäre isolierte Testinstanz und eine kleine geprüfte Plugin-Auswahl ausschließlich im Test-Vault.
Systeminstallation, Paketmanager-Änderungen oder Eingriffe in persönliche Obsidian-
Konfiguration benötigen USER_INSTALLATION_CONFIRMATION_REQUIRED.
Die Roadmap allein erlaubt weiterhin keine Installation von Obsidian oder
Community-Plugins, Nutzung eines persönlichen Vaults, Exporte persönlicher Daten,
Cloud-Synchronisation, Notion-Anbindung, externe APIs oder Remote-DB-Aktionen.
Dafür braucht es den vorgesehenen expliziten Scope und die jeweilige Freigabe.
Die historische R2-11-Evaluation verwendete ausschließlich synthetische Daten; Plugin-Fähigkeiten und Vertrauensmodell wurden nur für diesen isolierten Lab-Scope geprüft. Lokale Plugin-Ausführung
ist keine automatische Vertrauensfreigabe für persönliche Inhalte.

Keine Service-Role-Keys, DB-Passwörter oder andere Secrets in Plugins, Obsidian
oder Vault-Dateien. Kein direkter PostgreSQL-/Data-API-Writer aus Obsidian. Life
OS bleibt für operative Wahrheit kanonisch; freie Notizen/Canvas-Kanten sind unvertrauens-
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

R2-10 erzwingt Dependencies mit Task- und Source-Completion-Triggern auch bei
direkten API-/RPC- und gekoppelten Domain-Writes. Kein Rollen-Bypass für
Security-Definer-RPCs; Fehler rollen gekoppelte Writes zurück. Kanten haben
Owner-RLS und zusammengesetzte Owner-/Project-FKs. Rekursive Zyklusprüfung und
echte Project-Zeilenversionswrites schützen auch konkurrierende Mutationen.
Die [R2-10-Entscheidung](docs/architecture/task-dependencies-r2-10.md) definiert
Guards, Berechtigungen und den isolierten Datenbank-Proof.

## R2-12 authenticated export

The user explicitly authorizes Product Code for exporting exactly one selected
owned Project. Automated proof uses disposable synthetic records only. The same-origin
POST requires the Manual profile, existing server-verified getUser authentication
and Zod UUID validation; every repository query explicitly filters user_id and
retains RLS. No client-supplied owner, privileged role, remote provider fetch or
Obsidian DB access. Foreign/missing Projects fail without revealing their contents.
Response headers are private/no-store and nosniff. Errors do not expose DB details.

Only work-context fields enter the projection: no User/Auth/Profile, session,
password, DB credential or provider configuration. Resource URLs are data; URL
userinfo, query and fragment are omitted to avoid exporting signed credentials.
Common pasted credential patterns fail the export visibly; this is defense in
depth, not a universal secret-classification guarantee for arbitrary free prose.
Canonical prose is escaped to avoid injected Wikilinks, embeds, HTML or boundary
markers. Generated readable paths sanitize Windows/Linux-invalid characters, reserved
names, controls and link syntax, bound UTF-8 filename size, and resolve case/NFC
collisions deterministically. ZIP validates paths independently; no path is identity.

No personal Vault is read or written; exports/** remains protected and unused.
No plugin, installation, file watcher, local bridge, token, import, write-back,
conflict resolution or destructive sync exists. Open each downloaded snapshot in
its own extracted folder; never overwrite personal notes with an extracted package.
