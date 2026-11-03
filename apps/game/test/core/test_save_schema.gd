extends CoreTest
## SaveSchema: the GDScript twin of save/schema.ts. Every rule gets a state that breaks it, and the
## error is the first failing path.


func _state() -> Dictionary:
	return TestStates.fresh()


## `state` with `change` applied to a deep copy, validated.
func _bad(change: Callable) -> String:
	var s := _state()
	change.call(s)
	return SaveSchema.validate_state(s)


func test_a_new_game_is_valid() -> void:
	eq(SaveSchema.validate_state(_state()), "")
	eq(SaveSchema.validate_file(SaveMigrate.make_save_file(_state(), 0, "x")), "")


func test_non_dictionaries_fail_at_the_root() -> void:
	eq(SaveSchema.validate_state(null), "state")
	eq(SaveSchema.validate_state([]), "state")
	eq(SaveSchema.validate_file("x"), "file")


func test_missing_and_wrong_typed_fields() -> void:
	eq(_bad(func(s: Dictionary) -> void: s.erase("gold")), "state.gold")
	eq(_bad(func(s: Dictionary) -> void: s["gold"] = -5), "state.gold")
	eq(_bad(func(s: Dictionary) -> void: s["gold"] = 1.5), "state.gold")
	eq(_bad(func(s: Dictionary) -> void: s["gold"] = "5"), "state.gold")
	eq(_bad(func(s: Dictionary) -> void: s["pendingGold"] = -1), "state.pendingGold")
	eq(_bad(func(s: Dictionary) -> void: s["farmName"] = 4), "state.farmName")
	eq(_bad(func(s: Dictionary) -> void: s["wakeHalfStamina"] = 0), "state.wakeHalfStamina")
	eq(_bad(func(s: Dictionary) -> void: s["version"] = 2), "state.version")
	eq(_bad(func(s: Dictionary) -> void: s["seed"] = 1.5), "state.seed")
	eq(_bad(func(s: Dictionary) -> void: s["rng"] = null), "state.rng")


func test_whole_floats_count_as_integers() -> void:
	eq(_bad(func(s: Dictionary) -> void: s["gold"] = 500.0), "")


func test_calendar_ranges() -> void:
	eq(_bad(func(s: Dictionary) -> void: d(s["calendar"])["season"] = "monsoon"), "state.calendar.season")
	eq(_bad(func(s: Dictionary) -> void: d(s["calendar"])["day"] = 0), "state.calendar.day")
	eq(_bad(func(s: Dictionary) -> void: d(s["calendar"])["day"] = 29), "state.calendar.day")
	eq(_bad(func(s: Dictionary) -> void: d(s["calendar"])["minute"] = 1561), "state.calendar.minute")
	eq(_bad(func(s: Dictionary) -> void: d(s["calendar"])["minute"] = -1), "state.calendar.minute")
	eq(_bad(func(s: Dictionary) -> void: d(s["calendar"])["year"] = 0), "state.calendar.year")
	eq(_bad(func(s: Dictionary) -> void: d(s["calendar"])["minute"] = 1560), "")


func test_weather_and_player() -> void:
	eq(_bad(func(s: Dictionary) -> void: d(s["weather"])["today"] = "fog"), "state.weather.today")
	eq(_bad(func(s: Dictionary) -> void: d(s["weather"]).erase("tomorrow")), "state.weather.tomorrow")
	eq(_bad(func(s: Dictionary) -> void: d(s["player"])["location"] = "cave"), "state.player.location")
	eq(_bad(func(s: Dictionary) -> void: d(s["player"])["facing"] = "up"), "state.player.facing")
	eq(_bad(func(s: Dictionary) -> void: d(s["player"])["energy"] = 101), "state.player.energy")
	eq(_bad(func(s: Dictionary) -> void: d(s["player"])["energy"] = -0.5), "state.player.energy")
	eq(_bad(func(s: Dictionary) -> void: d(s["player"])["energy"] = 55.5), "")
	eq(_bad(func(s: Dictionary) -> void: d(s["player"]).erase("energy")), "state.player.energy")
	eq(_bad(func(s: Dictionary) -> void: d(s["player"])["x"] = "3"), "state.player.x")
	eq(_bad(func(s: Dictionary) -> void: d(s["player"])["z"] = INF), "state.player.z")
	eq(_bad(func(s: Dictionary) -> void: d(s["player"])["location"] = "house"), "")


