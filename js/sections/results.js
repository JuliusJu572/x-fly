// Results: headline findings, Table 1 as bars or a full table, the matched stage ladder,
// outcome attribution (Table 3) and Flow-GRPO training dynamics (Fig. 5).
// Every value comes from data/paper.js; deltas are computed here.
import { h, s, mount, segmented, onVisible, fmt, signed, countUp } from '../lib/dom.js';
import { bindTip, tipRows, showTip, hideTip } from '../lib/tooltip.js';
import { table1, metrics, metricOrder, value, row, share, failure, dynamics as dyn, betterText } from '../data/paper.js';
import { t } from '../lib/i18n.js';
import { curves } from '../data/curves.js';
import * as attr from './attribution.js';

const unitOf = (m) => metrics[m].unit;
const vtxt = (v, m) => `${fmt(v)}${unitOf(m) === '%' ? '%' : ' m'}`;
const dtxt = (v, m) => `${signed(v)} ${unitOf(m) === '%' ? 'pp' : 'm'}`;
const nameOf = (r) => `${r.label}${r.k ? `, k = ${r.k}` : ''}`;

function findings() {
  const d = (a, b, sp, m = 'SR') => value(b, sp, m) - value(a, sp, m);
  const ns = (id, sp) => share(id, sp, 'nostop');
  const F = [
    { v: d('bc8', 'dag8', 'seen'), u: 'pp',
      what: t(`SR from Recovery DAgger under full-chunk execution, test-seen (${fmt(value('bc8', 'seen', 'SR'))} → ${fmt(value('dag8', 'seen', 'SR'))}%). Test-unseen: ${dtxt(d('bc8', 'dag8', 'unseen'), 'SR')} (${fmt(value('bc8', 'unseen', 'SR'))} → ${fmt(value('dag8', 'unseen', 'SR'))}%).`,
        `整块执行下 Recovery DAgger 带来的 SR 提升，test-seen（${fmt(value('bc8', 'seen', 'SR'))} → ${fmt(value('dag8', 'seen', 'SR'))}%）。test-unseen：${dtxt(d('bc8', 'dag8', 'unseen'), 'SR')}（${fmt(value('bc8', 'unseen', 'SR'))} → ${fmt(value('dag8', 'unseen', 'SR'))}%）。`),
      src: t('Table 1, p. 6 · §4.2', '表 1，第 6 页 · §4.2') },
    { v: d('dag8', 'grpo8', 'seen'), u: 'pp',
      what: t(`SR from Flow-GRPO over the matched k = 8 recovery policy, test-seen. Test-unseen: ${dtxt(d('dag8', 'grpo8', 'unseen'), 'SR')}. Early stops fall ${fmt(share('dag8', 'seen', 'early'))} → ${fmt(share('grpo8', 'seen', 'early'))}% (seen) and ${fmt(share('dag8', 'unseen', 'early'))} → ${fmt(share('grpo8', 'unseen', 'early'))}% (unseen).`,
        `Flow-GRPO 在同为 k = 8 的 recovery 策略之上带来的 SR 提升，test-seen。test-unseen：${dtxt(d('dag8', 'grpo8', 'unseen'), 'SR')}。过早停止从 ${fmt(share('dag8', 'seen', 'early'))} → ${fmt(share('grpo8', 'seen', 'early'))}%（seen）、${fmt(share('dag8', 'unseen', 'early'))} → ${fmt(share('grpo8', 'unseen', 'early'))}%（unseen）。`),
      src: t('Table 1, p. 6 · Table 3, p. 13 · §4.3', '表 1，第 6 页 · 表 3，第 13 页 · §4.3') },
    { v: ns('dag8', 'seen') - ns('bc8', 'seen'), u: 'pp',
      what: t(`No-stop failures at k = 8 after recovery, test-seen (${fmt(ns('bc8', 'seen'))} → ${fmt(ns('dag8', 'seen'))}% of episodes). Test-unseen: ${fmt(ns('bc8', 'unseen'))} → ${fmt(ns('dag8', 'unseen'))}%. Every success now ends with an explicit STOP.`,
        `Recovery 之后 k = 8 的“未停止”失败，test-seen（${fmt(ns('bc8', 'seen'))} → ${fmt(ns('dag8', 'seen'))}%）。test-unseen：${fmt(ns('bc8', 'unseen'))} → ${fmt(ns('dag8', 'unseen'))}%。此后每次成功都以显式 STOP 结束。`),
      src: t('Table 3, p. 13 · §4.3', '表 3，第 13 页 · §4.3') },
  ];
  const ul = mount('findings');
  F.forEach((f) => {
    const num = h('span', {}, fmt(0));
    ul.append(h('li', { class: 'finding' },
      h('div', { class: 'finding__big' }, f.v >= 0 ? '+' : '−', num, h('small', {}, f.u)),
      h('p', { class: 'finding__what' }, f.what), h('p', { class: 'finding__src' }, f.src)));
    onVisible(ul, () => countUp(num, Math.abs(f.v)));
  });
}

