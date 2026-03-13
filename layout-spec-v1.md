# Mission Control Layout Spec v1

Status: draft
Purpose: define the first dashboard layout so builders know what goes where and what should dominate the page.

## Layout Goal

The homepage should answer the most important executive questions in one view, with minimal clicking.

Primary questions:
- What matters right now?
- What needs Owner attention?
- What is at risk?
- Which seats are active vs dormant?
- Where is money drifting?

## Default Screen Model

Design for desktop first.

Recommended baseline:
- 12-column grid
- top summary band
- two-column main body
- drill-down sections below the fold or on linked pages

Mobile support should preserve priority order, not visual symmetry.

---

## Homepage Structure

### Row 1 — Command Band
A thin high-value strip at the top.

Contents:
- dashboard title: Mission Control
- current timestamp / last updated
- optional overall status indicator
- optional quick links to canonical docs

Purpose:
- orient the user immediately
- show whether the view is fresh enough to trust

Height:
- compact

---

### Row 2 — Executive Core
This is the most important section of the page.

#### Left: Priority Stack
**Width:** 7 columns
**Height:** prominent

Contents:
- top 3-5 priorities
- status chip
- owner
- next action
- blocker indicator

Why left and large:
- this is the primary decision-driving panel
- it answers what should happen now

#### Right: Decision Queue
**Width:** 5 columns
**Height:** prominent

Contents:
- pending decisions
- urgency
- recommendation
- why it matters

Why right and prominent:
- this is the direct Owner-action panel
- it should sit at eye level beside priorities

---

### Row 3 — Structural & Risk View
This row provides organizational and operational state.

#### Left: Org Activation Status
**Width:** 7 columns
**Height:** medium to large

Contents:
- org chart or role map
- active vs dormant status
- reporting lines
- optional quick count of active/dormant seats

Why it matters:
- this is the mental model panel
- it helps decide whether the current structure fits the work

#### Right: Ops Health
**Width:** 5 columns
**Height:** medium

Contents:
- systems/workflows on watch
- issue summaries
- recommended next steps
- last checked timestamps

Why paired here:
- org structure + system health together show execution capacity and fragility

---

### Row 4 — Money & Change Detection
This row should be scannable and exception-focused.

#### Left: Cost Watch
**Width:** 6 columns
**Height:** medium

Contents:
- cost items of concern
- drift from baseline
- utilization concerns
- action recommendation

#### Right: Recent Alerts / Material Changes
**Width:** 6 columns
**Height:** medium

Contents:
- newest significant changes
- timestamp
- why it matters
- recommended action

Why this row works:
- money and change detection are both management controls
- both should stay sparse and focused on exceptions

---

### Row 5 — Secondary Drill-Down Links or Preview Panels
This row can be lighter and may become navigation cards or compact previews.

Panels:
- Projects
- Communications Queue
- Intelligence Queue

Recommended behavior:
- compact preview cards
- show count + top item + status summary
- click through to deeper view later

---

## Priority Order Rules

If screen space is constrained, preserve this order:
1. Priority Stack
2. Decision Queue
3. Org Activation Status
4. Ops Health
5. Cost Watch
6. Recent Alerts
7. Projects
8. Communications Queue
9. Intelligence Queue

This is the collapse order for mobile as well.

---

## Card Design Rules

Each card should aim for:
- obvious title
- compact high-signal content
- visual status treatment
- readable spacing
- no dense paragraphs unless expanded

Use:
- badges for statuses
- short labels
- one-line summaries when possible
- muted metadata

Avoid:
- long prose walls
- dense tables by default
- decorative icons everywhere
- color dependence without labels

---

## Status Language

Recommended status vocabulary:
- ACTIVE
- DORMANT
- PROPOSED
- HEALTHY
- WATCH
- ISSUE
- BLOCKED
- NEEDS DECISION

Keep status language tight and reusable.

---

## Org Chart Visual Guidance

Preferred node treatment:
- ACTIVE = solid/high-contrast
- DORMANT = muted/dashed
- PROPOSED = outlined/gray

Preferred node content:
- role name
- status badge
- one-line mission summary

Optional details on hover/click:
- activation trigger
- outputs
- decision rights summary

Do not overload the node body.

---

## First-Build Recommendation

For the initial implementation, builders should produce:
1. homepage shell
2. card system
3. org structure view
4. placeholder rendering from the existing markdown-backed files

If time remains, then add:
- responsive layout refinement
- section detail pages
- light parsing helpers

---

## Acceptance Test

The layout is good enough if, in under 30 seconds, the Owner can identify:
- current top priorities
- pending decisions
- active vs dormant seats
- current operational risks
- current cost concerns

If that is not possible, the layout is wrong.
