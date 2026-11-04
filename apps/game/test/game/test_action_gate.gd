extends CoreTest
## ActionGate, ported from apps/web/src/input/actionGate.ts: a held button fires once on press, then at most once
## per 350 ms.


func test_fires_on_the_first_press() -> void:
	var gate := ActionGate.new()
	assert_true(gate.allow(true, 1000))


func test_not_pressed_never_fires() -> void:
	var gate := ActionGate.new()
	assert_false(gate.allow(false, 1000))


func test_gate_blocks_second_press_within_350ms() -> void:
	var gate := ActionGate.new()
	assert_true(gate.allow(true, 1000))
	assert_false(gate.allow(true, 1050))
	assert_false(gate.allow(true, 1349))


func test_gate_releases_after_350ms() -> void:
	var gate := ActionGate.new()
	assert_true(gate.allow(true, 1000))
	assert_true(gate.allow(true, 1350), "held: repeats at 350 ms")
	assert_false(gate.allow(true, 1400))
	assert_true(gate.allow(true, 1700))


func test_gate_needs_a_fresh_press() -> void:
	var gate := ActionGate.new()
	assert_true(gate.allow(true, 1000))
	assert_false(gate.allow(false, 1050), "release")
	assert_true(gate.allow(true, 1100), "a fresh press fires at once")


func test_custom_repeat() -> void:
	var gate := ActionGate.new(100)
	assert_true(gate.allow(true, 0))
	assert_false(gate.allow(true, 99))
	assert_true(gate.allow(true, 100))
