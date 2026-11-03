class_name SaveSchema
extends RefCounted
## Save validation, ported from packages/core/src/save/schema.ts (the zod schemas), at save version 3 (spec 5.1,
## Godot only). Each validator returns "" when the value is valid, else the path of the first failing field, e.g.
## `state.bag[3].qty`. Unknown extra keys never fail validation, as in zod; but where zod's parse strips them,
## this validator only checks, so a file that `SaveMigrate.migrate` accepts keeps them. An integer is an int or a
## whole-number float (`2.0` from `JSON.parse_string`) within zod 4's safe range, |v| <= 2^53 - 1;
## `SaveMigrate.migrate` converts whole floats to ints first so the data the game keeps is int-typed.

const TILE_KINDS: Array[String] = [
	"grass", "path", "weed", "rock", "stump", "tilled", "water", "building", "fence", "wall", "floor", "feature",
]
const FEATURES: Array[String] = ["houseDoor", "exitDoor", "bin", "bed", "cart", "rootShrine", "farmGate", "stove"]
const GEAR_SLOTS: Array[String] = ["weapon", "offHand", "head", "body", "feet", "trinket1", "trinket2"]
const ROOTSTONES: Array[String] = ["verdant"]
## Mossdeep floors with a checkpoint stone (spec 6.1): the entrance, 4 and 8.
const CHECKPOINT_FLOORS: Array[int] = [0, 4, 8]
const MOSSDEEP_FLOORS := 8
const SEASONS: Array[String] = ["spring", "summer", "fall", "winter"]
const WEATHERS: Array[String] = ["sunny", "cloudy", "rain", "storm", "snow"]
const LOCATIONS: Array[String] = ["farm", "house", "lowmere", "woods", "mossdeep", "clinic"]
const FACINGS: Array[String] = ["n", "s", "e", "w"]
const MILESTONE_IDS: Array[String] = [
	"firstTill", "firstPlant", "firstHarvest", "firstShipment", "gold1k", "gold10k", "allCrops", "fullYear",
]


static func validate_file(file: Variant) -> String:
	return _file(file, "file")


static func validate_state(state: Variant) -> String:
	return _state(state, "state")


# --- primitives: each returns true when `v` is valid ---------------------------------------------------


static func _is_num(v: Variant) -> bool:
	if typeof(v) == TYPE_INT:
		return true
	if typeof(v) == TYPE_FLOAT:
		var f: float = v
		return is_finite(f)
	return false


## zod 4's `.int()`: a whole number with |v| <= 2^53 - 1, whether held as an int or a float.
static func _is_int(v: Variant) -> bool:
	if typeof(v) == TYPE_INT:
		var i: int = v
		return absi(i) <= SaveMigrate.MAX_SAFE_INTEGER
	if typeof(v) == TYPE_FLOAT:
		var f: float = v
		return is_finite(f) and f == floorf(f) and absf(f) <= float(SaveMigrate.MAX_SAFE_INTEGER)
	return false


## An integer within [lo, hi]. Compared as floats, so an out-of-range huge value cannot overflow.
static func _is_int_in(v: Variant, lo: float, hi: float) -> bool:
	if not _is_int(v):
		return false
	var f: float = v
	return f >= lo and f <= hi


static func _is_enum(v: Variant, allowed: Array[String]) -> bool:
	return typeof(v) == TYPE_STRING and allowed.has(v)


static func _is_item(v: Variant) -> bool:
	return typeof(v) == TYPE_STRING and ItemData.ITEMS.has(v)


static func _is_crop(v: Variant) -> bool:
	return typeof(v) == TYPE_STRING and CropData.CROP_IDS.has(v)


static func _key(path: String, key: String) -> String:
	return "%s.%s" % [path, key]


static func _at(path: String, i: int) -> String:
	return "%s[%d]" % [path, i]


## `v` as a Dictionary, or an empty one when it is not (callers check `v` is a Dictionary first).
static func _dict(v: Variant) -> Dictionary:
	var out: Dictionary = v if typeof(v) == TYPE_DICTIONARY else {}
	return out


static func _arr(v: Variant) -> Array:
	var out: Array = v if typeof(v) == TYPE_ARRAY else []
	return out


# --- composite schemas ---------------------------------------------------------------------------------


