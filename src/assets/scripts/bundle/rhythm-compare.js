// Dev server only: ?rhythm=off shows a rhythm page as it was before rhythm.css, and two tabs of the same page scroll together, block by block (wiki: Vertical rhythm).
if (new URLSearchParams(location.search).get('rhythm') === 'off') {
  document.querySelectorAll('[data-rhythm]').forEach(el => el.removeAttribute('data-rhythm'));
}

const blocks = () => [...document.querySelectorAll('.wrapper-pass > *, .e-content > *')];
const channel = new BroadcastChannel('rhythm-compare:' + location.pathname);
let following = false;

// ponytail: syncs by the block at the top of the window and how far into it you are; pages without .wrapper-pass/.e-content blocks don't sync.
addEventListener('scroll', () => {
  if (following) return void (following = false);
  const list = blocks();
  const i = list.findIndex(el => el.getBoundingClientRect().bottom > 0);
  if (i < 0) return channel.postMessage({ y: scrollY });
  const box = list[i].getBoundingClientRect();
  channel.postMessage({ i, part: -box.top / box.height });
}, { passive: true });

channel.onmessage = ({ data }) => {
  const el = blocks()[data.i];
  following = true;
  if (!el) return scrollTo(0, data.y ?? 0);
  const box = el.getBoundingClientRect();
  scrollTo(0, scrollY + box.top + data.part * box.height);
};
