extends CoreTest
## WorldRoot: composes the zone view, walls, player, camera, atmosphere, lesson marker, HUD and panels for the
## session's state; swaps the zone on a location change, re-applies the render tier, feeds the player's movement and
## lets the menu input open the pause menu. Every test injects its own GameSession, Settings and SaveService (files
## under a fresh `user://test-world-<random>`) and puts the world in a SubViewport, so RenderApplier never touches
## the test runner's own window.

const GameSessionScript := preload("res://game/autoload/game_session.gd")
const SettingsScript := preload("res://game/autoload/settings.gd")
const SaveServiceScript := preload("res://game/autoload/save_service.gd")
const Playthrough := preload("res://test/smoke/smoke_playthrough.gd")

var _base: String = ""
var _session: GameSessionScript
var _settings: SettingsScript
var _save: SaveServiceScript
var _viewport: SubViewport


func before_each() -> void:
	_base = "user://test-world-%d" % randi()
	DirAccess.make_dir_recursive_absolute(_base)


func after_each() -> void:
	for action: String in [InputActions.MENU, InputActions.MOVE_RIGHT]:
		Input.action_release(action)
	_remove_tree(_base)


func _remove_tree(path: String) -> void:
	if not DirAccess.dir_exists_absolute(path):
		return
	for dir: String in DirAccess.get_directories_at(path):
		_remove_tree(path.path_join(dir))
	for name: String in DirAccess.get_files_at(path):
		DirAccess.remove_absolute(path.path_join(name))
	DirAccess.remove_absolute(path)


## A WorldRoot on its own session (started on `state`, screen "game", frame loop off), Settings and SaveService.
func _world(state: Dictionary, tier: String = "medium") -> WorldRoot:
	_viewport = SubViewport.new()
	_viewport.size = Vector2i(1280, 720)
	add_child_autofree(_viewport)
	_session = GameSessionScript.new()
	_session.set_process(false)
	_viewport.add_child(_session)
	_session.start(state, 1, 0)
	_session.set_screen("game")
	_settings = SettingsScript.new()
	_settings.set("_path", _base.path_join("settings.cfg"))
	_settings.renderer_override = "Apple M4"
	_viewport.add_child(_settings)
	_settings.set_choice(tier)
	_save = SaveServiceScript.new()
	_save.session = _session
	_save.slots = SaveSlots.new(_base.path_join("saves"))
	_viewport.add_child(_save)
	var world := WorldRoot.new()
	world.session = _session
	world.settings = _settings
	world.save_service = _save
	_viewport.add_child(world)
	return world


static func _f(v: Variant) -> float:
	var out: float = v
	return out


func _player() -> Dictionary:
	return d(_session.state["player"])


func _render_summary(world: WorldRoot) -> Dictionary:
	return RenderApplier.summarize(_viewport, world.driver.world_environment.environment, world.driver.sun)


func test_world_root_builds_farm_for_new_game() -> void:
	var state := NewGame.create({"seed": 11, "farmName": "Elm", "playerName": "Ari", "lessons": true})
	var world := _world(state)
	eq(world.zone_view.zone, "farm")
	assert_true(world.zone_view.is_inside_tree())
	assert_gt(world.zone_view.node_count(), 0, "the new game's obstacles are built")
	var farm := farm_of(_session.state)
	eq(world.walls.get_child_count(), CollisionBuilder.count_boxes(farm))
	var p := _player()
	assert_almost_eq(world.controller.global_position.x, _f(p["x"]), 1e-4)
	assert_almost_eq(world.controller.global_position.z, _f(p["z"]), 1e-4)
	assert_true(world.visual.get_parent() == world.controller, "the visual rides on the body")
	assert_true(world.rig.target == world.controller, "the camera follows the player")
	assert_almost_eq(world.rig.global_position.x, _f(p["x"]), 1e-4, "the camera starts on the player")
	assert_true(world.camera() == _viewport.get_camera_3d(), "the rig's camera is the current one")
	assert_true(world.camera().attributes == world.driver.camera_attributes, "DoF lives on the driver's attributes")
	assert_true(world.driver.zone_view == world.zone_view)
	assert_true(world.marker.is_inside_tree(), "the lesson marker is in the world")
	assert_true(world.hud.lesson_layer.pointer.marker == world.marker, "hud.bind_world(marker, rig)")
	assert_true(world.hud.lesson_layer.pointer.camera_rig == world.rig)
	assert_true(world.panel_host.toasts == world.hud.toasts, "the panels share the HUD's toasts")
	assert_true(world.devices.is_inside_tree(), "a DeviceTracker is in the tree")
	assert_true(world.hud.devices == world.devices)
	eq(_render_summary(world)["tier"], "medium", "RenderApplier ran at start")


