// /blocks/testimonial-slider/testimonial-slider.js
// AEM EDS Testimonial Slider block (vanilla JS)
// Uses standard helpers from /scripts/aem.js per EDS boilerplate projects.

import {
  readBlockConfig,
  createOptimizedPicture,
  decorateIcons,
} from '../../scripts/aem.js';

/**
 * Utilities
 */
const uid = (pfx = 'ts') => `${pfx}-${Math.random().toString(36).slice(2, 9)}`;

const toBool = (val, dflt = true) => {
  if (val === undefined || val === null || val === '') return dflt;
  const s = String(val).toLowerCase();
  return !(s === 'false' || s === '0' || s === 'no');
};

const toNum = (val, dflt = 0) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : dflt;
};

/**
 * Extracts slide data from the authored table.
 * Expected columns: [Image | Quote | Author | Role | Link?]
 */
function parseSlides(block) {
  const rows = [...block.children];
  const slides = [];

  rows.forEach((row) => {
    const cells = [...row.children];
    if (!cells.length) return;

    const imgEl = cells[0]?.querySelector('img');
    const quote = (cells[1]?.textContent || '').trim();
    const author = (cells[2]?.textContent || '').trim();
    const role = (cells[3]?.textContent || '').trim();
    const href = cells[4]?.querySelector('a')?.href || null;

    // Ignore malformed rows
    if (!quote) return;

    slides.push({ imgEl, quote, author, role, href });
  });

  return slides;
}

/**
 * Builds one slide <li>
 */
function buildSlide(item, idx, total, picturesizes = '(min-width: 600px) 320px, 100vw') {
  const li = document.createElement('li');
  li.className = 'ts-slide';
  li.setAttribute('role', 'group');
  li.setAttribute('aria-label', `${idx + 1} of ${total}`);
  li.setAttribute('aria-hidden', idx === 0 ? 'false' : 'true');

  const figure = document.createElement('figure');
  figure.className = 'ts-card';

  if (item.imgEl) {
    const pic = createOptimizedPicture(item.imgEl.src, item.imgEl.alt || '', false, [{ width: 320 }]);
    pic.classList.add('ts-avatar');
    figure.append(pic);
  }

  const blockquote = document.createElement('blockquote');
  blockquote.className = 'ts-quote';
  blockquote.textContent = item.quote;

  const cite = document.createElement('figcaption');
  cite.className = 'ts-meta';
  const name = document.createElement('strong');
  name.className = 'ts-name';
  name.textContent = item.author || '';
  const role = document.createElement('span');
  role.className = 'ts-role';
  role.textContent = item.role || '';

  cite.append(name);
  if (item.role) {
    cite.append(document.createTextNode(' '));
    cite.append(role);
  }

  // Optional link (e.g., case study)
  if (item.href) {
    const more = document.createElement('a');
    more.className = 'ts-link';
    more.href = item.href;
    more.textContent = 'Read more';
    more.setAttribute('aria-label', `Read more about ${item.author || 'this testimonial'}`);
    cite.append(document.createTextNode(' · '));
    cite.append(more);
  }

  figure.append(blockquote, cite);
  li.append(figure);
  return li;
}

/**
 * Initializes slider behavior
 */
