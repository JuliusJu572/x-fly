// Deterministic timeline engine: every visual is a pure function of time t (seconds).
window.XF = window.XF || {};
XF.scenes = [];
XF.register = (scene) => XF.scenes.push(scene);

XF.u = (() => {
  const SVG = "http://www.w3.org/2000/svg";
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, p) => a + (b - a) * p;
  const bez = (x1, y1, x2, y2) => {
    // cubic-bezier easing solved by bisection: deterministic and dependency-free
    const cx = (t) => 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t * t * (1 - t) + t ** 3;
    const cy = (t) => 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t * t * (1 - t) + t ** 3;
    return (x) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let lo = 0, hi = 1;
      for (let i = 0; i < 28; i++) { const m = (lo + hi) / 2; if (cx(m) < x) lo = m; else hi = m; }
      return cy((lo + hi) / 2);
    };
  };
  const ease = {
    out: bez(0.16, 1, 0.3, 1),
    inOut: bez(0.65, 0, 0.35, 1),
    in: bez(0.5, 0, 0.75, 0),
    soft: bez(0.33, 0, 0.2, 1),
    linear: (x) => x,
  };
  const prog = (t, t0, dur, e = ease.out) => e(clamp((t - t0) / dur));
  const win = (t, a, b, fi = 0.6, fo = 0.6) =>
    Math.min(prog(t, a, fi), b === Infinity ? 1 : 1 - prog(t, b - fo, fo, ease.inOut));

  const el = (tag, attrs = {}, parent, html) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "style" && typeof v === "object") Object.assign(n.style, v);
      else n.setAttribute(k, v);
    }
    if (html !== undefined) n.innerHTML = html;
    if (parent) parent.appendChild(n);
    return n;
  };
  const sv = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(SVG, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (parent) parent.appendChild(n);
    return n;
  };
  const svgRoot = (parent, w = 1920, h = 1080, style = {}) =>
    sv("svg", { width: w, height: h, viewBox: `0 0 ${w} ${h}`, style: Object.entries({ position: "absolute", left: "0", top: "0", ...style }).map(([k, v]) => `${k}:${v}`).join(";") }, parent);

  // Reveal: fade + rise within [a, b).
  const show = (node, t, a, b = Infinity, dy = 22) => {
    const p = win(t, a, b);
    node.style.opacity = p;
    node.style.translate = `0 ${(1 - p) * dy}px`;
    node.style.visibility = p <= 0.001 ? "hidden" : "visible";
    return p;
  };
  const fade = (node, t, a, b = Infinity, fi = 0.6, fo = 0.6) => {
    const p = win(t, a, b, fi, fo);
    if (node instanceof SVGElement) node.setAttribute("opacity", p);
    else node.style.opacity = p;
    return p;
  };

  // Draw an SVG stroke progressively; uses an explicit length so it never depends on layout.
  const strokeLen = (pts) => pts.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);
  const draw = (path, len, p) => {
    path.setAttribute("stroke-dasharray", `${len} ${len + 2}`);
    path.setAttribute("stroke-dashoffset", (1 - clamp(p)) * len);
  };
  const ptsD = (pts, close = false) => pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("") + (close ? "Z" : "");
  const smoothD = (pts) => {
    // Catmull-Rom to cubic Bezier
    if (pts.length < 3) return ptsD(pts);
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d;
  };
  // Point at arc-length fraction p along a polyline, plus heading.
  const along = (pts, p) => {
    const L = strokeLen(pts);
    let target = clamp(p) * L;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], s = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (target <= s || i === pts.length - 1) {
        const q = s ? clamp(target / s) : 0;
        return { x: lerp(a[0], b[0], q), y: lerp(a[1], b[1], q), a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
      }
      target -= s;
    }
    const z = pts[pts.length - 1];
    return { x: z[0], y: z[1], a: 0 };
  };
  const rng = (seed) => () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
  const gauss = (r) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
  const fmt = (x, n = 2) => (+x).toFixed(n);
  const signed = (x, n = 2) => (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x).toFixed(n);
  const counter = (t, t0, dur, v, n = 2) => fmt(v * prog(t, t0, dur, ease.soft), n);

  // Shared scene furniture.
  const header = (root, kicker, title) => {
    const h = el("div", { class: "header" }, root);
    el("div", { class: "kicker" }, h, kicker);
    el("div", { class: "title" }, h, title);
    return h;
  };
  const source = (root, text) => el("div", { class: "src" }, root, text);
  const badge = (root, kind) => {
    const text = { schematic: "Schematic · illustrative", paper: "Paper data", figure: "Paper figure", route: "Real expert route", preprint: "arXiv:2610.21450" }[kind];
    return el("div", { class: `badge ${kind}` }, root, text);
  };

  // Kinetic reveal: blur + rise + slight scale, for headline text.
  const kin = (node, t, a, b = Infinity, dy = 34) => {
    const p = win(t, a, b, 0.45, 0.35);
    node.style.opacity = p;
    node.style.filter = p < 0.999 ? `blur(${(1 - p) * 14}px)` : "none";
    node.style.transform = `translateY(${(1 - p) * dy}px) scale(${0.96 + 0.04 * p})`;
    node.style.visibility = p <= 0.001 ? "hidden" : "visible";
    return p;
  };
  // Expanding shock ring on an SVG circle, fired at t0.
  const ring = (c, t, t0, r0, r1, dur = 0.9) => {
    const q = clamp((t - t0) / dur);
    c.setAttribute("r", r0 + (r1 - r0) * ease.out(q));
    c.setAttribute("opacity", q > 0 && q < 1 ? (1 - q) * 0.9 : 0);
  };
  // Number ticker.
  const tick = (node, t, t0, dur, from, to, n = 2, suffix = "") => {
    node.textContent = fmt(from + (to - from) * prog(t, t0, dur, ease.out), n) + suffix;
  };
  // Drifting blueprint grid + vignette, shared by the schematic scenes.
  const backdrop = (root) => {
    const g = el("div", { class: "layer backdrop" }, root);
    const grid = el("div", { class: "layer grid" }, g);
    el("div", { class: "layer vignette" }, g);
    return { g, grid };
  };
  const drift = (bd, t, speed = 18) => { bd.grid.style.backgroundPosition = `${-t * speed}px ${-t * speed * 0.35}px`; };

  return { SVG, clamp, lerp, ease, prog, win, el, sv, svgRoot, show, fade, strokeLen, draw, ptsD, smoothD, along, rng, gauss, fmt, signed, counter, header, source, badge, kin, ring, tick, backdrop, drift };
})();

