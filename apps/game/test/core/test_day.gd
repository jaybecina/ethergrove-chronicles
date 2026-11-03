extends CoreTest
## Overnight processing, ported from packages/core/test/day.test.ts. The "sleep and pass-out commands" cases
## go through applyCommand; they call Day.sleep directly here, and test_apply_command.gd covers the tick path.


static func _turnip(watered: bool) -> Dictionary:
	return {"kind": "tilled", "watered": watered, "crop": {"id": "turnip", "age": 1, "regrowing": false}}


func _in_house(s: Dictionary) -> Dictionary:
	var out := s.duplicate(true)
	var player: Dictionary = out["player"]
	player["location"] = "house"
	return out


func _tomorrow(s: Dictionary, w: String) -> Dictionary:
	var out := s.duplicate(true)
	var weather: Dictionary = out["weather"]
	weather["tomorrow"] = w
	return out


func _sleep(s: Dictionary) -> Dictionary:
	return Day.end_day(s, "sleep")


func _tile(s: Dictionary, x: int, y: int) -> Dictionary:
	var t: Dictionary = Grid.tile_at(farm_of(s), x, y)
	return t


func _types(events: Array) -> Array:
	var out: Array = []
	for e_v: Variant in events:
		var e: Dictionary = e_v
		out.append(e["type"])
	return out


func test_grows_watered_crops_but_not_dry_ones() -> void:
	var s := TestStates.with_tile(TestStates.blank_farm(TestStates.fresh()), 10, 10, _turnip(true))
	s = TestStates.with_tile(s, 11, 10, _turnip(false))
	var next := st(_sleep(s))
	var wet: Dictionary = _tile(next, 10, 10)["crop"]
	var dry: Dictionary = _tile(next, 11, 10)["crop"]
	eq(wet["age"], 2)
	eq(dry["age"], 1)


func test_grows_before_the_season_change_kills_the_crop() -> void:
	var s := TestStates.with_tile(TestStates.blank_farm(TestStates.fresh()), 10, 10, _turnip(true))
	var cal: Dictionary = s["calendar"]
	cal["day"] = 28
	var r := _sleep(s)
	eq(st(r)["calendar"], {"year": 1, "season": "summer", "day": 1, "minute": 360})
	var types := _types(ev(r))
	assert_lt(types.find("cropGrew"), types.find("cropDied"))
	assert_has(ev(r), {"type": "seasonChanged", "season": "summer"})
	eq(_tile(st(r), 10, 10), {"kind": "tilled", "watered": false})


func test_a_rain_day_leaves_every_tilled_tile_watered_at_6_00() -> void:
	var s := _tomorrow(TestStates.with_tile(TestStates.blank_farm(TestStates.fresh()), 10, 10, {"kind": "tilled", "watered": false}), "rain")
	var r := _sleep(s)
	var weather: Dictionary = st(r)["weather"]
	eq(weather["today"], "rain")
	eq(_tile(st(r), 10, 10)["watered"], true)
	assert_has(ev(r), {"type": "weatherChanged", "weather": "rain"})


func test_a_sunny_day_leaves_tilled_tiles_dry() -> void:
	var s := _tomorrow(TestStates.with_tile(TestStates.blank_farm(TestStates.fresh()), 10, 10, _turnip(true)), "sunny")
	eq(_tile(st(_sleep(s)), 10, 10)["watered"], false)


func test_rolls_a_fresh_forecast_for_the_following_day() -> void:
	var seen: Dictionary = {}
	var s := NewGame.create({"seed": 3, "farmName": "Elm", "playerName": "Ari"})
	for i: int in 20:
		s = st(_sleep(s))
		var weather: Dictionary = s["weather"]
		seen[weather["tomorrow"]] = true
	assert_gt(seen.size(), 1)


func test_pass_out_costs_10_percent_gold_and_half_energy_the_next_day_only() -> void:
	var s := TestStates.fresh()
	s["gold"] = 5000
	var out := Day.end_day(s, "passOut")
	eq(st(out)["gold"], 4500)
	var player: Dictionary = st(out)["player"]
	eq(player["energy"], 50)
	eq(ev(out)[0], {"type": "passedOut"})
	eq(st(out)["wakeHalfStamina"], false)
	var next_player: Dictionary = st(_sleep(st(out)))["player"]
	eq(next_player["energy"], 100)
	eq(s["gold"], 5000, "argument not mutated")


