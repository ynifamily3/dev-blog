if (!('interestForElement' in HTMLAnchorElement.prototype) && 'showPopover' in HTMLElement.prototype) {
  const references = document.querySelectorAll('a[data-footnote-ref][interestfor]');
  let openTimer;
  let closeTimer;
  let active;

  function hide() {
    clearTimeout(openTimer);
    clearTimeout(closeTimer);
    if (active?.preview.matches(':popover-open')) active.preview.hidePopover();
    active = undefined;
  }

  function positionPreview() {
    if (!active) return;
    const { reference, preview } = active;
    const anchor = reference.getBoundingClientRect();
    const box = preview.getBoundingClientRect();
    const left = Math.max(12, Math.min(anchor.left + anchor.width / 2 - box.width / 2, innerWidth - box.width - 12));
    const above = anchor.top >= box.height + 16;
    const top = above ? anchor.top - box.height - 12 : anchor.bottom + 12;
    preview.style.left = `${left}px`;
    preview.style.top = `${top}px`;
    preview.dataset.placement = above ? 'top' : 'bottom';
    preview.style.setProperty('--footnote-arrow-left', `${Math.max(12, Math.min(anchor.left + anchor.width / 2 - left, box.width - 12))}px`);
  }

  function show(reference, preview) {
    hide();
    active = { reference, preview };
    preview.classList.add('footnote-preview-fallback');
    preview.showPopover();
    positionPreview();
  }

  function scheduleClose() {
    clearTimeout(openTimer);
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      if (active && (active.reference === document.activeElement || active.reference.matches(':hover') || active.preview.matches(':hover'))) return;
      hide();
    }, 200);
  }

  for (const reference of references) {
    const preview = document.getElementById(reference.getAttribute('interestfor'));
    if (!preview) continue;

    reference.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'touch') return;
      clearTimeout(openTimer);
      clearTimeout(closeTimer);
      openTimer = setTimeout(() => show(reference, preview), 150);
    });
    reference.addEventListener('pointerleave', scheduleClose);
    reference.addEventListener('focus', () => show(reference, preview));
    reference.addEventListener('blur', scheduleClose);
    reference.addEventListener('click', hide);
    preview.addEventListener('pointerenter', () => clearTimeout(closeTimer));
    preview.addEventListener('pointerleave', scheduleClose);
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') hide();
  });
  addEventListener('scroll', positionPreview, { passive: true });
  addEventListener('resize', positionPreview);
}
