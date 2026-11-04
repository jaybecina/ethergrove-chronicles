class_name TitleScreen
extends MenuScreen
## The title screen, from apps/web/src/ui/screens/Title.tsx: the name and tagline over Continue (the most recent
## readable save), New game, Load game, the web-save import and Quit. It only reports what the player chose; the
## owner loads the slot, shows the next screen and quits. Slots saved by a newer game, and corrupt ones, are never
## continued.

signal new_game_requested
signal load_requested
signal continue_requested(slot: int)
## Informational: the screen opens the import dialog itself; the owner need not react.
signal import_requested
signal quit_requested

## Title.tsx.
const TITLE := "Ethergrove Chronicles"
const TAGLINE := "Grandpa's farm is waiting."
const CONTINUE := "Continue"
const NEW_GAME := "New game"
const LOAD_GAME := "Load game"
## New (the web imports through the browser).
const IMPORT := "Import a save from the web game"
const QUIT := "Quit"

## Injectable for tests; defaults to user://saves.
var slots: SaveSlots
var importer: ImportDialog
var continue_button: Button
var new_button: Button
var load_button: Button
var import_button: Button
var quit_button: Button
var tagline: Label
var status: Label
## The slot Continue loads, or 0.
var latest_slot: int = 0


func prepare() -> void:
	if slots == null:
		slots = SaveSlots.new()


func build() -> void:
	heading.text = TITLE
	tagline = muted(TAGLINE)
	column.add_child(tagline)
	continue_button = ModalPanel.make_button(CONTINUE)
	continue_button.pressed.connect(_on_continue)
	new_button = ModalPanel.make_button(NEW_GAME)
	new_button.pressed.connect(func() -> void: new_game_requested.emit())
	load_button = ModalPanel.make_button(LOAD_GAME)
	load_button.pressed.connect(func() -> void: load_requested.emit())
	import_button = ModalPanel.make_button(IMPORT)
	import_button.pressed.connect(_on_import)
	import_button.visible = ImportDialog.is_supported()
	quit_button = ModalPanel.make_button(QUIT)
	quit_button.pressed.connect(func() -> void: quit_requested.emit())
	for b: Button in [continue_button, new_button, load_button, import_button, quit_button]:
		column.add_child(b)
	status = muted()
	status.visible = false
	column.add_child(status)
	importer = ImportDialog.new()
	importer.slots = slots
	importer.imported.connect(_on_imported)
	importer.failed.connect(_show_status)
	add_child(importer)


## Re-reads the slots: Continue names the most recent readable farm and is disabled when there is none.
func refresh() -> void:
	latest_slot = 0
	var latest_at := ""
	var farm := ""
	for entry: Dictionary in slots.list():
		var summary: Variant = entry["summary"]
		if summary == null:
			continue
		var saved_at: String = entry["savedAt"]
		if latest_slot == 0 or saved_at > latest_at:
			latest_slot = entry["slot"]
			latest_at = saved_at
			var info: Dictionary = summary
			farm = info["farmName"]
	continue_button.disabled = latest_slot == 0
	continue_button.text = CONTINUE if latest_slot == 0 else "%s %s" % [CONTINUE, farm]
	keep_focus()


func _on_continue() -> void:
	if latest_slot != 0:
		continue_requested.emit(latest_slot)


func _on_import() -> void:
	import_requested.emit()
	importer.open()


func _on_imported(slot: int) -> void:
	_show_status(ImportDialog.IMPORTED_FORMAT % slot)
	refresh()


func _show_status(message: String) -> void:
	status.text = message
	status.visible = true
