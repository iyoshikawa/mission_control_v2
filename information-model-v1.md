# Mission Control Information Model v1

Status: draft
Owner: Saidee
Purpose: define what the dashboard should show, where each section gets its data, and what should remain manual vs automated.

## Operating Principle

Mission Control is an executive surface, not a data swamp.

Every panel should answer one of these questions:
- What matters right now?
- What is blocked?
- What needs Owner attention?
- What is costing money?
- What is active vs dormant?

If a panel does not help with decision quality or operating speed, it should not exist.

---

## Dashboard Layers

### Layer 1: Executive Snapshot
This is the top-level view. It should be scannable in seconds.

Panels:
1. **Current Priority Stack**
2. **Decision Queue**
3. **Org Activation Status**
4. **Ops Health**
5. **Cost Watch**
6. **Recent Alerts / Material Changes**

### Layer 2: Operational Detail
This is where the user drills in after seeing something notable.

Panels:
1. Projects
2. Systems / infrastructure
3. Financial controls
4. Communication obligations
5. Research / intelligence queue

### Layer 3: Source Documents
Links to the canonical documents behind the dashboard.

---

## Panel Definitions

## 1. Current Priority Stack
**Question answered:** What should be worked on now?

**What it should show:**
- top 3-5 active priorities
- status of each priority
- owner of each item
- next action
- blocker flag if present

**Initial source type:** manual markdown

**Suggested source file:**
- `/home/ianik/.openclaw/workspace/mission-control/data/priorities.md`

**Automation level:** manual first, automatable later

**Why manual first:**
Priority quality matters more than freshness. A manually curated short list is better than noisy automated extraction.

---

## 2. Decision Queue
**Question answered:** What is waiting on Owner?

**What it should show:**
- pending decision
- why the decision matters
- options
- recommendation
- deadline or urgency

**Initial source type:** manual markdown

**Suggested source file:**
- `/home/ianik/.openclaw/workspace/mission-control/data/decision-queue.md`

**Automation level:** manual first

**Rule:**
Do not flood this section. Only list things that truly require Owner judgment.

---

## 3. Org Activation Status
**Question answered:** Which seats are active, dormant, or proposed?

**What it should show:**
- active seats
- dormant seats
- reporting lines
- activation triggers
- optional last-reviewed date

**Initial source type:** canonical markdown reference

**Canonical source:**
- `/home/ianik/.openclaw/workspace/corp/CORP-STRUCTURE-v1.md`

**Mission Control reference:**
- `/home/ianik/.openclaw/workspace/mission-control/data/corp-structure.md`

**Automation level:** render from markdown / parser later

---

## 4. Ops Health
**Question answered:** What is brittle, broken, degraded, or overdue?

**What it should show:**
- system or workflow name
- status: healthy / watch / issue
- short issue note
- recommended next step
- last checked timestamp

**Initial source type:** manual markdown, optionally enriched later

**Suggested source file:**
- `/home/ianik/.openclaw/workspace/mission-control/data/ops-health.md`

**Automation level:** hybrid later

**Good use cases:**
- unstable automation
- startup/relaunch brittleness
- failed jobs
- maintenance debt

---

## 5. Cost Watch
**Question answered:** Where is money being spent, wasted, or drifting?

**What it should show:**
- recurring cost item
- current estimated spend
- change from baseline
- utilization note
- action recommendation

**Initial source type:** manual markdown

**Suggested source file:**
- `/home/ianik/.openclaw/workspace/mission-control/data/cost-watch.md`

**Automation level:** manual first, integrate later if source systems are stable

**Rule:**
Focus on exceptions, drift, and underused spend. Not every dollar needs a tile.

---

## 6. Recent Alerts / Material Changes
**Question answered:** What changed that I should know about?

**What it should show:**
- timestamp
- event summary
- why it matters
- recommended action if any

**Initial source type:** manual or lightly generated summary

**Suggested source file:**
- `/home/ianik/.openclaw/workspace/mission-control/data/alerts.md`

**Automation level:** hybrid possible later

**Rule:**
This should be sparse. If every minor event becomes an alert, the panel fails.

---

## 7. Projects
**Question answered:** What initiatives are active and where are they stuck?

**What it should show:**
- project name
- phase
- owner
- next milestone
- blocker summary

**Initial source type:** manual markdown

**Suggested source file:**
- `/home/ianik/.openclaw/workspace/mission-control/data/projects.md`

**Automation level:** manual first

---

## 8. Communication Obligations
**Question answered:** What follow-ups or outbound items matter?

**What it should show:**
- item
- recipient/context
- due timing
- sensitivity level
- draft status

**Initial source type:** manual markdown

**Suggested source file:**
- `/home/ianik/.openclaw/workspace/mission-control/data/comms-queue.md`

**Automation level:** manual first

---

## 9. Intelligence Queue
**Question answered:** What should be monitored or researched next?

**What it should show:**
- topic
- why it matters
- cadence
- current owner
- last update

**Initial source type:** manual markdown

**Suggested source file:**
- `/home/ianik/.openclaw/workspace/mission-control/data/intelligence-queue.md`

**Automation level:** manual first

---

## Data Maturity Model

### Stage 1 — Spec-driven
- markdown files
- manual updates
- visual layer can be mocked quickly
- minimal engineering burden

### Stage 2 — Structured ingestion
- selected files mirrored into JSON/YAML
- light parsers
- more predictable rendering

### Stage 3 — Live operational dashboard
- automated feeds where justified
- update timestamps
- system status integrations
- cost and job telemetry where reliable

Recommendation: stay in Stage 1 until the dashboard proves useful.

---

## Canonical vs Derived Data

### Canonical documents
These are business truth and should not be casually overwritten by UI work.

Examples:
- `/home/ianik/.openclaw/workspace/corp/CORP-STRUCTURE-v1.md`
- manual queue files in `mission-control/data/`

### Derived artifacts
These can be regenerated or redesigned freely.

Examples:
- charts
- cards
- HTML views
- diagrams
- app screens

Rule: if there is a conflict, canonical docs win.

---

## Good Dashboard Test

A good Mission Control dashboard should let the Owner answer these in under 30 seconds:
- What are the top priorities?
- What decisions are waiting on me?
- What is at risk?
- What is active vs dormant?
- Where is money leaking or drifting?

If the dashboard cannot do that, it is decoration.
