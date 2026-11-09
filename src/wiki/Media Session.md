---
description: "The browser API that tells a phone's lock screen, a laptop's media keys and a pair of headphones what is playing, and what their buttons should do."
date: 2026-11-09
---

When a page plays sound, the operating system shows a media control for it: on the phone's lock screen and in Control Center, in the notification shade on Android, behind a laptop's media keys. With no help from the page, the browser fills that control from what it already knows — the page title as the track name, the site's icon as the artwork, and play and pause wired to the media element. The **Media Session API** lets the page say more: a real title, an artist, artwork, and what the other buttons do.

It has two parts, both on `navigator.mediaSession`:

- **`metadata`** takes a `MediaMetadata` object with `title`, `artist`, `album` and an `artwork` list of images (`src`, optionally `sizes` and `type`).
- **`setActionHandler(action, handler)`** says what a system button does. The actions include `play`, `pause`, `stop`, `seekbackward`, `seekforward`, `seekto`, `previoustrack` and `nexttrack`. Passing `null` as the handler removes one.

```js
navigator.mediaSession.metadata = new MediaMetadata({
  title: 'Small waves',
  artist: 'Johan Edlund',
  artwork: [{src: '/assets/images/poster.jpg'}]
});
navigator.mediaSession.setActionHandler('seekforward', () => { audio.currentTime += 10; });
```

For a plain `<audio>` or `<video>` element the browser handles play and pause itself, so a page only needs handlers for what it adds. An action the browser does not know is not ignored: the call throws, so a page that sets several actions wraps each in `try`/`catch`.

The API is supported in all current major browsers, Safari from version 15. It is an enhancement in the plain sense: without it, or without JavaScript, the element plays exactly as before and the system control shows the browser's defaults.

Sources: [MDN, Media Session API](https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API); [the W3C specification](https://w3c.github.io/mediasession/); [François Beaufort, "Customize media notifications and playback controls with the Media Session API"](https://web.dev/articles/media-session) on web.dev.

## In jedee

Audio posts use it; Eleventy Excellent ships nothing like it, so all of this is jedee's own. `audio.njk` puts the title and author on the player as data attributes and loads the script only on audio posts, inside the same `{% if audio.src %}` as the player:

```jinja2
<audio class="u-audio" controls preload="metadata" src="…" data-session-title="{{ title }}" data-session-artist="{{ meta.author.name }}"></audio>
{% js "defer" %}{% include "scripts/audio-session.js" %}{% endjs %}
```

The script (`src/assets/scripts/bundle/audio-session.js`) does three things:

- **It sets the metadata on `play`, not on load.** The metadata describes what is playing, so it is set at the moment something starts.
- **The artwork is the poster already on the page.** It reads the `currentSrc` of the post's feature image, so the lock screen gets the same derivative the page loaded and no second request goes out. A post with no poster sends an empty artwork list, and the system falls back to the site icon.
- **The skip buttons jump 10 seconds**, clamped to the start and end of the recording. Each action is set inside its own `try`, because of the throw described above.

Without JavaScript, the player and the system control behave as the browser's defaults: play and pause work, and the title is the page title.

Checked in the desktop browser: playing "Small waves" set the title, the author and the beach poster. The lock screen on a real phone, and how it crops a landscape poster against a square podcast one, had not been checked when this was written. The player itself is still the browser's own; [[Vertical rhythm]] covers how its height is snapped to the line.

Raw source: `src/_raw/dev-notes/How lock-screen controls work.md`
