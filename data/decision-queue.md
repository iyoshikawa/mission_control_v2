# Decision Queue

Status: active
Last updated: 2026-03-13 America/Los_Angeles

## 1) When to add a markdown-to-JSON sync pipeline
- **decision:** should we automate the sync between canonical markdown and sample-data.json now or keep it manual?
- **why it matters:** premature automation adds maintenance cost; manual sync is cheap while the data model is still stabilizing.
- **options:** keep manual sync; add a lightweight script; build a full pipeline
- **recommendation:** keep manual sync until recurring pain is obvious
- **urgency / deadline:** not urgent

## 2) Dormant seat activation criteria review
- **decision:** should any dormant seats move to active based on current workload patterns?
- **why it matters:** activating too early adds overhead; activating too late lets coordination debt build.
- **options:** keep all dormant; activate one based on workload; review after dashboard v1 ships
- **recommendation:** review after dashboard v1 ships and operating cadence is established
- **urgency / deadline:** after v1
