# Mission Control Coder Directive

Audience: external coders working on Mission Control
Status: active

## Where To Work

Project root:
- `/home/ianik/.openclaw/workspace/mission-control/`

Do your project work inside this directory tree.

Do **not** mix Mission Control work into memory, identity, or core assistant files unless explicitly asked.

---

## Read These First

Before building, read:
- `/home/ianik/.openclaw/workspace/mission-control/README.md`
- `/home/ianik/.openclaw/workspace/mission-control/builder-handoff-v1.md`
- `/home/ianik/.openclaw/workspace/mission-control/layout-spec-v1.md`
- `/home/ianik/.openclaw/workspace/mission-control/data-contract-v1.md`
- `/home/ianik/.openclaw/workspace/mission-control/SYNC-NOTES.md`
- `/home/ianik/.openclaw/workspace/corp/CORP-STRUCTURE-v1.md`

If you are unclear after reading those, ask before inventing structure.

---

## What You Are Building

Build the first usable version of **Mission Control**.

This is an executive dashboard for fast operating visibility.

It should quickly answer:
- what matters right now
- what needs Owner attention
- what is blocked or brittle
- what is active vs dormant
- where money or complexity may be drifting

This is **not** a generic productivity dashboard.

---

## Working Style

Optimize for:
- boring and reliable
- easy to edit
- clear status visibility
- fast scanning
- low maintenance cost

Avoid:
- unnecessary backend complexity
- flashy visual noise
- speculative infrastructure
- inventing product logic not present in the specs

---

## Canonical Sources vs Derived Artifacts

### Canonical business truth
- `/home/ianik/.openclaw/workspace/corp/CORP-STRUCTURE-v1.md`
- `/home/ianik/.openclaw/workspace/mission-control/data/*.md`

### Derived/reference artifacts
- `/home/ianik/.openclaw/workspace/mission-control/views/index.html`
- `/home/ianik/.openclaw/workspace/mission-control/views/styles.css`
- `/home/ianik/.openclaw/workspace/mission-control/views/app.js`
- `/home/ianik/.openclaw/workspace/mission-control/views/sample-data.json`

Critical rule:
- **Do not create a second conflicting source of truth.**
- If business content changes, update canonical markdown first.
- `sample-data.json` is a reference payload, not the primary source.

---

## Homepage Build Target

Build the first dashboard homepage with these sections in this order:
1. Priority Stack
2. Decision Queue
3. Org Activation Status
4. Ops Health
5. Cost Watch
6. Recent Alerts
7. compact previews for Projects / Communications Queue / Intelligence Queue

Definition of success:
In under 30 seconds, the Owner should be able to identify:
- current top priorities
- pending decisions
- active vs dormant seats
- current operational risks
- current cost/complexity concerns

If the build cannot do that, simplify it.

---

## Reference Implementation

A data-driven reference mock already exists.

Use these files:
- `/home/ianik/.openclaw/workspace/mission-control/views/index.html`
- `/home/ianik/.openclaw/workspace/mission-control/views/styles.css`
- `/home/ianik/.openclaw/workspace/mission-control/views/app.js`
- `/home/ianik/.openclaw/workspace/mission-control/views/sample-data.json`

Treat them as a strong reference, not sacred final architecture.

---

## Git Worktree Guidance

You are expected to work in **separate git worktrees** so multiple AI coders can operate in parallel without stepping on each other.

Recommended pattern:
- one worktree per coder
- one focused scope per worktree
- no broad overlapping edits without coordination

Suggested split for parallel work:
1. **UI shell / layout**
   - page structure
   - responsive layout
   - card system
   - visual hierarchy

2. **Org visualization**
   - org node rendering
   - active vs dormant treatment
   - relationship display
   - detail interactions if needed

3. **Data wiring / transformation**
   - sample-data handling
   - future parser or transform layer
   - data mapping discipline
   - empty-state and fallback handling

4. **Polish / usability**
   - spacing
   - readability
   - state badges
   - scan speed
   - review for clutter and confusion

If there are 4 AI coders, this is the cleanest default division.

---

## Coordination Rules For Parallel Coders

- keep changes scoped to your assigned lane
- document assumptions in your branch/worktree
- do not silently rename or relocate canonical source files
- do not replace the information model with your own interpretation
- if your work changes shared structure, note it clearly for merge review

If a choice affects other lanes, prefer a small interface contract over broad rewrites.

---

## What Not To Do

Do **not** spend time on:
- auth systems
- databases
- real-time sync
- notification engines
- elaborate chart libraries unless clearly justified
- generic dashboard widgets that do not serve the executive model

Do **not** optimize for demo flash over operating usefulness.

---

## Final Principle

Prefer:
- stable over dynamic
- clear over clever
- editable over magical
- useful over impressive

Build something the Owner can actually run the operation from.
