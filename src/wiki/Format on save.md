---
description: "An editor that runs a formatter every time a file is saved, and what happens to the file when the formatter can't parse it."
date: 2026-09-22
---

Most code editors can run a formatter such as [Prettier](https://prettier.io/) each time a file is saved, rewriting indentation, quotes and line breaks to one house style. It's usually an editor extension that calls the formatter, takes its output, and writes that output back over the file.

That last step is the risk. A formatter can fail: it has to parse the file first, and a file it can't parse produces an error, not formatted code. A well-behaved integration notices the error and leaves the file as it was. A careless one takes whatever came back — which on an error can be nothing at all — and saves it. The file on disk is then empty, the editor may still show the old text until it reloads, and nothing warns you.

Templates are where this bites. Prettier parses HTML, CSS and JavaScript itself, but a template language mixes its own tags into HTML, so it needs a plugin, and the plugin's parser is stricter and less complete than the language it reads. For Nunjucks and Jinja the usual one is [prettier-plugin-jinja-template](https://github.com/davidodenwald/prettier-plugin-jinja-template). A template that Eleventy renders without complaint can still be one the plugin rejects.

Three guards, from the file outward:

- **Keep the formatter off files it can't read.** Prettier skips anything listed in [`.prettierignore`](https://prettier.io/docs/ignore), which uses `.gitignore` syntax. A file the formatter never touches can't be blanked by it.
- **Look at the diff before committing.** An emptied file shows as every line deleted. `git diff --stat` makes that obvious; a commit message about something else makes it easy to miss.
- **Let git refuse it.** A [pre-commit hook](https://git-scm.com/docs/githooks#_pre_commit) runs before every commit and can stop one. A file that had content and is now empty is almost never intended, so it's a safe thing to block.

## In jedee

This happened twice, both times from Nova's Prettier extension. On 2026-07-04 it blanked `src/pages/reading.njk`, and removing the extension fixed it. By 2026-09-22 the extension was installed again. A one-word typo fix to `src/pages/styleguide.njk` saved it at 0 bytes, and the empty file was committed and pushed under the message "set to draft". The first full run of the lint caught it, because a page with no front matter has no permalink, so `/styleguide/` stopped being built and the footer link to it went dead.

Running Prettier on the restored file reproduces the failure:

```
[error] src/pages/styleguide.njk: SyntaxError: Unexpected closing tag "p". It may happen when the tag has already been closed by another tag.
```

On standard output it prints nothing: 0 bytes, exit code 2. That empty output is what reached the file.

The Prettier setup is Eleventy Excellent's: `.prettierrc` loads `prettier-plugin-jinja-template` and sends every `*.njk` file to its `jinja-template` parser. jedee only widened `printWidth`. EE's `.prettierignore` leaves most templates in scope.

jedee now has two of the three guards. `.prettierignore` ends with:

```
# ⚠ Nova's Prettier extension saves an empty file when the jinja-template parser fails on a template.
*.njk
```

so no template gets formatted by Prettier at all. That's a departure from EE, which formats templates. Whether the Nova extension reads the ignore file wasn't checked; removing the extension is the surer guard.

The pre-commit hook is local — `.git/hooks/` isn't tracked, so it doesn't come along with a fresh clone:

```sh
#!/bin/sh
# Refuses a commit that empties a file that had content; bypass with git commit --no-verify.
emptied=$(git diff --cached --name-only --diff-filter=M | while IFS= read -r f; do
  [ "$(git cat-file -s ":$f")" = 0 ] && [ "$(git cat-file -s "HEAD:$f")" != 0 ] && echo "  $f"
done)
if [ -n "$emptied" ]; then
  echo "Commit stopped: these files are now empty but had content before:"
  echo "$emptied"
  echo "Restore one with: git checkout HEAD -- <file>. If emptying it is intended, commit with --no-verify."
  exit 1
fi
```

`git cat-file -s ":path"` is the size of the staged copy and `"HEAD:path"` the size of the committed one, so the check is about what the commit would record, not what the editor shows. It only looks at modified files (`--diff-filter=M`), so deleting a file still works normally. Tested in a throwaway repository: emptying a file was blocked, an ordinary edit went through.

[[Sveltia CMS]] is the other tool here that rewrites a whole file when it saves one, with its own, milder surprise.

Raw source: `src/_raw/dev-notes/How a format-on-save extension blanked a template.md`
