# Mission Control Builder Handoff v1

Audience: outside coders building the first Mission Control dashboard
Status: active brief

## Objective

Build a lean executive dashboard for fast scanning.

The dashboard is meant to answer, at a glance:
- what matters right now
- what needs Owner attention
- what is blocked or brittle
- what is active vs dormant
- where money may be leaking or drifting

This is not a generic productivity app. It is an operating surface.

## Primary Rule

Do not reinvent business truth inside the UI.

The dashboard should render from canonical markdown-backed sources where possible, and keep presentation logic separate from source-of-truth documents.

## Source of Truth

### Canonical business docs
- `/home/ianik/.openclaw/workspace/corp/CORP-STRUCTURE-v1.md`

### Mission Control specs
- `/home/ianik/.openclaw/workspace/mission-control/dashboard-spec.md`
- `/home/ianik/.openclaw/workspace/mission-control/information-model-v1.md`

### Mission Control data files
- `/home/ianik/.openclaw/workspace/mission-control/data/priorities.md`
- `/home/ianik/.openclaw/workspace/mission-control/data/decision-queue.md`
- `/home/ianik/.openclaw/workspace/mission-control/data/ops-health.md`
- `/home/ianik/.openclaw/workspace/mission-control/data/cost-watch.md`
- `/home/ianik/.openclaw/workspace/mission-control/data/alerts.md`
- `/home/ianik/.openclaw/workspace/mission-control/data/projects.md`
- `/home/ianik/.openclaw/workspace/mission-control/data/comms-queue.md`
- `/home/ianik/.openclaw/workspace/mission-control/data/intelligence-queue.md`

## What To Build First

Build **v1 as a thin dashboard shell**.

That means:
- one homepage
- simple navigation or section anchors
- clean card/panel layout
- very light styling
- obvious status labeling
- strong readability

Good first implementations:
- static HTML/CSS/JS
- lightweight React/Vue/Svelte app
- markdown-driven prototype

Avoid heavy infrastructure unless requested.

## v1 Homepage Sections

In order of importance:

1. **Priority Stack**
2. **Decision Queue**
3. **Org Activation Status**
4. **Ops Health**
5. **Cost Watch**
6. **Recent Alerts**

This order matters. The page should feel like an executive control board, not a general-purpose portal.

## Design Requirements

### Visual behavior
- optimize for scanning in under 30 seconds
- show state clearly
- minimize decorative clutter
- use whitespace and hierarchy, not visual noise
- distinguish ACTIVE vs DORMANT cleanly
- make urgent items obvious without turning the whole page into an alarm panel

### Org chart behavior
- roles should show status badge: ACTIVE / DORMANT / PROPOSED
- reporting lines should be visible
- activation triggers can live in details or side panel, not clutter the main node
- the chart is a quick mental model, not the canonical data store

### Panel behavior
Each panel should show:
- title
- short purpose or implied purpose
- compact key fields
- status emphasis where relevant
- a path or affordance for drill-down later

## What To Ignore In v1

Do **not** spend time on:
- auth systems
- multi-user permissions
- databases
- real-time sync
- complex animations
- notification engines
- elaborate charting libraries unless actually needed
- trying to automate every source up front

## Good Enough v1

A good v1 should:
- render the corp structure clearly
- show placeholder-friendly cards for the main sections
- make active vs dormant status obvious
- be easy to restyle
- be easy to swap data inputs later
- not require deep backend work

## Data Strategy

Use a content-first design.

Preferred initial pattern:
- markdown source files remain authoritative
- UI layer reads from transformed content or manually maintained mock data
- any parsing assumptions should be documented

If you introduce a parser or transformation layer, document:
- input file(s)
- output structure
- failure behavior
- what happens when source formatting changes

## Tone of the Interface

The interface should feel:
- executive
- practical
- sparse
- serious
- easy to trust

It should **not** feel:
- gamified
- startup-flashy
- over-branded
- noisy
- cluttered

## Delivery Recommendation

Deliver in two passes:

### Pass 1
- layout
- section hierarchy
- org chart / org status presentation
- sample populated panels

### Pass 2
- data wiring refinement
- improved responsive behavior
- better drill-down paths
- light polish

## Decision Standard

If forced to choose, prefer:
- boring over clever
- editable over magical
- stable over dynamic
- obvious over abstract

That is the design philosophy for this project.