static func _calendar(v: Variant, path: String) -> String:
	if typeof(v) != TYPE_DICTIONARY:
		return path
	var c := _dict(v)
	if not _is_int_in(c.get("year"), 1, INF):
		return _key(path, "year")
	if not _is_enum(c.get("season"), SEASONS):
		return _key(path, "season")
	if not _is_int_in(c.get("day"), 1, Balance.SEASON_DAYS):
		return _key(path, "day")
	if not _is_int_in(c.get("minute"), 0, Balance.PASS_OUT_MINUTE):
		return _key(path, "minute")
	return ""


static func _file(v: Variant, path: String) -> String:
	if typeof(v) != TYPE_DICTIONARY:
		return path
	var f := _dict(v)
	if not _is_int(f.get("version")):
		return _key(path, "version")
	if typeof(f.get("savedAt")) != TYPE_STRING:
		return _key(path, "savedAt")
	if not _is_int_in(f.get("playTimeMs"), 0, INF):
		return _key(path, "playTimeMs")
	var summary_path := _key(path, "summary")
	var sv: Variant = f.get("summary")
	if typeof(sv) != TYPE_DICTIONARY:
		return summary_path
	var s := _dict(sv)
	if typeof(s.get("farmName")) != TYPE_STRING:
		return _key(summary_path, "farmName")
	if typeof(s.get("playerName")) != TYPE_STRING:
		return _key(summary_path, "playerName")
	var cal := _calendar(s.get("calendar"), _key(summary_path, "calendar"))
	if cal != "":
		return cal
	if not _is_int_in(s.get("gold"), 0, INF):
		return _key(summary_path, "gold")
	return _state(f.get("state"), _key(path, "state"))


static func _state(v: Variant, path: String) -> String:
	if typeof(v) != TYPE_DICTIONARY:
		return path
	var s := _dict(v)
	if not (_is_int(s.get("version")) and s.get("version") == SaveMigrate.CURRENT_SAVE_VERSION):
		return _key(path, "version")
	for k: String in ["seed", "rng"]:
		if not _is_int(s.get(k)):
			return _key(path, k)
	for k: String in ["farmName", "playerName"]:
		if typeof(s.get(k)) != TYPE_STRING:
			return _key(path, k)
	var e := _calendar(s.get("calendar"), _key(path, "calendar"))
	if e != "":
		return e
	e = _weather(s.get("weather"), _key(path, "weather"))
	if e != "":
		return e
	e = _player(s.get("player"), _key(path, "player"))
	if e != "":
		return e
	if not _is_int_in(s.get("canCharges"), 0, Balance.CAN_CHARGES):
		return _key(path, "canCharges")
	if not _is_int_in(s.get("activeSlot"), 0, 7):
		return _key(path, "activeSlot")
	if not _is_int_in(s.get("selectedQuick"), 0, 2):
		return _key(path, "selectedQuick")
	e = _quick_slots(s.get("quickSlots"), _key(path, "quickSlots"))
	if e != "":
		return e
	e = _bag(s.get("bag"), _key(path, "bag"))
	if e != "":
		return e
	e = _bin(s.get("bin"), _key(path, "bin"))
	if e != "":
		return e
	for k: String in ["gold", "pendingGold"]:
		if not _is_int_in(s.get(k), 0, INF):
			return _key(path, k)
	if typeof(s.get("wakeHalfStamina")) != TYPE_BOOL:
		return _key(path, "wakeHalfStamina")
	e = _maps(s.get("maps"), _key(path, "maps"))
	if e != "":
		return e
	e = _milestones(s.get("milestones"), _key(path, "milestones"))
	if e != "":
		return e
	e = _harvested(s.get("harvested"), _key(path, "harvested"))
	if e != "":
		return e
	e = _tutorial(s.get("tutorial"), _key(path, "tutorial"))
	if e != "":
		return e
	return _v3(s, path)


## The keys save version 3 adds (spec 5.1). Ids not defined yet (gear, dishes, villagers) are checked as strings.
static func _v3(s: Dictionary, path: String) -> String:
	for k: String in ["hp", "xp", "kindlings"]:
		if not _is_int_in(s.get(k), 0, INF):
			return _key(path, k)
	if not _is_int_in(s.get("level"), 1, INF):
		return _key(path, "level")
	var e := _gear(s.get("gear"), _key(path, "gear"))
	if e != "":
		return e
	e = _buff(s.get("buff"), _key(path, "buff"))
	if e != "":
		return e
	e = _deeps(s.get("deeps"), _key(path, "deeps"))
	if e != "":
		return e
	e = _bin(s.get("lootSinceSleep"), _key(path, "lootSinceSleep"))
	if e != "":
		return e
	e = _elites(s.get("elites"), _key(path, "elites"))
	if e != "":
		return e
	e = _list_of(s.get("rootstones"), _key(path, "rootstones"), func(v: Variant) -> bool: return _is_enum(v, ROOTSTONES))
	if e != "":
		return e
	return _list_of(s.get("talked"), _key(path, "talked"), func(v: Variant) -> bool: return typeof(v) == TYPE_STRING)


