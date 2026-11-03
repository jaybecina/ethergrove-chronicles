class_name SaveMigrate
extends RefCounted
## Save migration, ported from packages/core/src/save/migrate.ts, plus version 3 (spec 5.2), which lives only in
## Godot. A save file is {version, savedAt, playTimeMs, summary, state}; see SaveSchema for the rules.

const CURRENT_SAVE_VERSION := 3

## zod 4's `.int()` bound (Number.MAX_SAFE_INTEGER, 2^53 - 1).
const MAX_SAFE_INTEGER := 9007199254740991

## Migrations keyed by the version they upgrade FROM: int -> Callable(file: Variant) -> Variant.
## v2 adds Grandpa's lessons. Existing players know the basics: lessons and notes start off.
## v3 adds the M1 slice's keys (spec 5.1).
const MIGRATIONS: Dictionary = {
	1: Callable(SaveMigrate, "_v1_to_v2"),
	2: Callable(SaveMigrate, "migrate_2_to_3"),
}

## The top-level state keys version 3 adds (`player.energy` and `player.floor` are inside `player`).
const V3_KEYS: Array[String] = [
	"hp", "xp", "level", "gear", "buff", "deeps", "lootSinceSleep", "elites", "rootstones", "kindlings", "talked",
]

## The tiles version 3 turns into features (spec 6.1), with the kind every version 2 save has there. The hoe
## tills only grass, so no crop can stand on them; spec 5.2's "move to the nearest free path" cannot happen.
const V3_FEATURES: Array[Dictionary] = [
	{"map": "farm", "x": 28, "y": 2, "was": "path", "feature": "rootShrine"},
	{"map": "farm", "x": 16, "y": 23, "was": "fence", "feature": "farmGate"},
	{"map": "house", "x": 1, "y": 1, "was": "floor", "feature": "stove"},
]


static func _v1_to_v2(file: Variant) -> Variant:
	if typeof(file) != TYPE_DICTIONARY:
		return file
	var src: Dictionary = file
	var out := src.duplicate(true)
	out["version"] = 2
	if typeof(out.get("state")) != TYPE_DICTIONARY:
		return out
	var state: Dictionary = out["state"]
	state["version"] = 2
	state["tutorial"] = {"lesson": "off", "count": 0, "notesSeen": Array(Lessons.NOTE_IDS), "gifted": false}
	return out


static func migrate_2_to_3(file: Variant) -> Variant:
	if typeof(file) != TYPE_DICTIONARY:
		return file
	var src: Dictionary = file
	var out := src.duplicate(true)
	out["version"] = 3
	if typeof(out.get("state")) == TYPE_DICTIONARY:
		var state: Dictionary = out["state"]
		out["state"] = state_2_to_3(state)
	return out


## A version 2 state at version 3: `player.stamina` becomes `player.energy`, `player.floor` is 0, every key in
## V3_KEYS gets its new-game value, Mossdeep opens by spec 6.3's rule, and the V3_FEATURES tiles are placed.
## Any other state (already version 3, or not version 2) comes back as an unchanged copy, so applying this twice
## is safe. Missing or malformed parts are left for SaveSchema to reject; the argument is never mutated.
static func state_2_to_3(state: Dictionary) -> Dictionary:
	var out := state.duplicate(true)
	if _num(out.get("version")) != 2.0:
		return out
	out["version"] = 3
	if typeof(out.get("player")) == TYPE_DICTIONARY:
		var player: Dictionary = out["player"]
		if player.has("stamina"):
			player["energy"] = player["stamina"]
			player.erase("stamina")
		player["floor"] = 0
	out["hp"] = 100
	out["xp"] = 0
	out["level"] = 1
	out["gear"] = {
		"weapon": null, "offHand": null, "head": null, "body": null, "feet": null, "trinket1": null, "trinket2": null,
	}
	out["buff"] = null
	out["deeps"] = {"mossdeep": {"open": _mossdeep_open(out), "cleared": false, "checkpoints": []}}
	out["lootSinceSleep"] = []
	out["elites"] = {"mossmaw": {"defeatedSeason": null}}
	out["rootstones"] = []
	out["kindlings"] = 0
	out["talked"] = []
	if typeof(out.get("maps")) == TYPE_DICTIONARY:
		var maps: Dictionary = out["maps"]
		for place: Dictionary in V3_FEATURES:
			_place_feature(maps, place)
	return out


