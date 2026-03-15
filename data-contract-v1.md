# AI News — Presentation Contract

Status: active draft
Purpose: define the data shape for AI-specific news items rendered in Mission Control.

## Scope

This contract covers AI/ML industry news relevant to operating decisions — model releases, pricing changes, regulatory shifts, competitive signals, and tooling developments.

This is a **presentation contract**, not a backend schema.

---

## AI News Item

```json
[
  {
    "headline": "OpenAI announces GPT-5 with 2M context window",
    "summary": "New flagship model doubles context and adds native tool use. Enterprise tier available immediately.",
    "source": "The Verge",
    "timestamp": "2026-03-15T09:00:00-07:00",
    "priority": "HIGH",
    "category": "model-release",
    "whyItMatters": "May affect current model selection and pricing assumptions.",
    "link": null,
    "recommendedAction": null
  }
]
```

### Required fields
- headline
- source
- timestamp
- priority

### Recommended fields
- summary
- category
- whyItMatters
- link
- recommendedAction

---

## Field definitions

### headline
Short factual title. One line.

### summary
1-2 sentence expansion. Optional — omit if headline is self-explanatory.

### source
Publication or origin. Examples: "The Verge", "Reuters", "Anthropic blog", "Hacker News".

### timestamp
ISO 8601. When the item was published or first observed.

### priority
Signal level for scan speed. Values:
- **HIGH** — direct impact on current operations, costs, or decisions
- **WATCH** — relevant but no immediate action needed
- **LOW** — background awareness only

Maps to existing badge classes: `badge-issue` (HIGH), `badge-watch` (WATCH), `badge-dormant` (LOW).

### category
Topic bucket for filtering. Suggested values:
- `model-release` — new models, capabilities, benchmarks
- `pricing` — pricing changes, tier restructuring
- `regulation` — AI-specific regulation, compliance
- `competitive` — competitor moves, market shifts
- `tooling` — SDKs, APIs, developer platforms
- `research` — papers, breakthroughs with near-term relevance
- `infrastructure` — compute, hardware, cloud AI services

Not a closed set — new categories may appear.

### whyItMatters
One sentence explaining operational relevance. Optional.

### link
URL to source article. Null if unavailable or unnecessary.

### recommendedAction
Short action suggestion. Null if no action warranted.

---

## Rendering rules

- Show up to 10 items, newest first
- HIGH items should be visually prominent (e.g. left border accent)
- LOW items may be muted
- Empty state: "No AI news items loaded."
- Do not fabricate urgency — if no items, show empty state cleanly

## Empty state

If `aiNews` is empty or missing:
- render a clean empty state
- do not hide the section
- do not show error messaging
