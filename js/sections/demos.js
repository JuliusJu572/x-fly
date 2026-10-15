// Closed-loop rollouts on held-out SmallCity routes (test-unseen). Each clip: the full
// instruction on top, the expert's first-person view, the policy's first-person view with
// the current 8-control chunk overlaid, and a top-down GT/PRED comparison.
import { h, mount, reducedMotion } from '../lib/dom.js';
import { t, asset } from '../lib/i18n.js';

const ROUTE = {
  high: ['High altitude', '高空'], low: ['Low altitude', '低空'], medium: ['Medium altitude', '中空'],
  short: ['short route', '短航线'], average: ['medium route', '中等航线'], long: ['long route', '长航线'],
  updown: ['climbs and descends', '含升降'],
};
const routeLabel = (cat) => {
  const [alt, len, ud] = cat.split('_');
  return [ROUTE[alt], ROUTE[len], ud ? ROUTE[ud] : null].filter(Boolean).map(([en, cn]) => t(en, cn)).join(t(' · ', ' · '));
};

export const ROLLOUTS = [
  { id: 'water_tower_140m', cat: 'high_long', path: 140.3, stop: 8.4,
    title: ['Water tower, then the HVAC roof', '水塔，再到屋顶空调机组'],
    instr: 'Advance forward to a large gray cylindrical structure with conical roofs , which is a water tower , then slightly ascend and continue straight towards another large gray structure with a rooftop containing HVAC units , identified as a building . Finally , move down to a medium - height , wide building with a red and gray ornate facade and decorative elements .' },
  { id: 'ascend_descend_156m', cat: 'low_average_updown', path: 156.3, stop: 16.1,
    title: ['Climb, cruise, descend beside the target', '爬升、巡航、在目标旁下降'],
    instr: 'First , move upwards until reaching an unspecified point , then proceed straight towards a large gray building characterized by windows and fire escapes . Slightly turn right and continue going straight towards another large building , this one brown with a water tank on the roof . Finally , stop slightly and fall next to a medium - sized gray apartment building with fire escapes .' },
  { id: 'skyline_103m', cat: 'high_average', path: 103.3, stop: 18.3,
    title: ['Five landmarks across the skyline', '穿过天际线的五个地标'],
    instr: 'Move forward to the skyscraper with a gray , striped facade featuring illuminated windows , then slightly turn right and head straight towards another tall gray building with columns . After that , slightly turn left and proceed straight to a large red building characterized by multiple stories and distinct architectural details . Next , slightly descend and turn left again , continuing straight to yet another gray building distinguished by tall windows . Finally , go upwards to a medium - sized brown building with an ornate facade and arched windows .' },
  { id: 'left_turn_123m', cat: 'high_long', path: 123.4, stop: 14.6,
    title: ['Dark tower, left turn, light-gray block', '深色高楼、左转、浅灰楼群'],
    instr: 'Move forward towards the dark gray , tall building with multiple floors , which is large in size , then slightly turn left and advance to the light grey , rectangular building with uniform windows that is very large and prominent in the skyline .' },
  { id: 'parking_lot_67m', cat: 'high_short', path: 67.0, stop: 7.9,
    title: ['Road, tower, parking lot, tower', '道路、高楼、停车场、高楼'],
    instr: 'Proceed forward to a narrow gray road with pavement lane markings . Slightly veer right , advancing directly toward a large gray building with illuminated windows and multiple floors , which is tall and rectangular . Move left to a medium gray parking lot characterized by open space and parked cars . Finally , continue straight toward another large gray building , noted for its rectangular grid of windows .' },
  { id: 'office_114m', cat: 'high_long', path: 113.9, stop: 0.6,
    title: ['One sentence, stops 0.6 m from the goal', '一句指令，停在距目标 0.6 米处'],
    instr: 'Proceed to the light gray office building , characterized by its rectangular windows , flat roof , and medium size compared to surrounding structures .' },
];

// OpenFly instructions are space-tokenized; re-attach punctuation for display.
const tidy = (s) => s.replace(/\s+([,.;:!?])/g, '$1').replace(/\s-\s/g, '-');

export function renderDemos() {
  const host = mount('demos');
  if (!host) return;
  const still = reducedMotion();
  const video = h('video', { class: 'demo__video', muted: true, loop: true, playsinline: true, preload: 'metadata',
    autoplay: !still, 'aria-describedby': 'demo-instr' });
  video.muted = true;
  let wantPlay = !still;
  const toggle = h('button', { type: 'button', class: 'btn', onclick: () => { wantPlay = video.paused; if (wantPlay) video.play().catch(() => {}); else video.pause(); } });
  const label = () => { toggle.textContent = video.paused ? t('Play', '播放') : t('Pause', '暂停'); toggle.setAttribute('aria-pressed', String(!video.paused)); };
  video.addEventListener('play', label); video.addEventListener('pause', label);
  video.addEventListener('click', () => toggle.click());
  const title = h('h3', { class: 'demo__title' });
  const meta = h('div', { class: 'demo__meta' });
  const instr = h('blockquote', { class: 'demo__instr', id: 'demo-instr', lang: 'en' });

  const select = (r, play = true) => {
    video.poster = asset(`rollouts/${r.id}.jpg`);
    video.src = asset(`rollouts/${r.id}.mp4`);
    if (play && wantPlay) video.play().catch(() => {});
    label();
    title.textContent = t(...r.title);
    meta.replaceChildren(
      h('span', { class: 'chip' }, routeLabel(r.cat)),
      h('span', { class: 'chip' }, t('Flown path ', '实际飞行 '), h('b', {}, `${r.path.toFixed(1)} m`)),
      h('span', { class: 'chip chip--ok' }, t('Stopped ', '停止点距目标 '), h('b', {}, `${r.stop.toFixed(1)} m`), t(' from the goal', '')));
    instr.textContent = tidy(r.instr);
    thumbs.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === r.id)));
  };

  const thumbs = ROLLOUTS.map((r, i) => h('button', { type: 'button', class: 'demo__thumb', 'data-id': r.id,
    'aria-pressed': 'false', 'aria-label': `${t('Rollout', '示例')} ${i + 1}: ${t(...r.title)}`, onclick: () => select(r) },
  h('img', { src: asset(`rollouts/${r.id}.jpg`), alt: '', loading: 'lazy', width: 248, height: 87 }),
  h('span', { class: 'demo__thumbn' }, String(i + 1).padStart(2, '0')),
  h('span', { class: 'demo__thumbt' }, `${r.path.toFixed(0)} m`)));

  host.append(
    h('div', { class: 'demo__stage' },
      h('div', { class: 'demo__screen' }, video,
        h('div', { class: 'demo__panes', 'aria-hidden': 'true' },
          h('span', {}, t('Expert view (GT)', '专家视角 (GT)')), h('span', {}, t('XFly view (PRED)', 'XFly 视角 (PRED)')), h('span', {}, t('Top-down GT vs PRED', '俯视 GT 与 PRED')))),
      h('div', { class: 'demo__side' }, h('div', { class: 'demo__head' }, title, toggle), meta,
        h('p', { class: 'demo__label' }, t('Instruction, verbatim from OpenFly', '指令原文（OpenFly，英文）')), instr)),
    h('div', { class: 'demo__thumbs', role: 'group', 'aria-label': t('Choose a rollout', '选择示例') }, thumbs));
  select(ROLLOUTS[0], false);
}
