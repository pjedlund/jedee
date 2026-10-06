// Dev server only: G toggles the column grid, V the rhythm lines (dev-grid.css). State lasts for the tab via sessionStorage.
const keys = {g: 'devGrid', v: 'devRhythm'};
const root = document.documentElement;

const grid = document.createElement('div');
grid.className = 'dev-grid';
grid.append(document.createElement('div'));
document.body.append(grid);

// The rhythm lattice runs past the prose, so it needs the prose's line and start measured.
const pass = document.querySelector('.prose > .wrapper-pass');
if (pass) {
  new ResizeObserver(() => {
    root.style.setProperty('--dev-rhythm-top', `${pass.getBoundingClientRect().top + scrollY}px`);
    root.style.setProperty('--dev-rhythm-line', getComputedStyle(pass).getPropertyValue('--line'));
  }).observe(document.body);
}

for (const name of Object.values(keys)) {
  if (sessionStorage.getItem(name)) root.dataset[name] = '';
}

document.addEventListener('keydown', event => {
  const name = keys[event.key.toLowerCase()];
  if (!name || event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.target.closest('input, textarea, select, [contenteditable]')) return;
  if (name in root.dataset) {
    delete root.dataset[name];
    sessionStorage.removeItem(name);
  } else {
    root.dataset[name] = '';
    sessionStorage.setItem(name, '1');
  }
});
