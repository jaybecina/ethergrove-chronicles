extends CoreTest
## Crop rules, ported from packages/core/test/crops.test.ts. `applyCommand` steps call the rule directly.

const TILLED: Dictionary = {"kind": "tilled", "watered": false}


func _at(s: Dictionary) -> Variant:
	return TestStates.tile_of(s, 11, 10)


func _crop_of(s: Dictionary) -> Dictionary:
	var t: Dictionary = _at(s)
	var crop: Dictionary = t["crop"]
	return crop


## Player on (10,10) facing the target tile (11,10), quick slot 5 selected.
func _field(target: Dictionary = TILLED, seed_crop: String = "turnip", qty: int = 5) -> Dictionary:
	var s := TestStates.stand_at(TestStates.blank_farm(TestStates.fresh()), 10, 10, "e")
	s = TestStates.with_tile(s, 11, 10, target)
	s = TestStates.with_bag(s, [{"id": "seed:" + seed_crop, "qty": qty}])
	return Bag.select_hotbar(s, 5)


## Waters then grows overnight `nights` times.
func _grow_watered(s: Dictionary, nights: int) -> Dictionary:
	var out := s.duplicate(true)
	var maps: Dictionary = out["maps"]
	var g: Dictionary = maps["farm"]
	for i: int in nights:
		var t: Dictionary = Grid.tile_at(g, 11, 10)
		var wet := t.duplicate(true)
		wet["watered"] = true
		g = Crops.grow_crops(Grid.set_tile(g, 11, 10, wet))["grid"]
	maps["farm"] = g
	return out


func _plant(s: Dictionary) -> Dictionary:
	return Crops.use_item(s)


func _stage_after(s: Dictionary, nights: int) -> String:
	return Crops.crop_stage(_crop_of(_grow_watered(s, nights)))


func test_plants_seed_on_empty_tilled_soil_and_consumes_one() -> void:
	var r := _plant(_field())
	var state: Dictionary = st(r)
	eq(_crop_of(state), {"id": "turnip", "age": 0, "regrowing": false})
	eq(Bag.count_of(bag_of(state), "seed:turnip"), 4)
	assert_true((ev(r) as Array).has({"type": "cropPlanted", "x": 11, "y": 10, "crop": "turnip"}))


func test_rejects_out_of_season_seeds_without_consuming() -> void:
	var r := _plant(_field(TILLED, "tomato"))
	eq(ev(r), [{"type": "actionFailed", "reason": "wrongSeason"}])
	eq(Bag.count_of(bag_of(st(r)), "seed:tomato"), 5)


func test_rejects_grass_and_occupied_soil() -> void:
	eq(ev(_plant(_field({"kind": "grass"}))), [{"type": "actionFailed", "reason": "noTarget"}])
	var occupied := _plant(st(_plant(_field())))
	eq(ev(occupied), [{"type": "actionFailed", "reason": "noTarget"}])


func test_turnip_stages_at_ages_0_1_2_3_4() -> void:
	var s: Dictionary = st(_plant(_field()))
	var stages: Array = []
	for n: int in 5:
		stages.append(_stage_after(s, n))
	eq(stages, ["seed", "sprout", "young", "young", "mature"])


func test_does_not_grow_on_unwatered_night() -> void:
	var s: Dictionary = st(_plant(_field()))
	var maps: Dictionary = s["maps"]
	var grown: Dictionary = Crops.grow_crops(d(maps["farm"]))["grid"]
	var t: Dictionary = Grid.tile_at(grown, 11, 10)
	var crop: Dictionary = t["crop"]
	eq(crop["age"], 0)


func test_emits_crop_grew_only_when_stage_changes() -> void:
	var s := _grow_watered(st(_plant(_field())), 2)
	var t: Dictionary = _at(s)
	var wet := t.duplicate(true)
	wet["watered"] = true
	var g := TestStates.with_tile(s, 11, 10, wet)
	var maps: Dictionary = g["maps"]
	eq(ev(Crops.grow_crops(d(maps["farm"]))), [])


func test_emits_crop_grew_on_stage_change() -> void:
	var s: Dictionary = st(_plant(_field()))
	var t: Dictionary = _at(s)
	var wet := t.duplicate(true)
	wet["watered"] = true
	var maps: Dictionary = TestStates.with_tile(s, 11, 10, wet)["maps"]
	eq(ev(Crops.grow_crops(d(maps["farm"]))), [{"type": "cropGrew", "x": 11, "y": 10, "crop": "turnip"}])


func test_harvests_mature_turnip_with_sickle_and_leaves_tilled_soil() -> void:
	var s := Bag.select_hotbar(_grow_watered(st(_plant(_field())), 4), 2)
	var r := Tools.use_tool(s)
	var state: Dictionary = st(r)
	eq(_at(state), {"kind": "tilled", "watered": true})
	eq(Bag.count_of(bag_of(state), "turnip"), 1)
	eq(state["harvested"]["turnip"], 1)
	eq(state["player"]["energy"], 99)
	assert_true((ev(r) as Array).has({"type": "cropHarvested", "x": 11, "y": 10, "crop": "turnip"}))


