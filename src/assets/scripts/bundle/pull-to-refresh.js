// Pull to refresh in the Home Screen app, in the iPhone or the Android look; the normal website is left alone.
const root = document.documentElement;
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

if (standalone) {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (/Mac/.test(navigator.userAgent) && navigator.maxTouchPoints > 1); // iPads say Mac
  const TRIGGER = 64; // px the page (iPhone) or the disc (Android) must travel to refresh
  const REST = 56; // px it rests at while refreshing
  let pullStart = null;
  let pulled = 0;
  let fired = false; // this pull has started a refresh

  const setPull = (px, mode) => {
    pulled = px;
    root.dataset.pull = mode;
    root.style.setProperty('--pull', `${px}px`);
    root.style.setProperty('--p', Math.min(1, px / TRIGGER).toFixed(3));
  };
  const letGo = () => {
    setPull(0, 'settle');
    setTimeout(() => { if (pulled === 0 && root.dataset.pull === 'settle') delete root.dataset.pull; }, 400);
  };
  const pullRefresh = () => {
    fired = true;
    root.dataset.spin = '';
    setTimeout(() => location.reload(), 500); // ponytail: a short wait so the spinner is seen turning before the page goes
  };

  root.dataset.ptr = ios ? 'ios' : 'android';
  // iPhone: the page stretches like a rubber band; Android: the disc follows the finger at half speed.
  const travel = (d) => (ios ? (1 - 1 / ((d * 0.55) / innerHeight + 1)) * innerHeight : Math.min(d * 0.5, TRIGGER * 2));
  const move = (e) => {
    const d = e.touches[0].clientY - pullStart;
    if (d <= 0 && !('pull' in root.dataset)) return;
    setPull(Math.max(0, travel(d)), 'drag');
    if (ios && !fired && pulled >= TRIGGER) pullRefresh(); // iPhone starts as soon as the line is crossed
  };
  const end = (e) => {
    for (const t of ['touchmove', 'touchend', 'touchcancel']) e.currentTarget.removeEventListener(t, t === 'touchmove' ? move : end);
    pullStart = null;
    if (!fired && pulled >= TRIGGER) pullRefresh(); // Android starts on release
    if ('spin' in root.dataset) setPull(REST, 'settle');
    else letGo();
  };
  addEventListener('touchstart', (e) => {
    if (scrollY > 0 || 'spin' in root.dataset || document.querySelector('dialog[open]')) return;
    pullStart = e.touches[0].clientY;
    fired = false;
    // ⚠ on the touched element, not window: if that element leaves the page, Safari stops sending the finger's events to window
    for (const t of ['touchmove', 'touchend', 'touchcancel']) e.target.addEventListener(t, t === 'touchmove' ? move : end, { passive: true });
  }, { passive: true });
}
