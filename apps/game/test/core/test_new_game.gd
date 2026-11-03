extends CoreTest
## New game creation, ported from packages/core/test/newGame.test.ts, plus a comparison with every
## new-game*.json parity fixture.

const OPTS: Dictionary = {"seed": 1, "farmName": "Elm", "playerName": "Ari"}


func _create(extra: Dictionary = {}) -> Dictionary:
	var opts := OPTS.duplicate()
	opts.merge(extra, true)
	return NewGame.create(opts)


func _field_cells() -> Array[Vector2i]:
	var cells: Array[Vector2i] = []
	for y: int in Layouts.FARM_LAYOUT.size():
		var row: String = Layouts.FARM_LAYOUT[y]
		for x: int in row.length():
			if row[x] == ".":
				cells.append(Vector2i(x, y))
	return cells


func test_starts_at_year_1_spring_1_with_500_gold_and_6_turnip_seeds() -> void:
	var s := _create()
	eq(s["calendar"], {"year": 1, "season": "spring", "day": 1, "minute": 360})
	eq(s["gold"], 500)
	eq(s["pendingGold"], 0)
	var bag := bag_of(s)
	eq(bag[0], {"id": "seed:turnip", "qty": 6})
	eq(bag.size(), 12)
	for i: int in range(1, bag.size()):
		eq(bag[i], null)
	eq(s["quickSlots"], [0, null, null])
	eq(d(s["weather"])["today"], "sunny")
	var player := d(s["player"])
	eq(player["location"], "farm")
	eq(player["energy"], 100)
	eq(player.has("stamina"), false)
	eq(player["floor"], 0)
	eq(s["canCharges"], 20)
	eq(s["activeSlot"], 0)
	eq(s["milestones"], [])
	eq(s["farmName"], "Elm")
	eq(s["playerName"], "Ari")
	eq(s["version"], 3)


func test_field_obstacles_are_seeded() -> void:
	eq(farm_of(_create()), farm_of(_create()))
	var same: bool = farm_of(_create({"seed": 2})) == farm_of(_create())
	eq(same, false)


func test_obstacle_share_in_field_cells_is_near_spec_for_seed_1() -> void:
	var farm := farm_of(_create())
	var cells := _field_cells()
	var shares: Dictionary = {"weed": 0, "rock": 0, "stump": 0}
	for c: Vector2i in cells:
		var t: Dictionary = Grid.tile_at(farm, c.x, c.y)
		var kind: String = t["kind"]
		if shares.has(kind):
			var n: int = shares[kind]
			shares[kind] = n + 1
	var total := float(cells.size())
	var n_weed: int = shares["weed"]
	var n_rock: int = shares["rock"]
	var n_stump: int = shares["stump"]
	var weed := float(n_weed) / total
	var rock := float(n_rock) / total
	var stump := float(n_stump) / total
	assert_between(weed, 0.25, 0.35)
	assert_between(rock, 0.07, 0.13)
	assert_between(stump, 0.03, 0.07)


func test_player_spawn_tile_is_not_blocked() -> void:
	var s := _create()
	var p := d(s["player"])
	var x: float = p["x"]
	var z: float = p["z"]
	eq(Grid.is_blocked(Grid.tile_at(farm_of(s), floori(x), floori(z))), false)


func test_starts_lessons_only_when_asked() -> void:
	eq(_create()["tutorial"], {"lesson": "off", "count": 0, "notesSeen": [], "gifted": false})
	var on := _create({"lessons": true})
	eq(on["tutorial"], {"lesson": "walkToField", "count": 0, "notesSeen": [], "gifted": false})
	eq(on["version"], 3)


func test_does_not_share_layout_data_between_games() -> void:
	var a := _create()
	var tiles := a["maps"]["farm"]["tiles"] as Array
	tiles[0] = {"kind": "water"}
	var again := farm_of(_create())["tiles"] as Array
	var polluted: bool = again[0] == {"kind": "water"}
	eq(polluted, false)


## The TypeScript game is version 2; a GDScript new game is that state migrated to version 3.
func test_new_game_is_v3_of_ts() -> void:
	var dir := DirAccess.open("res://test/fixtures")
	var names: Array[String] = []
	for f: String in dir.get_files():
		if f.begins_with("new-game") and f.ends_with(".json"):
			names.append(f)
	names.sort()
	eq(names.size(), 10)
	for f: String in names:
		var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string("res://test/fixtures/" + f))
		var fixture := d(parsed)
		var start: Dictionary = JsonNorm.ints(fixture["start"])
		var expected: Dictionary = JsonNorm.ints(d(fixture["expected"])["final"])
		eq(JsonNorm.first_diff(NewGame.create(start), SaveMigrate.state_2_to_3(expected)), "", f)


func test_new_game_has_the_version_3_keys() -> void:
	var s := _create()
	eq(s["hp"], 100)
	eq(s["xp"], 0)
	eq(s["level"], 1)
	eq(s["gear"], {
		"weapon": null, "offHand": null, "head": null, "body": null, "feet": null, "trinket1": null, "trinket2": null,
	})
	eq(s["buff"], null)
	eq(s["deeps"], {"mossdeep": {"open": false, "cleared": false, "checkpoints": []}})
	eq(s["lootSinceSleep"], [])
	eq(s["elites"], {"mossmaw": {"defeatedSeason": null}})
	eq(s["rootstones"], [])
	eq(s["kindlings"], 0)
	eq(s["talked"], [])
	eq(SaveSchema.validate_state(s), "")


func test_new_features_are_on_their_tiles() -> void:
	var s := _create()
	eq(Grid.tile_at(farm_of(s), 28, 2), {"kind": "feature", "feature": "rootShrine"})
	eq(Grid.tile_at(farm_of(s), 16, 23), {"kind": "feature", "feature": "farmGate"})
	eq(Grid.tile_at(d(d(s["maps"])["house"]), 1, 1), {"kind": "feature", "feature": "stove"})
	# None of them is a field cell, so the seeded obstacle roll is unchanged.
	eq(Layouts.FARM_LAYOUT[2][28], "R")
	eq(Layouts.FARM_LAYOUT[23][16], "G")
	eq(Layouts.HOUSE_LAYOUT[1][1], "K")
