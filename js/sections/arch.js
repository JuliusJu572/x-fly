// Interactive redraw of the policy backbone (Fig. 3, §3.2, App. A.2) as three lanes:
// slow system (VLM over instruction + keyframe cache), fast system (visual tower on the
// current frame) and executed state. Pulses travel at each lane's real cadence under
// full-chunk execution: fast and state every decision, slow only when the keyframe cache
// refreshes (every 16 waypoints = every 2nd decision at k = 8). Small screens get cards.
import { h, s, segmented, reducedMotion } from '../lib/dom.js';
import { config as C, cost } from '../data/paper.js';
import { t } from '../lib/i18n.js';

const VW = 1200, VH = 512;
const LANES = [
  { g: 'slow', y: 16, h: 190, t: t('SLOW SYSTEM', '慢系统'), r: t(`refresh every ${C.refresh} waypoints · ${cost.slow.toFixed(3)} s`, `每 ${C.refresh} 个航点刷新 · ${cost.slow.toFixed(3)} s`) },
  { g: 'fast', y: 216, h: 104, t: t('FAST SYSTEM', '快系统'), r: t(`every decision · ${cost.visual.toFixed(3)} s`, `每次决策 · ${cost.visual.toFixed(3)} s`) },
  { g: 'motion', y: 330, h: 104, t: t('EXECUTED STATE', '已执行状态'), r: t('every decision · relative only', '每次决策 · 仅相对量') },
];
// Geometry in viewBox units; text lines are [class, string].
const GEO = {
  instr: [36, 50, 214, 54], cache: [36, 134, 214, 54], vlm: [296, 62, 210, 114],
  obsq: [548, 50, 204, 54], navq: [548, 134, 204, 54],
  rgb: [36, 254, 214, 54], tower: [296, 250, 210, 62], curq: [548, 254, 204, 54],
  ego: [36, 368, 214, 54], sa: [548, 368, 204, 54],
  fusion: [820, 50, 156, 372], flow: [1026, 104, 150, 118], stop: [1026, 280, 150, 98],
};
const EDGES = [
  ['instr', 'vlm', 'slow', 0, true], ['cache', 'vlm', 'slow', 0, true],
  ['vlm', 'obsq', 'slow', 1, true], ['vlm', 'navq', 'slow', 1, true],
  ['rgb', 'tower', 'fast', 0], ['tower', 'curq', 'fast', 1],
  ['ego', 'sa', 'motion', 0, false, 2],
  ['obsq', 'fusion', 'slow', 2], ['navq', 'fusion', 'slow', 2, false, 1, 'mem'], ['curq', 'fusion', 'fast', 2], ['sa', 'fusion', 'motion', 2],
  ['fusion', 'flow', 'head', 3], ['fusion', 'stop', 'head', 3],
].map(([a, b, g, st, slowOnly, span = 1, kind]) => ({ a, b, g, st, slowOnly: !!slowOnly, span, kind }));
const FOCUS = {
  all: null,
  slow: ['instr', 'cache', 'vlm', 'obsq', 'navq', 'fusion'],
  fast: ['rgb', 'tower', 'curq', 'fusion'],
  heads: ['ego', 'sa', 'fusion', 'flow', 'stop'],
};
const STAGE = 0.46, WP = 0.17, PAUSE = 0.5, EXEC0 = 4 * STAGE;
const CYCLE = EXEC0 + C.H * WP + PAUSE;
const TAG = {
  frozen: t('Frozen', '冻结'), head: t('Output head', '输出头'), fusion: t('Trained · fusion', '训练 · 融合'),
  slow: t('Slow system', '慢系统'), fast: t('Fast system', '快系统'), motion: t('Executed state', '已执行状态'),
};

