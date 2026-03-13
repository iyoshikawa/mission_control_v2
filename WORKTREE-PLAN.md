# Mission Control Worktree Plan

Purpose: let multiple coders work in parallel without collisions, duplicate effort, or unclear merge order.

## Default Approach

Use one git worktree per coder.

Recommended count for current effort:
- 4 worktrees
- 4 focused scopes
- 1 integration branch

## Recommended Branch / Worktree Naming

Main integration branch:
- `mission-control/mainline`

Suggested feature branches:
- `mission-control/ui-shell`
- `mission-control/org-visualization`
- `mission-control/data-wiring`
- `mission-control/polish-usability`

Suggested worktree directories (example pattern):
- `../mc-ui-shell`
- `../mc-org-viz`
- `../mc-data`
- `../mc-polish`

If a different naming convention is preferred, keep it consistent and obvious.

---

## Scope By Worktree

### 1. UI Shell / Layout
**Branch:** `mission-control/ui-shell`

Owns:
- page structure
- section layout
- responsive behavior
- card/grid system
- visual hierarchy

Should primarily touch:
- `views/index.html`
- `views/styles.css`
- layout/spec notes if needed

Should avoid:
- changing canonical business content
- inventing data structures
- making org-logic decisions for other lanes

---

### 2. Org Visualization
**Branch:** `mission-control/org-visualization`

Owns:
- org chart rendering
- node treatment
- active vs dormant visibility
- reporting-line clarity
- org detail interactions if needed

Should primarily touch:
- `views/app.js`
- `views/styles.css`
- any org-specific view helpers

Must respect canonical source:
- `../corp/CORP-STRUCTURE-v1.md`

Should avoid:
- redefining org semantics
- changing non-org dashboard priorities

---

### 3. Data Wiring / Transformation
**Branch:** `mission-control/data-wiring`

Owns:
- sample data handling
- transformation helpers
- parser or adapter logic if added
- empty-state behavior
- data contract enforcement

Should primarily touch:
- `views/app.js`
- `views/sample-data.json`
- `data-contract-v1.md`
- optional helper scripts if introduced

Should avoid:
- unnecessary backend complexity
- changing layout priorities

---

### 4. Polish / Usability
**Branch:** `mission-control/polish-usability`

Owns:
- readability improvements
- spacing
- scan speed
- status badge clarity
- visual cleanup
- low-risk UX refinement

Should primarily touch:
- `views/styles.css`
- low-risk markup tweaks
- notes on usability issues

Should avoid:
- major structure rewrites
- hidden product logic changes

---

## Merge Order

Recommended merge order:
1. UI shell / layout
2. Org visualization
3. Data wiring
4. Polish / usability

Why this order:
- structure first
- specialized org rendering second
- data integration on stable structure third
- polish last to avoid churn

If one lane gets materially ahead, adjust pragmatically, but preserve clear review checkpoints.

---

## Integration Rules

Before merging into `mission-control/mainline`:
- rebase or merge latest integration branch
- verify the reference view still loads cleanly
- check that no canonical source path assumptions were broken
- note any contract changes clearly

Do not merge silently if:
- file structure changed
- data contract changed
- org rendering assumptions changed
- multiple lanes now overlap more than expected

---

## Conflict Avoidance Rules

- keep each lane narrow
- avoid broad formatting churn across shared files
- if touching a shared file, modify only the section you own where possible
- document assumptions in commit messages or branch notes
- if a change affects other lanes, write a short note before merge

High-conflict files:
- `views/index.html`
- `views/styles.css`
- `views/app.js`

Treat those carefully.

---

## Definition of Done Per Lane

### UI Shell / Layout
Done when:
- page structure matches the layout spec
- responsive behavior is sane
- sections are ordered correctly

### Org Visualization
Done when:
- active vs dormant status is obvious
- reporting lines are readable
- org display feels executive, not playful

### Data Wiring
Done when:
- view renders from the sample payload cleanly
- empty states degrade gracefully
- data contract assumptions are documented

### Polish / Usability
Done when:
- scan speed improves
- clutter is reduced
- states remain obvious under realistic content density

---

## Minimal Operating Discipline

If parallel work starts getting messy:
- freeze scope changes
- return to the existing specs
- resolve structure before polish
- prefer fewer, clearer merges over constant churn

The goal is fast execution without chaos.
