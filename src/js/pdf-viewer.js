class PDFViewerElement extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    this._baseSrc = '';
    this._page = 1;
    this._zoom = 100;
    this._height = 600;
  }

  static get observedAttributes() { return ['src','height','page','zoom']; }

  attributeChangedCallback(name, oldV, newV) {
    if (oldV === newV) return;
    if (name === 'src') { this._baseSrc = newV || ''; this._updateIframe(); }
    if (name === 'height') { this._height = parseInt(newV,10) || this._height; this._updateSize(); }
    if (name === 'page') { this._page = parseInt(newV,10) || 1; this._updateIframe(); }
    if (name === 'zoom') { this._zoom = parseInt(newV,10) || 100; this._updateIframe(); }
  }

  connectedCallback() {
    // Default attributes
    if (this.hasAttribute('src')) this._baseSrc = this.getAttribute('src');
    if (this.hasAttribute('height')) this._height = parseInt(this.getAttribute('height'),10) || this._height;
    if (this.hasAttribute('page')) this._page = parseInt(this.getAttribute('page'),10) || this._page;
    if (this.hasAttribute('zoom')) this._zoom = parseInt(this.getAttribute('zoom'),10) || this._zoom;

    this._render();
    this._updateIframe();
    this._updateSize();
  }

  // Public helpers
  setSrc(url){ this.setAttribute('src', url); }
  setPage(n){ this.setAttribute('page', String(n)); }
  setZoom(z){ this.setAttribute('zoom', String(z)); }

  _render() {
    const style = document.createElement('style');
    style.textContent = `
      :host{display:block;border:1px solid #e6e6e6;border-radius:6px;overflow:hidden;background:#fff}
      .toolbar{display:flex;gap:8px;align-items:center;padding:8px;background:#fafafa;border-bottom:1px solid #eee}
      .toolbar .group{display:flex;gap:6px;align-items:center}
      .toolbar button{padding:6px 8px;border-radius:4px;border:1px solid #ccc;background:#fff;cursor:pointer}
      .toolbar input[type="range"]{width:120px}
      .viewer-wrap{width:100%;background:#333}
      iframe{width:100%;border:0;display:block}
      .info{color:#666;font-size:12px}
    `;

    this._shadow.innerHTML = `
      <div class="toolbar" part="toolbar">
        <div class="group">
          <button data-action="zoom-out" title="Zoom out">−</button>
          <input type="range" min="50" max="400" value="${this._zoom}" data-control="zoom" />
          <button data-action="zoom-in" title="Zoom in">+</button>
          <span class="info" data-zoom-text>${this._zoom}%</span>
        </div>

        <div class="group" style="margin-left:8px">
          <button data-action="page-prev" title="Previous page">◀</button>
          <input type="number" min="1" value="${this._page}" style="width:64px" data-control="page" />
          <button data-action="page-next" title="Next page">▶</button>
          <span class="info" data-page-text>page ${this._page}</span>
        </div>

        <div style="margin-left:auto" class="group">
          <a data-action="download" class="btn" target="_blank" rel="noopener" title="Download PDF">Download</a>
          <button data-action="fit" title="Fit height">Fit</button>
        </div>
      </div>
      <div class="viewer-wrap" part="viewer-wrap">
        <iframe sandbox="allow-scripts allow-same-origin" src="" aria-label="PDF document"></iframe>
      </div>
    `;
    this._shadow.appendChild(style);

    // Element references
    this._iframe = this._shadow.querySelector('iframe');
    this._zoomRange = this._shadow.querySelector('input[type="range"][data-control="zoom"]');
    this._zoomText = this._shadow.querySelector('[data-zoom-text]');
    this._pageInput = this._shadow.querySelector('input[data-control="page"]');
    this._pageText = this._shadow.querySelector('[data-page-text]');
    this._download = this._shadow.querySelector('[data-action="download"]');

    // Wire events
    this._shadow.addEventListener('click', (e) => {
      const action = e.target.getAttribute && e.target.getAttribute('data-action');
      if (!action) return;
      switch(action){
        case 'zoom-in': this._changeZoom(10); break;
        case 'zoom-out': this._changeZoom(-10); break;
        case 'page-next': this._changePage(1); break;
        case 'page-prev': this._changePage(-1); break;
        case 'fit': this._fitHeight(); break;
        case 'download': /* handled by anchor href */ break;
      }
    });

    this._zoomRange.addEventListener('input', (e)=> {
      this._zoom = parseInt(e.target.value,10);
      this._zoomText.textContent = this._zoom + '%';
      this._updateIframe();
    });

    this._pageInput.addEventListener('change', (e)=> {
      const v = parseInt(e.target.value,10) || 1;
      this._page = Math.max(1, v);
      this._pageText.textContent = `page ${this._page}`;
      this._updateIframe();
    });

    // update download href when src changes
    this._download.addEventListener('click', (e)=>{
      const href = this._buildSrcWithFragment();
      this._download.href = href;
    });
  }

  _changeZoom(delta){
    this._zoom = Math.max(50, Math.min(400, this._zoom + delta));
    this._zoomRange.value = String(this._zoom);
    this._zoomText.textContent = this._zoom + '%';
    this._updateIframe();
  }

  _changePage(delta){
    this._page = Math.max(1, this._page + delta);
    this._pageInput.value = String(this._page);
    this._pageText.textContent = `page ${this._page}`;
    this._updateIframe();
  }

  _fitHeight(){
    // quick heuristic: set zoom to 100% and let user scroll; you can extend to compute scale
    this._zoom = 100;
    this._zoomRange.value = String(this._zoom);
    this._zoomText.textContent = this._zoom + '%';
    this._updateIframe();
  }

  _buildSrcWithFragment(){
    if (!this._baseSrc) return '';
    // append fragment parameters: page and zoom. Many browsers' native viewer accept page= and zoom=
    // Example fragment: #page=2&zoom=150
    const frag = `page=${this._page}&zoom=${this._zoom}`;
    // If src already contains a fragment, replace it
    const parts = this._baseSrc.split('#');
    return parts[0] + '#' + frag;
  }

  _updateIframe(){
    if (!this._iframe) return;
    const src = this._buildSrcWithFragment();
    // set iframe src to fragment URL so native PDF viewers will navigate to page / zoom
    this._iframe.src = src || 'about:blank';
    if (this._download) this._download.href = partsSafe(this._baseSrc);
    // ensure displayed controls match state
    if (this._zoomText) this._zoomText.textContent = `${this._zoom}%`;
    if (this._pageText) this._pageText.textContent = `page ${this._page}`;
    if (this._pageInput) this._pageInput.value = String(this._page);
    function partsSafe(url){ return url ? url.split('#')[0] : ''; }
  }

  _updateSize(){
    const wrap = this._shadow.querySelector('.viewer-wrap');
    const iframe = this._iframe;
    if (wrap) wrap.style.height = (this._height ? (this._height + 'px') : '600px');
    if (iframe) iframe.style.height = (this._height ? (this._height + 'px') : '600px');
  }
}

customElements.define('pdf-viewer', PDFViewerElement);