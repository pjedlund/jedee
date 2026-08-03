// The interlinker finds wikilinks by running a regex over each page's raw markdown
// (WikilinkParser.find), which knows nothing about code. So every `[[example]]` written
// in prose — plus the TOML `[[plugins]]` and JS `[['default', fn]]` quoted inside fences —
// was reported as a dead link. That buried the real ones: 13 warnings, 13 false positives,
// which is the same as having no report at all.
//
// This changes DETECTION only, and therefore backlinks and the dead-link report.
// Rendering already behaved: markdown-it resolves backticks before the plugin's inline
// rule, so a wikilink inside code never reaches the renderer and comes out as literal
// `[[text]]` — which is exactly what those examples are meant to be.
//
// ⚠ This is a monkey-patch of plugin internals, not a supported hook — the plugin builds
// its own WikilinkParser and exposes no way in. The class is loaded by FILE PATH because
// the package's `exports` map publishes only `index.js`, so `import
// '@photogabble/…/src/wikilink-parser.js'` throws ERR_PACKAGE_PATH_NOT_EXPORTED. Resolving
// the published entry and stepping sideways to `src/` is what gets the same module
// instance the plugin itself imports. Re-check this on any interlinker upgrade: if the
// file moves or `find()` changes shape, the patch fails loudly (see the guard below)
// rather than silently doing nothing.

import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';

// Fenced blocks go first, so the inline pass can't chew into one. Inline spans are held to
// a single line: a stray unpaired backtick in prose would otherwise pair with the next one
// paragraphs away and silently swallow a real wikilink between them — costing a backlink
// with nothing to show for it. Bounded to one line, the worst case is one line.
// Replacements are whitespace, not nothing, so text either side can't be glued into a
// match nobody wrote.
export const stripCode = markdown =>
  markdown.replace(/(`{3,}|~{3,})[\s\S]*?\1/g, '\n').replace(/(`+)[^`\n]*?\1/g, ' ');

// The parsers run on RAW template source, before Nunjucks renders anything, so an href
// built from an expression — `href="/tags/{{ tag | slugify }}/"` in tags.njk, tagList.njk
// and entry-footer.njk — is matched as the literal string and reported dead. It can never
// be anything else: there is no page at that literal path, and by the time a real path
// exists the parsers have long since run. So these are never real backlinks and dropping
// them loses nothing. Neutralized rather than deleted, so the rest of the tag stays intact.
export const stripTemplatedHrefs = markdown =>
  markdown.replace(/href="\/[^"]*\{[{%][^"]*"/g, 'href="#"');

const prepare = markdown => stripTemplatedHrefs(stripCode(markdown));

let patched = false;

// Both parsers scan the same raw markdown and are blind the same way: WikilinkParser
// matches [[…]], HTMLLinkParser matches href="/…". A fenced HTML or Nunjucks example
// trips the second one exactly as a fenced TOML table tripped the first.
const PARSERS = ['wikilink-parser.js', 'html-link-parser.js'];

export default async function ignoreWikilinksInCode() {
  if (patched) return;

  const require = createRequire(import.meta.url);
  const src = path.join(path.dirname(require.resolve('@photogabble/eleventy-plugin-interlinker')), 'src');

  for (const file of PARSERS) {
    const parserPath = path.join(src, file);
    const {default: Parser} = await import(pathToFileURL(parserPath).href);

    if (typeof Parser?.prototype?.find !== 'function') {
      throw new Error(
        `interlinker-ignore-code: expected a find() method on the class in ${parserPath}. ` +
          `The interlinker's internals have moved — re-check this patch against the new version.`
      );
    }

    const find = Parser.prototype.find;
    Parser.prototype.find = function (document, ...rest) {
      return find.call(this, prepare(document), ...rest);
    };
  }

  patched = true;
}
