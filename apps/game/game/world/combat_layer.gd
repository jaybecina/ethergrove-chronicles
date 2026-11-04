class_name CombatLayer
extends Node3D
## Real-time combat in the zones where you fight ("woods", later "mossdeep"). It owns the player's PlayerCombat state, the
## enemies (EnemyActor) and their projectiles, reads the combat inputs, and applies hits and falls to the session state.
## All rules are the pure ones in core (`Combat`, `PlayerCombat`, `EnemyAI`, `Falling`, `Progression`, `WoodsSpawns`); this
## node is the glue. The loop runs at the session's fixed 50 ms step from the physics frames, so `tick` is testable
## without a window.
##
## State ownership: HP, XP and level live in the session state and are written in place (like `set_pose`); stamina, the
## state machine and the enemies belong to this layer and are not saved (stamina is full on load, spec 5.1).

const GameSessionScript := preload("res://game/autoload/game_session.gd")

## A swing reaches this far in front of the player, plus the target's own size (draft).
const LIGHT_REACH := 1.8
const HEAVY_REACH := 2.4
const SWING_HALF_ANGLE_DEG := 70.0
const PLAYER_RADIUS := 0.3
## Seconds a dead enemy lies there before it is removed.
const CORPSE_SECONDS := 1.5
const PROJECTILE_LIFE_S := 2.5
const PROJECTILE_RADIUS := 0.45
## The Bramble Matron's body radius for the player's swings.
const BOSS_SIZE := 1.0
## The arena room of floor 8 (Mossdeep.rooms(8)[2]) and where she stands; thorn wall rows split it into three lanes.
const THORN_ROWS: Array[int] = [6, 9]
## x ranges of the gaps in each thorn row (the lanes link in a zigzag).
const THORN_GAPS: Array[Vector2i] = [Vector2i(38, 39), Vector2i(41, 42)]

var session: GameSessionScript = null
var controller: PlayerController = null
## The EnemyActors alive or lying dead in this zone.
var enemies: Array[EnemyActor] = []
## Projectiles in flight: {x, y, dx, dy, speed, power, life}.
var projectiles: Array[Dictionary] = []
var pc: Dictionary = {}
var lock_id: String = ""
var hud_label: Label = null
## The Bramble Matron of floor 8 ({} when she is not here or has fallen), her actor, her sapling actors and the thorn walls.
var boss: Dictionary = {}
var boss_actor: EnemyActor = null
var sapling_actors: Array[EnemyActor] = []
var thorn_walls: StaticBody3D = null
var _thorns_visual: Node3D = null
## The Kindling that follows you where you fight, and the time since you were last healed by it.
var kindling: KindlingFollower = null
var _kindling_acc_ms: int = 0
var _time_s: float = 0.0

var _zone: String = ""
var _acc_ms: float = 0.0
var _attack_pressed := false
var _attack_released := false
var _dodge_pressed := false
var _lock_pressed := false
var _next_id := 0


func _ready() -> void:
	name = "CombatLayer"
	if session == null:
		session = get_node_or_null("/root/GameSession") as GameSessionScript
	var layer := CanvasLayer.new()
	layer.name = "CombatHud"
	add_child(layer)
	hud_label = Label.new()
	hud_label.name = "Vitals"
	hud_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hud_label.visible = false
	layer.add_child(hud_label)
	# Bottom-left, above the hotbar, clear of the clock and the lesson card at the top-left.
	hud_label.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_LEFT)
	hud_label.offset_left = 16.0
	hud_label.offset_top = -124.0
	hud_label.offset_bottom = -96.0
	pc = PlayerCombat.make(_max_stamina())
	kindling = KindlingFollower.new()
	add_child(kindling)


