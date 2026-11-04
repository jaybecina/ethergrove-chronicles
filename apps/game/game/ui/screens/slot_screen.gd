class_name SlotScreen
extends MenuScreen
## The load screen, from apps/web/src/ui/screens/SaveSlots.tsx: three rows from `SaveSlots.list()` and the import
## of a web save. A row is empty, ok (farm, player, date, gold, play time, Play and Delete), corrupt (the web's
## damaged-save text, Delete only) or newer (saved by a newer game: Delete only, never loaded or overwritten). A
## delete asks to confirm. The owner loads the slot on `load_slot`.

signal load_slot(slot: int)
signal back_requested

## SaveSlots.tsx.
const TITLE := "Your farms"
const EMPTY := "Empty slot"
const DAMAGED := "Damaged save"
## New (the web's text mentions a backup, which this game does not keep).
const DAMAGED_TEXT := "This save can't be read."
const PLAY := "Play"
const DELETE := "Delete"
const BACK := "Back"
const KEEP := "Keep it"
const DELETE_FARM := "Delete farm"
const DELETE_CONFIRM := "Delete the farm in slot %d? This can't be undone."
## New (a save written by a newer game; the web has no such state).
const DELETE_FAILED := "Couldn't delete the save."
const NEWER_TEXT := "Saved by a newer version of the game"
const IMPORT := "Import a save from the web game"

class Row:
	var box: VBoxContainer
	var slot_label: Label
	var title: Label
	var line1: Label
	var line2: Label
	var line3: Label
	var line4: Label
	var play: Button
	var delete: Button

## Injectable for tests; defaults to user://saves.
var slots: SaveSlots
var importer: ImportDialog
var rows: Array[Row] = []
var confirm_box: VBoxContainer
var confirm_label: Label
var keep_button: Button
var confirm_button: Button
var import_button: Button
var back_button: Button
var status: Label
var _confirm_slot: int = 0
var _entries: Array = []


func prepare() -> void:
	if slots == null:
		slots = SaveSlots.new()


func build() -> void:
	heading.text = TITLE
	for slot: int in range(SaveSlots.FIRST_SLOT, SaveSlots.LAST_SLOT + 1):
		var row := Row.new()
		row.box = VBoxContainer.new()
		row.slot_label = muted("Slot %d" % slot)
		row.title = Label.new()
		row.line1 = Label.new()
		row.line2 = Label.new()
		row.line3 = muted()
		row.line4 = muted()
		for l: Label in [row.slot_label, row.title, row.line1, row.line2, row.line3, row.line4]:
			row.box.add_child(l)
		var buttons := ModalPanel.make_row()
		row.play = ModalPanel.make_button(PLAY)
		row.play.pressed.connect(_on_play.bind(slot))
		row.delete = ModalPanel.make_button(DELETE)
		row.delete.pressed.connect(_on_delete.bind(slot))
		buttons.add_child(row.play)
		buttons.add_child(row.delete)
		row.box.add_child(buttons)
		column.add_child(row.box)
		column.add_child(HSeparator.new())
		rows.append(row)
	confirm_box = VBoxContainer.new()
	confirm_label = ModalPanel.make_label("", true)
	confirm_box.add_child(confirm_label)
	var confirm_row := ModalPanel.make_row()
	keep_button = ModalPanel.make_button(KEEP)
	keep_button.pressed.connect(_close_confirm)
	confirm_button = ModalPanel.make_button(DELETE_FARM)
	confirm_button.pressed.connect(_on_confirm)
	confirm_row.add_child(keep_button)
	confirm_row.add_child(confirm_button)
	confirm_box.add_child(confirm_row)
	confirm_box.visible = false
	column.add_child(confirm_box)
	status = muted()
	status.visible = false
	column.add_child(status)
	var bottom := ModalPanel.make_row()
	back_button = ModalPanel.make_button(BACK)
	back_button.pressed.connect(func() -> void: back_requested.emit())
	import_button = ModalPanel.make_button(IMPORT)
	import_button.pressed.connect(func() -> void: importer.open())
	import_button.visible = ImportDialog.is_supported()
	bottom.add_child(back_button)
	bottom.add_child(import_button)
	column.add_child(bottom)
	importer = ImportDialog.new()
	importer.slots = slots
	importer.imported.connect(_on_imported)
	importer.failed.connect(_show_status)
	add_child(importer)


func refresh() -> void:
	_entries = slots.list()
	for entry: Dictionary in _entries:
		var slot: int = entry["slot"]
		var row := rows[slot - SaveSlots.FIRST_SLOT]
		var summary: Variant = entry["summary"]
		var corrupt: bool = entry["corrupt"]
		var newer: bool = entry["newer"]
		for l: Label in [row.line1, row.line2, row.line3, row.line4]:
			l.visible = false
		row.title.remove_theme_color_override("font_color")
		if summary != null:
			var info: Dictionary = summary
			var play_ms: int = entry["playTimeMs"]
			var calendar: Dictionary = info["calendar"]
			var gold: int = info["gold"]
			var player: String = info["playerName"]
			row.title.text = info["farmName"]
			_set_line(row.line1, player)
			_set_line(row.line2, date_line(calendar))
			_set_line(row.line3, "%s gold" % HudLabels.format_int(gold))
			_set_line(row.line4, play_time(play_ms))
		elif corrupt:
			row.title.text = DAMAGED
			_set_line(row.line1, DAMAGED_TEXT)
		elif newer:
			row.title.text = NEWER_TEXT
		else:
			row.title.text = EMPTY
			row.title.add_theme_color_override("font_color", ThemeFactory.TEXT.darkened(0.25))
		row.play.visible = summary != null
		row.delete.visible = summary != null or corrupt or newer
	if _confirm_slot != 0:
		var open_entry: Dictionary = _entries[_confirm_slot - SaveSlots.FIRST_SLOT]
		if open_entry["summary"] == null and not open_entry["corrupt"] and not open_entry["newer"]:
			_close_confirm()
	keep_focus()


static func _set_line(label: Label, text: String) -> void:
	label.text = text
	label.visible = true


func _on_play(slot: int) -> void:
	status.visible = false
	load_slot.emit(slot)


func _on_delete(slot: int) -> void:
	status.visible = false
	_confirm_slot = slot
	confirm_label.text = DELETE_CONFIRM % slot
	confirm_box.visible = true
	keep_button.grab_focus()


func _close_confirm() -> void:
	var slot := _confirm_slot
	_confirm_slot = 0
	confirm_box.visible = false
	if slot != 0:
		rows[slot - SaveSlots.FIRST_SLOT].delete.grab_focus()


func _on_confirm() -> void:
	var slot := _confirm_slot
	if slot == 0:
		return
	status.visible = false
	if slots.delete_slot(slot) != OK:
		_show_status(DELETE_FAILED)
	_close_confirm()
	refresh()


func _on_imported(slot: int) -> void:
	_show_status(ImportDialog.IMPORTED_FORMAT % slot)
	refresh()


func _show_status(message: String) -> void:
	status.text = message
	status.visible = true


func go_back() -> bool:
	if _confirm_slot != 0:
		_close_confirm()
	else:
		back_requested.emit()
	return true
