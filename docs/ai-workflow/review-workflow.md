# Review Workflow

Stand: 2026-07-07
Status: Active  
Zweck: einheitliche Reviews für UI, Code, Docs und Agentenarbeit.  
Quelle der Wahrheit: `AGENTS.md` und `13_REVIEW_CHECKLIST.md`.  
Gilt für: Screenshot Reviews, Codex Diffs, Dokumentationsmigrationen.  
Nicht gilt für: formale Release-Freigabe.

## Ablauf

1. Aufgabe und Scope prüfen.
2. Relevante Quellen nennen.
3. Gegen Product Fit prüfen.
4. Gegen V5-Design prüfen.
5. Gegen Accessibility prüfen.
6. Gegen Security/Privacy prüfen, falls Daten betroffen.
7. Gegen Code-/Dokumentationsqualität prüfen.
8. Gegen Vertical-Slice Completion prüfen, falls Featurearbeit betroffen ist.
9. Browser-Proof oder begruendete Ausnahme prüfen, falls UI oder User Flow betroffen ist.
10. Konkreten nächsten Prompt formulieren.

## W1.0D Review Prompts

Fuer wiederholbare Reviews:

- `.github/prompts/completion-review.prompt.md` fuer Abschlussreviews nach Codex-Blocks.
- `.github/prompts/browser-proof.prompt.md` fuer konkrete Browser-/E2E-Proofs.
- `.github/prompts/review-ui-against-design.prompt.md` fuer reine V5-UI-Reviews.
- `.github/prompts/accessibility-review.prompt.md` fuer reine Accessibility-Reviews.

Completion Reviews nutzen:

```text
life-os-completion-gate
life-os-design-taste, falls UI betroffen ist
life-os-browser-proof, falls UI oder Flow betroffen ist
```

## Vertical-Slice Review Gate

Feature-Reviews muessen klaeren:

- Product Intent und Nicht-Ziele sind klar.
- UI ist bedienbar oder klar als Prepared/Future blockiert.
- Buttons persistieren, navigieren oder sind eindeutig disabled/deferred.
- Persistenzbehauptungen haben Server Action, Repository/DB-Pfad und Reload-Proof.
- Mutations nutzen Zod, Auth und same-user Ownership.
- Manual, Demo und Empty bleiben getrennt.
- Browser-Proof ist vorhanden oder nachvollziehbar nicht noetig.
- QA-Doku oder E2E-/Browser-Proof ist aktualisiert.

## Backend Action Review Gate

Neue oder geaenderte Server Actions failen, wenn sie:

- clientseitige `userId` als Trust Boundary akzeptieren.
- ohne serverseitige Auth mutieren.
- ohne Zod `safeParse` mutieren.
- relationale FKs oder polymorphe Targets nicht gegen same-user Ownership pruefen.
- Service Role nutzen.
- relevante Pfade nicht revalidieren.
- keine sichtbaren Success-/Error-/Blocked-Zustaende ermoeglichen.

## Browser-Proof Review Gate

Ein Browser-Proof ist nur belastbar, wenn der konkrete User Flow ausgefuehrt,
Button/Form bedient, Persistenz oder Prepared State bestaetigt, nach einem
Reload erneut geprueft und im passenden Kontext asserted wurde.

Globale Textsuche allein reicht nicht.

## Codex-Bericht

```text
Erstellt:
Geändert:
Nicht geändert:
Validierung:
Offene Punkte:
Risiken:
```

## Fail-Kriterien

- Today/Daily Control verliert Dominanz.
- Inbox oder Review verschwindet.
- alte Dashboard-Variante wird wieder aktiv.
- neue Library ohne Begründung.
- Security/RLS ignoriert.
- Farbe ist alleinige Statusinformation.
- Mobile bricht.
- Button behauptet Persistenz ohne Write oder Prepared State.
- Feature wird ohne Reload- oder Browser-Proof als complete gemeldet.
- Server Action umgeht Zod/Auth/Ownership.
