class_name PlayerController
extends CharacterBody3D
## The farmer's body: a 0.3 m capsule that walks on the y = 0 plane (no gravity, floating motion) against the zone's
## walls (CollisionBuilder, layer 1). WorldRoot calls `set_intent` every physics frame; `_physics_process` moves at
## PlayerPose.speed_for (walk, run, or the exhausted pace) and writes the pose back with `session.set_pose`. The
## facing changes only while moving. The body does not move while the session clock is frozen (pause, modal).
## World x/z are tile coordinates (one tile = one metre), so the pose needs no conversion.

const GameSessionScript := preload("res://game/autoload/game_session.gd")

const HEIGHT := 1.4
const WALL_LAYER := 1
## The player's own layer: walls (layer 1) do not need to see it, and nothing else collides with it yet.
const PLAYER_LAYER := 2

## The session whose state holds the pose; defaults to the GameSession autoload. Tests inject their own.
var session: GameSessionScript = null
var facing: String = "s"
## Metres per second actually travelled in the last physics frame (0 when blocked or still).
var ground_speed: float = 0.0

var _intent := Vector2.ZERO
var _run: bool = false


func _init() -> void:
	motion_mode = CharacterBody3D.MOTION_MODE_FLOATING
	collision_layer = PLAYER_LAYER
	collision_mask = WALL_LAYER
	var capsule := CapsuleShape3D.new()
	capsule.radius = Balance.PLAYER_RADIUS
	capsule.height = HEIGHT
	var cs := CollisionShape3D.new()
	cs.name = "Capsule"
	cs.shape = capsule
	cs.position = Vector3(0.0, HEIGHT / 2.0, 0.0)
	add_child(cs)


func _ready() -> void:
	if session == null:
		session = get_node_or_null("/root/GameSession") as GameSessionScript
	sync_from_state()


## Places the body at the session state's pose (after a start or a load). Does nothing without a game.
func sync_from_state() -> void:
	if session == null or session.state.is_empty():
		return
	var player: Dictionary = session.state["player"]
	var x: float = player["x"]
	var z: float = player["z"]
	var f: String = player["facing"]
	teleport(x, z, f)


## The movement wish for the coming physics frames: `move` is the stick or keys (x east, y south = world +z).
func set_intent(move_intent: Vector2, run: bool) -> void:
	_intent = move_intent
	_run = run


func _physics_process(delta: float) -> void:
	if session == null or session.state.is_empty() or not session.clock_running():
		ground_speed = 0.0
		return
	move(_intent, _run, delta)


## Moves one physics frame of `dt` seconds (the physics delta that move_and_slide also uses). An intent longer than
## 1 is clamped, so a diagonal is not faster than a straight line.
func move(intent: Vector2, run: bool, dt: float) -> void:
	if dt <= 0.0:
		return
	var dir := intent.limit_length(1.0)
	var moving := dir.length_squared() > 0.0001
	if moving:
		var speed := PlayerPose.speed_for(session.state, run)
		velocity = Vector3(dir.x * speed, 0.0, dir.y * speed)
		facing = PlayerPose.facing_of(dir.x, dir.y)
	else:
		velocity = Vector3.ZERO
	var before := global_position
	if moving:
		move_and_slide()
		global_position.y = 0.0
	ground_speed = global_position.distance_to(before) / dt
	session.set_pose(global_position.x, global_position.z, facing)


## Puts the body at (x, z) facing `facing` (zone change, load), first pushed clear of any blocked tile and of the
## zone's extra blocked tiles (CollisionBuilder.extra_blocked_for: the Lowmere villagers). Teleport only, not per frame.
func teleport(x: float, z: float, to_facing: String) -> void:
	if session == null or session.state.is_empty():
		push_error("PlayerController.teleport: no session with a game")
		return
	var player: Dictionary = session.state["player"]
	var zone: String = player["location"]
	var p := PlayerPose.push_out_of_blocked(session.state, x, z, CollisionBuilder.extra_blocked_for(zone))
	if PlayerPose.FACINGS.has(to_facing):
		facing = to_facing
	if is_inside_tree():
		global_position = Vector3(p.x, 0.0, p.y)
	else:
		position = Vector3(p.x, 0.0, p.y)
	velocity = Vector3.ZERO
	ground_speed = 0.0
	session.set_pose(p.x, p.y, facing)