## Spec 6.3: Mossdeep opens with the first shipment, but not before spring day 8 of year 1.
static func _mossdeep_open(state: Dictionary) -> bool:
	var milestones: Variant = state.get("milestones")
	if typeof(milestones) != TYPE_ARRAY or not (milestones as Array).has("firstShipment"):
		return false
	var calendar: Variant = state.get("calendar")
	if typeof(calendar) != TYPE_DICTIONARY:
		return false
	var c: Dictionary = calendar
	var season: Variant = c.get("season")
	var spring: bool = typeof(season) == TYPE_STRING and season == "spring"
	var early: bool = _num(c.get("year")) == 1.0 and spring and _num(c.get("day")) < 8.0
	return not early


static func _num(v: Variant) -> float:
	if typeof(v) == TYPE_INT or typeof(v) == TYPE_FLOAT:
		var f: float = v
		return f
	return NAN


## Turns the tile at `place` into its feature. A tile of any other kind than `place.was` cannot occur in a valid
## save: it is reported with push_error and kept as it is (a crop is never destroyed), and the save still loads.
static func _place_feature(maps: Dictionary, place: Dictionary) -> void:
	var map_name: String = place["map"]
	if typeof(maps.get(map_name)) != TYPE_DICTIONARY:
		return
	var grid: Dictionary = maps[map_name]
	var width: Variant = grid.get("width")
	var tiles: Variant = grid.get("tiles")
	if typeof(width) != TYPE_INT or typeof(tiles) != TYPE_ARRAY:
		return
	var x: int = place["x"]
	var y: int = place["y"]
	var w: int = width
	var list: Array = tiles
	var i := y * w + x
	if x >= w or i >= list.size():
		return
	var feature: String = place["feature"]
	var tile: Variant = list[i]
	var kind: Variant = (tile as Dictionary).get("kind") if typeof(tile) == TYPE_DICTIONARY else null
	var was: String = place["was"]
	if not (typeof(kind) == TYPE_STRING and kind == was):
		push_error("Save 2 -> 3: %s tile %d,%d is %s, not %s; %s not placed" % [
			map_name, x, y, str(kind), was, feature,
		])
		return
	list[i] = {"kind": "feature", "feature": feature}


## The integer version of `raw`, or -1 when it has none.
static func _version_of(raw: Variant) -> int:
	if typeof(raw) != TYPE_DICTIONARY:
		return -1
	var d: Dictionary = raw
	var v: Variant = d.get("version")
	if typeof(v) == TYPE_INT:
		var i: int = v
		return i if absi(i) <= MAX_SAFE_INTEGER else -1
	return -1


static func _fail(error: String) -> Dictionary:
	return {"ok": false, "error": error}


## `raw` is untrusted parsed JSON. Whole-number floats become ints first, so loaded saves index tiles and
## compare like freshly made ones. Returns {ok: true, file} or {ok: false, error: "invalid"|"unsupportedVersion"}.
## `migrations` is injectable for tests. A version below 1 has no migration, so it is unsupported (zod's
## `int` accepts it too, but TypeScript then finds no step either).
static func migrate(raw: Variant, migrations: Dictionary = MIGRATIONS) -> Dictionary:
	var current: Variant = JsonNorm.ints(raw)
	var version := _version_of(current)
	if version == -1:
		return _fail("invalid")
	if version > CURRENT_SAVE_VERSION:
		return _fail("unsupportedVersion")
	while version < CURRENT_SAVE_VERSION:
		if not migrations.has(version):
			return _fail("unsupportedVersion")
		var step: Callable = migrations[version]
		current = step.call(current)
		var next := _version_of(current)
		if next == -1 or next <= version:
			return _fail("invalid")
		version = next
	if SaveSchema.validate_file(current) != "":
		return _fail("invalid")
	return {"ok": true, "file": current}


## `saved_at` is an ISO 8601 string from the caller, which keeps core free of the clock.
static func make_save_file(state: Dictionary, play_time_ms: int, saved_at: String) -> Dictionary:
	var copy := state.duplicate(true)
	var calendar: Dictionary = copy["calendar"]
	return {
		"version": CURRENT_SAVE_VERSION,
		"savedAt": saved_at,
		"playTimeMs": play_time_ms,
		"summary": {
			"farmName": copy["farmName"],
			"playerName": copy["playerName"],
			"calendar": calendar.duplicate(true),
			"gold": copy["gold"],
		},
		"state": copy,
	}
