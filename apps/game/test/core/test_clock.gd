extends CoreTest
## Clock: the fixed 50 ms step and the game-minute accumulator, ported from apps/web/src/game/loop.ts and its tests.


func test_constants_match_ts() -> void:
	eq(Clock.STEP_MS, 50)
	eq(Clock.MAX_FRAME_MS, 250)
	eq(Clock.MINUTES_PER_MS, 10.0 / 7000.0)


func test_advance_matches_ts() -> void:
	eq(Clock.advance(0.0, 120.0), {"steps": 2, "acc_ms": 20.0}, "runs whole steps and keeps the remainder")
	eq(Clock.advance(20.0, 30.0), {"steps": 1, "acc_ms": 0.0}, "carries the remainder")
	eq(Clock.advance(0.0, 60000.0), {"steps": 5, "acc_ms": 0.0}, "clamps a huge frame gap to 250 ms")
	eq(Clock.advance(10.0, -5.0), {"steps": 0, "acc_ms": 10.0}, "treats negative frames as zero")


func test_minutes_accumulate_to_ten_per_seven_seconds() -> void:
	var acc := 0.0
	var total := 0
	for i: int in 13:
		var r := Clock.minutes_for_step(acc)
		acc = r["acc"]
		var whole: int = r["whole"]
		total += whole
	eq(total, 0, "13 steps: no whole minute yet")
	var fourteenth := Clock.minutes_for_step(acc)
	eq(fourteenth["whole"], 1, "the 14th step completes a minute")
	acc = fourteenth["acc"]
	total = 1
	for i: int in 126:
		var r := Clock.minutes_for_step(acc)
		acc = r["acc"]
		var whole: int = r["whole"]
		total += whole
	eq(total, 10, "140 steps (7 s) are exactly 10 game minutes")
	assert_true(acc < 0.001, "no drift left over")
	eq(typeof(fourteenth["whole"]), TYPE_INT)


func test_minutes_do_not_drift_over_1400_steps() -> void:
	var acc := 0.0
	var total := 0
	for i: int in 1400:
		var r := Clock.minutes_for_step(acc)
		acc = r["acc"]
		var whole: int = r["whole"]
		total += whole
	eq(total, 100, "1400 steps (70 s) are exactly 100 game minutes")
	assert_true(absf(acc) < 1e-6, "remaining accumulator %s" % acc)
