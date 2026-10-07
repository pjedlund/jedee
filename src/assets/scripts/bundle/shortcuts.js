// ⌥L opens the keyboard-shortcuts dialog (partials/shortcuts.njk); Esc and its Close button are native to <dialog>.
const dialog = document.getElementById('shortcuts');

if (!/Mac|iPhone|iPad/.test(navigator.platform)) {
  for (const key of dialog.querySelectorAll('[data-pc]')) key.textContent = key.dataset.pc;
}

document.addEventListener('keydown', event => {
  // event.code, because on a Mac ⌥L arrives as event.key "¬".
  if (event.code !== 'KeyL' || !event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return;
  if (event.target.closest('input, textarea, select, [contenteditable]')) return;
  event.preventDefault();
  if (dialog.open) dialog.close();
  else dialog.showModal();
});