## Clears the zone's enemies and fills the new zone: a training dummy and, at night, the burrower packs in the Woods.
func enter_zone(zone: String) -> void:
	_zone = zone
	for actor: EnemyActor in enemies:
		remove_child(actor)
		actor.free()
	enemies.clear()
	projectiles.clear()
	_clear_boss()
	lock_id = ""
	if hud_label != null:
		hud_label.visible = Zones.is_combat(zone)
	if zone == "mossdeep":
		var player: Dictionary = session.state["player"]
		var floor_n: int = player["floor"]
		if floor_n == Mossdeep.FLOORS and not Mossdeep.boss_defeated(session.state):
			_spawn_boss()
		for e: Variant in Mossdeep.spawns(floor_n):
			var spec: Dictionary = e
			var id: String = spec["id"]
			var level: int = spec["level"]
			var x: float = spec["x"]
			var y: float = spec["y"]
			_add_actor(EnemyAI.make(id, level, x, y), false)
		return
	if zone != "woods":
		return
	if Mossmaw.should_spawn(session.state):
		_add_actor(EnemyAI.make("mossmaw", Mossmaw.LEVEL, Mossmaw.CLEARING.x, Mossmaw.CLEARING.y), false)
	var dummy := EnemyAI.make("burrower", 1, 8.5, 45.5)
	dummy["state"] = "idle"
	_add_actor(dummy, true)
	var cal: Dictionary = session.state["calendar"]
	var minute: int = cal["minute"]
	if WoodsSpawns.is_night(minute):
		for pack: Variant in WoodsSpawns.packs(WoodsSpawns.salt(cal)):
			for e: Variant in pack:
				var spec: Dictionary = e
				var id: String = spec["id"]
				var level: int = spec["level"]
				var x: float = spec["x"]
				var y: float = spec["y"]
				_add_actor(EnemyAI.make(id, level, x, y), false)


func _add_actor(data: Dictionary, passive: bool) -> EnemyActor:
	var actor := EnemyActor.new()
	_next_id += 1
	actor.name = "Enemy%d" % _next_id
	add_child(actor)
	actor.setup(data, passive)
	enemies.append(actor)
	return actor


func _max_stamina() -> float:
	if session == null or session.state.is_empty():
		return 100.0
	var level: int = session.state["level"]
	return float(Progression.max_stamina(level))


func _physics_process(delta: float) -> void:
	if session == null or session.state.is_empty() or controller == null:
		return
	var player: Dictionary = session.state["player"]
	var location: String = player["location"]
	if not Zones.is_combat(location) or session.screen != "game":
		_clear_latches()
		return
	_attack_pressed = _attack_pressed or Input.is_action_just_pressed(InputActions.ATTACK)
	_attack_released = _attack_released or Input.is_action_just_released(InputActions.ATTACK)
	_dodge_pressed = _dodge_pressed or Input.is_action_just_pressed(InputActions.DODGE)
	_lock_pressed = _lock_pressed or Input.is_action_just_pressed(InputActions.LOCK_ON)
	var advanced := Clock.advance(_acc_ms, delta * 1000.0)
	_acc_ms = advanced["acc_ms"]
	var steps: int = advanced["steps"]
	for i: int in steps:
		var input := {
			"attack_down": Input.is_action_pressed(InputActions.ATTACK),
			"attack_pressed": _attack_pressed,
			"attack_released": _attack_released,
			"block": Input.is_action_pressed(InputActions.BLOCK),
			"dodge_pressed": _dodge_pressed,
			"lock_pressed": _lock_pressed,
		}
		_clear_latches()
		tick(input, Clock.STEP_MS)


func _clear_latches() -> void:
	_attack_pressed = false
	_attack_released = false
	_dodge_pressed = false
	_lock_pressed = false


## One fixed step of `dt_ms`. `input` is PlayerCombat's input plus `lock_pressed`.
func tick(input: Dictionary, dt_ms: int) -> void:
	var state := session.state
	var player: Dictionary = state["player"]
	var px: float = player["x"]
	var pz: float = player["z"]
	var here := Vector2(px, pz)
	var stats := Gear.stats(state)
	var rate := Cooking.stamina_rate_mult(state)
	var step := PlayerCombat.step(pc, input, dt_ms, _max_stamina(), rate)
	pc = step["pc"]
	var lock_pressed: bool = input.get("lock_pressed", false)
	if lock_pressed:
		lock_id = Combat.pick_target(here, _facing_vector(player), _targets(), lock_id)
	for e: Variant in step["events"]:
		var event: Dictionary = e
		if event["type"] == "swing":
			_player_swing(event, here, stats)
	_step_kindling(here, dt_ms)
	_step_enemies(here, dt_ms, stats)
	_step_boss(here, dt_ms, stats)
	_step_projectiles(here, dt_ms, stats)
	_reap(dt_ms)
	_update_hud()


