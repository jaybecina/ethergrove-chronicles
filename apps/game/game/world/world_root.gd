class_name WorldRoot
extends Node3D
## The playable world for the running game: composes the zone view, the zone's walls, the player (body and visual),
## the camera rig, the atmosphere, the lesson marker, the HUD and the panel host, all built in code from the
## session's state.
##
## State ownership (see GameSession): the session owns the live state; nothing here caches it. Views follow it:
## - `GameSession.state_changed` (after every dispatch, never per frame): when the player's location differs from the
##   zone on screen (a `locationChanged` event, or a loaded game) the zone is entered anew (new ZoneView and walls,
##   the player teleported to the state pose and pushed clear of blocked tiles, the camera snapped, the atmosphere
##   reapplied); otherwise `ZoneView.sync` rebuilds only the tiles that changed. The handler runs inside the
##   dispatch, before the next physics frame, so the body never writes its old pose over the new zone's spawn.
## - The fixed 50 ms step is GameSession's own (`_process`: IntentReader.poll, IntentMapper.map_into,
##   GameSession.step), so the world does not drive steps; the menu and bag inputs reach the PanelHost through
##   `menu_requested` / `bag_requested`.
## - Every physics frame the world reads the live move and run inputs and gives them to the controller, only while
##   the screen is "game" (a zero intent otherwise).
## - The render tier: AtmosphereDriver applies `RenderApplier.apply` when it enters the tree and on
##   `Settings.tier_changed`; the world adds the camera (with the driver's CameraAttributesPractical, where High's
##   depth of field lives) before the driver, and calls `apply_render` again whenever it swaps the camera or
##   environment.

## The pause menu's "Save and quit" ran; the owner (GameMain) shows the title screen again.
signal quit_to_title

const GameSessionScript := preload("res://game/autoload/game_session.gd")
const SettingsScript := preload("res://game/autoload/settings.gd")
const SaveServiceScript := preload("res://game/autoload/save_service.gd")

## Injectable for tests and tools; default to the autoloads.
var session: GameSessionScript
var settings: SettingsScript
var save_service: SaveServiceScript

var zone_view: ZoneView
var walls: StaticBody3D
var controller: PlayerController
var visual: PlayerVisual
var rig: CameraRig
var driver: AtmosphereDriver
var marker: LessonMarker
var combat: CombatLayer
var hud: Hud
var panel_host: PanelHost
var devices: DeviceTracker

var _reader := IntentReader.new()
## The Mossdeep floor and mined-node count the view was built for (a change rebuilds it).
var _view_floor: int = 0
var _view_mined: int = 0
## Reused every physics frame (no allocation).
var _intents: Dictionary = {}


func _ready() -> void:
	name = "WorldRoot"
	if session == null:
		session = get_node_or_null("/root/GameSession") as GameSessionScript
	if settings == null:
		settings = get_node_or_null("/root/Settings") as SettingsScript
	if save_service == null:
		save_service = get_node_or_null("/root/SaveService") as SaveServiceScript
	IntentReader.clear(_intents)
	if session == null or session.state.is_empty():
		push_error("WorldRoot: no game to show")
		return
	_compose()
	session.state_changed.connect(_on_state_changed)


func _exit_tree() -> void:
	if session != null and session.state_changed.is_connected(_on_state_changed):
		session.state_changed.disconnect(_on_state_changed)


func _compose() -> void:
	devices = DeviceTracker.new()
	devices.name = "DeviceTracker"
	add_child(devices)

	controller = PlayerController.new()
	controller.name = "Player"
	controller.session = session
	visual = PlayerVisual.new()
	visual.name = "PlayerVisual"
	visual.session = session
	visual.settings = settings
	controller.add_child(visual)
	add_child(controller)

	# The camera first: the driver applies the tier (and High's depth of field on the camera) when it enters.
	driver = AtmosphereDriver.new()
	driver.session = session
	driver.settings = settings
	rig = CameraRig.new()
	rig.name = "CameraRig"
	rig.target = controller
	add_child(rig)
	rig.camera().attributes = driver.camera_attributes
	rig.camera().current = true
	add_child(driver)

	marker = LessonMarker.new()
	marker.name = "LessonMarker"
	marker.session = session
	add_child(marker)

	combat = CombatLayer.new()
	combat.session = session
	combat.controller = controller
	add_child(combat)

	_enter_zone()

	hud = Hud.new()
	hud.name = "Hud"
	hud.session = session
	hud.settings = settings
	hud.save_service = save_service
	hud.devices = devices
	add_child(hud)
	hud.bind_world(marker, rig)

	panel_host = PanelHost.new()
	panel_host.name = "PanelHost"
	panel_host.session = session
	panel_host.settings = settings
	panel_host.save_service = save_service
	# Before add_child: the host builds its own toast stack in _ready when none is given.
	panel_host.toasts = hud.toasts
	add_child(panel_host)
	panel_host.quit_to_title_requested.connect(func() -> void: quit_to_title.emit())

	apply_render()


## The rig's camera (the current one).
func camera() -> Camera3D:
	return rig.camera()


## Applies the current tier to this viewport, the driver's environment and sun, and the camera's attributes.
func apply_render() -> void:
	if settings == null:
		return
	RenderApplier.apply(settings.tier(), get_viewport(), driver.world_environment.environment, driver.sun)


## Builds the view and walls of the player's location, puts the body on the state pose (pushed out of blocked
## tiles), sizes (closer indoors) and snaps the camera and reapplies the atmosphere.
func _enter_zone(respawn: bool = true) -> void:
	var state := session.state
	var player: Dictionary = state["player"]
	var location: String = player["location"]
	# Freed at once (no orphan nodes in between): this runs inside a session signal, never in a physics callback.
	if zone_view != null:
		remove_child(zone_view)
		zone_view.free()
	if walls != null:
		remove_child(walls)
		walls.free()
	zone_view = ZoneView.new()
	zone_view.name = "ZoneView"
	zone_view.build(location, state)
	add_child(zone_view)
	walls = CollisionBuilder.build(GameStateUtil.current_grid(state), CollisionBuilder.extra_blocked_for(location))
	add_child(walls)
	controller.sync_from_state()
	rig.camera().size = CameraMath.ortho_size_for(location)
	rig.snap()
	driver.follow(controller.global_position)
	# Assigning the view forces the next apply_state to tint it.
	driver.zone_view = zone_view
	driver.apply_state(session.state)
	_view_floor = player["floor"]
	_view_mined = Mossdeep.mined_count(state)
	if respawn:
		combat.enter_zone(location)


func _on_state_changed() -> void:
	if session.state.is_empty():
		return
	var player: Dictionary = session.state["player"]
	var floor_n: int = player["floor"]
	if player["location"] != zone_view.zone or (player["location"] == "mossdeep" and floor_n != _view_floor):
		_enter_zone()
	elif player["location"] == "mossdeep" and Mossdeep.mined_count(session.state) != _view_mined:
		# A node broke: rebuild the floor's view and walls, but keep the enemies.
		_enter_zone(false)
	else:
		zone_view.sync(session.state)


func _physics_process(_delta: float) -> void:
	if controller == null:
		return
	if session.screen != "game":
		controller.set_intent(Vector2.ZERO, false)
		return
	# Only the held inputs are used here; the reader is never polled, so it latches nothing.
	_reader.read(_intents)
	var move: Vector2 = _intents["move"]
	var run: bool = _intents["run"]
	controller.set_intent(move, run)


func _process(_delta: float) -> void:
	if controller != null:
		driver.follow(controller.global_position)
