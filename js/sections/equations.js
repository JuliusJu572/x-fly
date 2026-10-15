// MathML transcriptions of the paper's equations (main.tex). Native MathML, no library.
// Magenta marks learner-side terms, blue marks expert-side terms.
import { t } from '../lib/i18n.js';

const mi = (x, cls = '') => `<mi${cls ? ` class="${cls}"` : ''}>${x}</mi>`;
const sub = (b, s) => `<msub>${b}${s}</msub>`;
const subsup = (b, s, p) => `<msubsup>${b}${s}${p}</msubsup>`;
const row = (...x) => `<mrow>${x.join('')}</mrow>`;
const mo = (x) => `<mo>${x}</mo>`;
const mn = (x) => `<mn>${x}</mn>`;
const mt = (x) => `<mtext>${x}</mtext>`;
const ct = row(sub(mi('c'), mi('t')));

export const eqRecovery = `
<math display="block" aria-label="p rec t j equals p star at c t plus j, plus d t times one minus three q j squared plus two q j cubed, with q j equal to j over H">
  ${row(subsup(mi('p', 'hl-l'), row(mi('t'), mo(','), mi('j')), mt('rec')), mo('='),
    subsup(mi('p', 'hl-e'), row(ct, mo('+'), mi('j')), mo('⋆')), mo('+'),
    sub(mi('d', 'hl-l'), mi('t')), mo('('), mn(1), mo('−'), mn(3), subsup(mi('q'), mi('j'), mn(2)), mo('+'),
    mn(2), subsup(mi('q'), mi('j'), mn(3)), mo(')'), mo(','), '<mspace width="0.8em"/>',
    sub(mi('q'), mi('j')), mo('='), mi('j'), mo('/'), mi('H'))}
</math>
<math display="block" aria-label="d t equals p t minus p star at c t">
  ${row(sub(mi('d', 'hl-l'), mi('t')), mo('='), sub(mi('p', 'hl-l'), mi('t')), mo('−'), subsup(mi('p', 'hl-e'), ct, mo('⋆')))}
</math>
<p class="eq__label">${t('Eq. 2, p. 3 · j = 0, …, H, H = 8 · c<sub>t</sub>: monotonic route cursor · ⋆: expert',
    '式 2，第 3 页 · j = 0, …, H，H = 8 · c<sub>t</sub>：单调路线游标 · ⋆：专家')}</p>`;

export const eqActor = `
<math display="block" aria-label="A i t equals R go i t minus mu t, over max of s t and s floor">
  ${row(sub(mi('A'), row(mi('i'), mo(','), mi('t'))), mo('='),
    `<mfrac>${row(subsup(mi('R'), row(mi('i'), mo(','), mi('t')), mt('go')), mo('−'), sub(mi('μ'), mi('t')))}${row(mi('max'), mo('('), sub(mi('s'), mi('t')), mo(','), sub(mi('s'), mt('floor')), mo(')'))}</mfrac>`,
    mo(','), '<mspace width="0.8em"/>', sub(mi('s'), mt('floor')), mo('='), mn('0.5'))}
</math>
<math display="block" aria-label="L actor equals minus the expectation of A t times the sum over s from 3 to 5 of log pi s plus log pi z, plus beta times the two KL terms">
  ${row(sub(mi('ℒ'), mt('actor')), mo('='), mo('−'), mi('𝔼'), mo('['), sub(mi('A'), mi('t')), mo('('),
    `<munderover><mo>∑</mo>${row(mi('s'), mo('='), mn(3))}${mn(5)}</munderover>`,
    mi('log'), subsup(mi('π', 'hl-l'), mi('θ'), mi('s')), mo('+'), mi('log'), subsup(mi('π', 'hl-e'), mi('θ'), mi('z')), mo(')'), mo(']'),
    mo('+'), mi('β'), mo('('), subsup(mi('D'), mt('KL'), mi('u')), mo('+'), subsup(mi('D'), mt('KL'), mi('z')), mo(')'))}
</math>
<p class="eq__label">${t('Eqs. 3–4, p. 4 · β = 0.01 · stage objective ℒ<sub>actor</sub> + 0.5 ℒ<sub>rank</sub> · magenta: control density, blue: STOP probability',
    '式 3–4，第 4 页 · β = 0.01 · 阶段目标 ℒ<sub>actor</sub> + 0.5 ℒ<sub>rank</sub> · 品红：控制密度，蓝：STOP 概率')}</p>`;

export const eqNoise = `
<math display="block" aria-label="x s plus one equals mu theta s plus nu s times Phi epsilon s plus rho Psi xi s">
  ${row(`<msup>${mi('x')}${row(mi('s'), mo('+'), mn(1))}</msup>`, mo('='), subsup(mi('μ'), mi('θ'), mi('s')), mo('+'),
    sub(mi('ν'), mi('s')), mo('('), mi('Φ', 'hl-l'), sub(mi('ε'), mi('s')), mo('+'), mi('ρ'), mi('Ψ'), sub(mi('ξ'), mi('s')), mo(')'))}
</math>
<p class="eq__label">${t('Eq. 6, p. 5 · ν<sub>s</sub> = σ<sub>s</sub>√Δt, Δt = 1/6, ρ = 0.1', '式 6，第 5 页 · ν<sub>s</sub> = σ<sub>s</sub>√Δt，Δt = 1/6，ρ = 0.1')}</p>`;
