// AEM EDS Custom Slider block — "Help Slider"
// Mirrors the "Need Any Help?" section cards behavior/style.
// Requires /scripts/aem.js from the standard EDS boilerplate.

import {
  readBlockConfig,
  createOptimizedPicture,
  decorateIcons,
} from '../../scripts/aem.js';

/* ---------- small utils ---------- */
const uid = (p = 'hs') => `${p}-${Math.random().toString(36).slice(2, 9)}`;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const toNum = (v, d = 0) => (Number.isFinite(+v) ? +v : d);
const toBool = (v, d = true) => {
  if (v === undefined || v === null || v === '') return d;
  const s = String(v).toLowerCase();
  return !(s === 'false' || s === '0' || s === 'no');
};

/* ---------- turn the authored rows into data ---------- */
function parseItems(block) {
  const rows = [...block.children];
  const out = [];
  rows.forEach((row) => {
    const cells = [...row.children];
    if (!cells.length) return;

    const mediaCell = cells[0];
    const img = mediaCell?.querySelector('img');
    const iconName = mediaCell?.textContent?.trim() || '';

    const title = (cells[1]?.textContent || '').trim();
    const desc = (cells[2]?.textContent || '').trim();
    const linkEl = cells[3]?.querySelector('a');
    const href = linkEl?.href || '';
    const linkText = linkEl?.textContent?.trim() || 'Read more';

    if (!title) return; // minimal guard
    out.push({ img, iconName, title, desc, href, linkText });
  });
  return out;
}

/* ---------- card factory ---------- */
function buildCard(item) {
  const li = document.createElement('li');
  li.className = 'hs-slide';
  li.setAttribute('role', 'group');

  const article = document.createElement('article');
  article.className = 'hs-card';

  // media: prefer <img>, else icon name -> icon span
  const mediaWrap = document.createElement('div');
  mediaWrap.className = 'hs-media';
  if (item.img && item.img.src) {
    const pic = createOptimizedPicture(item.img.src, item.img.alt || '', false, [
      { width: 320 },
      { width: 640 },
    ]);
    mediaWrap.append(pic);
  } else if (item.iconName) {
    const span = document.createElement('span');
    span.className = `icon icon-${item.iconName}`;
    mediaWrap.append(span);
  }

  const h3 = document.createElement('h3');
  h3.className = 'hs-title';
  h3.textContent = item.title;

  const p = document.createElement('p');
  p.className = 'hs-desc';
  p.textContent = item.desc;

  const cta = document.createElement('a');
  cta.className = 'hs-link';
  if (item.href) {
    cta.href = item.href;
    cta.textContent = item.linkText || 'Read more';
    cta.setAttribute('aria-label', `${item.linkText || 'Read more'}: ${item.title}`);
  } else {
    cta.setAttribute('aria-hidden', 'true');
    cta.tabIndex = -1;
  }

  article.append(mediaWrap, h3, p, cta);
  li.append(article);
  return li;
}