func _facing_vector(player: Dictionary) -> Vector2:
	var facing: String = player["facing"]
	var delta: Vector2i = Grid.FACING_DELTA[facing]
	return Vector2(delta.x, delta.y)


## Alive enemies as lock-on targets.
func _targets() -> Array:
	var out: Array = []
	for actor: EnemyActor in enemies:
		var state: String = actor.data["state"]
		if state == "dead":
			continue
		out.append({"id": actor.name, "x": actor.data["x"], "y": actor.data["y"]})
	return out


func _actor(actor_name: String) -> EnemyActor:
	for actor: EnemyActor in enemies:
		if actor.name == actor_name:
			return actor
	return null


func _player_swing(event: Dictionary, here: Vector2, stats: Dictionary) -> void:
	var kind: String = event["kind"]
	var multiplier: float = event["multiplier"]
	var heavy := kind == "heavy"
	var player: Dictionary = session.state["player"]
	var aim := _facing_vector(player)
	var locked := _actor(lock_id)
	if locked != null:
		var lx: float = locked.data["x"]
		var ly: float = locked.data["y"]
		aim = (Vector2(lx, ly) - here).normalized()
	var reach := HEAVY_REACH if heavy else LIGHT_REACH
	var power: int = stats["power"]
	session.events.emit([{"type": "toolUsed", "tool": "axe" if heavy else "sickle"}])
	for actor: EnemyActor in enemies:
		var state: String = actor.data["state"]
		if state == "dead":
			continue
		var ex: float = actor.data["x"]
		var ey: float = actor.data["y"]
		var offset := Vector2(ex, ey) - here
		var size := 0.5
		if offset.length() > reach + size:
			continue
		if offset.length() > 0.001 and absf(rad_to_deg(aim.angle_to(offset))) > SWING_HALF_ANGLE_DEG:
			continue
		var amount := Combat.damage(power, multiplier, 0)
		var before := actor.data
		actor.data = EnemyAI.take_damage(before, amount, heavy)
		if actor.passive:
			actor.data["hp"] = actor.data["max_hp"]
			if actor.data["state"] == "dead":
				actor.data["state"] = "idle"
		actor.sync_visual()
		var after: String = actor.data["state"]
		if after == "dead" and not actor.rewarded:
			actor.rewarded = true
			var level: int = actor.data["level"]
			var enemy_id: String = actor.data["id"]
			if enemy_id == "mossmaw" and not actor.passive:
				_mossmaw_fell()
			else:
				_award_xp(Progression.monster_xp(level))
	_swing_at_boss(here, aim, reach, Combat.damage(power, multiplier, 0))


## The player's swing against the boss and her saplings.
func _swing_at_boss(here: Vector2, aim: Vector2, reach: float, amount: int) -> void:
	if boss.is_empty():
		return
	var bstate: String = boss["state"]
	if bstate != "dead":
		var bx: float = boss["x"]
		var by: float = boss["y"]
		var offset := Vector2(bx, by) - here
		if offset.length() <= reach + BOSS_SIZE and (offset.length() < 0.001 or absf(rad_to_deg(aim.angle_to(offset))) <= SWING_HALF_ANGLE_DEG * 1.5):
			boss = BossMatron.take_damage(boss, amount)
	var saplings: Array = boss["saplings"]
	for i: int in range(saplings.size() - 1, -1, -1):
		var s: Dictionary = saplings[i]
		var sx: float = s["x"]
		var sy: float = s["y"]
		var off := Vector2(sx, sy) - here
		if off.length() <= reach + 0.4 and (off.length() < 0.001 or absf(rad_to_deg(aim.angle_to(off))) <= SWING_HALF_ANGLE_DEG):
			boss = BossMatron.damage_sapling(boss, i, amount)
	_sync_boss_visuals()


func _mossmaw_fell() -> void:
	var result := Mossmaw.award(session.state)
	var next: Dictionary = result["state"]
	var events: Array = result["events"]
	session.replace_state(next)
	if not events.is_empty():
		session.events.emit(events)


