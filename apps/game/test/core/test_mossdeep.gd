extends CoreTest
## Mossdeep (M1 spec 6.1, 6.3, 6.4): 8 floors under the old well, stairs, checkpoint stones, copper nodes, first-time
## floor XP and the enemies on each floor.


func _state() -> Dictionary:
	var s := NewGame.create({"seed": 1, "farmName": "A", "playerName": "B"})
	return s


func _open_state() -> Dictionary:
	var s := _state()
	d(s["calendar"]).merge({"year": 1, "season": "spring", "day": 9}, true)
	(s["milestones"] as Array).append("firstShipment")
	return s


func _at(s: Dictionary, location: String, floor_n: int, x: float, z: float, facing: String) -> Dictionary:
	d(s["player"]).merge({"location": location, "floor": floor_n, "x": x, "z": z, "facing": facing}, true)
	return s


func _facing_feature(s: Dictionary, floor_n: int, feature: String) -> Dictionary:
	# Stands the player one tile east of the feature's tile (west for a stairsDown), facing it.
	var g := Mossdeep.grid(floor_n)
	var t := Grid.find_feature(g, feature)
	var east := feature != "stairsDown"
	var px := t.x + 1.5 if east else t.x - 0.5
	return _at(s, "mossdeep", floor_n, px, t.y + 0.5, "w" if east else "e")


# --- opening rule --------------------------------------------------------------------------------------------

func test_the_well_opens_on_day_8_and_after_the_first_shipment() -> void:
	var s := _state()
	assert_false(Mossdeep.is_open(s), "day 1, nothing shipped")
	d(s["calendar"])["day"] = 9
	assert_false(Mossdeep.is_open(s), "day 9 but nothing shipped")
	(s["milestones"] as Array).append("firstShipment")
	assert_true(Mossdeep.is_open(s))
	d(s["calendar"])["day"] = 7
	assert_false(Mossdeep.is_open(s), "shipped early but day 7: whichever comes later")
	d(s["calendar"])["day"] = 8
	assert_true(Mossdeep.is_open(s))
	d(s["calendar"]).merge({"season": "summer", "day": 1}, true)
	assert_true(Mossdeep.is_open(s), "later seasons are open")


func test_a_blocked_well_says_so() -> void:
	var s := _at(_state(), "woods", 0, 99.5, 45.5, "e")
	var r := Interact.interact(s)
	eq(ev(r), [{"type": "actionFailed", "reason": "wellBlocked"}])
	eq(st(r), s)


func test_the_woods_have_a_well_with_clear_ground_around_it() -> void:
	var g := Zones.grid("woods")
	var well := Grid.find_feature(g, "well")
	eq(well, Vector2i(100, 45))
	assert_false(Grid.is_blocked(Grid.tile_at(g, 99, 45)))
	eq(Zones.WOODS_WELL_ARRIVAL, Vector2(99.5, 45.5))


# --- floors ---------------------------------------------------------------------------------------------------

func test_every_floor_has_a_grid_with_an_up_stair_and_a_free_arrival() -> void:
	for f: int in range(0, 9):
		var g := Mossdeep.grid(f)
		var width: int = g["width"]
		assert_true(width > 10, "floor %d" % f)
		var up := Grid.find_feature(g, "stairsUp")
		assert_true(up.x >= 0, "floor %d stairsUp" % f)
		var a_up := Mossdeep.arrival(f, "up")
		assert_false(Grid.is_blocked(Grid.tile_at(g, floori(a_up.x), floori(a_up.y))), "floor %d arrival" % f)


func test_floors_1_to_7_have_stairs_down_and_8_does_not() -> void:
	for f: int in range(0, 8):
		var down := Grid.find_feature(Mossdeep.grid(f), "stairsDown")
		assert_true(down.x >= 0, "floor %d" % f)
		var a_down := Mossdeep.arrival(f, "down")
		assert_false(Grid.is_blocked(Grid.tile_at(Mossdeep.grid(f), floori(a_down.x), floori(a_down.y))))
	var tiles: Array = a(Mossdeep.grid(8)["tiles"])
	for t: Variant in tiles:
		var feature: String = d(t).get("feature", "")
		assert_true(feature != "stairsDown")