XF.engine = (() => {
  const FPS = 30;
  const XFADE = 0.4;
  let segs = [];
  let total = 0;

  const build = (stage) => {
    let t0 = 0;
    segs = XF.scenes.map((s, i) => {
      const root = XF.u.el("div", { class: "seg", "data-id": s.id }, stage);
      const state = s.mount(root) || {};
      const seg = { scene: s, root, state, start: t0, end: t0 + s.duration, i };
      t0 += s.duration - (i < XF.scenes.length - 1 ? XFADE : 0);
      return seg;
    });
    total = segs.length ? segs[segs.length - 1].end : 0;
    return { total, segs };
  };

  const render = (t) => {
    for (const s of segs) {
      const on = t >= s.start - 1e-6 && t < s.end + 1e-6;
      s.root.style.display = on ? "block" : "none";
      if (!on) continue;
      const local = t - s.start;
      let o = 1;
      if (s.i > 0) o = Math.min(o, XF.u.clamp(local / XFADE));
      if (s.i < segs.length - 1) o = Math.min(o, XF.u.clamp((s.end - t) / XFADE));
      s.root.style.opacity = o;
      s.scene.render(s.state, local, s.root);
    }
  };

  const chapters = () => {
    const seen = new Map();
    for (const s of segs) if (!seen.has(s.scene.chapter)) seen.set(s.scene.chapter, s.start);
    return [...seen].map(([name, start]) => ({ name, start }));
  };

  return { FPS, XFADE, build, render, chapters, get total() { return total; }, get segs() { return segs; } };
})();