func test_sickle_on_immature_crop_is_a_miss() -> void:
	var s := Bag.select_hotbar(st(_plant(_field())), 2)
	var r := Tools.use_tool(s)
	eq(_crop_of(st(r))["age"], 0)
	assert_true((ev(r) as Array).has({"type": "toolUsed", "tool": "sickle", "x": 11, "y": 10, "hit": false}))


func test_strawberry_regrows_after_four_watered_nights() -> void:
	var s := _grow_watered(st(_plant(_field(TILLED, "strawberry"))), 8)
	var h: Dictionary = st(Crops.harvest_at(s, 11, 10))
	eq(_crop_of(h), {"id": "strawberry", "age": 4, "regrowing": true})
	eq(Crops.crop_stage(_crop_of(h)), "young")
	eq(_stage_after(h, 4), "mature")
	eq(_stage_after(h, 3), "young")


func test_tomato_regrows_in_three_nights() -> void:
	var f := _field(TILLED, "tomato")
	var cal: Dictionary = f["calendar"]
	cal["season"] = "summer"
	var s := _grow_watered(st(_plant(f)), 9)
	var h: Dictionary = st(Crops.harvest_at(s, 11, 10))
	eq(_stage_after(h, 3), "mature")


func test_full_bag_blocks_harvest_and_keeps_crop() -> void:
	var s := _grow_watered(st(_plant(_field())), 4)
	var full := TestStates.with_bag(s, TestStates.full_bag())
	var r := Crops.harvest_at(full, 11, 10)
	eq(ev(r), [{"type": "actionFailed", "reason": "bagFull"}])
	eq(_crop_of(st(r))["age"], 4)


func test_harvest_on_immature_crop_fails_with_no_target() -> void:
	eq(ev(Crops.harvest_at(st(_plant(_field())), 11, 10)), [{"type": "actionFailed", "reason": "noTarget"}])


func test_eating_melon_at_90_energy_caps_at_100() -> void:
	var s := TestStates.with_bag(TestStates.fresh(), [{"id": "melon", "qty": 2}])
	var player: Dictionary = s["player"]
	player["energy"] = 90
	s = Bag.select_hotbar(s, 5)
	var r := Crops.use_item(s)
	var state: Dictionary = st(r)
	eq(state["player"]["energy"], 100)
	eq(Bag.count_of(bag_of(state), "melon"), 1)
	assert_true((ev(r) as Array).has({"type": "itemEaten", "item": "melon", "stamina": 10}))


func test_materials_cannot_be_used() -> void:
	var s := Bag.select_hotbar(TestStates.with_bag(TestStates.fresh(), [{"id": "wood", "qty": 2}]), 5)
	eq(ev(Crops.use_item(s)), [{"type": "actionFailed", "reason": "noTarget"}])


func test_emptied_quick_slot_fails_with_no_item_and_changes_nothing() -> void:
	var s0 := _field()
	var s := s0.duplicate(true)
	s["bag"] = Bag.remove_at(bag_of(s0), 0, 5)
	var r := Crops.use_item(s)
	eq(ev(r), [{"type": "actionFailed", "reason": "noItem"}])
	eq(st(r), s)


func test_kill_out_of_season_removes_turnip_in_summer_keeps_tile_tilled() -> void:
	var s: Dictionary = st(_plant(_field({"kind": "tilled", "watered": true})))
	var maps: Dictionary = s["maps"]
	var farm: Dictionary = maps["farm"]
	var r := Crops.kill_out_of_season(farm, "summer")
	eq(Grid.tile_at(d(r["grid"]), 11, 10), {"kind": "tilled", "watered": true})
	eq(ev(r), [{"type": "cropDied", "x": 11, "y": 10, "crop": "turnip"}])
	eq(ev(Crops.kill_out_of_season(farm, "spring")), [])


func test_is_mature_uses_crop_days() -> void:
	assert_false(Crops.is_mature({"id": "turnip", "age": 3, "regrowing": false}))
	assert_true(Crops.is_mature({"id": "turnip", "age": 4, "regrowing": false}))


func test_core_does_not_mutate_input() -> void:
	var s := _grow_watered(st(_plant(_field())), 4)
	var before := s.duplicate(true)
	var farm: Dictionary = (s["maps"] as Dictionary)["farm"]
	var farm_before := farm.duplicate(true)
	Crops.plant_at(_field(), 11, 10, "seed:turnip")
	Crops.harvest_at(s, 11, 10)
	Crops.grow_crops(farm)
	Crops.kill_out_of_season(farm, "summer")
	Crops.use_item(s)
	Crops.is_mature(_crop_of(s))
	Crops.crop_stage(_crop_of(s))
	eq(s, before)
	eq(farm, farm_before)
	var f := _field()
	var f_before := f.duplicate(true)
	Crops.use_item(f)
	eq(f, f_before)
