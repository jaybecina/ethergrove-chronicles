extends CoreTest
## AtmosphereDriver: environment, sun and the rain/snow particles driven by the game state, scaled by the tier.
## Drivers live in a SubViewport so RenderApplier never touches the test runner's own window.

const GameSessionScript := preload("res://game/autoload/game_session.gd")
const SettingsScript := preload("res://game/autoload/settings.gd")

var _session: GameSessionScript = null
var _settings: SettingsScript = null


func before_each() -> void:
	# Injected, so drivers never listen to the real autoloads.
	_session = GameSessionScript.new()
	add_child_autofree(_session)
	_session.set_process(false)
	_settings = SettingsScript.new()
	_settings.renderer_override = "Apple M4"
	autofree(_settings)


func _driver(tier: String = "medium") -> AtmosphereDriver:
	var vp := SubViewport.new()
	add_child_autofree(vp)
	var drv := AtmosphereDriver.new()
	drv.session = _session
	drv.settings = _settings
	vp.add_child(drv)
	drv.set_tier(tier)
	return drv


func _state(season: String, weather: String, location: String = "farm", minute: int = 720) -> Dictionary:
	var s := TestStates.fresh()
	var cal: Dictionary = s["calendar"]
	cal["season"] = season
	cal["minute"] = minute
	var w: Dictionary = s["weather"]
	w["today"] = weather
	var p: Dictionary = s["player"]
	p["location"] = location
	return s


func test_has_expected_children() -> void:
	var drv := _driver()
	assert_not_null(drv.world_environment)
	assert_not_null(drv.world_environment.environment)
	assert_not_null(drv.sun)
	assert_not_null(drv.rain)
	assert_not_null(drv.snow)
	assert_true(drv.camera_attributes is CameraAttributesPractical)
	assert_almost_eq(drv.world_environment.environment.ssao_intensity, 1.6, 0.0001)
	assert_almost_eq(drv.world_environment.environment.ssao_radius, 1.2, 0.0001)


func test_winter_enables_snow() -> void:
	var drv := _driver()
	drv.apply_state(_state("winter", "snow"))
	assert_true(drv.snow.emitting)
	assert_false(drv.rain.emitting)
	drv.apply_state(_state("winter", "sunny"))
	assert_false(drv.snow.emitting)


func test_rain_enables_rain_particles() -> void:
	var drv := _driver()
	drv.apply_state(_state("spring", "rain"))
	assert_true(drv.rain.emitting)
	assert_false(drv.snow.emitting)
	drv.apply_state(_state("spring", "sunny"))
	assert_false(drv.rain.emitting)


func test_tier_scales_particle_amount() -> void:
	var drv := _driver("low")
	drv.apply_state(_state("spring", "rain"))
	var low_rain: int = drv.rain.amount
	var low_snow: int = drv.snow.amount
	drv.set_tier("high")
	assert_gt(drv.rain.amount, low_rain)
	assert_gt(drv.snow.amount, low_snow)
	eq(low_rain, 600)
	eq(low_snow, 400)


func test_storm_has_more_rain_than_rain() -> void:
	var drv := _driver()
	drv.apply_state(_state("summer", "rain"))
	var rain_amount: int = drv.rain.amount
	drv.apply_state(_state("summer", "storm"))
	assert_gt(drv.rain.amount, rain_amount)


func test_house_has_no_weather() -> void:
	var drv := _driver()
	drv.apply_state(_state("spring", "rain", "house"))
	assert_false(drv.rain.emitting)
	assert_false(drv.snow.emitting)
	drv.apply_state(_state("winter", "snow", "house"))
	assert_false(drv.snow.emitting)
	assert_lt(drv.sun.light_energy, 0.3)
	eq(drv.world_environment.environment.ambient_light_source, Environment.AMBIENT_SOURCE_COLOR)


func test_sun_energy_follows_weather_and_night() -> void:
	var drv := _driver()
	drv.apply_state(_state("spring", "sunny", "farm", 720))
	assert_almost_eq(drv.sun.light_energy, 1.0, 0.001)
	drv.apply_state(_state("spring", "storm", "farm", 720))
	assert_almost_eq(drv.sun.light_energy, 0.4, 0.001)
	drv.apply_state(_state("spring", "sunny", "farm", 1400))
	assert_almost_eq(drv.sun.light_energy, Atmosphere.NIGHT_SUN_ENERGY, 0.001)


