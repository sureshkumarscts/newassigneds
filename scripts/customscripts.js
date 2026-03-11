import {
  buildBlock,
  loadHeader,
  loadFooter,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
} from './aem.js';

/**
 * Moves an element (`moveSelector`) to be the first child of `parentSelector`.
 * @returns {boolean} true if moved, false otherwise.
 */

function moveAsFirstChild(parentSelector, moveSelector) {
  const parent = document.querySelector(parentSelector);
  const toMove = document.querySelector(moveSelector);
  if (!parent || !toMove) return false;
  parent.prepend(toMove);
  return true;
}

//usage
document.addEventListener('DOMContentLoaded', () => {
  moveAsFirstChild('.header-wrapper', '.top-nav');
});
