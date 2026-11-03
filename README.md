# Household Chore Rotation

An offline, local-first webapp that helps a household of any size share chores fairly — with a joint rotation wheel, strengths-based assignments, easy trade logging, and a no-shame skip log that quietly thanks whoever covers.

Built to run from a **single HTML file** by simply double-clicking it — no install, no server, no dependencies, no internet needed.

> Whoever is out there quietly covering skips week after week: this page sees you. 💚

## What it does

- **Joint rotation wheel** — everyone sits on a wheel; chores step around it week by week so nobody is stuck with the same job forever. A visual SVG wheel shows the household and a preview of next week.
- **Strengths-based assignment** — rate each person per chore (`-2 Avoid` to `+2 Great`; "bad at dishes, good at bins"). A suggestion engine nudges heavy chores toward people who find them easier using a skill + recency score, without freezing anyone out of the rotation. One click applies the tweaks; every assignment stays editable.
- **Traded-yesterday swaps** — swap any two chores between two people, and note *"we already traded (they did mine yesterday)"* so the weekly review remembers the favor.
- **No-shame skip log** — skipping happens. Log it without judgment, and mark who covered. Coverage is celebrated ("quiet heroes"), never weaponized. Covered skips earn done-credit for the coverer.
- **Weekly review page** — per-person counts (done, skips, covers, trades), a quiet-heroes shout-out, notes for next week, and one-button "roll to next week."
- **Repeat schedules** — weekly, every 2nd, or every 3rd week per chore.
- **Backup / restore** — export the whole state as JSON, restore anytime. Everything else is private to your browser.

## How to run it

1. Download or copy `index.html` anywhere.
2. Open it in any modern browser (`file://` works — double-click it).
3. Optionally add a bookmark to the file. That's it.

Data is stored in your browser's `localStorage` for that file, so use the same browser to keep history, and export backups from **Setup** before switching devices or clearing browser data.

## Tests

Rotation and swap math is extracted straight from the page's code block, so the tests can't drift from the app:

```sh
node tests/run-tests.mjs     # 41 checks: wheel rotation, strengths engine, swap math, skip/cover review
node tests/smoke-test.mjs    # headless render smoke test (minimal DOM shim) of the whole page
```

No frameworks, no dependencies — plain Node.

## Privacy

No network calls, no analytics, no accounts, no secrets. Nothing leaves your device.

## Credits & license

Created by **Asdale Dynamics, LLC** as part of its beginner-friendly, local-first tool collection.
Licensed under the MIT License — see [LICENSE](LICENSE).
