/* Michele Pozzo · lettore delle guide
   Shows a PDF from assets/materiali/ with PDF.js (self-hosted): continuous
   scroll, lazy rendering, page jump, zoom (buttons, keyboard, ctrl+wheel,
   pinch on touch screens), table of contents from the PDF bookmarks, working
   links and a selectable text layer. The page in the URL (#pagina=N) is kept
   up to date so a link can point to a specific page. */
import * as pdfjsLib from '../vendor/pdfjs/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;

// Guides the reader can open: lettore.html?guida=<key>
const GUIDES = {
  'il-giurista-designer-nel-prodotto': {
    title: 'Il Giurista Designer nel Prodotto',
    file: 'assets/materiali/il-giurista-designer-nel-prodotto.pdf'
  }
};
const DEFAULT_GUIDE = 'il-giurista-designer-nel-prodotto';

const ZOOM_STEPS = [0.5, 0.67, 0.8, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
const MIN_ZOOM = ZOOM_STEPS[0];
const MAX_ZOOM = ZOOM_STEPS[ZOOM_STEPS.length - 1];
const MAX_PAGE_WIDTH = 880;        // CSS px at 100%
const MAX_CANVAS_PIXELS = 8e6;     // per page, keeps memory sane on phones
const KEEP_RENDERED = 5;           // pages kept rendered around the current one

const $ = (sel) => document.querySelector(sel);
const viewer = $('#viewer');
const pagesEl = $('[data-pages]');
const statusEl = $('[data-status]');
const statusText = $('[data-status-text]');
const tools = $('[data-tools]');
const pageInput = $('[data-page-input]');
const pageCount = $('[data-page-count]');
const prevBtn = $('[data-prev]');
const nextBtn = $('[data-next]');
const zoomOutBtn = $('[data-zoom-out]');
const zoomInBtn = $('[data-zoom-in]');
const zoomFitBtn = $('[data-zoom-fit]');
const live = $('[data-live]');
const tocOpen = $('[data-toc-open]');
const tocDialog = $('[data-toc]');
const tocList = $('[data-toc-list]');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const state = {
  pdf: null,
  pages: [],          // { n, proxy, el, base:{w,h}, task, renderedGen, textLayer, textReady, linksReady }
  zoom: 1,
  fitScale: 1,
  scale: 1,
  gen: 0,             // bumps on every zoom change; stale renders are dropped
  current: 1,
  wanted: new Set(),  // pages near the viewport
  busy: false,
  toc: []             // flat list of { page, link, depth }
};

// ---------- Guide from the URL ----------
const key = new URLSearchParams(location.search).get('guida') || DEFAULT_GUIDE;
const guide = Object.prototype.hasOwnProperty.call(GUIDES, key) ? GUIDES[key] : null;

function showError(html) {
  statusEl.hidden = false;
  statusEl.classList.add('is-error');
  statusText.innerHTML = html;
}

if (!guide) {
  showError('Questa guida non esiste. <a href="./#materiali">Torna ai materiali</a>.');
} else {
  document.title = guide.title + ' · Leggi online · Michele Pozzo';
  $('[data-title]').textContent = guide.title;
  document.querySelectorAll('[data-download], [data-download-alt]').forEach((a) => { a.href = guide.file; });
  load();
}

// ---------- Loading ----------
async function load() {
  try {
    const task = pdfjsLib.getDocument({ url: guide.file, isEvalSupported: false, enableXfa: false });
    task.onProgress = ({ loaded, total }) => {
      if (total) statusText.textContent = 'Sto caricando la guida… ' + Math.min(100, Math.round(loaded / total * 100)) + '%';
    };
    state.pdf = await task.promise;
    const proxies = await Promise.all(Array.from({ length: state.pdf.numPages }, (_, i) => state.pdf.getPage(i + 1)));
    buildPages(proxies);
    computeFit();
    applyScale();
    statusEl.hidden = true;
    tools.hidden = false;
    pageCount.textContent = state.pdf.numPages;
    observePages();
    bindUI();
    buildToc();
    const fromHash = pageFromHash();
    if (fromHash > 1) goTo(fromHash, false);
    updateCurrent();
  } catch (err) {
    console.error(err);
    showError('Non riesco a mostrare la guida in questa pagina. <a href="' + guide.file + '">Apri il PDF</a> oppure scaricalo.');
  }
}

function buildPages(proxies) {
  const total = proxies.length;
  state.pages = proxies.map((proxy, i) => {
    const vp = proxy.getViewport({ scale: 1 });
    const el = document.createElement('div');
    el.className = 'page';
    el.id = 'pagina-' + (i + 1);
    el.dataset.n = i + 1;
    el.setAttribute('role', 'group');
    el.setAttribute('aria-label', 'Pagina ' + (i + 1) + ' di ' + total);
    const num = document.createElement('span');
    num.className = 'page-num';
    num.setAttribute('aria-hidden', 'true');
    num.textContent = i + 1;
    el.appendChild(num);
    pagesEl.appendChild(el);
    return { n: i + 1, proxy, el, base: { w: vp.width, h: vp.height }, task: null, renderedGen: -1, textLayer: null, textReady: null, linksReady: false };
  });
}

// ---------- Scale and layout ----------
function computeFit() {
  const gap = parseFloat(getComputedStyle(document.body).getPropertyValue('--page-gap')) || 16;
  const avail = Math.max(200, viewer.clientWidth - 2 * gap);
  const widest = Math.max(...state.pages.map((p) => p.base.w));
  state.fitScale = Math.min(avail, MAX_PAGE_WIDTH) / widest;
}

function applyScale() {
  state.scale = state.fitScale * state.zoom;
  state.pages.forEach((p) => {
    p.el.style.width = Math.round(p.base.w * state.scale) + 'px';
    p.el.style.height = Math.round(p.base.h * state.scale) + 'px';
    p.el.style.setProperty('--scale-factor', state.scale);
    if (p.textLayer) p.textLayer.update({ viewport: p.proxy.getViewport({ scale: state.scale }) });
  });
  zoomFitBtn.textContent = Math.round(state.zoom * 100) + '%';
  zoomOutBtn.disabled = state.zoom <= MIN_ZOOM + 0.001;
  zoomInBtn.disabled = state.zoom >= MAX_ZOOM - 0.001;
}

// Change the zoom keeping the point at (ax, ay) of the viewer in place.
function setZoom(zoom, ax, ay, announce) {
  zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
  if (Math.abs(zoom - state.zoom) < 0.001) return;
  if (ax === undefined) { ax = viewer.clientWidth / 2; ay = viewer.clientHeight / 3; }
  const anchor = anchorAt(ax, ay);
  state.zoom = zoom;
  rerender();
  restoreAnchor(anchor, ax, ay);
  if (announce) say('Zoom ' + Math.round(zoom * 100) + '%');
}

function anchorAt(ax, ay) {
  const y = viewer.scrollTop + ay;
  const x = viewer.scrollLeft + ax;
  let page = state.pages[0];
  for (const p of state.pages) { if (p.el.offsetTop <= y) page = p; else break; }
  return {
    page,
    fy: (y - page.el.offsetTop) / page.el.offsetHeight,
    fx: (x - page.el.offsetLeft) / page.el.offsetWidth
  };
}

function restoreAnchor(a, ax, ay) {
  viewer.scrollTop = a.page.el.offsetTop + a.fy * a.page.el.offsetHeight - ay;
  viewer.scrollLeft = a.page.el.offsetLeft + a.fx * a.page.el.offsetWidth - ax;
}

function rerender() {
  state.gen += 1;
  state.pages.forEach((p) => { if (p.task) { p.task.cancel(); p.task = null; } });
  applyScale();
  state.busy = false;
  pump();
}

function zoomStep(dir) {
  const z = state.zoom;
  const next = dir > 0 ? ZOOM_STEPS.find((s) => s > z + 0.001) : [...ZOOM_STEPS].reverse().find((s) => s < z - 0.001);
  if (next) setZoom(next, undefined, undefined, true);
}

// ---------- Rendering ----------
function observePages() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const n = Number(e.target.dataset.n);
      if (e.isIntersecting) state.wanted.add(n); else state.wanted.delete(n);
    });
    pump();
  }, { root: viewer, rootMargin: '120% 0px' });
  state.pages.forEach((p) => io.observe(p.el));
}

