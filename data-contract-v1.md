# Mission Control Data Contracts

Status: active draft
Purpose: define the generated data shapes rendered by Mission Control.

## Scope

These contracts cover compact dashboard payloads that are refreshed and rendered directly by the Mission Control UI.

This is a **presentation contract**, not a backend schema.

---

## Task System Contract

Purpose: provide one canonical task source for the dashboard, with generated projections for task-oriented preview surfaces.

### Canonical source path
- `data/tasks.source.json`

This is the **only canonical task path**.
All dashboard task projections must be generated from this file.

### Canonical source shape

```json
{
  "meta": {
    "title": "Mission Control Tasks",
    "version": 1,
    "updatedAt": "2026-03-16T23:12:00-07:00"
  },
  "tasks": [
    {
      "id": "mission-control-v1-build-review",
      "title": "Mission Control v1 build review",
      "status": "active",
      "lane": "projects",
      "owner": "Saidee",
      "summary": "Review the current build for drift from the executive operating model.",
      "nextAction": "Review first build pass for spec drift and rendering quality",
      "blocker": null,
      "reviewDate": "2026-03-16",
      "phase": "build / review",
      "priority": 1
    }
  ]
}
```

### Required task fields
- `id`
- `title`
- `status`
- `lane`

### Allowed statuses
- `active`
- `blocked`
- `backlog`
- `done`

### Allowed lanes
- `projects`
- `commsQueue`
- `intelligenceQueue`

### Notes
- Keep tasks lean and human-editable.
- Do not create separate source files for each dashboard section.
- Use optional fields only when they improve rendering or triage.

---

## Generated Task Payload

Generated from the canonical source into:
- `data/tasks.generated.json`

```json
{
  "meta": {
    "generatedAt": "2026-03-17T06:15:00.000Z",
    "sourcePath": "data/tasks.source.json",
    "sourceUpdatedAt": "2026-03-16T23:12:00-07:00",
    "statuses": ["active", "blocked", "backlog", "done"]
  },
  "tasks": [
    {
      "id": "mission-control-v1-build-review",
      "title": "Mission Control v1 build review",
      "status": "active",
      "lane": "projects",
      "owner": "Saidee",
      "summary": "Review the current build for drift from the executive operating model.",
      "nextAction": "Review first build pass for spec drift and rendering quality",
      "blocker": null,
      "priority": 1,
      "reviewDate": "2026-03-16",
      "dueTiming": null,
      "cadence": null,
      "lastUpdate": null,
      "phase": "build / review"
    }
  ],
  "summary": {
    "total": 1,
    "byStatus": {
      "active": 1,
      "blocked": 0,
      "backlog": 0,
      "done": 0
    }
  },
  "dashboard": {
    "projects": [],
    "commsQueue": [],
    "intelligenceQueue": []
  }
}
```

### Generated payload rules
- `meta.sourcePath` must always point to `data/tasks.source.json`
- `tasks` preserves the canonical list in stable priority order
- `summary.byStatus` must match `tasks`
- `dashboard.projects`, `dashboard.commsQueue`, and `dashboard.intelligenceQueue` are generated projections only
- dashboard projection status mapping:
  - `active` -> `ACTIVE`
  - `blocked` -> `BLOCKED`
  - `backlog` -> `DORMANT`
  - `done` -> `HEALTHY`

### Empty state
If no canonical tasks exist:
- emit an empty `tasks` array
- emit zero counts for every status
- emit empty dashboard projection arrays
- do not invent fallback task data

---

## Global News Contract

Purpose: define the data shape for compact global-news items rendered in Mission Control.

### Global News Item

```json
[
  {
    "headline": "Red Sea disruption forces more container rerouting",
    "summary": "Major carriers are extending diversions away from Suez after fresh attacks.",
    "source": "Reuters",
    "timestamp": "2026-03-15T07:10:00-07:00",
    "impact": "HIGH",
    "region": "Middle East",
    "category": "shipping",
    "whyItMatters": "Can raise freight costs and delay imported hardware or goods.",
    "link": null
  }
]
```

### Required fields
- headline
- source
- timestamp
- impact

### Recommended fields
- summary
- region
- category
- whyItMatters
- link

### Field definitions

#### headline
Short factual title. One line.

#### summary
1-2 sentence expansion. Optional.

#### source
Publication or origin. Examples: "Reuters", "Bloomberg", "Financial Times", "AP".

#### timestamp
ISO 8601. When the item was published or first observed.

#### impact
Signal level for scan speed. Values:
- **HIGH** — likely to affect current decisions, costs, supply, or risk posture
- **MEDIUM** — relevant context worth scanning this morning
- **LOW** — background awareness only

Maps to existing badge classes: `badge-issue` (HIGH), `badge-watch` (MEDIUM), `badge-dormant` (LOW).

#### region
Short geography label for fast scanning. Examples: `Global`, `Europe`, `China`, `Middle East`.

#### category
Topic bucket for filtering. Suggested values:
- `trade`
- `shipping`
- `energy`
- `policy`
- `central-banks`
- `conflict`
- `elections`
- `sanctions`

Not a closed set.

#### whyItMatters
One sentence translating the headline into operational relevance. Recommended.

#### link
URL to source article. Null if unavailable or unnecessary.

### Rendering rules

- Show up to 8 items, newest first
- Keep the section compact and high signal
- HIGH items should be visually prominent
- Do not turn this into a generic newspaper wall
- Empty state: "No global news items loaded."

### Empty state

If `newsFeed` is empty or missing:
- render a clean empty state
- do not hide the section
- do not show error messaging
