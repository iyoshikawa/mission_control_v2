# Mission Control Merge Checklist

Use this before merging any parallel coder branch into the integration branch.

## Quick Checks

- [ ] does the build still match the executive dashboard purpose?
- [ ] are the homepage sections still in the correct priority order?
- [ ] is active vs dormant status still visually obvious?
- [ ] did anyone accidentally create a second source of truth?
- [ ] do empty states still degrade cleanly?
- [ ] does the reference view still load from `views/sample-data.json`?
- [ ] were any canonical paths changed or broken?
- [ ] are any data-contract assumptions changed? if yes, were they documented?

## Canonical Source Check

These remain canonical unless explicitly changed by decision:
- `/home/ianik/.openclaw/workspace/corp/CORP-STRUCTURE-v1.md`
- `/home/ianik/.openclaw/workspace/mission-control/data/*.md`

This remains derived/reference unless explicitly redesigned:
- `/home/ianik/.openclaw/workspace/mission-control/views/sample-data.json`

## Review Questions

Ask before merge:
- does this make the dashboard more useful or just more elaborate?
- does this improve scan speed or hurt it?
- does this reduce maintenance burden or add to it?
- is this change obvious enough that another coder can safely build on it?

## Merge Standard

If the change is clever but fragile, do not merge it.

If the change is plain but reliable, prefer it.
