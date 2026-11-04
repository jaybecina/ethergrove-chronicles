class_name EnemyAI
extends RefCounted
## Pure enemy state machine (M1 spec 6.4 and 7.2): idle, chase, telegraph, attack, recover, staggered, dead. Enemies are
## Dictionaries {id, level, hp, max_hp, x, y, state, timer_ms}; `step` returns a new one plus events, and never allocates
## per frame beyond that. The scene layer turns `hit` events into damage through `Combat.resolve_hit`.

## An enemy notices the player inside this distance (draft).
const AGGRO_RANGE := 10.0
## Pause after an attack before the next move (draft).
const RECOVER_MS := 600
## How long an ordinary staggering hit stuns (draft).
const HIT_STUN_MS := 400
## Wisps shoot only inside this distance.
const WISP_FIRE_RANGE := 12.0


static func make(id: String, level: int, x: float, y: float) -> Dictionary:
	var lvl := Enemies.clamp_level(id, level)
	var hp := Enemies.hp(id, lvl)
	return {"id": id, "level": lvl, "hp": hp, "max_hp": hp, "x": x, "y": y, "state": "idle", "timer_ms": 0}


static func _def(e: Dictionary) -> Dictionary:
	var id: String = e["id"]
	return Enemies.def(id)


static func _pos(e: Dictionary) -> Vector2:
	var x: float = e["x"]
	var y: float = e["y"]
	return Vector2(x, y)


static func _moved(e: Dictionary, dir: Vector2, dist: float) -> void:
	var p := _pos(e) + dir * dist
	e["x"] = p.x
	e["y"] = p.y


## One simulation step of `dt_ms` toward `target` (the player's position). Returns {enemy, events}.
static func step(enemy: Dictionary, target: Vector2, dt_ms: int) -> Dictionary:
	var e := enemy.duplicate()
	var events: Array = []
	var state: String = e["state"]
	if state == "dead":
		return {"enemy": e, "events": events}
	var def := _def(e)
	var speed: float = def["speed"]
	var timer: int = e["timer_ms"]
	var to_target := target - _pos(e)
	var dist := to_target.length()
	var dir := to_target / dist if dist > 0.0001 else Vector2.ZERO
	var is_wisp: bool = def.has("keep_min")
	match state:
		"idle":
			if dist <= AGGRO_RANGE:
				e["state"] = "chase"
		"chase":
			if is_wisp:
				var keep_min: float = def["keep_min"]
				var keep_max: float = def["keep_max"]
				if dist < keep_min:
					_moved(e, -dir, speed * dt_ms / 1000.0)
				elif dist > keep_max:
					_moved(e, dir, speed * dt_ms / 1000.0)
				elif dist <= WISP_FIRE_RANGE:
					e["state"] = "telegraph"
					e["timer_ms"] = def["telegraph_ms"]
			else:
				var reach: float = def["reach"]
				if dist <= reach:
					e["state"] = "telegraph"
					e["timer_ms"] = def["telegraph_ms"]
				else:
					_moved(e, dir, minf(speed * dt_ms / 1000.0, dist))
		"telegraph":
			timer -= dt_ms
			if timer > 0:
				e["timer_ms"] = timer
			else:
				events.append(_hit_event(e, def))
				e["state"] = "recover"
				e["timer_ms"] = RECOVER_MS
		"recover", "staggered":
			timer -= dt_ms
			if timer > 0:
				e["timer_ms"] = timer
			else:
				e["state"] = "chase"
				e["timer_ms"] = 0
	return {"enemy": e, "events": events}


static func _hit_event(e: Dictionary, def: Dictionary) -> Dictionary:
	var id: String = e["id"]
	var level: int = e["level"]
	var radius: float = def["radius"]
	var reach: float = def["reach"]
	var hit := {
		"type": "hit", "enemy_id": id, "power": Enemies.attack_power(id, level), "multiplier": 1.0,
		"parry_stagger_ms": def["parry_stagger_ms"], "radius": radius, "reach": reach,
		"x": e["x"], "y": e["y"], "projectile": false,
	}
	if def.has("projectile_speed"):
		hit["projectile"] = true
		hit["speed"] = def["projectile_speed"]
	return hit


## Applies `amount` damage. `heavy` is whether the player's hit was a heavy attack. Interrupts the enemy when its
## `stagger` rule says this hit staggers: "any" every hit, "heavy" only heavy hits; others never from plain hits.
static func take_damage(enemy: Dictionary, amount: int, heavy: bool) -> Dictionary:
	var e := enemy.duplicate()
	var state: String = e["state"]
	if state == "dead":
		return e
	var hp: int = e["hp"]
	hp = maxi(0, hp - amount)
	e["hp"] = hp
	if hp == 0:
		e["state"] = "dead"
		e["timer_ms"] = 0
		return e
	var rule: String = _def(e)["stagger"]
	if rule == "any" or (rule == "heavy" and heavy):
		e["state"] = "staggered"
		e["timer_ms"] = HIT_STUN_MS
	return e


## Forces a stagger of `ms` (a parry). Does nothing to a dead enemy or when `ms` is not positive.
static func stagger(enemy: Dictionary, ms: int) -> Dictionary:
	var e := enemy.duplicate()
	var state: String = e["state"]
	if state == "dead" or ms <= 0:
		return e
	e["state"] = "staggered"
	e["timer_ms"] = ms
	return e
