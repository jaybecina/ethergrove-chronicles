extends CoreTest
## SaveSlots: slot files under a base directory, atomic writes, and the web-save import. Each test uses a fresh
## `user://test-saves-<random>` directory, removed in after_each.

const NOW := "2026-10-23T10:00:00.000Z"
const WEB_EXPORT := "res://test/data/web-export-v1.json"

var _base: String = ""
var _slots: SaveSlots = null


func before_each() -> void:
	_base = "user://test-saves-%d" % randi()
	_slots = SaveSlots.new(_base)


func after_each() -> void:
	if DirAccess.dir_exists_absolute(_base):
		for name: String in DirAccess.get_files_at(_base):
			DirAccess.remove_absolute(_base.path_join(name))
		DirAccess.remove_absolute(_base)


func _file(seed_value: int = 7) -> Dictionary:
	var state := NewGame.create({"seed": seed_value, "farmName": "Test Farm", "playerName": "Tester"})
	return SaveMigrate.make_save_file(state, 5000, NOW)


func _slot_path(slot: int) -> String:
	return _base.path_join("slot-%d.json" % slot)


func _write_raw(path: String, text: String) -> void:
	DirAccess.make_dir_recursive_absolute(_base)
	var f := FileAccess.open(path, FileAccess.WRITE)
	f.store_string(text)
	f.close()


func _files() -> PackedStringArray:
	return DirAccess.get_files_at(_base) if DirAccess.dir_exists_absolute(_base) else PackedStringArray()


func test_save_then_load_round_trips() -> void:
	var file := _file()
	eq(_slots.save(1, file), OK)
	var res := _slots.load_slot(1)
	eq(res["kind"], "ok")
	eq(JsonNorm.first_diff(d(res["file"])["state"], file["state"]), "")
	eq(JsonNorm.first_diff(res["file"], file), "")


func test_save_keeps_full_float_precision() -> void:
	var file := _file()
	var state: Dictionary = file["state"]
	var player: Dictionary = state["player"]
	player["x"] = 10.123456789012345
	eq(_slots.save(1, file), OK)
	var res := _slots.load_slot(1)
	eq(res["kind"], "ok")
	eq(JsonNorm.first_diff(d(res["file"]), file), "")
	var loaded: Dictionary = d(d(res["file"])["state"])["player"]
	var x: float = loaded["x"]
	eq(x, 10.123456789012345)


func test_save_leaves_no_tmp_file() -> void:
	eq(_slots.save(2, _file()), OK)
	eq(_slots.save(2, _file(8)), OK)
	eq(Array(_files()), ["slot-2.json"])


func test_save_over_an_existing_slot_replaces_it() -> void:
	eq(_slots.save(1, _file(7)), OK)
	var second := _file(8)
	eq(_slots.save(1, second), OK)
	eq(JsonNorm.first_diff(_slots.load_slot(1)["file"], second), "")


func test_missing_slot() -> void:
	eq(_slots.load_slot(1)["kind"], "missing")


func test_corrupt_slot() -> void:
	_write_raw(_slot_path(1), '{"version": 3')
	eq(_slots.load_slot(1)["kind"], "corrupt")
	var entry := d(_slots.list()[0])
	eq(entry["corrupt"], true)
	eq(entry["summary"], null)


func test_unknown_shape_is_corrupt() -> void:
	_write_raw(_slot_path(1), '{"version": 99}')
	eq(_slots.load_slot(1)["kind"], "corrupt")
	_write_raw(_slot_path(2), "[]")
	eq(_slots.load_slot(2)["kind"], "corrupt")


func test_leftover_tmp_is_ignored() -> void:
	var file := _file()
	eq(_slots.save(1, file), OK)
	_write_raw(_slot_path(1) + ".tmp", "garbage {")
	eq(_slots.load_slot(1)["kind"], "ok")
	_write_raw(_slot_path(2) + ".tmp", "garbage {")
	eq(_slots.load_slot(2)["kind"], "missing")
	eq(d(_slots.list()[1])["corrupt"], false)


func test_save_replaces_a_leftover_tmp() -> void:
	_write_raw(_slot_path(1) + ".tmp", "garbage {")
	eq(_slots.save(1, _file()), OK)
	eq(_slots.load_slot(1)["kind"], "ok")
	eq(Array(_files()), ["slot-1.json"])


func test_load_upgrades_an_older_file() -> void:
	var raw: Variant = JSON.parse_string(FileAccess.get_file_as_string(WEB_EXPORT))
	_write_raw(_slot_path(3), JSON.stringify(raw, "\t"))
	var res := _slots.load_slot(3)
	eq(res["kind"], "ok")
	eq(d(res["file"])["version"], 3)


