// <photo-lightbox> — wires PhotoSwipe to the single <a> inside it. esbuild (src/_config/events/build-js.js) bundles PhotoSwipe into this file; the dynamic import keeps the core inlined in the same minified bundle.
import PhotoSwipeLightbox from 'photoswipe/lightbox';

class PhotoLightbox extends HTMLElement {
  connectedCallback() {
    this.lightbox = new PhotoSwipeLightbox({
      gallery: this,
      children: 'a',
      pswpModule: () => import('photoswipe'),
      // Two-step zoom: open fit-to-screen, then click/tap to 1:1 native detail (ideal for a 9437px-wide 6x17 negative). Explicit levels because PhotoSwipe's defaults cap the second step below native on wide panoramas.
      initialZoomLevel: 'fit',
      secondaryZoomLevel: 1,
      maxZoomLevel: 1,
      // Zoom with the scroll wheel alone (no Ctrl/Cmd), between fit and 1:1.
      wheelToZoom: true,
      // ⚠ A copy of misc/x.svg (Phosphor x-bold), in PhotoSwipe's own icon shape: the <use> paints its outline shadow, 2px at 32px = 16 units at 256.
      closeSVG: '<svg aria-hidden="true" class="pswp__icn" viewBox="0 0 256 256" width="32" height="32"><use class="pswp__icn-shadow" href="#pswp__icn-close" style="stroke-width:16"/><path id="pswp__icn-close" d="M208.49 191.51a12 12 0 0 1-17 17L128 145l-63.51 63.49a12 12 0 0 1-17-17L111 128L47.51 64.49a12 12 0 0 1 17-17L128 111l63.51-63.52a12 12 0 0 1 17 17L145 128Z"/></svg>'
    });
    this.lightbox.init();
  }

  disconnectedCallback() {
    this.lightbox?.destroy();
    this.lightbox = null;
  }
}

customElements.define('photo-lightbox', PhotoLightbox);