func test_counters_and_slots() -> void:
	eq(_bad(func(s: Dictionary) -> void: s["canCharges"] = 21), "state.canCharges")
	eq(_bad(func(s: Dictionary) -> void: s["canCharges"] = -1), "state.canCharges")
	eq(_bad(func(s: Dictionary) -> void: s["activeSlot"] = 8), "state.activeSlot")
	eq(_bad(func(s: Dictionary) -> void: s["activeSlot"] = 7), "")
	eq(_bad(func(s: Dictionary) -> void: s["selectedQuick"] = 3), "state.selectedQuick")
	eq(_bad(func(s: Dictionary) -> void: s["quickSlots"] = [null, null]), "state.quickSlots")
	eq(_bad(func(s: Dictionary) -> void: s["quickSlots"] = [null, null, 12]), "state.quickSlots[2]")
	eq(_bad(func(s: Dictionary) -> void: s["quickSlots"] = [-1, null, null]), "state.quickSlots[0]")
	eq(_bad(func(s: Dictionary) -> void: s["quickSlots"] = [0, 1, 11]), "")


func test_bag() -> void:
	eq(_bad(func(s: Dictionary) -> void: a(s["bag"]).pop_back()), "state.bag")
	eq(_bad(func(s: Dictionary) -> void: a(s["bag"]).append(null)), "state.bag")
	eq(_bad(func(s: Dictionary) -> void: a(s["bag"])[3] = {"id": "stone", "qty": 0}), "state.bag[3].qty")
	eq(_bad(func(s: Dictionary) -> void: a(s["bag"])[3] = {"id": "stone", "qty": 100}), "state.bag[3].qty")
	eq(_bad(func(s: Dictionary) -> void: a(s["bag"])[3] = {"id": "stone", "qty": 99}), "")
	eq(_bad(func(s: Dictionary) -> void: a(s["bag"])[3] = {"id": "gold", "qty": 1}), "state.bag[3].id")
	eq(_bad(func(s: Dictionary) -> void: a(s["bag"])[3] = {"id": "seed:corn"}), "state.bag[3].qty")
	eq(_bad(func(s: Dictionary) -> void: a(s["bag"])[3] = 5), "state.bag[3]")
	eq(_bad(func(s: Dictionary) -> void: s["bin"] = [{"id": "turnip", "qty": 0}]), "state.bin[0].qty")
	eq(_bad(func(s: Dictionary) -> void: s["bin"] = [{"id": "turnip", "qty": 500}]), "")
	eq(_bad(func(s: Dictionary) -> void: s["bin"] = [{"id": "nope", "qty": 1}]), "state.bin[0].id")


func test_maps_and_tiles() -> void:
	eq(_bad(func(s: Dictionary) -> void: d(d(s["maps"])["farm"])["width"] = 0), "state.maps.farm.width")
	eq(_bad(func(s: Dictionary) -> void: a(farm_of(s)["tiles"]).pop_back()), "state.maps.farm.tiles")
	eq(_bad(func(s: Dictionary) -> void: d(s["maps"]).erase("house")), "state.maps.house")
	eq(_bad(func(s: Dictionary) -> void: a(farm_of(s)["tiles"])[5] = {"kind": "lava"}), "state.maps.farm.tiles[5].kind")
	eq(_bad(func(s: Dictionary) -> void: a(farm_of(s)["tiles"])[5] = {"kind": "feature", "feature": "portal"}), "state.maps.farm.tiles[5].feature")
	eq(_bad(func(s: Dictionary) -> void: a(farm_of(s)["tiles"])[5] = {"kind": "rock", "hits": -1}), "state.maps.farm.tiles[5].hits")
	eq(_bad(func(s: Dictionary) -> void: a(farm_of(s)["tiles"])[5] = {"kind": "tilled", "watered": 1}), "state.maps.farm.tiles[5].watered")
	eq(_bad(func(s: Dictionary) -> void: a(farm_of(s)["tiles"])[5] = {"kind": "tilled", "crop": {"id": "kale", "age": 0, "regrowing": false}}), "state.maps.farm.tiles[5].crop.id")
	eq(_bad(func(s: Dictionary) -> void: a(farm_of(s)["tiles"])[5] = {"kind": "tilled", "crop": {"id": "corn", "age": -1, "regrowing": false}}), "state.maps.farm.tiles[5].crop.age")
	eq(_bad(func(s: Dictionary) -> void: a(farm_of(s)["tiles"])[5] = {"kind": "tilled", "crop": {"id": "corn", "age": 2}}), "state.maps.farm.tiles[5].crop.regrowing")
	eq(_bad(func(s: Dictionary) -> void: a(farm_of(s)["tiles"])[5] = {"kind": "tilled", "feature": null}), "state.maps.farm.tiles[5].feature")
	eq(_bad(func(s: Dictionary) -> void: a(farm_of(s)["tiles"])[5] = {"kind": "tilled", "watered": true, "crop": {"id": "corn", "age": 2, "regrowing": true}}), "")


