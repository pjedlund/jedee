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

**The standing rule this left behind:** anything that calls `setUseGitIgnore(false)` takes on the job of re-ignoring, by hand, every build-generated path inside `src/`. The call itself went away on 2026-09-05 when the wiki became ordinary tracked files, but the two `watchIgnores` lines stay, because the second loop below showed that `.gitignore` never covered as much as it seemed to. The next candidate if it ever starts writing on a warm cache is `src/assets/og-images/`, produced by the `svgToJpeg` after-event and covered by an explicit `addWatchTarget` glob.

One entry that was added and then removed is worth recording, because the reasoning sounds right: `**/.git/**`, on the theory that Eleventy's default ignore covers only the *root* `.git/` while `src/wiki/` has its own repo, so committing wiki notes with the dev server running would start a rebuild storm. Tested afterwards, touching files in `src/wiki/.git/` triggers no rebuild with or without it. It was dead config and came out again.

### The second loop: a writer that is not the build

A month later the dev server was dying again, this time with no edit at all — it rebuilt while a page was merely being scrolled, which pointed at images. It was not images. The trigger was Obsidian, and the mechanism is a different one from the loop above, worth keeping apart: here the build was not writing into its own watched tree; a *second program* was.

Two facts combine. The Obsidian vault for the site is `src/` itself, so Obsidian's own bookkeeping lives at `src/.obsidian/`, and it rewrites `workspace.json` there on nearly every click — a pane resize, a tab switch, scrolling a note. And Eleventy's reading of `.gitignore` is not git's. `EleventyFiles.normalizeIgnoreContent()` takes each line, joins it to the directory the ignore file sits in, and stats the result:

```js
let path = TemplateGlob.normalizePath(dir, "/", line);
path = TemplatePath.addLeadingDotSlash(TemplatePath.relativePath(path));
if (fs.statSync(path).isDirectory()) return path + "/**";
```

Git treats a bare `.obsidian` as "a `.obsidian` at any depth". Eleventy turns it into `./.obsidian/**` — anchored at the repo root, where no such folder exists — and never looks inside `src/`. So `src/.obsidian/**` was watched all along, and `.gitignore` only appeared to cover it. The same anchoring is why the first loop's `src/_includes/css` line *did* work: it was written with the full path.

The signature is the same as before — a `File changed:` line for something no one edited — and it was the only diagnostic that mattered:

```
[11ty] File changed: ./src/.obsidian/workspace.json
[11ty] Wrote 678 files in 11.54 seconds
```

A change outside the template set is not something `--incremental` can scope, so each write was a full rebuild, at the ~370 MB per pass described in [[The dev server's memory]]; the 8 GB ceiling lasted five or six clicks. The scroll correlation was real but backwards: eleventy-img's on-request mode was generating the lazily loaded images into `dist/` as they scrolled into view (the `(requested)` lines in the log), and `dist/` is never watched — it just happened while Obsidian was open beside the browser. Measured apart, with Obsidian closed and a logged server: 61 image requests, zero rebuilds; one `touch src/.obsidian/workspace.json`, one full rebuild.

The fix is one more watch-only line, for the same reason as the first two — the folder is not an input either, but `watchIgnores` is the list that cannot affect anything else:

```js
eleventyConfig.watchIgnores.add('src/.obsidian/**');
```

Verified silent afterwards for forty seconds idle, for writes to `workspace.json` and `app.json`, and for the same 61 image requests, with the process flat at 1.65 GB. The general rule that falls out: **a `.gitignore` line without a leading slash hides nothing inside the input directory from Eleventy's watcher.** Any program that writes inside `src/` — an editor's state folder, a sync client, a plugin cache — needs its own `watchIgnores` entry with the full path, and the way to find out which one is to read the `File changed:` lines before theorising about what else was happening at the time.

The loop was not the whole story here — see [[The dev server's memory]] for the retention underneath it, which is what turned nine rebuilds into an immediate crash rather than a slow one.

Raw source: `src/_raw/dev-notes/How the dev server was made survivable.md`; second loop: `src/_raw/dev-notes/How the Obsidian watch loop was found.md`