func test_checkpoint_stones_are_on_floors_0_4_and_8_only() -> void:
	for f: int in range(0, 9):
		var has := false
		for t: Variant in a(Mossdeep.grid(f)["tiles"]):
			if d(t).get("feature", "") == "checkpointStone":
				has = true
		eq(has, [0, 4, 8].has(f), "floor %d" % f)


func test_rooms_are_three_or_four_and_linked() -> void:
	for f: int in range(1, 9):
		var n := Mossdeep.rooms(f).size()
		assert_true(n == 3 or n == 4, "floor %d has %d rooms" % [f, n])


func test_every_floor_is_walkable_from_arrival_to_the_far_stair() -> void:
	for f: int in range(0, 8):
		var g := Mossdeep.grid(f)
		var start := Mossdeep.arrival(f, "up")
		var goal := Mossdeep.arrival(f, "down")
		assert_true(_reachable(g, Vector2i(floori(start.x), floori(start.y)), Vector2i(floori(goal.x), floori(goal.y))), "floor %d" % f)


func _reachable(g: Dictionary, from: Vector2i, to: Vector2i) -> bool:
	var seen := {from: true}
	var queue: Array[Vector2i] = [from]
	while not queue.is_empty():
		var cur: Vector2i = queue.pop_back()
		if cur == to:
			return true
		for delta: Vector2i in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
			var n := cur + delta
			if seen.has(n) or Grid.is_blocked(Grid.tile_at(g, n.x, n.y)):
				continue
			seen[n] = true
			queue.append(n)
	return false


func test_floors_are_deterministic() -> void:
	eq(Mossdeep.grid(3), Mossdeep.build_floor(3))
	assert_true(Mossdeep.grid(3) != Mossdeep.grid(4))


# --- travel ---------------------------------------------------------------------------------------------------

func test_the_open_well_leads_down_to_the_entrance() -> void:
	var s := _at(_open_state(), "woods", 0, 99.5, 45.5, "e")
	var r := Interact.interact(s)
	var p := d(st(r)["player"])
	eq(p["location"], "mossdeep")
	eq(p["floor"], 0)
	eq(d(ev(r)[0]), {"type": "locationChanged", "location": "mossdeep"})


func test_stairs_down_go_one_floor_and_pay_first_time_xp_once() -> void:
	var s := _facing_feature(_open_state(), 0, "stairsDown")
	var r := Interact.interact(s)
	var n := st(r)
	eq(d(n["player"])["floor"], 1)
	eq(n["xp"], 50)
	eq(d(d(n["deeps"])["mossdeep"])["deepest"], 1)
	var again := _facing_feature(n, 1, "stairsUp")
	var back := st(Interact.interact(again))
	eq(d(back["player"])["floor"], 0)
	var down2 := st(Interact.interact(_facing_feature(back, 0, "stairsDown")))
	eq(down2["xp"], 50, "no second payment for floor 1")


func test_first_time_xp_can_level_up() -> void:
	var s := _facing_feature(_open_state(), 0, "stairsDown")
	s["xp"] = 80
	var n := st(Interact.interact(s))
	eq(n["level"], 2)
	eq(n["xp"], 30)


func test_the_entrance_ladder_returns_to_the_woods_by_the_well() -> void:
	var s := _facing_feature(_open_state(), 0, "stairsUp")
	var n := st(Interact.interact(s))
	var p := d(n["player"])
	eq(p["location"], "woods")
	eq(p["x"], Zones.WOODS_WELL_ARRIVAL.x)
	eq(p["floor"], 0)


func test_going_up_arrives_beside_the_stairs_down() -> void:
	var s := _facing_feature(_open_state(), 2, "stairsUp")
	var n := st(Interact.interact(s))
	eq(d(n["player"])["floor"], 1)
	var arrive := Mossdeep.arrival(1, "down")
	eq(d(n["player"])["x"], arrive.x)


# --- checkpoints ----------------------------------------------------------------------------------------------

