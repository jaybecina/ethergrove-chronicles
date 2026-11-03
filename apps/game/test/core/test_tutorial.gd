extends CoreTest
## Grandpa's lessons rules, ported from packages/core/test/tutorial.test.ts. Commands go through
## ApplyCommand.apply, as in TypeScript. `move` is not a core command in this port, so the walkToField cases
## move the player by hand and call Tutorial.advance.

const NOTE_CASES: Array[String] = [
	"canEmpty", "staminaLow", "exhausted", "passedOut", "rain", "obstacles", "wrongSeason", "newSeason", "bagFull", "cartClosed"
]


func _cmd(s: Dictionary, cmd: Dictionary) -> Dictionary:
	return ApplyCommand.apply(s, cmd)


func _use_tool(s: Dictionary) -> Dictionary:
	return _cmd(s, {"type": "useTool"})


func _use_item(s: Dictionary) -> Dictionary:
	return _cmd(s, {"type": "useItem"})


func _select(s: Dictionary, index: int) -> Dictionary:
	return _cmd(s, {"type": "selectHotbar", "index": index})


func _interact(s: Dictionary) -> Dictionary:
	return _cmd(s, {"type": "interact"})


func _sleep(s: Dictionary) -> Dictionary:
	return _cmd(s, {"type": "sleep"})


func _buy(s: Dictionary, item_id: String, qty: int) -> Dictionary:
	return _cmd(s, {"type": "buyItem", "itemId": item_id, "qty": qty})


func _tick(s: Dictionary, minutes: int) -> Dictionary:
	return _cmd(s, {"type": "tick", "minutes": minutes})


## Runs `result` after `acc` and joins the events.
func _then(acc: Dictionary, result: Dictionary) -> Dictionary:
	var events := a(acc["events"]).duplicate(true)
	events.append_array(ev(result))
	return {"state": st(result), "events": events}


func _types(r: Dictionary) -> Array:
	var out: Array = []
	for e_v: Variant in ev(r):
		out.append(d(e_v)["type"])
	return out


func _done(r: Dictionary) -> Array:
	var out: Array = []
	for e_v: Variant in ev(r):
		var e := d(e_v)
		if e["type"] == "lessonDone":
			out.append(e["id"])
	return out


func _notes(r: Dictionary) -> Array:
	var out: Array = []
	for e_v: Variant in ev(r):
		var e := d(e_v)
		if e["type"] == "noteShown":
			out.append(e["id"])
	return out


func _crop(id: String = "turnip", age: int = 0) -> Dictionary:
	return {"kind": "tilled", "crop": {"id": id, "age": age, "regrowing": false}}


## Farm with plain grass, the player standing on (x, y).
func _farm(x: int = 10, y: int = 10, facing: String = "e") -> Dictionary:
	return TestStates.stand_at(TestStates.blank_farm(TestStates.fresh()), x, y, facing)


func _at_minute(s: Dictionary, minute: int) -> Dictionary:
	var out := s.duplicate(true)
	d(out["calendar"])["minute"] = minute
	return out


func _in_house(s: Dictionary) -> Dictionary:
	var out := s.duplicate(true)
	d(out["player"])["location"] = "house"
	return out


func _lesson(s: Dictionary) -> String:
	var lesson: String = d(st_tutorial(s))["lesson"]
	return lesson


func st_tutorial(s: Dictionary) -> Dictionary:
	return d(s["tutorial"])


func _with_weather(s: Dictionary, today: String, tomorrow: String) -> Dictionary:
	var out := s.duplicate(true)
	out["weather"] = {"today": today, "tomorrow": tomorrow}
	return out


# --- lesson progression ---


func test_walk_to_field_completes_on_entering_the_field_and_starts_till() -> void:
	var s := TestStates.lesson_at(_farm(10, 17, "n"), "walkToField")
	var moved := s.duplicate(true)
	d(moved["player"])["z"] = 16.5
	var r := Tutorial.advance(s, moved, [])
	eq(_done(r), ["walkToField"])
	eq(_lesson(st(r)), "till")
	eq(st_tutorial(st(r))["count"], 0)
	assert_true(ev(r).has({"type": "lessonStarted", "id": "till"}))


func test_walk_to_field_does_not_complete_outside_the_field() -> void:
	var s := TestStates.lesson_at(_farm(10, 17, "n"), "walkToField")
	var r := Tutorial.advance(s, s, [])
	eq(_done(r), [])
	eq(_lesson(st(r)), "walkToField")


