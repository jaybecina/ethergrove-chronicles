extends CoreTest
## The full-screen menus: TitleScreen, NewGameScreen, SlotScreen and ImportDialog. Strings are pinned from
## apps/web/src/ui/screens/{Title,NewGame,SaveSlots}.tsx, ui/format.ts and lessons/lessonText.ts; the import,
## full-slot, write-failure, newer-save and chooser strings are new to this game. Saves live under a fresh
## `user://test-screens-<random>` directory (never user://saves), removed in after_each. The OS FileDialog is not
## driven: the import goes through `ImportDialog.import_text`.

const NOW_OLD := "2026-10-23T10:00:00.000Z"
const NOW_NEW := "2026-10-24T10:00:00.000Z"
const WEB_EXPORT := "res://test/data/web-export-v1.json"

## A SaveSlots whose deletes always fail.
class FailingDeleteSlots:
	extends SaveSlots

	func delete_slot(_slot: int) -> Error:
		return FAILED


var _base: String = ""
var _slots: SaveSlots = null
var _started: Array[int] = []


func before_each() -> void:
	_base = "user://test-screens-%d" % randi()
	_slots = SaveSlots.new(_base)
	_started = []


func after_each() -> void:
	if DirAccess.dir_exists_absolute(_base):
		for name: String in DirAccess.get_files_at(_base):
			DirAccess.remove_absolute(_base.path_join(name))
		DirAccess.remove_absolute(_base)


func _put(slot: int, farm: String, saved_at: String, play_ms: int = 90 * 60000) -> void:
	var state := NewGame.create({"seed": slot, "farmName": farm, "playerName": "Tester"})
	eq(_slots.save(slot, SaveMigrate.make_save_file(state, play_ms, saved_at)), OK)


func _raw(slot: int, text: String) -> void:
	DirAccess.make_dir_recursive_absolute(_base)
	var f := FileAccess.open(_base.path_join("slot-%d.json" % slot), FileAccess.WRITE)
	f.store_string(text)
	f.close()


func _newer(slot: int) -> void:
	_raw(slot, JSON.stringify({"version": SaveMigrate.CURRENT_SAVE_VERSION + 1}))


func _exists(slot: int) -> bool:
	return FileAccess.file_exists(_base.path_join("slot-%d.json" % slot))


func _title() -> TitleScreen:
	var s := TitleScreen.new()
	s.slots = _slots
	add_child_autofree(s)
	return s


func _new_game(seed_value: int = 99) -> NewGameScreen:
	var s := NewGameScreen.new()
	s.slots = _slots
	s.seed_provider = func() -> int: return seed_value
	s.start_game.connect(func(slot: int) -> void: _started.append(slot))
	add_child_autofree(s)
	return s


## Types into a LineEdit as a player does (setting `text` alone emits nothing).
func _type(edit: LineEdit, text: String) -> void:
	edit.text = text
	edit.text_changed.emit(text)


func _fill(s: NewGameScreen, player: String = "Mira", farm: String = "Sunny Acres") -> void:
	_type(s.player_edit, player)
	_type(s.farm_edit, farm)


func _slot_screen() -> SlotScreen:
	var s := SlotScreen.new()
	s.slots = _slots
	add_child_autofree(s)
	return s


func _loaded(slot: int) -> Dictionary:
	var r := _slots.load_slot(slot)
	eq(r["kind"], "ok")
	var file: Dictionary = r["file"]
	return file


func _focus_names(s: MenuScreen) -> Array[String]:
	var out: Array[String] = []
	for c: Control in s.focusables():
		out.append(c.name)
	return out


# --- Title -----------------------------------------------------------------------------------------------------------

func test_title_strings() -> void:
	var t := _title()
	eq(t.heading.text, "Ethergrove Chronicles")
	eq(t.tagline.text, "Grandpa's farm is waiting.")
	eq(t.new_button.text, "New game")
	eq(t.load_button.text, "Load game")
	eq(t.import_button.text, "Import a save from the web game")
	eq(t.quit_button.text, "Quit")
	eq(t.continue_button.text, "Continue")