func test_location_changed_swaps_zone() -> void:
	var farm_state := TestStates.blank_farm(TestStates.fresh())
	var door := Grid.find_feature(farm_of(farm_state), "houseDoor")
	var world := _world(TestStates.stand_at(farm_state, door.x, door.y + 1, "n"))
	var old_view := world.zone_view
	_session.dispatch({"type": "interact"})
	eq(_player()["location"], "house")
	eq(world.zone_view.zone, "house", "a new view for the house")
	assert_false(world.zone_view == old_view, "the farm view was replaced")
	assert_false(is_instance_valid(old_view), "the farm view was freed")
	eq(world.walls.get_child_count(), CollisionBuilder.count_boxes(GameStateUtil.current_grid(_session.state)))
	var p := _player()
	assert_almost_eq(world.controller.global_position.x, _f(p["x"]), 1e-4, "teleported to the house spawn")
	assert_almost_eq(world.controller.global_position.z, _f(p["z"]), 1e-4)
	assert_almost_eq(world.rig.global_position.z, _f(p["z"]), 1e-4, "the camera snapped")
	eq(world.driver.location, "house", "the atmosphere was reapplied")
	assert_almost_eq(world.camera().size, CameraMath.ortho_size_for("house"), 1e-4, "the closer interior view")
	assert_true(world.driver.zone_view == world.zone_view)
	# And back out through the exit door, then on to Lowmere through the farm gate.
	var exit := Grid.find_feature(GameStateUtil.current_grid(_session.state), "exitDoor")
	_session.set_pose(exit.x + 0.5, exit.y - 0.5, "s")
	_session.dispatch({"type": "interact"})
	eq(world.zone_view.zone, "farm")
	assert_almost_eq(world.camera().size, CameraMath.ORTHO_SIZE, 1e-4)
	_session.set_pose(16.5, 22.5, "s")
	_session.dispatch({"type": "interact"})
	eq(world.zone_view.zone, "lowmere")
	var extra := CollisionBuilder.extra_blocked_for("lowmere")
	eq(world.walls.get_child_count(), CollisionBuilder.count_boxes(Zones.grid("lowmere"), extra), "villagers block")


func test_state_changes_sync_the_zone_view() -> void:
	var state := TestStates.stand_at(TestStates.blank_farm(TestStates.fresh()), 10, 10, "e")
	state["activeSlot"] = 0
	var world := _world(state)
	assert_null(world.zone_view.soil_node(11, 10))
	_session.dispatch({"type": "useTool"})
	assert_not_null(world.zone_view.soil_node(11, 10), "the tilled tile shows soil after the dispatch")


func test_tier_change_reapplies_render_settings() -> void:
	var world := _world(TestStates.fresh(), "medium")
	eq(_render_summary(world)["tier"], "medium")
	assert_false(world.camera().attributes is CameraAttributesPractical and _dof(world), "no DoF on medium")
	_settings.set_choice("high")
	eq(_render_summary(world)["tier"], "high")
	assert_true(_dof(world), "High turns on the camera's depth of field")
	_settings.set_choice("low")
	eq(_render_summary(world)["tier"], "low")
	assert_false(_dof(world))
	assert_true(world.visual.shadow().visible, "the blob shadow on Low")


func _dof(world: WorldRoot) -> bool:
	var attrs := world.camera().attributes as CameraAttributesPractical
	return attrs != null and attrs.dof_blur_far_enabled


func test_menu_intent_opens_pause() -> void:
	InputActions.register()
	var world := _world(TestStates.fresh())
	await wait_process_frames(1)
	Input.action_press(InputActions.MENU)
	_session._process(0.05)
	Input.action_release(InputActions.MENU)
	eq(world.panel_host.current(), "pause")
	eq(_session.screen, "paused")


func test_player_spawns_on_free_tile_after_load() -> void:
	# (0, 10) is the farm's west fence: a save with the player standing on it is pushed out.
	var state := TestStates.stand_at(TestStates.fresh(), 0, 10, "e")
	var world := _world(state)
	var p := _player()
	var x: float = p["x"]
	var z: float = p["z"]
	var tile: Variant = Grid.tile_at(farm_of(_session.state), floori(x), floori(z))
	assert_false(Grid.is_blocked(tile), "the saved pose was moved off the fence")
	assert_almost_eq(world.controller.global_position.x, x, 1e-4)
	assert_almost_eq(world.controller.global_position.z, z, 1e-4)


func test_move_input_walks_only_on_the_game_screen() -> void:
	InputActions.register()
	var world := _world(TestStates.stand_at(TestStates.blank_farm(TestStates.fresh()), 10, 18, "e"))
	var start := world.controller.global_position.x
	Input.action_press(InputActions.MOVE_RIGHT)
	for i: int in 10:
		await get_tree().physics_frame
	assert_gt(world.controller.global_position.x, start + 0.2, "walks east on the game screen")
	_session.set_screen("modal")
	await get_tree().physics_frame
	var held := world.controller.global_position.x
	for i: int in 10:
		await get_tree().physics_frame
	assert_almost_eq(world.controller.global_position.x, held, 1e-4, "no movement while a panel is open")
	Input.action_release(InputActions.MOVE_RIGHT)


func test_quit_to_title_is_forwarded() -> void:
	var world := _world(TestStates.fresh())
	var seen: Array[int] = [0]
	world.quit_to_title.connect(func() -> void: seen[0] += 1)
	world.panel_host.quit_to_title()
	eq(seen[0], 1)
	eq(_session.screen, "title")


func test_smoke_playthrough() -> void:
	var holder := SubViewport.new()
	holder.size = Vector2i(1280, 720)
	add_child_autofree(holder)
	var problem: String = Playthrough.run(holder, _base.path_join("playthrough"))
	eq(problem, "", "the playthrough reports no problem")
	eq(Playthrough.verdict(problem), "PLAYTHROUGH OK")