func test_touching_a_checkpoint_records_the_floor_once() -> void:
	var s := _facing_feature(_open_state(), 4, "checkpointStone")
	var r := Interact.interact(s)
	eq(d(d(st(r)["deeps"])["mossdeep"])["checkpoints"], [4])
	eq(d(ev(r)[0])["type"], "checkpointRecorded")
	var again := st(Interact.interact(_facing_feature(st(r), 4, "checkpointStone")))
	eq(d(d(again["deeps"])["mossdeep"])["checkpoints"], [4])


func test_the_well_can_start_at_a_recorded_checkpoint() -> void:
	var s := _at(_open_state(), "woods", 0, 99.5, 45.5, "e")
	d(d(s["deeps"])["mossdeep"])["checkpoints"] = [0, 4]
	var n := st(Mossdeep.enter(s, 4))
	eq(d(n["player"])["floor"], 4)
	var no := Mossdeep.enter(s, 8)
	eq(ev(no), [{"type": "actionFailed", "reason": "noCheckpoint"}])


# --- copper ---------------------------------------------------------------------------------------------------

func _node(s: Dictionary, floor_n: int) -> Dictionary:
	return _facing_feature(s, floor_n, "copperNode")


func test_every_floor_from_1_has_copper_nodes() -> void:
	for f: int in range(1, 9):
		var n := Grid.find_feature(Mossdeep.grid(f), "copperNode")
		assert_true(n.x >= 0, "floor %d" % f)
	var none := 0
	for t: Variant in a(Mossdeep.grid(0)["tiles"]):
		if d(t).get("feature", "") == "copperNode":
			none += 1
	eq(none, 0)


func test_two_swings_mine_a_node_for_4_energy_each() -> void:
	var s := _node(_open_state(), 2)
	var energy: int = d(s["player"])["energy"]
	var r1 := Interact.interact(s)
	eq(d(st(r1)["player"])["energy"], energy - 4)
	eq(Bag.count_of(a(st(r1)["bag"]), "copperOre"), 0, "first swing only cracks it")
	var r2 := Interact.interact(st(r1))
	var n := st(r2)
	eq(d(n["player"])["energy"], energy - 8)
	assert_true(Bag.count_of(a(n["bag"]), "copperOre") >= 1)
	eq(a(n["lootSinceSleep"]).size(), 1, "ore counts as loot")
	eq(d(a(n["lootSinceSleep"])[0])["id"], "copperOre")


func test_a_mined_node_is_gone_from_the_grid() -> void:
	var s := _node(_open_state(), 2)
	var t := Grid.find_feature(Mossdeep.grid(2), "copperNode")
	var n := st(Interact.interact(st(Interact.interact(s))))
	var g := GameStateUtil.current_grid(n)
	assert_false(Grid.is_blocked(Grid.tile_at(g, t.x, t.y)))
	assert_true(Grid.is_blocked(Grid.tile_at(GameStateUtil.current_grid(s), t.x, t.y)), "untouched node still blocks")


func test_mining_needs_energy() -> void:
	var s := _node(_open_state(), 2)
	d(s["player"])["energy"] = 3
	var r := Interact.interact(s)
	eq(ev(r), [{"type": "actionFailed", "reason": "tooTired"}])


# --- enemies per floor ----------------------------------------------------------------------------------------

func test_level_follows_the_floor() -> void:
	eq(Mossdeep.level_for_floor(1), 1)
	eq(Mossdeep.level_for_floor(7), 8)
	assert_true(Mossdeep.level_for_floor(4) > Mossdeep.level_for_floor(2))


func test_floors_1_to_3_hold_burrowers_and_wisps_only() -> void:
	for f: int in [1, 2, 3]:
		var spawns := Mossdeep.spawns(f)
		assert_true(spawns.size() >= 4, "floor %d" % f)
		for e: Variant in spawns:
			assert_true(["burrower", "wisp"].has(d(e)["id"]), "floor %d" % f)


func test_floors_4_to_7_add_brutes() -> void:
	for f: int in [4, 5, 6, 7]:
		var ids: Array = []
		for e: Variant in Mossdeep.spawns(f):
			ids.append(d(e)["id"])
		assert_true(ids.has("brute"), "floor %d" % f)


func test_entrance_and_boss_floor_have_no_regular_spawns() -> void:
	eq(Mossdeep.spawns(0), [])
	eq(Mossdeep.spawns(8), [])


