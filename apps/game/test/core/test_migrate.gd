extends CoreTest
## Save migration, ported from packages/core/test/save.test.ts (the migrate and makeSaveFile cases), plus the
## real v1 fixture, loaded-from-JSON number handling and malformed input.

const NOW := "2026-10-23T10:00:00.000Z"
const FIXTURE := "res://test/fixtures/save.json"


## A state after 50 seeded random commands.
func _played(seed_value: int) -> Dictionary:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value
	var state := TestStates.fresh(seed_value)
	for i: int in 50:
		var cmd: Dictionary
		match rng.randi_range(0, 7):
			0:
				cmd = {"type": "useTool"}
			1:
				cmd = {"type": "interact"}
			2:
				cmd = {"type": "tick", "minutes": rng.randi_range(1, 120)}
			3:
				cmd = {"type": "selectHotbar", "index": rng.randi_range(0, 7)}
			4:
				cmd = {"type": "cycleHotbar", "dir": 1}
			5:
				cmd = {"type": "buyItem", "itemId": "seed:turnip", "qty": 1}
			6:
				cmd = {"type": "moveBagItem", "from": rng.randi_range(0, 11), "to": rng.randi_range(0, 11)}
			_:
				cmd = {"type": "sleep"}
		state = st(ApplyCommand.apply(state, cmd))
	return state


## What a save goes through on disk: stringified, then parsed (every number comes back a float).
func _round_trip(file: Variant, migrations: Dictionary = SaveMigrate.MIGRATIONS) -> Dictionary:
	var parsed: Variant = JSON.parse_string(JSON.stringify(file))
	return SaveMigrate.migrate(parsed, migrations)


func _fixtures() -> Dictionary:
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(FIXTURE))
	return d(parsed)


func test_make_save_file_fills_the_summary() -> void:
	var state := TestStates.fresh()
	var file := SaveMigrate.make_save_file(state, 1234, NOW)
	eq(file["version"], SaveMigrate.CURRENT_SAVE_VERSION)
	eq(file["savedAt"], NOW)
	eq(file["playTimeMs"], 1234)
	eq(d(file["summary"]), {
		"farmName": "Elm", "playerName": "Ari", "gold": 500, "calendar": state["calendar"],
	})
	eq(file["state"], state)


func test_make_save_file_does_not_alias_the_state() -> void:
	var state := TestStates.fresh()
	var file := SaveMigrate.make_save_file(state, 0, NOW)
	d(file["state"])["gold"] = 1
	eq(state["gold"], 500)


func test_round_trips_through_json_after_50_random_commands() -> void:
	for seed_value: int in [1, 2, 3, 4, 5]:
		var file := SaveMigrate.make_save_file(_played(seed_value), 99, NOW)
		var result := _round_trip(file)
		eq(result["ok"], true, "seed %d migrates" % seed_value)
		if result["ok"] == true:
			eq(JsonNorm.first_diff(result["file"], file), "", "seed %d equal" % seed_value)


func test_rejects_a_missing_field_negative_gold_and_a_short_bag() -> void:
	var file := SaveMigrate.make_save_file(TestStates.fresh(), 0, NOW)
	var no_gold := file.duplicate(true)
	d(no_gold["state"]).erase("gold")
	eq(_round_trip(no_gold), {"ok": false, "error": "invalid"})
	var broke := file.duplicate(true)
	d(broke["state"])["gold"] = -5
	eq(_round_trip(broke), {"ok": false, "error": "invalid"})
	var short := file.duplicate(true)
	a(d(short["state"])["bag"]).remove_at(0)
	eq(_round_trip(short), {"ok": false, "error": "invalid"})


func test_rejects_junk_input() -> void:
	for junk: Variant in [null, 42, "save", [], {}, {"version": "one"}]:
		eq(SaveMigrate.migrate(junk), {"ok": false, "error": "invalid"}, str(junk))


func test_malformed_rejected() -> void:
	var file := SaveMigrate.make_save_file(TestStates.fresh(), 0, NOW)
	var bag11 := file.duplicate(true)
	a(d(bag11["state"])["bag"]).pop_back()
	for bad: Variant in ["x", {}, {"version": "2"}, bag11, {"version": 2.5}]:
		eq(SaveMigrate.migrate(bad), {"ok": false, "error": "invalid"}, str(bad).left(40))


