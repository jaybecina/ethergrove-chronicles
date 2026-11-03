extends GutTest
## JsonNorm and ParityReplay, the machinery that replays the TypeScript parity fixtures.


func _state(x: float, events_note: String) -> Dictionary:
	return {"player": {"x": x, "note": events_note}, "gold": 500}


## A hand-made fixture: a literal start state and patch steps only, so it tests the harness apart from
## the core rules. Step 1 expects a canRefilled event, but a patch step emits none.
func _mismatch_fixture() -> Dictionary:
	return {
		"name": "hand-made",
		"format": 1,
		"start": {"state": _state(10.5, "a")},
		"steps": [
			{"patch": {"player": {"x": 11.5}}},
			{"patch": {"gold": 400}},
		],
		"expected": {
			"events": [[], [{"type": "canRefilled"}]],
			"snapshots": {},
			"final": {"player": {"x": 11.5, "note": "a"}, "gold": 400},
		},
	}


func test_floats_normalises_nested_ints() -> void:
	var got: Dictionary = JsonNorm.floats({"a": [1, {"b": 2}]})
	assert_eq(got, {"a": [1.0, {"b": 2.0}]})
	assert_ne(got, {"a": [1, {"b": 2}]}, "Godot's == tells nested 1 and 1.0 apart")
	assert_eq(typeof(JsonNorm.floats(3)), TYPE_FLOAT)


func test_ints_keeps_fractions() -> void:
	var d: Dictionary = JsonNorm.ints({"x": 2.0, "y": 2.5, "z": [4.0]})
	assert_eq(d, {"x": 2, "y": 2.5, "z": [4]})
	assert_eq(typeof(d["x"]), TYPE_INT)
	assert_eq(typeof(d["y"]), TYPE_FLOAT)


func test_first_diff_names_the_path() -> void:
	var diff := JsonNorm.first_diff({"p": {"x": 1}}, {"p": {"x": 2}})
	assert_string_contains(diff, "p.x")
	assert_eq(diff, "p.x: 1.0 != 2.0")
	assert_eq(JsonNorm.first_diff({"e": [{"hit": true}]}, {"e": [{"hit": false}]}), "e[0].hit: true != false")
	assert_eq(JsonNorm.first_diff({"a": 1}, {}), "a: 1.0 != <missing>")
	assert_eq(JsonNorm.first_diff([], [{"type": "x"}]), "[0]: <missing> != {\"type\":\"x\"}")


func test_first_diff_empty_when_equal_after_norm() -> void:
	assert_eq(JsonNorm.first_diff({"a": 1}, {"a": 1.0}), "")
	assert_eq(JsonNorm.first_diff({"a": [1, {"b": null}]}, {"a": [1.0, {"b": null}]}), "")


func test_first_diff_treats_string_name_as_string() -> void:
	assert_eq(JsonNorm.first_diff({"kind": &"rock"}, {"kind": "rock"}), "")
	assert_eq(JsonNorm.first_diff([&"a"], ["b"]), "[0]: \"a\" != \"b\"")


func test_replay_reports_first_mismatch() -> void:
	var result := ParityReplay.run(_mismatch_fixture())
	assert_string_starts_with(result, "step 1")
	assert_eq(result, "step 1 (patch): events[0]: <missing> != {\"type\":\"canRefilled\"}")


func test_replay_passes_a_matching_fixture() -> void:
	var f := _mismatch_fixture()
	var expected: Dictionary = f["expected"]
	expected["events"] = [[], []]
	assert_eq(ParityReplay.run(f), "")


func test_replay_checks_snapshots_and_final() -> void:
	var f := _mismatch_fixture()
	var expected: Dictionary = f["expected"]
	expected["events"] = [[], []]
	expected["snapshots"] = {"0": {"player": {"x": 99.0, "note": "a"}, "gold": 500}}
	assert_eq(ParityReplay.run(f), "step 0 (patch): state.player.x: 11.5 != 99.0")
	expected["snapshots"] = {}
	expected["final"] = {"player": {"x": 11.5, "note": "a"}, "gold": 401}
	assert_eq(ParityReplay.run(f), "final: state.gold: 400.0 != 401.0")


