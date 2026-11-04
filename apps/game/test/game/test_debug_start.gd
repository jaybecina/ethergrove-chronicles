extends CoreTest
## DebugStart: the `--debug-deep` developer state.


func test_the_flag_is_detected() -> void:
	assert_true(DebugStart.requested(PackedStringArray(["--debug-deep"])))
	assert_false(DebugStart.requested(PackedStringArray(["--other"])))
	assert_false(DebugStart.requested(PackedStringArray()))


func test_the_state_is_ready_for_the_well() -> void:
	var base := NewGame.create({"seed": 1, "farmName": "A", "playerName": "B", "lessons": true})
	var s := DebugStart.apply(base)
	assert_true(Mossdeep.is_open(s))
	eq(d(s["player"])["location"], "woods")
	eq(d(s["player"])["x"], Zones.WOODS_WELL_ARRIVAL.x)
	eq(s["level"], 5)
	eq(s["gold"], 5000)
	assert_true(Bag.count_of(a(s["bag"]), "copperSword") == 1)
	eq(d(s["tutorial"])["lesson"], "off", "lessons are skipped")


func test_the_well_works_straight_away_and_the_input_is_untouched() -> void:
	var base := NewGame.create({"seed": 1, "farmName": "A", "playerName": "B"})
	var s := DebugStart.apply(base)
	var down := st(Interact.interact(s))
	eq(d(down["player"])["location"], "mossdeep")
	eq(d(base["player"])["location"], "farm")


func test_the_debug_state_is_a_valid_save() -> void:
	var base := NewGame.create({"seed": 1, "farmName": "A", "playerName": "B"})
	eq(SaveSchema.validate_state(DebugStart.apply(base)), "")
