// Beat 1 · Hook: a real OpenFly expert route over a procedural city; full-chunk execution is 4.7× cheaper.
(() => {
  const { el, sv, svgRoot, show, prog, ease, draw, ptsD, strokeLen, along, rng, lerp, clamp, source, badge, kin, ring } = XF.u;
  const W = 2600, H = 1700, PX = 10;
  const I = XF.data.inference;

  const routePx = () => {
    const pts = XF.data.route.pos;
    const cx = (pts[0][0] + pts.at(-1)[0]) / 2, cy = (pts[0][1] + pts.at(-1)[1]) / 2;
    return pts.map(([x, y]) => [W / 2 + (x - cx) * PX, H / 2 - (y - cy) * PX]);
  };
  const segDist = (p, a, b) => {
    const vx = b[0] - a[0], vy = b[1] - a[1], L = vx * vx + vy * vy || 1;
    const q = clamp(((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / L);
    return Math.hypot(p[0] - a[0] - q * vx, p[1] - a[1] - q * vy);
  };
  const makeCity = (route) => {
    const r = rng(7), blocks = [], goal = route.at(-1);
    for (let gx = 0; gx < W; gx += 150) for (let gy = 0; gy < H; gy += 150) {
      const n = 1 + Math.floor(r() * 3);
      for (let k = 0; k < n; k++) {
        const w = 34 + r() * 70, h = 34 + r() * 70, x = gx + 16 + r() * (118 - w), y = gy + 16 + r() * (118 - h), c = [x + w / 2, y + h / 2];
        let near = Math.hypot(c[0] - goal[0], c[1] - goal[1]) < 230;
        for (let i = 1; i < route.length && !near; i++) near = segDist(c, route[i - 1], route[i]) < Math.max(w, h) / 2 + 60;
        if (!near) blocks.push({ x, y, w, h, z: 18 + r() ** 2 * 120, shade: 0.55 + r() * 0.45, delay: Math.hypot(c[0] - W / 2, c[1] - H / 2) / 2400 + r() * 0.15 });
      }
    }
    return blocks.sort((a, b) => a.y + a.h - (b.y + b.h));
  };
  const paintCity = (ctx, blocks, t) => {
    ctx.fillStyle = "#08101e"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(90,120,170,0.10)"; ctx.lineWidth = 2;
    for (let x = 0; x <= W; x += 150) { ctx.beginPath(); ctx.moveTo(x + 8, 0); ctx.lineTo(x + 8, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 150) { ctx.beginPath(); ctx.moveTo(0, y + 8); ctx.lineTo(W, y + 8); ctx.stroke(); }
    for (const b of blocks) {
      const p = ease.out(clamp((t - b.delay) / 0.9));
      if (p <= 0) continue;
      const z = b.z * p * 0.55, lum = Math.round(lerp(26, 52, b.shade));
      ctx.fillStyle = `rgba(${lum - 8},${lum + 4},${lum + 26},${0.9 * p})`; ctx.fillRect(b.x, b.y - z, b.w, b.h + z);
      ctx.fillStyle = `rgba(${lum + 16},${lum + 30},${lum + 58},${p})`; ctx.fillRect(b.x, b.y - z, b.w, b.h);
      ctx.strokeStyle = `rgba(140,170,220,${0.18 * p})`; ctx.lineWidth = 1.5; ctx.strokeRect(b.x + 0.75, b.y - z + 0.75, b.w - 1.5, b.h - 1.5);
    }
  };

  XF.register({
    id: "opening",
    chapter: "Hook",
    duration: 7.5,
    mount(root) {
      const route = routePx();
      const plane = el("div", { class: "layer", style: { left: `${(1920 - W) / 2 + 260}px`, top: `${(1080 - H) / 2 - 40}px`, width: `${W}px`, height: `${H}px`, transformOrigin: "50% 55%" } }, root);
      const canvas = el("canvas", { width: W, height: H, style: { position: "absolute", left: 0, top: 0 } }, plane);
      const s = svgRoot(plane, W, H);
      const f = sv("filter", { id: "hglow", x: "-50%", y: "-50%", width: "200%", height: "200%" }, sv("defs", {}, s));
      sv("feGaussianBlur", { stdDeviation: 10 }, f);
      const goal = route.at(-1);
      const goalRing = sv("circle", { cx: goal[0], cy: goal[1], r: 200, fill: "rgba(60,200,151,0.10)", stroke: "#3cc897", "stroke-width": 4 }, s);
      const d = ptsD(route), len = strokeLen(route);
      const glow = sv("path", { d, fill: "none", stroke: "#6aa9f2", "stroke-width": 22, "stroke-linecap": "round", filter: "url(#hglow)", opacity: 0.8 }, s);
      const line = sv("path", { d, fill: "none", stroke: "#e8f0ff", "stroke-width": 6, "stroke-linecap": "round", "stroke-linejoin": "round" }, s);
      const anchors = [0, 8, 16].map((i) => {
        const [x, y] = route[i];
        const shock = sv("circle", { cx: x, cy: y, r: 10, fill: "none", stroke: "#f2b134", "stroke-width": 4, opacity: 0 }, s);
        const dia = sv("rect", { x: x - 13, y: y - 13, width: 26, height: 26, transform: `rotate(45 ${x} ${y})`, fill: "#0c1322", stroke: "#f2b134", "stroke-width": 5 }, s);
        return { shock, dia, frac: strokeLen(route.slice(0, i + 1)) / len };
      });
      const drone = sv("g", {}, s);
      sv("circle", { r: 40, fill: "rgba(106,169,242,0.22)" }, drone);
      sv("path", { d: "M26 0 L-16 -18 L-7 0 L-16 18 Z", fill: "#fff" }, drone);

      const scrim = el("div", { class: "layer", style: { background: "linear-gradient(90deg, rgba(7,12,22,0.96) 0%, rgba(7,12,22,0.78) 40%, rgba(7,12,22,0) 68%)" } }, root);
      const box = el("div", { style: { position: "absolute", left: "110px", top: "250px", width: "980px" } }, root);
      const k0 = el("div", { class: "kicker", style: { color: "var(--grpo-hi)", marginBottom: "26px" } }, box, "X-Fly · aerial vision-language navigation");
      const l1 = el("div", { class: "hero" }, box, "VLM agents are expensive to query.");
      const l2 = el("div", { class: "hero", style: { marginTop: "18px", color: "var(--slow)" } }, box, "So fly the whole 8-control chunk.");
      const big = el("div", { style: { marginTop: "52px", display: "flex", alignItems: "baseline", gap: "28px" } }, box);
      const num = el("div", { class: "stat", style: { fontSize: "168px", color: "var(--grpo-hi)" } }, big, `${I.speedupShort}×`);
      const nl = el("div", { class: "statlab", style: { fontSize: "30px", maxWidth: "460px" } }, big, `less model inference per waypoint<br><span style="font-family:var(--mono);color:var(--ink-3)">${I.perWaypointMs.k1} → ${I.perWaypointMs.k8} ms</span>`);
      const src = source(root, "Route: OpenFly test-unseen expert trajectory (buildings procedural) · cost: §4.1, RTX PRO 5000 72GB, model inference only");
      const bdg = badge(root, "route");
      return { plane, ctx: canvas.getContext("2d"), blocks: makeCity(route), route, glow, line, len, anchors, drone, goalRing, scrim, k0, l1, l2, big, num, src, bdg };
    },
    render(st, t) {
      const p = prog(t, 0, 7.5, ease.soft);
      st.plane.style.transform = `perspective(1600px) rotateX(${lerp(62, 48, p)}deg) rotateZ(${lerp(-22, -6, p)}deg) scale(${lerp(0.78, 1.02, p)})`;
      st.plane.style.opacity = prog(t, 0, 0.6);
      paintCity(st.ctx, st.blocks, t);
      const rp = prog(t, 0.4, 3.2, ease.inOut);
      draw(st.line, st.len, rp); draw(st.glow, st.len, rp);
      const a = along(st.route, rp);
      st.drone.setAttribute("transform", `translate(${a.x} ${a.y}) rotate(${(a.a * 180) / Math.PI})`);
      st.drone.setAttribute("opacity", prog(t, 0.3, 0.3));
      st.anchors.forEach((an) => {
        // time at which the eased drawing reaches this anchor (bisection on the monotone easing)
        if (an.tHit === undefined) { let lo = 0.4, hi = 3.6; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (prog(m, 0.4, 3.2, ease.inOut) < an.frac) lo = m; else hi = m; } an.tHit = hi; }
        an.dia.setAttribute("opacity", t >= an.tHit ? 1 : 0);
        ring(an.shock, t, an.tHit, 12, 90, 0.8);
      });
      st.goalRing.setAttribute("opacity", prog(t, 3.4, 0.5));
      st.scrim.style.opacity = prog(t, 0.8, 0.8);
      kin(st.k0, t, 0.9); kin(st.l1, t, 1.3); kin(st.l2, t, 2.6);
      kin(st.big, t, 4.0, Infinity, 50);
      st.num.style.transform = `scale(${1 + 0.12 * Math.max(0, 1 - Math.abs(t - 4.5) / 0.5)})`;
      show(st.src, t, 0.6, Infinity, 0); show(st.bdg, t, 0.6, Infinity, 0);
    },
  });
})();