func test_sky_colour_follows_season() -> void:
	var drv := _driver()
	drv.apply_state(_state("spring", "sunny"))
	var spring: Color = _sky_top(drv)
	drv.apply_state(_state("fall", "sunny"))
	assert_ne(_sky_top(drv), spring)


func _sky_top(drv: AtmosphereDriver) -> Color:
	var sky: Sky = drv.world_environment.environment.sky
	var mat: ProceduralSkyMaterial = sky.sky_material as ProceduralSkyMaterial
	return mat.sky_top_color


func test_follow_moves_particles_above_target() -> void:
	var drv := _driver()
	drv.follow(Vector3(10, 0, 20))
	eq(drv.rain.global_position.x, 10.0)
	eq(drv.rain.global_position.z, 20.0)
	assert_gt(drv.rain.global_position.y, 5.0)
	eq(drv.snow.global_position.x, 10.0)


func test_tier_applies_to_own_environment_and_sun() -> void:
	var drv := _driver("high")
	assert_true(drv.sun.shadow_enabled)
	assert_true(drv.world_environment.environment.ssao_enabled)
	drv.set_tier("low")
	assert_false(drv.sun.shadow_enabled)
	assert_false(drv.world_environment.environment.ssao_enabled)


func test_zone_view_gets_season_tint() -> void:
	var drv := _driver()
	var state := _state("winter", "sunny")
	var view := ZoneView.new()
	add_child_autofree(view)
	view.build("farm", state)
	drv.zone_view = view
	drv.apply_state(state)
	eq(view.grass_color(), Atmosphere.ground_color("winter"))
	var count := view.tint_apply_count
	drv.apply_state(_state("winter", "sunny", "house"))
	eq(view.tint_apply_count, count + 1, "indoors only the foliage tint resets; there is no grass")
	eq(view.grass_color(), Atmosphere.ground_color("winter"))


func test_listens_to_session_state_changed() -> void:
	var drv := _driver()
	_session.start(_state("spring", "rain"), 1, 0)
	assert_true(drv.rain.emitting)
	_session.state = _state("winter", "snow")
	_session.state_changed.emit()
	assert_true(drv.snow.emitting)
	assert_false(drv.rain.emitting)


func test_tier_changed_signal_reapplies_tier() -> void:
	var drv := _driver("medium")
	_settings.tier_changed.emit("low")
	eq(drv.tier, "low")


func test_readding_the_node_never_double_connects() -> void:
	var drv := _driver()
	var vp: Node = drv.get_parent()
	vp.remove_child(drv)
	vp.add_child(drv)
	eq(_session.state_changed.get_connections().size(), 1)
	eq(_settings.tier_changed.get_connections().size(), 1)
	vp.remove_child(drv)
	eq(_session.state_changed.get_connections().size(), 0)
	vp.add_child(drv)
	eq(_session.state_changed.get_connections().size(), 1)


func test_freed_driver_ignores_later_signals() -> void:
	var drv := _driver()
	drv.free()
	_session.state = _state("spring", "rain")
	_session.state_changed.emit()
	_settings.tier_changed.emit("high")
	eq(_session.state_changed.get_connections().size(), 0)
	pass_test("no error after the driver was freed")


func _tinted(drv: AtmosphereDriver, state: Dictionary) -> ZoneView:
	var view := ZoneView.new()
	add_child_autofree(view)
	view.build("farm", state)
	drv.zone_view = view
	return view


func test_identical_apply_state_does_nothing_twice() -> void:
	var drv := _driver()
	var state := _state("fall", "sunny")
	var view := _tinted(drv, state)
	drv.apply_state(state)
	var count := view.tint_apply_count
	assert_gt(count, 0)
	# Tamper with the sun: an identical state must not touch it again.
	drv.sun.light_energy = 99.0
	drv.apply_state(state)
	eq(drv.sun.light_energy, 99.0)
	eq(view.tint_apply_count, count)


