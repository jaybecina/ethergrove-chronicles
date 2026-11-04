class_name PanelHost
extends CanvasLayer
## Hosts the modal panels above the HUD and decides which one is open (at most one). Opening sets the session's
## screen to "modal" ("paused" for the pause menu), which stops the clock and the commands; closing restores "game".
## Opening another panel replaces the open one; nothing opens on the title screen.
##
## What opens a panel: `GameSession.events` (`openUi` → bin, cart or sleep; `talked` → the dialogue box; a
## `shippingReport` with a total above 0 followed by `dayStarted` in the same batch → the morning report, as
## uiBridge.ts), `GameSession.menu_requested` (toggles the pause menu) and `GameSession.bag_requested` (toggles the
## bag). `lessonsComplete` only shows toasts here (Task 15 draws the card).
##
## Input: while a panel is open, cancel, ui_cancel and the menu key close it, and the bag key closes the bag; the
## arrows (ui_up/down/left/right, which include the gamepad D-pad) move focus through the panel's controls in order
## and wrap, as the web's useMenuNavigation; ui_accept presses the focused Button (Godot's own handling). Every press
## the host uses is marked handled so it never reaches the game as well.

## Emitted by "Save and quit" after the screen became "title"; WorldRoot returns to the title screen.
signal quit_to_title_requested

const GameSessionScript := preload("res://game/autoload/game_session.gd")
const SettingsScript := preload("res://game/autoload/settings.gd")
const SaveServiceScript := preload("res://game/autoload/save_service.gd")

const PANEL_IDS: Array[String] = ["bag", "bin", "cart", "sleep", "morning", "dialogue", "pause", "forge", "stove", "well"]
## Above the HUD (layer 1).
const LAYER := 10
const BACKDROP := Color(0.08, 0.05, 0.03, 0.55)
## lessonText.ts COMPLETE_TEXT (the toast stands in for the card until Task 15).
const COMPLETE_TITLE := "The rest is yours"
const COMPLETE_GIFT := "Tucked in the last page: %d gold."

## Injectable for tests; default to the autoloads.
var session: GameSessionScript
var settings: SettingsScript
var save_service: SaveServiceScript
## Where Export save writes.
var export_dir: String = "user://exports"
## The toast stack to use (WorldRoot passes the HUD's); when unset the host shows its own.
var toasts: Toasts

## The full-screen Control holding the backdrop and the open panel; it carries the scaled theme.
var root: Control
var _panels: Dictionary[String, ModalPanel] = {}
var _current: String = ""
var _own_toasts: bool = false


func _ready() -> void:
	layer = LAYER
	if session == null:
		session = get_node_or_null("/root/GameSession") as GameSessionScript
	if settings == null:
		settings = get_node_or_null("/root/Settings") as SettingsScript
	if save_service == null:
		save_service = get_node_or_null("/root/SaveService") as SaveServiceScript
	_build()
	apply_scale(settings.ui_scale if settings != null else 1.0)
	_connect()


## `_ready` runs once; a host removed from the tree and added again reconnects here.
func _enter_tree() -> void:
	if root != null:
		_connect()


func _exit_tree() -> void:
	if session != null:
		_disconnect(session.events, _on_events)
		_disconnect(session.state_changed, _on_state_changed)
		_disconnect(session.menu_requested, _on_menu_requested)
		_disconnect(session.bag_requested, _on_bag_requested)
	if settings != null:
		_disconnect(settings.ui_scale_changed, apply_scale)


static func _disconnect(sig: Signal, callable: Callable) -> void:
	if sig.is_connected(callable):
		sig.disconnect(callable)


static func _connect_once(sig: Signal, callable: Callable) -> void:
	if not sig.is_connected(callable):
		sig.connect(callable)


func _connect() -> void:
	if session != null:
		_connect_once(session.events, _on_events)
		_connect_once(session.state_changed, _on_state_changed)
		_connect_once(session.menu_requested, _on_menu_requested)
		_connect_once(session.bag_requested, _on_bag_requested)
	if settings != null:
		_connect_once(settings.ui_scale_changed, apply_scale)


func _build() -> void:
	root = Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_STOP
	root.visible = false
	add_child(root)
	var backdrop := ColorRect.new()
	backdrop.color = BACKDROP
	backdrop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.add_child(backdrop)
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.add_child(center)
	var made: Array[ModalPanel] = [
		BagPanel.new(), BinPanel.new(), CartPanel.new(), SleepConfirm.new(), MorningReport.new(), DialogueBox.new(),
		PauseMenu.new(), ForgePanel.new(), StovePanel.new(), WellPanel.new(),
	]
	for i: int in PANEL_IDS.size():
		var panel := made[i]
		panel.name = PANEL_IDS[i]
		panel.host = self
		panel.session = session
		panel.build()
		panel.content_changed.connect(_refresh_current)
		center.add_child(panel)
		_panels[PANEL_IDS[i]] = panel
	if toasts == null:
		toasts = Toasts.new()
		_own_toasts = true
		var box := MarginContainer.new()
		box.add_theme_constant_override("margin_top", 16)
		box.mouse_filter = Control.MOUSE_FILTER_IGNORE
		box.add_child(toasts)
		add_child(box)
		box.set_anchors_and_offsets_preset(Control.PRESET_CENTER_TOP, Control.PRESET_MODE_MINSIZE)
		box.grow_horizontal = Control.GROW_DIRECTION_BOTH


