// Flow-GRPO explainers. (a) Noise injected at a stochastic tail step, Eq. 6, with the
// same orthonormal DCT-II basis the code builds (src/rl/flow_policy.py::_cosine_basis).
// (b) Same-task relative credit, Eq. 3, on a simplified episode-level return (Eq. 5).
import { h, s, mount, segmented, fmt, signed } from '../lib/dom.js';
import { eqActor, eqNoise } from './equations.js';
import { config as C } from '../data/paper.js';
import { t } from '../lib/i18n.js';

const { H, M, rho } = C;
const dt = 1 / C.euler;
function dct(k) {
  const v = Array.from({ length: H }, (_, n) => Math.cos((Math.PI / H) * (n + 0.5) * k));
  const L = Math.hypot(...v);
  return v.map((x) => x / L);
}
const PHI = Array.from({ length: M }, (_, m) => dct(m));
const PSI = Array.from({ length: H - M }, (_, m) => dct(M + m));
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const nu = (st) => C.sigma(st) * Math.sqrt(dt);
// Per-entry variance of nu(Φε + ρΨξ): trace / H = nu²(M + ρ²(H−M)) / H.
const isoScale = Math.sqrt((M + rho * rho * (H - M)) / H);

function drawShaped(n) {
  const e = PHI.map(gauss), x = PSI.map(gauss);
  return Array.from({ length: H }, (_, i) => n * (PHI.reduce((a, f, m) => a + f[i] * e[m], 0) + rho * PSI.reduce((a, f, m) => a + f[i] * x[m], 0)));
}
const drawIso = (n) => Array.from({ length: H }, () => n * isoScale * gauss());

