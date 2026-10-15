// Recovery lab: Eq. 2 along a long forward route. A schematic learner drifts off the expert
// route; every decision anchor it visits gets its own recovery chunk
// p^rec_{t,j} = p*_{c_t+j} + d_t·w(j/H), which starts at the learner and rejoins the expert
// pose c_t + H exactly. The first anchor inside the goal region is labeled STOP instead (§3.3).
// Geometry is illustrative; the weights and the target formula are exact.
import { h, s, mount, reducedMotion } from '../lib/dom.js';
import { eqRecovery } from './equations.js';
import { config } from '../data/paper.js';
import { t as tr } from '../lib/i18n.js';

const H = config.H, CHUNKS = 6, N = CHUNKS * H + 1, VW = 600, VH = 300;
const w = (q) => 1 - 3 * q * q + 2 * q * q * q;
const CTRL = [[28, 240], [116, 250], [204, 226], [282, 178], [360, 134], [436, 108], [500, 88], [548, 66]];

function catmull(pts, n = 30) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let j = 0; j < n; j++) {
      const u = j / n, u2 = u * u, u3 = u2 * u;
      out.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * u
        + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u3)));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
function resample(line, count) {
  const cum = [0];
  for (let i = 1; i < line.length; i++) cum.push(cum[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]));
  return Array.from({ length: count }, (_, k) => {
    const target = (cum[cum.length - 1] * k) / (count - 1);
    let i = cum.findIndex((c) => c >= target); if (i <= 0) i = 1;
    const f = (target - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
    return [line[i - 1][0] + f * (line[i][0] - line[i - 1][0]), line[i - 1][1] + f * (line[i][1] - line[i - 1][1])];
  });
}
const route = resample(catmull(CTRL), N);
const normal = (i) => {
  const a = route[Math.max(0, i - 1)], b = route[Math.min(N - 1, i + 1)];
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
  return [-dy / L, dx / L];
};
const dpath = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');
const GOAL = route[N - 1], REGION = 30;
// The offset label sits beside the segment, on the side away from the handle ring.
function dLabel(e, p) {
  const dx = p[0] - e[0], dy = p[1] - e[1], L = Math.hypot(dx, dy) || 1, f = Math.max(0, 1 - 26 / L) * 0.5;
  return s('text', { x: e[0] + dx * f - (dy / L) * 10, y: e[1] + dy * f + (dx / L) * 10 + 4, class: 'lab-dlabel', 'text-anchor': 'middle' }, 'd');
}

