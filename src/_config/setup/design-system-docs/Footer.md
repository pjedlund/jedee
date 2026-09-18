# Footer

Two clusters that wrap independently: the licence line with page links, then the platform icons.

## When to use

Once per page, at the end.

## What it carries

The licence line names the Soli Deo Gloria dedication and the site's own repository and version. The page links are the site's secondary navigation — style guide, imprint, privacy, accessibility.

The platform links carry `rel="me"`. That is not decoration: it is how IndieAuth and the wider IndieWeb verify that these profiles are the same person, so removing the attribute silently breaks identity verification. Each is an icon button, so each needs its own `.visually-hidden` label, and their tooltips open upward because they sit at the foot of the page.

## Known state

⚠ The footer's media query is provisional and the site's author dislikes it. Don't copy its shape when the final footer lands.