func test_continue_disabled_without_saves() -> void:
	var t := _title()
	assert_true(t.continue_button.disabled)
	var heard: Array[int] = []
	t.continue_requested.connect(func(slot: int) -> void: heard.append(slot))
	t.continue_button.pressed.emit()
	eq(heard.size(), 0)
	assert_eq(get_viewport().gui_get_focus_owner(), t.new_button, "first enabled button is focused")


func test_continue_picks_latest_ok_slot() -> void:
	_put(1, "Old Farm", NOW_OLD)
	_put(2, "Newest Farm", NOW_NEW)
	_raw(3, "{not json")
	var t := _title()
	assert_false(t.continue_button.disabled)
	eq(t.continue_button.text, "Continue Newest Farm")
	var heard: Array[int] = []
	t.continue_requested.connect(func(slot: int) -> void: heard.append(slot))
	t.continue_button.pressed.emit()
	eq(heard, [2] as Array[int])


func test_continue_skips_newer_and_corrupt() -> void:
	_put(1, "Only Farm", NOW_OLD)
	_newer(2)
	_raw(3, "{not json")
	eq(_title().latest_slot, 1)
	_slots.delete_slot(1)
	assert_true(_title().continue_button.disabled)


func test_title_buttons_emit() -> void:
	var t := _title()
	var heard: Array[String] = []
	t.new_game_requested.connect(func() -> void: heard.append("new"))
	t.load_requested.connect(func() -> void: heard.append("load"))
	t.quit_requested.connect(func() -> void: heard.append("quit"))
	t.new_button.pressed.emit()
	t.load_button.pressed.emit()
	t.quit_button.pressed.emit()
	eq(heard, ["new", "load", "quit"] as Array[String])


# --- New game ----------------------------------------------------------------------------------------------------------

func test_new_game_strings_and_limits() -> void:
	var s := _new_game()
	eq(s.heading.text, "A farm of your own")
	eq(s.lessons_check.text, "Grandpa's lessons")
	assert_true(s.lessons_check.button_pressed, "lessons default on")
	assert_true("Recommended for your first farm." in s.texts())
	assert_true("Your name" in s.texts())
	assert_true("Farm name" in s.texts())
	eq(s.start_button.text, "Start farming")
	eq(s.back_button.text, "Back")
	eq(s.player_edit.max_length, 16)
	eq(s.farm_edit.max_length, 16)


func test_new_game_creates_state_with_names_and_lessons() -> void:
	var s := _new_game(1234)
	_fill(s, "  Mira ")
	s.lessons_check.button_pressed = false
	s.start_button.pressed.emit()
	eq(_started, [1] as Array[int])
	var file := _loaded(1)
	var state := d(file["state"])
	eq(state["playerName"], "Mira")
	eq(state["farmName"], "Sunny Acres")
	eq(state["seed"], 1234)
	var expected := NewGame.create({"seed": 1234, "farmName": "Sunny Acres", "playerName": "Mira", "lessons": false})
	eq(state, expected)
	eq(file["playTimeMs"], 0)


func test_new_game_lessons_on_by_default() -> void:
	var s := _new_game(5)
	_fill(s, "Mira", "Sunny Acres")
	s.start_button.pressed.emit()
	var state := d(_loaded(1)["state"])
	eq(state, NewGame.create({"seed": 5, "farmName": "Sunny Acres", "playerName": "Mira", "lessons": true}))


func test_new_game_rejects_empty_names() -> void:
	var s := _new_game()
	assert_true(s.start_button.disabled, "no names")
	eq(s.player_edit.placeholder_text, "")
	_type(s.player_edit, "   ")
	_type(s.farm_edit, "Sunny Acres")
	assert_true(s.start_button.disabled, "whitespace player name")
	s.start_button.pressed.emit()
	eq(_started.size(), 0)
	assert_false(_exists(1))
	_type(s.player_edit, "Mira")
	assert_false(s.start_button.disabled)
	_type(s.farm_edit, " ")
	assert_true(s.start_button.disabled, "whitespace farm name")
	_type(s.farm_edit, "Sunny Acres")
	assert_false(s.start_button.disabled)


func test_new_game_form_is_cleared_when_shown_again() -> void:
	var s := _new_game()
	_fill(s)
	s.hide()
	s.show()
	eq(s.player_edit.text, "")
	eq(s.farm_edit.text, "")
	assert_true(s.start_button.disabled)