export function renderRecovery() {
  mount('eq-recovery').innerHTML = eqRecovery;
  const host = mount('recovery-lab');
  // One anchor per executed chunk; the cursor advances by the H controls actually executed.
  const anchors = Array.from({ length: CHUNKS + 1 }, (_, k) => k * H);
  const init = [0, 22, -16, 28, -20, 12, 4];
  const d = anchors.map((c, k) => { const n = normal(c); return [n[0] * init[k], n[1] * init[k]]; });
  const still = reducedMotion();
  const STEP = 0.085, GROW = 0.45;   // seconds per executed control; label draw-in time
  let step = 3 * H, grow = 1, playing = false, onScreen = false, raf = 0, t0 = 0, T = 0, lastAnchor = -1;

  const svg = s('svg', { viewBox: `0 0 ${VW} ${VH}`, class: 'lab-svg lab-svg--drag', role: 'img',
    'aria-label': tr('A long forward expert route. A gray learner rollout drifts off it, one control at a time; each decision anchor gets a magenta recovery label that rejoins the route one chunk ahead.',
      '一条向前延伸的长专家航线。灰色学习者轨迹逐步偏离航线；每个决策锚点都有一段品红色恢复标签，在一个 chunk 之后回到航线。') });
  const gDyn = s('g'), gTop = s('g');
  svg.append(
    s('circle', { cx: GOAL[0], cy: GOAL[1], r: REGION, class: 'lab-goal' }),
    s('text', { x: GOAL[0] - REGION - 6, y: GOAL[1] - REGION + 4, class: 'pl-label', 'text-anchor': 'end' }, tr('20 m region', '20 m 区域')),
    s('path', { d: dpath(route), class: 'lab-route' }),
    ...route.map((p) => s('circle', { cx: p[0], cy: p[1], r: 2.2, class: 'lab-pose' })),
    s('text', { x: route[3][0] - 4, y: route[3][1] - 14, class: 'pl-label' }, tr('expert route →', '专家航线 →')),
    gDyn, gTop);
  const handle = s('g', { class: 'lab-handle', tabindex: '0', role: 'slider', 'aria-label': tr('Learner pose at the current anchor. Arrow keys move it.', '当前锚点处的学习者位姿，可用方向键移动。'), 'aria-valuetext': '' },
    s('circle', { r: 15, class: 'lab-halo' }), s('circle', { r: 7, class: 'lab-dot' }));
  const drone = s('path', { d: 'M7 0L-5 5L-2.5 0L-5 -5Z', class: 'lab-drone' });
  gTop.append(handle, drone);

  const weights = h('div', { class: 'wts', 'aria-label': tr('Smoothstep weights w(j/8)', 'Smoothstep 权重 w(j/8)') },
    Array.from({ length: H + 1 }, (_, k) => h('div', { class: 'wts__col' },
      h('span', { class: 'wts__v' }, w(k / H).toFixed(2)),
      h('span', { class: 'wts__bar', style: { height: `${w(k / H) * 100}%` } }),
      h('span', { class: 'wts__k' }, `j=${k}`))));
  const readout = h('p', { class: 'lab-readout', 'aria-live': 'polite' });
  const slider = h('input', { type: 'range', min: 0, max: CHUNKS * H, step: 1, value: step, class: 'lab-range', 'aria-label': tr('Executed control step', '已执行的控制步') });
  slider.addEventListener('input', () => { pause(); step = +slider.value; grow = 1; draw(); });
  const play = h('button', { type: 'button', class: 'btn', hidden: still, onclick: () => (playing ? pause() : resume()) }, tr('Pause', '暂停'));

  const anchorPt = (k) => { const e = route[anchors[k]]; return [e[0] + d[k][0], e[1] + d[k][1]]; };
  const inRegion = (k) => Math.hypot(anchorPt(k)[0] - GOAL[0], anchorPt(k)[1] - GOAL[1]) <= REGION;
  const stopIdx = () => anchors.findIndex((_, k) => inRegion(k));
  const lastIdx = () => { const S = stopIdx(); return S < 0 ? CHUNKS : S; };
  // The learner's own flight between anchors: its offset drifts from d_k to d_{k+1}.
  const learnerAt = (i) => {
    const k = Math.min(Math.floor(i / H), CHUNKS - 1), f = (i - k * H) / H;
    const a = Math.min(N - 1, Math.floor(i)), b = Math.min(N - 1, a + 1), g = i - a;
    const e = [route[a][0] + (route[b][0] - route[a][0]) * g, route[a][1] + (route[b][1] - route[a][1]) * g];
    return [e[0] + d[k][0] + (d[k + 1][0] - d[k][0]) * f, e[1] + d[k][1] + (d[k + 1][1] - d[k][1]) * f];
  };
  const recChunk = (k, upto = H) => {
    const c = anchors[k];
    return Array.from({ length: Math.floor(upto) + 1 }, (_, j) => { const e = route[Math.min(N - 1, c + j)], q = w(j / H); return [e[0] + d[k][0] * q, e[1] + d[k][1] * q]; });
  };

  function draw() {
    const S = stopIdx(), last = lastIdx();
    step = Math.min(step, last * H);
    const kc = Math.min(Math.floor(step / H + 1e-9), last);
    const P = anchorPt(kc), c = anchors[kc];
    const flown = [...Array.from({ length: Math.floor(step) + 1 }, (_, i) => learnerAt(i)), learnerAt(step)];
    const els = [s('path', { d: dpath(flown), class: 'lab-learner' }),
      ...flown.slice(1, -1).map((p, i) => ((i + 1) % H ? s('circle', { cx: p[0], cy: p[1], r: 2, class: 'lab-step' }) : null))];
    for (let k = 0; k < kc; k++) els.push(s('path', { d: dpath(recChunk(k)), class: 'lab-rec lab-rec--faint' }));
    if (kc === S) {
      els.push(s('g', { class: 'pl-stop is-on', transform: `translate(${P[0]} ${P[1]})` },
        s('circle', { r: 6 }), s('text', { x: -12, y: -12, class: 'pl-label pl-label--ink', 'text-anchor': 'end' }, 'STOP')));
    } else {
      const g = grow * H, rec = recChunk(kc, g);
      els.push(s('line', { x1: route[c][0], y1: route[c][1], x2: P[0], y2: P[1], class: 'lab-offset' }),
        dLabel(route[c], P),
        ...rec.slice(1).map((p, j) => s('line', { x1: p[0], y1: p[1], x2: route[Math.min(N - 1, c + j + 1)][0], y2: route[Math.min(N - 1, c + j + 1)][1], class: 'lab-ghost' })),
        ...rec.slice(1).map((_, j) => s('circle', { cx: route[Math.min(N - 1, c + j + 1)][0], cy: route[Math.min(N - 1, c + j + 1)][1], r: 3.4, class: 'lab-pose lab-pose--future' })),
        s('path', { d: dpath(rec), class: 'lab-rec' }),
        ...rec.slice(1).map((p) => s('circle', { cx: p[0], cy: p[1], r: 3.4, class: 'lab-recpt' })));
      if (grow >= 1) { const nn = normal(Math.min(N - 1, c + H)); els.push(s('text', { x: rec[H][0] - nn[0] * 16, y: rec[H][1] - nn[1] * 16 + 4, class: 'pl-label', 'text-anchor': 'middle' }, 'c', s('tspan', { 'baseline-shift': 'sub', 'font-size': '0.78em' }, 't'), ` + ${H}`)); }
    }
    for (let k = 0; k <= kc; k++) { const q = anchorPt(k);
      els.push(s('rect', { x: q[0] - 4.5, y: q[1] - 4.5, width: 9, height: 9, transform: `rotate(45 ${q[0]} ${q[1]})`,
        class: `pl-anchor${k === S ? ' lab-anchor--stop' : ''}`, style: 'cursor:pointer', onclick: () => { pause(); step = k * H; grow = 1; draw(); } })); }
    gDyn.replaceChildren(...els.filter(Boolean));

    const D = learnerAt(step), D2 = learnerAt(Math.min(last * H, step + 0.3)), D0 = learnerAt(Math.max(0, step - 0.3));
    const ang = Math.atan2(D2[1] - D0[1], D2[0] - D0[0]) * 180 / Math.PI;
    drone.setAttribute('transform', `translate(${D[0]} ${D[1]}) rotate(${ang})`);
    handle.style.display = kc === 0 || playing ? 'none' : '';
    handle.setAttribute('transform', `translate(${P[0]} ${P[1]})`);
    const off = Math.round(Math.hypot(d[kc][0], d[kc][1]));
    handle.setAttribute('aria-valuetext', tr(`anchor ${kc + 1}, offset ${off} units`, `第 ${kc + 1} 个锚点，偏移 ${off} 个单位`));
    slider.max = last * H; slider.value = Math.round(step);
    if (kc !== lastAnchor || !playing) {
      lastAnchor = kc;
      readout.innerHTML = (kc === S
        ? tr(`Anchor ${kc + 1}, cursor c_t = ${c}: the first anchor inside the success region. It is labeled STOP with a hover target, and collection for this route ends here.`,
          `第 ${kc + 1} 个锚点，游标 c_t = ${c}：第一个进入成功区域的锚点。它被标为 STOP 并配悬停目标，这条航线的采集到此截断。`)
        : tr(`Anchor ${kc + 1}, cursor c_t = ${c}, offset |d_t| = ${off}. The magenta label starts at the learner and reaches expert pose c_t + ${H} exactly (w(1) = 0); the gray line is what the learner actually flies, ${H} controls per decision.`,
          `第 ${kc + 1} 个锚点，游标 c_t = ${c}，偏移 |d_t| = ${off}。品红色标签从学习者位置出发，恰好到达专家位姿 c_t + ${H}（w(1) = 0）；灰线是学习者实际飞出的轨迹，每次决策执行 ${H} 个控制。`)).replace(/c_t/g, 'c<sub>t</sub>').replace(/d_t/g, 'd<sub>t</sub>');
    }
  }

  // Timeline: at each anchor the label draws in, then the learner flies its H controls one by one.
  function stateAt(time) {
    const last = lastIdx();
    let tt = time;
    for (let k = 0; k <= last; k++) {
      const dwell = k === last ? 1.8 : 0.6;
      if (tt < dwell) return { i: k * H, g: Math.min(1, tt / GROW) };
      tt -= dwell;
      if (k === last) break;
      if (tt < H * STEP) return { i: k * H + tt / STEP, g: 1 };
      tt -= H * STEP;
    }
    return null;
  }
  function frame(now) {
    if (!playing || !onScreen) { raf = 0; return; }
    T = (now - t0) / 1000;
    let st = stateAt(T);
    if (!st) { t0 = now; T = 0; st = stateAt(0); }
    step = st.i; grow = st.g; draw();
    raf = requestAnimationFrame(frame);
  }
  function resume() {
    if (still) return;
    playing = true; play.textContent = tr('Pause', '暂停'); readout.setAttribute('aria-live', 'off');
    // Continue from the current step.
    const last = lastIdx(), k = Math.min(Math.floor(step / H), last);
    T = k * (0.6 + H * STEP) + (k < last ? 0.6 + (step - k * H) * STEP : 0);
    t0 = performance.now() - T * 1000;
    if (!raf && onScreen) raf = requestAnimationFrame(frame);
  }
  function pause() {
    playing = false; play.textContent = tr('Play', '播放'); readout.setAttribute('aria-live', 'polite');
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }
  new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    if (onScreen && playing && !raf) { t0 = performance.now() - T * 1000; raf = requestAnimationFrame(frame); }
  }, { threshold: 0.2 }).observe(svg);

  const toSvg = (e) => { const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); };
  const clampD = (x, y) => { const m = Math.hypot(x, y), M = 56; return m > M ? [x * M / m, y * M / m] : [x, y]; };
  const cur = () => Math.min(Math.floor(step / H), lastIdx());
  let dragging = false;
  handle.addEventListener('pointerdown', (e) => { pause(); dragging = true; step = cur() * H; grow = 1; handle.setPointerCapture(e.pointerId); });
  handle.addEventListener('pointermove', (e) => { if (!dragging) return; const k = cur(), p = toSvg(e), c = route[anchors[k]]; d[k] = clampD(p.x - c[0], p.y - c[1]); draw(); });
  handle.addEventListener('pointerup', () => { dragging = false; });
  handle.addEventListener('keydown', (e) => {
    const mv = { ArrowUp: [0, -5], ArrowDown: [0, 5], ArrowLeft: [-5, 0], ArrowRight: [5, 0] }[e.key];
    if (!mv) return; e.preventDefault(); pause(); const k = cur(); step = k * H; d[k] = clampD(d[k][0] + mv[0], d[k][1] + mv[1]); draw();
  });

  host.append(
    h('div', { class: 'widget__head' }, h('h3', { class: 'widget__title' }, tr('Recovery labels along one rollout', '一条轨迹上的恢复标签')), play),
    svg,
    h('div', { class: 'lab-legend legend' },
      h('span', {}, h('i', { class: 'sw', style: { background: 'var(--expert)', borderRadius: '50%' } }), tr('Expert poses p*', '专家位姿 p*')),
      h('span', {}, h('i', { class: 'sw sw--line', style: { background: 'var(--muted-mark)' } }), tr('Learner rollout, one control per dot', '学习者轨迹，每点一个控制')),
      h('span', {}, h('i', { class: 'sw sw--anchor' }), tr('Decision anchor', '决策锚点')),
      h('span', {}, h('i', { class: 'sw sw--line', style: { background: 'var(--learner)' } }), h('span', { class: 'math', html: tr('Recovery label p<sup>rec</sup>', '恢复标签 p<sup>rec</sup>') }))),
    h('label', { class: 'lab-cursor' }, h('span', {}, tr('Control step', '控制步')), slider),
    readout,
    h('p', { class: 'widget__title', style: { margin: '18px 0 8px' } }, tr('Weight on d at step j, w(j/8)', '第 j 步对 d 的权重 w(j/8)')),
    weights,
    h('p', { class: 'widget__note' }, tr('Schematic route in arbitrary units. Scrub the slider one control at a time, select an anchor, or pause and drag the learner at the current anchor. The weights and the target formula are exact (Eq. 2, H = 8).',
      '示意航线，单位任意。可用滑块逐个控制步查看、点击锚点跳转，或暂停后拖动当前锚点处的学习者。权重与目标公式是精确的（式 2，H = 8）。')));
  draw();
  if (!still) { playing = true; step = 0; grow = 0; T = 0; t0 = performance.now(); readout.setAttribute('aria-live', 'off'); }
  else play.textContent = tr('Play', '播放');
}
