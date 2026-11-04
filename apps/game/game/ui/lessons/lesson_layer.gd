class_name LessonLayer
extends Control
## The tutorial part of the HUD: the note card above the goal card (top left, under the clock) and the marker
## pointer. Owns the `LessonUiState`. The Hud feeds it `refresh` (state change), `on_events` (session events) and
## `tick` (every frame). It never takes focus or clicks (the NoteCard reads confirm/cancel from `_input`
## without consuming them).

const GameSessionScript := preload("res://game/autoload/game_session.gd")
const MARGIN_LEFT := 16
## Below the three-line clock label.
const MARGIN_TOP := 124

var session: GameSessionScript
var devices: DeviceTracker
var ui: LessonUiState = LessonUiState.new()
var goal_card: GoalCard
var note_card: NoteCard
var pointer: MarkerPointer

## A game just began: open the goal card the next time the game screen shows.
var _pending_enter: bool = true
var _device: String = "keyboard"


func _init() -> void:
	focus_mode = Control.FOCUS_NONE
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", MARGIN_LEFT)
	margin.add_theme_constant_override("margin_top", MARGIN_TOP)
	margin.focus_mode = Control.FOCUS_NONE
	margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	margin.set_anchors_and_offsets_preset(Control.PRESET_TOP_LEFT, Control.PRESET_MODE_MINSIZE)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 8)
	column.focus_mode = Control.FOCUS_NONE
	column.mouse_filter = Control.MOUSE_FILTER_IGNORE
	note_card = NoteCard.new()
	goal_card = GoalCard.new()
	column.add_child(note_card)
	column.add_child(goal_card)
	margin.add_child(column)
	add_child(margin)
	pointer = MarkerPointer.new()
	add_child(pointer)
	note_card.dismissed.connect(_on_note_dismissed)


## Connects the session and device tracker. Call once, after both exist.
func bind(new_session: GameSessionScript, new_devices: DeviceTracker) -> void:
	session = new_session
	pointer.session = new_session
	devices = new_devices
	if devices != null:
		_device = devices.device
		devices.device_changed.connect(_on_device_changed)
	if session != null:
		session.session_started.connect(_on_session_started)


func apply_scale(ui_scale: float) -> void:
	goal_card.apply_scale(ui_scale)
	note_card.apply_scale(ui_scale)


func _shown() -> bool:
	return session != null and not session.state.is_empty() and session.screen == "game"


## Redraws the cards from the game state.
func refresh(state: Dictionary) -> void:
	_sync_visibility(Time.get_ticks_msec())
	goal_card.refresh(state, ui, _device, ui.visible)
	note_card.refresh(ui, _device, ui.visible)


func on_events(events: Array, now_ms: int) -> void:
	for event: Dictionary in events:
		ui.on_event(event, now_ms)
	if session != null and not session.state.is_empty():
		refresh(session.state)


## Per frame: fires due timers and notices screen changes. Redraws only when something changed.
func tick(now_ms: int) -> void:
	var changed := _sync_visibility(now_ms)
	if ui.tick(now_ms):
		changed = true
	if changed and session != null and not session.state.is_empty():
		goal_card.refresh(session.state, ui, _device, ui.visible)
		note_card.refresh(ui, _device, ui.visible)


func _sync_visibility(now_ms: int) -> bool:
	var shown := _shown()
	if shown == ui.visible:
		return false
	ui.set_visible(shown, now_ms)
	if shown and _pending_enter:
		_pending_enter = false
		var tutorial: Dictionary = session.state["tutorial"]
		ui.enter_game(str(tutorial["lesson"]), now_ms)
	return true


func _on_session_started() -> void:
	ui = LessonUiState.new()
	_pending_enter = true


func _on_device_changed(device: String) -> void:
	_device = device
	if session != null and not session.state.is_empty():
		goal_card.refresh(session.state, ui, _device, ui.visible)
		note_card.refresh(ui, _device, ui.visible)


func _on_note_dismissed() -> void:
	ui.dismiss_note(Time.get_ticks_msec())
	note_card.refresh(ui, _device, ui.visible)
