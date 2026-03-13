# Mission Control Coder Handoff Message v1

Use or adapt the message below when handing this project to outside coders.

---

You are building the first usable version of **Mission Control**, an executive dashboard for fast operating visibility.

This is **not** a generic dashboard project. It is a decision surface for quickly answering:
- what matters right now
- what needs Owner attention
- what is blocked or brittle
- what is active vs dormant
- where money may be leaking or drifting

## Working rules

- keep it lean
- prefer boring/reliable over clever
- do not invent extra product logic
- do not build heavy backend infrastructure unless explicitly asked
- do not fork business truth into a second conflicting source

## Canonical source documents

Start here:
- `/home/ianik/.openclaw/workspace/mission-control/README.md`
- `/home/ianik/.openclaw/workspace/mission-control/dashboard-spec.md`
- `/home/ianik/.openclaw/workspace/mission-control/information-model-v1.md`
- `/home/ianik/.openclaw/workspace/mission-control/layout-spec-v1.md`
- `/home/ianik/.openclaw/workspace/mission-control/builder-handoff-v1.md`
- `/home/ianik/.openclaw/workspace/mission-control/data-contract-v1.md`
- `/home/ianik/.openclaw/workspace/corp/CORP-STRUCTURE-v1.md`

## Reference implementation

A data-driven reference mock exists here:
- `/home/ianik/.openclaw/workspace/mission-control/views/index.html`
- `/home/ianik/.openclaw/workspace/mission-control/views/styles.css`
- `/home/ianik/.openclaw/workspace/mission-control/views/app.js`
- `/home/ianik/.openclaw/workspace/mission-control/views/sample-data.json`

Treat this as a **reference**, not as a finished product.

## Primary build target

Build a clean v1 homepage with these sections in this order:
1. Priority Stack
2. Decision Queue
3. Org Activation Status
4. Ops Health
5. Cost Watch
6. Recent Alerts
7. Secondary previews for Projects / Communications Queue / Intelligence Queue

## Important constraints

- org structure source of truth is:
  `/home/ianik/.openclaw/workspace/corp/CORP-STRUCTURE-v1.md`
- Mission Control should consume canonical docs, not redefine them
- empty states should degrade cleanly
- active vs dormant states must be visually obvious
- scanning speed matters more than visual flourish

## Strong recommendation

Start with a thin static or lightweight implementation.

Do not over-engineer authentication, database layers, real-time plumbing, or elaborate state systems yet. We are proving the information model first.

## Definition of a good first pass

A good first pass lets the Owner understand in under 30 seconds:
- current top priorities
- pending decisions
- active vs dormant seats
- current operational risks
- current cost concerns

If your build cannot do that, simplify it.

---

Deliver a practical first pass, not a shiny toy.
