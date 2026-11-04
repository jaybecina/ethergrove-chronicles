class_name BossMatron
extends RefCounted
## The Bramble Matron, Mossdeep's boss on floor 8 (M1 spec 6.4). Pure state machine like `EnemyAI`: `step` returns a new
## boss plus events, `take_damage` and `damage_sapling` return new bosses. Numbers (all drafts except the spec's):
## - Phase 1: thorn walls rise and split the arena into three lanes every 20 s (up for 8 s).
## - At 50% HP she staggers for 2 s (the only time she can be staggered) and enters phase 2: every 25 s she summons 3
##   saplings (20 HP, slow, explode for 12 in a 2 m circle after 6 s); the first group comes 3 s after the change.
## - Attacks alternate a thorn lash (24, in front, reach 2.2 m) and a root burst (30, 3 m circle); both telegraph 0.7 s.
## Boss dictionary: {id, hp, max_hp, x, y, phase, state, timer_ms, attack_index, walls_up, walls_cd_ms, walls_left_ms,
## summon_cd_ms, saplings: [{x, y, hp, fuse_ms}], phase_announced, died_announced}.
## States: idle, chase, telegraph, recover, phase_change, dead.

const AGGRO_RANGE := 12.0
const RECOVER_MS := 900
const WALLS_CD_MS := 20000
const WALLS_UP_MS := 8000
const PHASE_CHANGE_MS := 2000
const SUMMON_FIRST_MS := 3000
const SUMMON_EVERY_MS := 25000
const SAPLING_COUNT := 3
const SAPLING_HP := 20
const SAPLING_FUSE_MS := 6000
const SAPLING_SPEED := 1.2
const SAPLING_POWER := 12
const SAPLING_RADIUS := 2.0
const SAPLING_RING := 3.0
const LASH_POWER := 24
const BURST_POWER := 30
const BURST_RADIUS := 3.0
const REACH := 2.2
const TELEGRAPH_MS := 700
const SPEED := 1.8


static func make(x: float, y: float) -> Dictionary:
	var hp: int = Enemies.hp("bramble_matron", 10)
	return {
		"id": "bramble_matron", "hp": hp, "max_hp": hp, "x": x, "y": y, "phase": 1, "state": "idle", "timer_ms": 0, "attack_index": 0,
		"walls_up": false, "walls_cd_ms": WALLS_CD_MS, "walls_left_ms": 0, "summon_cd_ms": 0, "saplings": [],
		"phase_announced": true, "died_announced": false,
	}


## One step of `dt_ms` toward `target` (the player). Returns {boss, events}.
static func step(boss: Dictionary, target: Vector2, dt_ms: int) -> Dictionary:
	var b := boss.duplicate(true)
	var events: Array = []
	var state: String = b["state"]
	if state == "dead":
		var announced: bool = b["died_announced"]
		if not announced:
			b["died_announced"] = true
			events.append({"type": "died"})
		return {"boss": b, "events": events}
	var bx: float = b["x"]
	var by: float = b["y"]
	var pos := Vector2(bx, by)
	var dist := pos.distance_to(target)
	if state == "idle":
		if dist <= AGGRO_RANGE:
			b["state"] = "chase"
		return {"boss": b, "events": events}
	_step_walls(b, events, dt_ms)
	_step_summons(b, events, dt_ms)
	_step_saplings(b, events, target, dt_ms)
	var timer: int = b["timer_ms"]
	match state:
		"chase":
			if dist <= REACH:
				var index: int = b["attack_index"]
				b["state"] = "telegraph"
				b["timer_ms"] = TELEGRAPH_MS
				b["attack"] = "lash" if index % 2 == 0 else "burst"
			else:
				var dir := (target - pos) / dist
				var moved := pos + dir * minf(SPEED * dt_ms / 1000.0, dist - REACH * 0.5)
				b["x"] = moved.x
				b["y"] = moved.y
		"telegraph":
			timer -= dt_ms
			if timer > 0:
				b["timer_ms"] = timer
			else:
				events.append(_hit_event(b))
				var index2: int = b["attack_index"]
				b["attack_index"] = index2 + 1
				b["state"] = "recover"
				b["timer_ms"] = RECOVER_MS
		"recover":
			timer -= dt_ms
			if timer > 0:
				b["timer_ms"] = timer
			else:
				b["state"] = "chase"
				b["timer_ms"] = 0
		"phase_change":
			var announced2: bool = b["phase_announced"]
			if not announced2:
				b["phase_announced"] = true
				events.append({"type": "phaseChanged", "phase": 2})
			timer -= dt_ms
			if timer > 0:
				b["timer_ms"] = timer
			else:
				b["state"] = "chase"
				b["timer_ms"] = 0
	return {"boss": b, "events": events}


