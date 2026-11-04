class_name Hud
extends CanvasLayer
## The always-on heads-up display: clock (top left), gold (top right), toasts (top centre), prompt line and hotbar
## (bottom centre) and the energy bar (bottom left). The Control tree is built once in `_ready`; `refresh(state)` only
## changes text, values and styles. It follows `GameSession.state_changed` and shows the toasts of
## `GameSession.events`. Nothing here takes focus or clicks.
##
## `state_changed` is not emitted for the player's pose, so the prompt line (which depends on the tile faced) is also
## refreshed from `_process` when that tile changes; nothing else is polled.

const GameSessionScript := preload("res://game/autoload/game_session.gd")
const SettingsScript := preload("res://game/autoload/settings.gd")
const SaveServiceScript := preload("res://game/autoload/save_service.gd")
const MARGIN := 16
## The same failure toast is not repeated within this many ms (uiBridge.ts).
const FAIL_REPEAT_MS := 1500

## Injectable for tests; defaults to the autoloads.
var session: GameSessionScript
var settings: SettingsScript
var save_service: SaveServiceScript
## The input device last used; the lesson hints name its keys. Injectable for tests.
var devices: DeviceTracker

var root: Control
var clock: ClockLabel
var gold: GoldLabel
var energy: EnergyBar
var hotbar: Hotbar
var prompt: Prompt
var toasts: Toasts
## The tutorial cards and marker pointer (Task 15). `goal_card` and `note_card` are the layer's.
var lesson_layer: LessonLayer
var goal_card: GoalCard
var note_card: NoteCard

var _last_fail_reason: String = ""
var _last_fail_ms: int = -FAIL_REPEAT_MS
var _last_target: Vector2i = Vector2i(-9999, -9999)
var _last_location: String = ""


func _ready() -> void:
	if session == null:
		session = get_node_or_null("/root/GameSession") as GameSessionScript
	if settings == null:
		settings = get_node_or_null("/root/Settings") as SettingsScript
	if save_service == null:
		save_service = get_node_or_null("/root/SaveService") as SaveServiceScript
	if devices == null:
		devices = DeviceTracker.new()
		add_child(devices)
	_build()
	lesson_layer.bind(session, devices)
	var ui_scale := 1.0
	if settings != null:
		ui_scale = settings.ui_scale
	apply_scale(ui_scale)
	_connect()
	if session != null:
		_on_state_changed()


## `_ready` runs once; a Hud removed from the tree and added again reconnects here.
func _enter_tree() -> void:
	if root != null:
		_connect()


func _exit_tree() -> void:
	if session != null:
		if session.state_changed.is_connected(_on_state_changed):
			session.state_changed.disconnect(_on_state_changed)
		if session.events.is_connected(_on_events):
			session.events.disconnect(_on_events)
	if settings != null and settings.ui_scale_changed.is_connected(apply_scale):
		settings.ui_scale_changed.disconnect(apply_scale)
	if save_service != null and save_service.save_failed.is_connected(_on_save_failed):
		save_service.save_failed.disconnect(_on_save_failed)


func _connect() -> void:
	if session != null:
		if not session.state_changed.is_connected(_on_state_changed):
			session.state_changed.connect(_on_state_changed)
		if not session.events.is_connected(_on_events):
			session.events.connect(_on_events)
	if settings != null and not settings.ui_scale_changed.is_connected(apply_scale):
		settings.ui_scale_changed.connect(apply_scale)
	if save_service != null and not save_service.save_failed.is_connected(_on_save_failed):
		save_service.save_failed.connect(_on_save_failed)