func test_rejects_versions_from_the_future() -> void:
	var file := SaveMigrate.make_save_file(TestStates.fresh(), 0, NOW)
	file["version"] = 999
	eq(_round_trip(file), {"ok": false, "error": "unsupportedVersion"})


func test_version_above_current_rejected() -> void:
	var file := SaveMigrate.make_save_file(TestStates.fresh(), 0, NOW)
	file["version"] = SaveMigrate.CURRENT_SAVE_VERSION + 1
	eq(SaveMigrate.migrate(file), {"ok": false, "error": "unsupportedVersion"})


func test_runs_injected_migrations_step_by_step() -> void:
	var current := SaveMigrate.make_save_file(TestStates.fresh(), 0, NOW)
	var prev := SaveMigrate.CURRENT_SAVE_VERSION - 1
	var older := current.duplicate(true)
	older["version"] = prev
	var old_state := d(older["state"])
	old_state.erase("tutorial")
	old_state["version"] = prev
	var tutorial: Variant = d(current["state"])["tutorial"]
	var step := func(f: Variant) -> Variant:
		var old := d(f).duplicate(true)
		old["version"] = SaveMigrate.CURRENT_SAVE_VERSION
		var s := d(old["state"])
		s["version"] = SaveMigrate.CURRENT_SAVE_VERSION
		s["tutorial"] = tutorial
		return old
	var migrations := {prev: step}
	var r := SaveMigrate.migrate(older, migrations)
	eq(r["ok"], true)
	eq(JsonNorm.first_diff(r.get("file"), current), "")
	eq(SaveMigrate.migrate(older, {}), {"ok": false, "error": "unsupportedVersion"})


func test_migration_that_does_not_advance_is_invalid() -> void:
	var file := SaveMigrate.make_save_file(TestStates.fresh(), 0, NOW)
	file["version"] = 1
	var stuck := func(f: Variant) -> Variant:
		return f
	eq(SaveMigrate.migrate(file, {1: stuck}), {"ok": false, "error": "invalid"})


func test_migrates_a_real_part_1_save_to_v2_with_lessons_off() -> void:
	var v1 := d(_fixtures()["v1"])
	var before := v1.duplicate(true)
	var step: Callable = SaveMigrate.MIGRATIONS[1]
	var file := d(step.call(v1))
	eq(v1, before, "the input is not mutated")
	eq(file["version"], 2)
	var state := d(file["state"])
	eq(state["version"], 2)
	eq(state["tutorial"], {"lesson": "off", "count": 0, "notesSeen": Lessons.NOTE_IDS.duplicate(), "gifted": false})
	var rest := state.duplicate(true)
	rest.erase("tutorial")
	rest.erase("version")
	var rest_v1 := d(v1["state"]).duplicate(true)
	rest_v1.erase("version")
	eq(JsonNorm.first_diff(rest, rest_v1), "")


## The 1 -> 2 step reproduces TypeScript's recorded version 2 file exactly.
func test_v1_fixture_steps_to_the_recorded_v2() -> void:
	var fixtures := _fixtures()
	var step: Callable = SaveMigrate.MIGRATIONS[1]
	eq(JsonNorm.first_diff(JsonNorm.ints(step.call(fixtures["v1"])), JsonNorm.ints(fixtures["v2"])), "")


func test_v1_to_v3() -> void:
	var fixtures := _fixtures()
	var r := SaveMigrate.migrate(fixtures["v1"])
	eq(r["ok"], true)
	var file := d(r.get("file", {}))
	eq(file["version"], 3)
	eq(d(file["state"])["version"], 3)
	eq(SaveSchema.validate_file(file), "")
	var via_v2 := SaveMigrate.migrate(fixtures["v2"])
	eq(JsonNorm.first_diff(file, via_v2.get("file")), "", "v1 and v2 reach the same version 3 file")


