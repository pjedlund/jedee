# Prose

Running text: the `.prose` block plus the element styles that need no class at all.

Most of the work happens globally, so a paragraph, a heading, a list and a quote are already right before `.prose` is reached. The block adds the measure, the figure style and the flow rhythm.

## When to use

Around body content — an article, a note, a wiki page. Not around UI.

## What it sets

- A 60ch measure on paragraphs, list items and quotes, with `text-wrap: pretty`.
- Old-style figures in running text, which is why `1234567890` has ascenders and descenders here. Tables switch to lining and tabular figures where digits meet columns; code switches them off entirely, because Source Code Pro has old-style figures too.
- A narrower wrapper at 64rem, against the site's 85rem.

## Blockquotes

Attribution is the last paragraph — no quote marks, no `<cite>`, the name in `.small-caps`. Quotes balance their lines rather than wrapping prettily, because they are short blocks of large text.