function pump() {
  if (state.busy) return;
  const todo = [...state.wanted]
    .map((n) => state.pages[n - 1])
    .filter((p) => p.renderedGen !== state.gen)
    .sort((a, b) => Math.abs(a.n - state.current) - Math.abs(b.n - state.current));
  if (!todo.length) { release(); return; }
  state.busy = true;
  const gen = state.gen;
  renderPage(todo[0]).catch((err) => {
    if (!err || err.name !== 'RenderingCancelledException') console.error(err);
  }).finally(() => {
    if (gen === state.gen) { state.busy = false; pump(); }
  });
}

async function renderPage(p) {
  const gen = state.gen;
  const viewport = p.proxy.getViewport({ scale: state.scale });
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  let out = dpr;
  const area = viewport.width * viewport.height;
  if (area * out * out > MAX_CANVAS_PIXELS) out = Math.sqrt(MAX_CANVAS_PIXELS / area);
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width * out);
  canvas.height = Math.floor(viewport.height * out);
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d', { alpha: false });
  p.task = p.proxy.render({
    canvasContext: ctx,
    viewport,
    transform: out !== 1 ? [out, 0, 0, out, 0, 0] : null
  });
  await p.task.promise;
  p.task = null;
  if (gen !== state.gen) return;
  const old = p.el.querySelector('canvas');
  if (old) old.replaceWith(canvas); else p.el.prepend(canvas);
  p.renderedGen = gen;
  p.el.classList.add('is-rendered');
  if (!p.textReady) p.textReady = buildText(p);
  await p.textReady;
  if (!p.linksReady) { p.linksReady = true; buildLinks(p); }
}

