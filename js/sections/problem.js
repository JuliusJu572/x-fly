// Problem: replanning budget (k toggle + amortized cost, §4.1) and the BC
// k=1 vs k=8 termination collapse (Table 3). All values from data/paper.js.
import { h, mount, segmented, onVisible, fmt } from '../lib/dom.js';
import { bindTip, tipRows } from '../lib/tooltip.js';
import { cost, value, share, failure } from '../data/paper.js';
import * as attr from './attribution.js';
import { t } from '../lib/i18n.js';

const W = cost.window;
const perCall = cost.visual + cost.fusion;
const costOf = (k) => ({ slow: cost.slow, vis: (W / k) * cost.visual, fus: (W / k) * cost.fusion, total: cost.slow + (W / k) * perCall });

function chunkCost(host) {
  const strip = h('div', { class: 'strip', 'aria-hidden': 'true' });
  for (let i = 0; i < W; i++) strip.append(h('i'));
  const caption = h('p', { class: 'widget__note' });
  const toggle = segmented(t('Controls per fused-policy call', '每次策略调用执行的控制数'), [
    { value: 1, label: 'k = 1' }, { value: 8, label: 'k = 8' }], 8, setK);

  function setK(k) {
    [...strip.children].forEach((c, i) => {
      c.className = (i % k === 0 ? 'look' : '') + (i === 0 ? ' slow' : '');
    });
    caption.textContent = k === 1
      ? t('k = 1: a fused-policy call (◆) before every waypoint. 16 calls per window.', 'k = 1：每个航点前调用一次融合策略 (◆)，每个窗口 16 次。')
      : t('k = 8: one fused-policy call (◆), then eight controls with no new visual input. 2 calls per window.', 'k = 8：调用一次融合策略 (◆)，随后连续执行 8 个控制，期间没有新的视觉输入。每个窗口 2 次。');
  }
  setK(8);

  const scaleMax = 3.2;
  const rows = [1, 8].map((k) => {
    const c = costOf(k);
    const segs = [['slow', t('Slow Qwen3.5-4B refresh', '慢路径 Qwen3.5-4B 刷新'), c.slow], ['vis', t('Fresh-frame visual tower', '当前帧视觉塔'), c.vis], ['fus', t('Fusion / control / STOP', '融合 / 控制 / STOP'), c.fus]]
      .map(([cls, name, v]) => {
        const seg = h('span', { class: `cost__seg cost__seg--${cls}`, tabindex: '0', 'data-w': (v / scaleMax) * 100, 'aria-label': `${name}: ${fmt(v)} s` });
        bindTip(seg, () => `<b>${name}</b>${tipRows([['k', k], [t('seconds / 16 waypoints', '秒 / 16 航点'), fmt(v, 3)]])}<div class="tip__src">${cost.src} · ${cost.gpu}</div>`);
        return seg;
      });
    return h('div', { class: 'cost__row' },
      h('span', { class: 'cost__k' }, `k = ${k}`),
      h('div', { class: 'cost__track' }, segs),
      h('span', { class: 'cost__val' }, `${fmt(c.total)} s`, h('small', {}, t(`${Math.round((c.total / W) * 1000)} ms / waypoint`, `${Math.round((c.total / W) * 1000)} ms / 航点`))));
  });

  host.append(
    h('div', { class: 'widget__head' },
      h('h3', { class: 'widget__title' }, t('Replanning budget over one 16-waypoint window', '一个 16 航点窗口内的重规划开销')), toggle.el),
    strip,
    h('div', { class: 'strip__axis', 'aria-hidden': 'true' }, h('span', {}, t('waypoint 1', '航点 1')), h('span', {}, '16')),
    caption,
    h('div', { class: 'legend', style: { marginTop: '18px' } },
      h('span', {}, h('i', { class: 'sw', style: { background: 'var(--amber)' } }), t('Slow VLM refresh, 0.320 s', '慢路径 VLM 刷新，0.320 s')),
      h('span', {}, h('i', { class: 'sw', style: { background: 'var(--expert)' } }), t('Visual tower, 0.141 s / call', '视觉塔，0.141 s / 次')),
      h('span', {}, h('i', { class: 'sw', style: { background: 'var(--learner)' } }), t('Fusion + heads, 0.034 s / call', '融合 + 输出头，0.034 s / 次'))),
    h('div', { class: 'cost' }, rows),
    h('p', { class: 'widget__note' }, t(`Model inference only, measured on an ${cost.gpu}. Bars share one scale. Source: ${cost.src}.`, `仅模型推理时间，在 ${cost.gpu} 上测得。各条共用同一刻度。来源：${cost.src}。`)));

  onVisible(host, () => host.querySelectorAll('.cost__seg').forEach((s) => { s.style.width = `${s.dataset.w}%`; }));
}

// The termination half of the gap, from Table 3: switching BC from k = 1 to k = 8 barely
// changes navigation failures on test-seen, but about half the episodes now reach and never stop.
function reachNotStop(host) {
  let split = 'seen';
  const body = h('div');
  const note = h('p', { class: 'widget__note' });
  const seg = segmented(t('Split', '数据划分'), [{ value: 'seen', label: 'test-seen' }, { value: 'unseen', label: 'test-unseen' }], split, (v) => { split = v; draw(); });
  function draw() {
    body.replaceChildren(attr.bars([{ id: 'bc1', split, label: 'X-Fly BC' }, { id: 'bc8', split, label: 'X-Fly BC' }]));
    const nav1 = share('bc1', split, 'nav'), nav8 = share('bc8', split, 'nav');
    const ns8 = share('bc8', split, 'nostop');
    note.textContent = t(`Navigation failures ${fmt(nav1)}% → ${fmt(nav8)}%. No-stop ${fmt(share('bc1', split, 'nostop'))}% → ${fmt(ns8)}%: `
      + `the policy reaches the region, never stops, and ends outside it. SR ${fmt(value('bc1', split, 'SR'))}% → ${fmt(value('bc8', split, 'SR'))}%. `
      + (split === 'seen' ? 'On test-seen this is most of the SR drop. ' : 'On test-unseen full-chunk BC also reaches less often. ')
      + `Source: ${failure.src}.`,
      `导航失败 ${fmt(nav1)}% → ${fmt(nav8)}%。未停止 ${fmt(share('bc1', split, 'nostop'))}% → ${fmt(ns8)}%：策略到达了目标区域，却从未停止，最终停在区域外。SR ${fmt(value('bc1', split, 'SR'))}% → ${fmt(value('bc8', split, 'SR'))}%。`
      + (split === 'seen' ? '在 test-seen 上，这就是 SR 下降的主要来源。' : '在 test-unseen 上，整块执行的 BC 到达目标的次数也变少了。')
      + `来源：${failure.src}。`);
  }
  host.append(h('div', { class: 'widget' },
    h('div', { class: 'widget__head' },
      h('div', {}, h('h3', { class: 'widget__title' }, t('Reaching is not stopping', '到达不等于停下')),
        h('p', { class: 'dir', style: { margin: '6px 0 0' } }, t('X-Fly BC · share of episodes by outcome · SR at right', 'X-Fly BC · 各类结果的 episode 占比 · 右侧为 SR'))),
      seg.el),
    attr.legend(), body, note));
  draw();
}

export function renderProblem() {
  chunkCost(mount('chunk-cost'));
  reachNotStop(mount('bc-collapse'));
}
