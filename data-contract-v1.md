# Global News — Presentation Contract

Status: active draft
Purpose: define the data shape for compact global-news items rendered in Mission Control.

## Scope

This contract covers world news relevant to morning operating decisions — geopolitics, trade, supply chain, energy, central banks, and other macro developments with practical business impact.

This is a **presentation contract**, not a backend schema.

---

## Global News Item

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

---

## Field definitions

### headline
Short factual title. One line.

### summary
1-2 sentence expansion. Optional.

### source
Publication or origin. Examples: "Reuters", "Bloomberg", "Financial Times", "AP".

### timestamp
ISO 8601. When the item was published or first observed.

### impact
Signal level for scan speed. Values:
- **HIGH** — likely to affect current decisions, costs, supply, or risk posture
- **MEDIUM** — relevant context worth scanning this morning
- **LOW** — background awareness only

Maps to existing badge classes: `badge-issue` (HIGH), `badge-watch` (MEDIUM), `badge-dormant` (LOW).

### region
Short geography label for fast scanning. Examples: `Global`, `Europe`, `China`, `Middle East`.

### category
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

### whyItMatters
One sentence translating the headline into operational relevance. Recommended.

### link
URL to source article. Null if unavailable or unnecessary.

---

## Rendering rules

- Show up to 8 items, newest first
- Keep the section compact and high signal
- HIGH items should be visually prominent
- Do not turn this into a generic newspaper wall
- Empty state: "No global news items loaded."

## Empty state

If `newsFeed` is empty or missing:
- render a clean empty state
- do not hide the section
- do not show error messaging