func test_v2_to_v3_keys() -> void:
	var v2 := d(JsonNorm.ints(_fixtures()["v2"]))
	var before := v2.duplicate(true)
	var r := SaveMigrate.migrate(v2)
	eq(v2, before, "the input is not mutated")
	eq(r["ok"], true)
	var file := d(r.get("file", {}))
	eq(file["version"], 3)
	eq(file["summary"], v2["summary"])
	var old_state := d(v2["state"])
	var state := d(file["state"])
	eq(state["version"], 3)
	var player := d(state["player"])
	eq(player.has("stamina"), false)
	eq(player["energy"], d(old_state["player"])["stamina"])
	eq(player["floor"], 0)
	eq(state["hp"], 100)
	eq(state["xp"], 0)
	eq(state["level"], 1)
	eq(state["gear"], {
		"weapon": null, "offHand": null, "head": null, "body": null, "feet": null, "trinket1": null, "trinket2": null,
	})
	eq(state["buff"], null)
	eq(state["deeps"], {"mossdeep": {"open": false, "cleared": false, "checkpoints": []}})
	eq(state["lootSinceSleep"], [])
	eq(state["elites"], {"mossmaw": {"defeatedSeason": null}})
	eq(state["rootstones"], [])
	eq(state["kindlings"], 0)
	eq(state["talked"], [])
	# Everything else is untouched.
	var rest := state.duplicate(true)
	var rest_old := old_state.duplicate(true)
	for k: String in SaveMigrate.V3_KEYS:
		rest.erase(k)
	rest.erase("version")
	rest_old.erase("version")
	rest.erase("player")
	rest_old.erase("player")
	rest.erase("maps")
	rest_old.erase("maps")
	eq(JsonNorm.first_diff(rest, rest_old), "")


func _v2_state_at(day: int, season: String, shipped: bool) -> Dictionary:
	var s := d(JsonNorm.ints(d(_fixtures()["v2"])["state"]))
	d(s["calendar"])["day"] = day
	d(s["calendar"])["season"] = season
	s["milestones"] = ["firstTill", "firstShipment"] if shipped else ["firstTill"]
	return s


func _mossdeep_open(state: Dictionary) -> Variant:
	return d(d(state["deeps"])["mossdeep"])["open"]


func test_mossdeep_open_rule() -> void:
	eq(_mossdeep_open(SaveMigrate.state_2_to_3(_v2_state_at(7, "spring", true))), false, "spring 7 Y1 shipped")
	eq(_mossdeep_open(SaveMigrate.state_2_to_3(_v2_state_at(8, "spring", true))), true, "spring 8 Y1 shipped")
	eq(_mossdeep_open(SaveMigrate.state_2_to_3(_v2_state_at(20, "spring", false))), false, "spring 20 not shipped")
	eq(_mossdeep_open(SaveMigrate.state_2_to_3(_v2_state_at(1, "summer", true))), true, "summer 1 Y1 shipped")
	var y2 := _v2_state_at(1, "spring", true)
	d(y2["calendar"])["year"] = 2
	eq(_mossdeep_open(SaveMigrate.state_2_to_3(y2)), true, "spring 1 Y2 shipped")


func test_feature_tiles_placed() -> void:
	var s := SaveMigrate.state_2_to_3(d(JsonNorm.ints(d(_fixtures()["v2"])["state"])))
	var maps := d(s["maps"])
	eq(Grid.tile_at(d(maps["farm"]), 28, 2), {"kind": "feature", "feature": "rootShrine"})
	eq(Grid.tile_at(d(maps["farm"]), 16, 23), {"kind": "feature", "feature": "farmGate"})
	eq(Grid.tile_at(d(maps["house"]), 1, 1), {"kind": "feature", "feature": "stove"})
	# Off the field ("." cells), the migrated maps equal a version 3 new game's tiles.
	var fresh := TestStates.fresh()
	for name: String in ["farm", "house"]:
		var got := d(maps[name])
		var want := d(d(fresh["maps"])[name])
		var rows: Array[String] = Layouts.FARM_LAYOUT if name == "farm" else Layouts.HOUSE_LAYOUT
		for y: int in rows.size():
			var row: String = rows[y]
			for x: int in row.length():
				if row[x] != ".":
					eq(Grid.tile_at(got, x, y), Grid.tile_at(want, x, y), "%s %d,%d" % [name, x, y])


