class_name AtmosphereDriver
extends Node3D
## The look of the sky and weather, driven by the game state: season palette, time of day and weather (the Godot side
## of apps/web/src/scene/Sky.tsx, Weather.tsx and SeasonDriver.tsx; numbers in Atmosphere).
##
## Owns a WorldEnvironment (procedural sky, ambient, filmic tonemap, SSAO from the Godot proof), a DirectionalLight3D
## "Sun", and two GPUParticles3D, "Rain" and "Snow". WorldRoot assigns `camera_attributes` to its Camera3D (depth of
## field lives there), sets `zone_view` (the driver tints its ground and foliage and feeds the window glow) and calls
## `follow` every frame. The driver listens to `GameSession.state_changed` and `Settings.tier_changed`; both can be
## replaced for tests through `session` and `settings` before the node enters the tree.
## Interiors (`location == "house"`) get a fixed warm light, a dim sun and no weather.

const GameSessionScript := preload("res://game/autoload/game_session.gd")
const SettingsScript := preload("res://game/autoload/settings.gd")

const RAIN_BASE := 600
const SNOW_BASE := 400
## Height of the particle boxes above the followed point, in metres.
const PARTICLE_HEIGHT := 12.0
const SUN_ROTATION_DEG := Vector3(-34, -38, 0)
const SUN_DAY_COLOR := Color(1.0, 0.84, 0.64)
const SUN_NIGHT_COLOR := Color(0.56, 0.65, 0.87)
const HOUSE_AMBIENT := Color(1.0, 0.85, 0.65)
const HOUSE_SUN_ENERGY := 0.15
## Interior ambient energy by day and by night. Task 17 by eye: 0.8 / 0.6 blew the cream walls out into the glow.
const HOUSE_AMBIENT_DAY := 0.45
const HOUSE_AMBIENT_NIGHT := 0.35
## Indoors the camera sees past the walls; a dark backdrop replaces the sky there (Task 17 by eye).
const INTERIOR_BACKDROP := Color(0.05, 0.04, 0.035)
const GREY_SKY := Color(0.6, 0.63, 0.68)
const NIGHT_SKY := Color(0.04, 0.07, 0.16)
const AMBIENT_DAY := 0.55
const AMBIENT_NIGHT := 0.25
## High tier's depth of field and volumetric fog, tuned by eye in Task 17 (the first values blurred and washed out
## the whole farm).
const DOF_FAR_DISTANCE := 38.0
const DOF_FAR_TRANSITION := 12.0
const VFOG_DENSITY := 0.004
const VFOG_ALBEDO := Color(0.95, 0.9, 0.82)

## Defaults to the autoload when null at `_ready`.
var session: GameSessionScript = null
var settings: SettingsScript = null
## The zone view whose ground and foliage the driver tints; optional. Assigning one forces the next apply_state.
var zone_view: ZoneView = null:
	set(value):
		zone_view = value
		_has_applied = false

var world_environment: WorldEnvironment = null
var sun: DirectionalLight3D = null
var rain: GPUParticles3D = null
var snow: GPUParticles3D = null
var camera_attributes: CameraAttributesPractical = null

var tier: String = "medium"
## The last applied state, for tests and for reapplying after a tier change.
var season: String = "spring"
var weather: String = "sunny"
var minute: int = 720
var location: String = "farm"

## The inputs of the last apply_state; GameSession emits state_changed on every command, so an unchanged state is a
## cheap no-op. Cleared by set_tier and by assigning zone_view.
var _has_applied: bool = false
var _last_season: String = ""
var _last_weather: String = ""
var _last_location: String = ""
var _last_minute: int = -1

var _sky: ProceduralSkyMaterial = null
var _env: Environment = null


func _init() -> void:
	name = "AtmosphereDriver"
	_env = _build_environment()
	world_environment = WorldEnvironment.new()
	world_environment.name = "WorldEnvironment"
	world_environment.environment = _env
	add_child(world_environment)
	sun = DirectionalLight3D.new()
	sun.name = "Sun"
	sun.rotation_degrees = SUN_ROTATION_DEG
	sun.directional_shadow_max_distance = 60.0
	add_child(sun)
	rain = _build_rain()
	snow = _build_snow()
	add_child(rain)
	add_child(snow)
	camera_attributes = CameraAttributesPractical.new()
	# Tuned by eye in Task 17: the camera's target is CameraRig.CAMERA_DISTANCE (30 m) away and the visible ground
	# spans about 20-40 m of depth, so the blur starts at 38 m and only softens the far (top) edge.
	camera_attributes.dof_blur_far_distance = DOF_FAR_DISTANCE
	camera_attributes.dof_blur_far_transition = DOF_FAR_TRANSITION
	camera_attributes.dof_blur_amount = 0.05