## The Kindling drifts behind you where you fight and heals 5 HP every 15 s while you are hurt.
func _step_kindling(here: Vector2, dt_ms: int) -> void:
	if kindling == null:
		return
	var state := session.state
	var kindlings: int = state["kindlings"]
	var player: Dictionary = state["player"]
	var location: String = player["location"]
	var awake := Kindling.follows(kindlings, location)
	if awake and not kindling.visible:
		kindling.snap(Vector3(here.x, 0.0, here.y))
	kindling.visible = awake
	if not awake:
		_kindling_acc_ms = 0
		return
	_time_s += dt_ms / 1000.0
	kindling.follow(Vector3(here.x, 0.0, here.y), dt_ms / 1000.0, _time_s)
	var hp: int = state["hp"]
	var healed := Kindling.heal(hp, Cooking.max_hp(state), _kindling_acc_ms, dt_ms)
	_kindling_acc_ms = healed["acc_ms"]
	state["hp"] = healed["hp"]


func _award_xp(gain: int) -> void:
	var state := session.state
	var level: int = state["level"]
	var xp: int = state["xp"]
	var r := Progression.add_xp(level, xp, gain)
	state["level"] = r["level"]
	state["xp"] = r["xp"]
	var gained: int = r["levels_gained"]
	if gained > 0:
		state["hp"] = Cooking.max_hp(state)
	session.state_changed.emit()


func _step_enemies(here: Vector2, dt_ms: int, stats: Dictionary) -> void:
	var grid := GameStateUtil.current_grid(session.state)
	for actor: EnemyActor in enemies:
		if actor.passive:
			continue
		var before_x: float = actor.data["x"]
		var before_y: float = actor.data["y"]
		var r := EnemyAI.step(actor.data, here, dt_ms)
		actor.data = r["enemy"]
		_resolve_walls(actor, grid, Vector2(before_x, before_y))
		actor.sync_visual()
		for e: Variant in r["events"]:
			var hit: Dictionary = e
			_enemy_hit(actor, hit, here, stats)


## Keeps an enemy off blocked tiles: tries the move on each axis alone, else stays put.
func _resolve_walls(actor: EnemyActor, grid: Dictionary, before: Vector2) -> void:
	var x: float = actor.data["x"]
	var y: float = actor.data["y"]
	if not Grid.is_blocked(Grid.tile_at(grid, floori(x), floori(y))):
		return
	if not Grid.is_blocked(Grid.tile_at(grid, floori(x), floori(before.y))):
		actor.data["y"] = before.y
	elif not Grid.is_blocked(Grid.tile_at(grid, floori(before.x), floori(y))):
		actor.data["x"] = before.x
	else:
		actor.data["x"] = before.x
		actor.data["y"] = before.y


func _enemy_hit(actor: EnemyActor, hit: Dictionary, here: Vector2, stats: Dictionary) -> void:
	var projectile: bool = hit["projectile"]
	var ex: float = hit["x"]
	var ey: float = hit["y"]
	if projectile:
		var dir := (here - Vector2(ex, ey)).normalized()
		projectiles.append({
			"x": ex, "y": ey, "dx": dir.x, "dy": dir.y, "speed": hit["speed"], "power": hit["power"],
			"life": PROJECTILE_LIFE_S,
		})
		return
	var radius: float = hit["radius"]
	var reach: float = hit["reach"]
	var range_ := (radius if radius > 0.0 else reach) + PLAYER_RADIUS
	if Vector2(ex, ey).distance_to(here) > range_:
		return
	damage_player(hit, stats, actor)


func _step_projectiles(here: Vector2, dt_ms: int, stats: Dictionary) -> void:
	var seconds := dt_ms / 1000.0
	var keep: Array[Dictionary] = []
	for p: Dictionary in projectiles:
		var speed: float = p["speed"]
		var px: float = p["x"]
		var py: float = p["y"]
		var dx: float = p["dx"]
		var dy: float = p["dy"]
		var life: float = p["life"]
		px += dx * speed * seconds
		py += dy * speed * seconds
		life -= seconds
		p["x"] = px
		p["y"] = py
		p["life"] = life
		if Vector2(px, py).distance_to(here) <= PROJECTILE_RADIUS + PLAYER_RADIUS:
			damage_player({"power": p["power"], "multiplier": 1.0, "parry_stagger_ms": 0}, stats, null)
			continue
		var grid := GameStateUtil.current_grid(session.state)
		if life > 0.0 and not Grid.is_blocked(Grid.tile_at(grid, floori(px), floori(py))):
			keep.append(p)
	projectiles = keep