// Free canvases far from the current page (memory on phones).
function release() {
  state.pages.forEach((p) => {
    if (Math.abs(p.n - state.current) > KEEP_RENDERED && !state.wanted.has(p.n) && p.renderedGen !== -1) {
      const c = p.el.querySelector('canvas');
      if (c) { c.width = 0; c.height = 0; c.remove(); }
      p.renderedGen = -1;
      p.el.classList.remove('is-rendered');
    }
  });
}

async function buildText(p) {
  const content = await p.proxy.getTextContent();
  p.textContent = content;
  const div = document.createElement('div');
  div.className = 'textLayer';
  p.el.appendChild(div);
  p.textLayer = new pdfjsLib.TextLayer({ textContentSource: content, container: div, viewport: p.proxy.getViewport({ scale: state.scale }) });
  await p.textLayer.render();
  // Keep the selection end inside the page while dragging.
  const end = document.createElement('div');
  end.className = 'endOfContent';
  div.appendChild(end);
  div.addEventListener('mousedown', () => div.classList.add('selecting'));
  document.addEventListener('mouseup', () => div.classList.remove('selecting'));
}

async function buildLinks(p) {
  const annots = await p.proxy.getAnnotations({ intent: 'display' });
  const links = annots.filter((a) => a.subtype === 'Link' && (a.dest || a.url));
  if (!links.length) return;
  const vp = p.proxy.getViewport({ scale: 1 });
  const layer = document.createElement('div');
  layer.className = 'link-layer';
  for (const a of links) {
    const [x1, y1, x2, y2] = vp.convertToViewportRectangle(a.rect);
    const left = Math.min(x1, x2), top = Math.min(y1, y2);
    const w = Math.abs(x2 - x1), h = Math.abs(y2 - y1);
    const el = document.createElement('a');
    el.style.left = (left / vp.width * 100) + '%';
    el.style.top = (top / vp.height * 100) + '%';
    el.style.width = (w / vp.width * 100) + '%';
    el.style.height = (h / vp.height * 100) + '%';
    const label = textInRect(p.textContent, a.rect);
    if (a.url) {
      if (!/^(https?:|mailto:)/i.test(a.url)) continue;
      el.href = a.url;
      el.target = '_blank';
      el.rel = 'noopener';
      el.setAttribute('aria-label', (label || a.url) + ' (si apre in una nuova scheda)');
    } else {
      const target = await destToPage(a.dest);
      if (!target) continue;
      el.href = '#pagina=' + target;
      el.setAttribute('aria-label', (label ? label + ': ' : '') + 'vai a pagina ' + target);
      el.addEventListener('click', (e) => { e.preventDefault(); goTo(target, true); say('Pagina ' + target); });
    }
    layer.appendChild(el);
  }
  p.el.appendChild(layer);
}

