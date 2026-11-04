class_name MenuScreen
extends Control
## The frame of the full-screen menus (title, new game, slot picker): an opaque backdrop, a centred panel with a
## heading over a content column, the one UI theme at Settings.ui_scale, and keyboard / gamepad navigation (ui_up and
## ui_down move focus through the visible, enabled controls and wrap; the first control is focused when the screen is
## shown). Subclasses override `prepare()` (injectables), `build()` (controls, once) and `refresh()` (text and
## visibility only). Unlike the modal panels these cover the whole window and run before any game exists.

const SettingsScript := preload("res://game/autoload/settings.gd")
## Heading size relative to the body text.
const HEADING_SCALE := 1.6
const SEASON_NAME := {"spring": "Spring", "summer": "Summer", "fall": "Fall", "winter": "Winter"}

## Injectable for tests; defaults to the Settings autoload.
var settings: SettingsScript
var heading: Label
var column: VBoxContainer
var panel: PanelContainer
var _ui_scale: float = 1.0


func _ready() -> void:
	if settings == null:
		settings = get_node_or_null("/root/Settings") as SettingsScript
	prepare()
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	var backdrop := ColorRect.new()
	backdrop.color = ThemeFactory.PANEL.darkened(0.55)
	backdrop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	backdrop.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(backdrop)
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(center)
	panel = PanelContainer.new()
	center.add_child(panel)
	column = VBoxContainer.new()
	column.add_theme_constant_override("separation", 10)
	panel.add_child(column)
	heading = Label.new()
	heading.add_theme_color_override("font_color", ThemeFactory.ACCENT_BRIGHT)
	column.add_child(heading)
	build()
	apply_scale(settings.ui_scale if settings != null else 1.0)
	if settings != null:
		settings.ui_scale_changed.connect(apply_scale)
	visibility_changed.connect(_on_visibility_changed)
	refresh()
	focus_first()


func _exit_tree() -> void:
	if settings != null and settings.ui_scale_changed.is_connected(apply_scale):
		settings.ui_scale_changed.disconnect(apply_scale)


## Sets up injectables that default to real services (override it).
func prepare() -> void:
	pass


## Builds the controls once (override it).
func build() -> void:
	pass


## Updates text and visibility from the current data; creates no nodes (override it).
func refresh() -> void:
	pass


func apply_scale(ui_scale: float) -> void:
	_ui_scale = ui_scale
	theme = ThemeFactory.make(ui_scale)
	heading.add_theme_font_size_override("font_size", floori(ThemeFactory.font_size(ui_scale) * HEADING_SCALE))
	panel.custom_minimum_size = Vector2(480.0 * ui_scale, 0.0)


func _on_visibility_changed() -> void:
	if visible:
		refresh()
		focus_first()


## The visible, enabled controls that take focus, in tree order.
func focusables() -> Array[Control]:
	var out: Array[Control] = []
	_collect(self, out)
	return out


func _collect(node: Node, out: Array[Control]) -> void:
	for child: Node in node.get_children():
		var c := child as Control
		if c == null or not c.visible:
			continue
		if c.focus_mode != Control.FOCUS_NONE:
			var b := c as BaseButton
			if b == null or not b.disabled:
				out.append(c)
		_collect(c, out)


func focus_first() -> void:
	if not is_inside_tree() or not is_visible_in_tree():
		return
	var list := focusables()
	if not list.is_empty():
		list[0].grab_focus()


## Moves the focus `dir` (1 or -1) through the focusable controls, wrapping.
func move_focus(dir: int) -> void:
	var list := focusables()
	if list.is_empty():
		return
	var i := list.find(get_viewport().gui_get_focus_owner())
	if i < 0:
		# Nothing in the list is focused: forward starts at the first control, backward at the last.
		list[0 if dir > 0 else list.size() - 1].grab_focus()
		return
	list[posmod(i + dir, list.size())].grab_focus()


## Keeps the focus on a visible control after `refresh()` hid or disabled the focused one.
func keep_focus() -> void:
	if not is_inside_tree() or not is_visible_in_tree():
		return
	var owner := get_viewport().gui_get_focus_owner()
	var list := focusables()
	if list.is_empty() or list.has(owner):
		return
	list[0].grab_focus()


## The screen's own "back" (ui_cancel); screens with a Back button override it.
func go_back() -> bool:
	return false


func _input(event: InputEvent) -> void:
	if not is_visible_in_tree():
		return
	if event.is_action_pressed("ui_cancel", false, true) and go_back():
		get_viewport().set_input_as_handled()
	elif event.is_action_pressed("ui_down", true):
		move_focus(1)
		get_viewport().set_input_as_handled()
	elif event.is_action_pressed("ui_up", true):
		move_focus(-1)
		get_viewport().set_input_as_handled()


## The first visible Button whose text is `text`, or null.
func button(text: String) -> Button:
	for node: Node in find_children("*", "Button", true, false):
		var b: Button = node
		if b.is_visible_in_tree() and b.text == text:
			return b
	return null


## Every visible Label and Button text, for tests and checks.
func texts() -> Array[String]:
	var out: Array[String] = []
	for node: Node in find_children("*", "", true, false):
		var c := node as Control
		if c == null or not c.is_visible_in_tree():
			continue
		if c is Label:
			var label: Label = c
			out.append(label.text)
		elif c is Button:
			var b: Button = c
			out.append(b.text)
	return out


## apps/web/src/ui/format.ts playTime.
static func play_time(ms: int) -> String:
	var total := floori(ms / 60000.0)
	var h := floori(total / 60.0)
	var m := total - h * 60
	return "%d h %d min played" % [h, m] if h > 0 else "%d min played" % m


## apps/web/src/ui/format.ts dateLine.
static func date_line(calendar: Dictionary) -> String:
	var season: String = calendar["season"]
	var year: int = calendar["year"]
	var day: int = calendar["day"]
	return "Year %d, %s %d" % [year, SEASON_NAME[season], day]


## Builds a muted wrapped label.
static func muted(text: String = "") -> Label:
	return ModalPanel.make_muted(text, true)
