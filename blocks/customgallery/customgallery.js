/**
 * Custom Gallery block (EDS)
 * Turns authored images into a responsive 3×3 grid (up to 9 images).
 * Authoring is flexible—authors can paste images, links to images, or pictures.
 */

/**
 * Utility: create element with classes
 */
function el(tag, className) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  return n;
}

/**
 * Normalizes an element to a <picture> (if needed) and returns the wrapping node.
 * Works with <img>, <picture>, or an <a> that contains an image.
 */
function normalizeToPicture(node) {
  // If it's a link, look inside
  const srcEl = node.tagName === 'A' ? node.querySelector('img, picture, source') || node : node;

  // Already a picture?
  if (srcEl && srcEl.tagName === 'PICTURE') {
    return srcEl;
  }

  // If we have an <img>, wrap it in <picture> for optimal loading
  const img = srcEl && srcEl.tagName === 'IMG' ? srcEl : node.querySelector('img');
  if (img) {
    // ensure lazy loading and sane attributes
    img.loading = img.loading || 'lazy';
    img.decoding = img.decoding || 'async';
    if (!img.sizes) img.sizes = '(max-width: 900px) 50vw, (max-width: 520px) 100vw, 33vw';
    // Wrap into <picture>
    const picture = el('picture');
    img.replaceWith(picture);
    picture.append(img);
    return picture;
  }

  // As last resort, return the original node (handled by CSS)
  return node;
}

/**
 * Decorate block
 */
export default function decorate(block) {
  // Optional: if author included a heading as first element, style it
  const firstHeading = block.querySelector('h1, h2, h3, h4');
  if (firstHeading) {
    firstHeading.classList.add('gallery-title');
  }

  // Collect any images inside the block (supports flexible authoring)
  const authoredImages = [...block.querySelectorAll('img, picture')];

  // If no authored images yet, try links that might be images
  const authoredLinks = [...block.querySelectorAll('a')].filter((a) =>
    /\.(png|jpe?g|webp|avif|gif)(\?|#|$)/i.test(a.getAttribute('href') || '')
  );

  const candidates = [...authoredImages, ...authoredLinks];

  // Cap at 9 to keep 3x3 layout
  const maxItems = 9;
  const use = candidates.slice(0, maxItems);

  // Build grid
  const grid = el('div', 'gallery-grid');
  grid.setAttribute('role', 'grid');

  // Clear current content except optional heading
  const keepNodes = [];
  if (firstHeading) keepNodes.push(firstHeading);
  block.textContent = '';
  keepNodes.forEach((n) => block.append(n));
  block.append(grid);

  // Populate grid
  use.forEach((node) => {
    const item = el('div', 'gallery-item');
    item.setAttribute('role', 'gridcell');

    // Normalize to <picture> (wrap images, preserve links)
    let wrapper = node;
    const isLink = node.tagName === 'A';
    if (isLink) {
      // Keep the link; normalize its child image/picture
      const normalized = normalizeToPicture(node);
      // If normalize returned a picture that replaced its position,
      // ensure it's inside <a>
      if (normalized !== node) {
        node.textContent = '';
        node.append(normalized);
      }
      wrapper = node; // keep anchor as wrapper
    } else {
      wrapper = normalizeToPicture(node);
    }

    // Ensure alt text exists (accessibility); fall back to empty string
    const img = wrapper.querySelector('img');
    if (img && typeof img.alt === 'undefined') img.alt = '';

    // Move the element into the grid item
    item.append(wrapper);
    grid.append(item);
  });

  // If authors provided fewer than 9 images, that's fine—the grid adapts.
}
``