func test_milestones_harvested_and_tutorial() -> void:
	eq(_bad(func(s: Dictionary) -> void: s["milestones"] = ["firstTill", "nope"]), "state.milestones[1]")
	eq(_bad(func(s: Dictionary) -> void: s["milestones"] = ["fullYear"]), "")
	eq(_bad(func(s: Dictionary) -> void: s["harvested"] = {"kale": 1}), "state.harvested.kale")
	eq(_bad(func(s: Dictionary) -> void: s["harvested"] = {"corn": -1}), "state.harvested.corn")
	eq(_bad(func(s: Dictionary) -> void: s["harvested"] = {"corn": 3}), "")
	eq(_bad(func(s: Dictionary) -> void: d(s["tutorial"])["lesson"] = "fly"), "state.tutorial.lesson")
	eq(_bad(func(s: Dictionary) -> void: d(s["tutorial"])["lesson"] = "complete"), "")
	eq(_bad(func(s: Dictionary) -> void: d(s["tutorial"])["lesson"] = "off"), "")
	eq(_bad(func(s: Dictionary) -> void: d(s["tutorial"])["lesson"] = "buySeeds"), "")
	eq(_bad(func(s: Dictionary) -> void: d(s["tutorial"])["count"] = -1), "state.tutorial.count")
	eq(_bad(func(s: Dictionary) -> void: d(s["tutorial"])["notesSeen"] = ["rain", "x"]), "state.tutorial.notesSeen[1]")
	eq(_bad(func(s: Dictionary) -> void: d(s["tutorial"])["gifted"] = "yes"), "state.tutorial.gifted")


func test_file_fields() -> void:
	var file := SaveMigrate.make_save_file(_state(), 5, "t")
	eq(SaveSchema.validate_file(file), "")
	var f1 := file.duplicate(true)
	f1["version"] = "2"
	eq(SaveSchema.validate_file(f1), "file.version")
	var f2 := file.duplicate(true)
	f2["savedAt"] = 3
	eq(SaveSchema.validate_file(f2), "file.savedAt")
	var f3 := file.duplicate(true)
	f3["playTimeMs"] = -1
	eq(SaveSchema.validate_file(f3), "file.playTimeMs")
	var f4 := file.duplicate(true)
	d(f4["summary"])["gold"] = -1
	eq(SaveSchema.validate_file(f4), "file.summary.gold")
	var f5 := file.duplicate(true)
	d(d(f5["summary"])["calendar"])["day"] = 40
	eq(SaveSchema.validate_file(f5), "file.summary.calendar.day")
	var f6 := file.duplicate(true)
	d(f6["state"])["gold"] = -1
	eq(SaveSchema.validate_file(f6), "file.state.gold")


func test_validation_does_not_mutate() -> void:
	var s := _state()
	var before := s.duplicate(true)
	SaveSchema.validate_state(s)
	eq(s, before)


