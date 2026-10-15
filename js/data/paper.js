// Single source of truth for every number on the page.
// Source: the arXiv preprint (paper/main.tex, 13 pp. incl. appendix). `src` strings point to the
// PDF page / table / equation. Derived values (deltas, sums) are computed in code from these
// rows, never typed by hand.
import { t } from '../lib/i18n.js';

export const paper = {
  name: 'X-Fly',
  title: 'X-Fly: Learning to Reach and Stop in Full-Chunk Aerial Vision-Language Navigation',
  venue: t('arXiv preprint', 'arXiv 预印本'),
  org: 'ARIDGE, XPENG',
};

export const metrics = {
  SR: { name: t('Success rate', '成功率'), unit: '%', better: 'higher',
        def: t('Final position within 20 m of the goal.', '最终位置距目标 20 m 以内。') },
  OSR: { name: t('Oracle success rate', 'Oracle 成功率'), unit: '%', better: 'higher',
         def: t('Executed prefix comes within 20 m of the goal at some point.', '已执行路径曾进入目标 20 m 范围。') },
  SPL: { name: t('Success weighted by path length', '路径长度加权成功率'), unit: '%', better: 'higher',
         def: t('Success discounted by path efficiency.', '按路径效率折算的成功率。') },
  NE: { name: t('Navigation error', '导航误差'), unit: 'm', better: 'lower',
        def: t('Distance from the final position to the goal.', '最终位置到目标的距离。') },
};
export const metricOrder = ['SR', 'OSR', 'SPL', 'NE'];
export const betterText = (m) => (metrics[m].better === 'higher' ? t('higher is better', '越高越好') : t('lower is better', '越低越好'));

// Table 1, p. 6. group: 'prior' | 'xfly'. stop: termination protocol of the row.
const NATIVE = t('Published result, native stopping policy', '已发表结果，原生停止策略');
const BERN = t('Bernoulli STOP at unit temperature σ(ℓ), 128-control cap, evaluated exactly over its first-stop distribution',
  '单位温度 Bernoulli STOP σ(ℓ)，128 步控制上限，按首次停止分布精确求期望');
export const table1 = {
  src: t('Table 1, p. 6', '表 1，第 6 页'),
  caption: t('OpenFly test-seen and test-unseen, DreamFly-processed benchmark.', 'OpenFly test-seen 与 test-unseen，DreamFly 处理后的基准。'),
  rows: [
    { id: 'random', label: 'Random', group: 'prior', stop: NATIVE,
      seen: [13.51, 18.75, 9.72, 65.67], unseen: [15.35, 23.76, 11.31, 59.99] },
    { id: 'sampling', label: 'Action Sampling', group: 'prior', stop: NATIVE,
      seen: [15.95, 26.51, 13.67, 62.78], unseen: [20.54, 32.67, 17.22, 55.27] },
    { id: 'seq2seq', label: 'Seq2Seq', group: 'prior', stop: NATIVE,
      seen: [24.35, 61.93, 19.35, 54.44], unseen: [26.49, 61.88, 19.62, 47.69] },
    { id: 'cma', label: 'CMA', group: 'prior', stop: NATIVE,
      seen: [7.97, 69.32, 6.26, 313.03], unseen: [5.69, 73.02, 3.92, 230.05] },
    { id: 'aerialvln', label: 'AerialVLN', cite: 'Liu et al., ICCV 2023', group: 'prior', stop: NATIVE,
      seen: [16.52, 65.66, 14.63, 176.29], unseen: [9.65, 68.07, 7.93, 161.19] },
    { id: 'openfly', label: 'OpenFly-Agent', cite: 'Gao et al., ICLR 2026', group: 'prior', stop: NATIVE,
      seen: [22.63, 52.73, 20.42, 122.89], unseen: [14.11, 62.38, 12.49, 163.87] },
    { id: 'dreamfly', label: 'DreamFly', k: 1, cite: 'Deng & Xu, arXiv 2026', group: 'prior', stop: NATIVE,
      seen: [32.04, 46.77, 28.22, 44.87], unseen: [29.46, 46.78, 23.54, 45.29] },
    { id: 'bc1', label: 'X-Fly BC', k: 1, stage: 'bc', group: 'xfly', stop: BERN,
      seen: [46.57, 52.85, 39.92, 37.28], unseen: [22.49, 23.46, 21.00, 58.61] },
    { id: 'bc8', label: 'X-Fly BC', k: 8, stage: 'bc', group: 'xfly', stop: BERN,
      seen: [16.45, 67.30, 13.54, 37.87], unseen: [18.43, 43.14, 16.18, 48.12] },
    { id: 'dag1', label: '+ Recovery DAgger', k: 1, stage: 'dagger', group: 'xfly', stop: BERN,
      seen: [68.88, 75.45, 56.84, 20.12], unseen: [44.27, 47.64, 39.96, 36.43] },
    { id: 'dag8', label: '+ Recovery DAgger', k: 8, stage: 'dagger', group: 'xfly', stop: BERN,
      seen: [63.46, 72.87, 54.54, 21.49], unseen: [40.63, 52.71, 36.46, 35.16] },
    { id: 'grpo8', label: '+ Flow-GRPO (X-Fly, full)', k: 8, stage: 'grpo', group: 'xfly', stop: BERN,
      final: true,
      seen: [74.18, 84.07, 66.34, 17.77], unseen: [51.73, 68.07, 47.03, 29.17] },
  ],
};

