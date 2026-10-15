// Browser player + capture hooks. Playback derives t from the wall clock, so it never drifts;
// capture mode calls XF.seek(t) frame by frame instead.
// URL params: t=SECONDS start time · paused=1 / autoplay=0 start paused · loop=0|1 (default 1 in embed, else 0)
//             embed=1 iframe mode: no dev controls, fit to window (16:9 letterbox), click/Space toggles play, loops,
//             autoplays unless prefers-reduced-motion · capture=1 frame capture (render/qa scripts only)
(() => {
  const params = new URLSearchParams(location.search);
  const capture = params.get("capture") === "1";
  const embed = !capture && params.get("embed") === "1";
  if (capture) document.body.classList.add("capture");
  if (embed) document.body.classList.add("embed");
  const loopOn = params.has("loop") ? params.get("loop") === "1" : embed;
  const reduced = embed && matchMedia("(prefers-reduced-motion: reduce)").matches;

  const stage = document.getElementById("stage");
  const viewport = document.getElementById("viewport");
  const { total } = XF.engine.build(stage);

  const chrome = XF.u.el("div", { id: "chrome" }, stage);
  XF.u.el("div", { id: "wordmark" }, chrome, "X-Fly");
  const bar = XF.u.el("div", { id: "progress" }, chrome);
  const fill = XF.u.el("div", { class: "fill" }, bar);
  for (const c of XF.engine.chapters()) XF.u.el("div", { class: "tick", style: { left: `${(c.start / total) * 100}%` } }, bar);

  // a paused embed without ?t= shows the fully built hook title as its poster frame instead of the black t = 0
  const pausedStart = reduced || params.get("paused") === "1" || params.get("autoplay") === "0";
  let t = Math.min(+(params.get("t") || (embed && pausedStart ? 5.5 : 0)), total);
  let playing = !capture && !reduced && params.get("paused") !== "1" && params.get("autoplay") !== "0";
  let anchorWall = performance.now();
  let anchorT = t;

  const paint = () => {
    XF.engine.render(t);
    fill.style.width = `${(t / total) * 100}%`;
    wordmarkVisibility();
    if (!capture) syncControls();
  };
  const frame = document.getElementById("frame");
  const overlay = embed ? XF.u.el("button", { id: "overlay", type: "button" }, frame) : null;
  const wordmarkVisibility = () => {
    // the opening and closing scenes carry their own title treatment
    const id = XF.engine.segs.find((s) => t >= s.start && t < s.end)?.scene.id;
    chrome.querySelector("#wordmark").style.opacity = id === "opening" || id === "summary" || id === "credits" ? 0 : 1;
  };

  // ---------- controls ----------
  const scrub = document.getElementById("scrub");
  const timeLabel = document.getElementById("time");
  const playBtn = document.getElementById("play");
  const fmtT = (x) => `${Math.floor(x / 60)}:${(x % 60).toFixed(1).padStart(4, "0")}`;
  const syncControls = () => {
    scrub.value = t;
    timeLabel.textContent = `${fmtT(t)} / ${fmtT(total)}`;
    playBtn.textContent = playing ? "Pause" : "Play";
    playBtn.setAttribute("aria-pressed", String(playing));
    if (overlay && overlay.dataset.state !== String(playing)) {
      overlay.dataset.state = String(playing);
      overlay.classList.toggle("paused", !playing);
      overlay.setAttribute("aria-label", playing ? "Pause animation" : "Play animation");
      overlay.innerHTML = playing
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg><span>Play</span>';
    }
  };
  const setT = (x) => { t = Math.max(0, Math.min(total, x)); anchorT = t; anchorWall = performance.now(); paint(); };
  const toggle = () => { if (t >= total) setT(0); playing = !playing; anchorT = t; anchorWall = performance.now(); paint(); };

  if (!capture) {
    scrub.max = total;
    scrub.addEventListener("input", () => setT(+scrub.value));
    playBtn.addEventListener("click", toggle);
    document.getElementById("restart").addEventListener("click", () => setT(0));
    const chapterBox = document.getElementById("chapters");
    XF.engine.chapters().forEach((c, i) => {
      const b = XF.u.el("button", { type: "button", title: c.name }, chapterBox, String(i + 1));
      b.setAttribute("aria-label", `Chapter ${i + 1}: ${c.name}`);
      b.addEventListener("click", () => setT(c.start + 0.01));
    });
    addEventListener("keydown", (e) => {
      if (e.key === " ") { e.preventDefault(); toggle(); }
      if (e.key === "ArrowRight") setT(t + 2);
      if (e.key === "ArrowLeft") setT(t - 2);
    });
    if (overlay) {
      // the whole frame is the click target; the button itself is the keyboard/screen-reader control
      frame.addEventListener("click", toggle);
      overlay.addEventListener("click", (e) => { e.stopPropagation(); toggle(); });
    }
    const fit = () => {
      const s = Math.min(innerWidth / 1920, (innerHeight - (embed ? 0 : 60)) / 1080);
      viewport.style.transform = `scale(${s})`;
      viewport.style.width = "1920px";
      frame.style.width = `${1920 * s}px`;
      frame.style.height = `${1080 * s}px`;
    };
    addEventListener("resize", fit);
    fit();
  }

  const loop = (now) => {
    if (playing) {
      t = anchorT + (now - anchorWall) / 1000;
      if (t >= total && loopOn) { t %= total; anchorT = t; anchorWall = now; }
      else if (t >= total) { t = total; playing = false; }
      paint();
    }
    requestAnimationFrame(loop);
  };

  // ---------- capture API ----------
  const imgs = [...document.images];
  XF.ready = Promise.all([
    document.fonts.ready,
    ...imgs.map((im) => (im.complete ? im.decode().catch(() => {}) : new Promise((r) => { im.onload = im.onerror = r; }))),
  ]).then(() => ({ total, fps: XF.engine.FPS }));
  XF.seek = (x) => { t = x; paint(); };

  paint();
  if (!capture) requestAnimationFrame(loop);
})();