func test_till_counts_tile_tilled_events_and_completes_at_3() -> void:
	var s := TestStates.lesson_at(_farm(10, 10, "e"), "till")
	var r := _use_tool(TestStates.stand_at(s, 10, 10, "e"))
	eq(_lesson(st(r)), "till")
	eq(st_tutorial(st(r))["count"], 1)
	s = st(r)
	r = _use_tool(TestStates.stand_at(s, 11, 10, "e"))
	s = st(r)
	eq(st_tutorial(s)["count"], 2)
	r = _use_tool(TestStates.stand_at(s, 12, 10, "e"))
	eq(_done(r), ["till"])
	eq(_lesson(st(r)), "plant")
	eq(st_tutorial(st(r))["count"], 0)


func test_plant_completes_at_3_or_after_1_when_no_seeds_are_left() -> void:
	var base := TestStates.with_tile(TestStates.lesson_at(_farm(10, 10, "e"), "plant"), 11, 10, {"kind": "tilled"})
	var one := TestStates.with_bag(base, [{"id": "seed:turnip", "qty": 1}])
	var r := _use_item(st(_select(one, 5)))
	eq(_done(r), ["plant"])
	eq(_lesson(st(r)), "water")

	var many := _use_item(st(_select(base, 5)))
	eq(_lesson(st(many)), "plant")
	eq(st_tutorial(st(many))["count"], 1)


func test_water_completes_when_every_farm_crop_is_watered() -> void:
	var s := TestStates.lesson_at(_farm(10, 10, "e"), "water")
	s = TestStates.with_tile(TestStates.with_tile(s, 11, 10, _crop()), 12, 10, _crop())
	var first := _use_tool(st(_select(s, 1)))
	eq(_lesson(st(first)), "water")
	var second := _use_tool(TestStates.stand_at(st(first), 11, 10, "e"))
	eq(_done(second), ["water"])
	eq(_lesson(st(second)), "sleep")


func test_sleep_completes_on_day_started_by_bed_or_by_passing_out() -> void:
	var s := TestStates.lesson_at(TestStates.with_tile(_farm(), 11, 10, _crop()), "sleep")
	var bed := _sleep(_in_house(s))
	assert_true(_done(bed).has("sleep"))
	eq(_lesson(st(bed)), "waterDaily")
	var late := _tick(_at_minute(s, 1559), 2)
	assert_true(_done(late).has("sleep"))


func test_water_daily_completes_at_once_on_a_rainy_morning() -> void:
	var s := TestStates.lesson_at(_in_house(TestStates.with_tile(_farm(), 11, 10, _crop())), "sleep")
	s = _with_weather(s, "sunny", "rain")
	var r := _sleep(s)
	eq(_done(r), ["sleep", "waterDaily"])
	eq(_lesson(st(r)), "harvest")


func test_harvest_completes_by_hand_or_by_sickle() -> void:
	var days: int = d(CropData.CROPS["turnip"])["days"]
	var ripe := TestStates.with_tile(TestStates.lesson_at(_farm(10, 10, "e"), "harvest"), 11, 10, _crop("turnip", days))
	var hand := _interact(ripe)
	assert_true(_done(hand).has("harvest"))
	var sickle := _use_tool(st(_select(ripe, 2)))
	assert_true(_done(sickle).has("harvest"))


func test_ship_completes_when_the_bin_gains_items() -> void:
	var s := TestStates.with_bag(TestStates.lesson_at(_farm(), "ship"), [{"id": "turnip", "qty": 2}])
	var r := _cmd(s, {"type": "shipItem", "bagIndex": 0, "qty": 1})
	eq(_done(r), ["ship"])
	eq(_lesson(st(r)), "sellOvernight")


func test_sell_overnight_completes_on_a_shipping_report_with_money() -> void:
	var s := _in_house(TestStates.lesson_at(_farm(), "sellOvernight"))
	var empty := _sleep(s)
	eq(_lesson(st(empty)), "sellOvernight")
	var stocked := s.duplicate(true)
	stocked["bin"] = [{"id": "turnip", "qty": 1}]
	var r := _sleep(stocked)
	assert_true(_done(r).has("sellOvernight"))
	eq(_lesson(st(r)), "buySeeds")


func test_buy_seeds_completes_the_path_and_gives_100_gold_once() -> void:
	var sold := _farm(30, 17, "e")
	sold["milestones"] = ["firstShipment"]
	var s := _at_minute(TestStates.lesson_at(sold, "buySeeds"), 600)
	var r := _buy(s, "seed:turnip", 1)
	eq(_lesson(st(r)), "complete")
	var cost: int = d(CropData.CROPS["turnip"])["seedCost"]
	eq(st(r)["gold"], (s["gold"] as int) - cost + 100)
	assert_true(ev(r).has({"type": "lessonsComplete", "gift": 100}))
	var gold_changed := false
	for e_v: Variant in ev(r):
		var e := d(e_v)
		if e["type"] == "goldChanged" and e["delta"] == 100:
			gold_changed = true
	assert_true(gold_changed)
	var again := _buy(st(r), "seed:turnip", 1)
	assert_false(_types(again).has("lessonsComplete"))


