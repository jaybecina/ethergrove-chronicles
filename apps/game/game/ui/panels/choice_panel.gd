class_name ChoicePanel
extends ModalPanel
## A list of choices, each a line of text and a button that dispatches one command: the base of the forge, the stove
## and the well. A subclass sets `title`/`speech` in `setup()` and returns the rows from `options()`:
## {label: String, button: String, enabled: bool, reason: String, command: Dictionary}.
## Rows come from a pool that grows and is never freed, as the other panels.

const TITLE := ""
const NOT_ENOUGH_GOLD := "Not enough gold"
const MISSING := "Missing materials"
const BAG_FULL := "Your bag is full"
const REASONS := {"gold": NOT_ENOUGH_GOLD, "missing": MISSING, "full": BAG_FULL, "noCheckpoint": "No checkpoint there yet"}

class Row:
	var root: HBoxContainer
	var label: Label
	var button: Button
	var reason: Label
	var command: Dictionary = {}

var _speech: Label
var _list: VBoxContainer
var _footer: Label
var _rows: Array[Row] = []
## Close the panel after a choice (the well).
var close_after: bool = false


## Subclass hook: sets `title_label.text` and the speech line.
func setup() -> void:
	pass


## Subclass hook: the rows to show now.
func options() -> Array[Dictionary]:
	return []


## Subclass hook: the line under the list (gold, for the forge).
func footer() -> String:
	return ""


func build() -> void:
	setup()
	_speech = ModalPanel.make_label("", true)
	_speech.add_theme_color_override("font_color", ThemeFactory.ACCENT_BRIGHT.lightened(0.3))
	body.add_child(_speech)
	_list = VBoxContainer.new()
	_list.add_theme_constant_override("separation", 8)
	body.add_child(_list)
	_footer = ModalPanel.make_muted("", false)
	body.add_child(_footer)
	var close := ModalPanel.make_button(ModalPanel.CLOSE)
	close.size_flags_horizontal = Control.SIZE_SHRINK_END
	close.pressed.connect(func() -> void: host.close())
	body.add_child(close)


## The speech line (a subclass sets it from `setup`).
func set_speech(text: String) -> void:
	if _speech != null:
		_speech.text = text
	else:
		_pending_speech = text


var _pending_speech: String = ""


func refresh() -> void:
	if _pending_speech != "":
		_speech.text = _pending_speech
		_pending_speech = ""
	var opts := options()
	while _rows.size() < opts.size():
		_rows.append(_make_row(_rows.size()))
	for i: int in _rows.size():
		var row := _rows[i]
		row.root.visible = i < opts.size()
		if i >= opts.size():
			continue
		var opt := opts[i]
		var enabled: bool = opt["enabled"]
		var reason: String = opt["reason"]
		row.label.text = opt["label"]
		row.button.text = opt["button"]
		row.button.disabled = not enabled
		row.reason.text = REASONS.get(reason, reason) if not enabled else ""
		row.reason.visible = not enabled and reason != ""
		row.command = opt["command"]
	_footer.text = footer()
	_footer.visible = _footer.text != ""


func _make_row(index: int) -> Row:
	var row := Row.new()
	row.root = HBoxContainer.new()
	row.root.add_theme_constant_override("separation", 10)
	row.label = ModalPanel.make_label("", true)
	row.label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.button = ModalPanel.make_button("")
	row.button.pressed.connect(_on_pressed.bind(index))
	row.reason = ModalPanel.make_muted("", false)
	row.root.add_child(row.label)
	row.root.add_child(row.reason)
	row.root.add_child(row.button)
	_list.add_child(row.root)
	return row


## The Button of row `i` (tests).
func row_button(i: int) -> Button:
	return _rows[i].button


func visible_rows() -> int:
	var n := 0
	for row: Row in _rows:
		if row.root.visible:
			n += 1
	return n


func _on_pressed(index: int) -> void:
	var command := _rows[index].command
	if close_after:
		host.close()
	session.dispatch(command)
	content_changed.emit()