func test_replay_patch_merges_dicts_and_replaces_arrays() -> void:
	var merged: Dictionary = ParityReplay.merge({"a": {"b": 1, "c": [1, 2]}, "d": 1}, {"a": {"c": [3]}, "d": null})
	assert_eq(merged, {"a": {"b": 1, "c": [3]}, "d": null})


func test_replay_tile_and_blank_farm_steps() -> void:
	var farm := {"width": 2, "height": 1, "tiles": [{"kind": "weed"}, {"kind": "tilled"}]}
	var start := {"player": {"location": "farm"}, "maps": {"farm": farm}}
	var f := {
		"start": {"state": start},
		"steps": [{"blankFarm": true}, {"tile": {"x": 0, "y": 0, "value": {"kind": "rock", "hits": 0}}}],
		"expected": {
			"events": [[], []],
			"snapshots": {"0": {"player": {"location": "farm"}, "maps": {"farm": {"width": 2, "height": 1, "tiles": [{"kind": "grass"}, {"kind": "tilled"}]}}}},
			"final": {"player": {"location": "farm"}, "maps": {"farm": {"width": 2, "height": 1, "tiles": [{"kind": "rock", "hits": 0}, {"kind": "tilled"}]}}},
		},
	}
	assert_eq(ParityReplay.run(f), "")


func test_replay_upgrade_applies_to_start_and_expected() -> void:
	var f := _mismatch_fixture()
	var expected: Dictionary = f["expected"]
	expected["events"] = [[], []]
	var upgrade := func(s: Dictionary) -> Dictionary:
		var out := s.duplicate(true)
		out["version"] = 3
		return out
	assert_eq(ParityReplay.run(f, upgrade), "")
	# An upgrade that treats the start (gold 500) and the expected final (gold 400) differently shows
	# up as a difference, so the upgrade really reaches both sides.
	var one_sided := func(s: Dictionary) -> Dictionary:
		var out := s.duplicate(true)
		out["version"] = 3 if s.get("gold") == 500 else 2
		return out
	assert_string_starts_with(ParityReplay.run(f, one_sided), "final: state.version")


func test_replay_patch_upgrade_applies_to_patch_steps_only() -> void:
	var f := _mismatch_fixture()
	var expected: Dictionary = f["expected"]
	expected["events"] = [[], []]
	var seen: Array = []
	var upgrade_patch := func(p: Dictionary) -> Dictionary:
		seen.append(p.duplicate(true))
		var out := p.duplicate(true)
		if out.has("gold"):
			out["gold"] = 400
		return out
	# The patch translation runs once per patch step, before the merge.
	assert_eq(ParityReplay.run(f, Callable(), upgrade_patch), "")
	assert_eq(seen, [{"player": {"x": 11.5}}, {"gold": 400}])
	var to_401 := func(p: Dictionary) -> Dictionary:
		var out := p.duplicate(true)
		if out.has("gold"):
			out["gold"] = 401
		return out
	assert_eq(ParityReplay.run(f, Callable(), to_401), "final: state.gold: 401.0 != 400.0")


func test_replay_runs_new_game_starts_and_cmd_steps_through_the_core() -> void:
	var f := {
		"start": {"seed": 1, "farmName": "Elm", "playerName": "Ari"},
		"steps": [{"cmd": {"type": "sleep"}}],
		"expected": {"events": [[]], "snapshots": {}, "final": {}},
	}
	# Sleeping on the farm fails, and the harness names that first event difference.
	assert_eq(ParityReplay.run(f), "step 0 (cmd sleep): events[0]: {\"reason\":\"notHere\",\"type\":\"actionFailed\"} != <missing>")


func test_real_fixtures_parse() -> void:
	for name: String in ["tools", "full-year", "rng", "save", "new-game-neg5-lessons-on"]:
		var text := FileAccess.get_file_as_string("res://test/fixtures/%s.json" % name)
		assert_eq(typeof(JSON.parse_string(text)), TYPE_DICTIONARY, name)
