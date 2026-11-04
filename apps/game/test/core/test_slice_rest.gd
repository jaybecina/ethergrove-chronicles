extends CoreTest
## The rest of the M1 slice's rules: commands for gear, cooking and the forge; the doors that open them; Hilda's
## practice sword; the lantern and blade; Mossmaw and the Kindling's healing.


func _state() -> Dictionary:
	var s := NewGame.create({"seed": 1, "farmName": "A", "playerName": "B"})
	return s


func _give(s: Dictionary, items: Dictionary) -> Dictionary:
	for id: String in items.keys():
		var qty: int = items[id]
		var r := Bag.add_item(a(s["bag"]), id, qty)
		s["bag"] = r["bag"]
	return s


func _open(s: Dictionary) -> Dictionary:
	d(s["calendar"]).merge({"year": 1, "season": "spring", "day": 9}, true)
	(s["milestones"] as Array).append("firstShipment")
	return s


# --- commands ---------------------------------------------------------------------------------------------------

func test_equip_command() -> void:
	var s := _give(_state(), {"copperSword": 1})
	var r := ApplyCommand.apply(s, {"type": "equip", "itemId": "copperSword"})
	eq(d(st(r)["gear"])["weapon"], "copperSword")
	eq(ev(ApplyCommand.apply(s, {"type": "equip", "itemId": "fiber"})), [{"type": "actionFailed", "reason": "notGear"}])


func test_cook_and_eat_commands() -> void:
	var s := _give(_state(), {"turnip": 2})
	var cooked := st(ApplyCommand.apply(s, {"type": "cook", "dish": "turnipStew"}))
	eq(Bag.count_of(a(cooked["bag"]), "turnipStew"), 1)
	cooked["hp"] = 50
	var eaten := st(ApplyCommand.apply(cooked, {"type": "eatDish", "itemId": "turnipStew"}))
	eq(eaten["hp"], 90)
	eq(d(eaten["buff"])["id"], "steady")


func test_forge_commands() -> void:
	var s := _give(_state(), {"copperOre": 5})
	s["gold"] = 500
	var smelted := st(ApplyCommand.apply(s, {"type": "smelt"}))
	eq(Bag.count_of(a(smelted["bag"]), "copperBar"), 1)
	eq(smelted["gold"], 475)
	var s2 := _give(_state(), {"wood": 5})
	s2["gold"] = 60
	var crafted := st(ApplyCommand.apply(s2, {"type": "craft", "gearId": "woodBuckler"}))
	eq(Bag.count_of(a(crafted["bag"]), "woodBuckler"), 1)


func test_a_failed_forge_job_reports_the_reason() -> void:
	var r := ApplyCommand.apply(_state(), {"type": "craft", "gearId": "copperSword"})
	eq(ev(r), [{"type": "actionFailed", "reason": "missing"}])


func test_enter_mossdeep_command_uses_a_recorded_checkpoint() -> void:
	var s := _open(_state())
	d(d(s["deeps"])["mossdeep"])["checkpoints"] = [0, 4]
	var n := st(ApplyCommand.apply(s, {"type": "enterMossdeep", "floor": 4}))
	eq(d(n["player"])["floor"], 4)
	eq(ev(ApplyCommand.apply(s, {"type": "enterMossdeep", "floor": 8}))[0]["reason"], "noCheckpoint")


# --- doors ------------------------------------------------------------------------------------------------------

func _lowmere_at(s: Dictionary, x: int, y: int, facing: String) -> Dictionary:
	return TestStates.stand_at(_with_location(s, "lowmere"), x, y, facing)


func _with_location(s: Dictionary, loc: String) -> Dictionary:
	d(s["player"])["location"] = loc
	return s


func test_the_forge_door_opens_the_forge() -> void:
	var r := Interact.interact(_lowmere_at(_state(), 4, 5, "n"))
	eq(ev(r), [{"type": "openUi", "ui": "forge"}])


func test_the_clinic_door_enters_the_clinic() -> void:
	var r := Interact.interact(_lowmere_at(_state(), 12, 5, "n"))
	var p := d(st(r)["player"])
	eq(p["location"], "clinic")
	eq(p["x"], Zones.CLINIC_ENTRY.x)
	eq(d(ev(r)[0]), {"type": "locationChanged", "location": "clinic"})


func test_the_stove_opens_cooking() -> void:
	var s := TestStates.stand_at(_with_location(_state(), "house"), 1, 2, "n")
	eq(ev(Interact.interact(s)), [{"type": "openUi", "ui": "stove"}])


func test_the_well_asks_for_a_floor_only_when_you_have_checkpoints() -> void:
	var s := TestStates.stand_at(_with_location(_open(_state()), "woods"), 99, 45, "e")
	d(s["player"])["x"] = 99.5
	eq(d(st(Interact.interact(s))["player"])["location"], "mossdeep", "no checkpoint: straight down")
	d(d(s["deeps"])["mossdeep"])["checkpoints"] = [0, 4]
	eq(ev(Interact.interact(s)), [{"type": "openUi", "ui": "well"}])