function benchmark() {
  let split = 'seen', metric = 'SR', view = 'chart';
  const host = mount('t1');
  const sub = mount('t1-sub');
  const controls = mount('t1-controls');
  controls.append(
    segmented(t('Split', '数据划分'), [{ value: 'seen', label: 'test-seen' }, { value: 'unseen', label: 'test-unseen' }], split, (v) => { split = v; draw(); }).el,
    segmented(t('Metric', '指标'), metricOrder.map((m) => ({ value: m, label: m })), metric, (v) => { metric = v; draw(); }).el,
    segmented(t('View', '视图'), [{ value: 'chart', label: t('Chart', '图') }, { value: 'table', label: t('Table', '表') }], view, (v) => { view = v; draw(); }).el);

  const neMax = 320;
  let first = true;
  function draw() {
    const m = metrics[metric];
    sub.textContent = t(`${metric}, ${m.name.toLowerCase()} (${m.unit}), ${betterText(metric)}. ${m.def}`, `${metric}，${m.name}（${m.unit}），${betterText(metric)}。${m.def}`);
    if (view === 'table') { host.replaceChildren(fullTable()); return; }
    const max = metric === 'NE' ? neMax : 100;
    const legend = h('div', { class: 'legend' },
      h('span', {}, h('i', { class: 'sw', style: { background: 'var(--learner)' } }), t('X-Fly (full): + Flow-GRPO', 'X-Fly（完整）：+ Flow-GRPO')),
      h('span', {}, h('i', { class: 'sw', style: { background: 'var(--expert)' } }), t('DreamFly, the main prior reference', 'DreamFly，主要对比基线')),
      h('span', {}, h('i', { class: 'sw', style: { background: 'var(--muted-mark)' } }), t('Other X-Fly stages', 'X-Fly 其他阶段')),
      h('span', {}, h('i', { class: 'sw', style: { background: 'var(--muted-mark-2)' } }), t('Other prior work', '其他已有方法')));
    const bars = h('div', { class: 'bars', role: 'list' });
    let group = null;
    table1.rows.forEach((r) => {
      if (r.group !== group) {
        group = r.group;
        bars.append(h('div', { class: 'bars__group', role: 'presentation' }, group === 'prior' ? t('Prior work · native stopping', '已有方法 · 原生停止策略') : t('X-Fly · unit-temperature Bernoulli STOP, 128-control cap', 'X-Fly · 单位温度 Bernoulli STOP，128 步上限')));
      }
      const v = r[split][metricOrder.indexOf(metric)];
      const cls = r.final ? 'bar--final' : r.id === 'dreamfly' ? 'bar--ref' : r.group === 'xfly' ? 'bar--xfly' : '';
      const fill = h('span', { class: 'bar__fill', style: { width: first ? '0%' : `${(v / max) * 100}%` }, 'data-w': (v / max) * 100 });
      const el = h('div', { class: `bar ${cls}`, role: 'listitem', tabindex: '0', 'aria-label': `${nameOf(r)}: ${metric} ${vtxt(v, metric)}` },
        h('span', { class: 'bar__label' }, r.final ? h('b', {}, r.label) : r.label, r.k ? h('span', { class: 'bar__k' }, `k=${r.k}`) : null),
        h('span', { class: 'bar__track' }, fill),
        h('span', { class: 'bar__val' }, vtxt(v, metric)));
      bindTip(el, () => `<b>${nameOf(r)}</b>${r.cite ? ` · ${r.cite}` : ''}<br>test-${split}` +
        tipRows(metricOrder.map((k, i) => [`${k} ${metrics[k].better === 'higher' ? '↑' : '↓'}`, vtxt(r[split][i], k)])) +
        `<div class="tip__src">${r.stop}<br>${table1.src}</div>`);
      bars.append(el);
    });
    const ticks = (metric === 'NE' ? [0, 80, 160, 240, 320] : [0, 25, 50, 75, 100]);
    const axis = h('div', { class: 'bars__axis', 'aria-hidden': 'true' }, h('span'),
      h('div', { class: 'bars__ticks' }, ticks.map((t) => h('span', { style: { left: `${(t / max) * 100}%` } }, `${t}${metric === 'NE' ? '' : '%'}`))), h('span'));
    host.replaceChildren(legend, bars, axis);
    if (first) {
      first = false;
      onVisible(host, () => host.querySelectorAll('.bar__fill').forEach((f) => { f.style.width = `${f.dataset.w}%`; }), 0.15);
    }
  }

  function fullTable() {
    const th = (t) => h('th', { scope: 'col' }, t);
    const head = h('tr', {}, h('th', { scope: 'col' }, t('Method', '方法')),
      ...['seen', 'unseen'].flatMap((sp) => metricOrder.map((m) => th(`${sp} ${m} ${metrics[m].better === 'higher' ? '↑' : '↓'}`))));
    const body = table1.rows.map((r, i) => h('tr', { class: `${r.final ? 'is-final' : ''} ${i > 0 && r.group !== table1.rows[i - 1].group ? 'is-sep' : ''}` },
      h('th', { scope: 'row', style: { fontWeight: r.final ? 600 : 400, textAlign: 'left' } }, nameOf(r)),
      ...['seen', 'unseen'].flatMap((sp) => r[sp].map((v) => h('td', {}, fmt(v))))));
    return h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' },
      h('caption', { class: 'sr-only' }, `${table1.caption} ${table1.src}`), h('thead', {}, head), h('tbody', {}, body)));
  }
  draw();
}

