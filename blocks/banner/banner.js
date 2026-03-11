export default function decorate(block) {
 
  const container = block.children[0];
  if (!container) return;
 
  /* main class */
  container.classList.add("complete-banner");
 
  /* create track */
  const track = document.createElement("div");
  track.className = "complete-banner-track";
 
}