function noiseLab(host) {
  let step = 3, mode = 'shaped';
  const VW = 520, VHt = 230, PL = 56, PR = 16, PT = 14, PB = 34;
  const X = (i) => PL + (i * (VW - PL - PR)) / (H - 1);
  const yMax = 0.24, Y = (v) => PT + ((yMax - v) / (2 * yMax)) * (VHt - PT - PB);
  const svg = s('svg', { viewBox: `0 0 ${VW} ${VHt}`, class: 'lab-svg', role: 'img', 'aria-label': t('Sampled noise across the eight waypoints of one control coordinate', '某一控制维度上 8 个航点的采样噪声') });
  const axes = s('g', { class: 'axis' });
  [-0.2, -0.1, 0, 0.1, 0.2].forEach((v) => axes.append(
    s('line', { x1: PL, x2: VW - PR, y1: Y(v), y2: Y(v), class: v === 0 ? 'baseline' : 'gridline' }),
    s('text', { x: PL - 8, y: Y(v) + 4, 'text-anchor': 'end' }, v.toFixed(1))));
  for (let i = 0; i < H; i++) axes.append(s('text', { x: X(i), y: VHt - 8, 'text-anchor': 'middle' }, `u${i + 1}`));
  const lines = s('g');
  svg.append(axes, lines);
  const readout = h('p', { class: 'widget__note' });

  function draw() {
    const n = nu(step);
    const draws = Array.from({ length: 6 }, () => (mode === 'shaped' ? drawShaped(n) : drawIso(n)));
    lines.replaceChildren(...draws.map((v, k) => s('path', {
      d: v.map((y, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(Math.max(-yMax, Math.min(yMax, y))).toFixed(1)}`).join(''),
      class: `nz-line nz-line--${mode}`, style: `animation-delay:${k * 40}ms` })));
    readout.textContent = t(`Step s = ${step}: σ = ${fmt(C.sigma(step), 3)}, ν = σ√Δt = ${fmt(n, 4)}. `, `当 s = ${step} 时：σ = ${fmt(C.sigma(step), 3)}，ν = σ√Δt = ${fmt(n, 4)}。`) + (mode === 'shaped'
      ? t(`Shaped: 4 low-frequency cosine modes at full scale, the other 4 at ρ = ${rho}. The covariance stays full rank, so each transition has a closed-form log-density over the whole 8 × 4 chunk.`,
        `成形噪声：4 个低频余弦模态取全尺度，其余 4 个乘 ρ = ${rho}。协方差保持满秩，因此每次转移在整个 8 × 4 chunk 上都有闭式对数密度。`)
      : t('Isotropic comparison with the same total variance: waypoints move independently. X-Fly does not use this. It is here for contrast.', '同总方差的各向同性噪声对照：各航点独立抖动。X-Fly 不用它，这里仅作对比。'));
  }
  const modeSeg = segmented(t('Noise shape', '噪声形状'), [{ value: 'shaped', label: t('X-Fly shaped', 'X-Fly 成形噪声') }, { value: 'iso', label: t('Isotropic, same variance', '各向同性，同方差') }], mode, (v) => { mode = v; draw(); });
  const stepSeg = segmented(t('Stochastic tail step', '随机尾步'), C.tail.map((v) => ({ value: v, label: `s = ${v}` })), step, (v) => { step = v; draw(); });

  const modes = h('div', { class: 'modes', 'aria-label': t('The four low-frequency modes of Φ', 'Φ 的四个低频模态') }, PHI.map((f, m) => {
    const sv = s('svg', { viewBox: '0 0 80 34', 'aria-hidden': 'true' },
      s('line', { x1: 2, x2: 78, y1: 17, y2: 17, class: 'baseline' }),
      s('path', { d: f.map((v, i) => `${i ? 'L' : 'M'}${(4 + i * 10.3).toFixed(1)} ${(17 - v * 28).toFixed(1)}`).join(''), class: 'nz-mode' }));
    return h('figure', {}, sv, h('figcaption', {}, t(`Φ mode ${m + 1}`, `Φ 模态 ${m + 1}`)));
  }));

  host.append(
    h('div', { class: 'widget__head' }, h('h3', { class: 'widget__title' }, t('Exploration noise across one chunk', '单个 chunk 内的探索噪声')),
      h('button', { type: 'button', class: 'btn', onclick: draw }, t('Resample', '重新采样'))),
    h('div', { class: 'panel__controls', style: { marginBottom: '10px' } }, modeSeg.el, stepSeg.el),
    svg, readout,
    h('div', { class: 'eq eq--compact' }, h('div', { html: eqNoise })),
    modes,
    h('p', { class: 'widget__note' }, t('Six random draws for one control coordinate, in normalized control increments. Orthonormal cosine (DCT-II) basis. §3.4 · Eq. 6, p. 5.', '某一控制维度的 6 次随机采样，单位为归一化控制增量。正交余弦 (DCT-II) 基。§3.4 · 式 6，第 5 页。')));
  draw();
}

const OUTCOMES = [
  { id: 'succ', label: t('Stops inside', '在区域内停止'), R: C.reward.success + C.reward.entry,
    why: t(`+${C.reward.success} successful STOP, +${C.reward.entry} first entry`, `+${C.reward.success} 成功 STOP，+${C.reward.entry} 首次进入`) },
  { id: 'over', label: t('Enters, leaves, stops outside', '进入后离开，在区域外停止'), R: C.reward.entry + C.reward.leave - C.reward.kappa,
    why: t(`+${C.reward.entry} entry, ${C.reward.leave} leave, −κ`, `+${C.reward.entry} 进入，${C.reward.leave} 离开，−κ`) },
  { id: 'early', label: t('Stops early, outside', '过早停在区域外'), R: -C.reward.kappa, why: t('−κ, no extra penalty', '−κ，无额外惩罚') },
  { id: 'fail', label: t('Non-STOP failure, never enters', '未停止且从未进入'), R: C.reward.terminal - C.reward.kappa,
    why: t(`${C.reward.terminal} non-STOP terminal failure, −κ`, `${C.reward.terminal} 非 STOP 终止失败，−κ`) },
];

function groupLab(host) {
  let picks = ['succ', 'succ', 'succ', 'over', 'early', 'early', 'fail', 'succ'];
  const list = h('div', { class: 'grp' });
  const stats = h('p', { class: 'widget__note' });
  function draw() {
    const Rs = picks.map((p) => OUTCOMES.find((o) => o.id === p).R);
    const mu = Rs.reduce((a, b) => a + b, 0) / Rs.length;
    const sd = Math.sqrt(Rs.reduce((a, b) => a + (b - mu) ** 2, 0) / Rs.length);
    const den = Math.max(sd, C.sFloor);
    const As = Rs.map((r) => (r - mu) / den);
    const aMax = Math.max(2.5, ...As.map(Math.abs));
    list.replaceChildren(...picks.map((p, i) => {
      const o = OUTCOMES.find((x) => x.id === p), a = As[i];
      const btn = h('button', { type: 'button', class: `grp__chip grp__chip--${o.id}`,
        'aria-label': t(`Attempt ${i + 1}: ${o.label}. Select to change outcome.`, `第 ${i + 1} 次尝试：${o.label}。点击切换结果。`),
        onclick: () => { const k = OUTCOMES.findIndex((x) => x.id === p); picks[i] = OUTCOMES[(k + 1) % OUTCOMES.length].id; draw(); } },
      h('span', { class: 'grp__n' }, `#${i + 1}`), h('span', {}, o.label));
      const half = (Math.abs(a) / aMax) * 50;
      return h('div', { class: 'grp__row' }, btn,
        h('span', { class: 'grp__r', title: o.why }, fmt(o.R)),
        h('div', { class: 'grp__track' }, h('span', { class: `grp__bar ${a >= 0 ? 'is-pos' : 'is-neg'}`,
          style: { left: a >= 0 ? '50%' : `${50 - half}%`, width: `${half}%` } })),
        h('span', { class: 'grp__a' }, signed(a)));
    }));
    stats.textContent = t(`μ = ${fmt(mu)}, s = ${fmt(sd)}, scale = max(s, ${C.sFloor}) = ${fmt(den)}. An unsuccessful return stays below zero (κ = ${C.reward.kappa} > ${C.reward.entry} + ${C.reward.progressCap} maximum shaping), and the advantage compares each attempt with its own group.`,
      `μ = ${fmt(mu)}，s = ${fmt(sd)}，尺度 = max(s, ${C.sFloor}) = ${fmt(den)}。失败回报始终小于零（κ = ${C.reward.kappa} > ${C.reward.entry} + ${C.reward.progressCap} 的最大塑形奖励），优势只在同组尝试之间比较。`);
  }
  host.append(
    h('div', { class: 'widget__head' }, h('h3', { class: 'widget__title' }, t('Eight attempts at one task', '同一任务的 8 次尝试')),
      h('span', { class: 'dir' }, t('Select an attempt to change its outcome', '点击某次尝试可切换其结果'))),
    h('div', { class: 'grp__hdr', 'aria-hidden': 'true' }, h('span', {}, t('Outcome', '结果')), h('span', {}, 'R'), h('span', {}, t('advantage A', '优势 A')), h('span', {})),
    list, stats,
    h('p', { class: 'widget__note' }, t('Simplified. Returns use only the outcome terms of Eq. 5 (STOP in region +20, first entry +2, leaving −1.5, non-STOP failure −10, κ = 4.51). Progress and control shaping, per-depth return-to-go and depth pooling are omitted. A real group holds six free attempts and two STOP-override attempts; override returns enter μ and s, but their decisions get no policy gradient. §3.4, pp. 4–5.', '简化版：回报只保留式 5 的结果项（区域内 STOP +20，首次进入 +2，离开 −1.5，非 STOP 失败 −10，κ = 4.51），省略进度与控制塑形、逐深度 return-to-go 与深度合并。实际训练时，每组包含 6 次自由尝试和 2 次 STOP-override 尝试；override 的回报参与 μ 与 s，但其决策不接收策略梯度。§3.4，第 4–5 页。')));
  draw();
}

export function renderGrpo() {
  noiseLab(mount('noise-lab'));
  groupLab(mount('group-lab'));
  mount('eq-actor').innerHTML = eqActor;
}