func _build() -> void:
	root = Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(root)

	clock = ClockLabel.new()
	gold = GoldLabel.new()
	energy = EnergyBar.new()
	hotbar = Hotbar.new()
	prompt = Prompt.new()
	toasts = Toasts.new()

	lesson_layer = LessonLayer.new()
	goal_card = lesson_layer.goal_card
	note_card = lesson_layer.note_card
	root.add_child(lesson_layer)

	_corner(Control.PRESET_TOP_LEFT, clock)
	# Right and bottom corners grow inwards, so a wider amount stays on screen (found by eye in Task 17).
	_corner(Control.PRESET_TOP_RIGHT, gold).grow_horizontal = Control.GROW_DIRECTION_BEGIN
	_corner(Control.PRESET_BOTTOM_LEFT, energy).grow_vertical = Control.GROW_DIRECTION_BEGIN
	var top := _corner(Control.PRESET_CENTER_TOP, toasts)
	top.grow_horizontal = Control.GROW_DIRECTION_BOTH

	var bottom := VBoxContainer.new()
	bottom.add_theme_constant_override("separation", 8)
	bottom.alignment = BoxContainer.ALIGNMENT_END
	prompt.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	hotbar.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	bottom.add_child(prompt)
	bottom.add_child(hotbar)
	var bottom_margin := _corner(Control.PRESET_CENTER_BOTTOM, bottom)
	bottom_margin.grow_horizontal = Control.GROW_DIRECTION_BOTH
	bottom_margin.grow_vertical = Control.GROW_DIRECTION_BEGIN
	_passive(root)


## Wraps `child` in a margin container anchored at `preset`.
func _corner(preset: Control.LayoutPreset, child: Control) -> MarginContainer:
	var m := MarginContainer.new()
	for side: String in ["left", "right", "top", "bottom"]:
		m.add_theme_constant_override("margin_" + side, MARGIN)
	m.add_child(child)
	root.add_child(m)
	m.set_anchors_and_offsets_preset(preset, Control.PRESET_MODE_MINSIZE)
	return m


## The HUD never steals focus or clicks.
func _passive(node: Node) -> void:
	if node is Control:
		var c: Control = node
		c.focus_mode = Control.FOCUS_NONE
		c.mouse_filter = Control.MOUSE_FILTER_IGNORE
	for child: Node in node.get_children():
		_passive(child)


func apply_scale(ui_scale: float) -> void:
	root.theme = ThemeFactory.make(ui_scale)
	hotbar.apply_scale(ui_scale)
	energy.custom_minimum_size = Vector2(200, 22) * ui_scale
	lesson_layer.apply_scale(ui_scale)


## Gives the tutorial pointer the lesson marker and the camera (the world scene owns both). Task 17's WorldRoot
## calls this when it composes the world, and must add the `LessonMarker` node to the world scene itself.
func bind_world(marker: LessonMarker, rig: CameraRig) -> void:
	lesson_layer.pointer.marker = marker
	lesson_layer.pointer.camera_rig = rig


## Updates every widget from a game state. No nodes are created.
func refresh(state: Dictionary) -> void:
	clock.refresh(state)
	gold.refresh(state)
	energy.refresh(state)
	hotbar.refresh(state)
	prompt.refresh(state)
	lesson_layer.refresh(state)
	_remember_target(state)


func _remember_target(state: Dictionary) -> void:
	var player: Dictionary = state["player"]
	_last_target = Grid.target_tile(player)
	_last_location = player["location"]


func _on_state_changed() -> void:
	if not session.state.is_empty():
		refresh(session.state)


func _on_events(events: Array) -> void:
	var now := Time.get_ticks_msec()
	lesson_layer.on_events(events, now)
	for event: Dictionary in events:
		var toast := Toasts.toast_for(event)
		if toast.is_empty():
			continue
		if event["type"] == "actionFailed":
			var reason: String = event["reason"]
			if reason == _last_fail_reason and now - _last_fail_ms < FAIL_REPEAT_MS:
				continue
			_last_fail_reason = reason
			_last_fail_ms = now
		var text: String = toast["text"]
		var kind: String = toast["kind"]
		var duration: int = toast["duration_ms"]
		toasts.push(text, kind, now, duration)


## SaveService.save_failed carries the pause menu's text; the pause menu adds no toast of its own.
func _on_save_failed(message: String) -> void:
	toasts.push(message, "warn")


func _process(_delta: float) -> void:
	var now := Time.get_ticks_msec()
	toasts.tick(now)
	lesson_layer.tick(now)
	if session == null or session.state.is_empty():
		return
	var player: Dictionary = session.state["player"]
	var target := Grid.target_tile(player)
	var location: String = player["location"]
	if target != _last_target or location != _last_location:
		prompt.refresh(session.state)
		_last_target = target
		_last_location = location