# --- Hilda's practice sword ------------------------------------------------------------------------------------

func test_hilda_gives_a_practice_sword_once_after_the_well_opens() -> void:
	var s := _lowmere_at(_open(_state()), 4, 6, "n")
	var r := Interact.interact(s)
	var n := st(r)
	eq(Bag.count_of(a(n["bag"]), "practiceSword"), 1)
	var types: Array = []
	for e: Variant in ev(r):
		types.append(d(e)["type"])
	assert_true(types.has("itemGained"))
	var again := st(Interact.interact(n))
	eq(Bag.count_of(a(again["bag"]), "practiceSword"), 1, "only once")


func test_hilda_has_no_sword_before_the_well_opens() -> void:
	var s := _lowmere_at(_state(), 4, 6, "n")
	eq(Bag.count_of(a(st(Interact.interact(s))["bag"]), "practiceSword"), 0)


# --- the lantern and the blade ----------------------------------------------------------------------------------

func _beside(s: Dictionary, feature: String) -> Dictionary:
	var t := Grid.find_feature(Mossdeep.grid(8), feature)
	return TestStates.stand_at(_with_location_floor(s, 8), t.x, t.y + 1, "n")


func _with_location_floor(s: Dictionary, floor_n: int) -> Dictionary:
	d(s["player"]).merge({"location": "mossdeep", "floor": floor_n}, true)
	return s


func test_the_lantern_and_blade_lie_in_the_arena_room() -> void:
	for feature: String in ["lantern", "brokenBlade"]:
		var t := Grid.find_feature(Mossdeep.grid(8), feature)
		assert_true(t.x >= 0, feature)
		assert_true(Mossdeep.rooms(8)[2].has_point(t), feature)


func test_they_can_be_taken_only_after_the_matron_falls() -> void:
	var s := _beside(_open(_state()), "lantern")
	eq(ev(Interact.interact(s)), [{"type": "actionFailed", "reason": "noTarget"}])
	var after := st(Mossdeep.award_boss(s))
	var after_pos := _beside(after, "lantern")
	var r := Interact.interact(after_pos)
	eq(Bag.count_of(a(st(r)["bag"]), "groundsLantern"), 1)
	var blade := Interact.interact(_beside(st(r), "brokenBlade"))
	eq(Bag.count_of(a(st(blade)["bag"]), "brokenBlade"), 1)
	var again := Interact.interact(_beside(st(blade), "lantern"))
	eq(ev(again), [{"type": "actionFailed", "reason": "noTarget"}], "taken once")


# --- Mossmaw ----------------------------------------------------------------------------------------------------

func test_mossmaw_appears_only_after_mossdeep_is_cleared_and_once_a_season() -> void:
	var s := _open(_state())
	assert_false(Mossmaw.should_spawn(s))
	d(d(s["deeps"])["mossdeep"])["cleared"] = true
	assert_true(Mossmaw.should_spawn(s))
	var after := st(Mossmaw.award(s))
	assert_false(Mossmaw.should_spawn(after), "defeated this season")
	d(after["calendar"])["season"] = "summer"
	assert_true(Mossmaw.should_spawn(after), "respawns the next season")


func test_mossmaw_pays_xp_and_a_tusk_every_time() -> void:
	var s := _open(_state())
	var r := Mossmaw.award(s)
	var n := st(r)
	eq(Bag.count_of(a(n["bag"]), "mossmawTusk"), 1)
	eq(n["xp"], 70)
	eq(d(d(n["elites"])["mossmaw"])["defeatedSeason"], "spring-1")
	var types: Array = []
	for e: Variant in ev(r):
		types.append(d(e)["type"])
	assert_true(types.has("eliteDefeated"))


func test_mossmaw_with_a_full_bag_loses_nothing() -> void:
	var s := _open(_state())
	var bag: Array = []
	for i: int in Balance.BAG_SLOTS:
		bag.append({"id": "stone", "qty": Balance.STACK_MAX})
	s["bag"] = bag
	eq(ev(Mossmaw.award(s)), [{"type": "actionFailed", "reason": "bagFull"}])


# --- the Kindling ------------------------------------------------------------------------------------------------

func test_the_kindling_heals_5_hp_every_15_seconds_below_max() -> void:
	var r := Kindling.heal(50, 100, 0, 14950)
	eq(r, {"hp": 50, "acc_ms": 14950})
	r = Kindling.heal(50, 100, 14950, 100)
	eq(r["hp"], 55)
	eq(r["acc_ms"], 50)


func test_the_kindling_does_not_heal_past_max_or_while_full() -> void:
	eq(Kindling.heal(98, 100, 14990, 50)["hp"], 100)
	eq(Kindling.heal(100, 100, 5000, 50), {"hp": 100, "acc_ms": 0}, "full: the timer rests")


func test_kindling_only_follows_where_you_fight() -> void:
	assert_true(Kindling.follows(1, "woods"))
	assert_true(Kindling.follows(1, "mossdeep"))
	assert_false(Kindling.follows(1, "lowmere"))
	assert_false(Kindling.follows(0, "woods"))
