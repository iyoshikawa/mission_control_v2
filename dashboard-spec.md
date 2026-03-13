# Mission Control Dashboard Spec

Status: draft

## Goal

Provide a quick executive view of the information that matters at any given moment.

This should function as a mental check before starting something big, and as a live status surface for active operations.

## Design Rules

- optimize for rapid scanning
- prefer status clarity over visual cleverness
- separate source-of-truth documents from display logic
- support active vs dormant organizational visibility
- keep it easy for outside coders to modify

## Initial Sections

### 1. Org / Corp Structure
Purpose: show which seats exist, which are active, and which are dormant.

Primary source:
- `../corp/CORP-STRUCTURE-v1.md`

Display needs:
- active vs dormant status visibility
- reporting lines
- role mission summary
- activation trigger summary

### 2. Priority Stack
Purpose: top initiatives and what currently matters most.

Status: not yet defined

### 3. Decisions Queue
Purpose: items waiting on Owner decision.

Status: not yet defined

### 4. Ops Health
Purpose: uptime, brittleness, blocked systems, maintenance issues.

Status: not yet defined

### 5. Cost / Resource View
Purpose: spend, model usage, subscriptions, waste flags.

Status: not yet defined

## Implementation Guidance

For now, treat this as a spec-first folder.

Outside coders can use:
- markdown-driven prototypes
- static HTML
- lightweight app frameworks
- diagramming tools

Avoid committing the project to a heavy stack until the information model stabilizes.
