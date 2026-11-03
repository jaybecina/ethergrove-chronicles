extends GutTest
## Every TypeScript parity fixture with command steps replays exactly through the GDScript core
## (packages/core/test/parity/scenarios.ts records them). `rng`, `save` and `new-game*` have their own tests.
##
## TypeScript records save version 2; the GDScript core plays version 3. Each expected state is migrated with
## `SaveMigrate.state_2_to_3` before comparing, and each `patch` step (written in version 2 words) is translated
## by `v3_patch`. One difference is set aside: the migration opens Mossdeep for a version 2 save already past
## the opening rule (spec 6.3), but this plan's core never opens it (later plans do), so the replayed game keeps
## it closed and the expected `deeps` is compared closed too. test_migrate.gd covers the opening rule.


func load_fixture(name: String) -> Dictionary:
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string("res://test/fixtures/%s.json" % name))
	assert_eq(typeof(parsed), TYPE_DICTIONARY, "%s.json parses" % name)
	var fixture: Dictionary = parsed if typeof(parsed) == TYPE_DICTIONARY else {}
	return fixture


## `SaveMigrate.state_2_to_3` with Mossdeep kept closed (see the header).
static func v3_expected(state: Dictionary) -> Dictionary:
	var out := SaveMigrate.state_2_to_3(state)
	# Only `open` is overridden; the other deeps keys keep the migration's values.
	out["deeps"]["mossdeep"]["open"] = false
	return out


## A version 2 patch in version 3 words: `version` 2 becomes 3 and `player.stamina` becomes `player.energy`.
## A patch is partial, so nothing else is added.
static func v3_patch(patch: Dictionary) -> Dictionary:
	var out := patch.duplicate(true)
	if out.get("version") == 2:
		out["version"] = 3
	if typeof(out.get("player")) == TYPE_DICTIONARY:
		var player: Dictionary = out["player"]
		if player.has("stamina"):
			player["energy"] = player["stamina"]
			player.erase("stamina")
	return out


func replay(name: String) -> String:
	return ParityReplay.run(load_fixture(name), v3_expected, v3_patch)


func test_v3_patch_renames_only_version_2_words() -> void:
	assert_eq(v3_patch({"version": 2, "player": {"stamina": 5, "x": 1.5}}), {"version": 3, "player": {"energy": 5, "x": 1.5}})
	assert_eq(v3_patch({"player": {"x": 1.5}}), {"player": {"x": 1.5}})
	assert_eq(v3_patch({"gold": 3}), {"gold": 3})


func test_parity_tools() -> void:
	assert_eq(replay("tools"), "")


func test_parity_bag() -> void:
	assert_eq(replay("bag"), "")


func test_parity_quick_slots() -> void:
	assert_eq(replay("quick-slots"), "")


func test_parity_crops() -> void:
	assert_eq(replay("crops"), "")


func test_parity_economy() -> void:
	assert_eq(replay("economy"), "")


func test_parity_day() -> void:
	assert_eq(replay("day"), "")


func test_parity_interact() -> void:
	assert_eq(replay("interact"), "")


func test_parity_weather() -> void:
	assert_eq(replay("weather"), "")


func test_parity_milestones() -> void:
	assert_eq(replay("milestones"), "")


func test_parity_tutorial() -> void:
	assert_eq(replay("tutorial"), "")


func test_parity_full_year() -> void:
	assert_eq(replay("full-year"), "")


## Each fixture file with command steps has a test above, so a new fixture cannot go unreplayed.
func test_every_replayable_fixture_is_covered() -> void:
	var covered: Array[String] = [
		"bag", "crops", "day", "economy", "full-year", "interact", "milestones", "quick-slots", "tools", "tutorial", "weather"
	]
	var found: Array[String] = []
	for f: String in DirAccess.get_files_at("res://test/fixtures"):
		if not f.ends_with(".json"):
			continue
		var name := f.get_basename()
		if name == "rng" or name == "save" or name.begins_with("new-game"):
			continue
		found.append(name)
	found.sort()
	assert_eq(found, covered)
