class_name NewGameScreen
extends MenuScreen
## The new-game screen, from apps/web/src/ui/screens/NewGame.tsx: your name, farm name (16 characters at most) and
## the Grandpa's lessons checkbox. Start creates the game with `NewGame.create`, saves it to the first empty slot
## and emits `start_game(slot)`; the owner then loads that slot. With no empty slot it asks which farm to replace
## (an ok or damaged save, after a confirm); a slot saved by a newer game is never offered or overwritten.
## As the web, Start stays disabled until both names (trimmed) are non-empty.

signal start_game(slot: int)
signal back_requested

## NewGame.tsx.
const MAX := 16
const TITLE := "A farm of your own"
const PLAYER_LABEL := "Your name"
const FARM_LABEL := "Farm name"
const START := "Start farming"
const BACK := "Back"
## lessons/lessonText.ts JOURNAL_TEXT.newGameLabel / newGameHint.
const LESSONS_LABEL := "Grandpa's lessons"
const LESSONS_HINT := "Recommended for your first farm."
## SaveSlots.tsx replace confirm and slot-picker texts.
const REPLACE_CONFIRM := "Replace the farm in slot %d with a new one? Its saved progress and backup will be erased."
const KEEP := "Keep it"
const REPLACE_FARM := "Replace farm"
## New strings.
const CHOOSE_TEXT := "All three slots are in use. Choose a farm to replace."
const REPLACE_SLOT := "Replace slot %d"
const NO_SLOT_TEXT := "No slot can be used. Delete a farm first."
const SAVE_FAILED_TEXT := "Couldn't save the new game."

## Injectable for tests; defaults to user://saves.
var slots: SaveSlots
## Returns the world seed; tests inject a fixed one.
var seed_provider: Callable = func() -> int: return randi() & 0x7FFFFFFF
var player_edit: LineEdit
var farm_edit: LineEdit
var lessons_check: CheckBox
var start_button: Button
var back_button: Button
var form: VBoxContainer
var chooser: VBoxContainer
var chooser_label: Label
## One "Replace slot N" button per slot, shown only for slots that may be replaced.
var replace_buttons: Array[Button] = []
var confirm_box: VBoxContainer
var confirm_label: Label
var keep_button: Button
var confirm_button: Button
var status: Label
var _pending_slot: int = 0


func prepare() -> void:
	if slots == null:
		slots = SaveSlots.new()


func build() -> void:
	heading.text = TITLE
	form = VBoxContainer.new()
	form.add_theme_constant_override("separation", 10)
	column.add_child(form)
	form.add_child(ModalPanel.make_label(PLAYER_LABEL))
	player_edit = _line_edit()
	form.add_child(player_edit)
	form.add_child(ModalPanel.make_label(FARM_LABEL))
	farm_edit = _line_edit()
	form.add_child(farm_edit)
	lessons_check = CheckBox.new()
	lessons_check.text = LESSONS_LABEL
	lessons_check.focus_mode = Control.FOCUS_ALL
	lessons_check.button_pressed = true
	form.add_child(lessons_check)
	form.add_child(muted(LESSONS_HINT))
	var buttons := ModalPanel.make_row()
	back_button = ModalPanel.make_button(BACK)
	back_button.pressed.connect(func() -> void: back_requested.emit())
	start_button = ModalPanel.make_button(START)
	start_button.pressed.connect(_on_start)
	buttons.add_child(back_button)
	buttons.add_child(start_button)
	form.add_child(buttons)
	_update_start()

	chooser = VBoxContainer.new()
	chooser_label = ModalPanel.make_label(CHOOSE_TEXT, true)
	chooser.add_child(chooser_label)
	for slot: int in range(SaveSlots.FIRST_SLOT, SaveSlots.LAST_SLOT + 1):
		var b := ModalPanel.make_button(REPLACE_SLOT % slot)
		b.pressed.connect(_on_replace.bind(slot))
		chooser.add_child(b)
		replace_buttons.append(b)
	var chooser_back := ModalPanel.make_button(BACK)
	chooser_back.pressed.connect(_close_chooser)
	chooser.add_child(chooser_back)
	chooser.visible = false
	column.add_child(chooser)

	confirm_box = VBoxContainer.new()
	confirm_label = ModalPanel.make_label("", true)
	confirm_box.add_child(confirm_label)
	var confirm_row := ModalPanel.make_row()
	keep_button = ModalPanel.make_button(KEEP)
	keep_button.pressed.connect(_close_confirm)
	confirm_button = ModalPanel.make_button(REPLACE_FARM)
	confirm_button.pressed.connect(_on_confirm_replace)
	confirm_row.add_child(keep_button)
	confirm_row.add_child(confirm_button)
	confirm_box.add_child(confirm_row)
	confirm_box.visible = false
	column.add_child(confirm_box)
	status = muted()
	status.visible = false
	column.add_child(status)


