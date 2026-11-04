extends CoreTest
## Lesson marker target and hotbar slot, ported from packages/core/test/tutorialTarget.test.ts.


func _crop(age: int = 0, watered: bool = false) -> Dictionary:
	return {"kind": "tilled", "watered": watered, "crop": {"id": "turnip", "age": age, "regrowing": false}}


## Field with no grass (all path) so tests place exactly the tiles they need.
func _bare_field(s: Dictionary) -> Dictionary:
	var r: Dictionary = Layouts.FIELD_RECT
	var out := s.duplicate(true)
	var maps: Dictionary = out["maps"]
	var farm: Dictionary = maps["farm"]
	for y: int in range(r["y0"] as int, (r["y1"] as int) + 1):
		for x: int in range(r["x0"] as int, (r["x1"] as int) + 1):
			farm = Grid.set_tile(farm, x, y, {"kind": "path"})
	maps["farm"] = farm
	return out


func _at(x: int, y: int) -> Dictionary:
	return TestStates.stand_at(_bare_field(TestStates.blank_farm(TestStates.fresh())), x, y, "e")


func _in_house(s: Dictionary) -> Dictionary:
	var out := s.duplicate(true)
	d(out["player"])["location"] = "house"
	return out


func _target(s: Dictionary, lesson: String) -> Dictionary:
	return Tutorial.lesson_target(TestStates.lesson_at(s, lesson))


func _loc(location: String, p: Vector2i) -> Dictionary:
	return {"location": location, "x": p.x, "y": p.y}


func _farm(s: Dictionary) -> Dictionary:
	return d(d(s["maps"])["farm"])


func _house(s: Dictionary) -> Dictionary:
	return d(d(s["maps"])["house"])


func test_walk_to_field_and_till_point_at_the_nearest_field_grass() -> void:
	var s := TestStates.with_tile(TestStates.with_tile(_at(10, 10), 20, 10, {"kind": "grass"}), 12, 12, {"kind": "grass"})
	eq(_target(s, "walkToField"), {"location": "farm", "x": 12, "y": 12})
	eq(_target(s, "till"), {"location": "farm", "x": 12, "y": 12})


func test_breaks_distance_ties_by_lower_y_then_lower_x() -> void:
	var s := _at(10, 10)
	for p: Vector2i in [Vector2i(11, 10), Vector2i(9, 10), Vector2i(10, 11)]:
		s = TestStates.with_tile(s, p.x, p.y, {"kind": "grass"})
	eq(_target(s, "till"), {"location": "farm", "x": 9, "y": 10})


func test_plant_points_at_empty_tilled_soil_else_at_grass() -> void:
	var s := TestStates.with_tile(TestStates.with_tile(_at(10, 10), 14, 10, {"kind": "tilled"}), 11, 10, {"kind": "grass"})
	eq(_target(s, "plant"), {"location": "farm", "x": 14, "y": 10})
	var no_soil := TestStates.with_tile(_at(10, 10), 11, 10, {"kind": "grass"})
	eq(_target(no_soil, "plant"), {"location": "farm", "x": 11, "y": 10})


func test_water_lessons_point_at_the_nearest_dry_crop_or_nothing() -> void:
	var s := TestStates.with_tile(TestStates.with_tile(_at(10, 10), 11, 10, _crop(0, true)), 13, 10, _crop())
	eq(_target(s, "water"), {"location": "farm", "x": 13, "y": 10})
	eq(_target(s, "waterDaily"), {"location": "farm", "x": 13, "y": 10})
	var wet := TestStates.with_tile(_at(10, 10), 11, 10, _crop(0, true))
	eq(_target(wet, "water"), {})


func test_harvest_points_at_a_ripe_crop_or_nothing_before_one_is_ripe() -> void:
	var young := TestStates.with_tile(_at(10, 10), 11, 10, _crop(1))
	eq(_target(young, "harvest"), {})
	var days: int = d(CropData.CROPS["turnip"])["days"]
	var ripe := TestStates.with_tile(young, 15, 10, _crop(days))
	eq(_target(ripe, "harvest"), {"location": "farm", "x": 15, "y": 10})