func test_new_game_save_failure_shows_text_and_stays() -> void:
	var blocker := "user://test-screens-blocker-%d" % randi()
	var f := FileAccess.open(blocker, FileAccess.WRITE)
	f.store_string("x")
	f.close()
	_slots = SaveSlots.new(blocker)
	var s := _new_game()
	_fill(s)
	s.start_button.pressed.emit()
	DirAccess.remove_absolute(blocker)
	eq(_started.size(), 0, "start_game is not emitted")
	assert_true(s.form.visible)
	assert_false(s.chooser.visible)
	assert_true(s.status.visible)
	eq(s.status.text, "Couldn't save the new game.")
	eq(s.player_edit.text, "Mira", "the names are kept")


func test_new_game_go_back_from_chooser_and_confirm() -> void:
	_put(1, "One", NOW_OLD)
	_put(2, "Two", NOW_OLD)
	_put(3, "Three", NOW_OLD)
	var s := _new_game()
	_fill(s)
	var heard: Array[int] = []
	s.back_requested.connect(func() -> void: heard.append(1))
	s.start_button.pressed.emit()
	s.replace_buttons[0].pressed.emit()
	assert_true(s.confirm_box.visible)
	assert_true(s.go_back())
	assert_false(s.confirm_box.visible)
	assert_true(s.chooser.visible)
	assert_true(s.go_back())
	assert_false(s.chooser.visible)
	assert_true(s.form.visible)
	eq(heard.size(), 0)
	assert_true(s.go_back())
	eq(heard.size(), 1)
	eq(_started.size(), 0)


func test_new_game_uses_first_free_slot() -> void:
	_put(1, "One", NOW_OLD)
	_newer(2)
	var s := _new_game()
	_fill(s)
	s.start_button.pressed.emit()
	eq(_started, [3] as Array[int])
	assert_true(_exists(3))


func test_new_game_full_slots_asks_and_confirms() -> void:
	_put(1, "One", NOW_OLD)
	_put(2, "Two", NOW_NEW)
	_raw(3, "garbage")
	var s := _new_game(77)
	_fill(s)
	s.start_button.pressed.emit()
	eq(_started.size(), 0)
	assert_true(s.chooser.visible)
	assert_true(s.chooser_label.text.begins_with("All three slots are in use."))
	assert_true(s.replace_buttons[0].visible and s.replace_buttons[1].visible and s.replace_buttons[2].visible)
	eq(s.replace_buttons[1].text, "Replace slot 2")
	s.replace_buttons[1].pressed.emit()
	eq(s.confirm_label.text, "Replace the farm in slot 2 with a new one? Its saved progress and backup will be erased.")
	eq(_started.size(), 0, "nothing is replaced before the confirm")
	eq(d(_loaded(2)["summary"])["farmName"], "Two")
	s.keep_button.pressed.emit()
	eq(_started.size(), 0)
	assert_true(s.chooser.visible)
	s.replace_buttons[2].pressed.emit()
	assert_eq(s.confirm_button.text, "Replace farm")
	s.confirm_button.pressed.emit()
	eq(_started, [3] as Array[int])
	eq(d(_loaded(3)["state"])["seed"], 77, "the damaged slot was overwritten")
	eq(_slots.load_slot(1)["kind"], "ok")


func test_new_game_never_replaces_newer_slot() -> void:
	_put(1, "One", NOW_OLD)
	_newer(2)
	_put(3, "Three", NOW_OLD)
	var s := _new_game()
	_fill(s)
	s.start_button.pressed.emit()
	assert_true(s.chooser.visible)
	assert_true(s.replace_buttons[0].visible)
	assert_false(s.replace_buttons[1].visible, "no replace button for the newer save")
	assert_true(s.replace_buttons[2].visible)
	var before := FileAccess.get_file_as_string(_base.path_join("slot-2.json"))
	s.replace_buttons[0].pressed.emit()
	s.confirm_button.pressed.emit()
	eq(_started, [1] as Array[int])
	eq(FileAccess.get_file_as_string(_base.path_join("slot-2.json")), before)


func test_new_game_all_newer_has_no_slot() -> void:
	_newer(1)
	_newer(2)
	_newer(3)
	var s := _new_game()
	_fill(s)
	s.start_button.pressed.emit()
	eq(_started.size(), 0)
	assert_false(s.chooser.visible)
	assert_true(s.status.visible)
	eq(s.status.text, "No slot can be used. Delete a farm first.")


