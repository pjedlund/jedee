// <sortable-table>: turns each column head of the table inside it into a sort button (Adrian Roselli, "Sortable Table Columns": aria-sort on the sorted head only).
// Markup contract: a cell's data-sort is its raw sort value (numeric; empty = no value, always last); cells without it sort by their text. A head's data-sort-first="ascending" makes the first click start low (pace). The server marks its own order with aria-sort on one head.

const collator = new Intl.Collator(undefined, {numeric: true});

export const keyOf = cell => {
  const raw = cell.dataset.sort ?? cell.textContent.trim();
  if (raw === '') return null;
  return 'sort' in cell.dataset ? Number(raw) : raw;
};

// Empty keys sink in either direction; ties keep the order the server wrote.
export const compareRows = (a, b, direction) => {
  if (a.key === null || b.key === null) return (a.key === null) - (b.key === null) || a.index - b.index;
  const order = typeof a.key === 'number' ? a.key - b.key : collator.compare(a.key, b.key);
  return (direction === 'ascending' ? order : -order) || a.index - b.index;
};

if (globalThis.customElements && !customElements.get('sortable-table')) {
  customElements.define(
    'sortable-table',
    class extends HTMLElement {
      connectedCallback() {
        const table = this.querySelector('table');
        if (this.body || !table?.tHead || !table.tBodies[0]) return;
        this.body = table.tBodies[0];
        this.heads = [...table.tHead.rows[0].cells];
        this.order = new Map([...this.body.rows].map((row, i) => [row, i]));
        this.heads.forEach((th, col) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.append(...th.childNodes);
          th.append(button);
          button.addEventListener('click', () => this.sort(col));
        });
        table.caption?.insertAdjacentHTML('beforeend', '<span class="visually-hidden">, column headings with buttons are sortable</span>');
      }

      sort(col) {
        const th = this.heads[col];
        const numeric = 'sort' in this.body.rows[0].cells[col].dataset;
        const current = th.getAttribute('aria-sort');
        const direction = current === 'ascending' ? 'descending' : current === 'descending' ? 'ascending' : th.dataset.sortFirst || (numeric ? 'descending' : 'ascending');
        for (const head of this.heads) head.removeAttribute('aria-sort');
        th.setAttribute('aria-sort', direction);
        const rows = [...this.body.rows].map(row => ({row, index: this.order.get(row), key: keyOf(row.cells[col])}));
        rows.sort((a, b) => compareRows(a, b, direction));
        this.body.append(...rows.map(r => r.row));
      }
    }
  );
}