func test_pass_out_loses_at_most_1000_gold() -> void:
	var s := TestStates.fresh()
	s["gold"] = 20000
	eq(st(Day.end_day(s, "passOut"))["gold"], 19000)


func test_credits_shipped_goods_the_next_morning_with_a_report() -> void:
	var s := TestStates.fresh()
	s["bin"] = [{"id": "turnip", "qty": 6}]
	var r := _sleep(s)
	eq(st(r)["gold"], 710)
	eq(st(r)["pendingGold"], 0)
	eq(st(r)["bin"], [])
	assert_has(ev(r), {"type": "shippingReport", "items": [{"id": "turnip", "qty": 6}], "total": 210})
	assert_has(ev(r), {"type": "goldChanged", "gold": 710, "delta": 210})


func test_wakes_in_the_house_at_6_00_and_ends_with_day_started() -> void:
	var r := _sleep(TestStates.fresh())
	var player: Dictionary = st(r)["player"]
	var cal: Dictionary = st(r)["calendar"]
	eq(player["location"], "house")
	eq(cal["minute"], 360)
	eq(ev(r)[ev(r).size() - 1], {"type": "dayStarted", "calendar": cal})


func test_winter_28_rolls_into_year_2_spring_1() -> void:
	var s := TestStates.fresh()
	s["calendar"] = {"year": 1, "season": "winter", "day": 28, "minute": 1300}
	eq(st(_sleep(s))["calendar"], {"year": 2, "season": "spring", "day": 1, "minute": 360})


func _kinds(s: Dictionary) -> Array:
	var out: Array = []
	for i: int in 75:
		var t: Dictionary = _tile(s, (i % 25) + 3, 6 + i / 25)
		out.append(t["kind"])
	return out


func test_bare_tilled_soil_may_revert_to_grass_seeded() -> void:
	var s := TestStates.blank_farm(NewGame.create({"seed": 5, "farmName": "Elm", "playerName": "Ari"}))
	for y: int in range(6, 9):
		for x: int in range(3, 28):
			s = TestStates.with_tile(s, x, y, {"kind": "tilled", "watered": false})
	var after := _kinds(st(_sleep(s)))
	var reverted := after.count("grass")
	assert_gt(reverted, 0)
	assert_lt(reverted, 20)
	eq(_kinds(st(_sleep(s))), after)


func test_sleep_works_only_inside_the_house() -> void:
	eq(ev(Day.sleep(TestStates.fresh())), [{"type": "actionFailed", "reason": "notHere"}])
	var cal: Dictionary = st(Day.sleep(_in_house(TestStates.fresh())))["calendar"]
	eq(cal["day"], 2)


func test_places_the_player_on_the_house_spawn_after_waking() -> void:
	var state := st(Day.sleep(_in_house(TestStates.fresh())))
	var maps: Dictionary = state["maps"]
	var bed := Grid.find_feature(d(maps["house"]), "bed")
	var player: Dictionary = state["player"]
	var z: float = player["z"]
	assert_gt(floori(z), bed.y)


## Version 3: the rebuilt player keeps `floor` 0 and every other version 3 key survives the night.
func test_end_day_keeps_the_version_3_keys() -> void:
	var s := TestStates.fresh()
	s["hp"] = 42
	s["xp"] = 7
	s["kindlings"] = 1
	s["talked"] = ["hilda"]
	d(d(s["deeps"])["mossdeep"])["checkpoints"] = [0]
	d(s["player"])["floor"] = 3
	var out := st(Day.end_day(s, "sleep"))
	var player := d(out["player"])
	eq(player["floor"], 0)
	eq(player["energy"], 100)
	eq(player.has("stamina"), false)
	for k: String in SaveMigrate.V3_KEYS:
		eq(out[k], s[k], k)
	eq(out["version"], 3)
	eq(SaveSchema.validate_state(out), "")
