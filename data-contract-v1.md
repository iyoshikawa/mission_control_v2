# Mission Control Data Contract v1

Status: active draft
Audience: builders implementing the first usable dashboard
Purpose: define a simple content contract so UI work can proceed without inventing inconsistent structures.

## Contract Philosophy

This contract is intentionally small.

Goals:
- make builder assumptions explicit
- support fast implementation
- preserve source-of-truth markdown files
- allow later migration to JSON/YAML or app-managed state

This is a **presentation contract**, not a database schema.

---

## Global Rules

### 1. Canonical docs win
If rendered data conflicts with the source markdown, source markdown wins.

### 2. Prefer tolerant parsing
Builders should not assume perfect formatting forever.

### 3. Missing data should degrade gracefully
If a field is missing:
- omit it
- show a muted fallback
- do not crash rendering

### 4. Status values should be normalized
Preferred statuses:
- ACTIVE
- DORMANT
- PROPOSED
- HEALTHY
- WATCH
- ISSUE
- BLOCKED
- NEEDS_DECISION
- READY
- NEXT
- SOON
- LEAN

Builders may map these to display badges.

---

## Recommended v1 Implementation Pattern

Use one of these:

### Option A — Direct markdown to view mapping
- manually maintain structured mock objects in code
- align those objects with markdown source files
- update by hand during v1

### Option B — Lightweight transformation layer
- read markdown
- transform into a small JSON object
- render from the transformed object

Recommendation: **Option B if the builders are competent and disciplined; Option A if speed matters more than elegance.**

---

## Top-Level Dashboard Contract

A v1 dashboard renderer should be able to consume a structure like this:

```json
{
  "meta": {
    "title": "Mission Control",
    "status": "REFERENCE",
    "lastUpdated": "2026-03-13T08:48:00-07:00"
  },
  "priorityStack": [],
  "decisionQueue": [],
  "org": {
    "nodes": [],
    "edges": []
  },
  "opsHealth": [],
  "costWatch": [],
  "alerts": [],
  "projects": [],
  "commsQueue": [],
  "intelligenceQueue": []
}
```

Not every section must be populated in v1.

---

## Section Contracts

## 1. Priority Stack

```json
[
  {
    "title": "Mission Control dashboard foundation",
    "status": "ACTIVE",
    "owner": "Saidee",
    "summary": "Lock the structure and reference implementation before external build work starts.",
    "nextAction": "Hand off specs and reference build",
    "blocker": null,
    "reviewDate": null
  }
]
```

### Required fields
- title
- status

### Recommended fields
- owner
- summary
- nextAction
- blocker
- reviewDate

---

## 2. Decision Queue

```json
[
  {
    "decision": "Choose first implementation style",
    "status": "NEEDS_DECISION",
    "whyItMatters": "A heavy framework too early creates maintenance drag.",
    "options": ["Static shell", "Lightweight framework"],
    "recommendation": "Static-first",
    "urgency": "medium",
    "deadline": null
  }
]
```

### Required fields
- decision
- status

### Recommended fields
- whyItMatters
- options
- recommendation
- urgency
- deadline

---

## 3. Org Activation Status

Use a graph-friendly structure.

```json
{
  "nodes": [
    {
      "id": "owner",
      "label": "Owner",
      "status": "ACTIVE",
      "roleType": "human",
      "summary": "Final decisions, priorities, and risk calls.",
      "reportsTo": null,
      "activationTrigger": null,
      "outputs": []
    },
    {
      "id": "saidee",
      "label": "Saidee",
      "status": "ACTIVE",
      "roleType": "operator",
      "summary": "CEO / operator. Converts goals into execution and operating discipline.",
      "reportsTo": "owner",
      "activationTrigger": null,
      "outputs": ["executive summaries", "operating updates"]
    },
    {
      "id": "cfo",
      "label": "CFO",
      "status": "DORMANT",
      "roleType": "dormant-seat",
      "summary": "Financial control, spend visibility, vendor scrutiny.",
      "reportsTo": "saidee",
      "activationTrigger": "Recurring spend review or budget drift",
      "outputs": ["spend reports", "budget variance notes"]
    }
  ],
  "edges": [
    { "from": "owner", "to": "saidee" },
    { "from": "saidee", "to": "cfo" }
  ]
}
```

### Required node fields
- id
- label
- status

