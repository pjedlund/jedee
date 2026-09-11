class customEasteregg extends HTMLElement {
  constructor() {
    super();
    // jedee: a `keyword` attribute (settings.yaml → switches.eastereggKeyword) replaces the starter's two defaults instead of adding to them.
    const customKeyword = this.getAttribute('keyword');
    this.keywords = customKeyword ? [customKeyword.toLowerCase()] : ['eleventy', 'excellent'];

    this.shape = this.getAttribute('shape') || '⭐️';
    this.particleCount = parseInt(this.getAttribute('particle-count'), 10) || 30;
    this.codes = this.keywords.map(keyword => keyword.split(''));
    this.indexes = new Array(this.keywords.length).fill(0);
  }

  connectedCallback() {
    this.onKeydown ??= this.handleKeydown.bind(this); // jedee: one bound copy, so removing the listener actually removes it
    document.addEventListener('keydown', this.onKeydown);
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this.onKeydown);
  }

  handleKeydown(event) {
    // jedee: never while typing in a field (the search box), or searching for the word would set it off.
    if (event.target.closest?.('input, textarea, select, [contenteditable]')) return;
    const key = event.key.toLowerCase();
    this.codes.forEach((code, idx) => {
      if (code[this.indexes[idx]] === key) {
        this.indexes[idx]++;
        if (this.indexes[idx] === code.length) {
          this.triggerEffect(this.keywords[idx]);
          this.indexes[idx] = 0; // Reset index after triggering
        }
      } else {
        this.indexes[idx] = 0; // Reset index if sequence breaks
      }
    });
  }

  triggerEffect(keyword) {
    console.log(`Hooray ${keyword}!`);
    // jedee: version pinned, so a new release on the CDN can't change what runs here.
    import('https://esm.run/canvas-confetti@1.9.4').then(({default: confetti}) => {
      const scalar = 4;
      const customShape = confetti.shapeFromText({text: this.shape, scalar});

      confetti({
        shapes: [customShape],
        scalar,
        particleCount: this.particleCount,
        disableForReducedMotion: true // jedee: no confetti at all for visitors who ask for reduced motion
      });
    });
  }
}

customElements.define('custom-easteregg', customEasteregg);