export function row(id) { return table1.rows.find((r) => r.id === id); }
export function value(id, split, metric) { return row(id)[split][metricOrder.indexOf(metric)]; }

// Table 3 (App. A, p. 13), the data behind Fig. 4 (p. 7). % of episodes; the two success
// columns sum to SR and all six columns of a split sum to 100. Rule in App. C, p. 13.
export const failure = {
  src: t('Table 3, p. 13 · Fig. 4, p. 7', '表 3，第 13 页 · 图 4，第 7 页'),
  kinds: [
    { id: 'succ', label: t('Success, STOP', '成功（STOP）'), side: 'success',
      def: t('Ends with an explicit STOP inside the 20 m region.', '在 20 m 区域内显式 STOP 结束。') },
    { id: 'succns', label: t('Success, no STOP', '成功（未 STOP）'), side: 'success',
      def: t('Inside the region when the 128-control budget runs out, without STOP.', '控制预算耗尽时恰在区域内，未发出 STOP。') },
    { id: 'early', label: t('Early stop', '过早停止'), side: 'termination',
      def: t('STOP outside the region before the first in-region anchor.', '在首个区域内锚点之前、区域外 STOP。') },
    { id: 'late', label: t('Late stop', '过晚停止'), side: 'termination',
      def: t('STOP outside the region after the first in-region anchor.', '经过首个区域内锚点之后、区域外 STOP。') },
    { id: 'nostop', label: t('No stop', '未停止'), side: 'termination',
      def: t('Reaches the region, never stops, and ends outside it.', '到达过区域，但从未停止，最终在区域外。') },
    { id: 'nav', label: t('Navigation', '导航失败'), side: 'control',
      def: t('No in-region anchor even with STOP disabled.', '即使禁用 STOP，也没有任何锚点进入区域。') },
  ],
  // [succ STOP, succ no STOP, nav, early, late, nostop], column order of Table 3.
  cols: ['succ', 'succns', 'nav', 'early', 'late', 'nostop'],
  rows: {
    bc1: { seen: [44.27, 2.30, 28.02, 19.13, 6.20, 0.07], unseen: [21.45, 1.04, 44.80, 31.74, 0.65, 0.33] },
    bc8: { seen: [5.10, 11.35, 30.77, 3.85, 1.15, 47.78], unseen: [3.80, 14.63, 53.22, 3.98, 0.48, 23.88] },
    dag1: { seen: [68.88, 0.00, 7.14, 17.41, 6.57, 0.00], unseen: [44.27, 0.00, 18.56, 33.80, 3.37, 0.00] },
    dag8: { seen: [63.46, 0.00, 7.14, 21.21, 8.19, 0.00], unseen: [40.63, 0.00, 10.40, 37.18, 11.80, 0.00] },
    grpo8: { seen: [74.18, 0.00, 6.59, 9.34, 9.89, 0.00], unseen: [51.73, 0.00, 11.39, 21.04, 15.84, 0.00] },
  },
  order: ['bc1', 'bc8', 'dag1', 'dag8', 'grpo8'],
};
export function share(id, split, kind) {
  return failure.rows[id][split][failure.cols.indexOf(kind)];
}

// §4.1 "Amortized inference cost", p. 5. Seconds, NVIDIA RTX PRO 5000 72GB.
export const cost = {
  src: t('§4.1, p. 5', '§4.1，第 5 页'),
  gpu: 'NVIDIA RTX PRO 5000 72GB',
  window: 16,
  slow: 0.320, visual: 0.141, fusion: 0.034,
  stated: { k1: 3.12, k8: 0.67, msK1: 195, msK8: 42, ratio: 4.66 },
};

// §4.3, p. 6: final policy with STOP disabled (diagnostics defined in §4.1, not benchmark rows).
export const reach = {
  src: t('§4.3, p. 6', '§4.3，第 6 页'),
  anchor: { seen: 93.41, unseen: 88.61 },
  denseMinusAnchorUnseen: 0.75,
};

// §4.4 (p. 7) + Fig. 5 (p. 8) + App. A.5 / A.7. The curves themselves live in data/curves.js.
export const dynamics = {
  src: t('§4.4, p. 7 · Fig. 5, p. 8', '§4.4，第 7 页 · 图 5，第 8 页'),
  panel: 384, every: 20, bcStoppedAt: 680, updates: 3000, matched: 35,
};

// §3 + Appendix A (pp. 2–5, 10–12). Values used by the explainers.
export const config = {
  H: 8, D: 4, M: 4, rho: 0.1, euler: 6, tail: [3, 4, 5],
  sigma: (s) => 0.20 - 0.15 * s / 6,
  bcWindows: 849106, daggerRounds: 3, mix: '1:1', recoveryStops: 8404,
  groupSize: 8, groups: 48, free: 6, override: 2, overrideN: [1, 2, 3], legalFrom: 2,
  beta: 0.01, sFloor: 0.5, rankWeight: 0.5,
  reward: { success: 20, entry: 2, leave: -1.5, terminal: -10, kappa: 4.51, progressCap: 2.5 },
  stopTempTrain: 1.5, radius: 20, controlCap: 128,
  cacheKeyframes: 4, refresh: 16, queryTokens: 48, width: 768, fusionBlocks: 3, fusionHeads: 12,
  ditLayers: 2, ditHidden: 256, ditHeads: 8, ditParams: '3.9M', trainable: '≈45M',
};