## Connects in _enter_tree and disconnects in _exit_tree so re-adding the node never double-connects and a freed
## driver is never called by a later signal.
func _enter_tree() -> void:
	# By path, not the autoload identifiers: those do not exist when a `-s` SceneTree script (the playthrough smoke,
	# tools/shot.gd) compiles this class before the autoloads are added.
	if session == null:
		session = get_node_or_null("/root/GameSession") as GameSessionScript
	if settings == null:
		settings = get_node_or_null("/root/Settings") as SettingsScript
	if session == null or settings == null:
		push_error("AtmosphereDriver: no GameSession or Settings")
		return
	if not session.state_changed.is_connected(_on_state_changed):
		session.state_changed.connect(_on_state_changed)
	if not settings.tier_changed.is_connected(set_tier):
		settings.tier_changed.connect(set_tier)
	set_tier(settings.tier())
	if not session.state.is_empty():
		apply_state(session.state)


func _exit_tree() -> void:
	if session != null and session.state_changed.is_connected(_on_state_changed):
		session.state_changed.disconnect(_on_state_changed)
	if settings != null and settings.tier_changed.is_connected(set_tier):
		settings.tier_changed.disconnect(set_tier)


## Moves the weather boxes above `target_pos` (the player or the camera focus).
func follow(target_pos: Vector3) -> void:
	var above := Vector3(target_pos.x, target_pos.y + PARTICLE_HEIGHT, target_pos.z)
	rain.global_position = above
	snow.global_position = above


## Applies a graphics tier: the viewport, this environment and sun through RenderApplier, and the particle amounts.
func set_tier(next: String) -> void:
	if not Tiers.TABLE.has(next):
		push_error("AtmosphereDriver: unknown tier %s" % next)
		return
	tier = next
	_has_applied = false
	var vp: Viewport = get_viewport()
	if vp != null:
		RenderApplier.apply(tier, vp, _env, sun)
	_update_particles()


## Reads season, minute, weather and location from a game state and updates sky, light and particles.
func apply_state(state: Dictionary) -> void:
	var cal: Dictionary = state["calendar"]
	var wx: Dictionary = state["weather"]
	var player: Dictionary = state["player"]
	var next_season: String = cal["season"]
	var next_minute: int = cal["minute"]
	var next_weather: String = wx["today"]
	var next_location: String = player["location"]
	if (
		_has_applied and next_season == _last_season and next_weather == _last_weather
		and next_location == _last_location and next_minute == _last_minute
	):
		return
	_has_applied = true
	season = next_season
	minute = next_minute
	weather = next_weather
	location = next_location
	_last_season = season
	_last_weather = weather
	_last_location = location
	_last_minute = minute
	var night: float = Atmosphere.night_factor(minute)
	if Zones.is_interior(location):
		_apply_interior(night)
	else:
		_apply_outdoors(night)
	_update_particles()
	if zone_view != null:
		zone_view.set_night_factor(night)
		if Zones.is_interior(location):
			# Indoors has no grass; only the foliage tint resets.
			zone_view.set_foliage_tint(Color.WHITE)
		else:
			zone_view.set_grass_color(Atmosphere.ground_color(season))
			zone_view.set_foliage_tint(Atmosphere.foliage_tint(season))


func _on_state_changed() -> void:
	if not session.state.is_empty():
		apply_state(session.state)


func _apply_outdoors(night: float) -> void:
	var sky: Color = Atmosphere.sky_color(season)
	var overcast: float = 0.0
	match weather:
		"cloudy":
			overcast = 0.35
		"rain", "snow":
			overcast = 0.55
		"storm":
			overcast = 0.8
	var day_top: Color = sky.darkened(0.25).lerp(GREY_SKY.darkened(0.3), overcast)
	var day_horizon: Color = Color(1.0, 0.82, 0.62).lerp(sky, 0.25).lerp(GREY_SKY, overcast)
	_sky.sky_top_color = day_top.lerp(NIGHT_SKY, night)
	_sky.sky_horizon_color = day_horizon.lerp(NIGHT_SKY.lightened(0.15), night)
	_env.background_mode = Environment.BG_SKY
	_env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	_env.ambient_light_color = Color.WHITE
	_env.ambient_light_energy = lerpf(AMBIENT_DAY, AMBIENT_NIGHT, night)
	sun.light_color = SUN_DAY_COLOR.lerp(SUN_NIGHT_COLOR, night)
	sun.light_energy = Atmosphere.sun_energy(minute, weather)


