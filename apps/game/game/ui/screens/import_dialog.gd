class_name ImportDialog
extends Node
## Import of a save exported from the web game: an OS file dialog (`*.json`) whose file text goes to
## `SaveSlots.import_text`. The title and slot screens own one and show `imported` / `failed` messages. Desktop
## builds only: `is_supported()` is false on the Web export (the browser file input arrives with Plan 5), where the
## screens do not offer the button. The FileDialog is created on first use; tests call `import_text` / `import_path`.

## Emitted with the slot an import went to.
signal imported(slot: int)
## Emitted with the text to show when an import failed.
signal failed(message: String)

## New strings (the web imports through the browser instead).
const IMPORTED_FORMAT := "Imported to slot %d"
const FULL_TEXT := "All three save slots are full."
const WRITE_FAILED_TEXT := "Couldn't save the imported game."
## Larger files are treated as invalid (a save is a few KiB).
const MAX_BYTES := 4 * 1024 * 1024
const FILTER := "*.json ; Ethergrove save files"

var slots: SaveSlots
var file_dialog: FileDialog


static func is_supported() -> bool:
	return not OS.has_feature("web")


## The FileDialog, created once.
func ensure_dialog() -> FileDialog:
	if file_dialog == null:
		file_dialog = FileDialog.new()
		file_dialog.file_mode = FileDialog.FILE_MODE_OPEN_FILE
		file_dialog.access = FileDialog.ACCESS_FILESYSTEM
		file_dialog.use_native_dialog = true
		file_dialog.filters = PackedStringArray([FILTER])
		file_dialog.file_selected.connect(import_path)
		add_child(file_dialog)
	return file_dialog


## Shows the file dialog (nothing on the Web build).
func open() -> void:
	if not is_supported():
		return
	ensure_dialog().popup_centered_ratio(0.6)


## Reads the file at `path` and imports its text; an unreadable file is an invalid save.
func import_path(path: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		return import_text("")
	return import_text(read_limited(path))


## The text of the file at `path`, or "" when it is missing or larger than MAX_BYTES.
static func read_limited(path: String) -> String:
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null or f.get_length() > MAX_BYTES:
		return ""
	return f.get_as_text()


## Imports `text` into the first empty slot. Returns {ok, slot, message}; `message` is the text to show. Emits
## `imported` or `failed`.
func import_text(text: String) -> Dictionary:
	if slots == null:
		slots = SaveSlots.new()
	var result := slots.import_text(text)
	if result["ok"] == true:
		var slot: int = result["slot"]
		var message := IMPORTED_FORMAT % slot
		imported.emit(slot)
		return {"ok": true, "slot": slot, "message": message}
	var error: String = result["error"]
	var message := message_for(error)
	failed.emit(message)
	return {"ok": false, "error": error, "message": message}


## The text for a SaveSlots.import_text error.
static func message_for(error: String) -> String:
	match error:
		"noFreeSlot":
			return FULL_TEXT
		"writeFailed":
			return WRITE_FAILED_TEXT
		_:
			return SaveSlots.IMPORT_FAILED_TEXT
