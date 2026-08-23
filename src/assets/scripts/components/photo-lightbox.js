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
      wheelToZoom: true
    });
    this.lightbox.init();
  }

  disconnectedCallback() {
    this.lightbox?.destroy();
    this.lightbox = null;
  }
}

customElements.define('photo-lightbox', PhotoLightbox);
