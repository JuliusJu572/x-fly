// Method: the paper's Fig. 3 with one card per block (§3.2, App. A.2), plus the original
// paper figures in a dialog. Card text paraphrases the paper only.
import { h, mount, $ } from '../lib/dom.js';
import { config as C } from '../data/paper.js';
import { t, asset } from '../lib/i18n.js';

const NODES = [
  { id: 'instr', t: t('Instruction', '指令'), sub: t('free-form text', '自由文本'), g: 'slow',
    d: t('The navigation instruction, placed after the cached keyframes in the slow VLM input.', '导航指令，排在缓存关键帧之后输入慢路径 VLM。') },
  { id: 'cache', t: t('Keyframe cache', '关键帧缓存'), sub: t(`≤ ${C.cacheKeyframes} causal keyframes`, `≤ ${C.cacheKeyframes} 帧因果关键帧`), g: 'slow',
    d: t(`Up to ${C.cacheKeyframes} causal keyframes, oldest first, refreshed on a fixed timer every ${C.refresh} executed control steps. The VLM decoder re-runs only when the cache changes.`,
      `最多 ${C.cacheKeyframes} 帧因果关键帧，按时间先后排列，每执行 ${C.refresh} 步控制按固定节拍刷新一次。只有缓存变化时才重新运行 VLM 解码器。`) },
  { id: 'rgb', t: t('Current RGB', '当前 RGB'), sub: t('448 × 448, every decision', '448 × 448，每次决策'), g: 'fast',
    d: t('The frame observed at the current decision anchor.', '当前决策锚点处的观测帧。') },
  { id: 'ego', t: t('State + executed controls', '状态 + 已执行控制'), sub: t('relative only, no goal', '仅相对量，无目标坐标'), g: 'motion',
    d: t('A 10-D ego state, a slow-cache anchor (pose change since the cache formed, cache age) and the last eight executed actions. All entries are relative; no goal or global coordinate is given. Predicted but unexecuted controls never enter the history.',
      '10 维自身状态、慢缓存锚点（缓存形成以来的位姿变化与缓存年龄）以及最近 8 个已执行动作。全部为相对量，不提供目标或全局坐标。预测但未执行的控制不会写入历史。') },
  { id: 'vlm', t: 'Qwen3.5-4B VLM', sub: t('frozen', '冻结'), frozen: true, g: 'slow',
    d: t(`Frozen in all three stages. Hidden states of the fourth-last decoder layer are read out. The slow path refreshes once per ${C.refresh} executed waypoints, at 0.320 s per refresh (§4.1, p. 5).`,
      `三个阶段全程冻结，读取倒数第四层解码器隐状态。慢路径每执行 ${C.refresh} 个航点刷新一次，每次 0.320 s（§4.1，第 5 页）。`) },
  { id: 'tower', t: t('Visual tower', '视觉塔'), sub: t('same Qwen3.5-4B, frozen', '同一 Qwen3.5-4B，冻结'), frozen: true, g: 'fast',
    d: t('Only the visual tower of the same Qwen3.5-4B runs on the current frame, without the language decoder. 0.141 s per call (§4.1, p. 5).', '只在当前帧上运行同一 Qwen3.5-4B 的视觉塔，不跑语言解码器。每次 0.141 s（§4.1，第 5 页）。') },
  { id: 'obsq', t: t('Observation queries', '观测查询'), sub: t(`${C.queryTokens} tokens`, `${C.queryTokens} 个 token`), g: 'slow',
    d: t('A learned query bank that cross-attends to the image-token positions of the cached keyframes.', '可学习查询组，对缓存关键帧的图像 token 位置做交叉注意力。') },
  { id: 'navq', t: t('Navigation queries', '导航查询'), sub: t('cross-attention memory', '交叉注意力记忆'), g: 'slow',
    d: t('A query bank restricted to the instruction span. Fusion reads it as cross-attention memory rather than as part of the main sequence.', '只关注指令片段的查询组。融合层通过交叉注意力读取它，不将其放入主序列。') },
  { id: 'curq', t: t('Current-frame queries', '当前帧查询'), sub: t(`${C.queryTokens} tokens`, `${C.queryTokens} 个 token`), g: 'fast',
    d: t('A third query bank compresses the 784 × 1024 patch tokens of the current frame into 48 tokens, so the policy sees the current view at visual-tower cost.', '第三组查询把当前帧 784 × 1024 的 patch token 压缩为 48 个，仅需运行视觉塔，即可保留当前帧的视觉信息。') },
  { id: 'sa', t: t('State / anchor / action tokens', '状态 / 锚点 / 动作 token'), sub: t('10 tokens', '10 个 token'), g: 'motion',
    d: t('Ego state, slow-cache anchor and the last eight executed actions, one token each. Empty history slots are masked.', '自身状态、慢缓存锚点和最近 8 个已执行动作，各一个 token；空历史位被 mask。') },
  { id: 'fusion', t: t('Causal fusion', '因果融合'), sub: t(`${C.fusionBlocks} blocks · width ${C.width}`, `${C.fusionBlocks} 层 · 宽 ${C.width}`), g: 'fusion',
    d: t(`Task, observation, current-frame and state/anchor/action tokens form the main sequence; navigation queries enter as cross-attention memory. ${C.fusionBlocks} pre-LN blocks, width ${C.width}, ${C.fusionHeads} heads. 0.034 s per call together with the heads (§4.1, p. 5).`,
      `任务、观测、当前帧与状态/锚点/动作 token 组成主序列，导航查询作为交叉注意力记忆进入。${C.fusionBlocks} 个 pre-LN 模块，宽 ${C.width}，${C.fusionHeads} 头。与输出头合计每次 0.034 s（§4.1，第 5 页）。`) },
  { id: 'flow', t: t('Rectified-flow DiT', 'Rectified-flow DiT'), sub: t(`${C.H} × ${C.D} control chunk`, `${C.H} × ${C.D} 控制块`), g: 'head',
    d: t(`${C.ditLayers} layers, width ${C.ditHidden}, ${C.ditHeads} heads, ${C.ditParams} parameters. ${C.euler} Euler steps produce eight body-frame controls (Δx, Δy, Δz, Δψ), trained by rectified flow (Eq. 1). If CONTINUE is sampled, all eight are executed.`,
      `${C.ditLayers} 层、宽 ${C.ditHidden}、${C.ditHeads} 头，${C.ditParams} 参数。${C.euler} 步 Euler 积分生成 8 个机体系控制量 (Δx, Δy, Δz, Δψ)，以 rectified flow 训练（式 1）。若采样到 CONTINUE，则连续执行全部 8 步控制。`) },
  { id: 'stop', t: t('STOP head', 'STOP 头'), sub: t('Bernoulli logit ℓ', 'Bernoulli logit ℓ'), g: 'head',
    d: t(`A two-layer MLP on the fused STOP token, computed before and independently of the controller. Evaluation samples STOP ~ Bernoulli(σ(ℓ)) at unit temperature; temperature ${C.stopTempTrain} is used only in Flow-GRPO training rollouts.`,
      `作用于融合 STOP token 的两层 MLP，先于控制器且独立计算。评测时以单位温度采样 STOP ~ Bernoulli(σ(ℓ))；温度 ${C.stopTempTrain} 只用于 Flow-GRPO 训练采样。`) },
];
const GROUPS = [
  [t('Slow branch · instruction and keyframes', '慢分支 · 指令与关键帧'), ['instr', 'cache', 'vlm', 'obsq', 'navq']],
  [t('Fast branch · the current frame', '快分支 · 当前帧'), ['rgb', 'tower', 'curq']],
  [t('State and executed history', '状态与已执行历史'), ['ego', 'sa']],
  [t('Fusion and output heads', '融合与输出头'), ['fusion', 'flow', 'stop']],
];
const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));

