// Beat 7 · Credits: contributors card in the closing style, with the ARIDGE mark (SVG redraw of the paper's logo).
(() => {
  const { el, show, kin, backdrop, drift, source, badge } = XF.u;
  const C = XF.data.credits, P = XF.data.paper;
  const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 37" width="31" height="52" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><defs><clipPath id="aridge-clip"><rect x="2" y="2" width="18" height="33"/></clipPath></defs><g clip-path="url(#aridge-clip)"><path d="M-2.628 41L22.028 -5"/><path d="M24.456 7L13.2 28H24" stroke-linejoin="miter"/></g><rect x="1" y="1" width="20" height="35"/></svg>`;

  XF.register({
    id: "credits",
    chapter: "Credits",
    duration: 3.8,
    mount(root) {
      const bd = backdrop(root);
      const title = el("div", { class: "hero-sm", style: { position: "absolute", left: "96px", width: "1728px", top: "250px", textAlign: "center" } }, root, C.title);
      const rows = C.roles.map((r, i) => {
        const row = el("div", { style: { position: "absolute", left: "96px", width: "1728px", top: `${400 + i * 92}px`, display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "28px", alignItems: "baseline" } }, root);
        el("div", { class: "label", style: { textAlign: "right", fontSize: "34px", color: "var(--ink-3)" } }, row, r.role);
        el("div", { class: "label", style: { fontSize: "34px", color: "var(--ink-3)" } }, row, "—");
        el("div", { style: { font: "600 44px/1.15 var(--sans)", letterSpacing: "-.01em", color: "var(--ink)" } }, row, r.names);
        return row;
      });
      const org = el("div", { style: { position: "absolute", left: "96px", width: "1728px", top: "720px", display: "flex", justifyContent: "center", alignItems: "center", gap: "22px", color: "var(--ink)" } }, root);
      el("div", { style: { display: "flex", color: "#fff" } }, org, MARK);
      el("div", { class: "kicker", style: { fontSize: "30px", color: "var(--ink-2)" } }, org, C.org);
      const src = source(root, P.title);
      const bdg = badge(root, "preprint");
      return { bd, title, rows, org, src, bdg };
    },
    render(st, t) {
      drift(st.bd, t);
      kin(st.title, t, 0.15);
      st.rows.forEach((r, i) => show(r, t, 0.5 + i * 0.22));
      show(st.org, t, 1.25, Infinity, 14);
      show(st.src, t, 0.4, Infinity, 0); show(st.bdg, t, 0.4, Infinity, 0);
    },
  });
})();