func apply_scale(ui_scale: float) -> void:
	var theme := ThemeFactory.make(ui_scale)
	root.theme = theme
	if _own_toasts:
		toasts.get_parent_control().theme = theme
	for panel: ModalPanel in _panels.values():
		panel.apply_scale(ui_scale)


func is_open() -> bool:
	return _current != ""


## The open panel's id, or "".
func current() -> String:
	return _current


func panel_of(panel_id: String) -> ModalPanel:
	return _panels.get(panel_id, null)


## The open panel, or null.
func current_panel() -> ModalPanel:
	return panel_of(_current)


## Opens a panel (replacing any open one). False, with nothing changed, for an unknown id, without a game, or on the
## title screen.
func open(panel_id: String) -> bool:
	if not _panels.has(panel_id) or session == null or session.state.is_empty() or session.screen == "title":
		return false
	if _current != "" and _current != panel_id:
		_panels[_current].visible = false
	_current = panel_id
	var panel := _panels[panel_id]
	panel.on_open()
	panel.refresh()
	panel.visible = true
	root.visible = true
	session.set_screen("paused" if panel_id == "pause" else "modal")
	focus_first()
	return true


## Closes the open panel and gives the game back its input and clock.
func close() -> void:
	if not _hide_current():
		return
	session.set_screen("game")


## The dialogue box with a villager's name and line.
func open_dialogue(villager_name: String, text: String) -> bool:
	var box: DialogueBox = _panels["dialogue"]
	box.show_line(villager_name, text)
	return open("dialogue")


## The morning report for a `shippingReport` event.
func open_morning(report: Dictionary) -> bool:
	var panel: MorningReport = _panels["morning"]
	panel.set_report(report)
	return open("morning")


## "Save and quit": hides the menu, shows the title screen and tells WorldRoot.
func quit_to_title() -> void:
	_hide_current()
	session.set_screen("title")
	quit_to_title_requested.emit()


## Pushes a toast ("info" or "warn") on the toast stack.
func toast(text: String, kind: String = "info", duration_ms: int = Toasts.DURATION_MS) -> void:
	toasts.push(text, kind, -1, duration_ms)


## Focuses the open panel's first focusable control.
func focus_first() -> void:
	var panel := current_panel()
	if panel == null:
		return
	var list := panel.focusables()
	if not list.is_empty():
		list[0].grab_focus()


## Moves the focus `dir` (1 or -1) through the open panel's controls, wrapping (the web's useMenuNavigation).
func move_focus(dir: int) -> void:
	var panel := current_panel()
	if panel == null:
		return
	var list := panel.focusables()
	if list.is_empty():
		return
	var i := list.find(get_viewport().gui_get_focus_owner())
	list[posmod(i + dir, list.size())].grab_focus()


func _hide_current() -> bool:
	if _current == "":
		return false
	_panels[_current].visible = false
	_current = ""
	root.visible = false
	var viewport := get_viewport()
	if viewport != null:
		viewport.gui_release_focus()
	return true


## Refreshes the open panel and keeps the focus on a visible control: the same one when it is still shown, else the
## one now at its old position.
func _refresh_current() -> void:
	var panel := current_panel()
	if panel == null:
		return
	var owner := get_viewport().gui_get_focus_owner()
	var index := panel.focusables().find(owner)
	panel.refresh()
	var after := panel.focusables()
	if after.is_empty() or (owner != null and after.has(owner)):
		return
	after[clampi(index, 0, after.size() - 1)].grab_focus()


func _on_state_changed() -> void:
	if session.state.is_empty():
		return
	_refresh_current()


func _on_menu_requested() -> void:
	if is_open():
		close()
	else:
		open("pause")


func _on_bag_requested() -> void:
	if _current == "bag":
		close()
	else:
		open("bag")


func _on_events(events: Array) -> void:
	var report: Dictionary = {}
	for e: Dictionary in events:
		var type: String = e["type"]
		match type:
			"openUi":
				var ui: String = e["ui"]
				open(ui)
			"talked":
				var villager_name: String = e["name"]
				var text: String = e["text"]
				open_dialogue(villager_name, text)
			"shippingReport":
				var total: int = e["total"]
				report = e if total > 0 else {}
			"dayStarted":
				if not report.is_empty():
					open_morning(report)
					report = {}
			"lessonsComplete":
				toast(COMPLETE_TITLE)
				var gift: int = e.get("gift", 0)
				if gift > 0:
					toast(COMPLETE_GIFT % gift)


func _input(event: InputEvent) -> void:
	if _current == "":
		return
	if not event.is_echo() and (
		event.is_action_pressed(InputActions.CANCEL)
		or event.is_action_pressed("ui_cancel")
		or event.is_action_pressed(InputActions.MENU)
		or (_current == "bag" and event.is_action_pressed(InputActions.BAG))
	):
		close()
		get_viewport().set_input_as_handled()
		return
	if _is_nav(event):
		_navigate(event)


static func _is_nav(event: InputEvent) -> bool:
	return (
		event.is_action_pressed("ui_down", true)
		or event.is_action_pressed("ui_right", true)
		or event.is_action_pressed("ui_up", true)
		or event.is_action_pressed("ui_left", true)
	)


func _navigate(event: InputEvent) -> void:
	var forward := event.is_action_pressed("ui_down", true) or event.is_action_pressed("ui_right", true)
	move_focus(1 if forward else -1)
	get_viewport().set_input_as_handled()


func _process(_delta: float) -> void:
	if _own_toasts:
		toasts.tick(Time.get_ticks_msec())