func test_list_describes_all_three_slots() -> void:
	eq(_slots.save(2, _file()), OK)
	var entries := _slots.list()
	eq(entries.size(), 3)
	eq(d(entries[0])["slot"], 1)
	eq(d(entries[0])["summary"], null)
	eq(d(entries[0])["savedAt"], null)
	eq(d(entries[0])["corrupt"], false)
	var second := d(entries[1])
	eq(second["slot"], 2)
	eq(second["savedAt"], NOW)
	eq(second["playTimeMs"], 5000)
	eq(d(second["summary"])["farmName"], "Test Farm")
	eq(d(entries[2])["slot"], 3)


func test_save_refuses_an_invalid_file() -> void:
	var bad := _file()
	bad["version"] = 2
	assert_ne(_slots.save(1, bad), OK)
	var broken := _file()
	d(broken["state"]).erase("player")
	assert_ne(_slots.save(1, broken), OK)
	eq(_files().size(), 0)
	eq(_slots.load_slot(1)["kind"], "missing")


func test_invalid_save_does_not_touch_an_existing_slot() -> void:
	var good := _file()
	eq(_slots.save(1, good), OK)
	var bad := _file()
	bad.erase("state")
	assert_ne(_slots.save(1, bad), OK)
	eq(JsonNorm.first_diff(_slots.load_slot(1)["file"], good), "")
	eq(Array(_files()), ["slot-1.json"])


func test_slot_numbers_outside_1_to_3_are_rejected() -> void:
	for slot: int in [0, 4, -1, 99]:
		assert_ne(_slots.save(slot, _file()), OK, "save %d" % slot)
		eq(_slots.load_slot(slot)["kind"], "missing", "load %d" % slot)
	eq(_files().size(), 0)


func test_import_web_export() -> void:
	var res := _slots.import_text(FileAccess.get_file_as_string(WEB_EXPORT))
	eq(res, {"ok": true, "slot": 1})
	var loaded := _slots.load_slot(1)
	eq(loaded["kind"], "ok")
	eq(d(loaded["file"])["version"], 3)
	eq(d(d(loaded["file"])["state"])["version"], 3)


func test_import_uses_the_first_empty_slot() -> void:
	eq(_slots.save(1, _file()), OK)
	eq(_slots.save(3, _file()), OK)
	eq(_slots.import_text(FileAccess.get_file_as_string(WEB_EXPORT)), {"ok": true, "slot": 2})


func test_import_rejects_newer() -> void:
	var raw: Dictionary = d(JSON.parse_string(FileAccess.get_file_as_string(WEB_EXPORT)))
	raw["version"] = 99
	eq(_slots.import_text(JSON.stringify(raw)), {"ok": false, "error": "unsupportedVersion"})
	eq(_files().size(), 0)


func test_import_rejects_garbage() -> void:
	eq(_slots.import_text("not json {"), {"ok": false, "error": "invalid"})
	eq(_slots.import_text("[]"), {"ok": false, "error": "invalid"})
	eq(_slots.import_text('{"version": 2}'), {"ok": false, "error": "invalid"})
	eq(_files().size(), 0)


func test_import_full_slots() -> void:
	for slot: int in [1, 2, 3]:
		eq(_slots.save(slot, _file()), OK)
	eq(_slots.import_text(FileAccess.get_file_as_string(WEB_EXPORT)), {"ok": false, "error": "noFreeSlot"})
	eq(_files().size(), 3)


func test_import_does_not_overwrite_a_corrupt_slot() -> void:
	_write_raw(_slot_path(1), "{")
	eq(_slots.import_text(FileAccess.get_file_as_string(WEB_EXPORT)), {"ok": true, "slot": 2})
	eq(FileAccess.get_file_as_string(_slot_path(1)), "{")


## A directory at the .tmp path makes opening the tmp file for writing fail, deterministically.
func _block_tmp(slot: int) -> void:
	DirAccess.make_dir_recursive_absolute(_slot_path(slot) + ".tmp")


func test_failed_write_keeps_the_old_slot() -> void:
	var good := _file()
	eq(_slots.save(1, good), OK)
	_block_tmp(1)
	assert_ne(_slots.save(1, _file(8)), OK)
	eq(JsonNorm.first_diff(_slots.load_slot(1)["file"], good), "")
	eq(Array(_files()), ["slot-1.json"])
	DirAccess.remove_absolute(_slot_path(1) + ".tmp")


func test_import_write_failure_is_write_failed() -> void:
	_block_tmp(1)
	eq(_slots.import_text(FileAccess.get_file_as_string(WEB_EXPORT)), {"ok": false, "error": "writeFailed"})
	eq(_files().size(), 0)
	DirAccess.remove_absolute(_slot_path(1) + ".tmp")


func test_import_failed_text() -> void:
	eq(SaveSlots.IMPORT_FAILED_TEXT, "This save can't be opened.")
