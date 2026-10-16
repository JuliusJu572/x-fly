// Every number shown in the video lives here, with its source in paper/main.tex (arXiv:2610.21450v1, checked 2026-10-16).
// Derived values (deltas, ratios) are computed in XF.derive, never typed by hand.
window.XF = window.XF || {};

XF.data = {
  paper: {
    title: "X-Fly: Learning to Reach and Stop in Full-Chunk Aerial Vision-Language Navigation",
    venue: "arXiv:2610.21450",
    authors: "Ruibin Ju et al.",
    affiliation: "ARIDGE, XPENG",
  },

  // Closing credit card (v7_credits).
  credits: {
    title: "Contributors",
    roles: [
      { role: "Advisor", names: "Lin Wang" },
      { role: "Core Contributor", names: "Ruibin Ju" },
      { role: "Contributors", names: "Ruifeng Cai, Min Xu" },
    ],
    org: "ARIDGE · XPENG",
  },

  // Table 1 (tab:main). Prior rows: reported native STOP. X-Fly rows: Bernoulli STOP at unit temperature, exact first-stop expectation.
  table1: {
    source: "Table 1 · OpenFly test-seen / test-unseen (DreamFly-processed) · 20 m success radius",
    rows: [
      { id: "dreamfly", name: "DreamFly (k=1)", seen: { SR: 32.04, OSR: 46.77, SPL: 28.22, NE: 44.87 }, unseen: { SR: 29.46, OSR: 46.78, SPL: 23.54, NE: 45.29 } },
      { id: "bc_k1",  name: "BC only, k=1",          seen: { SR: 46.57, OSR: 52.85, SPL: 39.92, NE: 37.28 }, unseen: { SR: 22.49, OSR: 23.46, SPL: 21.00, NE: 58.61 } },
      { id: "bc_k8",  name: "BC only, k=8",          seen: { SR: 16.45, OSR: 67.30, SPL: 13.54, NE: 37.87 }, unseen: { SR: 18.43, OSR: 43.14, SPL: 16.18, NE: 48.12 } },
      { id: "dag_k1", name: "+ DAgger, k=1",         seen: { SR: 68.88, OSR: 75.45, SPL: 56.84, NE: 20.12 }, unseen: { SR: 44.27, OSR: 47.64, SPL: 39.96, NE: 36.43 } },
      { id: "dag_k8", name: "+ DAgger, k=8",         seen: { SR: 63.46, OSR: 72.87, SPL: 54.54, NE: 21.49 }, unseen: { SR: 40.63, OSR: 52.71, SPL: 36.46, NE: 35.16 } },
      { id: "xfly",   name: "+ Flow-GRPO, k=8",      seen: { SR: 74.18, OSR: 84.07, SPL: 66.34, NE: 17.77 }, unseen: { SR: 51.73, OSR: 68.07, SPL: 47.03, NE: 29.17 } },
    ],
  },

  // Appendix Table 3 (tab:failure) outcome attribution: % of episodes; the four failure columns + SR (= STOP + no-STOP successes) sum to 100.
  failure: {
    source: "Table 3 outcome attribution · % of episodes · expectation over the first-stop distribution",
    rows: {
      bc_k1:  { seen: { nav: 28.02, early: 19.13, late: 6.20, nostop: 0.07 },  unseen: { nav: 44.80, early: 31.74, late: 0.65, nostop: 0.33 } },
      bc_k8:  { seen: { nav: 30.77, early: 3.85,  late: 1.15, nostop: 47.78 }, unseen: { nav: 53.22, early: 3.98,  late: 0.48, nostop: 23.88 } },
      dag_k1: { seen: { nav: 7.14,  early: 17.41, late: 6.57, nostop: 0 },     unseen: { nav: 18.56, early: 33.80, late: 3.37, nostop: 0 } },
      dag_k8: { seen: { nav: 7.14,  early: 21.21, late: 8.19, nostop: 0 },     unseen: { nav: 10.40, early: 37.18, late: 11.80, nostop: 0 } },
      xfly:   { seen: { nav: 6.59,  early: 9.34,  late: 9.89, nostop: 0 },     unseen: { nav: 11.39, early: 21.04, late: 15.84, nostop: 0 } },
    },
  },

  // §4.1 "Amortized inference cost" (4.66×; abstract and Fig. 1 round to 4.7×).
  inference: { perWaypointMs: { k1: 195, k8: 42 }, speedup: 4.66, speedupShort: 4.7, source: "§4.1 amortized model inference, RTX PRO 5000 72GB" },

  // §4.4 training dynamics, source-validation panel (384 BigCity routes).
  dynamics: { dagSR: [53.4, 65.1], updates: 3000, bcSR: [19.0, 25.8], bcUpdates: 680 },

  // §5 limitations.
  limitation: { anchorReach: { seen: 93.41, unseen: 88.61 } },

  method: { H: 8, M: 4, rho: 0.1, groupSize: 8, groupFree: 6, groupOverride: 2, successRadius: 20, daggerRounds: 3 },

  // A real expert route from OpenFly test-unseen (SmallCity), used for the opening flyover only.
  route: {
    pos: [[-561.29,-337.31],[-552.29,-337.31],[-543.29,-337.31],[-534.29,-337.31],[-525.29,-337.31],[-516.29,-337.31],[-507.29,-337.31],[-498.29,-337.31],[-489.29,-337.31],[-480.29,-337.31],[-477.29,-337.31],[-474.29,-337.31],[-474.29,-337.31],[-471.29,-332.12],[-466.79,-324.32],[-462.29,-316.53],[-459.29,-311.33],[-457.79,-308.73],[-455.19,-307.23],[-452.59,-305.73]],
  },
};

XF.derive = (() => {
  const rows = Object.fromEntries(XF.data.table1.rows.map((r) => [r.id, r]));
  return {
    rows,
    delta: (a, b, split, m) => +(rows[a][split][m] - rows[b][split][m]).toFixed(2),
  };
})();
