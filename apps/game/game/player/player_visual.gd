class_name PlayerVisual
extends Node3D
## The animated farmer, ported from apps/web/src/scene/Player.tsx: the `player` model fitted to 1.7 m (base at y 0)
## under a pivot that turns to the session facing (n = -z, s = +z, e = +x, w = -x, as motion.ts FACING_YAW). Each
## frame it plays the locomotion clip for the controller's ground speed at PlayerClips.clip_rate; a session event with
## a clip (PlayerClips.clip_for_event) plays once and locomotion resumes when that clip's length has passed. On the
## Low tier (Tiers.TABLE[tier].blob_shadow) a flat dark disc under the feet stands in for real shadows, switched
## live on Settings.tier_changed. Add it as a child of the PlayerController so it follows the body.

const GameSessionScript := preload("res://game/autoload/game_session.gd")
const SettingsScript := preload("res://game/autoload/settings.gd")

const MODEL_HEIGHT := 1.7
const SHADOW_RADIUS := 0.45
const SHADOW_ALPHA := 0.35
const SHADOW_Y := 0.02
const FACING_YAW: Dictionary[String, float] = {"n": PI, "s": 0.0, "e": PI / 2.0, "w": -PI / 2.0}

## Default to the autoloads; tests inject their own. `controller` defaults to the parent when it is one.
var session: GameSessionScript = null
var settings: SettingsScript = null
var controller: PlayerController = null

var _pivot := Node3D.new()
var _anim: AnimationPlayer = null
var _shadow := MeshInstance3D.new()
var _clip: String = ""
var _one_shot_left: float = 0.0


func _init() -> void:
	_pivot.name = "Pivot"
	add_child(_pivot)
	var model := ModelCatalog.instantiate("player")
	ModelCatalog.fit(model, 0.0, MODEL_HEIGHT)
	_pivot.add_child(model)
	_anim = PlayerClips.prepare(model)
	_shadow.name = "BlobShadow"
	_shadow.mesh = _shadow_mesh()
	_shadow.position = Vector3(0.0, SHADOW_Y, 0.0)
	_shadow.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_shadow.visible = false
	add_child(_shadow)


func _ready() -> void:
	if session == null:
		session = get_node_or_null("/root/GameSession") as GameSessionScript
	if settings == null:
		settings = get_node_or_null("/root/Settings") as SettingsScript
	if controller == null:
		controller = get_parent() as PlayerController
	if session != null:
		session.events.connect(_on_events)
	if settings != null:
		settings.tier_changed.connect(_apply_tier)
		_apply_tier(settings.tier())
	advance(0.0)


func _process(delta: float) -> void:
	advance(delta)


func anim_player() -> AnimationPlayer:
	return _anim


func pivot() -> Node3D:
	return _pivot


func shadow() -> MeshInstance3D:
	return _shadow


## The clip being played: a one-shot while it lasts, otherwise the locomotion clip.
func current_clip() -> String:
	return _clip


## One frame of `delta` seconds: the facing, the one-shot countdown and the locomotion clip. `_process` calls it;
## tests call it directly so no real time is involved.
func advance(delta: float) -> void:
	if session == null or session.state.is_empty():
		return
	var player: Dictionary = session.state["player"]
	var f: String = player["facing"]
	_pivot.rotation.y = FACING_YAW.get(f, 0.0)
	if _one_shot_left > 0.0:
		_one_shot_left -= delta
		if _one_shot_left > 0.0:
			return
		_one_shot_left = 0.0
	var speed := controller.ground_speed if controller != null else 0.0
	var energy: float = player["energy"]
	var clip := PlayerClips.locomotion_clip(speed, energy <= 0.0)
	_play(clip, PlayerClips.clip_rate(clip, speed))


func _on_events(events: Array) -> void:
	for e: Dictionary in events:
		var clip := PlayerClips.clip_for_event(e)
		if clip == "" or _anim == null or not _anim.has_animation(clip):
			continue
		_play(clip, 1.0, true)
		_one_shot_left = _anim.get_animation(clip).length
		return


## Plays `clip` at `rate`; a running clip keeps its place unless `restart` (a repeated one-shot starts over).
func _play(clip: String, rate: float, restart: bool = false) -> void:
	_clip = clip
	if _anim == null or not _anim.has_animation(clip):
		return
	_anim.speed_scale = rate
	if restart or _anim.current_animation != clip:
		_anim.stop()
		_anim.play(clip)


func _apply_tier(tier: String) -> void:
	var row: Dictionary = Tiers.TABLE.get(tier, {})
	var blob: bool = row.get("blob_shadow", false)
	_shadow.visible = blob


static func _shadow_mesh() -> QuadMesh:
	var quad := QuadMesh.new()
	quad.orientation = PlaneMesh.FACE_Y
	quad.size = Vector2(SHADOW_RADIUS * 2.0, SHADOW_RADIUS * 2.0)
	var gradient := Gradient.new()
	gradient.set_color(0, Color(0.0, 0.0, 0.0, SHADOW_ALPHA))
	gradient.set_color(1, Color(0.0, 0.0, 0.0, 0.0))
	gradient.set_offset(0, 0.6)
	gradient.set_offset(1, 1.0)
	var tex := GradientTexture2D.new()
	tex.gradient = gradient
	tex.fill = GradientTexture2D.FILL_RADIAL
	tex.fill_from = Vector2(0.5, 0.5)
	tex.fill_to = Vector2(1.0, 0.5)
	tex.width = 64
	tex.height = 64
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.albedo_texture = tex
	mat.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	quad.material = mat
	return quad
