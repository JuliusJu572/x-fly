// Entry point: binds data-backed text, renders each section, and wires navigation, the
// language switch, BibTeX copy and reveal. Sections fail independently so one error never
// blanks the page.
import { paper, config, reach, value, share } from './data/paper.js';
import { renderHero } from './sections/hero.js';
import { renderDemos } from './sections/demos.js';
import { renderProblem } from './sections/problem.js';
import { renderMethod } from './sections/method.js';
import { renderRecovery } from './sections/recovery.js';
import { renderGrpo } from './sections/grpo.js';
import { renderResults } from './sections/results.js';
import { renderLimits } from './sections/limits.js';
import { $$, reducedMotion } from './lib/dom.js';
import { t } from './lib/i18n.js';

// Static HTML carries readable fallbacks; replace them from the data file and warn on drift.
function bindText() {
  const lookup = {
    'paper.venue': paper.venue,
    'config.bcWindows': config.bcWindows.toLocaleString('en-US'),
    'config.recoveryStops': config.recoveryStops.toLocaleString('en-US'),
    'reach.seen': reach.anchor.seen.toFixed(2),
    'reach.unseen': reach.anchor.unseen.toFixed(2),
    'reach.between': reach.denseMinusAnchorUnseen.toFixed(2),
  };
  $$('[data-bind]').forEach((el) => {
    const key = el.dataset.bind;
    let v = lookup[key];
    if (key.startsWith('value:')) {
      const [id, split, metric] = key.slice(6).split('.');
      v = value(id, split, metric).toFixed(2);
    } else if (key.startsWith('share:')) {
      const [id, split, kind] = key.slice(6).split('.');
      v = share(id, split, kind).toFixed(2);
    }
    if (v == null) { console.warn('[x-fly] unknown binding', key); return; }
    if (el.textContent.trim() !== String(v)) console.warn('[x-fly] static text differs from data', key, el.textContent, v);
    el.textContent = v;
  });
}

// The language link keeps the current section, so switching mid-page lands in the same place.
function langSwitch() {
  $$('[data-lang-link]').forEach((a) => a.addEventListener('click', () => {
    try { localStorage.setItem('x-fly-lang', a.hreflang); } catch (e) { /* storage unavailable */ }
    if (location.hash) a.href = a.getAttribute('href').split('#')[0] + location.hash;
  }));
}

function bibtex() {
  const btn = document.getElementById('bib-copy');
  const pre = document.getElementById('bib');
  if (!btn || !pre) return;
  btn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(pre.textContent.trim()); btn.textContent = t('Copied', '已复制'); }
    catch (e) { btn.textContent = t('Select and copy', '请手动复制'); }
    setTimeout(() => { btn.textContent = t('Copy', '复制'); }, 1800);
  });
}

function scrollSpy() {
  const links = $$('[data-spy]');
  const sections = [...document.querySelectorAll('main > section')];
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.setAttribute('aria-current', String(a.dataset.spy === e.target.id)));
      // Scroll only the nav strip. scrollIntoView() would also cancel the page's own
      // in-flight wheel/smooth scroll, which made scrolling stall at section boundaries.
      const active = links.find((a) => a.dataset.spy === e.target.id);
      const strip = active?.closest('.route');
      if (strip && strip.scrollWidth > strip.clientWidth) {
        const a = active.getBoundingClientRect(), r = strip.getBoundingClientRect();
        if (a.left < r.left || a.right > r.right) strip.scrollTo({ left: strip.scrollLeft + a.left - r.left - 16, behavior: 'auto' });
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => s && io.observe(s));
}

function reveal() {
  if (reducedMotion() || !('IntersectionObserver' in window)) return;
  const els = $$('.h2, .lede, .prose, .widget, .panel, .arch, .stage, .finding, .protocol, .insight__quote, .evidence, .demo__stage, .explainer, .team__grid');
  els.forEach((el) => el.classList.add('reveal'));
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  els.forEach((el) => io.observe(el));
}

bindText();
for (const [name, fn] of [['hero', renderHero], ['demos', renderDemos], ['problem', renderProblem], ['method', renderMethod],
  ['recovery', renderRecovery], ['grpo', renderGrpo], ['results', renderResults], ['limits', renderLimits]]) {
  try { fn(); } catch (err) { console.error(`[x-fly] ${name} failed to render`, err); }
}
langSwitch();
bibtex();
scrollSpy();
reveal();
