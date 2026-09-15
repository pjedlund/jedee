document.querySelectorAll('.details').forEach(container => {
  const expandAllButton = container.querySelector('[data-expand-all]');
  const collapseAllButton = container.querySelector('[data-collapse-all]');
  const details = container.querySelectorAll('details');

  expandAllButton.addEventListener('click', () => {
    details.forEach(detail => (detail.open = true));
  });

  collapseAllButton.addEventListener('click', () => {
    details.forEach(detail => (detail.open = false));
  });

  details.forEach(detail => {
    detail.addEventListener('toggle', () => {
      const hash = detail.open ? `#${detail.id}` : '#';
      history.replaceState(null, '', hash);
    });
  });
});

const id = window.location.hash.slice(1);
if (id) {
  const detail = document.querySelector(`.details #${CSS.escape(id)}`);
  if (detail) detail.open = true;
}
