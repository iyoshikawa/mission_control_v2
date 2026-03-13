# Mission Control Sync Notes

Purpose: prevent drift between canonical markdown sources and the reference dashboard payload.

## Current State

The reference dashboard in `mission-control/views/` is **data-driven**, but it currently reads from:

- `mission-control/views/sample-data.json`

That JSON is a **reference payload**, not the primary business source of truth.

## Source of Truth Hierarchy

### Canonical business documents
- `/home/ianik/.openclaw/workspace/corp/CORP-STRUCTURE-v1.md`
- `/home/ianik/.openclaw/workspace/mission-control/data/priorities.md`
- `/home/ianik/.openclaw/workspace/mission-control/data/decision-queue.md`
- `/home/ianik/.openclaw/workspace/mission-control/data/ops-health.md`
- `/home/ianik/.openclaw/workspace/mission-control/data/cost-watch.md`
- `/home/ianik/.openclaw/workspace/mission-control/data/alerts.md`
- `/home/ianik/.openclaw/workspace/mission-control/data/projects.md`
- `/home/ianik/.openclaw/workspace/mission-control/data/comms-queue.md`
- `/home/ianik/.openclaw/workspace/mission-control/data/intelligence-queue.md`

### Derived reference artifact
- `/home/ianik/.openclaw/workspace/mission-control/views/sample-data.json`

## Manual Sync Rule

When canonical markdown changes in a way that should appear in the reference dashboard:
1. update the relevant markdown file first
2. update `views/sample-data.json` second
3. verify the reference page still renders correctly

Do **not** update `sample-data.json` first and assume markdown will catch up later.

## Files Most Likely To Drift

Highest drift risk:
- `corp/CORP-STRUCTURE-v1.md`
- `mission-control/data/priorities.md`
- `mission-control/data/decision-queue.md`
- `mission-control/data/ops-health.md`
- `mission-control/data/cost-watch.md`
- `mission-control/views/sample-data.json`

Why: these drive the most visible homepage sections.

## Safe Update Pattern

### If business truth changes
Example: a dormant role becomes active, a new priority appears, or an ops risk changes.

Update in this order:
1. canonical markdown source
2. `views/sample-data.json`
3. optional UI tweaks if the rendering needs adjustment

### If only the UI changes
Example: styling, card layout, badge treatment, spacing.

Update:
- `views/index.html`
- `views/styles.css`
- `views/app.js`

Do not modify canonical business docs for presentation-only changes.

## When To Replace Manual Sync

Manual sync is acceptable for now because it is cheap and easy.

Replace it with a transform pipeline only when at least one of these is true:
- updates become frequent enough to create annoying drift
- outside coders keep editing the wrong layer
- the dashboard becomes operational enough that stale reference data is misleading
- the markdown structure becomes stable enough to parse safely

## Recommended Future Improvement

If this project matures, add a small transformation step:
- input: canonical markdown files
- output: generated dashboard JSON
- destination: `mission-control/views/sample-data.json` or a replacement generated file

But do not build that pipeline until the data model is stable enough to justify it.

## Bottom Line

For now:
- markdown is truth
- sample-data.json is the rendered reference payload
- keep them aligned manually
- prefer cheap discipline over premature automation
