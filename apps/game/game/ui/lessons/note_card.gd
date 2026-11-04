class_name NoteCard
extends PanelContainer
## One-time notes from Grandpa, shown one at a time above the goal card (apps/web/src/ui/lessons/NoteCard.tsx). It is
## not modal: input passes through to the game. While a note shows, `confirm` and `cancel` dismiss it (emitting
## `dismissed`) and nothing is consumed, so a Space press that dismisses also reaches the game. Accepted: the keys
## (Space/Enter/A, Esc/Backspace/B) can dismiss a note while also acting in the game; the note auto-hides after 10 s.

signal dismissed

const WIDTH := 340.0

var _eyebrow: Label
var _title: Label
var _body: Label
var _button: Label
var _note_id: String = ""


func _init() -> void:
	focus_mode = Control.FOCUS_NONE
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	custom_minimum_size = Vector2(WIDTH, 0)
	visible = false
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 4)
	_eyebrow = _label()
	_eyebrow.text = LessonText.NOTE_EYEBROW
	_eyebrow.add_theme_color_override("font_color", ThemeFactory.ACCENT)
	_title = _label()
	_body = _label()
	_body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_button = _label()
	_button.add_theme_color_override("font_color", ThemeFactory.ACCENT_BRIGHT)
	for l: Label in [_eyebrow, _title, _body, _button]:
		column.add_child(l)
	add_child(column)


func _label() -> Label:
	var l := Label.new()
	l.focus_mode = Control.FOCUS_NONE
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return l


func apply_scale(ui_scale: float) -> void:
	custom_minimum_size = Vector2(WIDTH * ui_scale, 0)


func refresh(ui: LessonUiState, device: String, shown: bool) -> void:
	var id := ui.head_note()
	if not shown or id == "":
		visible = false
		_note_id = ""
		return
	if id != _note_id:
		_note_id = id
		_title.text = str(LessonText.NOTE[id]["title"])
		_body.text = str(LessonText.NOTE[id]["body"])
	_button.text = LessonText.dismiss_hint(device)
	visible = true


func note_id() -> String:
	return _note_id if visible else ""


func title_text() -> String:
	return _title.text


func body_text() -> String:
	return _body.text


func _input(event: InputEvent) -> void:
	if not visible or not event.is_pressed() or event.is_echo():
		return
	var confirm := InputMap.has_action(InputActions.CONFIRM) and event.is_action_pressed(InputActions.CONFIRM)
	var cancel := InputMap.has_action(InputActions.CANCEL) and event.is_action_pressed(InputActions.CANCEL)
	if confirm or cancel:
		dismissed.emit()
