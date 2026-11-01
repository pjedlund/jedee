---
description: "A datetime string with no offset is ambiguous, and the guess is usually silent; how to settle it against an independent absolute source before importing thousands of rows."
date: 2026-08-09
---

`2026-07-20 08:59:56` does not say what time it is. It names a wall-clock reading with no indication of which clock, and the moment it describes depends entirely on a time zone the string does not carry. Programmers call this a **naive datetime**, in contrast to an *aware* one that carries an offset (`+02:00`) or the `Z` that means UTC.

The problem is not that the ambiguity exists — it is that resolving it never fails loudly. Parse a naive string in any language and you get a valid datetime object; the parser applies a default (usually the host's local zone, sometimes UTC) and returns without complaint. If the default is wrong, every value is off by a fixed amount and nothing anywhere reports an error. A test that round-trips the string through parse and format passes, because the same wrong assumption is applied in both directions.

Data exports are where this bites hardest, because an export is read once by a script that is then thrown away, and the result is written into permanent records.

**Do not settle it by reading the documentation, and do not settle it by which reading looks more plausible.** "08:59 for a morning race" and "10:59 for a morning race" are both plausible. Settle it against a source that is absolute by construction:

- **A file format that specifies UTC.** [FIT](https://developer.garmin.com/fit/protocol/), EXIF's `DateTimeOriginal` companion `OffsetTimeOriginal`, HTTP `Date` headers, and most binary telemetry formats define their epoch or offset in the specification. If a CSV column and a spec-defined UTC field hold the *same* number, the column is UTC; if they differ by the local offset, it is local.
- **A physical artefact.** A printed receipt, a photograph's clock, a published start list — anything generated outside the system being imported.
- **An already-correct record of the same event** in another part of the same system, if one exists.

Two agreeing sources are worth more than any amount of reasoning about what the exporter "probably" does, and the check costs one script run.

The related trap is the *destination* format. `2026-07-20T08:59:56+02:00` and `2026-07-20T06:59:56Z` are the same instant and both are correct ISO 8601; `2026-07-20T08:59:56` is neither, and pasting a UTC reading into an offset-bearing string without shifting it — writing `08:59:56+02:00` when the source meant `08:59:56Z` — is exactly the mistake this page is about, made at the other end.

## In stomme

An activities archive imported from a fitness service's bulk export meets this problem directly: the export's `activities.csv` has a date column in the naive form above — no offset, no `Z`, and (on an account set to another language) month names in that language.

A one-time backfill script written for such an export assumed local time. It opened by pinning the process zone and said so in a comment:

```js
process.env.TZ = 'Europe/Berlin'; // CSV dates are local wall-clock time
```

The comment was wrong. The column was UTC, and three independent sources said so for the same activity:

- the FIT recording's first `record` message — UTC by specification — reads `2026-07-20 08:59:56`, **identical** to the CSV rather than two hours from it;
- the printed result sheet from the event gives a start time of 11:00:09 local summer time, which is 09:00:09 UTC;
- the recorded elapsed time, 69:41, matches the printout's official 69:06 with a few seconds of watch overrun at each end — so the activity is that race and not something two hours earlier.

```python
# FIT record timestamps are absolute UTC by spec — the tiebreaker.
fit = fitparse.FitFile(gzip.open('activities/example.fit.gz','rb').read())
next(fit.get_messages('record')).get_value('timestamp')  # 2026-07-20 08:59:56
```

The backfilled posts therefore carried `+02:00` on a value that was already UTC, putting their time of day two hours early. Only the time is affected: every one of those activities happened in daylight, so no date rolls over and no permalink is wrong (see [[Permalinks and Obsidian-friendly filenames]] — the activity permalink formats the date, not the time).

What made it survivable is a rule an archive can follow: **frontmatter stores recorded numbers only, never derived ones.** A stored "10:59" would have to be found and recomputed; a stored instant is one arithmetic shift away from correct whenever the sweep happens.