function textInRect(content, rect) {
  if (!content) return '';
  const [x1, y1, x2, y2] = [Math.min(rect[0], rect[2]), Math.min(rect[1], rect[3]), Math.max(rect[0], rect[2]), Math.max(rect[1], rect[3])];
  return content.items
    .filter((it) => it.str && it.transform[4] >= x1 - 2 && it.transform[4] <= x2 && it.transform[5] >= y1 - 2 && it.transform[5] <= y2)
    .map((it) => it.str).join(' ').replace(/\s+/g, ' ').trim();
}

async function destToPage(dest) {
  try {
    const explicit = typeof dest === 'string' ? await state.pdf.getDestination(dest) : dest;
    if (!Array.isArray(explicit)) return 0;
    const ref = explicit[0];
    const idx = typeof ref === 'object' ? await state.pdf.getPageIndex(ref) : ref;
    return Number.isInteger(idx) ? idx + 1 : 0;
  } catch (e) { return 0; }
}

// ---------- Navigation ----------
function goTo(n, smooth) {
  n = Math.min(state.pages.length, Math.max(1, n));
  const el = state.pages[n - 1].el;
  const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  viewer.scrollTo({ top: el.offsetTop - margin, behavior: smooth && !reduceMotion ? 'smooth' : 'auto' });
  setCurrent(n);
}

let hashTimer;
function setCurrent(n) {
  if (n === state.current && pageInput.value === String(n)) return;
  state.current = n;
  if (document.activeElement !== pageInput) pageInput.value = n;
  prevBtn.disabled = n <= 1;
  nextBtn.disabled = n >= state.pages.length;
  markToc();
  clearTimeout(hashTimer);
  hashTimer = setTimeout(() => {
    history.replaceState(null, '', location.pathname + location.search + (n > 1 ? '#pagina=' + n : ''));
  }, 300);
}

function updateCurrent() {
  const y = viewer.scrollTop + viewer.clientHeight * 0.35;
  let n = 1;
  for (const p of state.pages) { if (p.el.offsetTop <= y) n = p.n; else break; }
  setCurrent(n);
  pump();
}

function pageFromHash() {
  const m = location.hash.match(/pagina[=-](\d+)/);
  return m ? Number(m[1]) : 1;
}

function say(text) {
  live.textContent = '';
  requestAnimationFrame(() => { live.textContent = text; });
}

// ---------- Table of contents ----------
async function buildToc() {
  const outline = await state.pdf.getOutline();
  if (!outline || !outline.length) return;
  const make = async (items, depth) => {
    const ol = document.createElement('ol');
    for (const it of items) {
      const page = await destToPage(it.dest);
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = page ? '#pagina=' + page : '#';
      const t = document.createElement('span');
      t.textContent = it.title;
      a.appendChild(t);
      if (page) {
        const pg = document.createElement('span');
        pg.className = 'toc-page';
        pg.textContent = 'p. ' + page;
        a.appendChild(pg);
        a.addEventListener('click', (e) => {
          e.preventDefault();
          tocDialog.close();
          goTo(page, false);
          viewer.focus({ preventScroll: true });
          say(it.title + ', pagina ' + page);
        });
        state.toc.push({ page, link: a, depth });
      }
      li.appendChild(a);
      if (it.items && it.items.length) li.appendChild(await make(it.items, depth + 1));
      ol.appendChild(li);
    }
    return ol;
  };
  const ol = await make(outline, 0);
  tocList.replaceChildren(...ol.children);
  tocOpen.disabled = false;
  markToc();
}

function markToc() {
  let active = null;
  state.toc.forEach((t) => { if (t.page <= state.current && (!active || t.page >= active.page)) active = t; });
  state.toc.forEach((t) => {
    if (t === active) t.link.setAttribute('aria-current', 'true'); else t.link.removeAttribute('aria-current');
  });
}

