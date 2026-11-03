class_name Day
extends RefCounted
## Overnight processing, ported from packages/core/src/systems/day.ts.


static func _dry_and_rain(grid: Dictionary, wet: bool) -> Dictionary:
	var out := grid.duplicate(true)
	var tiles: Array = out["tiles"]
	for t_v: Variant in tiles:
		var t: Dictionary = t_v
		if t["kind"] == "tilled":
			t["watered"] = wet
	return out


## Bare, unwatered tilled soil may revert to grass. Returns [grid, rng].
static func _revert_bare_soil(grid: Dictionary, rng: int) -> Array:
	var r := rng
	var out := grid.duplicate(true)
	var tiles: Array = out["tiles"]
	for i: int in tiles.size():
		var t: Dictionary = tiles[i]
		if t["kind"] != "tilled" or t.has("crop") or t.get("watered", false):
			continue
		var res := Rng.next_float(r)
		var v: float = res[0]
		r = res[1]
		if v < Balance.TILLED_REVERT_CHANCE:
			tiles[i] = {"kind": "grass"}
	return [out, r]


## Overnight processing, in the order fixed by spec 3.2. `reason` is "sleep" or "passOut".
static func end_day(state: Dictionary, reason: String) -> Dictionary:
	var events: Array = []
	var s := state.duplicate(true)

	if reason == "passOut":
		var gold_before: int = s["gold"]
		var loss := mini(floori(gold_before * Balance.PASS_OUT_GOLD_PCT), Balance.PASS_OUT_GOLD_CAP)
		s["gold"] = gold_before - loss
		s["wakeHalfStamina"] = true
		events.append({"type": "passedOut"})
		if loss > 0:
			events.append({"type": "goldChanged", "gold": gold_before - loss, "delta": -loss})

	# 1. Sell the shipping bin.
	var sold := Economy.sell_bin(s)
	s = sold["state"]
	events.append({"type": "shippingReport", "items": sold["items"], "total": sold["total"]})

	# 2. Grow watered crops.
	var maps: Dictionary = s["maps"]
	var grown := Crops.grow_crops(d(maps["farm"]))
	var farm: Dictionary = grown["grid"]
	events.append_array(grown["events"] as Array)

	# 3. Advance the date; kill out-of-season crops on a season change.
	var old_calendar: Dictionary = s["calendar"]
	var calendar := Calendar.next_day(old_calendar)
	if calendar["season"] != old_calendar["season"]:
		var season: String = calendar["season"]
		var killed := Crops.kill_out_of_season(farm, season)
		farm = killed["grid"]
		events.append({"type": "seasonChanged", "season": season})
		events.append_array(killed["events"] as Array)

	# 4. Weather: today becomes the forecast; roll a new forecast.
	var weather_in: Dictionary = s["weather"]
	var today: String = weather_in["tomorrow"]
	var following := Calendar.next_day(calendar)
	var following_season: String = following["season"]
	var following_day: int = following["day"]
	var rng_in: int = s["rng"]
	var rolled := Weather.roll(following_season, following_day, rng_in)
	var tomorrow: String = rolled[0]
	var rng_after_weather: int = rolled[1]
	events.append({"type": "weatherChanged", "weather": today})

	# 7. Bare soil left unwatered today may revert. Eligibility uses today's water,
	# so it is decided before step 5 dries the field and tomorrow's rain re-wets it.
	var reverted := _revert_bare_soil(farm, rng_after_weather)
	var reverted_grid: Dictionary = reverted[0]
	var rng: int = reverted[1]

	# 5. Dry all soil; rain and storms water it.
	farm = _dry_and_rain(reverted_grid, today == "rain" or today == "storm")

	# 6. Restore energy and credit gold.
	var half: bool = s["wakeHalfStamina"]
	var energy: int = Balance.MAX_ENERGY / 2 if half else Balance.MAX_ENERGY
	var gold_now: int = s["gold"]
	var pending: int = s["pendingGold"]
	var gold := gold_now + pending
	if pending > 0:
		events.append({"type": "goldChanged", "gold": gold, "delta": pending})

	var spawn := Grid.find_char(Layouts.HOUSE_LAYOUT, Layouts.HOUSE_SPAWN_CHAR)
	var out_maps: Dictionary = s["maps"]
	out_maps["farm"] = farm
	s["rng"] = rng
	s["calendar"] = calendar
	s["weather"] = {"today": today, "tomorrow": tomorrow}
	s["gold"] = gold
	s["pendingGold"] = 0
	s["wakeHalfStamina"] = false
	# The player is rebuilt in the house on the surface (`floor` 0); every other version 3 key carries over.
	s["player"] = {
		"location": "house", "x": spawn.x + 0.5, "z": spawn.y + 0.5, "facing": "s", "energy": energy, "floor": 0,
	}
	events.append({"type": "dayStarted", "calendar": calendar.duplicate(true)})
	return GameStateUtil.result(s, events)


static func sleep(state: Dictionary) -> Dictionary:
	var player: Dictionary = state["player"]
	if player["location"] != "house":
		return GameStateUtil.fail(state, "notHere")
	return end_day(state, "sleep")


static func d(v: Variant) -> Dictionary:
	var out: Dictionary = v
	return out
