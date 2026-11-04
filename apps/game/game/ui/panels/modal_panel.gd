class_name ModalPanel
extends PanelContainer
## The frame every modal panel shares, the Godot side of apps/web/src/ui/screens/Panel.tsx: a title line over a body.
## A panel builds its Control tree once in `build()` (called by the PanelHost after `host` and `session` are set),
## and `refresh()` only changes text, visibility and pressed states (rows come from a pool that grows, never from
## per-refresh nodes). Panels read `session.state` live and never cache it; they change the game only through
## `session.dispatch`. Every Button takes focus (FOCUS_ALL): panels are the focus owners, unlike the HUD.

## Emitted when the panel's own view state changed (a pick, a stepper, a confirm): the host refreshes it and keeps
## the focus on a visible control.
signal content_changed

const GameSessionScript := preload("res://game/autoload/game_session.gd")
## Panel.tsx's default close label.
const CLOSE := "Close"
const MIN_WIDTH := 520

var host: PanelHost
var session: GameSessionScript
var title_label: Label
var body: VBoxContainer
var _ui_scale: float = 1.0


func _init() -> void:
	visible = false
	mouse_filter = Control.MOUSE_FILTER_STOP
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 12)
	add_child(column)
	title_label = Label.new()
	title_label.add_theme_color_override("font_color", ThemeFactory.ACCENT_BRIGHT)
	column.add_child(title_label)
	body = VBoxContainer.new()
	body.add_theme_constant_override("separation", 10)
	column.add_child(body)


## Builds the panel's controls once (override it).
func build() -> void:
	pass


## Called by the host each time the panel opens, before `refresh()`: resets view state (picks, steppers).
func on_open() -> void:
	pass


## Updates every control from `session.state`. Creates no nodes except new pooled rows.
func refresh() -> void:
	pass


func apply_scale(ui_scale: float) -> void:
	_ui_scale = ui_scale
	custom_minimum_size = Vector2(MIN_WIDTH * ui_scale, 0)


## The panel's controls that can take focus right now, in tree order (the web's FOCUSABLE list: visible, enabled).
func focusables() -> Array[Control]:
	var out: Array[Control] = []
	_collect_focusables(self, out)
	return out


func _collect_focusables(node: Node, out: Array[Control]) -> void:
	for child: Node in node.get_children():
		var c := child as Control
		if c == null or not c.visible:
			continue
		if c.focus_mode != Control.FOCUS_NONE:
			var b := c as BaseButton
			if b == null or not b.disabled:
				out.append(c)
		_collect_focusables(c, out)


## The first visible Button whose text or accessibility name is `text`, or null.
func button(text: String) -> Button:
	for node: Node in find_children("*", "Button", true, false):
		var b: Button = node
		if b.is_visible_in_tree() and (b.text == text or b.accessibility_name == text):
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


## A Button that takes focus, with `text` and an optional accessible name (the web's aria-label).
static func make_button(text: String, accessible: String = "") -> Button:
	var b := Button.new()
	b.text = text
	b.focus_mode = Control.FOCUS_ALL
	if accessible != "":
		b.accessibility_name = accessible
	return b


static func make_label(text: String = "", wrap: bool = false) -> Label:
	var label := Label.new()
	label.text = text
	if wrap:
		label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	return label


## A muted line (the web's `.muted`).
static func make_muted(text: String = "", wrap: bool = true) -> Label:
	var label := make_label(text, wrap)
	label.add_theme_color_override("font_color", ThemeFactory.TEXT.darkened(0.25))
	return label


static func make_row() -> HBoxContainer:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	return row