func test_ship_buy_seeds_sleep_and_sell_overnight_point_at_the_bin_cart_and_bed() -> void:
	var s := _at(10, 10)
	eq(_target(s, "ship"), _loc("farm", Grid.find_feature(_farm(s), "bin")))
	eq(_target(s, "buySeeds"), _loc("farm", Grid.find_feature(_farm(s), "cart")))
	var house := _in_house(s)
	var bed := _loc("house", Grid.find_feature(_house(s), "bed"))
	eq(_target(house, "sleep"), bed)
	eq(_target(house, "sellOvernight"), bed)


func test_points_at_the_door_when_the_target_is_on_the_other_map() -> void:
	var s := _at(10, 10)
	eq(_target(s, "sleep"), _loc("farm", Grid.find_feature(_farm(s), "houseDoor")))
	var house := _in_house(s)
	eq(_target(house, "ship"), _loc("house", Grid.find_feature(_house(s), "exitDoor")))


func test_is_empty_when_lessons_are_off_or_complete() -> void:
	var s := _at(10, 10)
	eq(Tutorial.lesson_target(s), {})
	eq(_target(s, "complete"), {})


func test_does_not_mutate_its_argument() -> void:
	var s := TestStates.lesson_at(_at(10, 10), "till")
	var before := s.duplicate(true)
	Tutorial.lesson_target(s)
	Tutorial.lesson_slot(s)
	eq(s, before)


func test_lesson_slot_picks_the_tool_for_till_water_and_harvest() -> void:
	eq(Tutorial.lesson_slot(TestStates.lesson_at(TestStates.fresh(), "till")), 0)
	eq(Tutorial.lesson_slot(TestStates.lesson_at(TestStates.fresh(), "water")), 1)
	eq(Tutorial.lesson_slot(TestStates.lesson_at(TestStates.fresh(), "waterDaily")), 1)
	eq(Tutorial.lesson_slot(TestStates.lesson_at(TestStates.fresh(), "harvest")), 2)
	eq(Tutorial.lesson_slot(TestStates.lesson_at(TestStates.fresh(), "ship")), -1)


func test_lesson_slot_picks_the_pinned_seed_quick_slot_for_plant() -> void:
	var s := TestStates.lesson_at(TestStates.fresh(), "plant")
	eq(Tutorial.lesson_slot(s), 5)
	var pinned := s.duplicate(true)
	pinned["quickSlots"] = [null, null, 0]
	eq(Tutorial.lesson_slot(pinned), 7)
	var none := s.duplicate(true)
	none["quickSlots"] = [null, null, null]
	eq(Tutorial.lesson_slot(none), -1)


func test_lesson_target_in_lowmere_points_at_to_farm() -> void:
	var s := TestStates.stand_at(TestStates.lesson_at(TestStates.fresh(), "till"), 5, 10, "n")
	d(s["player"])["location"] = "lowmere"
	eq(Tutorial.lesson_target(s), {"location": "lowmere", "x": 12, "y": 0})
	eq(Tutorial.lesson_slot(s), 0)
	s = TestStates.lesson_at(s, "sleep")
	eq(Tutorial.lesson_target(s), {"location": "lowmere", "x": 12, "y": 0})


func test_obstacles_note_in_lowmere_does_not_error() -> void:
	var prev := TestStates.lesson_at(TestStates.fresh(), "till")
	var next := TestStates.stand_at(prev, 12, 1, "n")
	d(next["player"])["location"] = "lowmere"
	var events: Array = [{"type": "actionFailed", "reason": "noTarget"}, {"type": "toolUsed", "hit": false}]
	var r := Tutorial.advance(prev, next, events)
	eq(ev(r).has({"type": "noteShown", "id": "obstacles"}), false, "no obstacle tile in Lowmere")
	eq(d(st(r)["player"])["location"], "lowmere")


func test_lesson_target_is_empty_in_the_woods_and_the_clinic() -> void:
	for zone: String in ["woods", "clinic", "mossdeep"]:
		var s := TestStates.fresh()
		d(s["tutorial"])["lesson"] = "till"
		d(s["player"])["location"] = zone
		eq(Tutorial.lesson_target(s), {}, zone)