func test_new_game_back() -> void:
	var s := _new_game()
	var heard: Array[int] = []
	s.back_requested.connect(func() -> void: heard.append(1))
	s.back_button.pressed.emit()
	eq(heard.size(), 1)


# --- Slots -------------------------------------------------------------------------------------------------------------

func test_slot_screen_states() -> void:
	_put(1, "Willow Farm", NOW_OLD, 90 * 60000)
	_raw(2, "{broken")
	_newer(3)
	var s := _slot_screen()
	eq(s.heading.text, "Your farms")
	eq(s.rows[0].slot_label.text, "Slot 1")
	eq(s.rows[2].slot_label.text, "Slot 3")
	var ok_row := s.rows[0]
	eq(ok_row.title.text, "Willow Farm")
	eq(ok_row.line1.text, "Tester")
	eq(ok_row.line2.text, "Year 1, Spring 1")
	assert_true(ok_row.line3.text.ends_with(" gold"))
	eq(ok_row.line4.text, "1 h 30 min played")
	assert_true(ok_row.play.visible and ok_row.delete.visible)
	var bad := s.rows[1]
	eq(bad.title.text, "Damaged save")
	eq(bad.line1.text, "This save can't be read.")
	assert_false(bad.play.visible)
	assert_true(bad.delete.visible)
	var newer := s.rows[2]
	eq(newer.title.text, "Saved by a newer version of the game")
	assert_false(newer.play.visible, "a newer save cannot be loaded")
	assert_true(newer.delete.visible)
	_slots.delete_slot(1)
	_slots.delete_slot(2)
	_slots.delete_slot(3)
	s.refresh()
	for row in s.rows:
		eq(row.title.text, "Empty slot")
		assert_false(row.play.visible)
		assert_false(row.delete.visible)


func test_play_time_formats() -> void:
	eq(MenuScreen.play_time(0), "0 min played")
	eq(MenuScreen.play_time(59 * 60000 + 59999), "59 min played")
	eq(MenuScreen.play_time(60 * 60000), "1 h 0 min played")
	eq(MenuScreen.date_line({"year": 2, "season": "fall", "day": 14}), "Year 2, Fall 14")


func test_slot_play_and_back_emit() -> void:
	_put(2, "Two", NOW_OLD)
	var s := _slot_screen()
	var heard: Array[String] = []
	s.load_slot.connect(func(slot: int) -> void: heard.append("load%d" % slot))
	s.back_requested.connect(func() -> void: heard.append("back"))
	s.rows[1].play.pressed.emit()
	s.back_button.pressed.emit()
	eq(heard, ["load2", "back"] as Array[String])
	eq(s.back_button.text, "Back")
	eq(s.rows[1].play.text, "Play")


func test_delete_needs_confirm() -> void:
	_put(1, "One", NOW_OLD)
	_newer(2)
	var s := _slot_screen()
	s.rows[0].delete.pressed.emit()
	assert_true(s.confirm_box.visible)
	eq(s.confirm_label.text, "Delete the farm in slot 1? This can't be undone.")
	assert_true(_exists(1), "nothing is deleted before the confirm")
	s.keep_button.pressed.emit()
	assert_false(s.confirm_box.visible)
	assert_true(_exists(1))
	s.rows[0].delete.pressed.emit()
	eq(s.confirm_button.text, "Delete farm")
	s.confirm_button.pressed.emit()
	assert_false(_exists(1))
	eq(s.rows[0].title.text, "Empty slot")
	s.rows[1].delete.pressed.emit()
	s.confirm_button.pressed.emit()
	assert_false(_exists(2), "a newer save can be deleted")


func test_delete_leaves_other_slots_untouched() -> void:
	_put(1, "One", NOW_OLD)
	_put(2, "Two", NOW_OLD)
	_raw(3, "{broken")
	var two := FileAccess.get_file_as_string(_base.path_join("slot-2.json"))
	var s := _slot_screen()
	s.rows[0].delete.pressed.emit()
	s.confirm_button.pressed.emit()
	assert_false(_exists(1))
	eq(FileAccess.get_file_as_string(_base.path_join("slot-2.json")), two)
	eq(FileAccess.get_file_as_string(_base.path_join("slot-3.json")), "{broken")


