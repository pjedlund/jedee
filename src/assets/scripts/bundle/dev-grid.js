// ⌥G toggles the column grid, ⌥R the rhythm lines (dev-grid.css). State lasts for the tab via sessionStorage.
const keys = {KeyG: 'devGrid', KeyR: 'devRhythm'};
const root = document.documentElement;

const grid = document.createElement('div');
grid.className = 'dev-grid';
grid.append(document.createElement('div'));
document.body.append(grid);

// The rhythm lattice is phased to the prose's first block; a page with no prose gets the body's line from the top.
const rhythm = document.createElement('div');
rhythm.className = 'dev-rhythm';
document.body.append(rhythm);
const pass = document.querySelector('.prose > .wrapper-pass');
new ResizeObserver(() => {
  root.style.setProperty('--dev-rhythm-top', `${pass ? pass.getBoundingClientRect().top + scrollY : 0}px`);
  root.style.setProperty('--dev-rhythm-line', pass ? getComputedStyle(pass).getPropertyValue('--line') : getComputedStyle(document.body).lineHeight);
  rhythm.style.blockSize = `${root.scrollHeight}px`;
}).observe(document.body);

for (const name of Object.values(keys)) {
  if (sessionStorage.getItem(name)) root.dataset[name] = '';
}

document.addEventListener('keydown', event => {
  // event.code, because on a Mac ⌥G arrives as event.key "©".
  const name = keys[event.code];
  if (!name || !event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return;
  if (event.target.closest('input, textarea, select, [contenteditable]')) return;
  event.preventDefault();
  if (name in root.dataset) {
    delete root.dataset[name];
    sessionStorage.removeItem(name);
  } else {
    root.dataset[name] = '';
    sessionStorage.setItem(name, '1');
  }
});