static func _gear(v: Variant, path: String) -> String:
	if typeof(v) != TYPE_DICTIONARY:
		return path
	var g := _dict(v)
	for slot: String in GEAR_SLOTS:
		if not g.has(slot):
			return _key(path, slot)
		if g[slot] != null and typeof(g[slot]) != TYPE_STRING:
			return _key(path, slot)
	return ""


static func _buff(v: Variant, path: String) -> String:
	if v == null:
		return ""
	if typeof(v) != TYPE_DICTIONARY:
		return path
	var b := _dict(v)
	if typeof(b.get("id")) != TYPE_STRING:
		return _key(path, "id")
	if not _is_int_in(b.get("untilMinute"), 0, INF):
		return _key(path, "untilMinute")
	return ""


static func _deeps(v: Variant, path: String) -> String:
	if typeof(v) != TYPE_DICTIONARY:
		return path
	var mp := _key(path, "mossdeep")
	var mv: Variant = _dict(v).get("mossdeep")
	if typeof(mv) != TYPE_DICTIONARY:
		return mp
	var m := _dict(mv)
	for k: String in ["open", "cleared"]:
		if typeof(m.get(k)) != TYPE_BOOL:
			return _key(mp, k)
	return _list_of(m.get("checkpoints"), _key(mp, "checkpoints"), func(c: Variant) -> bool:
		return _is_int(c) and CHECKPOINT_FLOORS.has(int(_num_or_nan(c))))


static func _elites(v: Variant, path: String) -> String:
	if typeof(v) != TYPE_DICTIONARY:
		return path
	var mp := _key(path, "mossmaw")
	var mv: Variant = _dict(v).get("mossmaw")
	if typeof(mv) != TYPE_DICTIONARY:
		return mp
	var m := _dict(mv)
	var season: Variant = m.get("defeatedSeason")
	if not m.has("defeatedSeason") or (season != null and typeof(season) != TYPE_STRING):
		return _key(mp, "defeatedSeason")
	return ""


## An array whose every element passes `ok`; the path names the first that does not.
static func _list_of(v: Variant, path: String, ok: Callable) -> String:
	if typeof(v) != TYPE_ARRAY:
		return path
	var list := _arr(v)
	for i: int in list.size():
		if not ok.call(list[i]):
			return _at(path, i)
	return ""


static func _num_or_nan(v: Variant) -> float:
	if typeof(v) == TYPE_INT or typeof(v) == TYPE_FLOAT:
		var f: float = v
		return f
	return NAN


static func _weather(v: Variant, path: String) -> String:
	if typeof(v) != TYPE_DICTIONARY:
		return path
	var w := _dict(v)
	for k: String in ["today", "tomorrow"]:
		if not _is_enum(w.get(k), WEATHERS):
			return _key(path, k)
	return ""


static func _player(v: Variant, path: String) -> String:
	if typeof(v) != TYPE_DICTIONARY:
		return path
	var p := _dict(v)
	if not _is_enum(p.get("location"), LOCATIONS):
		return _key(path, "location")
	for k: String in ["x", "z"]:
		if not _is_num(p.get(k)):
			return _key(path, k)
	if not _is_enum(p.get("facing"), FACINGS):
		return _key(path, "facing")
	var energy: Variant = p.get("energy")
	if not _is_num(energy):
		return _key(path, "energy")
	var en: float = energy
	if en < 0.0 or en > Balance.MAX_ENERGY:
		return _key(path, "energy")
	if not _is_int_in(p.get("floor"), 0, MOSSDEEP_FLOORS):
		return _key(path, "floor")
	return ""


static func _quick_slots(v: Variant, path: String) -> String:
	if typeof(v) != TYPE_ARRAY:
		return path
	var q := _arr(v)
	if q.size() != 3:
		return path
	for i: int in 3:
		if q[i] != null and not _is_int_in(q[i], 0, Balance.BAG_SLOTS - 1):
			return _at(path, i)
	return ""


