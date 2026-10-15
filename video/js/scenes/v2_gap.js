// Beat 2 · The catch: full-chunk anchors drift away from expert data, which covers them poorly: no corrective chunk, no arrival STOP label (§3.1).
(() => {
  const { el, sv, svgRoot, show, fade, prog, ease, clamp, draw, ptsD, strokeLen, along, header, source, badge, kin, ring, tick, backdrop, drift, fmt } = XF.u;
  const F = XF.data.failure.rows, R = XF.derive.rows;

  // Shared schematic geometry (reused by the recovery beat).
  XF.geo = (() => {
    const E = (u) => [260 + 1240 * u, 600 - 120 * Math.sin(Math.PI * u * 1.1) + 40 * Math.sin(3 * Math.PI * u)];
    const N = (u) => { const a = E(Math.max(0, u - 0.002)), b = E(Math.min(1, u + 0.002)), tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty); return [-ty / l, tx / l]; };
    const off = (u) => 160 * Math.sin(Math.PI * u) + 40 * u;           // learner drift, schematic
    const Lp = (u) => { const e = E(u), n = N(u), o = off(u); return [e[0] + o * n[0], e[1] + o * n[1]]; };
    const expert = Array.from({ length: 121 }, (_, i) => E(i / 120));
    const learn = Array.from({ length: 121 }, (_, i) => Lp(i / 120));
    const a = learn[119], b = learn[120], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (let k = 1; k <= 10; k++) learn.push([b[0] + ((b[0] - a[0]) / l) * 22 * k, b[1] + ((b[1] - a[1]) / l) * 22 * k]);
    const U = Array.from({ length: 7 }, (_, i) => i / 6);
    const anchors = U.map(Lp);
    const w = (q) => 1 - 3 * q * q + 2 * q * q * q;
    // Eq. (2): chunk from anchor i follows the next expert segment plus the smoothstep-decayed offset d_t.
    const chunk = (i) => {
      const e0 = E(U[i]), d = [anchors[i][0] - e0[0], anchors[i][1] - e0[1]];
      return Array.from({ length: 9 }, (_, j) => { const e = E(U[i] + (j / 8) / 6); return [e[0] + d[0] * w(j / 8), e[1] + d[1] * w(j / 8)]; });
    };
    const learnLen = strokeLen(learn);
    return { E, U, expert, learn, learnLen, anchors, chunk, goal: E(1), RG: 100, anchorFrac: U.map((_, i) => strokeLen(learn.slice(0, i * 20 + 1)) / learnLen) };
  })();

  XF.register({
    id: "gap",
    chapter: "The gap",
    duration: 10,
    mount(root) {
      const G = XF.geo;
      const bd = backdrop(root);
      const hA = header(root, "The catch · full-chunk support gap", "Drifted anchors are <span style='color:var(--drift)'>poorly covered</span>.");
      const hB = header(root, "The catch · full-chunk support gap", "Reaching is not <span style='color:var(--stop)'>stopping</span>.");
      const legend = el("div", { class: "label", style: { position: "absolute", left: "96px", top: "284px", display: "flex", gap: "34px", fontSize: "22px" } }, root,
        "<span><span style='display:inline-block;width:30px;border-top:4px solid #cfd6e3;vertical-align:middle;margin-right:10px'></span>expert route</span>" +
        "<span><span style='display:inline-block;width:30px;border-top:4px solid #9085e9;vertical-align:middle;margin-right:10px'></span>learner, full-chunk BC</span>" +
        "<span><span style='display:inline-block;width:14px;height:14px;border:3px solid #f2b134;transform:rotate(45deg);vertical-align:middle;margin-right:12px'></span>decision anchor · every 8 controls</span>");
      const s = svgRoot(root);
      const fg = sv("filter", { id: "gglow", x: "-20%", y: "-20%", width: "140%", height: "140%" }, sv("defs", {}, s));
      sv("feGaussianBlur", { stdDeviation: 8 }, fg);
      const ringG = sv("circle", { cx: G.goal[0], cy: G.goal[1], r: G.RG, fill: "rgba(60,200,151,0.10)", stroke: "#3cc897", "stroke-width": 3 }, s);
      const ringL = sv("text", { x: G.goal[0], y: G.goal[1] - G.RG - 14, fill: "#3cc897", "font-size": 22, "text-anchor": "middle" }, s);
      ringL.textContent = "20 m goal region";
      const expPath = sv("path", { d: ptsD(G.expert), fill: "none", stroke: "#cfd6e3", "stroke-width": 4, "stroke-linecap": "round" }, s);
      const a3 = G.anchors[3], e3 = G.E(G.U[3]);
      const c1line = sv("path", { d: `M${a3[0]} ${a3[1] - 16} L${e3[0]} ${e3[1] + 8}`, stroke: "#e66767", "stroke-width": 3, "stroke-dasharray": "6 6" }, s);
      const lGlow = sv("path", { d: ptsD(G.learn), fill: "none", stroke: "#9085e9", "stroke-width": 16, filter: "url(#gglow)", opacity: 0.75 }, s);
      const lPath = sv("path", { d: ptsD(G.learn), fill: "none", stroke: "#a99ff0", "stroke-width": 4, "stroke-linecap": "round" }, s);
      const anchors = G.anchors.map(([x, y], i) => ({
        shock: sv("circle", { cx: x, cy: y, r: 10, fill: "none", stroke: "#f2b134", "stroke-width": 3, opacity: 0 }, s),
        dia: sv("rect", { x: x - 12, y: y - 12, width: 24, height: 24, transform: `rotate(45 ${x} ${y})`, fill: "#0c1322", stroke: "#f2b134", "stroke-width": 4, opacity: 0 }, s),
        tA: 1.6 + 4.0 * G.anchorFrac[i],
      }));
      const head = sv("g", {}, s);
      sv("circle", { r: 24, fill: "rgba(169,159,240,0.28)" }, head);
      sv("circle", { r: 8, fill: "#fff" }, head);
      const redRing = sv("circle", { cx: G.goal[0], cy: G.goal[1], r: G.RG, fill: "none", stroke: "#e66767", "stroke-width": 5, opacity: 0 }, s);
      const pill = (html, style) => el("div", { class: "pill", style: { position: "absolute", color: "#ffb4b4", borderColor: "rgba(230,103,103,.6)", ...style } }, root, html);
      const c1 = pill("✕ no corrective chunk", { left: `${a3[0] - 140}px`, top: `${a3[1] + 56}px` });
      const a6 = G.anchors[6];
      const c2 = pill("✕ no arrival STOP label", { left: `${a6[0] + 24}px`, top: `${a6[1] + 30}px` });
      const c3 = pill("✕ flies through · never stops", { right: "96px", top: "420px" });

      const stats = el("div", { style: { position: "absolute", left: "96px", top: "846px", width: "1728px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "40px" } }, root);
      const mk = (html, lab, c) => { const d = el("div", {}, stats); const n = el("div", { class: "stat", style: { fontSize: "60px", color: c } }, d, html); el("div", { class: "statlab", style: { fontSize: "23px" } }, d, lab); return { d, n }; };
      const s1 = mk("0%", "of full-chunk BC episodes reach the region, never stop, and end outside it", "var(--drift)");
      const s2 = mk(`${fmt(R.bc_k1.seen.SR)} → ${fmt(R.bc_k8.seen.SR)}%`, "SR: single-step → full-chunk BC", "var(--ink)");
      const s3 = mk(`${fmt(F.bc_k1.seen.nav)} vs ${fmt(F.bc_k8.seen.nav)}%`, "navigation failures barely change", "var(--ink-2)");
      const src = source(root, "§3.1 · Tables 1, 3, test-seen, BC only · drift geometry is schematic");
      const bdg = badge(root, "schematic");
      return { bd, hA, hB, legend, ringG, ringL, expPath, expLen: strokeLen(G.expert), c1line, lGlow, lPath, anchors, head, redRing, c1, c2, c3, s1, s2, s3, src, bdg };
    },
    render(st, t) {
      const G = XF.geo;
      drift(st.bd, t);
      kin(st.hA, t, 0.2, 5.9); kin(st.hB, t, 5.9);
      show(st.legend, t, 0.5, Infinity, 0);
      draw(st.expPath, st.expLen, prog(t, 0.4, 1.2, ease.inOut));
      fade(st.ringG, t, 1.0); fade(st.ringL, t, 1.2);
      const lp = clamp((t - 1.6) / 4.0);
      draw(st.lPath, G.learnLen, lp); draw(st.lGlow, G.learnLen, lp);
      const h = along(G.learn, lp);
      st.head.setAttribute("transform", `translate(${h.x} ${h.y})`);
      st.head.setAttribute("opacity", lp <= 0 ? 0 : 1 - prog(t, 5.7, 0.4));
      st.anchors.forEach((a) => { a.dia.setAttribute("opacity", t >= a.tA ? 1 : 0); ring(a.shock, t, a.tA, 12, 70, 0.7); });
      fade(st.c1line, t, st.anchors[3].tA + 0.1); show(st.c1, t, st.anchors[3].tA + 0.15, Infinity, 10);
      show(st.c2, t, st.anchors[6].tA + 0.15, Infinity, 10);
      ring(st.redRing, t, 5.6, G.RG, G.RG + 70, 1.0);
      show(st.c3, t, 5.6, Infinity, 10);
      [st.s1, st.s2, st.s3].forEach((x, i) => show(x.d, t, 6.3 + i * 0.45));
      tick(st.s1.n, t, 6.3, 1.2, 0, F.bc_k8.seen.nostop, 2, "%");
      show(st.src, t, 0.5, Infinity, 0); show(st.bdg, t, 0.5, Infinity, 0);
    },
  });
})();
