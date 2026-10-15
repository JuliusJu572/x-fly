// Per-episode outcome attribution (Fig. 4 / Table 3): each first-stop outcome is one of two
// success types or exactly one failure, so a row is a 100 % stacked bar. Shared by the Problem,
// Results and Limits sections. Segment order puts every termination failure next to
// success and navigation last, so "reached the region" is one contiguous span.
import { h, fmt } from '../lib/dom.js';
import { bindTip, tipRows } from '../lib/tooltip.js';
import { failure, share, value, row, table1 } from '../data/paper.js';
import { t } from '../lib/i18n.js';

export const KINDS = ['succ', 'succns', 'early', 'late', 'nostop', 'nav'].map((id) => failure.kinds.find((k) => k.id === id));
export const pctOf = (id, split, kind) => share(id, split, kind);
const nameOf = (id) => { const r = row(id); return `${r.label}, k = ${r.k}`; };

export function legend() {
  return h('div', { class: 'legend attr__legend' }, KINDS.map((k) =>
    h('span', {}, h('i', { class: `sw attr-sw--${k.id}` }), k.label)));
}

function tip(id, split) {
  return () => `<b>${nameOf(id)}</b> · test-${split}` +
    tipRows(KINDS.map((k) => [k.label, `${fmt(pctOf(id, split, k.id))}%`])) +
    `<div class="tip__src">${t('Shares are expectations under the first-stop distribution and sum to 100.', '各项为首次停止分布下的期望，合计 100。')} ${failure.src}</div>`;
}

// rows: [{ id, split, label?, sub? }]. opts.bracket draws the anchor-reach span
// (everything except navigation) above the bar, as in §4.3.
export function bars(rows, opts = {}) {
  const wrap = h('div', { class: 'attr', role: 'list' });
  rows.forEach(({ id, split, label, sub }) => {
    const r = row(id);
    const segs = KINDS.map((k) => {
      const v = pctOf(id, split, k.id);
      return h('span', { class: `attr__seg attr-seg--${k.id}`, style: { flexGrow: v, flexBasis: 0 }, 'data-v': v, 'data-kind': k.id },
        h('span', { class: 'attr__in' }, fmt(v, 1)));
    });
    const track = h('div', { class: 'attr__track' }, segs);
    const plot = h('div', { class: 'attr__plot' });
    if (opts.bracket) {
      const reached = 100 - share(id, split, 'nav');
      plot.append(h('div', { class: 'attr__bracket', style: { width: `${reached}%` } },
        h('span', {}, t(`anchor reach ${fmt(reached)}%`, `锚点到达 ${fmt(reached)}%`))));
    }
    plot.append(track);
    const el = h('div', { class: `attr__row${r.final ? ' is-final' : ''}`, role: 'listitem', tabindex: '0',
      'aria-label': `${label || nameOf(id)}, test-${split}: ` + KINDS.map((k) => `${k.label} ${fmt(pctOf(id, split, k.id))}%`).join(', ') },
      h('span', { class: 'attr__lbl' }, label || (r.final ? h('b', {}, r.label) : r.label),
        h('span', { class: 'bar__k' }, sub ?? `k=${r.k}`)),
      plot,
      h('span', { class: 'attr__sr' }, `${fmt(value(id, split, 'SR'))}%`));
    bindTip(el, tip(id, split));
    wrap.append(el);
  });
  // Show a share inside its segment only when the number fits.
  // The bracket ends exactly where the navigation segment starts (segments have gaps).
  const fit = () => {
    wrap.querySelectorAll('.attr__seg').forEach((sg) => {
      sg.classList.toggle('is-tight', sg.firstChild.scrollWidth + 8 > sg.clientWidth);
    });
    wrap.querySelectorAll('.attr__plot').forEach((p) => {
      const b = p.querySelector('.attr__bracket'), nav = p.querySelector('.attr-seg--nav');
      if (b && nav) b.style.width = `${nav.offsetLeft - 2}px`;
    });
  };
  new ResizeObserver(fit).observe(wrap);
  requestAnimationFrame(fit);
  return wrap;
}

export function table(ids) {
  const head = h('tr', {}, h('th', { scope: 'col' }, t('Method', '方法')),
    ...['seen', 'unseen'].flatMap((sp) => KINDS.map((k) => h('th', { scope: 'col' }, `${sp} ${k.label}`))));
  const body = ids.map((id) => h('tr', { class: row(id).final ? 'is-final' : '' },
    h('th', { scope: 'row', style: { fontWeight: row(id).final ? 600 : 400, textAlign: 'left' } }, nameOf(id)),
    ...['seen', 'unseen'].flatMap((sp) => KINDS.map((k) => h('td', {}, fmt(pctOf(id, sp, k.id)))))));
  return h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' },
    h('caption', { class: 'sr-only' }, t(`Outcome attribution, % of episodes. The two success columns sum to SR (${table1.src}). ${failure.src}`, `结果归因（episode 占比 %）。两列成功之和等于 SR（${table1.src}）。${failure.src}`)),
    h('thead', {}, head), h('tbody', {}, body)));
}
