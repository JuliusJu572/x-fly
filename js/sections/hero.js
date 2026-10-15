// Hero flight plate: a schematic top-down chart. Expert route (blue), a full-chunk BC
// rollout whose per-chunk drift accumulates and which crosses the goal ring without
// stopping (gray, Fig. 2a), and a recovery-trained rollout whose chunks decay the offset
// with the paper's smoothstep and stop inside (magenta). Illustrative geometry, not
// experiment data; the caption under the plate says so.
import { h, s, mount, reducedMotion, onVisible } from '../lib/dom.js';
import { t } from '../lib/i18n.js';

const W = 640, Hh = 440, H = 8;
const CTRL = [[70, 380], [150, 330], [215, 352], [290, 300], [330, 222], [410, 190], [470, 120], [560, 92]];
const smooth = (q) => 1 - 3 * q * q + 2 * q * q * q;

function catmull(pts, n = 24) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let j = 0; j < n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t
        + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

function resample(line, count) {
  const cum = [0];
  for (let i = 1; i < line.length; i++) cum.push(cum[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]));
  const out = [];
  for (let k = 0; k < count; k++) {
    const target = (cum[cum.length - 1] * k) / (count - 1);
    let i = cum.findIndex((c) => c >= target); if (i <= 0) i = 1;
    const f = (target - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
    out.push([line[i - 1][0] + f * (line[i][0] - line[i - 1][0]), line[i - 1][1] + f * (line[i][1] - line[i - 1][1])]);
  }
  return out;
}

