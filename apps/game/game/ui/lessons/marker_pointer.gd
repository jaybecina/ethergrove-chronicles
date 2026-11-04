class_name MarkerPointer
extends Control
## A gold arrow on the screen edge pointing at an off-screen lesson marker (apps/web/src/ui/hud/MarkerPointer.tsx and
## scene/markerScreen.ts `edgePoint`). It reads the `LessonMarker` and the `CameraRig` and recomputes only when the
## player's pose, the marker's target or the viewport size changed. Hidden while the marker is on screen (either its
## ring or the point 1.4 m above it, as the web's gem, is inside the viewport inset by 48 px) or absent.

const GameSessionScript := preload("res://game/autoload/game_session.gd")
const EDGE_INSET := 24.0
const ON_SCREEN_INSET := 48.0
const SIZE := 40.0
## The web floats a gem 1.4 m above the target.
const GEM_HEIGHT := 1.4

var marker: LessonMarker
var camera_rig: CameraRig
## Injectable for tests; defaults to the GameSession autoload.
var session: GameSessionScript

var _key_x: float = INF
var _key_z: float = INF
var _key_revision: int = -1
var _key_size: Vector2 = Vector2.ZERO
var _on_screen: bool = true


func _init() -> void:
	focus_mode = Control.FOCUS_NONE
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	custom_minimum_size = Vector2(SIZE, SIZE)
	size = Vector2(SIZE, SIZE)
	pivot_offset = Vector2(SIZE, SIZE) / 2.0
	visible = false


func _ready() -> void:
	if session == null:
		session = get_node_or_null("/root/GameSession") as GameSessionScript


func _draw() -> void:
	var c := Vector2(SIZE, SIZE) / 2.0
	var pts := PackedVector2Array([c + Vector2(16, 0), c + Vector2(-10, -12), c + Vector2(-4, 0), c + Vector2(-10, 12)])
	draw_colored_polygon(pts, ThemeFactory.ACCENT_BRIGHT)


## Where on the viewport edge (inset by `inset`) to draw an arrow toward `p`: x, y and the angle in radians (z).
## `behind` mirrors a point behind the camera first.
static func edge_point(p: Vector2, view: Vector2, inset: float, behind: bool = false) -> Vector3:
	var c := view / 2.0
	var d := c - p if behind else p - c
	if d.x == 0.0 and d.y == 0.0:
		return Vector3(c.x, c.y, 0.0)
	var h := c - Vector2(inset, inset)
	var sx := INF if d.x == 0.0 else h.x / absf(d.x)
	var sy := INF if d.y == 0.0 else h.y / absf(d.y)
	var k := minf(sx, sy)
	return Vector3(c.x + d.x * k, c.y + d.y * k, atan2(d.y, d.x))


## Whether the arrow is currently shown.
func is_shown() -> bool:
	return visible


func _process(_delta: float) -> void:
	# Never drawn over the pause menu or a modal panel: only while the game screen runs.
	var playing := session == null or session.screen == "game"
	if not playing or marker == null or camera_rig == null or not marker.is_active():
		visible = false
		_key_revision = -1
		return
	var view := camera_rig.get_viewport().get_visible_rect().size
	var px := 0.0
	var pz := 0.0
	if session != null and not session.state.is_empty():
		var player: Dictionary = session.state["player"]
		px = player["x"]
		pz = player["z"]
	# Recompute only when the pose, the target or the viewport size changed (also when there is no pose to read).
	if px == _key_x and pz == _key_z and marker.revision == _key_revision and view == _key_size:
		return
	_key_x = px
	_key_z = pz
	_key_revision = marker.revision
	_key_size = view
	recompute()


## Recomputes visibility and placement now (the per-frame check calls it only when something changed).
func recompute() -> void:
	if marker == null or camera_rig == null or not marker.is_active():
		visible = false
		return
	var ground := marker.world_point()
	var gem := ground + Vector3(0.0, GEM_HEIGHT, 0.0)
	_on_screen = camera_rig.is_on_screen(ground, ON_SCREEN_INSET) or camera_rig.is_on_screen(gem, ON_SCREEN_INSET)
	if _on_screen:
		visible = false
		return
	var view := camera_rig.get_viewport().get_visible_rect().size
	var e := edge_point(camera_rig.world_to_screen(gem), view, EDGE_INSET)
	position = Vector2(e.x, e.y) - Vector2(SIZE, SIZE) / 2.0
	rotation = e.z
	visible = true