static func _hit_event(b: Dictionary) -> Dictionary:
	var attack: String = b["attack"]
	var burst := attack == "burst"
	return {
		"type": "hit", "attack": attack, "power": BURST_POWER if burst else LASH_POWER, "multiplier": 1.0,
		"parry_stagger_ms": 0, "radius": BURST_RADIUS if burst else 0.0, "reach": REACH,
		"telegraph_ms": TELEGRAPH_MS, "x": b["x"], "y": b["y"], "projectile": false,
	}


static func _step_walls(b: Dictionary, events: Array, dt_ms: int) -> void:
	var phase: int = b["phase"]
	if phase != 1:
		return
	var up: bool = b["walls_up"]
	if up:
		var left: int = b["walls_left_ms"]
		left -= dt_ms
		if left <= 0:
			b["walls_up"] = false
			b["walls_left_ms"] = 0
			b["walls_cd_ms"] = WALLS_CD_MS
			events.append({"type": "wallsLowered"})
		else:
			b["walls_left_ms"] = left
		return
	var cd: int = b["walls_cd_ms"]
	cd -= dt_ms
	if cd <= 0:
		b["walls_up"] = true
		b["walls_left_ms"] = WALLS_UP_MS
		b["walls_cd_ms"] = 0
		events.append({"type": "wallsRaised"})
	else:
		b["walls_cd_ms"] = cd


static func _step_summons(b: Dictionary, events: Array, dt_ms: int) -> void:
	var phase: int = b["phase"]
	if phase != 2:
		return
	var cd: int = b["summon_cd_ms"]
	cd -= dt_ms
	if cd > 0:
		b["summon_cd_ms"] = cd
		return
	b["summon_cd_ms"] = SUMMON_EVERY_MS
	var saplings: Array = b["saplings"]
	var cx: float = b["x"]
	var cy: float = b["y"]
	for k: int in SAPLING_COUNT:
		var angle := TAU * k / SAPLING_COUNT
		saplings.append({
			"x": cx + cos(angle) * SAPLING_RING, "y": cy + sin(angle) * SAPLING_RING,
			"hp": SAPLING_HP, "fuse_ms": SAPLING_FUSE_MS,
		})
	events.append({"type": "saplingsSummoned", "count": SAPLING_COUNT})


static func _step_saplings(b: Dictionary, events: Array, target: Vector2, dt_ms: int) -> void:
	var saplings: Array = b["saplings"]
	var keep: Array = []
	for entry: Variant in saplings:
		var s: Dictionary = entry
		var fuse: int = s["fuse_ms"]
		fuse -= dt_ms
		var sx: float = s["x"]
		var sy: float = s["y"]
		if fuse <= 0:
			events.append({
				"type": "saplingExploded", "power": SAPLING_POWER, "radius": SAPLING_RADIUS, "multiplier": 1.0,
				"parry_stagger_ms": 0, "x": sx, "y": sy,
			})
			continue
		s["fuse_ms"] = fuse
		var pos := Vector2(sx, sy)
		var to := target - pos
		if to.length() > 0.5:
			var moved := pos + to.normalized() * SAPLING_SPEED * dt_ms / 1000.0
			s["x"] = moved.x
			s["y"] = moved.y
		keep.append(s)
	b["saplings"] = keep


## Applies `amount` damage. Hits never stagger her; dropping to 50% starts the phase change (a 2 s stagger), and 0 kills.
static func take_damage(boss: Dictionary, amount: int) -> Dictionary:
	var b := boss.duplicate(true)
	var state: String = b["state"]
	if state == "dead":
		return b
	var hp: int = b["hp"]
	var max_hp: int = b["max_hp"]
	hp = maxi(0, hp - amount)
	b["hp"] = hp
	if hp == 0:
		b["state"] = "dead"
		b["timer_ms"] = 0
		b["saplings"] = []
		b["walls_up"] = false
		return b
	if state == "idle":
		b["state"] = "chase"
	var phase: int = b["phase"]
	if phase == 1 and hp * 2 <= max_hp:
		b["phase"] = 2
		b["state"] = "phase_change"
		b["timer_ms"] = PHASE_CHANGE_MS
		b["walls_up"] = false
		b["walls_left_ms"] = 0
		b["summon_cd_ms"] = SUMMON_FIRST_MS
		b["phase_announced"] = false
	return b


## Hurts sapling `index`; at 0 HP it is removed without exploding.
static func damage_sapling(boss: Dictionary, index: int, amount: int) -> Dictionary:
	var b := boss.duplicate(true)
	var saplings: Array = b["saplings"]
	if index < 0 or index >= saplings.size():
		return b
	var s: Dictionary = saplings[index]
	var hp: int = s["hp"]
	hp -= amount
	if hp <= 0:
		saplings.remove_at(index)
	else:
		s["hp"] = hp
	return b
