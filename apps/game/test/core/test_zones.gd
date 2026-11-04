extends CoreTest
## Zones: static Lowmere data and its cached grid.

const FEATURE_AT: Dictionary = {
	"toFarm": Vector2i(12, 0), "toWoods": Vector2i(23, 8), "forgeDoor": Vector2i(4, 4),
	"clinicDoor": Vector2i(12, 4), "cottageDoor": Vector2i(20, 4), "noticeBoard": Vector2i(10, 7),
}


func test_lowmere_layout_shape() -> void:
	eq(Zones.LOWMERE_LAYOUT.size(), 16)
	for row: String in Zones.LOWMERE_LAYOUT:
		eq(row.length(), 24, row)
	var g := Zones.grid("lowmere")
	eq(g["width"], 24)
	eq(g["height"], 16)
	for id: String in FEATURE_AT:
		var count := 0
		for t_v: Variant in a(g["tiles"]):
			if d(t_v).get("feature", "") == id:
				count += 1
		eq(count, 1, id)
		var at: Vector2i = FEATURE_AT[id]
		eq(d(Grid.tile_at(g, at.x, at.y)), {"kind": "feature", "feature": id}, id)
	eq(d(Grid.tile_at(g, 12, 1)), {"kind": "path"}, "spawn tile is plain path")


func test_unknown_zone_is_empty_and_spawn_constants() -> void:
	eq(Zones.grid("nowhere"), {})
	eq(Zones.LOWMERE_SPAWN, Vector2(12.5, 1.5))
	eq(Zones.FARM_GATE_ARRIVAL, Vector2(16.5, 22.5))


func test_grid_is_parsed_once() -> void:
	eq(Zones.grid("lowmere"), Zones.grid("lowmere"))


func test_current_grid_in_lowmere() -> void:
	var s := TestStates.fresh()
	d(s["player"])["location"] = "lowmere"
	eq(GameStateUtil.current_grid(s), Zones.grid("lowmere"))
	d(s["player"])["location"] = "farm"
	eq(GameStateUtil.current_grid(s), farm_of(s))


func test_with_grid_on_lowmere_is_a_noop() -> void:
	var s := TestStates.fresh()
	d(s["player"])["location"] = "lowmere"
	var before := s.duplicate(true)
	assert_eq(GameStateUtil.with_grid(s, {"width": 1, "height": 1, "tiles": [{"kind": "path"}]}), before)
	assert_push_error("static")


func test_lowmere_is_not_saved_state() -> void:
	var s := TestStates.fresh()
	eq(d(s["maps"]).keys(), ["farm", "house"])
	d(s["player"])["location"] = "lowmere"
	var file := SaveMigrate.make_save_file(s, 0, "x")
	var migrated := SaveMigrate.migrate(file)
	eq(migrated["ok"], true)
	eq(d(d(d(migrated["file"])["state"])["maps"]).keys(), ["farm", "house"])


func test_woods_is_a_big_static_forest_with_one_way_back() -> void:
	var g := Zones.grid("woods")
	eq(g["width"], Zones.WOODS_WIDTH)
	eq(g["height"], Zones.WOODS_HEIGHT)
	eq(Zones.WOODS_WIDTH, 120)
	eq(Zones.WOODS_HEIGHT, 90)
	eq(Grid.find_feature(g, "toLowmere"), Vector2i(0, 45))
	eq(a(g["tiles"]).size(), 120 * 90)


func test_woods_spawn_is_free_and_clear_of_obstacles() -> void:
	var g := Zones.grid("woods")
	for dx: int in range(1, 8):
		for dy: int in range(-3, 4):
			assert_false(Grid.is_blocked(Grid.tile_at(g, dx, 45 + dy)), "tile %d,%d" % [dx, 45 + dy])
	eq(Zones.WOODS_SPAWN, Vector2(1.5, 45.5))


func test_woods_has_obstacles_and_a_fenced_border() -> void:
	var g := Zones.grid("woods")
	var stumps := 0
	var rocks := 0
	for t: Variant in a(g["tiles"]):
		var kind: String = d(t)["kind"]
		if kind == "stump":
			stumps += 1
		elif kind == "rock":
			rocks += 1
	assert_true(stumps > 100, "stumps %d" % stumps)
	assert_true(rocks > 50, "rocks %d" % rocks)
	eq(d(Grid.tile_at(g, 60, 0))["kind"], "fence")
	eq(d(Grid.tile_at(g, 119, 89))["kind"], "fence")


func test_woods_is_deterministic_and_static() -> void:
	eq(Zones.grid("woods"), Zones.build_woods())
	assert_true(Zones.is_static("woods"))
	assert_true(Zones.is_static("lowmere"))
	assert_false(Zones.is_static("farm"))


func test_current_grid_and_with_grid_in_woods() -> void:
	var s := TestStates.fresh()
	d(s["player"])["location"] = "woods"
	eq(GameStateUtil.current_grid(s), Zones.grid("woods"))
	GameStateUtil.with_grid(s, {"width": 1, "height": 1, "tiles": [{"kind": "path"}]})
	assert_push_error("static")


func test_combat_zones() -> void:
	assert_true(Zones.is_combat("woods"))
	assert_true(Zones.is_combat("mossdeep"))
	assert_false(Zones.is_combat("lowmere"))
	assert_false(Zones.is_combat("farm"))


func test_clinic_room_has_an_exit_and_a_free_spawn() -> void:
	var g := Zones.grid("clinic")
	eq(g["width"], 10)
	eq(g["height"], 7)
	eq(Grid.find_feature(g, "clinicExit"), Vector2i(4, 6))
	assert_false(Grid.is_blocked(Grid.tile_at(g, floori(Zones.CLINIC_SPAWN.x), floori(Zones.CLINIC_SPAWN.y))))
	eq(Falling.CLINIC_SPAWN, {"x": Zones.CLINIC_SPAWN.x, "y": Zones.CLINIC_SPAWN.y})
	assert_true(Zones.is_static("clinic"))
	assert_true(Zones.is_interior("clinic"))
	assert_true(Zones.is_interior("house"))
	assert_false(Zones.is_interior("woods"))