export function renderMethod() {
  // The paper's own Fig. 3 is the diagram; the cards below paraphrase each block from §3.2 / App. A.2.
  const host = mount('arch');
  const fig = h('button', { type: 'button', class: 'arch__fig', 'data-figure': 'model_architecture',
    'aria-label': t('Enlarge Fig. 3, the policy backbone', '放大图 3：策略骨干') },
  h('img', { src: asset('model_architecture.webp'), alt: t('Fig. 3 of the paper: the X-Fly policy backbone with slow VLM path, fast visual-tower path, fusion, rectified-flow controller and STOP head.',
    '论文图 3：X-Fly 策略骨干，包括慢路径 VLM、快路径视觉塔、融合层、rectified-flow 控制器与 STOP 头。'), width: 2000, height: 800, loading: 'lazy' }));
  const card = (n) => h('div', { class: `arch-card arch-card--${n.g}${n.frozen ? ' is-frozen' : ''}` },
    h('p', { class: 'arch-card__t' }, n.t, n.frozen ? h('span', { class: 'arch-card__f' }, t('frozen', '冻结')) : null),
    h('p', { class: 'arch-card__s' }, n.sub), h('p', { class: 'arch-card__d' }, n.d));
  const groups = h('div', { class: 'arch__groups' }, GROUPS.map(([title, ids]) => h('section', { class: 'arch__group' },
    h('h4', { class: 'arch__gt' }, title), h('div', { class: 'arch__cards', 'data-n': ids.length }, ids.map((id) => card(byId[id]))))));
  host.append(fig, groups);

  // Captions paraphrase the paper's own figure captions.
  const FIGS = {
    teaser_sr_cost: [t('Fig. 1 · Accuracy–inference trade-off of X-Fly stages (p. 1)', '图 1 · X-Fly 各阶段的精度–推理代价权衡（第 1 页）'),
      t('SR under single-step (k = 1) and full-chunk (k = 8) execution; x-labels give amortized model inference per executed waypoint. On test-seen, full-chunk BC reaches the goal but often does not stop. Recovery DAgger makes full-chunk execution viable, and Flow-GRPO, trained and evaluated at k = 8 only, gives the highest SR among the evaluated operating points at 4.7× less amortized model inference time per executed waypoint than single-step execution. DreamFly is shown as an SR reference at k = 1.',
        '单步 (k = 1) 与整块 (k = 8) 执行下的 SR；横轴标注每个已执行航点的摊销推理时间。在 test-seen 上，整块执行的 BC 能飞到目标附近却常常不停。Recovery DAgger 让整块执行变得可用；只在 k = 8 下训练和评测的 Flow-GRPO 在所有评测工作点中 SR 最高，且每航点摊销推理时间比单步执行少 4.7×。DreamFly 作为 k = 1 的 SR 参照。')],
    model_architecture: [t('Fig. 3 · Policy backbone shared by the three training stages (p. 4)', '图 3 · 三个训练阶段共用的策略骨干（第 4 页）'),
      t('A slow path runs the frozen Qwen3.5-4B VLM on the instruction and causal keyframes; a fast path runs only its visual tower on the current frame. Fused with ten state/anchor/action tokens (ego state, slow-cache anchor, and the last eight executed actions), the representation drives a rectified-flow controller that emits eight 4-D controls (Δx, Δy, Δz, Δψ) and a separate Bernoulli STOP head; if CONTINUE is sampled, all eight controls are executed.',
        '慢路径用冻结的 Qwen3.5-4B VLM 处理指令与因果关键帧；快路径只在当前帧上运行其视觉塔。融合 10 个状态/锚点/动作 token（自身状态、慢缓存锚点和最近 8 个已执行动作）后，表示驱动 rectified-flow 控制器输出 8 个 4 维控制量 (Δx, Δy, Δz, Δψ)，另有独立的 Bernoulli STOP 头；若采样到 CONTINUE，则连续执行全部 8 步控制。')],
    mechanism_training: [t('Fig. 2 · The full-chunk support gap and how X-Fly addresses it (p. 3)', '图 2 · 整块执行的专家数据覆盖缺口，以及 X-Fly 如何应对（第 3 页）'),
      t('(a) Full-chunk BC flies eight controls between decisions and visits learner-induced anchors that expert demonstrations cover poorly, with neither a corrective chunk nor an arrival STOP label; the policy overshoots the goal. (b) Recovery DAgger relabels each learner anchor with a chunk whose offset decays by a smoothstep and rejoins the expert route at the chunk end; the first in-region anchor receives STOP. (c) Flow-GRPO samples six free and two STOP-override attempts per task with low-frequency chunk noise and a Bernoulli STOP policy, and uses their relative outcomes to update both.',
        '(a) 整块执行的 BC 在两次决策之间连飞 8 步，到达专家示范覆盖很差的学习者锚点，那里既没有纠偏 chunk，也没有到达时的 STOP 标签，于是策略冲过目标。(b) Recovery DAgger 为每个学习者锚点重新标注一个 chunk：偏移按 smoothstep 衰减，在 chunk 末端回到专家路线；第一个进入区域的锚点标为 STOP。(c) Flow-GRPO 对每个任务采样 6 次自由尝试和 2 次 STOP-override 尝试，使用低频 chunk 噪声和 Bernoulli STOP 策略，并用它们的相对结果同时更新两者。')],
    failure_transition: [t('Fig. 4 · Outcome attribution on the same recorded rollouts (p. 7)', '图 4 · 同一批录制轨迹上的结果归因（第 7 页）'),
      t('Each row splits a policy\'s episodes into two success and four failure types and sums to 100; values are expectations under the first-stop distribution, in %. Two-decimal values are in Table 3.',
        '每行把一个策略的 episode 拆成 2 类成功与 4 类失败，合计 100%；数值为首次停止分布下的期望（%）。两位小数的数值见表 3。')],
    grpo_dynamics_merged: [t('Fig. 5 · Flow-GRPO from recovered vs. BC initialization (p. 8)', '图 5 · Flow-GRPO：Recovery 初始化与 BC 初始化对比（第 8 页）'),
      t('Source-validation SR, OSR and NE on a fixed 384-route BigCity panel excluded from Flow-GRPO updates, evaluated every 20 updates; dashed lines mark each initialization. The BC-initialized run was stopped at 680 updates as its OSR and NE kept degrading.',
        '在固定的 384 条 BigCity 验证航线（不参与 Flow-GRPO 更新）上每 20 次更新评测一次 SR、OSR 与 NE；虚线为各自初始值。BC 初始化的训练因 OSR 与 NE 持续变差，在 680 次更新时停止。')],
  };

  const dlg = $('#figdlg');
  document.querySelectorAll('[data-figure]').forEach((b) => b.addEventListener('click', () => {
    const [title, cap] = FIGS[b.dataset.figure];
    $('#figdlg-title').textContent = title;
    $('#figdlg-cap').textContent = cap;
    const img = $('#figdlg-img');
    img.src = asset(`${b.dataset.figure}.webp`); img.alt = title;
    dlg.showModal();
  }));
}
