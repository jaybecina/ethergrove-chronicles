class_name Enemies
extends RefCounted
## Gloamed enemy data (M1 spec 6.4). All numbers are drafts. Families with levels scale linearly; the elite and the boss
## are fixed. `telegraph_ms` is the wind-up before the attack lands (>= 500 ms, bosses >= 700 ms).

const IDS: Array[String] = ["burrower", "brute", "wisp", "mossmaw", "bramble_matron"]

const DEFS := {
	"burrower": {
		"name": "Gloamed burrower", "levels": [1, 5], "hp_base": 40, "hp_per_level": 10,
		"power_base": 8, "power_per_level": 2, "telegraph_ms": 500, "parry_stagger_ms": 1500,
		"stagger": "any", "speed": 3.6, "reach": 1.2, "radius": 0.0,
	},
	"brute": {
		"name": "Gloamed brute", "levels": [3, 8], "hp_base": 160, "hp_per_level": 25,
		"power_base": 22, "power_per_level": 3, "telegraph_ms": 900, "parry_stagger_ms": 0,
		"stagger": "heavy", "speed": 1.6, "reach": 1.6, "radius": 2.5,
	},
	"wisp": {
		"name": "Gloamed wisp", "levels": [2, 8], "hp_base": 30, "hp_per_level": 6,
		"power_base": 10, "power_per_level": 2, "telegraph_ms": 1000, "parry_stagger_ms": 0,
		"stagger": "any", "speed": 2.4, "reach": 0.0, "radius": 0.0,
		"keep_min": 6.0, "keep_max": 9.0, "projectile_speed": 12.0,
	},
	"mossmaw": {
		"name": "Mossmaw", "levels": [7, 7], "hp_fixed": 900, "power_fixed": 30, "telegraph_ms": 800,
		"parry_stagger_ms": 2000, "stagger": "parried_charge", "speed": 2.8, "reach": 2.0, "radius": 0.0,
		"swipe_power": 18, "swipes": 2,
	},
	"bramble_matron": {
		"name": "Bramble Matron", "levels": [10, 10], "hp_fixed": 2600, "power_fixed": 24, "telegraph_ms": 700,
		"parry_stagger_ms": 0, "stagger": "phase_change", "speed": 1.8, "reach": 2.2, "radius": 3.0,
		"root_burst_power": 30, "wall_interval_s": 20, "sapling_interval_s": 25, "sapling_count": 3,
		"sapling_hp": 20, "sapling_explode_power": 12, "sapling_fuse_s": 6, "phase2_hp_fraction": 0.5,
	},
}


static func def(id: String) -> Dictionary:
	var out: Dictionary = DEFS[id]
	return out


## Hit points at `level` (the elite and boss ignore it).
static func hp(id: String, level: int) -> int:
	var d := def(id)
	if d.has("hp_fixed"):
		var fixed: int = d["hp_fixed"]
		return fixed
	var base: int = d["hp_base"]
	var per: int = d["hp_per_level"]
	return base + per * level


## Attack power at `level` (the elite and boss ignore it).
static func attack_power(id: String, level: int) -> int:
	var d := def(id)
	if d.has("power_fixed"):
		var fixed: int = d["power_fixed"]
		return fixed
	var base: int = d["power_base"]
	var per: int = d["power_per_level"]
	return base + per * level


## `level` clamped into the enemy's level range.
static func clamp_level(id: String, level: int) -> int:
	var range_: Array = def(id)["levels"]
	var lo: int = range_[0]
	var hi: int = range_[1]
	return clampi(level, lo, hi)