const route = resample(catmull(CTRL), 9 * H + 1);
const normal = (i) => {
  const a = route[Math.max(0, i - 1)], b = route[Math.min(route.length - 1, i + 1)];
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
  return [-dy / L, dx / L];
};
const RATES = [1.0, -0.7, 1.3, 0.9, -1.1, 1.2, -0.8, 1.0, 0.6];
// BC drifts wide, swings back through the goal ring, then keeps flying past it.
const BC_RATES = [1.0, 0.9, 0.6, 0.1, -0.4, -0.7, -0.7, -0.5, -0.2];
const OVERSHOOT = 6;
function overshootRollout(gain) {
  const a = route[route.length - 2], b = route[route.length - 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const tg = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
  const full = [...route, ...Array.from({ length: OVERSHOOT }, (_, i) => [b[0] + tg[0] * L * 0.8 * (i + 1), b[1] + tg[1] * L * 0.8 * (i + 1)])];
  const nrm = (i) => { const p = full[Math.max(0, i - 1)], q = full[Math.min(full.length - 1, i + 1)]; const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; };
  const off = [0];
  let carry = 0;
  for (const r of BC_RATES) { for (let k = 1; k <= H; k++) off.push(carry + gain * r * k); carry = off[off.length - 1]; }
  for (let i = 0; i < OVERSHOOT; i++) off.push(carry);
  return full.map((p, i) => { const n = nrm(i); return [p[0] + n[0] * off[i], p[1] + n[1] * off[i]]; });
}

// Offset along the route normal at every pose. Each anchor's carried offset decays with
// Eq. 2's smoothstep, plus a small fresh drift within the chunk.
function rollout(gain) {
  const off = [0];
  let carry = 0;
  for (let c = 0; c < RATES.length; c++) {
    for (let k = 1; k <= H; k++) {
      const drift = gain * RATES[c] * k;
      off.push(carry * smooth(k / H) + drift * 0.32);
    }
    carry = off[off.length - 1];
  }
  return route.map((p, i) => { const n = normal(i); return [p[0] + n[0] * off[i], p[1] + n[1] * off[i]]; });
}

const d = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');

function contours(g) {
  const hills = [[200, 140, 7, 1.3], [470, 330, 6, 2.1], [600, 230, 4, 0.4]];
  for (const [cx, cy, rings, ph] of hills) {
    for (let r = 1; r <= rings; r++) {
      const pts = [];
      for (let a = 0; a <= 64; a++) {
        const t = (a / 64) * Math.PI * 2;
        const rad = r * 22 * (1 + 0.16 * Math.sin(3 * t + ph + r * 0.4) + 0.08 * Math.sin(5 * t - ph));
        pts.push([cx + rad * Math.cos(t), cy + rad * 0.72 * Math.sin(t)]);
      }
      g.append(s('path', { d: d(pts) + 'Z', class: 'pl-contour' }));
    }
  }
}

export function renderHero() {
  const host = mount('hero');
  const svg = s('svg', { viewBox: `0 0 ${W} ${Hh}`, role: 'img', 'aria-labelledby': 'plate-title plate-desc' },
    s('title', { id: 'plate-title' }, t('Schematic flight plate', '示意航图')),
    s('desc', { id: 'plate-desc' }, t('An expert route from takeoff to a goal ring. A gray full-chunk BC rollout drifts off the route, crosses the goal ring without stopping and ends past it. A magenta recovery-trained rollout corrects at each decision anchor and stops inside the ring.', '从起飞点到目标圈的专家航线。灰色的整块执行 BC 轨迹偏离航线，穿过目标圈却不停，最终飞过头。品红色的 recovery 训练轨迹在每个决策锚点纠偏，并在圈内停下。')));
  const defs = s('defs', {}, s('clipPath', { id: 'plate-clip' }, s('rect', { width: W, height: Hh })));
  const g = s('g', { 'clip-path': 'url(#plate-clip)' });
  svg.append(defs, g);

  const grid = s('g', { class: 'pl-grid' });
  for (let x = 80; x < W; x += 80) grid.append(s('line', { x1: x, y1: 0, x2: x, y2: Hh }));
  for (let y = 80; y < Hh; y += 80) grid.append(s('line', { x1: 0, y1: y, x2: W, y2: y }));
  const terrain = s('g'); contours(terrain);
  g.append(grid, terrain);

  const goal = route[route.length - 1];
  g.append(s('circle', { cx: goal[0], cy: goal[1], r: 34, class: 'pl-goal' }),
    s('text', { x: goal[0] + 34, y: goal[1] - 42, class: 'pl-label', 'text-anchor': 'end' }, t('20 m success radius', '20 m 成功半径')));

  const expert = s('path', { d: d(route), class: 'pl-expert', pathLength: 1 });
  const bcPts = overshootRollout(1.7);
  const bc = s('path', { d: d(bcPts), class: 'pl-bc', pathLength: 1 });
  const bcEnd = bcPts[bcPts.length - 1];
  const bcX = s('g', { class: 'pl-bcx', transform: `translate(${bcEnd[0]} ${bcEnd[1]})` },
    s('path', { d: 'M-5 -5L5 5M5 -5L-5 5' }));
  g.append(expert, bc, bcX);

  const xf = rollout(3.2);
  const chunks = [];
  for (let c = 0; c < RATES.length; c++) {
    const seg = xf.slice(c * H, c * H + H + 1);
    const grp = s('g', { class: 'pl-chunk' });
    grp.append(s('path', { d: d(seg), class: 'pl-learner', pathLength: 1 }));
    seg.slice(1, -1).forEach((p, j) => {
      const n = normal(c * H + j + 1);
      grp.append(s('line', { x1: p[0] - n[0] * 3.5, y1: p[1] - n[1] * 3.5, x2: p[0] + n[0] * 3.5, y2: p[1] + n[1] * 3.5, class: 'pl-tick' }));
    });
    const a = seg[0];
    grp.append(s('rect', { x: a[0] - 4.5, y: a[1] - 4.5, width: 9, height: 9, transform: `rotate(45 ${a[0]} ${a[1]})`, class: 'pl-anchor' }));
    chunks.push(grp); g.append(grp);
  }
  const end = xf[xf.length - 1];
  const stop = s('g', { class: 'pl-stop', transform: `translate(${end[0]} ${end[1]})` },
    s('circle', { r: 6 }), s('text', { x: 10, y: 4, class: 'pl-label pl-label--ink' }, 'STOP'));
  g.append(stop);

  const start = route[0];
  g.append(s('circle', { cx: start[0], cy: start[1], r: 4, class: 'pl-start' }),
    s('text', { x: start[0] - 6, y: start[1] + 26, class: 'pl-label' }, t('Takeoff', '起飞')));

  // HTML legend under the plate so it stays legible when the SVG scales down on phones.
  const legend = h('div', { class: 'legend plate__legend' },
    [['var(--expert)', t('Expert route', '专家航线')], ['var(--muted-mark)', t('Full-chunk BC: drifts, passes the goal, no STOP', '整块执行 BC：漂移、飞过目标、不停')], ['var(--learner)', t('Recovery-trained X-Fly', 'Recovery 训练后的 X-Fly')]]
      .map(([c, t]) => h('span', {}, h('i', { class: 'sw sw--line', style: { background: c } }), t)),
    h('span', {}, h('i', { class: 'sw sw--anchor' }), t('Decision anchor, then 8 controls', '决策锚点，随后 8 步控制')));
  host.append(svg, legend);

  if (reducedMotion()) return;
  svg.classList.add('is-armed');
  onVisible(host, () => {
    svg.classList.add('is-playing');
    chunks.forEach((c, i) => setTimeout(() => c.classList.add('is-on'), 1500 + i * 260));
    setTimeout(() => stop.classList.add('is-on'), 1500 + chunks.length * 260 + 120);
  }, 0.2);
}
