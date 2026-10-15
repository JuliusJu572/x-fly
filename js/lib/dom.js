// Small DOM/SVG helpers shared by every section. No framework.
const SVGNS = 'http://www.w3.org/2000/svg';

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  setAttrs(el, attrs);
  append(el, children);
  return el;
}

export function s(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVGNS, tag);
  setAttrs(el, attrs);
  append(el, children);
  return el;
}

function setAttrs(el, attrs) {
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.setAttribute('class', v);
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
}

function append(el, children) {
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const mount = (name) => document.querySelector(`[data-mount="${name}"]`);

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Calls fn once when el first scrolls into view (or immediately if IO is missing).
export function onVisible(el, fn, threshold = 0.25) {
  if (!('IntersectionObserver' in window)) { fn(); return; }
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { io.disconnect(); fn(); }
  }, { threshold });
  io.observe(el);
}

export const fmt = (v, d = 2) => Number(v).toFixed(d);
export function signed(v, d = 2) { return `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(d)}`; }

// Segmented control. options: [{value, label}]. Returns {el, set(value)}.
export function segmented(label, options, initial, onChange) {
  const el = h('div', { class: 'seg', role: 'group', 'aria-label': label });
  const buttons = options.map((o) => h('button', {
    type: 'button', 'aria-pressed': String(o.value === initial),
    onclick: () => select(o.value, true),
  }, o.label));
  el.append(...buttons);
  function select(value, fire) {
    options.forEach((o, i) => buttons[i].setAttribute('aria-pressed', String(o.value === value)));
    if (fire) onChange(value);
  }
  return { el, set: (v) => select(v, false) };
}

// Animate a number from 0 to its value when visible.
export function countUp(el, to, digits = 2, ms = 1100) {
  if (reducedMotion()) { el.textContent = fmt(to, digits); return; }
  const t0 = performance.now();
  const step = (t) => {
    const p = Math.min(1, (t - t0) / ms);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(to * e, digits);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
