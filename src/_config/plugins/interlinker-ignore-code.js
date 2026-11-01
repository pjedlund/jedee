// Hides code from the interlinker's dead-link DETECTION, so a `[[example]]` written inside a fence stops being reported as a dead link. Rendering already behaved — markdown-it resolves backticks first, so those examples come out literal.
//
// ⚠ Monkey-patch of plugin internals, not a supported hook, and the parser class is loaded by FILE PATH because the package exports only `index.js`. Re-check on any interlinker upgrade — the guard below fails loudly if the shape changed. See the wiki, "Link checking".

import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';

// Fences first, so the inline pass can't chew into one. Inline spans are bounded to a single line, so an unpaired backtick can swallow at most that line. Replacements are whitespace, not nothing, so neighbouring text can't be glued into a match nobody wrote.
export const stripCode = markdown =>
  markdown.replace(/(`{3,}|~{3,})[\s\S]*?\1/g, '\n').replace(/(`+)[^`\n]*?\1/g, ' ');

// The parsers run on RAW template source, so a templated href (`href="/tags/{{ tag | slugify }}/"`) is matched literally and reported dead. It can never be a real backlink, so neutralize it — leaving the rest of the tag intact.
export const stripTemplatedHrefs = markdown =>
  markdown.replace(/href="\/[^"]*\{[{%][^"]*"/g, 'href="#"');

const prepare = markdown => stripTemplatedHrefs(stripCode(markdown));

let patched = false;

// Both parsers scan the same raw markdown and are blind the same way: WikilinkParser matches [[…]], HTMLLinkParser matches href="/…". A fenced HTML or Nunjucks example trips the second one exactly as a fenced TOML table tripped the first.
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
