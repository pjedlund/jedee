---
description: "A build that watches a directory it also writes into will retrigger itself; how .gitignore-as-watch-list hides the problem, and why the fix belongs in a watch-only ignore."
date: 2026-08-02
---

A watch loop is a build that triggers itself. The shape is always the same: a watcher observes a directory tree, the build writes generated output *into* that tree, the watcher sees its own build's output change, and starts another build. Each pass is legitimate work as far as the tool is concerned, so nothing errors — it simply never settles, and the process eventually dies of memory exhaustion or pins a core until it's killed.

It is easy to introduce and hard to see, because most tools ship with a default that hides it. Watchers commonly seed their ignore list from `.gitignore`, on the reasoning that generated files are exactly the things you don't commit *and* don't want to rebuild on. That heuristic is right often enough that the underlying fragility — build output living inside the watched input tree — goes unnoticed for as long as the heuristic holds. The loop appears at the moment something turns the heuristic off, which is usually a change made for an unrelated reason.

**Detecting one** is mechanical: make a single edit and count builds. One edit should equal one build. If a tool logs which file triggered each rebuild, the generated paths appear in that log as changes the developer never made — the clearest possible signature.

**Two ignore lists, and the distinction matters.** Build tools that ignore files usually do so for two different purposes: deciding what is *input* (which files get discovered, compiled, or rendered) and deciding what is *watched*. Fixing a watch loop by adding paths to the input-ignore list can work by accident, but it risks making generated files unreadable to the build that needs them — a compiled stylesheet is not an input page, but it may still need to be `include`-able. The correct fix goes in a watch-only list, where it cannot affect resolution.

## In jedee

Eleventy honours `.gitignore` by default, and jedee's build writes 23 generated files into its own input directory on every pass — 18 compiled stylesheets into `src/_includes/css/` and 5 bundled scripts into `src/_includes/scripts/`, from an `eleventy.before` event. Both directories are gitignored, so for a long time the watcher never saw them.

Making the private wiki browsable locally broke that. `src/wiki/` is gitignored because it holds its own inner git repo, so the only way to make Eleventy build it was to stop honouring `.gitignore` entirely:

```js
eleventyConfig.setUseGitIgnore(false);
eleventyConfig.ignores.add('src/_raw/**');
eleventyConfig.ignores.add('src/posts/articles/-drafts/**');
```

Those two `ignores` lines put back the *content* paths `.gitignore` had been hiding. The generated directories were missed, so the watcher could suddenly see them, and every build ended by rewriting the files that start the next one. Editing one CSS value produced nine full rebuilds and exhausted the heap; with the fix later removed to confirm the cause, one edit produced 18 rebuilds and 408 self-triggers in three minutes and was still climbing.

The log names the culprit directly — one human edit followed by 23 that no one made:

```
[11ty] File changed: ./src/assets/css/global/blocks/main-nav.css
[11ty] File changed: ./src/_includes/css/cover.css      ← generated
[11ty] File changed: ./src/_includes/css/global.css     ← generated
```

The fix is two watch-only entries:

```js
eleventyConfig.watchIgnores.add('src/_includes/css/**');
eleventyConfig.watchIgnores.add('src/_includes/scripts/**');
```

`watchIgnores`, not `ignores`, for the reason above: in Eleventy 3.x `EleventyFiles.getGlobWatcherIgnores()` unions `fileIgnores` (`.gitignore` + `.eleventyignore` + `config.ignores`) with `config.watchIgnores`, and only the latter is watch-only. The compiled stylesheets still have to resolve as includes.

**The standing rule this leaves behind:** anything that calls `setUseGitIgnore(false)` takes on the job of re-ignoring, by hand, every build-generated path inside `src/`. The next candidate if it ever starts writing on a warm cache is `src/assets/og-images/`, produced by the `svgToJpeg` after-event and covered by an explicit `addWatchTarget` glob.

One entry that was added and then removed is worth recording, because the reasoning sounds right: `**/.git/**`, on the theory that Eleventy's default ignore covers only the *root* `.git/` while `src/wiki/` has its own repo, so committing wiki notes with the dev server running would start a rebuild storm. Tested afterwards, touching files in `src/wiki/.git/` triggers no rebuild with or without it. It was dead config and came out again.

The loop was not the whole story here — see [[The dev server's memory]] for the retention underneath it, which is what turned nine rebuilds into an immediate crash rather than a slow one.

Raw source: `src/_raw/dev-notes/How the dev server was made survivable.md`