/* ---------- slider wiring ---------- */
function initSlider(block, items, cfg) {
  const id = uid('help');
  block.innerHTML = '';
  block.classList.add('help-slider');

  // config & state
  const perView = clamp(toNum(cfg.perview ?? cfg.perView ?? 3, 3), 1, 5);
  const step = clamp(toNum(cfg.step ?? 1, 1), 1, perView); // shift by 1 like "overlap"
  const loop = toBool(cfg.loop, true);
  const autoplay = toNum(cfg.autoplay, 0);
  const duration = toNum(cfg.duration, 300);
  const gap = toNum(cfg.gap, 24);

  const lastStart = Math.max(0, items.length - perView);
  let index = 0;
  let timer = null;

  // viewport
  const region = document.createElement('div');
  region.className = 'hs-viewport';
  region.setAttribute('role', 'region');
  region.setAttribute('aria-roledescription', 'carousel');
  region.setAttribute('aria-live', 'polite');
  region.setAttribute('aria-label', cfg.label || 'Help Slider');
  region.tabIndex = 0;

  // track
  const ul = document.createElement('ul');
  ul.className = 'hs-slides';
  ul.id = `${id}-slides`;
  ul.style.setProperty('--gap', `${gap}px`);
  ul.style.setProperty('--per-view', String(perView));
  ul.style.setProperty('--duration', `${duration}ms`);

  items.forEach((item, i) => {
    const li = buildCard(item);
    li.setAttribute('aria-label', `${i + 1} of ${items.length}`);
    li.setAttribute('aria-hidden', i < perView ? 'false' : 'true');
    ul.append(li);
  });

  // controls
  const ctrls = document.createElement('div');
  ctrls.className = 'hs-controls';

  const prev = document.createElement('button');
  prev.type = 'button';
  prev.className = 'hs-prev';
  prev.setAttribute('aria-label', 'Previous');
  prev.setAttribute('aria-controls', ul.id);
  prev.innerHTML = '<span class="icon icon-chevron-left"></span>';

  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'hs-next';
  next.setAttribute('aria-label', 'Next');
  next.setAttribute('aria-controls', ul.id);
  next.innerHTML = '<span class="icon icon-chevron-right"></span>';

  ctrls.append(prev, next);

  // dots (starting positions)
  const starts = Math.max(1, items.length - perView + 1);
  const dots = document.createElement('ol');
  dots.className = 'hs-dots';
  for (let i = 0; i < starts; i += 1) {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.index = String(i);
    b.setAttribute('aria-label', `Show slides ${i + 1}–${Math.min(i + perView, items.length)} of ${items.length}`);
    if (i === 0) {
      b.disabled = true;
      b.setAttribute('aria-current', 'true');
    }
    li.append(b);
    dots.append(li);
  }

  region.append(ul, ctrls, dots);
  block.append(region);

  // icons (if /icons has chevron-left.svg, chevron-right.svg)
  decorateIcons(block);

  // movement helpers
  function applyTransform() {
    const shiftPct = (100 / perView) * index;
    ul.style.transform = `translateX(-${shiftPct}%)`;
    ul.style.transition = `transform var(--duration) ease`;
  }

  function updateARIA() {
    // visible window indices
    const start = index;
    const end = Math.min(index + perView - 1, items.length - 1);
    [...ul.children].forEach((li, i) => {
      li.setAttribute('aria-hidden', i < start || i > end ? 'true' : 'false');
    });
    const dotBtns = dots.querySelectorAll('button');
    dotBtns.forEach((b, i) => {
      if (i === index) {
        b.disabled = true;
        b.setAttribute('aria-current', 'true');
      } else {
        b.disabled = false;
        b.removeAttribute('aria-current');
      }
    });
  }

  function goTo(newIdx) {
    if (!loop) {
      index = clamp(newIdx, 0, lastStart);
    } else {
      if (newIdx < 0) index = lastStart;
      else if (newIdx > lastStart) index = 0;
      else index = newIdx;
    }
    applyTransform();
    updateARIA();
  }

  function nextSlide() { goTo(index + step); }
  function prevSlide() { goTo(index - step); }

  // events
  prev.addEventListener('click', prevSlide);
  next.addEventListener('click', nextSlide);
  dots.querySelectorAll('button').forEach((b) => {
    b.addEventListener('click', () => goTo(Number(b.dataset.index)));
  });

  // keyboard
  region.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); nextSlide(); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); prevSlide(); }
    if (e.key === 'Home')       { e.preventDefault(); goTo(0); }
    if (e.key === 'End')        { e.preventDefault(); goTo(lastStart); }
  });

  // autoplay
  function startAuto() {
    if (!autoplay || items.length <= perView) return;
    stopAuto();
    timer = setInterval(nextSlide, autoplay);
  }
  function stopAuto() { if (timer) { clearInterval(timer); timer = null; } }

  startAuto();
  region.addEventListener('mouseenter', stopAuto);
  region.addEventListener('mouseleave', startAuto);

  // hide controls if not needed
  if (items.length <= perView) {
    ctrls.style.display = 'none';
    dots.style.display = 'none';
  }
}

export default async function decorate(block) {
  // 1) Read optional config (key/value table above data rows)
  const cfg = readBlockConfig(block) || {};

  // Clean out any config rows (optional)
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (cells.length === 2 && /^[a-z0-9_-]+$/i.test((cells[0].textContent || '').trim())) {
      row.remove();
    }
  });

  // 2) Parse rows
  const items = parseItems(block);
  if (!items.length) return;

  // 3) Build slider
  initSlider(block, items, cfg);
}