function ladder() {
  let split = 'seen', metric = 'SR';
  const host = mount('ladder');
  mount('ladder-controls').append(
    segmented(t('Split', '数据划分'), [{ value: 'seen', label: 'test-seen' }, { value: 'unseen', label: 'test-unseen' }], split, (v) => { split = v; draw(); }).el,
    segmented(t('Metric', '指标'), metricOrder.map((m) => ({ value: m, label: m })), metric, (v) => { metric = v; draw(); }).el);
  // Phones get a narrower viewBox with larger type, so labels render near 10px
  // instead of shrinking with a 680-wide drawing.
  const VH = 300, PT = 22;
  let compact = false, VW = 680, PL = 52, PR = 130, PB = 46, fs = 1;
  const layout = () => {
    compact = wrap.clientWidth > 0 && wrap.clientWidth < 520;
    [VW, PL, PR, PB, fs] = compact ? [400, 46, 78, 52, 1.25] : [680, 52, 130, 46, 1];
  };
  const STAGES = [['bc', 'BC'], ['dagger', '+ Recovery DAgger'], ['grpo', '+ Flow-GRPO']];
  const X = (i) => PL + (i * (VW - PL - PR)) / 2;
  const SER = [{ k: 1, ids: ['bc1', 'dag1'], color: 'var(--expert)' }, { k: 8, ids: ['bc8', 'dag8', 'grpo8'], color: 'var(--learner)' }];
  const note = h('div', { class: 'ladder__note' });
  const wrap = h('div', { class: 'ladder' });
  host.append(h('div', { class: 'legend' },
    h('span', {}, h('i', { class: 'sw sw--line', style: { background: 'var(--expert)' } }), t('k = 1 (replan every control)', 'k = 1（每步重规划）')),
    h('span', {}, h('i', { class: 'sw sw--line', style: { background: 'var(--learner)' } }), t('k = 8 (full chunk)', 'k = 8（整块执行）'))), wrap, note);

  function draw() {
    layout();
    const mi = metricOrder.indexOf(metric);
    const max = metric === 'NE' ? 70 : 100;
    const Y = (v) => PT + (1 - v / max) * (VH - PT - PB);
    const svg = s('svg', { viewBox: `0 0 ${VW} ${VH}`, class: compact ? 'is-compact' : '', role: 'img', 'aria-label': t(`${metric} by training stage for k = 1 and k = 8, test-${split}`, `k = 1 与 k = 8 下各训练阶段的 ${metric}，test-${split}`) });
    const ticks = metric === 'NE' ? [0, 20, 40, 60] : [0, 25, 50, 75, 100];
    ticks.forEach((t) => svg.append(s('line', { x1: PL, x2: VW - PR + 20, y1: Y(t), y2: Y(t), class: t ? 'gridline' : 'baseline' }),
      s('text', { x: PL - 10, y: Y(t) + 4 * fs, 'text-anchor': 'end', class: 'ax' }, `${t}${metric === 'NE' ? ' m' : '%'}`)));
    STAGES.forEach(([, lab], i) => svg.append(s('text', { x: X(i), y: VH - 20 * fs, 'text-anchor': 'middle', class: 'ld-stage' }, lab)));
    svg.append(s('text', { x: X(2), y: VH - 4, 'text-anchor': 'middle', class: 'ax' }, compact ? t('k = 8 only', '仅 k = 8') : t('reported at k = 8 only', '仅报告 k = 8')));
    SER.forEach((ser, si) => {
      const pts = ser.ids.map((id, i) => [X(i), Y(row(id)[split][mi]), id]);
      svg.append(s('path', { d: pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(''), class: 'ld-line', stroke: ser.color, pathLength: 1 }));
      // Each delta goes on the outer side of the two lines at that segment, so the
      // pair never stacks both labels into the gap between them.
      pts.slice(1).forEach((p, i) => {
        const a = pts[i], dv = row(p[2])[split][mi] - row(a[2])[split][mi];
        const mid = (a[1] + p[1]) / 2;
        const peer = SER[1 - si].ids;
        const peerMid = peer[i + 1] ? (Y(row(peer[i])[split][mi]) + Y(row(peer[i + 1])[split][mi])) / 2 : null;
        const above = peerMid == null || mid <= peerMid;
        svg.append(s('text', { x: (a[0] + p[0]) / 2, y: mid + (above ? -12 : 22) * fs, 'text-anchor': 'middle', class: 'ld-delta' }, dtxt(dv, metric)));
      });
      pts.forEach((p) => {
        const r = row(p[2]);
        svg.append(s('circle', { cx: p[0], cy: p[1], r: 6, class: 'ld-dot', fill: ser.color }));
        const hit = s('circle', { cx: p[0], cy: p[1], r: 14, class: 'ld-hit', tabindex: '0', role: 'img', 'aria-label': `${nameOf(r)}, ${metric} ${vtxt(r[split][mi], metric)}` });
        bindTip(hit, () => `<b>${nameOf(r)}</b><br>test-${split}` + tipRows(metricOrder.map((k, i) => [k, vtxt(r[split][i], k)])) + `<div class="tip__src">${table1.src}</div>`);
        svg.append(hit);
      });
      // k=8 ends at the right edge; k=1 ends mid-chart, so its label sits on the side
      // of its dot facing away from the k=8 line to keep clear of k=8's next delta.
      const last = pts[pts.length - 1];
      // Phones show the value only; the legend right above names the series.
      const endTxt = `${compact ? '' : `k = ${ser.k} · `}${vtxt(row(last[2])[split][mi], metric)}`;
      if (si === 1) {
        svg.append(s('text', { x: last[0] + 12, y: last[1] + 4 * fs, class: 'ld-end' }, endTxt));
      } else {
        const other = Y(row('dag8')[split][mi]);
        const above = last[1] <= other;
        svg.append(s('text', { x: last[0], y: last[1] + (above ? -14 : 26) * fs, 'text-anchor': 'middle', class: 'ld-end' }, endTxt));
      }
    });
    wrap.replaceChildren(svg);
    const gap = (a, b) => row(a)[split][mi] - row(b)[split][mi];
    note.replaceChildren(
      h('div', {}, h('b', {}, dtxt(gap('bc1', 'bc8'), metric)), t(`k = 1 minus k = 8, BC, test-${split}`, `k = 1 减 k = 8，BC，test-${split}`)),
      h('div', {}, h('b', {}, dtxt(gap('dag1', 'dag8'), metric)), t(`k = 1 minus k = 8, after Recovery DAgger, test-${split}`, `k = 1 减 k = 8，Recovery DAgger 之后，test-${split}`)));
  }
  draw();
  let wasCompact = compact;
  new ResizeObserver(() => { layout(); if (compact !== wasCompact) { wasCompact = compact; draw(); } }).observe(wrap);
}