### Recommended node fields
- roleType
- summary
- reportsTo
- activationTrigger
- outputs

### Required edge fields
- from
- to

---

## 4. Ops Health

```json
[
  {
    "name": "Startup / relaunch flow",
    "status": "WATCH",
    "issue": "Needs dedicated tmux session and stale-window cleanup.",
    "recommendedNextStep": "Implement safer relaunch flow",
    "lastChecked": "2026-03-13T08:40:00-07:00"
  }
]
```

### Required fields
- name
- status

### Recommended fields
- issue
- recommendedNextStep
- lastChecked

---

## 5. Cost Watch

```json
[
  {
    "name": "Dashboard build scope",
    "status": "LEAN",
    "estimatedSpend": null,
    "baseline": null,
    "change": null,
    "utilizationNote": "Keep v1 static/lightweight to avoid premature maintenance cost.",
    "actionRecommendation": "Avoid heavy stack until the information model stabilizes"
  }
]
```

### Required fields
- name
- status

### Recommended fields
- estimatedSpend
- baseline
- change
- utilizationNote
- actionRecommendation

---

## 6. Alerts

```json
[
  {
    "timestamp": "2026-03-13T08:20:00-07:00",
    "summary": "Mission Control project established",
    "whyItMatters": "Coders now have a defined working area and specs.",
    "recommendedAction": null
  }
]
```

### Required fields
- timestamp
- summary

### Recommended fields
- whyItMatters
- recommendedAction

---

## 7. Projects

```json
[
  {
    "name": "Mission Control v1",
    "phase": "setup",
    "owner": "Saidee",
    "nextMilestone": "External builder first pass",
    "blockerSummary": null,
    "status": "ACTIVE"
  }
]
```

### Required fields
- name

### Recommended fields
- phase
- owner
- nextMilestone
- blockerSummary
- status

---

## 8. Communications Queue

```json
[
  {
    "item": "Handoff to external coder",
    "context": "Mission Control dashboard build",
    "dueTiming": "soon",
    "sensitivity": "normal",
    "draftStatus": "not_started",
    "status": "READY"
  }
]
```

### Required fields
- item

### Recommended fields
- context
- dueTiming
- sensitivity
- draftStatus
- status

---

## 9. Intelligence Queue

```json
[
  {
    "topic": "Dashboard implementation patterns",
    "whyItMatters": "Useful for future optimization and data wiring choices.",
    "cadence": "ad hoc",
    "owner": "Saidee",
    "lastUpdate": null,
    "status": "DORMANT"
  }
]
```

### Required fields
- topic

### Recommended fields
- whyItMatters
- cadence
- owner
- lastUpdate
- status

---

## Rendering Rules

### Priority Stack
Show up to 5 items on the homepage.

### Decision Queue
Show the most urgent 3-5 items.

### Org Activation Status
Always show Owner and Saidee first, then direct-report seats.

### Ops Health / Cost Watch / Alerts
Show sparse, exception-oriented cards.

### Empty State Behavior
If a section is empty:
- show a clean empty state
- do not fabricate urgency
- do not hide the section unless explicitly designed that way

---

## Builder Notes

Builders are allowed to:
- create mock JSON for rendering
- create a small transformation script
- add field mapping logic
- add fallback labels and badges

Builders should not:
- redefine the business meaning of the sections
- fork the corp structure into a conflicting source of truth
- introduce backend complexity without a clear reason

---

## Recommended Handoff Package

For the first build pass, hand builders these files:
- `/home/ianik/.openclaw/workspace/mission-control/README.md`
- `/home/ianik/.openclaw/workspace/mission-control/dashboard-spec.md`
- `/home/ianik/.openclaw/workspace/mission-control/information-model-v1.md`
- `/home/ianik/.openclaw/workspace/mission-control/layout-spec-v1.md`
- `/home/ianik/.openclaw/workspace/mission-control/builder-handoff-v1.md`
- `/home/ianik/.openclaw/workspace/mission-control/data-contract-v1.md`
- `/home/ianik/.openclaw/workspace/mission-control/views/index.html`
- `/home/ianik/.openclaw/workspace/mission-control/views/styles.css`
- `/home/ianik/.openclaw/workspace/corp/CORP-STRUCTURE-v1.md`

That is enough for a competent builder to start producing useful output immediately.
