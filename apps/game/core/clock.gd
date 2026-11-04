class_name Clock
extends RefCounted
## The fixed simulation step and the game clock rate, ported from apps/web/src/game/loop.ts and config.ts. Pure: the
## caller passes the real frame time in and keeps the accumulators.

## Fixed simulation step.
const STEP_MS := 50
## Longest frame simulated; longer gaps (window hidden, debugger pause) are dropped.
const MAX_FRAME_MS := 250
## 10 game minutes per 7 real seconds (spec §2.3).
const MINUTES_PER_MS := 10.0 / 7000.0
## Absorbs float error so 14 steps make exactly one minute (loop.ts's `1e-9`).
const MINUTE_EPSILON := 1e-9


## Port of `advanceAccumulator`: the whole steps to run for a frame of `frame_ms` (clamped to 0..MAX_FRAME_MS) on
## top of `acc_ms` left over, and the new remainder. Returns {steps: int, acc_ms: float}.
static func advance(acc_ms: float, frame_ms: float) -> Dictionary:
	var total := acc_ms + clampf(frame_ms, 0.0, float(MAX_FRAME_MS))
	var steps := floori(total / STEP_MS)
	return {"steps": steps, "acc_ms": total - steps * STEP_MS}


## One step's worth of game minutes added to the fractional `minute_acc`: the whole minutes to tick now and the
## fraction kept. Returns {whole: int, acc: float}.
static func minutes_for_step(minute_acc: float) -> Dictionary:
	var acc := minute_acc + STEP_MS * MINUTES_PER_MS
	var whole := floori(acc + MINUTE_EPSILON)
	if whole > 0:
		acc -= whole
	return {"whole": whole, "acc": acc}
