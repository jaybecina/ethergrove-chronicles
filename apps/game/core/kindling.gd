class_name Kindling
extends RefCounted
## The first Kindling (M1 spec 6.5): follows you in Mossdeep and Lowmere Woods only, lights a 6 m radius, and heals 5 HP
## every 15 s (draft) while you are below max HP. Pure rules; the glowing follower is a scene node.

const HEAL_AMOUNT := 5
const HEAL_EVERY_MS := 15000
const LIGHT_RADIUS := 6.0


## Where the Kindling comes along: awake (`kindlings` >= 1) and in the Woods or Mossdeep.
static func follows(kindlings: int, location: String) -> bool:
	return kindlings >= 1 and Zones.is_combat(location)


## `acc_ms` is the time spent hurt since the last heal. Returns {hp, acc_ms}; at full HP the timer rests at 0.
static func heal(hp: int, max_hp: int, acc_ms: int, dt_ms: int) -> Dictionary:
	if hp >= max_hp:
		return {"hp": hp, "acc_ms": 0}
	var acc := acc_ms + dt_ms
	var out_hp := hp
	if acc >= HEAL_EVERY_MS:
		acc -= HEAL_EVERY_MS
		out_hp = mini(max_hp, hp + HEAL_AMOUNT)
	return {"hp": out_hp, "acc_ms": acc}