func test_restart_lessons_passes_through_lessons_the_farm_already_satisfies() -> void:
	var s := _farm(10, 10, "e")
	s["tutorial"] = {"lesson": "off", "count": 0, "notesSeen": [], "gifted": false}
	for x: int in [11, 12, 13]:
		var tile := _crop()
		tile["watered"] = true
		s = TestStates.with_tile(s, x, 10, tile)
	var r := _cmd(s, {"type": "restartLessons"})
	eq(_done(r), ["walkToField", "till", "plant", "water"])
	eq(_lesson(st(r)), "sleep")
	eq(st_tutorial(st(r))["count"], 0)


func test_skip_lessons_turns_lessons_off_and_keeps_notes_seen() -> void:
	var s := TestStates.lesson_at(_farm(), "plant", 2)
	st_tutorial(s)["notesSeen"] = ["rain"]
	var r := _cmd(s, {"type": "skipLessons"})
	eq(st(r)["tutorial"], {"lesson": "off", "count": 0, "notesSeen": ["rain"], "gifted": false})
	eq(ev(r), [])


func test_skip_lessons_when_already_off_changes_nothing() -> void:
	var s := TestStates.fresh()
	var r := Tutorial.skip_lessons(s)
	eq(st(r), s)
	eq(ev(r), [])


func test_emits_no_lesson_events_while_lessons_are_off() -> void:
	var s := _in_house(TestStates.fresh())
	var lesson_events := 0
	for night: int in 7:
		var r := _sleep(s)
		for t: Variant in _types(r):
			if (t as String).begins_with("lesson"):
				lesson_events += 1
		s = _in_house(st(r))
	eq(lesson_events, 0)


func test_advance_does_not_mutate_its_arguments() -> void:
	var s := TestStates.lesson_at(_farm(10, 17, "n"), "walkToField")
	var moved := s.duplicate(true)
	d(moved["player"])["z"] = 16.5
	var events: Array = [{"type": "noop"}]
	var prev_copy := s.duplicate(true)
	var next_copy := moved.duplicate(true)
	Tutorial.advance(s, moved, events)
	eq(s, prev_copy)
	eq(moved, next_copy)
	eq(events, [{"type": "noop"}])


# --- adaptive rules ---


func _no_crops() -> Dictionary:
	return _farm()


func test_all_crops_gone_with_seeds_in_bag_goes_back_to_plant() -> void:
	var s := TestStates.lesson_at(_no_crops(), "waterDaily")
	var r := _tick(s, 1)
	eq(_lesson(st(r)), "plant")
	assert_true(ev(r).has({"type": "lessonStarted", "id": "plant"}))


func test_all_crops_gone_and_no_seeds_goes_to_buy_seeds() -> void:
	var s := TestStates.with_bag(TestStates.lesson_at(_no_crops(), "harvest"), [])
	eq(_lesson(st(_tick(s, 1))), "buySeeds")


func test_out_of_season_seeds_only_goes_to_buy_seeds() -> void:
	var s := TestStates.with_bag(TestStates.lesson_at(_no_crops(), "water"), [{"id": "seed:tomato", "qty": 3}])
	eq(_lesson(st(_tick(s, 1))), "buySeeds")


func test_nothing_left_to_learn_with_completes_with_gift() -> void:
	var s := TestStates.with_bag(TestStates.lesson_at(_no_crops(), "buySeeds"), [])
	s["gold"] = 10
	var r := _tick(s, 1)
	eq(_lesson(st(r)), "complete")
	eq(st(r)["gold"], 110)
	assert_true(ev(r).has({"type": "lessonsComplete", "gift": 100}))


func test_winter_with_no_seeds_and_no_crops_completes_with_gift() -> void:
	var s := TestStates.with_bag(TestStates.lesson_at(_no_crops(), "buySeeds"), [])
	d(s["calendar"])["season"] = "winter"
	eq(_lesson(st(_tick(s, 1))), "complete")


func test_buy_seeds_waits_while_the_player_can_still_afford_seeds() -> void:
	var s := TestStates.with_bag(TestStates.lesson_at(_no_crops(), "buySeeds"), [])
	eq(_lesson(st(_tick(s, 1))), "buySeeds")


func test_crops_dying_while_others_remain_does_not_move_the_lesson() -> void:
	var s := TestStates.with_tile(TestStates.lesson_at(_farm(), "waterDaily"), 11, 10, _crop())
	eq(_lesson(st(_tick(s, 1))), "waterDaily")


# --- notes ---
## A state and command that trigger each note once (lesson 'harvest', which nothing here completes).


