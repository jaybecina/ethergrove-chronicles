class_name SaveSlots
extends RefCounted
## Three save slots as files `<base_dir>/slot-<n>.json`, and the import of a save exported from the web build.
## This is the file layer: core/ never touches files. `saved_at` timestamps come from the caller.

## Shown by the title screen when an import fails.
const IMPORT_FAILED_TEXT := "This save can't be opened."

const FIRST_SLOT := 1
const LAST_SLOT := 3

var _base_dir: String


func _init(base_dir: String = "user://saves") -> void:
	_base_dir = base_dir


static func _valid_slot(slot: int) -> bool:
	return slot >= FIRST_SLOT and slot <= LAST_SLOT


func _path(slot: int) -> String:
	return _base_dir.path_join("slot-%d.json" % slot)


## Writes `file` to `slot` atomically: the text goes to `slot-<n>.json.tmp`, which then replaces the slot file in
## one rename, so a crash leaves the old save or the new one, never half of either. A file that does not validate
## as the current version, or a slot outside 1..3, is refused with ERR_INVALID_PARAMETER and nothing is written.
## A slot holding a save from a newer game version is refused with ERR_ALREADY_EXISTS unless `force` is true. A
## corrupt slot may be overwritten.
func save(slot: int, file: Dictionary, force: bool = false) -> Error:
	if not _valid_slot(slot):
		return ERR_INVALID_PARAMETER
	if SaveSchema.validate_file(file) != "" or file.get("version") != SaveMigrate.CURRENT_SAVE_VERSION:
		return ERR_INVALID_PARAMETER
	if not force and _peek_is_newer(slot):
		return ERR_ALREADY_EXISTS
	var made := DirAccess.make_dir_recursive_absolute(_base_dir)
	if made != OK:
		return made
	var target := _path(slot)
	var tmp := target + ".tmp"
	var out := FileAccess.open(tmp, FileAccess.WRITE)
	if out == null:
		return FileAccess.get_open_error()
	var stored := out.store_string(JSON.stringify(file, "\t", true, true))
	var write_error := out.get_error()
	out.close()
	if not stored and write_error == OK:
		write_error = FAILED
	if write_error != OK:
		DirAccess.remove_absolute(tmp)
		return write_error
	# DirAccess.rename_absolute over an existing file is atomic on POSIX (macOS/Linux; verified on macOS with
	# Godot 4.7.2 only). Godot's Windows behaviour is UNVERIFIED: it may delete the target first, which opens a
	# window with no save file.
	# TODO: check this on Windows before the Windows export ships (Plan 5 / M6). If it is not atomic there, move
	# the old slot to `slot-N.json.bak`, rename the tmp file into place, delete the .bak, and make load_slot
	# recover from a leftover .bak.
	var renamed := DirAccess.rename_absolute(tmp, target)
	if renamed != OK:
		DirAccess.remove_absolute(tmp)
	return renamed


## {"kind": "ok", "file"} (migrated to the current version and validated), {"kind": "missing"},
## {"kind": "newer"} (parses, with an integer `version` above the current one: written by a newer game) or
## {"kind": "corrupt"}. A leftover `.tmp` file is never read. A slot outside 1..3 is always missing.
func load_slot(slot: int) -> Dictionary:
	if not _valid_slot(slot) or not FileAccess.file_exists(_path(slot)):
		return {"kind": "missing"}
	var json := JSON.new()
	if json.parse(FileAccess.get_file_as_string(_path(slot))) != OK:
		return {"kind": "corrupt"}
	if _is_newer(json.data):
		return {"kind": "newer"}
	var migrated := SaveMigrate.migrate(json.data)
	if migrated["ok"] != true:
		return {"kind": "corrupt"}
	return {"kind": "ok", "file": migrated["file"]}


## True when parsed JSON is an object whose `version` is a whole number above the current save version.
static func _is_newer(data: Variant) -> bool:
	if typeof(data) != TYPE_DICTIONARY:
		return false
	var dict: Dictionary = data
	var version: Variant = dict.get("version")
	if typeof(version) == TYPE_INT:
		return version > SaveMigrate.CURRENT_SAVE_VERSION
	if typeof(version) == TYPE_FLOAT:
		var number: float = version
		return is_finite(number) and number == floorf(number) and number > SaveMigrate.CURRENT_SAVE_VERSION
	return false


## True when the slot file parses and is newer (see `_is_newer`); no migration or validation.
func _peek_is_newer(slot: int) -> bool:
	if not FileAccess.file_exists(_path(slot)):
		return false
	var json := JSON.new()
	return json.parse(FileAccess.get_file_as_string(_path(slot))) == OK and _is_newer(json.data)


## One entry per slot 1..3: {slot, summary, savedAt, playTimeMs, corrupt, newer}. An empty, corrupt or newer slot
## has a null summary and savedAt and 0 play time; `newer` slots are not `corrupt`.
func list() -> Array:
	var out: Array = []
	for slot: int in range(FIRST_SLOT, LAST_SLOT + 1):
		var res := load_slot(slot)
		var entry := {"slot": slot, "summary": null, "savedAt": null, "playTimeMs": 0, "corrupt": false, "newer": false}
		if res["kind"] == "ok":
			var file: Dictionary = res["file"]
			entry["summary"] = file["summary"]
			entry["savedAt"] = file["savedAt"]
			entry["playTimeMs"] = file["playTimeMs"]
		elif res["kind"] == "corrupt":
			entry["corrupt"] = true
		elif res["kind"] == "newer":
			entry["newer"] = true
		out.append(entry)
	return out


## Imports the text of a save exported from the web build into the first empty slot. A corrupt or newer slot
## counts as taken, so it is never overwritten. Returns {ok: true, slot} or
## {ok: false, error: "invalid" | "unsupportedVersion" | "noFreeSlot" | "writeFailed"}.
func import_text(text: String) -> Dictionary:
	var json := JSON.new()
	if json.parse(text) != OK:
		return {"ok": false, "error": "invalid"}
	var migrated := SaveMigrate.migrate(json.data)
	if migrated["ok"] != true:
		return {"ok": false, "error": migrated["error"]}
	for slot: int in range(FIRST_SLOT, LAST_SLOT + 1):
		if FileAccess.file_exists(_path(slot)):
			continue
		var file: Dictionary = migrated["file"]
		if save(slot, file) != OK:
			return {"ok": false, "error": "writeFailed"}
		return {"ok": true, "slot": slot}
	return {"ok": false, "error": "noFreeSlot"}


## Deletes the save in `slot` (ok, corrupt or newer) and any leftover `.tmp`. OK when it is gone or never existed;
## ERR_INVALID_PARAMETER for a slot outside 1..3.
func delete_slot(slot: int) -> Error:
	if not _valid_slot(slot):
		return ERR_INVALID_PARAMETER
	var target := _path(slot)
	DirAccess.remove_absolute(target + ".tmp")
	if not FileAccess.file_exists(target):
		return OK
	return DirAccess.remove_absolute(target)