func _line_edit() -> LineEdit:
	var e := LineEdit.new()
	e.max_length = MAX
	e.text_changed.connect(func(_t: String) -> void: _update_start())
	e.focus_mode = Control.FOCUS_ALL
	return e


## A new visit starts at the plain form.
func _on_visibility_changed() -> void:
	if visible:
		_show_form()
	super()


func _show_form() -> void:
	_pending_slot = 0
	player_edit.text = ""
	farm_edit.text = ""
	_update_start()
	form.visible = true
	chooser.visible = false
	confirm_box.visible = false
	status.visible = false


func player_name() -> String:
	return player_edit.text.strip_edges()


func farm_name() -> String:
	return farm_edit.text.strip_edges()


## Start is disabled until both names are non-empty.
func _update_start() -> void:
	start_button.disabled = player_name() == "" or farm_name() == ""
	if is_inside_tree():
		keep_focus()


func _on_start() -> void:
	_update_start()
	if start_button.disabled:
		return
	status.visible = false
	var entries := slots.list()
	for entry: Dictionary in entries:
		if _is_empty(entry):
			var free: int = entry["slot"]
			_create_in(free)
			return
	var any := false
	for entry: Dictionary in entries:
		var slot: int = entry["slot"]
		var replaceable := _replaceable(entry)
		replace_buttons[slot - SaveSlots.FIRST_SLOT].visible = replaceable
		any = any or replaceable
	if not any:
		_show_status(NO_SLOT_TEXT)
		return
	form.visible = false
	chooser.visible = true
	focus_first()


static func _is_empty(entry: Dictionary) -> bool:
	return entry["summary"] == null and not entry["corrupt"] and not entry["newer"]


## An ok or corrupt save may be replaced (after a confirm); a newer one never.
static func _replaceable(entry: Dictionary) -> bool:
	return not entry["newer"] and (entry["summary"] != null or entry["corrupt"])


func _on_replace(slot: int) -> void:
	_pending_slot = slot
	confirm_label.text = REPLACE_CONFIRM % slot
	chooser.visible = false
	confirm_box.visible = true
	keep_button.grab_focus()


func _close_confirm() -> void:
	confirm_box.visible = false
	chooser.visible = true
	_pending_slot = 0
	focus_first()


func _close_chooser() -> void:
	chooser.visible = false
	form.visible = true
	focus_first()


func _on_confirm_replace() -> void:
	var slot := _pending_slot
	if slot == 0:
		return
	# Re-check: the file may have changed since the chooser was shown. A newer save is never overwritten.
	var entry: Dictionary = slots.list()[slot - SaveSlots.FIRST_SLOT]
	if not _replaceable(entry):
		_close_confirm()
		return
	_create_in(slot)


func _create_in(slot: int) -> void:
	var state := NewGame.create({
		"seed": seed_provider.call(),
		"farmName": farm_name(),
		"playerName": player_name(),
		"lessons": lessons_check.button_pressed,
	})
	var saved_at := Time.get_datetime_string_from_system(true) + ".000Z"
	var err := slots.save(slot, SaveMigrate.make_save_file(state, 0, saved_at))
	if err != OK:
		_show_status(SAVE_FAILED_TEXT)
		_show_form_keep_status()
		return
	_pending_slot = 0
	start_game.emit(slot)


func _show_form_keep_status() -> void:
	form.visible = true
	chooser.visible = false
	confirm_box.visible = false
	focus_first()


func _show_status(message: String) -> void:
	status.text = message
	status.visible = true


func go_back() -> bool:
	if confirm_box.visible:
		_close_confirm()
	elif chooser.visible:
		_close_chooser()
	else:
		back_requested.emit()
	return true