func _trigger_state(id: String) -> Dictionary:
	var s := TestStates.lesson_at(_farm(), "harvest")
	match id:
		"canEmpty":
			s["activeSlot"] = 1
			s["canCharges"] = 0
		"staminaLow":
			d(s["player"])["energy"] = Balance.STAMINA_LOW_AT + 1
		"exhausted":
			d(s["player"])["energy"] = 1
		"passedOut":
			s = _at_minute(s, Balance.PASS_OUT_MINUTE - 1)
		"rain":
			s = _with_weather(_in_house(s), "sunny", "rain")
		"obstacles":
			s = TestStates.with_tile(TestStates.lesson_at(_farm(10, 10, "e"), "harvest"), 11, 10, {"kind": "weed"})
		"wrongSeason":
			s = _at_minute(s, 600)
		"newSeason":
			s = _in_house(s)
			d(s["calendar"])["day"] = Balance.SEASON_DAYS
		"bagFull":
			s = _at_minute(TestStates.with_bag(s, TestStates.full_bag()), 600)
		"cartClosed":
			s = _at_minute(s, 400)
	return s


func _trigger_run(id: String, s: Dictionary) -> Dictionary:
	match id:
		"canEmpty", "staminaLow", "exhausted", "obstacles":
			return _use_tool(s)
		"passedOut":
			return _tick(s, 2)
		"rain", "newSeason":
			return _sleep(s)
		"wrongSeason":
			return _buy(s, "seed:tomato", 1)
		_:
			return _buy(s, "seed:turnip", 1)


func test_every_note_shows_once() -> void:
	for id: String in NOTE_CASES:
		var r1 := _trigger_run(id, _trigger_state(id))
		eq(_notes(r1), [id], "note %s shows" % id)
		assert_true(st_tutorial(st(r1))["notesSeen"] is Array and (st_tutorial(st(r1))["notesSeen"] as Array).has(id), "%s recorded" % id)
		var again := _trigger_state(id)
		again["tutorial"] = st_tutorial(st(r1)).duplicate(true)
		eq(_notes(_trigger_run(id, again)), [], "note %s does not repeat" % id)


func test_shows_at_most_one_note_per_command_first_in_note_ids_order() -> void:
	# Passing out the night before rain: passedOut and rain fire in the same command.
	var base := _at_minute(TestStates.lesson_at(_farm(), "harvest"), Balance.PASS_OUT_MINUTE - 1)
	var s := _with_weather(base, "sunny", "rain")
	var r := _tick(s, 2)
	var types := _types(r)
	assert_true(types.has("passedOut") and types.has("dayStarted"))
	eq(d(st(r)["weather"])["today"], "rain")
	eq(_notes(r), ["passedOut"])


func test_shows_no_notes_when_lessons_are_off_but_still_after_completion() -> void:
	var off := _trigger_state("canEmpty")
	var as_off := off.duplicate(true)
	st_tutorial(as_off)["lesson"] = "off"
	eq(_notes(_use_tool(as_off)), [])
	var complete := off.duplicate(true)
	st_tutorial(complete)["lesson"] = "complete"
	eq(_notes(_use_tool(complete)), ["canEmpty"])


# --- review fixes ---


func test_gives_the_gift_once_per_save_however_often_lessons_restart() -> void:
	# Winter, no seeds, no crops, standing in the field with bare soil: a restart completes at once.
	var s := TestStates.with_bag(_farm(10, 10, "e"), [])
	for x: int in [11, 12, 13]:
		s = TestStates.with_tile(s, x, 10, {"kind": "tilled"})
	d(s["calendar"])["season"] = "winter"
	var gold: int = s["gold"]
	for i: int in 5:
		s = st(_cmd(s, {"type": "restartLessons"}))
	eq(_lesson(s), "complete")
	eq(s["gold"], gold + 100)
	var again := _cmd(s, {"type": "restartLessons"})
	assert_true(ev(again).has({"type": "lessonsComplete", "gift": 0}))
	assert_false(_types(again).has("goldChanged"))


func test_after_crops_die_mid_path_buying_seeds_goes_back_to_planting_until_the_first_sale() -> void:
	var s := _at_minute(TestStates.lesson_at(_farm(30, 17, "e"), "buySeeds"), 600)
	var r := _buy(s, "seed:turnip", 1)
	eq(_done(r), ["buySeeds"])
	eq(_lesson(st(r)), "plant")
	assert_false(_types(r).has("lessonsComplete"))


func test_start_lesson_appends_to_the_events_it_is_given() -> void:
	var events: Array = []
	var s := Tutorial.start_lesson(_farm(), "till", events)
	eq(_lesson(s), "till")
	eq(events, [{"type": "lessonStarted", "id": "till"}])