func test_minute_change_reapplies_light_but_not_tints() -> void:
	var drv := _driver()
	var view := _tinted(drv, _state("fall", "sunny", "farm", 720))
	drv.apply_state(_state("fall", "sunny", "farm", 720))
	var count := view.tint_apply_count
	drv.apply_state(_state("fall", "sunny", "farm", 1400))
	assert_almost_eq(drv.sun.light_energy, Atmosphere.NIGHT_SUN_ENERGY, 0.001)
	eq(view.tint_apply_count, count)


func test_season_change_reapplies_tints() -> void:
	var drv := _driver()
	var view := _tinted(drv, _state("spring", "sunny"))
	drv.apply_state(_state("spring", "sunny"))
	var count := view.tint_apply_count
	drv.apply_state(_state("fall", "sunny"))
	eq(view.tint_apply_count, count + 2, "ground and foliage")


func test_set_tier_forces_a_reapply() -> void:
	var drv := _driver()
	var state := _state("spring", "rain")
	drv.apply_state(state)
	drv.sun.light_energy = 99.0
	drv.set_tier("high")
	drv.apply_state(state)
	assert_almost_eq(drv.sun.light_energy, 0.55, 0.001)


func test_foliage_tint_reaches_weeds_built_after_it_was_set() -> void:
	var state := _state("fall", "sunny")
	var view := ZoneView.new()
	add_child_autofree(view)
	view.set_foliage_tint(Atmosphere.foliage_tint("fall"))
	view.build("farm", state)
	var width: int = d(d(state["maps"])["farm"])["width"]
	var tiles: Array = a(d(d(state["maps"])["farm"])["tiles"])
	var found := false
	for i: int in tiles.size():
		if d(tiles[i])["kind"] != "weed":
			continue
		var node := view.tile_node(i % width, i / width)
		for m: Node in node.find_children("*", "MeshInstance3D", true, false):
			var mi := m as MeshInstance3D
			var mat := mi.get_active_material(0) as StandardMaterial3D
			if mat != null:
				var base: Color = mat.get_meta("base_albedo")
				assert_almost_eq(mat.albedo_color.r, base.r * 1.25, 0.001)
				found = true
		break
	assert_true(found)


## Tuned by eye in Task 17 (High tier shots). The camera's target is CAMERA_DISTANCE away, so depth of field must
## start past it or the whole playfield blurs; the default fog density (0.05) washed the farm out.
func test_high_tier_dof_and_fog_leave_the_playfield_sharp_and_clear() -> void:
	var drv := _driver("high")
	assert_gt(drv.camera_attributes.dof_blur_far_distance, CameraRig.CAMERA_DISTANCE + 5.0, "DoF starts past the player")
	var env := drv.world_environment.environment
	assert_true(env.volumetric_fog_enabled)
	assert_lt(env.volumetric_fog_density, 0.01, "a light haze, not a wash")


## Indoors the camera looks past the walls into the void; the sky (and its green ground) showed there (Task 17).
func test_interior_has_a_dark_background_and_outdoors_the_sky() -> void:
	var drv := _driver()
	var env := drv.world_environment.environment
	drv.apply_state(_state("spring", "sunny", "house"))
	eq(env.background_mode, Environment.BG_COLOR)
	assert_lt(env.background_color.get_luminance(), 0.1, "a dark backdrop")
	drv.apply_state(_state("spring", "sunny", "farm"))
	eq(env.background_mode, Environment.BG_SKY)


func test_interior_ambient_uses_the_tuned_energies() -> void:
	var drv := _driver()
	var env := drv.world_environment.environment
	drv.apply_state(_state("spring", "sunny", "house", 720))
	assert_almost_eq(env.ambient_light_energy, AtmosphereDriver.HOUSE_AMBIENT_DAY, 1e-4)
	drv.apply_state(_state("spring", "sunny", "house", 1400))
	assert_almost_eq(env.ambient_light_energy, AtmosphereDriver.HOUSE_AMBIENT_NIGHT, 1e-4)
	assert_lt(AtmosphereDriver.HOUSE_AMBIENT_DAY, 0.6, "not blown out")