func _apply_interior(night: float) -> void:
	_sky.sky_top_color = NIGHT_SKY
	_sky.sky_horizon_color = NIGHT_SKY.lightened(0.15)
	_env.background_mode = Environment.BG_COLOR
	_env.background_color = INTERIOR_BACKDROP
	_env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	_env.ambient_light_color = HOUSE_AMBIENT
	# A touch dimmer at night so the window glow reads; otherwise fixed.
	_env.ambient_light_energy = lerpf(HOUSE_AMBIENT_DAY, HOUSE_AMBIENT_NIGHT, night)
	sun.light_color = SUN_DAY_COLOR
	sun.light_energy = HOUSE_SUN_ENERGY


func _update_particles() -> void:
	var scale: float = Tiers.TABLE[tier]["particles"]
	var indoors: bool = Zones.is_interior(location)
	var rain_amt: float = 0.0 if indoors else Atmosphere.rain_amount(weather)
	var snow_amt: float = 0.0 if indoors else Atmosphere.snow_amount(weather)
	_set_particles(rain, rain_amt, RAIN_BASE, scale)
	_set_particles(snow, snow_amt, SNOW_BASE, scale)


## Sets the amount only when it changes (it restarts the particles) and the emitting flag.
func _set_particles(p: GPUParticles3D, amount: float, base: int, scale: float) -> void:
	var count: int = roundi(base * scale * maxf(amount, 1.0))
	if p.amount != count:
		p.amount = count
	p.emitting = amount > 0.0


func _build_environment() -> Environment:
	var env := Environment.new()
	env.background_mode = Environment.BG_SKY
	var sky := Sky.new()
	_sky = ProceduralSkyMaterial.new()
	_sky.sky_curve = 0.12
	_sky.ground_horizon_color = Color(0.95, 0.8, 0.62)
	_sky.ground_bottom_color = Color(0.22, 0.26, 0.18)
	_sky.sun_angle_max = 20.0
	sky.sky_material = _sky
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.ambient_light_energy = AMBIENT_DAY
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.tonemap_exposure = 1.1
	env.ssao_intensity = 1.6
	env.ssao_radius = 1.2
	env.glow_intensity = 0.8
	env.glow_bloom = 0.12
	env.glow_hdr_threshold = 0.9
	env.volumetric_fog_density = VFOG_DENSITY
	env.volumetric_fog_albedo = VFOG_ALBEDO
	env.adjustment_enabled = true
	env.adjustment_saturation = 1.02
	env.adjustment_contrast = 1.1
	return env


func _build_rain() -> GPUParticles3D:
	var p := GPUParticles3D.new()
	p.name = "Rain"
	p.amount = RAIN_BASE
	p.lifetime = 1.2
	p.preprocess = 1.2
	p.emitting = false
	p.local_coords = false
	p.visibility_aabb = AABB(Vector3(-16, -14, -16), Vector3(32, 16, 32))
	var pm := ParticleProcessMaterial.new()
	pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	pm.emission_box_extents = Vector3(14, 0.5, 14)
	pm.direction = Vector3.DOWN
	pm.spread = 3.0
	pm.initial_velocity_min = 9.0
	pm.initial_velocity_max = 11.0
	pm.gravity = Vector3(0, -4, 0)
	p.process_material = pm
	var quad := QuadMesh.new()
	quad.size = Vector2(0.025, 0.5)
	quad.material = _particle_material(Color(0.75, 0.85, 1.0, 0.55))
	p.draw_pass_1 = quad
	return p


func _build_snow() -> GPUParticles3D:
	var p := GPUParticles3D.new()
	p.name = "Snow"
	p.amount = SNOW_BASE
	p.lifetime = 8.0
	p.preprocess = 8.0
	p.emitting = false
	p.local_coords = false
	p.visibility_aabb = AABB(Vector3(-16, -14, -16), Vector3(32, 16, 32))
	var pm := ParticleProcessMaterial.new()
	pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	pm.emission_box_extents = Vector3(14, 0.5, 14)
	pm.direction = Vector3(0.3, -1, 0)
	pm.spread = 25.0
	pm.initial_velocity_min = 0.8
	pm.initial_velocity_max = 1.4
	pm.gravity = Vector3(0.3, -0.6, 0)
	pm.turbulence_enabled = true
	pm.turbulence_noise_strength = 0.6
	p.process_material = pm
	var quad := QuadMesh.new()
	quad.size = Vector2(0.07, 0.07)
	quad.material = _particle_material(Color(1, 1, 1, 0.9))
	p.draw_pass_1 = quad
	return p


func _particle_material(color: Color) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
	m.albedo_color = color
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	return m
