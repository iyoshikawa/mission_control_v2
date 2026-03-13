# Mission Control Task Board

Purpose: give coders an obvious starting board without requiring a separate project tool.

Status legend:
- TODO
- IN_PROGRESS
- BLOCKED
- DONE

---

## TODO

### UI Shell / Layout
- [ ] align homepage structure tightly to `layout-spec-v1.md`
- [ ] verify responsive collapse order matches executive priority order
- [ ] ensure section hierarchy is obvious above the fold

### Org Visualization
- [ ] improve org activation rendering for active vs dormant seats
- [ ] ensure reporting lines are easy to understand quickly
- [ ] keep node content compact and high-signal

### Data Wiring
- [ ] keep `views/app.js` aligned with `data-contract-v1.md`
- [ ] validate rendering against `views/sample-data.json`
- [ ] ensure empty states and missing fields fail gracefully
- [ ] document any added transform/helper logic

### Polish / Usability
- [x] reduce visual clutter without removing decision-useful information
- [x] improve badge readability and state clarity
- [x] test scan speed with realistic content density

---

## IN_PROGRESS

- [ ] Reference dashboard exists and is data-driven; external builder implementation pending

---

## BLOCKED

- [ ] Automatic markdown-to-JSON sync pipeline not started by design; only add if manual sync becomes painful

---

## DONE

- [x] corp structure source of truth created
- [x] mission-control project structure created
- [x] dashboard spec created
- [x] information model created
- [x] builder handoff created
- [x] layout spec created
- [x] data contract created
- [x] data-driven reference mock created
- [x] sync notes created
- [x] coder directive created
- [x] sample data updated to current state
