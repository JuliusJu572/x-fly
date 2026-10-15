// Beat 4 · Stage 3, Flow-GRPO: eight attempts of one task (6 free + 2 STOP-override), same-task same-depth advantage; low-frequency chunk noise + Bernoulli STOP.
// Override outcomes enter the group statistics but their decisions get no policy gradient; they only supply outcome-verified STOP pairs (§3.4, Eq. 3–4).
(() => {
  const { el, sv, svgRoot, show, fade, prog, ease, clamp, lerp, draw, ptsD, strokeLen, header, source, badge, kin, ring, backdrop, drift, fmt } = XF.u;
  const F = XF.data.failure.rows, D = XF.data.dynamics, M = XF.data.method;

  // Schematic map geometry (panel x 96–1000, y 350–810).
  const S = [170, 740], GOAL = [880, 450], RG = 62, C = [430, 380];
  const B = (u) => [(1 - u) ** 2 * S[0] + 2 * u * (1 - u) * C[0] + u * u * GOAL[0], (1 - u) ** 2 * S[1] + 2 * u * (1 - u) * C[1] + u * u * GOAL[1]];
  const Nn = (u) => { const a = B(u - 0.002), b = B(u + 0.002), tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty); return [-ty / l, tx / l]; };
  const P = (u, k) => { const b = B(u), n = Nn(u), o = k.amp * Math.sin(Math.PI * u * k.f + k.ph) * Math.sin(Math.PI * Math.min(u, 1)) + k.bias * u; return [b[0] + o * n[0], b[1] + o * n[1]]; };
  const path = (k, u0, u1) => Array.from({ length: 41 }, (_, i) => P(lerp(u0, u1, i / 40), k));
  const COL = { success: "#22a876", early: "#c0841a", late: "#9085e9" };
  // outcome is schematic; free attempts sorted by outcome class (success > late > early), mirroring Eq. 5's success-dominated return;
  // override attempts stay below them, grayed, with no advantage bar
  const ATT = [
    { amp: 26, f: 1.0, ph: 0.0, bias: 8, end: 1.0, out: "success", lab: "STOP in region" },
    { amp: 70, f: 1.0, ph: 0.4, bias: -20, end: 0.62, out: "early", lab: "early STOP" },
    { amp: 50, f: 2.0, ph: 0.0, bias: 30, end: 1.0, out: "success", lab: "STOP in region" },
    { amp: 90, f: 1.0, ph: 0.2, bias: 60, end: 1.26, out: "late", lab: "overshoots" },
    { amp: 60, f: 1.5, ph: 0.6, bias: -40, end: 0.74, out: "early", lab: "early STOP" },
    { amp: 34, f: 2.0, ph: 1.2, bias: -12, end: 1.0, out: "success", lab: "STOP in region" },
    { amp: 55, f: 1.0, ph: 0.9, bias: 10, end: 1.0, stopAt: 0.7, out: "success", extra: true, lab: "override → in region" },
    { amp: 80, f: 1.0, ph: 0.3, bias: -50, end: 0.9, stopAt: 0.6, out: "early", extra: true, lab: "override → still short" },
  ];
  const ORDER = { success: 0, late: 1, early: 2 };
  const rank = ATT.map((a, i) => i).sort((i, j) => (ATT[i].extra ? 1 : 0) - (ATT[j].extra ? 1 : 0) || ORDER[ATT[i].out] - ORDER[ATT[j].out] || i - j);
  const GRAY = "#8f9ab0";
  const ADV = { success: 1, late: -0.55, early: -0.8 };

  XF.register({
    id: "grpo",
    chapter: "Flow-GRPO",
    duration: 10.5,
    mount(root) {
      const bd = backdrop(root);
      const hd = header(root, `Stage 3 · Flow-GRPO`, `Compare <span style='color:var(--grpo-hi)'>${M.groupSize} attempts</span> of the same task.`);
      const chips = el("div", { style: { position: "absolute", left: "96px", top: "290px", display: "flex", gap: "18px" } }, root);
      const ch1 = el("div", { class: "pill", style: { fontSize: "22px" } }, chips, `<svg width="54" height="22" viewBox="0 0 54 22">${[1, 2, 3, 4].map((m, i) => `<path d="${Array.from({ length: 19 }, (_, j) => `${j ? "L" : "M"}${(j * 3).toFixed(1)} ${(11 + 8 * Math.cos((Math.PI * m * (j + 0.5)) / 19)).toFixed(1)}`).join("")}" fill="none" stroke="#6aa9f2" stroke-width="1.6" opacity="${1 - i * 0.2}"/>`).join("")}</svg>low-frequency chunk noise · ${M.M} cosine modes`);
      const ch2 = el("div", { class: "pill", style: { fontSize: "22px", color: "#f6b3cb", borderColor: "rgba(213,81,129,.6)" } }, chips, "Bernoulli STOP policy · same group credit");
      const ch3 = el("div", { class: "pill", style: { fontSize: "22px", color: "#f7d58f", borderColor: "rgba(242,177,52,.55)" } }, chips, `${M.groupFree} free + ${M.groupOverride} STOP-override attempts`);
      const card = el("div", { class: "card", style: { left: "96px", top: "362px", width: "904px", height: "452px", padding: 0 } }, root);
      const s = svgRoot(root);
      const fg = sv("filter", { id: "pglow", x: "-30%", y: "-30%", width: "160%", height: "160%" }, sv("defs", {}, s));
      sv("feGaussianBlur", { stdDeviation: 6 }, fg);
      const goalRing = sv("circle", { cx: GOAL[0], cy: GOAL[1], r: RG, fill: "rgba(60,200,151,0.10)", stroke: "#3cc897", "stroke-width": 3 }, s);
      const start = sv("circle", { cx: S[0], cy: S[1], r: 9, fill: "#cfd6e3" }, s);
      const startL = sv("text", { x: S[0] + 18, y: S[1] + 8, fill: "#b4bfd1", "font-size": 20 }, s); startL.textContent = "same start, same instruction";
      const atts = ATT.map((k) => {
        const u1 = k.extra ? k.stopAt : k.end, pts = path(k, 0, u1), col = k.extra ? "#f2b134" : COL[k.out];
        const g = sv("g", {}, s);
        const glow = sv("path", { d: ptsD(pts), fill: "none", stroke: col, "stroke-width": 10, filter: "url(#pglow)", opacity: 0 }, g);
        const line = sv("path", { d: ptsD(pts), fill: "none", stroke: col, "stroke-width": 3.5, "stroke-linecap": "round" }, g);
        let cont = null, cLen = 0, ox = null;
        if (k.extra) {
          const cp = path(k, k.stopAt, k.end); cLen = strokeLen(cp);
          cont = sv("path", { d: ptsD(cp), fill: "none", stroke: GRAY, "stroke-width": 3.5, "stroke-dasharray": "7 6" }, g);
          const o = P(k.stopAt, k);
          ox = sv("path", { d: `M${o[0] - 8} ${o[1] - 8} L${o[0] + 8} ${o[1] + 8} M${o[0] + 8} ${o[1] - 8} L${o[0] - 8} ${o[1] + 8}`, stroke: "#d55181", "stroke-width": 3.5 }, g);
        }
        const e = P(k.end, k);
        const dot = sv("circle", { cx: e[0], cy: e[1], r: 8, fill: "#d55181", stroke: "#0c1322", "stroke-width": 2 }, g);
        return { g, glow, line, len: strokeLen(pts), cont, cLen, ox, dot };
      });
      const mapL = el("div", { class: "label", style: { position: "absolute", right: "940px", top: "774px", fontSize: "20px", color: "var(--ink-3)" } }, root,
        `<span style='color:#d55181'>●</span> STOP &nbsp; <span style='color:#d55181'>✕</span> overridden STOP &nbsp; <span style='color:#f2b134'>━</span> override prefix &nbsp; <span style='color:${GRAY}'>┅</span> continued after n overridden STOPs`);

      const panel = el("div", { class: "card", style: { left: "1040px", top: "362px", width: "784px", height: "452px", padding: "26px 30px" } }, root);
      el("div", { class: "label", style: { fontSize: "22px", color: "var(--ink-3)", marginBottom: "14px" } }, panel, "same-task, same-depth advantage");
      const divider = el("div", { style: { position: "absolute", left: "30px", width: "724px", top: `${62 + 40 * 6 - 4}px`, borderTop: "1px dashed var(--line-2)" } }, panel);
      const rows = ATT.map((k, i) => {
        const r = el("div", { style: { position: "absolute", left: "30px", width: "724px", height: "34px", display: "flex", alignItems: "center", gap: "14px" } }, panel);
        el("div", { class: "mono", style: { width: "34px", fontSize: "20px", color: "var(--ink-3)" } }, r, `#${i + 1}`);
        el("div", { style: { width: "12px", height: "12px", borderRadius: "50%", background: k.extra ? GRAY : COL[k.out] } }, r);
        el("div", { class: "label", style: { width: "240px", fontSize: "21px", color: k.extra ? "var(--ink-2)" : "var(--ink)" } }, r, k.lab);
        const track = el("div", { style: { position: "relative", width: "300px", height: "16px" } }, r);
        let bar = null;
        if (k.extra) {
          el("div", { class: "mono", style: { position: "absolute", left: 0, top: "-1px", fontSize: "17px", lineHeight: 1, color: GRAY, whiteSpace: "nowrap" } }, track, "baseline + STOP pairs only");
        } else {
          el("div", { style: { position: "absolute", left: "150px", top: "-6px", width: "1px", height: "28px", background: "var(--line-2)" } }, track);
          bar = el("div", { style: { position: "absolute", top: "2px", height: "12px", borderRadius: "4px", background: ADV[k.out] > 0 ? "#22a876" : "#e0605f" } }, track);
        }
        el("div", { class: "mono", style: { fontSize: "17px", lineHeight: 1, color: k.extra ? "#c9a24a" : "var(--ink-3)", marginLeft: "auto" } }, r, k.extra ? "override" : "free");
        return { r, bar, k, from: i, to: rank.indexOf(i) };
      });
      const verdict = el("div", { style: { position: "absolute", left: "1070px", top: "760px", display: "flex", gap: "16px" } }, root);
      const v1 = el("div", { class: "pill", style: { fontSize: "21px", color: "#9ff0cf", borderColor: "rgba(34,168,118,.6)" } }, verdict, "▲ reinforce chunks + STOP timing");
      const v2 = el("div", { class: "pill", style: { fontSize: "21px", color: "#ffb4b4", borderColor: "rgba(224,96,95,.6)" } }, verdict, "▼ suppress");

      const stats = el("div", { style: { position: "absolute", left: "96px", top: "846px", width: "1728px", display: "grid", gridTemplateColumns: "1fr 1fr 1.25fr", gap: "40px" } }, root);
      const mk = (html, lab, c) => { const d = el("div", {}, stats); el("div", { class: "stat", style: { fontSize: "56px", color: c } }, d, html); el("div", { class: "statlab", style: { fontSize: "23px" } }, d, lab); return d; };
      const s1 = mk(`${fmt(F.dag_k8.seen.early)} → ${fmt(F.xfly.seen.early)}%`, "early stops, test-seen", "var(--slow)");
      const s2 = mk(`${fmt(F.dag_k8.unseen.early)} → ${fmt(F.xfly.unseen.early)}%`, "early stops, test-unseen", "var(--slow)");
      const s3 = mk(`<span style="color:var(--grpo-hi)">${fmt(D.dagSR[0], 1)} → ${fmt(D.dagSR[1], 1)}%</span>`, `validation SR from DAgger; from BC only it stays ${fmt(D.bcSR[0], 1)}–${fmt(D.bcSR[1], 1)}%`, "var(--ink)");
      const src = source(root, "§3.4 · §4.4 source validation · Table 3, k = 8, +DAgger → +Flow-GRPO · attempts are schematic");
      const bdg = badge(root, "schematic");
      return { bd, hd, ch1, ch2, ch3, card, goalRing, start, startL, atts, mapL, panel, divider, rows, v1, v2, s1, s2, s3, src, bdg };
    },
    render(st, t) {
      drift(st.bd, t);
      kin(st.hd, t, 0.15);
      [st.ch1, st.ch2, st.ch3].forEach((c, i) => show(c, t, 0.6 + i * 0.25, Infinity, 10));
      show(st.card, t, 0.5, Infinity, 0); fade(st.goalRing, t, 0.7); fade(st.start, t, 0.7); fade(st.startL, t, 0.8); show(st.mapL, t, 1.0, Infinity, 0);
      const rk = prog(t, 4.6, 0.9, ease.inOut), hl = prog(t, 5.6, 0.6);
      st.atts.forEach((a, i) => {
        const t0 = 1.0 + i * 0.22, k = ATT[i];
        draw(a.line, a.len, prog(t, t0, 1.1, ease.inOut));
        const tEnd = t0 + 1.1;
        if (a.cont) { draw(a.cont, a.cLen, prog(t, tEnd + 0.25, 0.7, ease.inOut)); fade(a.ox, t, tEnd, Infinity, 0.2); }
        fade(a.dot, t, a.cont ? tEnd + 0.95 : tEnd, Infinity, 0.2);
        const good = k.out === "success" && !k.extra;
        a.g.setAttribute("opacity", lerp(1, good ? 1 : k.extra ? 0.45 : 0.28, hl));
        a.glow.setAttribute("opacity", good ? 0.85 * hl : 0);
      });
      show(st.panel, t, 3.4, Infinity, 0);
      st.divider.style.opacity = prog(t, 3.9, 0.3);
      st.rows.forEach((r, i) => {
        const y = 62 + 40 * lerp(r.from, r.to, rk);
        r.r.style.top = `${y}px`;
        r.r.style.opacity = prog(t, 3.5 + i * 0.07, 0.3) * (r.k.extra ? 0.75 : 1);
        if (!r.bar) return;
        const a = ADV[r.k.out] * 140 * prog(t, 5.5, 0.6);
        r.bar.style.left = `${150 + Math.min(0, a)}px`; r.bar.style.width = `${Math.abs(a)}px`;
      });
      show(st.v1, t, 6.0, Infinity, 10); show(st.v2, t, 6.2, Infinity, 10);
      [st.s1, st.s2, st.s3].forEach((x, i) => show(x, t, 6.9 + i * 0.4));
      show(st.src, t, 0.4, Infinity, 0); show(st.bdg, t, 0.4, Infinity, 0);
    },
  });
})();
