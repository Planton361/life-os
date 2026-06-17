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
