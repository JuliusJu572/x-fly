// Beat 6 · Close: the thesis in one line plus three headline numbers.
(() => {
  const { el, show, prog, ease, kin, tick, backdrop, drift, fmt, source, badge } = XF.u;
  const R = XF.derive.rows, I = XF.data.inference, P = XF.data.paper;

  XF.register({
    id: "summary",
    chapter: "Summary",
    duration: 6,
    mount(root) {
      const bd = backdrop(root);
      const box = el("div", { style: { position: "absolute", left: "96px", top: "150px", width: "1728px", textAlign: "center" } }, root);
      const logo = el("div", { style: { font: "700 132px/1 var(--sans)", letterSpacing: "-.04em", background: "linear-gradient(90deg,#6aa9f2,#3cc897)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" } }, box, "X-Fly");
      const th = el("div", { class: "hero-sm", style: { marginTop: "34px" } }, box, "Fly full chunks. Recover the drift. <span style='color:var(--stop)'>Learn when to stop.</span>");
      const tiles = el("div", { style: { position: "absolute", left: "96px", top: "540px", width: "1728px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "36px" } }, root);
      const mk = (c, lab) => {
        const d = el("div", { class: "card", style: { position: "relative", textAlign: "center", padding: "36px 24px" } }, tiles);
        const n = el("div", { class: "stat", style: { fontSize: "96px", color: c } }, d, "");
        el("div", { class: "statlab", style: { fontSize: "25px" } }, d, lab);
        return { d, n };
      };
      const t1 = mk("var(--grpo-hi)", `less model inference per waypoint<br><span class="mono" style="color:var(--ink-3)">${I.perWaypointMs.k1} → ${I.perWaypointMs.k8} ms</span>`);
      const t2 = mk("var(--dagger-hi)", `test-seen SR at k = 8<br><span class="mono" style="color:var(--ink-3)">full-chunk BC: ${fmt(R.bc_k8.seen.SR)}%</span>`);
      const t3 = mk("var(--ink)", `test-unseen SR at k = 8<br><span class="mono" style="color:var(--ink-3)">full-chunk BC: ${fmt(R.bc_k8.unseen.SR)}%</span>`);
      const foot = el("div", { class: "label", style: { position: "absolute", left: "96px", width: "1728px", top: "880px", textAlign: "center", fontSize: "24px", color: "var(--ink-3)" } }, root,
        `${P.authors} · ${P.affiliation} · ${P.venue}`);
      const src = source(root, "§4.1 inference cost · Table 1, X-Fly vs BC only, k = 8");
      const bdg = badge(root, "paper");
      return { bd, logo, th, t1, t2, t3, foot, src, bdg };
    },
    render(st, t) {
      drift(st.bd, t);
      kin(st.logo, t, 0.2, Infinity, 50);
      st.logo.style.letterSpacing = `${-0.04 + 0.08 * (1 - prog(t, 0.2, 1.2, ease.out))}em`;
      kin(st.th, t, 0.9);
      [st.t1, st.t2, st.t3].forEach((x, i) => show(x.d, t, 1.8 + i * 0.3));
      tick(st.t1.n, t, 1.8, 1.0, 1, I.speedupShort, 1, "×");
      tick(st.t2.n, t, 2.1, 1.1, 0, R.xfly.seen.SR, 2, "%");
      tick(st.t3.n, t, 2.4, 1.1, 0, R.xfly.unseen.SR, 2, "%");
      show(st.foot, t, 3.2, Infinity, 0);
      show(st.src, t, 0.4, Infinity, 0); show(st.bdg, t, 0.4, Infinity, 0);
    },
  });
})();