// Fig. 4 / Table 3: what each stage repairs, on the same rollouts that produced Table 1.
function attribution() {
  let split = 'seen', view = 'chart';
  const host = mount('attr');
  const notes = h('div', { class: 'attr__notes' });
  mount('attr-controls').append(
    segmented(t('Split', '数据划分'), [{ value: 'seen', label: 'test-seen' }, { value: 'unseen', label: 'test-unseen' }], split, (v) => { split = v; draw(); }).el,
    segmented(t('View', '视图'), [{ value: 'chart', label: t('Chart', '图') }, { value: 'table', label: t('Table', '表') }], view, (v) => { view = v; draw(); }).el);
  const S = (id, k) => share(id, split, k);
  const sumTerm = (id) => S(id, 'early') + S(id, 'late') + S(id, 'nostop');
  function draw() {
    if (view === 'table') { host.replaceChildren(attr.table(failure.order)); return; }
    const group = (t) => h('div', { class: 'attr__group', role: 'presentation' }, t);
    host.replaceChildren(attr.legend(),
      h('div', { class: 'attr__head', 'aria-hidden': 'true' }, h('span', {}, t('Method', '方法')), h('span', {}, t('% of episodes', 'episode 占比 %')), h('span', {}, 'SR')),
      group(t('k = 1 · replan every control', 'k = 1 · 每步重规划')),
      attr.bars([{ id: 'bc1', split }, { id: 'dag1', split }]),
      group(t('k = 8 · full chunk', 'k = 8 · 整块执行')),
      attr.bars([{ id: 'bc8', split }, { id: 'dag8', split }, { id: 'grpo8', split }]));
    notes.replaceChildren(
      h('div', {}, h('b', {}, t('Full-chunk BC fails to stop', '整块执行的 BC 停不下来')),
        t(`No-stop ${fmt(S('bc1', 'nostop'))}% at k = 1, ${fmt(S('bc8', 'nostop'))}% at k = 8, while navigation failures go ${fmt(S('bc1', 'nav'))} → ${fmt(S('bc8', 'nav'))}%. ${fmt(S('bc8', 'succns'))} of its ${fmt(value('bc8', split, 'SR'))} SR points end inside the region without STOP.`,
          `未停止：k = 1 时 ${fmt(S('bc1', 'nostop'))}%，k = 8 时 ${fmt(S('bc8', 'nostop'))}%；导航失败 ${fmt(S('bc1', 'nav'))} → ${fmt(S('bc8', 'nav'))}%。其 ${fmt(value('bc8', split, 'SR'))} 个 SR 点中有 ${fmt(S('bc8', 'succns'))} 个是没发出 STOP、恰好停在区域内。`)),
      h('div', {}, h('b', {}, t('Recovery changes both reaching and stopping', 'Recovery 同时改善到达与停止')),
        t(`At k = 8, navigation failures ${fmt(S('bc8', 'nav'))} → ${fmt(S('dag8', 'nav'))}% and no-stop ${fmt(S('bc8', 'nostop'))} → ${fmt(S('dag8', 'nostop'))}%; every success now ends with STOP. Early stops become the largest failure (${fmt(S('dag8', 'early'))}%).`,
          `k = 8 时导航失败 ${fmt(S('bc8', 'nav'))} → ${fmt(S('dag8', 'nav'))}%，未停止 ${fmt(S('bc8', 'nostop'))} → ${fmt(S('dag8', 'nostop'))}%，所有成功都以 STOP 结束。过早停止成为最大的失败类型（${fmt(S('dag8', 'early'))}%）。`)),
      h('div', {}, h('b', {}, t('Flow-GRPO reduces premature stops', 'Flow-GRPO 减少过早停止')),
        t(`Early ${fmt(S('dag8', 'early'))} → ${fmt(S('grpo8', 'early'))}%, navigation ${fmt(S('dag8', 'nav'))} → ${fmt(S('grpo8', 'nav'))}%, late ${fmt(S('dag8', 'late'))} → ${fmt(S('grpo8', 'late'))}%. Termination still accounts for ${fmt(sumTerm('grpo8'))} of the ${fmt(100 - value('grpo8', split, 'SR'))} failed points.`,
          `过早 ${fmt(S('dag8', 'early'))} → ${fmt(S('grpo8', 'early'))}%，导航 ${fmt(S('dag8', 'nav'))} → ${fmt(S('grpo8', 'nav'))}%，过晚 ${fmt(S('dag8', 'late'))} → ${fmt(S('grpo8', 'late'))}%。失败的 ${fmt(100 - value('grpo8', split, 'SR'))} 个百分点中，仍有 ${fmt(sumTerm('grpo8'))} 来自停止时机。`)));
    host.append(notes);
  }
  draw();
}

