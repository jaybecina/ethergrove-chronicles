# Frame-rate profile, 2026-10-31

**Spec:** `docs/superpowers/specs/2026-10-29-ethergrove-chronicles-design.md` §7.3 · **Run with:**
`pnpm --filter web perf:frames` · **Raw results:** `apps/web/perf-results/frames-*.json` (gitignored)

This measures today's real-time 3D renderer before the 2.5D renderer part, so that part knows which costs
matter. It is a report, not a gate.

## Setup

- **Build:** a production build with the E2E debug hook (`VITE_E2E=true vite build --outDir dist-perf`),
  served by `vite preview`. React runs in production mode.
- **Browser:** Playwright's full Chromium (`channel: 'chromium'`) on the real GPU: ANGLE Metal, Apple M4.
  Vsync and the frame cap are off (`--disable-gpu-vsync --disable-frame-rate-limit`), so frame time shows the
  real cost of a frame instead of the 60 Hz cap.
- **Scene:** seed 7, 12:00, the player at (12.5, 12.5) on the farm facing south, the default camera zoom.
  3 s warm-up, then 5 s measured.
- **Quality:** the High tier (shadow map 2048, pixel ratio up to 2, N8AO, full grass) unless the row says
  Low (shadow map 1024, pixel ratio up to 1.5, no AO, half grass).
- **Switches:** `?perf-off=` turns one cost off (`src/render/profileSwitches.ts`, E2E builds only): `dpr`
  caps the pixel ratio at 1, `ao` drops the N8AO pass, `shadows` turns off the shadow map, `grass` removes the
  grass, `particles` hides season and weather particles, `post` removes the whole post-processing chain
  (AO, bloom, tone mapping, colour grade, vignette, SMAA), and `all` does every one.
- **Numbers:** frame time is the median and 95th percentile time between frames. Draw calls and triangles are
  the median per frame, counted by wrapping the WebGL draw calls.

## Desktop: 1280 × 720 at pixel ratio 2 (canvas 2560 × 1440)

Two runs; the second run's frame times are shown, and the first run agreed within about 5%.

| Farm, sunny, High  | Frame p50 | Frame p95 | vs. baseline | Draw calls | Triangles |
| ------------------ | --------: | --------: | -----------: | ---------: | --------: |
| Baseline           |   14.4 ms |   16.1 ms |            — |        126 |     725 k |
| Pixel ratio 1      |    5.0 ms |    7.1 ms |         −65% |        126 |     725 k |
| No AO pass         |    7.1 ms |    8.7 ms |         −51% |        114 |     725 k |
| No shadow map      |   11.5 ms |   14.2 ms |         −20% |         84 |     387 k |
| No grass           |   13.8 ms |   16.7 ms | within noise |        125 |     691 k |
| No particles       |   14.3 ms |   16.3 ms | within noise |        125 |     725 k |
| No post-processing |    2.9 ms |    5.5 ms |         −80% |         95 |     725 k |
| All off            |    2.4 ms |    3.0 ms |         −83% |         51 |     353 k |

| Other scenes                   | Frame p50 | Frame p95 | Draw calls | Triangles |
| ------------------------------ | --------: | --------: | ---------: | --------: |
| Farm, rain, High               |   14.3 ms |   16.5 ms |        130 |     726 k |
| Farm, snow, High               |   14.2 ms |   16.3 ms |        128 |     725 k |
| House, High                    |   11.3 ms |   15.4 ms |        124 |      17 k |
| Farm, sunny, Low (1920 × 1080) |    4.2 ms |    6.3 ms |        114 |     709 k |

## Phone stand-in: Pixel 7 screen, CPU slowed 4×

| Farm, sunny              |     Canvas | Frame p50 | Frame p95 | Draw calls |
| ------------------------ | ---------: | --------: | --------: | ---------: |
| High, baseline           | 824 × 1678 |    6.2 ms |    8.7 ms |        117 |
| High, no post-processing | 824 × 1678 |    1.9 ms |    3.6 ms |         87 |
| High, all off            |  412 × 839 |    1.3 ms |    3.1 ms |         43 |
| Low, baseline            | 618 × 1258 |    2.8 ms |    4.7 ms |        106 |

**This stand-in still draws on the M4's GPU.** CPU throttling slows JavaScript but not the GPU, so these rows
show that the CPU is not the bottleneck (1.3 ms per frame with everything off, even at 4× slower), and say
nothing about a phone's GPU. A mid-range phone GPU is many times slower than an M4, so the GPU-bound costs below
will weigh far more there. Only a run on a real phone can give the phone numbers.

## What it shows

1. **Per-pixel work dominates; geometry barely matters.** The house draws 17 k triangles and still takes 11.3 ms,
   almost as long as the farm's 725 k.
2. **Post-processing is about 80% of the frame** (14.4 → 2.9 ms). The **N8AO pass alone is half of it**
   (14.4 → 7.1 ms). Spec §7.2 already drops screen-space AO and bakes light instead.
3. **Pixel count is the next lever.** Pixel ratio 2 → 1 cuts the frame by 65%, because every pixel pays for the
   post-processing chain.
4. **The shadow map costs about 20%**, 42 draw calls and 338 k triangles (the scene drawn again from the sun).
   Blob shadows (§7.2) remove it.
5. **Grass and particles cost nothing measurable** on this GPU. They are not worth cutting for speed.
6. **Draw calls are 126 on the farm**, over the §7.2 target of 100; 51 with everything off. The shadow pass
   (42) and the post chain (31) are most of the rest.
7. **The CPU is not the limit**, even slowed 4×.

## For the renderer spec

- Keep the post-processing chain to what the 2.5D look needs: no N8AO, and tone mapping and the colour grade in
  as few full-screen passes as possible.
- Set the phone pixel-ratio cap from a real-phone run; until then, keep Low's 1.5.
- Remove the shadow map along with real-time shadows; this also brings draw calls under 100.
- Don't spend effort cutting triangles, grass or particles for speed.

## Not measured, and why

- **GPU time:** `EXT_disjoint_timer_query_webgl2` is exposed on ANGLE Metal, but its readings were 2–3× the
  frame time (39 ms for a 14 ms frame), which can't be right. They are left out. The harness still records them
  for other platforms.
- **A real mid-range phone:** not run. It needs a phone on Chrome's remote debugging, or a manual check with the
  same `?perf-off=` switches.
- **WebKit / Safari:** the profile runs in Chromium only.