func test_delete_failure_shows_text_and_status_clears_on_next_action() -> void:
	_put(1, "One", NOW_OLD)
	_slots = FailingDeleteSlots.new(_base)
	var s := _slot_screen()
	s.rows[0].delete.pressed.emit()
	s.confirm_button.pressed.emit()
	assert_true(s.status.visible)
	eq(s.status.text, "Couldn't delete the save.")
	assert_true(_exists(1))
	s.rows[0].play.pressed.emit()
	assert_false(s.status.visible, "a later action clears the status")


func test_status_clears_after_successful_delete() -> void:
	_put(1, "One", NOW_OLD)
	var s := _slot_screen()
	s.importer.import_text("junk")
	assert_true(s.status.visible)
	s.rows[0].delete.pressed.emit()
	s.confirm_button.pressed.emit()
	assert_false(s.status.visible)


func test_ui_cancel_goes_back_or_closes_confirm() -> void:
	_put(1, "One", NOW_OLD)
	var s := _slot_screen()
	var heard: Array[int] = []
	s.back_requested.connect(func() -> void: heard.append(1))
	s.rows[0].delete.pressed.emit()
	assert_true(s.go_back())
	assert_false(s.confirm_box.visible)
	eq(heard.size(), 0)
	assert_true(s.go_back())
	eq(heard.size(), 1)


# --- Import ------------------------------------------------------------------------------------------------------------

func _web_text() -> String:
	return FileAccess.get_file_as_string(WEB_EXPORT)


func test_import_success_goes_to_slot_and_lists_it() -> void:
	_put(1, "One", NOW_OLD)
	var s := _slot_screen()
	var r := s.importer.import_text(_web_text())
	eq(r["ok"], true)
	eq(r["slot"], 2)
	eq(r["message"], "Imported to slot 2")
	eq(s.status.text, "Imported to slot 2")
	assert_true(s.rows[1].play.visible, "the imported farm is listed")
	assert_true(_exists(2))


func test_import_success_refreshes_title_continue() -> void:
	var t := _title()
	assert_true(t.continue_button.disabled)
	t.importer.import_text(_web_text())
	assert_false(t.continue_button.disabled)
	eq(t.status.text, "Imported to slot 1")


func test_import_invalid_shows_exact_text() -> void:
	var s := _slot_screen()
	var r := s.importer.import_text("not json at all")
	eq(r["ok"], false)
	eq(r["message"], "This save can't be opened.")
	eq(s.status.text, "This save can't be opened.")
	eq(s.importer.import_text("{\"version\": 99}")["message"], "This save can't be opened.")
	eq(s.importer.import_path(_base.path_join("missing.json"))["message"], "This save can't be opened.")
	var t := _title()
	t.importer.import_text("[]")
	eq(t.status.text, "This save can't be opened.")


func test_import_full_slots_text() -> void:
	_put(1, "One", NOW_OLD)
	_raw(2, "garbage")
	_newer(3)
	var s := _slot_screen()
	var r := s.importer.import_text(_web_text())
	eq(r["ok"], false)
	eq(r["message"], "All three save slots are full.")
	eq(s.status.text, "All three save slots are full.")


func test_import_write_failure_text() -> void:
	eq(ImportDialog.message_for("writeFailed"), "Couldn't save the imported game.")
	# A file where the saves directory should be makes the write fail.
	var blocker := "user://test-screens-blocker-%d" % randi()
	var f := FileAccess.open(blocker, FileAccess.WRITE)
	f.store_string("x")
	f.close()
	var dialog := ImportDialog.new()
	dialog.slots = SaveSlots.new(blocker)
	add_child_autofree(dialog)
	var r := dialog.import_text(_web_text())
	DirAccess.remove_absolute(blocker)
	eq(r["ok"], false)
	eq(r["message"], "Couldn't save the imported game.")