// Fig. 5: source-validation curves of the Flow-GRPO run behind Table 1 (from Recovery DAgger)
// and the same recipe from BC. Raw values from the figure's own data file, no smoothing.
function trainingDynamics() {
  let metric = 'sr';
  const host = mount('dyn');
  const readout = h('div', { class: 'ladder__note' });
  const wrap = h('div', { class: 'dyn' });
  const M = { sr: { lab: 'SR', unit: '%', better: 'higher' }, osr: { lab: 'OSR', unit: '%', better: 'higher' }, ne: { lab: 'NE', unit: ' m', better: 'lower' } };
  mount('dyn-controls').append(segmented(t('Metric', '指标'), Object.entries(M).map(([k, m]) => ({ value: k, label: m.lab })), metric, (v) => { metric = v; draw(); }).el);
  host.append(h('div', { class: 'legend' },
    h('span', {}, h('i', { class: 'sw sw--line', style: { background: 'var(--learner)' } }), t('From Recovery DAgger (the run behind Table 1)', '从 Recovery DAgger 初始化（表 1 对应的训练）')),
    h('span', {}, h('i', { class: 'sw sw--line', style: { background: 'var(--ink-3)' } }), t('From BC, same recipe', '从 BC 初始化，同一配方')),
    h('span', {}, h('i', { class: 'sw sw--line', style: { backgroundImage: 'repeating-linear-gradient(90deg, var(--ink-3) 0 4px, transparent 4px 7px)' } }), t('Each run\'s initialization', '各自的初始值'))), wrap, readout);
  const da = curves.dagger, bc = curves.bc;
  const matched = bc.step.map((st) => da.step.indexOf(st));
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;

  let compact = false;
  function draw() {
    compact = wrap.clientWidth > 0 && wrap.clientWidth < 560;
    const [VW, VH, PL, PR, PT, PB, fs] = compact ? [420, 320, 52, 66, 16, 58, 1.3] : [760, 316, 52, 92, 16, 46, 1];
    const all = [...da[metric], ...bc[metric]];
    const lo = Math.floor(Math.min(...all) / 10) * 10, hi = Math.ceil(Math.max(...all) / 10) * 10;
    const X = (st) => PL + (st / dyn.updates) * (VW - PL - PR);
    const Y = (v) => PT + (1 - (v - lo) / (hi - lo)) * (VH - PT - PB);
    const u = M[metric].unit;
    const svg = s('svg', { viewBox: `0 0 ${VW} ${VH}`, class: compact ? 'is-compact' : '', role: 'img',
      'aria-label': t(`Source-validation ${M[metric].lab} over Flow-GRPO updates. From Recovery DAgger: ${fmt(da[metric][0], 1)} to ${fmt(da[metric][da[metric].length - 1], 1)}${u} at update ${dyn.updates}. From BC: ${fmt(bc[metric][0], 1)} to ${fmt(bc[metric][bc[metric].length - 1], 1)}${u} at update ${dyn.bcStoppedAt}.`, `Flow-GRPO 训练中的源域验证 ${M[metric].lab}。从 Recovery DAgger：${fmt(da[metric][0], 1)} 到第 ${dyn.updates} 次更新时 ${fmt(da[metric][da[metric].length - 1], 1)}${u}。从 BC：${fmt(bc[metric][0], 1)} 到第 ${dyn.bcStoppedAt} 次更新时 ${fmt(bc[metric][bc[metric].length - 1], 1)}${u}。`) });
    svg.append(s('rect', { x: X(0), y: PT, width: X(dyn.bcStoppedAt) - X(0), height: VH - PT - PB, class: 'dyn-band' }),
      s('text', { x: X(dyn.bcStoppedAt) - 6, y: VH - PB - 8, 'text-anchor': 'end', class: 'dyn-bandlbl' }, compact ? '0–680' : t('matched 0–680', '对齐窗口 0–680')));
    for (let v = lo; v <= hi; v += 10) {
      svg.append(s('line', { x1: PL, x2: VW - PR, y1: Y(v), y2: Y(v), class: v === lo ? 'baseline' : 'gridline' }),
        s('text', { x: PL - 8, y: Y(v) + 4 * fs, 'text-anchor': 'end', class: 'ax' }, `${v}${u === '%' ? '%' : ' m'}`));
    }
    (compact ? [0, 1500, 3000] : [0, 500, 1000, 1500, 2000, 2500, 3000]).forEach((tk, i) =>
      svg.append(s('text', { x: X(tk), y: VH - PB + 18 * fs, 'text-anchor': i === 0 ? 'start' : 'middle', class: 'ax' }, `${tk}`)));
    svg.append(s('text', { x: (X(0) + X(dyn.updates)) / 2, y: VH - 6, 'text-anchor': 'middle', class: 'dyn-axtitle' }, t('Flow-GRPO updates', 'Flow-GRPO 更新次数')));
    const path = (r) => r.step.map((st, i) => `${i ? 'L' : 'M'}${X(st).toFixed(1)} ${Y(r[metric][i]).toFixed(1)}`).join('');
    svg.append(
      s('line', { x1: X(0), x2: X(dyn.updates), y1: Y(da[metric][0]), y2: Y(da[metric][0]), class: 'dyn-init dyn-init--da' }),
      s('line', { x1: X(0), x2: X(dyn.bcStoppedAt), y1: Y(bc[metric][0]), y2: Y(bc[metric][0]), class: 'dyn-init dyn-init--bc' }),
      s('path', { d: path(bc), class: 'dyn-line dyn-line--bc' }),
      s('path', { d: path(da), class: 'dyn-line dyn-line--da' }));
    const endDa = da[metric][da[metric].length - 1], endBc = bc[metric][bc[metric].length - 1];
    svg.append(s('text', { x: X(dyn.updates) + 8, y: Y(endDa) + 4 * fs, class: 'dyn-end' }, `${fmt(endDa, 1)}${u}`),
      s('text', { x: X(dyn.bcStoppedAt) + 8, y: Y(endBc) + 4 * fs, class: 'dyn-end' }, t(`${fmt(endBc, 1)}${u} · stopped`, `${fmt(endBc, 1)}${u} · 已停止`)));

    // Crosshair: pointer or arrow keys move to the nearest evaluation (every 20 updates).
    const cross = s('g', { style: { display: 'none' } });
    const vline = s('line', { y1: PT, y2: VH - PB, class: 'dyn-cross' });
    const pDa = s('circle', { r: 4.5, class: 'dyn-pt', fill: 'var(--learner)' });
    const pBc = s('circle', { r: 4.5, class: 'dyn-pt', fill: 'var(--ink-3)' });
    cross.append(vline, pDa, pBc);
    const hit = s('rect', { x: PL, y: PT, width: VW - PL - PR, height: VH - PT - PB, class: 'dyn-hit', tabindex: '0',
      'aria-label': t('Training curve. Use left and right arrow keys to step through evaluations.', '训练曲线，可用左右方向键逐个查看评测点。') });
    svg.append(cross, hit);
    let cur = 0;
    const show = (i, cx, cy) => {
      cur = Math.max(0, Math.min(da.step.length - 1, i));
      const st = da.step[cur], j = bc.step.indexOf(st);
      cross.style.display = '';
      vline.setAttribute('x1', X(st)); vline.setAttribute('x2', X(st));
      pDa.setAttribute('cx', X(st)); pDa.setAttribute('cy', Y(da[metric][cur]));
      pBc.style.display = j < 0 ? 'none' : '';
      if (j >= 0) { pBc.setAttribute('cx', X(st)); pBc.setAttribute('cy', Y(bc[metric][j])); }
      const rows = [[t('From Recovery DAgger', '从 Recovery DAgger'), `${fmt(da[metric][cur], 2)}${u}`], [t('From BC', '从 BC'), j < 0 ? t('stopped at 680', '680 次时已停止') : `${fmt(bc[metric][j], 2)}${u}`]];
      showTip(`<b>${t('Update', '更新')} ${st}</b> · ${M[metric].lab}` + tipRows(rows) + `<div class="tip__src">${t(`${dyn.panel} BigCity source-validation routes, one sampled STOP rollout each.`, `${dyn.panel} 条 BigCity 源域验证航线，每条一次 STOP 采样。`)} ${dyn.src}</div>`, cx, cy);
    };
    const toStep = (clientX) => {
      const r = svg.getBoundingClientRect();
      const x = ((clientX - r.left) / r.width) * VW;
      return Math.round(((x - PL) / (VW - PL - PR)) * dyn.updates / dyn.every);
    };
    hit.addEventListener('pointermove', (e) => show(toStep(e.clientX), e.clientX, e.clientY));
    hit.addEventListener('pointerleave', () => { cross.style.display = 'none'; hideTip(); });
    hit.addEventListener('focus', () => { const r = svg.getBoundingClientRect(); show(cur, r.left + r.width / 2, r.top + 20); });
    hit.addEventListener('blur', () => { cross.style.display = 'none'; hideTip(); });
    hit.addEventListener('keydown', (e) => {
      const d = { ArrowRight: 1, ArrowLeft: -1, PageUp: 10, PageDown: -10 }[e.key];
      if (!d) return;
      e.preventDefault();
      const r = svg.getBoundingClientRect();
      show(cur + d, r.left + (X(da.step[Math.max(0, Math.min(da.step.length - 1, cur + d))]) / VW) * r.width, r.top + 20);
    });
    wrap.replaceChildren(svg);

    const gDa = mean(matched.map((i) => da[metric][i] - da[metric][0]));
    const gBc = mean(bc[metric].map((v) => v - bc[metric][0]));
    const unit = metric === 'ne' ? 'm' : 'pp';
    readout.replaceChildren(
      h('div', {}, h('b', {}, `${signed(gDa, 1)} vs ${signed(gBc, 1)} ${unit}`),
        t(`Mean ${M[metric].lab} change against each run's own initialization over the ${bc.step.length} matched evaluations (updates 0–${dyn.bcStoppedAt}). Recovery-initialized first, BC-initialized second; ${M[metric].better === 'higher' ? 'higher' : 'lower'} is better.`,
          `${bc.step.length} 个对齐评测点（第 0–${dyn.bcStoppedAt} 次更新）上，${M[metric].lab} 相对各自初始值的平均变化。前者为 Recovery 初始化，后者为 BC 初始化；${M[metric].better === 'higher' ? '越高' : '越低'}越好。`)),
      h('div', {}, h('b', {}, `${signed(mean(bc[metric].map((v, j) => da[metric][matched[j]] - v)), 1)} ${unit}`),
        t(`Average gap between the two runs over the same window (derived from the Fig. 5 data), of which ${signed(da[metric][0] - bc[metric][0], 1)} ${unit} is already there at initialization.`,
          `同一窗口内两条曲线的平均差距（由图 5 数据计算），其中 ${signed(da[metric][0] - bc[metric][0], 1)} ${unit} 在初始化时就已存在。`)));
  }
  draw();
  let was = compact;
  new ResizeObserver(() => { const c = wrap.clientWidth > 0 && wrap.clientWidth < 560; if (c !== was) { was = c; draw(); } }).observe(wrap);
}

export function renderResults() { findings(); benchmark(); ladder(); attribution(); trainingDynamics(); }