## Resolves one hit on the player: damage, block, parry or dodge, then a fall if HP runs out. `source` (or null for a
## projectile) is staggered by a parry.
func damage_player(hit: Dictionary, stats: Dictionary, source: EnemyActor) -> void:
	var state := session.state
	var defence: int = stats["defence"]
	var shield: bool = stats["shield"]
	var defender := PlayerCombat.defender(pc, defence, shield, Cooking.block_drain_mult(state))
	var multiplier: float = hit["multiplier"]
	var result := Combat.resolve_hit(hit, defender, multiplier)
	pc = PlayerCombat.receive(pc, result)
	var parried: bool = result["parried"]
	var stagger_ms: int = result["stagger_ms"]
	if parried and source != null and stagger_ms > 0:
		source.data = EnemyAI.stagger(source.data, stagger_ms)
		source.sync_visual()
	var damage: int = result["damage"]
	if damage <= 0:
		return
	var hp: int = state["hp"]
	hp = maxi(0, hp - damage)
	state["hp"] = hp
	if hp == 0:
		fall()


## Out of HP: wake at the clinic (M1 spec 6.6).
func fall() -> void:
	pc = PlayerCombat.down(pc)
	var result := Falling.fall(session.state)
	var next: Dictionary = result["state"]
	session.replace_state(next)
	pc = PlayerCombat.make(_max_stamina())
	if controller != null:
		controller.sync_from_state()


func _reap(dt_ms: int) -> void:
	var keep: Array[EnemyActor] = []
	for actor: EnemyActor in enemies:
		var state: String = actor.data["state"]
		if state == "dead":
			actor.dead_for += dt_ms / 1000.0
			if actor.dead_for >= CORPSE_SECONDS:
				if actor.name == lock_id:
					lock_id = ""
				remove_child(actor)
				actor.free()
				continue
		keep.append(actor)
	enemies = keep


func _update_hud() -> void:
	if hud_label == null:
		return
	var state := session.state
	var hp: int = state["hp"]
	var level: int = state["level"]
	var xp: int = state["xp"]
	var stamina: float = pc["stamina"]
	hud_label.text = "HP %d/%d   Stamina %d   Lv %d  XP %d/%d" % [
		hp, Cooking.max_hp(state), roundi(stamina), level, xp, Progression.xp_to_next(level),
	]
	if not boss.is_empty():
		var bstate: String = boss["state"]
		if bstate != "idle" and bstate != "dead":
			var bhp: int = boss["hp"]
			var bmax: int = boss["max_hp"]
			hud_label.text += "\nBramble Matron  %d/%d" % [bhp, bmax]


# --- the Bramble Matron -----------------------------------------------------------------------------------------

func _arena() -> Rect2i:
	return Mossdeep.rooms(Mossdeep.FLOORS)[2]


func _spawn_boss() -> void:
	var arena := _arena()
	boss = BossMatron.make(arena.position.x + arena.size.x / 2.0 + 0.5, arena.position.y + 2.5)
	boss_actor = EnemyActor.new()
	boss_actor.name = "BrambleMatron"
	add_child(boss_actor)
	boss_actor.setup(boss)
	_build_thorns()


func _clear_boss() -> void:
	boss = {}
	if boss_actor != null:
		remove_child(boss_actor)
		boss_actor.free()
		boss_actor = null
	for sap: EnemyActor in sapling_actors:
		remove_child(sap)
		sap.free()
	sapling_actors.clear()
	if thorn_walls != null:
		remove_child(thorn_walls)
		thorn_walls.free()
		thorn_walls = null
		_thorns_visual = null