function anchor(n, side, yWant) {
  const [x, y, w, hh] = GEO[n];
  const yy = yWant == null ? y + hh / 2 : Math.min(Math.max(yWant, y + 18), y + hh - 18);
  return [side === 'r' ? x + w : x, yy];
}
function edgePath(e) {
  const [x1, y1] = anchor(e.a, 'r');
  const [x2, y2] = anchor(e.b, 'l', GEO[e.b][3] > 120 ? y1 : null);
  if (Math.abs(y1 - y2) < 0.5) return `M${x1} ${y1}H${x2 - 3}`;
  const mx = (x1 + x2) / 2;
  return `M${x1} ${y1}C${mx} ${y1} ${mx} ${y2} ${x2 - 3} ${y2}`;
}

function lines(n) {
  const L = { fusion: [['arch-t', n.t], ['arch-s', `${C.fusionBlocks} × pre-LN`], ['arch-s', t(`width ${C.width}`, `宽 ${C.width}`)], ['arch-s', t(`${C.fusionHeads} heads`, `${C.fusionHeads} 头`)], ['arch-s', `${cost.fusion.toFixed(3)} s`]],
    vlm: [['arch-t', n.t], ['arch-s', t('decoder hidden states', '解码器隐状态')]],
    tower: [['arch-t', n.t], ['arch-s', t('current frame only', '仅当前帧')]],
    rgb: [['arch-t', n.t], ['arch-s', t('448 × 448 input', '448 × 448 输入')]],
    ego: [['arch-t', t('Ego state + history', '自身状态 + 历史')], ['arch-s', n.sub]],
    navq: [['arch-t', n.t], ['arch-s', t('cross-attn memory', '交叉注意力记忆')]],
    sa: [['arch-t', t('State tokens', '状态 token')], ['arch-s', t('10 tokens', '10 个 token')]],
    flow: [['arch-t', 'Rectified-flow'], ['arch-t', 'DiT'], ['arch-s', t(`${C.H} × ${C.D} chunk`, `${C.H} × ${C.D} 控制块`)], ['arch-s', `${C.euler} Euler · ${C.ditParams}`]],
    stop: [['arch-t', n.t], ['arch-s', 'Bernoulli σ(ℓ)'], ['arch-s', 'STOP / CONTINUE']] };
  return L[n.id] || [['arch-t', n.t], ['arch-s', n.sub]];
}

// Shrink any text line that would overrun its box; runs once the SVG is laid out.
function fit(svg) {
  svg.querySelectorAll('[data-maxw]').forEach((el) => {
    el.style.fontSize = '';
    const w = el.getComputedTextLength(), max = +el.dataset.maxw;
    if (w > max) el.style.fontSize = `${(parseFloat(getComputedStyle(el).fontSize) * max) / w}px`;
  });
}

