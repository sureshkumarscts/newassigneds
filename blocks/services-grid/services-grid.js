// Services Grid (3x2) — AEM EDS Block
// Visual parity with "Our Services" cards: icon/thumb + title + snippet. [1](https://www.svgrepo.com/svg/317890/chevron-left-right)
// Uses EDS boilerplate helpers from /scripts/aem.js. [4](https://www.iconpacks.net/free-icon/right-chevron-green-16130.html)

import {
  readBlockConfig,
  createOptimizedPicture,
  decorateIcons,
} from '../../scripts/aem.js';

/* ---------- small helpers ---------- */
const toNum = (v, d=0) => (Number.isFinite(+v) ? +v : d);
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/* Parse table rows into items: [media, title, summary, link] */
function parseRows(block) {
  const rows = [...block.children];
  const items = [];

  rows.forEach((row) => {
    const cells = [...row.children];
    if (!cells.length) return;

    // skip config rows (Key | Value)
    if (cells.length === 2 && /^[a-z0-9_-]+$/i.test((cells[0].textContent || '').trim())) return;

    const mediaCell = cells[0];
    const img = mediaCell?.querySelector('img') || null;
    const iconName = (mediaCell?.textContent || '').trim(); // fallback to icon name

    const title = (cells[1]?.textContent || '').trim();
    const summary = (cells[2]?.textContent || '').trim();

    const linkEl = cells[3]?.querySelector('a');
    const href = linkEl?.href || '';
    const linkText = linkEl?.textContent?.trim() || 'Read more';

    if (!title) return;
    items.push({ img, iconName, title, summary, href, linkText });
  });

  return items;
}

/* Build one service card */
function buildCard(item) {
  const li = document.createElement('li');
  li.className = 'sg-cell';
  li.setAttribute('role', 'listitem');

  const article = document.createElement('article');
  article.className = 'sg-card';

  const media = document.createElement('div');
  media.className = 'sg-media';

  if (item.img?.src) {
    const pic = createOptimizedPicture(item.img.src, item.img.alt || '', false, [
      { width: 320 }, { width: 640 },
    ]);
    media.append(pic);
  } else if (item.iconName) {
    const i = document.createElement('span');
    i.className = `icon icon-${item.iconName}`;
    media.append(i);
  }

  const h3 = document.createElement('h3');
  h3.className = 'sg-title';
  h3.textContent = item.title;

  const p = document.createElement('p');
  p.className = 'sg-summary';
  p.textContent = item.summary;

  const a = document.createElement('a');
  a.className = 'sg-link';
  if (item.href) {
    a.href = item.href;
    a.textContent = item.linkText;
    a.setAttribute('aria-label', `${item.linkText}: ${item.title}`);
  } else {
    a.setAttribute('aria-hidden', 'true');
    a.tabIndex = -1;
  }

  article.append(media, h3, p, a);
  li.append(article);
  return li;
}

export default async function decorate(block) {
  // 1) Read optional config (supports DA key/value and UE Block Options) [5](https://vectorified.com/chevron-logo-vector)
  const cfg = readBlockConfig(block) || {};
  const columns = clamp(toNum(cfg.columns ?? 3, 3), 1, 6);
  const rows = clamp(toNum(cfg.rows ?? 2, 2), 1, 6);
  const maxItems = toNum(cfg.maxitems ?? cfg.maxItems ?? (columns * rows), columns * rows);
  const gap = toNum(cfg.gap ?? 24, 24);

  // remove 2-col config rows from DOM (optional cleanup)
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (cells.length === 2 && /^[a-z0-9_-]+$/i.test((cells[0].textContent || '').trim())) row.remove();
  });

  // 2) Parse items and trim to grid size
  const items = parseRows(block).slice(0, maxItems);
  if (!items.length) return;

  // 3) Build grid wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'sg-grid';
  wrapper.setAttribute('role', 'list');
  wrapper.style.setProperty('--sg-columns', String(columns));
  wrapper.style.setProperty('--sg-gap', `${gap}px`);

  // 4) Append cells
  items.forEach((it) => wrapper.append(buildCard(it)));

  // 5) Replace and inline icons
  block.replaceChildren(wrapper);
  decorateIcons(block); // inlines /icons/*.svg from icon spans [4](https://www.iconpacks.net/free-icon/right-chevron-green-16130.html)
}