func test_spawns_stand_on_free_tiles_in_rooms_after_the_first() -> void:
	for f: int in range(1, 8):
		var g := Mossdeep.grid(f)
		var first_room: Rect2i = Mossdeep.rooms(f)[0]
		for e: Variant in Mossdeep.spawns(f):
			var x: float = d(e)["x"]
			var y: float = d(e)["y"]
			assert_false(Grid.is_blocked(Grid.tile_at(g, floori(x), floori(y))), "floor %d %f,%f" % [f, x, y])
			assert_false(first_room.has_point(Vector2i(floori(x), floori(y))), "not in the safe entry room")


func test_enemy_levels_are_in_their_range() -> void:
	for f: int in range(1, 8):
		for e: Variant in Mossdeep.spawns(f):
			var spec := d(e)
			var id: String = spec["id"]
			var lvl: int = spec["level"]
			eq(lvl, Enemies.clamp_level(id, lvl), "%s on floor %d" % [id, f])


# --- the boss reward and the shrine -------------------------------------------------------------------------

func test_the_boss_pays_1000_xp_and_drops_the_verdant_rootstone() -> void:
	var s := _open_state()
	var r := Mossdeep.award_boss(s)
	var n := st(r)
	eq(Bag.count_of(a(n["bag"]), "verdantRootstone"), 1)
	assert_true(Mossdeep.boss_defeated(n))
	eq(n["level"], 4, "1000 xp from level 1: 100 + 283 + 520 = 903, with 97 left")
	eq(n["xp"], 97)
	eq(n["hp"], Progression.max_hp(4), "a level-up heals")
	var types: Array = []
	for e: Variant in ev(r):
		types.append(d(e)["type"])
	assert_true(types.has("bossDefeated"))
	assert_false(Mossdeep.boss_defeated(s), "input untouched")


func test_the_boss_pays_only_once() -> void:
	var s := _open_state()
	var once := st(Mossdeep.award_boss(s))
	var again := Mossdeep.award_boss(once)
	eq(ev(again), [])
	eq(Bag.count_of(a(st(again)["bag"]), "verdantRootstone"), 1)
	eq(st(again)["xp"], once["xp"])


func test_a_full_bag_does_not_lose_the_rootstone() -> void:
	var s := _open_state()
	var bag: Array = []
	for i: int in Balance.BAG_SLOTS:
		bag.append({"id": "stone", "qty": Balance.STACK_MAX})
	s["bag"] = bag
	var r := Mossdeep.award_boss(s)
	eq(ev(r), [{"type": "actionFailed", "reason": "bagFull"}])
	assert_false(Mossdeep.boss_defeated(st(r)), "she can be fought again; nothing is lost")


func _shrine_state() -> Dictionary:
	var s := _open_state()
	s["bag"] = st(Mossdeep.award_boss(s))["bag"]
	return TestStates.stand_at(s, 28, 3, "n")


func test_the_rootstone_wakes_the_first_kindling_at_the_shrine() -> void:
	var s := _shrine_state()
	d(s["player"])["location"] = "farm"
	var r := Interact.interact(s)
	var n := st(r)
	eq(Bag.count_of(a(n["bag"]), "verdantRootstone"), 0)
	eq(n["rootstones"], ["verdant"])
	eq(n["kindlings"], 1)
	var cleared: bool = d(d(n["deeps"])["mossdeep"])["cleared"]
	assert_true(cleared)
	eq(d(ev(r)[0])["type"], "kindlingWoke")


func test_the_shrine_without_the_stone_does_nothing() -> void:
	var s := TestStates.stand_at(_open_state(), 28, 3, "n")
	eq(ev(Interact.interact(s)), [{"type": "actionFailed", "reason": "noTarget"}])


func test_the_kindling_wakes_only_once() -> void:
	var n := st(Interact.interact(_shrine_state()))
	eq(n["kindlings"], 1)
	var spare := n.duplicate(true)
	var r := Bag.add_item(a(spare["bag"]), "verdantRootstone", 1)
	spare["bag"] = r["bag"]
	eq(ev(Mossdeep.place_rootstone(spare)), [{"type": "actionFailed", "reason": "noTarget"}], "already placed")