static func _bag(v: Variant, path: String) -> String:
	if typeof(v) != TYPE_ARRAY:
		return path
	var bag := _arr(v)
	if bag.size() != Balance.BAG_SLOTS:
		return path
	for i: int in bag.size():
		var cell: Variant = bag[i]
		if cell == null:
			continue
		var cp := _at(path, i)
		if typeof(cell) != TYPE_DICTIONARY:
			return cp
		var stack := _dict(cell)
		if not _is_item(stack.get("id")):
			return _key(cp, "id")
		if not _is_int_in(stack.get("qty"), 1, Balance.STACK_MAX):
			return _key(cp, "qty")
	return ""


static func _bin(v: Variant, path: String) -> String:
	if typeof(v) != TYPE_ARRAY:
		return path
	var bin := _arr(v)
	for i: int in bin.size():
		var ep := _at(path, i)
		if typeof(bin[i]) != TYPE_DICTIONARY:
			return ep
		var entry := _dict(bin[i])
		if not _is_item(entry.get("id")):
			return _key(ep, "id")
		if not _is_int_in(entry.get("qty"), 1, INF):
			return _key(ep, "qty")
	return ""


static func _maps(v: Variant, path: String) -> String:
	if typeof(v) != TYPE_DICTIONARY:
		return path
	var maps := _dict(v)
	for k: String in ["farm", "house"]:
		var e := _grid(maps.get(k), _key(path, k))
		if e != "":
			return e
	return ""


static func _grid(v: Variant, path: String) -> String:
	if typeof(v) != TYPE_DICTIONARY:
		return path
	var g := _dict(v)
	if not _is_int_in(g.get("width"), 1, INF):
		return _key(path, "width")
	if not _is_int_in(g.get("height"), 1, INF):
		return _key(path, "height")
	if typeof(g.get("tiles")) != TYPE_ARRAY:
		return _key(path, "tiles")
	var tiles := _arr(g.get("tiles"))
	var w: float = g.get("width")
	var h: float = g.get("height")
	for i: int in tiles.size():
		var e := _tile(tiles[i], _at(_key(path, "tiles"), i))
		if e != "":
			return e
	if float(tiles.size()) != w * h:
		return _key(path, "tiles")
	return ""


static func _tile(v: Variant, path: String) -> String:
	if typeof(v) != TYPE_DICTIONARY:
		return path
	var t := _dict(v)
	if not _is_enum(t.get("kind"), TILE_KINDS):
		return _key(path, "kind")
	if t.has("feature") and not _is_enum(t["feature"], FEATURES):
		return _key(path, "feature")
	if t.has("hits") and not _is_int_in(t["hits"], 0, INF):
		return _key(path, "hits")
	if t.has("watered") and typeof(t["watered"]) != TYPE_BOOL:
		return _key(path, "watered")
	if t.has("crop"):
		var cp := _key(path, "crop")
		if typeof(t["crop"]) != TYPE_DICTIONARY:
			return cp
		var crop := _dict(t["crop"])
		if not _is_crop(crop.get("id")):
			return _key(cp, "id")
		if not _is_int_in(crop.get("age"), 0, INF):
			return _key(cp, "age")
		if typeof(crop.get("regrowing")) != TYPE_BOOL:
			return _key(cp, "regrowing")
	return ""


static func _milestones(v: Variant, path: String) -> String:
	if typeof(v) != TYPE_ARRAY:
		return path
	var list := _arr(v)
	for i: int in list.size():
		if not _is_enum(list[i], MILESTONE_IDS):
			return _at(path, i)
	return ""


static func _harvested(v: Variant, path: String) -> String:
	if typeof(v) != TYPE_DICTIONARY:
		return path
	var h := _dict(v)
	for k: Variant in h:
		var kp := _key(path, str(k))
		if not _is_crop(k):
			return kp
		if not _is_int_in(h[k], 0, INF):
			return kp
	return ""


static func _tutorial(v: Variant, path: String) -> String:
	if typeof(v) != TYPE_DICTIONARY:
		return path
	var t := _dict(v)
	var lesson: Variant = t.get("lesson")
	var lesson_ok: bool = typeof(lesson) == TYPE_STRING and (
		Lessons.LESSON_ORDER.has(lesson) or lesson == "complete" or lesson == "off"
	)
	if not lesson_ok:
		return _key(path, "lesson")
	if not _is_int_in(t.get("count"), 0, INF):
		return _key(path, "count")
	var np := _key(path, "notesSeen")
	if typeof(t.get("notesSeen")) != TYPE_ARRAY:
		return np
	var notes := _arr(t.get("notesSeen"))
	for i: int in notes.size():
		if not _is_enum(notes[i], Lessons.NOTE_IDS):
			return _at(np, i)
	if typeof(t.get("gifted")) != TYPE_BOOL:
		return _key(path, "gifted")
	return ""
