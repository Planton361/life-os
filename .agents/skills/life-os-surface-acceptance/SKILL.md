---
name: life-os-surface-acceptance
description: Prove a Life OS core surface is genuinely usable before closure, including real controls, reload, layout, console and user acceptance.
---

# Life OS Surface Acceptance

Use for implementation, correction or closure of Dashboard, Inbox, Today,
Calendar, Portfolio, Health, Fitness or Nutrition. It does not authorize
product changes outside the selected ROADMAP block.

## Required Contract

Read `PRODUCT.md`, `DESIGN.md`, the selected `ROADMAP.md` block and relevant
Registry entries before judging the surface. Those active contracts override
historical layout-lock and content-state references.

## Acceptance Procedure

1. Inventory every visible control in the affected Manual surface, including
   buttons, links, tabs, menus, fields, cards with click affordance and CTAs.
2. Directly exercise every control. Verify the named navigation or mutation;
   a visible control cannot be accepted from code inspection alone.
3. For each write, prove success/error feedback, the affected projection and a
   reload-stable result. Check that no action silently routes to an unrelated
   surface.
4. Inspect card, overlay and toast bounds for overlap, clipping and
   unjustified whitespace. Review the actual primary 4K CSS viewport and
   `1920×1080`; also apply the Mobile guards from `DESIGN.md`.
5. Inspect browser console output and hydration warnings/errors during the
   tested flow.
6. Capture a complete screenshot of the surface at the primary viewport and
   at `1920×1080`.
7. Run `life-os-design-taste` against V5 hierarchy and anti-slop rules.

## Closure Rule

Report the control inventory and failed/deferred controls in the Capability
Registry. A promised core control must work, navigate to real depth, or be
removed. `Prepared` is not an acceptable closure state without an explicit
user deferral. `IMPLEMENTATION PASS` is not Surface Acceptance; final
core-surface or active-product closure requires explicit `USER ACCEPTED`.
