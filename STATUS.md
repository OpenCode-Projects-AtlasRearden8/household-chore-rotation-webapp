# STATUS.md

**Project:** Household Chore Rotation — offline single-file webapp
**Date:** 2026-11-03
**Owner:** Asdale Dynamics, LLC

## What was built

- `index.html` — the whole app in one file (HTML + CSS + JS, zero dependencies):
  - **This Week** tab: chore cards with the assigned person, the person's strength label for that chore, quick Done / Skip buttons, per-chore override dropdown, and a two-select trade panel ("we already traded yesterday" flag included) with undo.
  - **Rotation Wheel** tab: SVG wheel of the household with rotation arrows, next-week preview, wheel add/remove, and a strengths-mode toggle.
  - **People & Strengths** tab: add/remove people, rate each person per chore on a -2..+2 scale, add/edit/remove chores with effort weight (1–3) and repeat cadence (every 1/2/3 weeks).
  - **Skip Log** tab: gentle skip entry with optional note, open-skip list with "they covered it" cover button, and a *Who quietly covers* tribute panel.
  - **Weekly Review** tab: per-person done/skip/cover/trade counts for any week, quiet-heroes callout, notes per week, and "roll to next week".
  - **Setup** tab: JSON backup download/restore, full reset, usage notes.
  - Strengths engine: greedy skill + recency scoring (capped weeks-since memory), applied via a one-click "Suggest strengths tweaks" that only proposes strict score improvements found by exhaustive two-chore swap search.
  - All state in `localStorage` under `hcr.state.v1`; first run seeds a friendly sample household of three with five chores.
- `tests/run-tests.mjs` — 41 assertions covering: negative-safe modulo, rotation wheel cycling (weeks 0–4 across a 3-person wheel), even distribution of chores, weeks-since recency memory, strengths assignment (dishes→Alex(+2) not Sam(-2), bins→Jo(+2)), determinism, swap math (`applyTrade` purity, `bestSkillSwap` gain verification, no-improving-swap on optimal assignments), trade records, and review bookkeeping (done/skip/cover, covered skips closing, quiet heroes, week isolation).
- `tests/smoke-test.mjs` — headless smoke test using a minimal DOM shim: renders every tab's markup and functionally invokes the trade and skip-logging click handlers.
- `README.md` (credits **Asdale Dynamics, LLC**), `LICENSE` (MIT, `Copyright (c) 2026 Asdale Dynamics, LLC`).

## How to run it

- App: open `index.html` in any browser — `file://` works (just double-click). No server, no install, no network.
- Core tests + swap math: `node tests/run-tests.mjs`
- Render smoke test: `node tests/smoke-test.mjs`

## Verification results

- `node tests/run-tests.mjs` → **ALL PASS: 41 checks green.** (Fixed during development: `computeReview` originally never closed covered skips — caught by test, corrected, re-run to green.)
- `node tests/smoke-test.mjs` → **SMOKE TEST PASS** (all tabs render; trade + skip handlers append correct log entries).
- Full page script passes Node syntax compilation; all `getElementById` targets verify against markup; `<section>`/`<div>` tag balance verified.

## Known gaps

- Weekly review counts `done`/`skip` logged directly rather than diffing against the assignment — someone else's manual override completion still credits the person who marked it done (kept as-is: it's the honest log, not surveillance).
- Strengths suggestions only consider two-chore swaps (not multi-step reassignments), capped at 8 sequential tweaks.
- No per-chore day-of-week scheduling; the weekly model assumes all active chores recur on the week cadence.
- If a person is removed from the household mid-history, old log entries for them show "(gone)" and their coverage history remains (intentionally kept for honesty).
- localStorage is per-browser/per-Origin; moving data between devices or browsers requires the manual JSON backup/restore in Setup.
- `.mjs` test scripts need Node; browsers can run the app without Node but cannot re-run the tests from `file://` without a runner.
