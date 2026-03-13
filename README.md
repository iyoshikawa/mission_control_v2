# Mission Control

Mission Control is the workspace area for dashboard-oriented operating visibility.

It is intentionally separate from identity, memory, and core operating files.

## Purpose

This folder exists to support a fast-changing control surface that can evolve without disturbing the canonical business documents.

## Operating Rule

- **Canonical business docs live outside the dashboard when appropriate**
- **Mission Control consumes them**
- **Do not silently fork source-of-truth content into UI copies**

## Current Data Sources

### Corp Structure
- **Canonical source:** `/home/ianik/.openclaw/workspace/corp/CORP-STRUCTURE-v1.md`
- **Mission Control reference:** `data/corp-structure.md`

## Layout

- `START-HERE.md` — quickest onboarding path for coders
- `CODER-DIRECTIVE.md` — where to work, what to build, and core rules
- `WORKTREE-PLAN.md` — recommended branch/worktree split for parallel coders
- `TASK-BOARD.md` — lightweight in-repo task board
- `MERGE-CHECKLIST.md` — pre-merge guardrails for parallel work
- `dashboard-spec.md` — what the dashboard should show
- `information-model-v1.md` — first-pass definition of panels, data ownership, and maturity model
- `data-contract-v1.md` — presentation-level schema expectations for builders
- `SYNC-NOTES.md` — keep canonical markdown and reference JSON aligned
- `data/` — data-source references, schemas, and import notes
- `views/` — mockups, layouts, components, or future UI files
- `assets/` — static images, diagrams, icons
- `archive/` — retired specs and stale concepts

## Build Principle

Start thin.

The goal is not to build a fancy app first. The goal is to create a stable place where dashboard specs and data mappings can change quickly as the operating model becomes clearer.
