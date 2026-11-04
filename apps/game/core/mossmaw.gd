class_name Mossmaw
extends RefCounted
## Mossmaw, the elite Gloamed bristleboar of Lowmere Woods (M1 spec 6.4): appears once Mossdeep is cleared (Gloam stage 2),
## respawns once per season (`elites.mossmaw.defeatedSeason`) and always drops one Mossmaw tusk, a unique material that is
## never lost (ARPG 9.1).

const LEVEL := 7
## Where the clearing marked by torn earth is (draft).
const CLEARING := Vector2(70.5, 60.5)


## "spring-1": the season and year, as stored in `defeatedSeason`.
static func season_key(cal: Dictionary) -> String:
	var season: String = cal["season"]
	var year: int = cal["year"]
	return "%s-%d" % [season, year]


static func should_spawn(state: Dictionary) -> bool:
	var deeps: Dictionary = state["deeps"]
	var m: Dictionary = deeps["mossdeep"]
	var cleared: bool = m["cleared"]
	if not cleared:
		return false
	var elites: Dictionary = state["elites"]
	var mm: Dictionary = elites["mossmaw"]
	var cal: Dictionary = state["calendar"]
	return mm["defeatedSeason"] != season_key(cal)


## Mossmaw falls: 70 XP (10 x level 7), one tusk, and the season is recorded. With a full bag nothing happens.
static func award(state: Dictionary) -> Dictionary:
	var bag: Array = state["bag"]
	var added := Bag.add_item(bag, "mossmawTusk", 1)
	var overflow: int = added["overflow"]
	if overflow > 0:
		return GameStateUtil.fail(state, "bagFull")
	var out := state.duplicate(true)
	out["bag"] = added["bag"]
	var elites: Dictionary = out["elites"]
	var mm: Dictionary = elites["mossmaw"]
	var cal: Dictionary = out["calendar"]
	mm["defeatedSeason"] = season_key(cal)
	var level: int = out["level"]
	var xp: int = out["xp"]
	var gain := Progression.monster_xp(LEVEL)
	var r := Progression.add_xp(level, xp, gain)
	out["level"] = r["level"]
	out["xp"] = r["xp"]
	var gained: int = r["levels_gained"]
	if gained > 0:
		var new_level: int = out["level"]
		out["hp"] = Progression.max_hp(new_level)
	return GameStateUtil.result(out, [
		{"type": "eliteDefeated", "elite": "mossmaw"},
		{"type": "xpGained", "amount": gain},
		{"type": "itemGained", "item": "mossmawTusk"},
	])