export function renderArch(host, NODES, GROUPS) {
  const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));
  const wrap = h('div', { class: 'archx' });
  const svg = s('svg', { viewBox: `0 0 ${VW} ${VH}`, class: 'archx__svg', role: 'group',
    'aria-label': t('Policy backbone diagram. Each block is a button that shows its description below.', '策略骨干示意图。每个模块都是按钮，点击后在下方显示说明。') });
  const defs = s('defs', {},
    s('pattern', { id: 'archx-hatch', width: 7, height: 7, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' },
      s('line', { x1: 0, y1: 0, x2: 0, y2: 7, class: 'archx-hatch' })),
    ...['slow', 'fast', 'motion', 'head'].map((g) => s('marker', { id: `archx-ar-${g}`, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto' },
      s('path', { d: 'M1 1.5L8.5 5L1 8.5z', class: `archx-ah archx--${g}` }))));
  svg.append(defs);

  const laneEls = LANES.map((L) => {
    const g = s('g', { class: `archx-lane archx--${L.g}`, 'data-g': L.g },
      s('rect', { x: 8, y: L.y, width: 776, height: L.h, rx: 10, class: 'archx-band' }),
      s('text', { x: 24, y: L.y + 22, class: 'archx-lt' }, L.t),
      s('text', { x: 768, y: L.y + 22, class: 'archx-lr', 'text-anchor': 'end', 'data-maxw': 420 }, L.r));
    svg.append(g); return g;
  });
  svg.append(s('text', { x: 896, y: 34, class: 'archx-lt archx--fusion', 'text-anchor': 'middle' }, t('FUSE', '融合')),
    s('text', { x: 1100, y: 34, class: 'archx-lt archx--head', 'text-anchor': 'middle' }, t('OUTPUTS', '输出')));

  const edgeEls = EDGES.map((e) => {
    const p = s('path', { d: edgePath(e), class: `archx-edge archx--${e.g}${e.kind ? ' archx-edge--mem' : ''}`, 'marker-end': `url(#archx-ar-${e.g})` });
    svg.append(p); e.el = p; return p;
  });
  const [mx1, my] = anchor('navq', 'r');
  svg.append(s('text', { x: (mx1 + GEO.fusion[0]) / 2, y: my - 8, class: 'archx-note', 'text-anchor': 'middle', 'data-maxw': 52 }, 'x-attn'));

  const nodeEls = NODES.map((n) => {
    const [x, y, w, hh] = GEO[n.id];
    const g = s('g', { class: `archx-node archx--${n.g}${n.frozen ? ' is-frozen' : ''}`, tabindex: '0', role: 'button', 'data-id': n.id,
      'aria-label': `${n.t}: ${n.sub}` });
    g.append(s('rect', { x, y, width: w, height: hh, rx: 8, class: 'archx-box' }));
    if (n.frozen) g.append(s('rect', { x, y, width: w, height: hh, rx: 8, class: 'archx-hatchfill' }));
    const L = lines(n), tall = ['fusion', 'flow', 'stop'].includes(n.id), lh = 19;
    const y0 = tall ? y + hh / 2 - ((L.length - 1) * lh) / 2 + 5 : y + hh / 2 - 3;
    L.forEach(([cls, str], i) => {
      const cx = tall ? x + w / 2 : x + 30;
      g.append(s('text', { x: cx, y: tall ? y0 + i * lh : y0 + i * 18, class: cls, 'text-anchor': tall ? 'middle' : 'start', 'data-maxw': tall ? w - 20 : w - 42 }, str));
    });
    if (!tall) g.append(s('circle', { cx: x + 16, cy: y + hh / 2 - 7, r: 4.5, class: 'archx-dot' }));
    if (n.frozen) {
      const pw = 64;
      g.append(s('rect', { x: x + w - pw - 10, y: y - 9, width: pw, height: 18, rx: 9, class: 'archx-pill' }),
        s('text', { x: x + w - pw / 2 - 10, y: y + 4, class: 'archx-pillt', 'text-anchor': 'middle', 'data-maxw': pw - 10 }, t('FROZEN', '冻结')));
    }
    if (n.id === 'vlm') {
      const st = s('text', { x: x + 30, y: y + hh - 18, class: 'archx-status', 'data-maxw': w - 42 }, '');
      g.append(st); g.status = st;
    }
    const pick = () => select(n.id);
    g.addEventListener('click', pick);
    g.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick(); } });
    svg.append(g); return g;
  });
  const vlmStatus = nodeEls.find((g) => g.dataset.id === 'vlm').status;

  // Waypoint ticker: 32 executed waypoints = 4 decisions; the VLM refreshes on every 2nd.
  const TY = 470, TX0 = 196, TDX = 30;
  const tick = s('g', { class: 'archx-ticker' },
    s('text', { x: 24, y: TY + 5, class: 'archx-lt archx--fusion' }, t('EXECUTED WAYPOINTS', '已执行航点')),
    s('line', { x1: TX0 - 8, y1: TY, x2: TX0 + 31 * TDX + 8, y2: TY, class: 'archx-axis' }));
  const wps = [], dias = [], refs = [];
  for (let i = 0; i < 32; i++) {
    const x = TX0 + i * TDX;
    if (i % C.H === 0) {
      const d = s('path', { d: `M${x} ${TY - 8}L${x + 8} ${TY}L${x} ${TY + 8}L${x - 8} ${TY}z`, class: 'archx-dia' });
      dias.push(d); tick.append(d);
      if ((i / C.H) % 2 === 0) { const r = s('text', { x, y: TY - 14, class: 'archx-ref', 'text-anchor': 'middle' }, t('VLM ↻', 'VLM ↻')); refs.push(r); tick.append(r); }
    } else { const c = s('circle', { cx: x, cy: TY, r: 4, class: 'archx-wp' }); wps.push([i, c]); tick.append(c); }
  }
  tick.append(s('text', { x: TX0 - 8, y: TY + 30, class: 'archx-note', 'data-maxw': 420 },
    t(`◆ decision every ${C.H} waypoints · VLM ↻ cache refresh`, `◆ 每 ${C.H} 个航点一次决策 · VLM ↻ 缓存刷新`)),
  s('text', { x: VW - 10, y: TY + 30, class: 'archx-note', 'text-anchor': 'end', 'data-maxw': 400 },
    t(`amortized ${cost.stated.msK8} ms per waypoint · ${cost.stated.msK1} ms at k = 1`, `每航点摊销 ${cost.stated.msK8} ms · k = 1 时 ${cost.stated.msK1} ms`)));
  svg.append(tick);

  const pulses = EDGES.map((e) => { const c = s('circle', { r: 5.5, class: `archx-pulse archx--${e.g}` }); svg.append(c); return c; });

  const info = h('div', { class: 'archx__info', 'aria-live': 'polite' });
  wrap.append(svg, info);

  // Small screens: the same content as grouped cards (built by the caller).
  const cards = h('div', { class: 'archx__cards' }, GROUPS.map(([title, ids]) => h('section', { class: 'arch__group' },
    h('h4', { class: 'arch__gt' }, title), h('div', { class: 'arch__cards', 'data-n': ids.length }, ids.map((id) => {
      const n = byId[id];
      return h('div', { class: `arch-card arch-card--${n.g}${n.frozen ? ' is-frozen' : ''}` },
        h('p', { class: 'arch-card__t' }, n.t, n.frozen ? h('span', { class: 'arch-card__f' }, t('frozen', '冻结')) : null),
        h('p', { class: 'arch-card__s' }, n.sub), h('p', { class: 'arch-card__d' }, n.d));
    })))));
  host.append(wrap, cards);

  // ---- state ----
  let current = 'fusion', focus = 'all', clock = 0, last = null, visible = false, playing = !reducedMotion(), lastCycle = -1;
  function fillInfo(n) {
    const L = lines(n), sub = L[1]?.[0] === 'arch-s' ? L[1][1] : n.sub;
    info.replaceChildren(h('div', { class: 'archx__ih' }, h('h4', {}, n.t), h('span', { class: 'archx__sub' }, sub),
      h('span', { class: 'tag' }, n.frozen ? TAG.frozen : TAG[n.g])), h('p', {}, n.d),
    h('p', { class: 'stage__src' }, t('Fig. 3, p. 4 · §3.2 · App. A.2', '图 3，第 4 页 · §3.2 · 附录 A.2')));
  }
  // Reserve the tallest description so the panel never changes height between selections.
  function sizeInfo() {
    if (!info.offsetWidth) return;
    info.style.minHeight = '';
    const hmax = Math.max(...NODES.map((n) => { fillInfo(n); return info.offsetHeight; }));
    fillInfo(byId[current]); info.style.minHeight = `${hmax}px`;
  }
  function select(id) {
    current = id; fillInfo(byId[id]);
    nodeEls.forEach((g) => g.classList.toggle('is-selected', g.dataset.id === id));
    EDGES.forEach((e) => e.el.classList.toggle('is-linked', e.a === id || e.b === id));
  }
  function applyFocus() {
    const keep = FOCUS[focus];
    nodeEls.forEach((g) => g.classList.toggle('is-dim', !!keep && !keep.includes(g.dataset.id)));
    EDGES.forEach((e) => e.el.classList.toggle('is-dim', !!keep && !(keep.includes(e.a) && keep.includes(e.b))));
    laneEls.forEach((g) => g.classList.toggle('is-dim', focus !== 'all' && !(focus === g.dataset.g || (focus === 'heads' && g.dataset.g === 'motion'))));
  }

  function draw() {
    const cyc = Math.floor(clock / CYCLE), u = clock - cyc * CYCLE, refresh = cyc % 2 === 0;
    const hot = new Set();
    EDGES.forEach((e, i) => {
      const t0 = e.st * STAGE, dur = e.span * STAGE, p = (u - t0) / dur;
      const on = p >= 0 && p <= 1 && !(e.slowOnly && !refresh);
      const c = pulses[i];
      if (!on) { c.style.opacity = 0; e.el.classList.remove('is-active'); return; }
      const L = e.len ?? (e.len = e.el.getTotalLength());
      const pt = e.el.getPointAtLength(L * p);
      c.setAttribute('cx', pt.x); c.setAttribute('cy', pt.y);
      const dim = e.el.classList.contains('is-dim');
      c.style.opacity = (dim ? 0.15 : 1) * Math.sin(Math.PI * Math.min(1, p * 1.15));
      e.el.classList.add('is-active'); hot.add(e.a); hot.add(e.b);
    });
    const exec = u >= EXEC0 && u < EXEC0 + C.H * WP + PAUSE;
    if (exec) { hot.add('flow'); hot.add('stop'); }
    nodeEls.forEach((g) => g.classList.toggle('is-hot', hot.has(g.dataset.id)));
    if (cyc !== lastCycle) {
      lastCycle = cyc;
      vlmStatus.textContent = refresh ? t('↻ refreshing cache', '↻ 刷新缓存') : t('cache reused', '复用缓存');
      vlmStatus.classList.toggle('is-refresh', refresh);
    }
    // ticker: 4 decisions per loop of the strip
    const d = cyc % 4, done = d * C.H + (u < EXEC0 ? 0 : Math.min(C.H, Math.floor((u - EXEC0) / WP) + 1));
    dias.forEach((el, k) => { el.classList.toggle('is-done', k < d || (k === d && u >= EXEC0)); el.classList.toggle('is-now', k === d); });
    refs.forEach((el, k) => el.classList.toggle('is-now', 2 * k === d && u < EXEC0 + C.H * WP));
    wps.forEach(([i, c]) => c.classList.toggle('is-done', i < done));
  }
  function loop(ts) {
    if (last != null) clock += Math.min(0.05, (ts - last) / 1000);
    last = ts; draw();
    if (playing && visible) requestAnimationFrame(loop); else last = null;
  }
  const kick = () => { if (playing && visible && last == null) requestAnimationFrame(loop); };

  const ppBtn = h('button', { type: 'button', class: 'btn', onclick: () => { playing = !playing; label(); kick(); } });
  const label = () => { ppBtn.textContent = playing ? t('Pause', '暂停') : t('Play', '播放'); ppBtn.setAttribute('aria-pressed', String(playing)); };
  label();
  const seg = segmented(t('Highlight a pathway', '高亮一条通路'), [
    { value: 'all', label: t('All', '全部') }, { value: 'slow', label: t('Slow system', '慢系统') },
    { value: 'fast', label: t('Fast system', '快系统') }, { value: 'heads', label: t('Control + STOP', '控制 + STOP') }], 'all',
  (v) => { focus = v; applyFocus(); draw(); });
  const controls = h('div', { class: 'archx__ctl' }, seg.el, ppBtn);

  const relayout = () => { fit(svg); sizeInfo(); };
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) relayout(); kick(); }).observe(svg);
  document.fonts?.ready.then(relayout);
  let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(relayout, 150); });
  clock = reducedMotion() ? 2.5 * STAGE : 0;
  select('fusion'); applyFocus(); draw();
  return controls;
}
