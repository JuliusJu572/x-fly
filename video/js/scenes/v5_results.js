// Beat 5 · Results: (A) SR ladder at k = 8 from Table 1; (B) outcome attribution morphing across stages from Table 3.
(() => {
  const { el, sv, svgRoot, show, fade, prog, ease, clamp, lerp, draw, header, source, badge, kin, backdrop, drift, fmt, signed } = XF.u;
  const R = XF.derive.rows, F = XF.data.failure.rows, delta = XF.derive.delta;
  const STAGES = [{ id: "bc_k8", name: "BC only" }, { id: "dag_k8", name: "+ Recovery DAgger" }, { id: "xfly", name: "+ Flow-GRPO" }];
  const BARC = ["#9085e9", "#199e70", "#3987e5"];
  const SEG = [
    { k: "SR", name: "Success", c: "#22a876" }, { k: "nav", name: "Navigation failure", c: "#5f86c4" },
    { k: "early", name: "Early STOP", c: "#c0841a" }, { k: "late", name: "Late STOP", c: "#9085e9" }, { k: "nostop", name: "No-stop", c: "#e0605f" },
  ];
  const segVal = (id, split, k) => (k === "SR" ? R[id][split].SR : F[id][split][k]);
  const BASE = 760, PX = 5, X0 = 360, BW = 1464;

  XF.register({
    id: "results",
    chapter: "Results",
    duration: 12.5,
    mount(root) {
      const bd = backdrop(root);
      // Part A: SR ladder
      const A = el("div", { class: "layer" }, root);
      const hA = header(A, "Results · OpenFly, full-chunk k = 8", "Each stage lifts <span style='color:var(--grpo-hi)'>full-chunk SR</span>.");
      const panels = ["seen", "unseen"].map((split, pi) => {
        const L = 96 + pi * 894, card = el("div", { class: "card", style: { left: `${L}px`, top: "300px", width: "834px", height: "520px", padding: 0 } }, A);
        el("div", { class: "kicker", style: { position: "absolute", left: `${L + 30}px`, top: "326px", fontSize: "22px" } }, A, `test-${split} · SR %`);
        const s = svgRoot(A);
        sv("line", { x1: L + 30, x2: L + 804, y1: BASE, y2: BASE, stroke: "#2c3c5c", "stroke-width": 2 }, s);
        const dfY = BASE - R.dreamfly[split].SR * PX;
        const df = sv("line", { x1: L + 30, x2: L + 804, y1: dfY, y2: dfY, stroke: "#7c89a1", "stroke-width": 2, "stroke-dasharray": "8 7" }, s);
        const dfL = el("div", { class: "mono", style: { position: "absolute", right: `${1920 - L - 804}px`, top: `${dfY - 32}px`, fontSize: "19px", color: "var(--ink-3)" } }, A, `DreamFly, k = 1 · ${fmt(R.dreamfly[split].SR)}`);
        const bars = STAGES.map((stg, i) => {
          const cx = L + 170 + i * 250, v = R[stg.id][split].SR;
          const rect = sv("rect", { x: cx - 70, width: 140, y: BASE, height: 0, rx: 4, fill: BARC[i] }, s);
          const val = el("div", { class: "stat", style: { position: "absolute", left: `${cx - 110}px`, width: "220px", textAlign: "center", fontSize: "44px", padding: "2px 0", background: "var(--panel)", borderRadius: "8px" } }, A, "0.00");
          const dl = i ? el("div", { class: "mono", style: { position: "absolute", left: `${cx - 110}px`, width: "220px", textAlign: "center", fontSize: "22px", color: i === 1 ? "var(--dagger-hi)" : "var(--grpo-hi)" } }, A, signed(delta(stg.id, STAGES[i - 1].id, split, "SR"))) : null;
          el("div", { class: "label", style: { position: "absolute", left: `${cx - 120}px`, width: "240px", top: `${BASE + 14}px`, textAlign: "center", fontSize: "21px" } }, A, stg.name);
          return { rect, val, dl, v, t0: 0.8 + i * 0.9 };
        });
        return { card, df, dfL, bars };
      });
      // Part B: outcome attribution
      const Bp = el("div", { class: "layer" }, root);
      const hB = header(Bp, "Results · outcome attribution, k = 8", "What each stage <span style='color:var(--dagger-hi)'>repairs</span>.");
      const chipRow = el("div", { style: { position: "absolute", left: "96px", top: "300px", display: "flex", gap: "16px", alignItems: "center" } }, Bp);
      const chips = STAGES.map((stg, i) => el("div", { class: "pill", style: { fontSize: "24px" } }, chipRow, stg.name));
      const sB = svgRoot(Bp);
      const rows = ["seen", "unseen"].map((split, ri) => {
        const y = 420 + ri * 130;
        el("div", { class: "label", style: { position: "absolute", left: "96px", top: `${y + 16}px`, fontSize: "26px", color: "var(--ink)" } }, Bp, `test-${split}`);
        const segs = SEG.map((sg) => ({
          r: sv("rect", { y, height: 72, rx: 4, fill: sg.c }, sB),
          lab: el("div", { class: "mono", style: { position: "absolute", top: `${y + 22}px`, width: "120px", textAlign: "center", fontSize: "22px", fontWeight: 700, color: "#fff" } }, Bp, ""),
          sg,
        }));
        return { split, segs };
      });
      const leg = el("div", { class: "label", style: { position: "absolute", left: `${X0}px`, top: "700px", display: "flex", gap: "30px", fontSize: "22px" } }, Bp,
        SEG.map((sg) => `<span><span style="display:inline-block;width:16px;height:16px;border-radius:4px;background:${sg.c};vertical-align:-2px;margin-right:10px"></span>${sg.name}</span>`).join(""));
      const capS = { fontSize: "32px", position: "absolute", left: "96px", top: "790px", width: "1728px" };
      const caps = [
        `<span class="em" style="color:var(--drift)">${fmt(F.bc_k8.seen.nostop)}%</span> of full-chunk BC episodes reach the region, never stop, and end outside it (test-seen).`,
        `Recovery: no-stop failures → <span class="em">0</span>, navigation failures <span class="em">${fmt(F.bc_k8.seen.nav)} → ${fmt(F.dag_k8.seen.nav)}%</span>.`,
        `Flow-GRPO: early stops <span class="em">${fmt(F.dag_k8.seen.early)} → ${fmt(F.xfly.seen.early)}%</span>. Left to solve: stopping on time, late STOP <span class="em">${fmt(F.xfly.seen.late)} / ${fmt(F.xfly.unseen.late)}%</span>.`,
      ].map((h) => el("div", { class: "lead", style: capS }, Bp, h));
      const src = source(root, "Table 1 (SR, k = 8) · Table 3 outcome attribution, % of episodes");
      const bdg = badge(root, "paper");
      return { bd, A, hA, panels, Bp, hB, chips, rows, leg, caps, src, bdg };
    },
    render(st, t) {
      drift(st.bd, t);
      // Part A
      show(st.A, t, 0, 6.0, 0); kin(st.hA, t, 0.15);
      st.panels.forEach((P, pi) => {
        P.bars.forEach((b, i) => {
          const p = prog(t, b.t0 + pi * 0.15, 0.8), h = b.v * PX * p, top = BASE - h;
          b.rect.setAttribute("y", top); b.rect.setAttribute("height", h);
          b.val.textContent = fmt(b.v * p);
          b.val.style.top = `${top - 62}px`; b.val.style.opacity = prog(t, b.t0 + pi * 0.15, 0.3);
          if (b.dl) { b.dl.style.top = `${top - 96}px`; show(b.dl, t, b.t0 + 0.7 + pi * 0.15, Infinity, 8); }
        });
        fade(P.df, t, 3.6, Infinity, 0.4); show(P.dfL, t, 3.8, Infinity, 6);
      });
      // Part B
      show(st.Bp, t, 6.0, Infinity, 0); kin(st.hB, t, 6.1);
      const m1 = prog(t, 7.9, 0.8, ease.inOut), m2 = prog(t, 9.9, 0.8, ease.inOut);
      const stage = m1 + m2;
      st.chips.forEach((c, i) => {
        const on = clamp(1 - Math.abs(stage - i));
        c.style.opacity = 0.4 + 0.6 * on;
        c.style.borderColor = on > 0.5 ? BARC[i] : "var(--line-2)";
        c.style.background = on > 0.5 ? `${BARC[i]}33` : "rgba(22,34,58,.85)";
        show(c.parentNode, t, 6.4, Infinity, 10);
      });
      const grow = prog(t, 6.6, 0.9, ease.inOut);
      st.rows.forEach((row) => {
        let x = X0;
        row.segs.forEach(({ r, lab, sg }) => {
          const v0 = segVal("bc_k8", row.split, sg.k), v1 = segVal("dag_k8", row.split, sg.k), v2 = segVal("xfly", row.split, sg.k);
          const v = lerp(lerp(v0, v1, m1), v2, m2), w = (BW * v * grow) / 100;
          r.setAttribute("x", x + 1); r.setAttribute("width", Math.max(0, w - 2));
          lab.textContent = fmt(v);
          lab.style.left = `${x + w / 2 - 60}px`;
          lab.style.opacity = clamp((w - 84) / 20) * prog(t, 7.2, 0.4);
          x += w;
        });
      });
      show(st.leg, t, 7.0, Infinity, 8);
      show(st.caps[0], t, 7.2, 8.0, 10); show(st.caps[1], t, 8.4, 10.0, 10); show(st.caps[2], t, 10.4, Infinity, 10);
      show(st.src, t, 0.4, Infinity, 0); show(st.bdg, t, 0.4, Infinity, 0);
    },
  });
})();
