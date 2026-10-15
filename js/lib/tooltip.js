// One shared tooltip. bind(el, contentFn) wires pointer + keyboard focus.
const tip = () => document.getElementById('tip');

export function showTip(html, x, y) {
  const t = tip();
  t.innerHTML = html;
  t.hidden = false;
  const r = t.getBoundingClientRect();
  const pad = 12;
  let left = x + 14;
  let top = y + 14;
  if (left + r.width > window.innerWidth - pad) left = x - r.width - 14;
  if (top + r.height > window.innerHeight - pad) top = y - r.height - 14;
  t.style.left = `${Math.max(pad, left)}px`;
  t.style.top = `${Math.max(pad, top)}px`;
}

export function hideTip() { tip().hidden = true; }

export function bindTip(el, contentFn) {
  el.addEventListener('pointerenter', (e) => showTip(contentFn(), e.clientX, e.clientY));
  el.addEventListener('pointermove', (e) => showTip(contentFn(), e.clientX, e.clientY));
  el.addEventListener('pointerleave', hideTip);
  el.addEventListener('focus', () => {
    const r = el.getBoundingClientRect();
    showTip(contentFn(), r.left + r.width / 2, r.top + r.height / 2);
  });
  el.addEventListener('blur', hideTip);
}

export function tipRows(rows) {
  return rows.map(([k, v]) => `<div class="tip__row"><span>${k}</span><span>${v}</span></div>`).join('');
}
