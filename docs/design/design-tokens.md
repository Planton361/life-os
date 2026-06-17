# Design Tokens

Stand: 2026-06-17  
Status: Active  
Zweck: Tokenbasis für Life OS V5.  
Quelle der Wahrheit: `DESIGN.md`.  
Gilt für: CSS Variables, Tailwind Theme, Komponenten.  
Nicht gilt für: alte Light-Warm-Tokens als aktive Richtung.

## Color Tokens

```css
:root {
  --bg-app: #070b12;
  --bg-shell: #0b111c;
  --surface-1: #0f1724;
  --surface-2: #121c2b;
  --surface-3: #172235;
  --surface-glass: rgba(18, 28, 43, 0.72);

  --border-subtle: rgba(148, 163, 184, 0.12);
  --border-default: rgba(148, 163, 184, 0.20);
  --border-strong: rgba(148, 163, 184, 0.34);

  --text-primary: #eef4ff;
  --text-secondary: #b8c3d6;
  --text-muted: #7f8da3;
  --text-faint: #526178;

  --accent-blue: #5b7cfa;
  --accent-green: #42b883;
  --accent-orange: #d9924f;
  --accent-red: #dd6b5f;
  --accent-purple: #9b7cf6;
  --accent-cyan: #5fc8d7;
  --accent-yellow: #d8b45a;
}
```

## Semantic Mapping

| Domain | Accent | Use |
|---|---|---|
| Education | Blue | Masterarbeit, Lernen, Literatur |
| Work | Green | Werkstudent, Arbeit, Follow-ups |
| Coding & Agents | Blue / Orange | Code, Agent Sessions, GitHub |
| Health | Red / Orange | Training, Sleep, Recovery, Mood |
| Nutrition | Orange / Yellow | Meals, Macros, Groceries |
| Personal | Purple | Privates, Journal, Freizeit |
| Review/System | Grey / Cyan | Review, Settings, System |

## Spacing

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 24px;
--space-6: 32px;
```

## Radius

```css
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 20px;
--radius-2xl: 28px;
```

## Shadows / Layering

Dark UI nutzt vorrangig Border, Tonwert und leichte Hintergrunddifferenz. Starke Schatten nur bei Overlays/Command Palette.
