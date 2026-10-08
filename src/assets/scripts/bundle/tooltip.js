// Esc hides whichever tooltip is showing (WCAG 1.4.13); it returns once the pointer leaves or focus moves on. See the wiki "Tooltips".
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  for (const el of document.querySelectorAll('[data-tooltip]:is(:hover, :focus-visible)')) {
    el.dataset.tooltipDismissed = '';
    for (const type of ['pointerleave', 'blur']) el.addEventListener(type, () => delete el.dataset.tooltipDismissed, {once: true});
  }
});
