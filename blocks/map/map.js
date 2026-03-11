export default function decorate(block) {
  const url = block.querySelector('a')?.href;

  if (!url) return;

  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.loading = 'lazy';
  iframe.style.border = '0';
  iframe.setAttribute('allowfullscreen', true);
  iframe.referrerPolicy = "no-referrer-when-downgrade";

  // Clear block content
  block.innerHTML = '';
  block.appendChild(iframe);
}
