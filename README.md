<div align="center">

# X-Fly

### Learning to Reach and Stop in Full-Chunk Aerial Vision-Language Navigation

**Ruibin Ju**<sup>\*</sup> · **Ruifeng Cai** · **Min Xu** · **Lin Wang**

ARIDGE, XPENG &nbsp;·&nbsp; <sup>\*</sup>Corresponding author: jurb@aridge.com

[![Project page](https://img.shields.io/badge/Project-Page-C2187A?style=flat-square)](https://juliusju572.github.io/x-fly/)
[![Paper](https://img.shields.io/badge/Paper-PDF-0F1B2D?style=flat-square)](assets/paper/x-fly.pdf)
[![arXiv](https://img.shields.io/badge/arXiv-coming%20soon-B31B1B?style=flat-square)](#citation)
[![License: MIT](https://img.shields.io/badge/License-MIT-2F5BD3?style=flat-square)](LICENSE)

**English** · [简体中文](README.zh-CN.md)

</div>

<p align="center">
  <img src="assets/gif/water_tower_140m.gif" width="100%" alt="X-Fly closed-loop rollout on a held-out SmallCity route: expert first-person view, X-Fly first-person view with the current 8-control chunk, and a top-down comparison of expert and policy paths">
  <br><sub>Closed-loop rollout on a held-out UE SmallCity route (test-unseen): water tower, then the HVAC roof, 140 m flown, stops 8.4 m from the goal. Left: expert view. Middle: X-Fly's view with the current 8-control chunk. Right: expert (GT) and policy (PRED) paths from above.</sub>
</p>

| SR, test-seen | SR, test-unseen | Model inference per waypoint |
|:---:|:---:|:---:|
| **74.18%** | **51.73%** | **195 → 42 ms** (4.7× less) |
| OpenFly, k = 8 | held-out SmallCity, k = 8 | single-step → full-chunk |

## Overview

Aerial vision-language navigation (VLN) agents built on large vision-language models are expensive to query. Executing a complete predicted action chunk before replanning amortizes this cost, reducing model inference from 195 to 42 ms per executed waypoint. It also moves the states at which the policy is queried away from expert demonstrations, which supervise neither recovery from these states nor termination at the learner's own arrival. On OpenFly test-seen, no-stop failures account for 47.78% of full-chunk behavior cloning (BC) outcomes.

X-Fly is a staged training framework for full-chunk aerial VLN:

1. **Multi-domain BC** trains a fast–slow policy on a frozen Qwen3.5-4B backbone, with a rectified-flow controller that emits eight 4-D controls and a separate Bernoulli STOP head.
2. **Recovery DAgger** labels learner-visited decision states with smooth chunks that reconnect to future expert segments, and with STOP at the first in-region state.
3. **Flow-GRPO** jointly refines the chunked flow controller and the Bernoulli STOP policy from same-task closed-loop outcomes, supplemented by outcome-verified stopping supervision.

With eight controls per decision, X-Fly reaches 74.18% SR on test-seen and 51.73% on test-unseen, compared with 16.45% and 18.43% for full-chunk BC and 32.04% and 29.46% for DreamFly.

<p align="center">
  <a href="https://juliusju572.github.io/x-fly/video/"><img src="assets/readme/explainer_cover.jpg" width="80%" alt="Play the 57-second X-Fly explainer"></a>
  <br><sub>57-second explainer, rendered in the browser. <a href="https://juliusju572.github.io/x-fly/video/">Watch it on the project page.</a></sub>
</p>

## Method

<p align="center"><img src="assets/readme/mechanism_training.png" width="100%" alt="Fig. 2: the full-chunk support gap and how X-Fly addresses it"></p>

**The full-chunk support gap.** (a) Full-chunk BC flies eight controls between decisions and visits learner-induced anchors that expert demonstrations cover poorly, with neither a corrective chunk nor an arrival STOP label; the policy overshoots the goal. (b) Recovery DAgger relabels each learner anchor with a chunk whose offset decays by a smoothstep and rejoins the expert route at the chunk end; the first in-region anchor receives STOP. (c) Flow-GRPO samples six free and two STOP-override attempts per task with low-frequency chunk noise and a Bernoulli STOP policy, and uses their relative outcomes to update both.

<p align="center"><img src="assets/readme/model_architecture.png" width="100%" alt="Fig. 3: the X-Fly policy backbone"></p>

**Policy backbone.** A slow path runs the frozen Qwen3.5-4B VLM on the instruction and causal keyframes; a fast path runs only its visual tower on the current frame. Fused with ten state/anchor/action tokens, the representation drives a rectified-flow controller that emits eight controls (Δx, Δy, Δz, Δψ) and a separate Bernoulli STOP head.

## Results

OpenFly test-seen (1,392 trajectories) and test-unseen (404, held-out UE SmallCity), DreamFly-processed benchmark. NE in meters, other metrics in %. Every X-Fly row uses unit-temperature Bernoulli STOP, a 128-control cap, and exact evaluation over its first-stop distribution; prior rows are published results with their native stopping policies.

| Method | k | Seen SR ↑ | Seen OSR ↑ | Seen SPL ↑ | Seen NE ↓ | Unseen SR ↑ | Unseen OSR ↑ | Unseen SPL ↑ | Unseen NE ↓ |
|:---|:---:|---:|---:|---:|---:|---:|---:|---:|---:|
| OpenFly-Agent | – | 22.63 | 52.73 | 20.42 | 122.89 | 14.11 | 62.38 | 12.49 | 163.87 |
| DreamFly | 1 | 32.04 | 46.77 | 28.22 | 44.87 | 29.46 | 46.78 | 23.54 | 45.29 |
| X-Fly BC | 1 | 46.57 | 52.85 | 39.92 | 37.28 | 22.49 | 23.46 | 21.00 | 58.61 |
| X-Fly BC | 8 | 16.45 | 67.30 | 13.54 | 37.87 | 18.43 | 43.14 | 16.18 | 48.12 |
| + Recovery DAgger | 1 | 68.88 | 75.45 | 56.84 | 20.12 | 44.27 | 47.64 | 39.96 | 36.43 |
| + Recovery DAgger | 8 | 63.46 | 72.87 | 54.54 | 21.49 | 40.63 | 52.71 | 36.46 | 35.16 |
| **+ Flow-GRPO (X-Fly, full)** | **8** | **74.18** | **84.07** | **66.34** | **17.77** | **51.73** | 68.07 | **47.03** | **29.17** |

Excerpt of Table 1; the full table with all prior methods is in the paper and on the [project page](https://juliusju572.github.io/x-fly/#results). The highest unseen OSR (73.02) belongs to CMA.

<p align="center"><img src="assets/readme/teaser_sr_cost.png" width="49%" alt="Fig. 1: accuracy–inference trade-off of X-Fly stages"> <img src="assets/readme/failure_transition.png" width="44%" alt="Fig. 4: outcome attribution on the same recorded rollouts"></p>
<p align="center"><sub><b>Left:</b> SR under single-step (k = 1) and full-chunk (k = 8) execution against amortized model inference per waypoint. <b>Right:</b> outcome attribution: recovery removes no-stop failures, Flow-GRPO roughly halves premature stops.</sub></p>

## More rollouts

<p align="center"><img src="assets/gif/skyline_103m.gif" width="100%" alt="X-Fly rollout through five landmarks across the skyline">
<br><sub>Five landmarks across the skyline, 103 m flown, stops 18.3 m from the goal.</sub></p>

<details>
<summary><b>Four more held-out routes</b> (click to expand)</summary>
<br>

<p align="center"><img src="assets/gif/ascend_descend_156m.gif" width="100%" loading="lazy" alt="X-Fly rollout that climbs, cruises and descends beside the target">
<br><sub>Climb, cruise, descend beside the target: 156 m flown, stops 16.1 m from the goal.</sub></p>

<p align="center"><img src="assets/gif/left_turn_123m.gif" width="100%" loading="lazy" alt="X-Fly rollout from a dark tower, left turn, to a light-gray block">
<br><sub>Dark tower, left turn, light-gray block: 123 m flown, stops 14.6 m from the goal.</sub></p>

<p align="center"><img src="assets/gif/parking_lot_67m.gif" width="100%" loading="lazy" alt="X-Fly rollout along a road, past a tower and a parking lot">
<br><sub>Road, tower, parking lot, tower: 67 m flown, stops 7.9 m from the goal.</sub></p>

<p align="center"><img src="assets/gif/office_114m.gif" width="100%" loading="lazy" alt="X-Fly rollout with a one-sentence instruction that ends 0.6 m from the goal">
<br><sub>One sentence, 114 m flown, stops 0.6 m from the goal.</sub></p>

</details>

The [project page](https://juliusju572.github.io/x-fly/#demos) plays these as videos next to their full instructions, together with interactive explainers for recovery labels, chunk noise and group-relative credit.

<sub>Rollouts are qualitative examples: successful test-unseen episodes with a flown path over 30 m, rendered from a Flow-GRPO checkpoint during development. All benchmark numbers come from the paper's evaluation protocol.</sub>

## Contributors

| Advisor | Core Contributor | Contributors |
|:---:|:---:|:---:|
| Lin Wang | Ruibin Ju | Ruifeng Cai, Min Xu |

## Citation

```bibtex
@article{ju2026xfly,
  title   = {X-Fly: Learning to Reach and Stop in Full-Chunk Aerial Vision-Language Navigation},
  author  = {Ju, Ruibin and Cai, Ruifeng and Xu, Min and Wang, Lin},
  journal = {arXiv preprint},
  year    = {2026}
}
```

## About this repository

This repository hosts the public project page and disclosure material for X-Fly: the website (served by GitHub Pages), the explainer animation, rollout media, figures and the paper PDF. It does not contain training or evaluation code. The website code is released under the [MIT License](LICENSE); the paper, figures and media are © 2026 the X-Fly authors.
