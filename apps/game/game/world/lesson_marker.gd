class_name LessonMarker
extends Node3D
## The pulsing gold ring on the lesson's target tile (apps/web/src/scene/LessonMarker.tsx: ring radii 0.36 to 0.46,
## #f3cf72, opacity 0.575 +/- 0.225 at 1 Hz; the web's floating gem is not ported). The target comes from
## `Tutorial.lesson_target(state)` and is recomputed on `GameSession.state_changed`; the ring is shown only when the
## target is on the map the player is on. `world_point()` and `revision` serve the HUD's MarkerPointer.

const GameSessionScript := preload("res://game/autoload/game_session.gd")
const RING_INNER := 0.36
const RING_OUTER := 0.46
const RING_Y := 0.05
const COLOR := Color("#f3cf72")
const PULSE_BASE := 0.575
const PULSE_AMPLITUDE := 0.225

## Injectable for tests; defaults to the GameSession autoload.
var session: GameSessionScript
## The pulse stands still (reduced motion).
var still: bool = false

## Counts target changes, so the pointer can tell when to recompute.
var revision: int = 0

var _active: bool = false
var _tile: Vector2i = Vector2i.ZERO
var _location: String = ""
var _ring: MeshInstance3D
var _material: StandardMaterial3D
var _elapsed: float = 0.0


func _ready() -> void:
	_build()
	if session == null:
		session = get_node_or_null("/root/GameSession") as GameSessionScript
	if session != null:
		if not session.state_changed.is_connected(_on_state_changed):
			session.state_changed.connect(_on_state_changed)
		_on_state_changed()


func _build() -> void:
	var torus := TorusMesh.new()
	torus.inner_radius = RING_INNER
	torus.outer_radius = RING_OUTER
	torus.rings = 32
	torus.ring_segments = 8
	_material = StandardMaterial3D.new()
	_material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	_material.albedo_color = Color(COLOR, 0.6)
	torus.material = _material
	_ring = MeshInstance3D.new()
	_ring.mesh = torus
	_ring.visible = false
	add_child(_ring)


func _exit_tree() -> void:
	if session != null:
		if session.state_changed.is_connected(_on_state_changed):
			session.state_changed.disconnect(_on_state_changed)


## Whether a ring is shown (a target on the player's map).
func is_active() -> bool:
	return _active


## Whether the ring mesh is visible.
func ring_shown() -> bool:
	return _ring.visible


## The target tile.
func tile() -> Vector2i:
	return _tile


## The centre of the ring in world coordinates (tile x, z; one tile is one metre).
func world_point() -> Vector3:
	var at := CameraMath.tile_to_world(_tile.x, _tile.y)
	at.y = RING_Y
	return at


## Whether a `Tutorial.lesson_target` result ({} for none) is on the map the player is on.
static func is_target_here(target: Dictionary, player_location: String) -> bool:
	return not target.is_empty() and str(target["location"]) == player_location


## Recomputes the target from a game state. Does nothing to the scene when it did not change.
func refresh(state: Dictionary) -> void:
	var target := Tutorial.lesson_target(state)
	var player: Dictionary = state["player"]
	var active := false
	var tile_now := _tile
	var location_now := _location
	if is_target_here(target, str(player["location"])):
		active = true
		var tx: int = target["x"]
		var ty: int = target["y"]
		tile_now = Vector2i(tx, ty)
		location_now = str(target["location"])
	if active == _active and (not active or (tile_now == _tile and location_now == _location)):
		return
	_active = active
	_tile = tile_now
	_location = location_now
	revision += 1
	_ring.visible = active
	if active:
		position = world_point()


func _on_state_changed() -> void:
	if not session.state.is_empty():
		refresh(session.state)


func _process(delta: float) -> void:
	if not _active:
		return
	_elapsed += delta
	var alpha := 0.6 if still else PULSE_BASE + sin(_elapsed * TAU) * PULSE_AMPLITUDE
	_material.albedo_color.a = alpha
