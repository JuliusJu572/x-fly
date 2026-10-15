// Beat 3 · Stage 2, recovery DAgger: relabel every learner anchor with a decaying-offset chunk (Eq. 2) and STOP at the first in-region anchor.
(() => {
  const { el, sv, svgRoot, show, fade, prog, ease, draw, ptsD, strokeLen, header, source, badge, kin, ring, tick, backdrop, drift, fmt } = XF.u;
  const F = XF.data.failure.rows, R = XF.derive.rows;

  XF.register({
    id: "recovery",
    chapter: "Recovery",
    duration: 9.5,
    mount(root) {
      const G = XF.geo;
      const bd = backdrop(root);
      const hd = header(root, "Stage 2 · Recovery DAgger", "Label the anchors the learner <span style='color:var(--dagger-hi)'>actually reaches</span>.");
      const legend = el("div", { style: { position: "absolute", left: "96px", top: "290px", display: "flex", gap: "18px" } }, root);
      const lg1 = el("div", { class: "pill", style: { color: "#9ff0cf", borderColor: "rgba(60,200,151,.55)", fontSize: "22px" } }, legend, "✓ corrective chunk · rejoins the expert at chunk end");
      const lg2 = el("div", { class: "pill", style: { color: "#f6b3cb", borderColor: "rgba(213,81,129,.6)", fontSize: "22px" } }, legend, "✓ STOP at the first in-region anchor");
      const formula = el("div", { class: "pill mono", style: { position: "absolute", right: "96px", top: "290px", fontFamily: "var(--mono)", fontWeight: 400, fontSize: "24px" } }, root,
        "p<sup>rec</sup><sub>t,j</sub> = p<sup>★</sup><sub>c<sub>t</sub>+j</sub> + d<sub>t</sub>·(1 − 3q<sub>j</sub><sup>2</sup> + 2q<sub>j</sub><sup>3</sup>)");
      const s = svgRoot(root);
      const fg = sv("filter", { id: "rglow", x: "-20%", y: "-20%", width: "140%", height: "140%" }, sv("defs", {}, s));
      sv("feGaussianBlur", { stdDeviation: 7 }, fg);
      sv("circle", { cx: G.goal[0], cy: G.goal[1], r: G.RG, fill: "rgba(60,200,151,0.10)", stroke: "#3cc897", "stroke-width": 3 }, s);
      sv("path", { d: ptsD(G.expert), fill: "none", stroke: "#cfd6e3", "stroke-width": 4, "stroke-linecap": "round", opacity: 0.9 }, s);
      sv("path", { d: ptsD(G.learn.slice(0, 121)), fill: "none", stroke: "#9085e9", "stroke-width": 3, opacity: 0.45 }, s);
      const over = sv("path", { d: ptsD(G.learn.slice(120)), fill: "none", stroke: "#9085e9", "stroke-width": 3, "stroke-dasharray": "8 8" }, s);
      const chunks = G.anchors.slice(0, 6).map((a, i) => {
        const pts = G.chunk(i), e0 = G.E(G.U[i]), d = ptsD(pts), len = strokeLen(pts), t0 = 1.0 + i * 0.5;
        const off = sv("path", { d: `M${a[0]} ${a[1]} L${e0[0]} ${e0[1]}`, stroke: "#f2b134", "stroke-width": 2, "stroke-dasharray": "4 6", opacity: 0 }, s);
        const glow = sv("path", { d, fill: "none", stroke: "#3cc897", "stroke-width": 14, filter: "url(#rglow)", opacity: 0.7 }, s);
        const line = sv("path", { d, fill: "none", stroke: "#5fe0b0", "stroke-width": 5, "stroke-linecap": "round" }, s);
        return { off, glow, line, len, t0 };
      });
      const anchors = G.anchors.map(([x, y]) => sv("rect", { x: x - 11, y: y - 11, width: 22, height: 22, transform: `rotate(45 ${x} ${y})`, fill: "#0c1322", stroke: "#f2b134", "stroke-width": 4 }, s));
      const shocks = G.anchors.map(([x, y]) => sv("circle", { cx: x, cy: y, r: 10, fill: "none", stroke: "#3cc897", "stroke-width": 3, opacity: 0 }, s));
      const a6 = G.anchors[6];
      const stopRing = sv("circle", { cx: a6[0], cy: a6[1], r: 14, fill: "none", stroke: "#d55181", "stroke-width": 5, opacity: 0 }, s);
      const stopDot = sv("circle", { cx: a6[0], cy: a6[1], r: 14, fill: "#d55181", opacity: 0 }, s);
      const stamp = el("div", { class: "pill", style: { position: "absolute", left: `${a6[0] + 24}px`, top: `${a6[1] + 30}px`, background: "#d55181", borderColor: "#d55181", color: "#fff", fontSize: "26px", letterSpacing: ".08em" } }, root, "■ STOP");
      const trunc = el("div", { class: "pill", style: { position: "absolute", right: "96px", top: "420px", color: "var(--ink-3)" } }, root, "✂ rollout truncated, no backward labels");

      const stats = el("div", { style: { position: "absolute", left: "96px", top: "846px", width: "1728px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "40px" } }, root);
      const mk = (html, lab, c) => { const d = el("div", {}, stats); const n = el("div", { class: "stat", style: { fontSize: "60px", color: c } }, d, html); el("div", { class: "statlab", style: { fontSize: "23px" } }, d, lab); return { d, n }; };
      const s1 = mk(`${fmt(F.bc_k8.seen.nostop)} → 0%`, "no-stop failures", "var(--stop)");
      const s2 = mk(`${fmt(F.bc_k8.seen.nav)} → ${fmt(F.dag_k8.seen.nav)}%`, "navigation failures", "var(--dagger-hi)");
      const s3 = mk(`${fmt(R.bc_k8.seen.SR)} → `, "full-chunk SR", "var(--ink)");
      const s3n = el("span", {}, s3.n, "0%");
      const src = source(root, "§3.3 Eq. 2 · Tables 1, 3, test-seen, k = 8, BC → +DAgger · geometry is schematic");
      const bdg = badge(root, "schematic");
      return { bd, hd, lg1, lg2, formula, over, chunks, anchors, shocks, stopRing, stopDot, stamp, trunc, s1, s2, s3, s3n, src, bdg };
    },
    render(st, t) {
      drift(st.bd, t);
      kin(st.hd, t, 0.15);
      show(st.lg1, t, 0.9, Infinity, 10); show(st.lg2, t, 4.2, Infinity, 10);
      show(st.formula, t, 1.6, Infinity, 10);
      st.chunks.forEach((c, i) => {
        const p = prog(t, c.t0, 0.45, ease.inOut);
        draw(c.line, c.len, p); draw(c.glow, c.len, p);
        fade(c.off, t, c.t0 - 0.1, Infinity, 0.25);
        ring(st.shocks[i], t, c.t0, 12, 60, 0.6);
      });
      st.over.setAttribute("opacity", 0.55 - 0.42 * prog(t, 4.3, 0.5));
      fade(st.stopDot, t, 4.0, Infinity, 0.25);
      ring(st.stopRing, t, 4.0, 14, 90, 0.9);
      show(st.stamp, t, 4.05, Infinity, 14);
      show(st.trunc, t, 4.5, Infinity, 10);
      [st.s1, st.s2, st.s3].forEach((x, i) => show(x.d, t, 5.3 + i * 0.4));
      tick(st.s3n, t, 6.1, 1.1, 0, XF.derive.rows.dag_k8.seen.SR, 2, "%");
      show(st.src, t, 0.4, Infinity, 0); show(st.bdg, t, 0.4, Infinity, 0);
    },
  });
})();