func test_version_3_keys() -> void:
	eq(_bad(func(s: Dictionary) -> void: s.erase("hp")), "state.hp")
	eq(_bad(func(s: Dictionary) -> void: s["hp"] = -1), "state.hp")
	eq(_bad(func(s: Dictionary) -> void: s["hp"] = 2.5), "state.hp")
	eq(_bad(func(s: Dictionary) -> void: s["xp"] = -1), "state.xp")
	eq(_bad(func(s: Dictionary) -> void: s["level"] = 0), "state.level")
	eq(_bad(func(s: Dictionary) -> void: s["level"] = 3), "")
	eq(_bad(func(s: Dictionary) -> void: d(s["gear"])["weapon"] = 5), "state.gear.weapon")
	eq(_bad(func(s: Dictionary) -> void: d(s["gear"]).erase("trinket2")), "state.gear.trinket2")
	eq(_bad(func(s: Dictionary) -> void: d(s["gear"])["weapon"] = "practiceSword"), "")
	eq(_bad(func(s: Dictionary) -> void: s["gear"] = null), "state.gear")
	eq(_bad(func(s: Dictionary) -> void: s["buff"] = {"id": "stew"}), "state.buff.untilMinute")
	eq(_bad(func(s: Dictionary) -> void: s["buff"] = {"id": 3, "untilMinute": 600}), "state.buff.id")
	eq(_bad(func(s: Dictionary) -> void: s["buff"] = {"id": "stew", "untilMinute": 600}), "")
	eq(_bad(func(s: Dictionary) -> void: s.erase("deeps")), "state.deeps")
	eq(_bad(func(s: Dictionary) -> void: d(d(s["deeps"])["mossdeep"])["open"] = 1), "state.deeps.mossdeep.open")
	eq(_bad(func(s: Dictionary) -> void: d(d(s["deeps"])["mossdeep"])["cleared"] = null), "state.deeps.mossdeep.cleared")
	eq(_bad(func(s: Dictionary) -> void: d(d(s["deeps"])["mossdeep"])["checkpoints"] = [0, 3]), "state.deeps.mossdeep.checkpoints[1]")
	eq(_bad(func(s: Dictionary) -> void: d(d(s["deeps"])["mossdeep"])["checkpoints"] = [0, 4, 8]), "")
	eq(_bad(func(s: Dictionary) -> void: s["lootSinceSleep"] = [{"id": "stone", "qty": 0}]), "state.lootSinceSleep[0].qty")
	eq(_bad(func(s: Dictionary) -> void: s["lootSinceSleep"] = [{"id": "stone", "qty": 3}]), "")
	eq(_bad(func(s: Dictionary) -> void: d(d(s["elites"])["mossmaw"])["defeatedSeason"] = 2), "state.elites.mossmaw.defeatedSeason")
	eq(_bad(func(s: Dictionary) -> void: d(d(s["elites"])["mossmaw"])["defeatedSeason"] = "summer"), "")
	eq(_bad(func(s: Dictionary) -> void: s["rootstones"] = ["verdant", "ember"]), "state.rootstones[1]")
	eq(_bad(func(s: Dictionary) -> void: s["rootstones"] = ["verdant"]), "")
	eq(_bad(func(s: Dictionary) -> void: s["kindlings"] = -1), "state.kindlings")
	eq(_bad(func(s: Dictionary) -> void: s["talked"] = ["hilda", 4]), "state.talked[1]")
	eq(_bad(func(s: Dictionary) -> void: s["talked"] = ["hilda"]), "")


func test_version_3_player() -> void:
	eq(_bad(func(s: Dictionary) -> void: d(s["player"])["floor"] = 9), "state.player.floor")
	eq(_bad(func(s: Dictionary) -> void: d(s["player"])["floor"] = -1), "state.player.floor")
	eq(_bad(func(s: Dictionary) -> void: d(s["player"]).erase("floor")), "state.player.floor")
	eq(_bad(func(s: Dictionary) -> void: d(s["player"])["floor"] = 8), "")
	for loc: String in ["lowmere", "woods", "mossdeep", "clinic"]:
		eq(_bad(func(s: Dictionary) -> void: d(s["player"])["location"] = loc), "", loc)


## zod 4's `.int()` accepts only safe integers, |v| <= 2^53 - 1 = 9007199254740991.
func test_integers_must_be_safe() -> void:
	eq(_bad(func(s: Dictionary) -> void: s["gold"] = 9007199254740991), "")
	eq(_bad(func(s: Dictionary) -> void: s["gold"] = 9007199254740991.0), "")
	eq(_bad(func(s: Dictionary) -> void: s["gold"] = 9007199254740992), "state.gold")
	eq(_bad(func(s: Dictionary) -> void: s["gold"] = 9007199254740992.0), "state.gold")
	eq(_bad(func(s: Dictionary) -> void: s["gold"] = 1.0e300), "state.gold")
	eq(_bad(func(s: Dictionary) -> void: s["seed"] = -9007199254740992), "state.seed")
	eq(_bad(func(s: Dictionary) -> void: s["seed"] = -9007199254740991), "")


## Like zod's default object, unknown keys do not fail validation.
func test_unknown_keys_are_ignored() -> void:
	eq(_bad(func(s: Dictionary) -> void: s["future"] = [1, 2]), "")
	eq(_bad(func(s: Dictionary) -> void: d(s["player"])["future"] = true), "")
