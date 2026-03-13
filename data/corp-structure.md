# Corp Structure Data Source

Status: active reference

## Canonical Source

`/home/ianik/.openclaw/workspace/corp/CORP-STRUCTURE-v1.md`

## Role in Mission Control

This file exists as a stable handoff note for dashboard builders.

Mission Control should treat the canonical corp structure document as the source of truth for:
- active seats
- dormant seats
- activation triggers
- decision rights
- org-chart rendering cues

## Current Integration Rule

Do not duplicate the structure into a separate dashboard-owned version unless there is a clear ingestion pipeline and an explicit decision to maintain it.

Until then:
- read from the canonical markdown
- render from the canonical markdown
- keep any view-specific annotations outside the source document

## Notes for Builders

Primary source file:
- `../../corp/CORP-STRUCTURE-v1.md`

If a parser or app layer is added later, document that pipeline here.