// ---------- UI ----------
function bindUI() {
  let ticking = false;
  viewer.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; updateCurrent(); });
  }, { passive: true });

  prevBtn.addEventListener('click', () => { goTo(state.current - 1, true); say('Pagina ' + state.current); });
  nextBtn.addEventListener('click', () => { goTo(state.current + 1, true); say('Pagina ' + state.current); });
  zoomInBtn.addEventListener('click', () => zoomStep(1));
  zoomOutBtn.addEventListener('click', () => zoomStep(-1));
  zoomFitBtn.addEventListener('click', () => setZoom(1, undefined, undefined, true));

  const commitPage = () => {
    const n = parseInt(pageInput.value, 10);
    if (Number.isInteger(n)) { goTo(n, false); say('Pagina ' + state.current); }
    pageInput.value = state.current;
  };
  pageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commitPage(); pageInput.select(); }
    if (e.key === 'Escape') { pageInput.value = state.current; pageInput.blur(); }
  });
  pageInput.addEventListener('change', commitPage);
  pageInput.addEventListener('focus', () => pageInput.select());

  tocOpen.addEventListener('click', () => {
    tocDialog.showModal();
    const cur = tocList.querySelector('[aria-current="true"]');
    if (cur) { cur.focus(); cur.scrollIntoView({ block: 'center' }); }
  });
  $('[data-toc-close]').addEventListener('click', () => tocDialog.close());
  tocDialog.addEventListener('click', (e) => { if (e.target === tocDialog) tocDialog.close(); });

  document.addEventListener('keydown', (e) => {
    if (tocDialog.open || e.altKey || e.metaKey) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    if (e.ctrlKey) {
      if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomStep(1); }
      else if (e.key === '-') { e.preventDefault(); zoomStep(-1); }
      else if (e.key === '0') { e.preventDefault(); setZoom(1, undefined, undefined, true); }
      return;
    }
    if (e.key === 'ArrowRight' && viewer.scrollWidth <= viewer.clientWidth) { e.preventDefault(); nextBtn.click(); }
    else if (e.key === 'ArrowLeft' && viewer.scrollWidth <= viewer.clientWidth) { e.preventDefault(); prevBtn.click(); }
    else if (e.key === '+' || e.key === '=') { zoomStep(1); }
    else if (e.key === '-') { zoomStep(-1); }
  });

  // Trackpad pinch and ctrl + wheel zoom around the pointer.
  viewer.addEventListener('wheel', (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    const r = viewer.getBoundingClientRect();
    setZoom(state.zoom * Math.exp(-e.deltaY / 300), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });

  bindPinch();

  // Refit when the window or the phone orientation changes.
  let resizeTimer;
  let lastWidth = viewer.clientWidth;
  new ResizeObserver(() => {
    if (Math.abs(viewer.clientWidth - lastWidth) < 2) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      lastWidth = viewer.clientWidth;
      const a = anchorAt(viewer.clientWidth / 2, 0);
      computeFit();
      rerender();
      restoreAnchor(a, viewer.clientWidth / 2, 0);
    }, 150);
  }).observe(viewer);

  window.addEventListener('hashchange', () => {
    const n = pageFromHash();
    if (n !== state.current) goTo(n, false);
  });
}

// Two-finger pinch: scale the pages with a CSS transform while the fingers
// move, then render at the new zoom when they lift.
function bindPinch() {
  let start = null;
  const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  const mid = (t) => {
    const r = viewer.getBoundingClientRect();
    return { x: (t[0].clientX + t[1].clientX) / 2 - r.left, y: (t[0].clientY + t[1].clientY) / 2 - r.top };
  };
  viewer.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 2) return;
    const m = mid(e.touches);
    start = { d: dist(e.touches), zoom: state.zoom, m, ratio: 1 };
    pagesEl.style.transformOrigin = (viewer.scrollLeft + m.x) + 'px ' + (viewer.scrollTop + m.y) + 'px';
  }, { passive: true });
  viewer.addEventListener('touchmove', (e) => {
    if (!start || e.touches.length !== 2) return;
    e.preventDefault();
    let ratio = dist(e.touches) / start.d;
    ratio = Math.min(MAX_ZOOM / start.zoom, Math.max(MIN_ZOOM / start.zoom, ratio));
    start.ratio = ratio;
    pagesEl.style.transform = 'scale(' + ratio + ')';
  }, { passive: false });
  const end = () => {
    if (!start) return;
    const s = start;
    start = null;
    pagesEl.style.transform = '';
    pagesEl.style.transformOrigin = '';
    if (Math.abs(s.ratio - 1) > 0.02) setZoom(s.zoom * s.ratio, s.m.x, s.m.y, true);
  };
  viewer.addEventListener('touchend', end);
  viewer.addEventListener('touchcancel', end);
  // Safari: stop the page-level pinch zoom inside the viewer.
  viewer.addEventListener('gesturestart', (e) => e.preventDefault());
}
