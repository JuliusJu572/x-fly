// Limits (§5, numbers from §4.3): with STOP disabled the final policy reaches the region in
// most episodes, but only part of that converts into success. Same attribution bars as
// Results, with the anchor-reach span drawn on top. Reach is a diagnostic, not a benchmark row.
import { h, mount, fmt } from '../lib/dom.js';
import { reach, share, value, failure } from '../data/paper.js';
import * as attr from './attribution.js';
import { t } from '../lib/i18n.js';

export function renderLimits() {
  const host = mount('stop-gap');
  const term = (sp) => ['early', 'late', 'nostop'].reduce((a, k) => a + share('grpo8', sp, k), 0);
  host.append(
    h('div', { class: 'widget__head' },
      h('h3', { class: 'widget__title' }, t('Final policy: reached vs. stopped', '最终策略：到达 vs. 停下')),
      h('span', { class: 'dir' }, t('X-Fly (full), k = 8', 'X-Fly（完整），k = 8'))),
    attr.legend(),
    attr.bars([{ id: 'grpo8', split: 'seen', label: 'test-seen', sub: '' }, { id: 'grpo8', split: 'unseen', label: 'test-unseen', sub: '' }], { bracket: true }),
    h('p', { class: 'widget__note' }, t(`The bracket marks anchor reach: with STOP disabled, some decision anchor lies inside the 20 m region `
      + `(${fmt(reach.anchor.seen)}% seen, ${fmt(reach.anchor.unseen)}% unseen). Of the ${fmt(100 - value('grpo8', 'unseen', 'SR'))} failed points on test-unseen, `
      + `${fmt(term('unseen'))} are termination and ${fmt(share('grpo8', 'unseen', 'nav'))} navigation.`,
      `括号标出锚点到达率：禁用 STOP 时，有决策锚点落在 20 m 区域内的比例（seen ${fmt(reach.anchor.seen)}%，unseen ${fmt(reach.anchor.unseen)}%）。test-unseen 上失败的 ${fmt(100 - value('grpo8', 'unseen', 'SR'))} 个百分点中，`
      + `${fmt(term('unseen'))} 来自停止时机，${fmt(share('grpo8', 'unseen', 'nav'))} 来自导航。`)),
    h('p', { class: 'widget__note' }, t(`Source: ${reach.src} · ${failure.src}`, `来源：${reach.src} · ${failure.src}`)));
}
