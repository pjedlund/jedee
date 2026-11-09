// Gives the phone's lock screen and Control Center the recording's title, author and poster, and lets headphone or lock-screen buttons skip 10 seconds.
const audio = document.querySelector('audio[data-session-title]');

if (audio && 'mediaSession' in navigator) {
  audio.addEventListener('play', () => {
    const img = document.querySelector('.h-entry > .feature img');
    const src = img?.currentSrc || img?.src;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: audio.dataset.sessionTitle,
      artist: audio.dataset.sessionArtist,
      artwork: src ? [{src: new URL(src, location.href).href}] : []
    });
  });

  const seek = by => () => {
    audio.currentTime = Math.min(Math.max(audio.currentTime + by, 0), audio.duration || Infinity);
  };
  // ⚠ A browser that doesn't know an action throws instead of ignoring it.
  for (const [action, handler] of [['seekbackward', seek(-10)], ['seekforward', seek(10)]]) {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch {}
  }
}
