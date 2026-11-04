class_name GoalCard
extends PanelContainer
## The current lesson under the clock (apps/web/src/ui/lessons/GoalCard.tsx): title, a "2 / 3" pill for counted and
## water lessons, "Ripe in N days" while harvesting, and when expanded the body text and the control hint of the
## active device. Hidden when the lessons are off or complete, or the game screen is not running. A finished lesson
## shows ticked for a moment. Expanding and collapsing fade the body with a short Tween. Built once; `refresh` only
## changes text. Nothing here takes focus or clicks, so (unlike the web) the head cannot be clicked to toggle.

const FADE_S := 0.15
const WIDTH := 340.0

var _icon: Label
var _title: Label
var _sub: Label
var _pill: Label
var _body_box: VBoxContainer
var _body: Label
var _hint: Label
var _open: bool = false
var _tween: Tween


func _init() -> void:
	focus_mode = Control.FOCUS_NONE
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	custom_minimum_size = Vector2(WIDTH, 0)
	visible = false
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 6)
	var head := HBoxContainer.new()
	head.add_theme_constant_override("separation", 10)
	_icon = _label()
	var titles := VBoxContainer.new()
	titles.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_title = _label()
	_sub = _label()
	_sub.visible = false
	titles.add_child(_title)
	titles.add_child(_sub)
	_pill = _label()
	_pill.visible = false
	head.add_child(_icon)
	head.add_child(titles)
	head.add_child(_pill)
	_body_box = VBoxContainer.new()
	_body_box.add_theme_constant_override("separation", 6)
	_body_box.visible = false
	_body = _label()
	_body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_hint = _label()
	_hint.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_hint.add_theme_color_override("font_color", ThemeFactory.ACCENT_BRIGHT)
	_body_box.add_child(_body)
	_body_box.add_child(_hint)
	column.add_child(head)
	column.add_child(_body_box)
	add_child(column)


func _label() -> Label:
	var l := Label.new()
	l.focus_mode = Control.FOCUS_NONE
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return l


func apply_scale(ui_scale: float) -> void:
	custom_minimum_size = Vector2(WIDTH * ui_scale, 0)


## Updates the card. `shown` is whether the game screen is running; `ui` the transient state.
func refresh(state: Dictionary, ui: LessonUiState, device: String, shown: bool) -> void:
	var tutorial: Dictionary = state["tutorial"]
	var lesson: String = tutorial["lesson"]
	if not shown or lesson == "off" or lesson == "complete":
		visible = false
		return
	visible = true
	var flashing := ui.done_flash != ""
	var id := ui.done_flash if flashing else lesson
	_icon.text = "✓" if flashing else "•"
	_title.text = LessonText.title_of(id)
	var progress := "" if flashing else LessonText.progress(state, id)
	_pill.text = progress
	_pill.visible = progress != ""
	var ripe := LessonText.ripe_in(state) if not flashing and id == "harvest" else ""
	_sub.text = ripe
	_sub.visible = ripe != ""
	_body.text = LessonText.body_of(id)
	_hint.text = LessonText.hint(id, device, state)
	_set_open(ui.expanded and not flashing)


## Whether the body is (or is fading) open.
func is_open() -> bool:
	return _open


## Whether the body box is visible (it stays visible during the fade-out).
func body_visible() -> bool:
	return _body_box.visible


func title_text() -> String:
	return _title.text


func pill_text() -> String:
	return _pill.text if _pill.visible else ""


func sub_text() -> String:
	return _sub.text if _sub.visible else ""


func body_text() -> String:
	return _body.text


func hint_text() -> String:
	return _hint.text


func icon_text() -> String:
	return _icon.text


func _set_open(open: bool) -> void:
	if open == _open:
		return
	_open = open
	if _tween != null and _tween.is_valid():
		_tween.kill()
	if not is_inside_tree():
		_body_box.visible = open
		return
	_tween = create_tween()
	if open:
		_body_box.modulate.a = 0.0
		_body_box.visible = true
		_tween.tween_property(_body_box, "modulate:a", 1.0, FADE_S)
	else:
		_tween.tween_property(_body_box, "modulate:a", 0.0, FADE_S)
		_tween.tween_callback(_hide_body)


func _hide_body() -> void:
	if not _open:
		_body_box.visible = false