func test_import_oversized_file_is_invalid() -> void:
	DirAccess.make_dir_recursive_absolute(_base)
	var path := _base.path_join("big.json")
	var f := FileAccess.open(path, FileAccess.WRITE)
	f.store_string(_web_text())
	f.store_buffer(PackedByteArray([32]))
	f.seek(ImportDialog.MAX_BYTES + 1)
	f.store_8(32)
	f.close()
	eq(ImportDialog.read_limited(path), "")
	var dialog := ImportDialog.new()
	dialog.slots = _slots
	add_child_autofree(dialog)
	eq(dialog.import_path(path)["message"], "This save can't be opened.")
	assert_false(_exists(1))
	DirAccess.remove_absolute(path)


func test_import_path_reads_file() -> void:
	DirAccess.make_dir_recursive_absolute(_base)
	var path := _base.path_join("export.json")
	var f := FileAccess.open(path, FileAccess.WRITE)
	f.store_string(_web_text())
	f.close()
	var dialog := ImportDialog.new()
	dialog.slots = _slots
	add_child_autofree(dialog)
	var r := dialog.import_path(path)
	eq(r["ok"], true)
	DirAccess.remove_absolute(path)


func test_import_dialog_configuration() -> void:
	var dialog := ImportDialog.new()
	dialog.slots = _slots
	add_child_autofree(dialog)
	var fd := dialog.ensure_dialog()
	eq(fd.file_mode, FileDialog.FILE_MODE_OPEN_FILE)
	eq(fd.access, FileDialog.ACCESS_FILESYSTEM)
	eq(fd.filters, PackedStringArray(["*.json ; Ethergrove save files"]))
	assert_eq(dialog.ensure_dialog(), fd, "created once")
	eq(ImportDialog.is_supported(), not OS.has_feature("web"))


# --- Keyboard and scale ---------------------------------------------------------------------------------------------

func _all_buttons_focusable(s: Control) -> void:
	for node: Node in s.find_children("*", "BaseButton", true, false):
		var b: BaseButton = node
		eq(b.focus_mode, Control.FOCUS_ALL)


func _press(action: String) -> void:
	var e := InputEventAction.new()
	e.action = action
	e.pressed = true
	Input.parse_input_event(e)
	Input.flush_buffered_events()


func test_screens_are_keyboard_navigable() -> void:
	_put(1, "One", NOW_OLD)
	var t := _title()
	_all_buttons_focusable(t)
	assert_eq(get_viewport().gui_get_focus_owner(), t.continue_button, "first button focused on show")
	t.move_focus(1)
	assert_eq(get_viewport().gui_get_focus_owner(), t.new_button)
	t.move_focus(-1)
	t.move_focus(-1)
	assert_eq(get_viewport().gui_get_focus_owner(), t.quit_button, "wraps")
	t.queue_free()
	await get_tree().process_frame
	var s := _slot_screen()
	_all_buttons_focusable(s)
	assert_eq(get_viewport().gui_get_focus_owner(), s.rows[0].play)
	var n := _new_game()
	_all_buttons_focusable(n)
	n.focus_first()
	assert_eq(get_viewport().gui_get_focus_owner(), n.player_edit)


func test_move_focus_back_without_focus_picks_last() -> void:
	var t := _title()
	get_viewport().gui_release_focus()
	t.move_focus(-1)
	assert_eq(get_viewport().gui_get_focus_owner(), t.quit_button)
	get_viewport().gui_release_focus()
	t.move_focus(1)
	assert_eq(get_viewport().gui_get_focus_owner(), t.new_button)


func test_ui_down_and_up_move_focus() -> void:
	var t := _title()
	var first := get_viewport().gui_get_focus_owner()
	var list := t.focusables()
	eq(list[0], first)
	_press("ui_down")
	await get_tree().process_frame
	assert_eq(get_viewport().gui_get_focus_owner(), list[1])


func test_text_size_follows_ui_scale() -> void:
	DirAccess.make_dir_recursive_absolute(_base)
	var settings := preload("res://game/autoload/settings.gd").new()
	settings.set("_path", _base.path_join("settings.cfg"))
	add_child_autofree(settings)
	settings.set_ui_scale(1.5)
	var t := TitleScreen.new()
	t.slots = _slots
	t.settings = settings
	add_child_autofree(t)
	eq(t.theme.default_font_size, ThemeFactory.font_size(1.5))
	settings.set_ui_scale(1.0)
	eq(t.theme.default_font_size, ThemeFactory.font_size(1.0))