## The thorn walls: a StaticBody3D whose boxes only collide while the walls are up, plus green blocks to see.
func _build_thorns() -> void:
	var arena := _arena()
	thorn_walls = StaticBody3D.new()
	thorn_walls.name = "ThornWalls"
	thorn_walls.collision_layer = 0
	thorn_walls.collision_mask = 0
	_thorns_visual = Node3D.new()
	_thorns_visual.name = "ThornVisual"
	_thorns_visual.visible = false
	thorn_walls.add_child(_thorns_visual)
	var material := StandardMaterial3D.new()
	material.albedo_color = Color("#2f6b2a")
	for r: int in THORN_ROWS.size():
		var row := THORN_ROWS[r]
		var gap := THORN_GAPS[r]
		var x0 := arena.position.x
		var x1 := arena.position.x + arena.size.x - 1
		var segments: Array[Vector2i] = [Vector2i(x0, gap.x - 1), Vector2i(gap.y + 1, x1)]
		for seg: Vector2i in segments:
			var width := seg.y - seg.x + 1
			var shape := CollisionShape3D.new()
			var box_shape := BoxShape3D.new()
			box_shape.size = Vector3(width, 1.6, 1.0)
			shape.shape = box_shape
			shape.position = Vector3(seg.x + width / 2.0, 0.8, row + 0.5)
			thorn_walls.add_child(shape)
			var mesh := MeshInstance3D.new()
			var box_mesh := BoxMesh.new()
			box_mesh.size = Vector3(width, 1.6, 1.0)
			box_mesh.material = material
			mesh.mesh = box_mesh
			mesh.position = shape.position
			_thorns_visual.add_child(mesh)
	add_child(thorn_walls)


func thorns_up() -> bool:
	return thorn_walls != null and thorn_walls.collision_layer != 0


func _set_thorns(up: bool) -> void:
	if thorn_walls == null:
		return
	thorn_walls.collision_layer = 1 if up else 0
	_thorns_visual.visible = up
	if up:
		_nudge_player_off_thorns()


## A wall rising under the player's feet moves them to the lane below it.
func _nudge_player_off_thorns() -> void:
	var player: Dictionary = session.state["player"]
	var px: float = player["x"]
	var pz: float = player["z"]
	var tx := floori(px)
	var ty := floori(pz)
	for r: int in THORN_ROWS.size():
		var gap := THORN_GAPS[r]
		if ty == THORN_ROWS[r] and (tx < gap.x or tx > gap.y):
			var facing: String = player["facing"]
			if controller != null:
				controller.teleport(px, THORN_ROWS[r] + 1.5, facing)
			return


func _step_boss(here: Vector2, dt_ms: int, stats: Dictionary) -> void:
	if boss.is_empty():
		return
	var r := BossMatron.step(boss, here, dt_ms)
	boss = r["boss"]
	for e: Variant in r["events"]:
		var event: Dictionary = e
		var type: String = event["type"]
		match type:
			"hit":
				var radius: float = event["radius"]
				var reach: float = event["reach"]
				var ex: float = event["x"]
				var ey: float = event["y"]
				var range_ := (radius if radius > 0.0 else reach) + PLAYER_RADIUS
				if Vector2(ex, ey).distance_to(here) <= range_:
					damage_player(event, stats, null)
			"saplingExploded":
				var radius2: float = event["radius"]
				var sx: float = event["x"]
				var sy: float = event["y"]
				if Vector2(sx, sy).distance_to(here) <= radius2 + PLAYER_RADIUS:
					damage_player(event, stats, null)
			"wallsRaised":
				_set_thorns(true)
			"wallsLowered", "phaseChanged":
				_set_thorns(false)
			"died":
				_boss_fell()
	var bstate: String = boss["state"]
	if bstate == "phase_change" and thorns_up():
		_set_thorns(false)
	_sync_boss_visuals()


func _boss_fell() -> void:
	_set_thorns(false)
	var result := Mossdeep.award_boss(session.state)
	var next: Dictionary = result["state"]
	var events: Array = result["events"]
	session.replace_state(next)
	if not events.is_empty():
		session.events.emit(events)


## Keeps the boss actor and one small actor per live sapling in step with the data.
func _sync_boss_visuals() -> void:
	if boss_actor == null or boss.is_empty():
		return
	boss_actor.data = boss
	boss_actor.sync_visual()
	var saplings: Array = boss["saplings"]
	while sapling_actors.size() > saplings.size():
		var extra: EnemyActor = sapling_actors.pop_back()
		remove_child(extra)
		extra.free()
	while sapling_actors.size() < saplings.size():
		var actor := EnemyActor.new()
		actor.name = "Sapling%d" % sapling_actors.size()
		add_child(actor)
		var s: Dictionary = saplings[sapling_actors.size()]
		actor.setup({"id": "sapling", "x": s["x"], "y": s["y"], "state": "idle"})
		sapling_actors.append(actor)
	for i: int in sapling_actors.size():
		var s2: Dictionary = saplings[i]
		sapling_actors[i].data["x"] = s2["x"]
		sapling_actors[i].data["y"] = s2["y"]
		sapling_actors[i].sync_visual()
