---
description: "Append-only log of the wiki’s ingest, query, and lint sessions, newest first."
date: 2026-11-01
---

Append-only. One entry per ingest / query-filed / lint, newest first. Entry format: `## [YYYY-MM-DD] ingest | Title` so `grep "^## \[" _log.md | head -5` lists the latest five.

## [2026-11-01] ingest | The general pages move in

The wiki starts here with 72 pages that explain web techniques and how stomme applies them, taken from the wiki of the site stomme was cut from. Each page's `## In stomme` section is the one place that describes this codebase. Names, places and addresses were taken out, links to pages that stayed behind were removed, and every picture was shot again from sources rewritten with the sample theme.