function initSlider(block, slidesData, config) {
  const id = uid('testimonial');
  block.innerHTML = '';
  block.classList.add('testimonial-slider');

  // Region + viewport
  const region = document.createElement('div');
  region.className = 'ts-viewport';
  region.setAttribute('role', 'region');
  region.setAttribute('aria-roledescription', 'carousel');
  region.setAttribute('aria-live', 'polite');
  region.setAttribute('aria-label', config.label || 'Testimonials');

  // Slides list
  const list = document.createElement('ul');
  list.className = 'ts-slides';
  list.id = `${id}-slides`;
  list.style.transform = 'translateX(0%)';

  slidesData.forEach((item, idx) => {
    list.append(buildSlide(item, idx, slidesData.length));
  });

  // Controls
  const ctrls = document.createElement('div');
  ctrls.className = 'ts-controls';

  const prev = document.createElement('button');
  prev.type = 'button';
  prev.className = 'ts-prev';
  prev.setAttribute('aria-label', 'Previous testimonial');
  prev.setAttribute('aria-controls', list.id);
  prev.innerHTML = '<span class="icon icon-chevron-left"></span>';

  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'ts-next';
  next.setAttribute('aria-label', 'Next testimonial');
  next.setAttribute('aria-controls', list.id);
  next.innerHTML = '<span class="icon icon-chevron-right"></span>';

  ctrls.append(prev, next);

  // Dots (if > 1)
  const dots = document.createElement('ol');
  dots.className = 'ts-dots';
  slidesData.forEach((_, i) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', `Show slide ${i + 1} of ${slidesData.length}`);
    btn.dataset.index = String(i);
    if (i === 0) {
      btn.disabled = true;
      btn.setAttribute('aria-current', 'true');
    }
    li.append(btn);
    dots.append(li);
  });

  region.append(list, ctrls, dots);
  block.append(region);

  // optional: inline sprite icons from /icons
  decorateIcons(block);

  // State
  let index = 0;
  const last = slidesData.length - 1;
  const duration = toNum(config.duration, 300);
  const autoplay = toNum(config.autoplay, 0);
  const loop = toBool(config.loop, true);
  const pauseOnHover = toBool(config.pauseonhover ?? config.pauseOnHover, true);
  let timer = null;

  list.style.transition = `transform ${duration}ms ease`;

  const slides = [...list.children];
  const dotBtns = [...dots.querySelectorAll('button')];

  function updateARIA(newIndex) {
    slides.forEach((li, i) => {
      li.setAttribute('aria-hidden', i === newIndex ? 'false' : 'true');
    });
    dotBtns.forEach((b, i) => {
      if (i === newIndex) {
        b.disabled = true;
        b.setAttribute('aria-current', 'true');
      } else {
        b.disabled = false;
        b.removeAttribute('aria-current');
      }
    });
  }

  function goTo(newIndex) {
    if (newIndex < 0) newIndex = loop ? last : 0;
    if (newIndex > last) newIndex = loop ? 0 : last;
    index = newIndex;
    list.style.transform = `translateX(-${index * 50}%)`;
    updateARIA(index);
  }

  function nextSlide() { goTo(index + 1); }
  function prevSlide() { goTo(index - 1); }

  prev.addEventListener('click', prevSlide);
  next.addEventListener('click', nextSlide);
  dotBtns.forEach((b) => b.addEventListener('click', () => goTo(Number(b.dataset.index))));

  // Keyboard support (on the region)
  region.tabIndex = 0;
  region.addEventListener('keydown', (e) => {
    const key = e.key;
    if (key === 'ArrowRight') { e.preventDefault(); nextSlide(); }
    if (key === 'ArrowLeft')  { e.preventDefault(); prevSlide(); }
    if (key === 'Home')       { e.preventDefault(); goTo(0); }
    if (key === 'End')        { e.preventDefault(); goTo(last); }
  });

  // Autoplay
  const startAuto = () => {
    if (!autoplay || slides.length <= 1) return;
    stopAuto();
    timer = setInterval(nextSlide, autoplay);
  };
  const stopAuto = () => { if (timer) { clearInterval(timer); timer = null; } };

  if (autoplay) startAuto();
  if (pauseOnHover && autoplay) {
    region.addEventListener('mouseenter', stopAuto);
    region.addEventListener('mouseleave', startAuto);
  }
}

/**
 * Default decorate entry point
 */
export default async function decorate(block) {
  // 1) Read config from the first row (Key/Value table) if present
  //    e.g. autoplay=5000, loop=true, duration=300
  //    (Block options can also inject classes/config; adapt as needed.)
  const cfg = readBlockConfig(block) || {};

  // Remove any config row the author used (optional cleanup)
  // If your readBlockConfig doesn't strip it, this removes rows like "key | value"
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (cells.length === 2 && /^[a-z0-9_-]+$/i.test((cells[0].textContent || '').trim())) {
      const maybeVal = (cells[1].textContent || '').trim();
      if (maybeVal !== '') row.remove();
    }
  });

  // 2) Parse authored rows into data
  const slidesData = parseSlides(block);
  if (!slidesData.length) return;

  // 3) Build UI & wire behavior
  initSlider(block, slidesData, cfg);
}