func test_unexpected_tile_kind_keeps_save() -> void:
	var v2 := d(JsonNorm.ints(_fixtures()["v2"]))
	var farm := d(d(d(v2["state"])["maps"])["farm"])
	var tilled := {"kind": "tilled", "watered": false}
	a(farm["tiles"])[2 * 32 + 28] = tilled
	var r := SaveMigrate.migrate(v2)
	assert_push_error("rootShrine")
	eq(r["ok"], true)
	var state := d(d(r.get("file", {})).get("state", {}))
	eq(Grid.tile_at(farm_of(state), 28, 2), tilled, "the unexpected tile is kept")
	eq(Grid.tile_at(farm_of(state), 16, 23), {"kind": "feature", "feature": "farmGate"})


func test_state_2_to_3_leaves_a_version_3_state_alone() -> void:
	var v3 := TestStates.fresh()
	var again := SaveMigrate.state_2_to_3(v3)
	eq(again, v3)
	d(again["player"])["x"] = 99.5
	var copied: bool = d(v3["player"])["x"] != 99.5
	eq(copied, true, "returns a copy")
	var upgraded := SaveMigrate.state_2_to_3(d(JsonNorm.ints(d(_fixtures()["v2"])["state"])))
	eq(SaveMigrate.state_2_to_3(upgraded), upgraded)


func test_migration_table_has_the_2_to_3_step() -> void:
	eq(SaveMigrate.CURRENT_SAVE_VERSION, 3)
	eq(SaveMigrate.MIGRATIONS.has(2), true)
	var step: Callable = SaveMigrate.MIGRATIONS[2]
	eq(step.get_method(), "migrate_2_to_3")


## Zod strips unknown keys in TypeScript; this validator only ignores them, so the migrated file keeps them.
func test_unknown_keys_are_ignored_and_kept() -> void:
	var file := SaveMigrate.make_save_file(TestStates.fresh(), 0, NOW)
	file["extra"] = "top"
	d(file["state"])["future"] = {"a": 1}
	eq(SaveSchema.validate_file(file), "")
	var r := _round_trip(file)
	eq(r["ok"], true)
	var out := d(r.get("file", {}))
	eq(out.get("extra"), "top")
	eq(d(out["state"]).get("future"), {"a": 1})


## zod 4's `.int()` accepts only safe integers (|v| <= 2^53 - 1).
func test_versions_beyond_safe_integers_are_invalid() -> void:
	for v: Variant in [9007199254740992.0, -9007199254740992.0, 1.0e300, 9007199254740992]:
		var file := SaveMigrate.make_save_file(TestStates.fresh(), 0, NOW)
		file["version"] = v
		eq(SaveMigrate.migrate(file), {"ok": false, "error": "invalid"}, str(v))


func test_fractional_positions_stay_floats_and_whole_numbers_become_ints() -> void:
	var state := TestStates.stand_at(TestStates.fresh(), 10, 4, "n")
	d(state["player"])["x"] = 10.5
	d(state["player"])["z"] = 4.0
	var r := _round_trip(SaveMigrate.make_save_file(state, 0, NOW))
	eq(r["ok"], true)
	var player := d(d(d(r.get("file", {})).get("state", {})).get("player", {}))
	eq(typeof(player.get("x")), TYPE_FLOAT)
	eq(player.get("x"), 10.5)
	eq(typeof(player.get("z")), TYPE_INT)
	eq(player.get("z"), 4)


func test_loaded_numbers_index_tiles() -> void:
	var parsed: Variant = JSON.parse_string(JSON.stringify(_fixtures()["v2"]))
	var r := SaveMigrate.migrate(parsed)
	eq(r["ok"], true)
	var file := d(r.get("file", {}))
	var state := d(file["state"])
	var farm := farm_of(state)
	eq(typeof(farm["width"]), TYPE_INT)
	eq(typeof(state["gold"]), TYPE_INT)
	eq(typeof(Grid.tile_at(farm, 3, 6)), TYPE_DICTIONARY)
	var result := Interact.interact(state)
	eq(typeof(result["state"]), TYPE_DICTIONARY)
	eq(typeof(result["events"]), TYPE_ARRAY)
