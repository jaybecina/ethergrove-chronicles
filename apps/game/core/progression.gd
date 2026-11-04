class_name Progression
extends RefCounted
## Levels and XP (M1 spec 7.4, October spec 6.1). No skill points in M1.

const BOSS_XP := 1000
const FIRST_FLOOR_XP := 50
const HARVEST_XP := 1


## XP needed from `level` to `level + 1`: `round(100 x level^1.5)`.
static func xp_to_next(level: int) -> int:
	return roundi(100.0 * pow(float(level), 1.5))


static func max_hp(level: int) -> int:
	return 100 + 8 * (level - 1)


static func max_stamina(level: int) -> int:
	return 100 + 3 * (level - 1)


static func monster_xp(monster_level: int) -> int:
	return 10 * monster_level


## Adds `gain` XP (negative is ignored). Returns {level, xp, levels_gained}; surplus XP carries into the next level.
static func add_xp(level: int, xp: int, gain: int) -> Dictionary:
	var lvl := level
	var total := xp + maxi(0, gain)
	var gained := 0
	while total >= xp_to_next(lvl):
		total -= xp_to_next(lvl)
		lvl += 1
		gained += 1
	return {"level": lvl, "xp": total, "levels_gained": gained}
