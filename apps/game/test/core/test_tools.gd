extends CoreTest
## Tool rules, ported from packages/core/test/tools.test.ts. The dispatcher cases (tick, move, the
## hotbar commands) go through applyCommand and are covered by the parity fixtures.


## Player on (10,10) facing east; the target tile is (11,10).
func _setup(tool: String, target: Dictionary = {"kind": "grass"}, patch: Dictionary = {}) -> Dictionary:
	var s := TestStates.stand_at(TestStates.blank_farm(TestStates.fresh()), 10, 10, "e")
	s = Bag.select_hotbar(s, Balance.TOOL_ORDER.find(tool))
	s = TestStates.with_tile(s, 11, 10, target)
	for key: String in patch:
		s[key] = patch[key]
	return s


func _use(s: Dictionary) -> Dictionary:
	return Tools.use_tool(s)


func _target(s: Dictionary) -> Variant:
	return TestStates.tile_of(s, 11, 10)


func _energy(s: Dictionary) -> int:
	return (s["player"] as Dictionary)["energy"]


func _with_energy(s: Dictionary, value: int) -> Dictionary:
	var out := s.duplicate(true)
	var player: Dictionary = out["player"]
	player["energy"] = value
	return out


func test_hoe_tills_grass_and_costs_two_energy() -> void:
	var r := _use(_setup("hoe"))
	var state: Dictionary = st(r)
	eq(_target(state), {"kind": "tilled", "watered": false})
	eq(_energy(state), 98)
	assert_true((ev(r) as Array).has({"type": "toolUsed", "tool": "hoe", "x": 11, "y": 10, "hit": true}))
	assert_true((ev(r) as Array).has({"type": "tileTilled", "x": 11, "y": 10}))


func test_hoe_misses_on_rock_costing_energy() -> void:
	var r := _use(_setup("hoe", {"kind": "rock", "hits": 0}))
	eq(_target(st(r)), {"kind": "rock", "hits": 0})
	eq(_energy(st(r)), 98)
	assert_true((ev(r) as Array).has({"type": "toolUsed", "tool": "hoe", "x": 11, "y": 10, "hit": false}))


func test_can_waters_tilled_soil_and_uses_one_charge() -> void:
	var r := _use(_setup("can", {"kind": "tilled", "watered": false}))
	var state: Dictionary = st(r)
	eq(_target(state), {"kind": "tilled", "watered": true})
	eq(state["canCharges"], 19)
	eq(_energy(state), 98)
	assert_true((ev(r) as Array).has({"type": "cropWatered", "x": 11, "y": 10}))


func test_can_fails_with_can_empty_at_zero_charges() -> void:
	var r := _use(_setup("can", {"kind": "tilled", "watered": false}, {"canCharges": 0}))
	eq(ev(r), [{"type": "actionFailed", "reason": "canEmpty"}])
	eq(_energy(st(r)), 100)


func test_can_refills_at_pond_for_free() -> void:
	var s := TestStates.stand_at(_setup("can", {"kind": "grass"}, {"canCharges": 3}), 7, 19, "w")
	var r := _use(s)
	eq(st(r)["canCharges"], 20)
	eq(_energy(st(r)), 100)
	assert_true((ev(r) as Array).has({"type": "canRefilled"}))


func test_sickle_cuts_weed_into_grass_and_fiber() -> void:
	var r := _use(_setup("sickle", {"kind": "weed"}))
	var state: Dictionary = st(r)
	eq(_target(state), {"kind": "grass"})
	eq(Bag.count_of(bag_of(state), "fiber"), 1)
	eq(_energy(state), 99)
	assert_true((ev(r) as Array).has({"type": "tileCleared", "x": 11, "y": 10}))
	assert_true((ev(r) as Array).has({"type": "itemGained", "item": "fiber", "qty": 1}))


func test_axe_needs_three_hits_on_stump_and_gives_four_wood() -> void:
	var s := st(_use(_setup("axe", {"kind": "stump", "hits": 0})))
	eq(_target(s), {"kind": "stump", "hits": 1})
	s = st(_use(st(_use(s))))
	eq(_target(s), {"kind": "grass"})
	eq(Bag.count_of(bag_of(s), "wood"), 4)
	eq(_energy(s), 88)


func test_hammer_breaks_rock_in_two_hits_for_two_stone() -> void:
	var s := st(_use(st(_use(_setup("hammer", {"kind": "rock", "hits": 0})))))
	eq(_target(s), {"kind": "grass"})
	eq(Bag.count_of(bag_of(s), "stone"), 2)


func test_hammer_turns_empty_tilled_soil_to_grass() -> void:
	eq(_target(st(_use(_setup("hammer", {"kind": "tilled", "watered": true})))), {"kind": "grass"})


func test_full_bag_blocks_final_hit_and_keeps_weed() -> void:
	var s := TestStates.with_bag(_setup("sickle", {"kind": "weed"}), TestStates.full_bag())
	var r := _use(s)
	assert_true((ev(r) as Array).has({"type": "actionFailed", "reason": "bagFull"}))
	eq(_target(st(r)), {"kind": "weed"})


func test_reaching_zero_energy_emits_exhausted() -> void:
	var r := _use(_with_energy(_setup("axe", {"kind": "stump", "hits": 0}), 1))
	eq(_energy(st(r)), 0)
	assert_true((ev(r) as Array).has({"type": "exhausted"}))


func test_zero_energy_fails_with_no_stamina_and_changes_nothing() -> void:
	var tired := _with_energy(_setup("hoe"), 0)
	var r := _use(tired)
	eq(ev(r), [{"type": "actionFailed", "reason": "noStamina"}])
	eq(st(r), tired)


func test_crossing_twenty_emits_stamina_low_once() -> void:
	var first := _use(_with_energy(_setup("hoe"), 21))
	assert_true((ev(first) as Array).has({"type": "staminaLow"}))
	var second := _use(TestStates.with_tile(st(first), 11, 10, {"kind": "grass"}))
	assert_false((ev(second) as Array).has({"type": "staminaLow"}))


func test_use_tool_with_quick_slot_active_does_nothing() -> void:
	var s := Bag.select_hotbar(TestStates.fresh(), 5)
	eq(_use(s), {"state": s, "events": []})


func test_spend_energy_clamps_at_zero() -> void:
	var r := Tools.spend_energy(_with_energy(TestStates.fresh(), 25), 30)
	eq(_energy(st(r)), 0)
	eq(ev(r), [{"type": "staminaLow"}, {"type": "exhausted"}])


func test_core_does_not_mutate_input() -> void:
	for tool: String in Balance.TOOL_ORDER:
		var s := _setup(tool, {"kind": "weed"})
		var before := s.duplicate(true)
		_use(s)
		eq(s, before, tool)
	var ripe := _setup("sickle", {"kind": "tilled", "watered": true, "crop": {"id": "turnip", "age": 4, "regrowing": false}})
	var ripe_before := ripe.duplicate(true)
	_use(ripe)
	Tools.spend_energy(ripe, 5)
	eq(ripe, ripe_before)
