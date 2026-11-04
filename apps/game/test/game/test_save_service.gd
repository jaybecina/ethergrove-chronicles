extends CoreTest
## SaveService autoload script: save_now, autosave triggers (new morning, focus out, close request), load_slot and
## failure handling, ported from apps/web/src/save/autosave.ts. Instances are built directly, wired to a test
## GameSession and to SaveSlots under a fresh `user://test-saves-<random>`, removed in after_each; the real
## user://saves is never touched.

const GameSessionScript := preload("res://game/autoload/game_session.gd")
const SaveServiceScript := preload("res://game/autoload/save_service.gd")
const FAILED_TEXT := "Couldn't save. Use Export save to keep your progress."

var _base: String = ""
var _failures: Array[String] = []


func before_each() -> void:
	_base = "user://test-saves-%d" % randi()
	_failures = []


func after_each() -> void:
	_remove_tree(_base)


func _remove_tree(path: String) -> void:
	if not DirAccess.dir_exists_absolute(path):
		return
	for dir: String in DirAccess.get_directories_at(path):
		_remove_tree(path.path_join(dir))
	for name: String in DirAccess.get_files_at(path):
		DirAccess.remove_absolute(path.path_join(name))
	DirAccess.remove_absolute(path)


func _session(state: Dictionary = TestStates.fresh(), slot: int = 1) -> GameSessionScript:
	var s: GameSessionScript = GameSessionScript.new()
	add_child_autofree(s)
	s.set_process(false)
	s.start(state, slot, 5000)
	s.set_screen("game")
	return s


func _service(session: GameSessionScript) -> SaveServiceScript:
	var svc: SaveServiceScript = SaveServiceScript.new()
	svc.session = session
	svc.slots = SaveSlots.new(_base)
	add_child_autofree(svc)
	svc.save_failed.connect(_on_failed)
	return svc


func _on_failed(message: String) -> void:
	_failures.append(message)


func _slot_path(slot: int) -> String:
	return _base.path_join("slot-%d.json" % slot)



func test_failed_text_is_copied_from_pause_tsx() -> void:
	eq(SaveServiceScript.SAVE_FAILED_TEXT, FAILED_TEXT)


func test_save_now_writes_the_slot() -> void:
	var s := _session()
	var svc := _service(s)
	eq(svc.save_now(), OK)
	var res := svc.slots.load_slot(1)
	eq(res["kind"], "ok")
	var file: Dictionary = res["file"]
	eq(JsonNorm.first_diff(file["state"], s.state), "")
	eq(file["playTimeMs"], 5000)
	var saved_at: String = file["savedAt"]
	assert_true(saved_at.ends_with("Z") and saved_at.length() == 20, "UTC ISO time: %s" % saved_at)
	eq(_failures, [])


func test_save_now_without_a_slot_writes_nothing() -> void:
	var svc := _service(_session(TestStates.fresh(), 0))
	eq(svc.save_now(), ERR_UNCONFIGURED)
	assert_false(DirAccess.dir_exists_absolute(_base))
	eq(_failures, [], "not a failure")


func test_autosave_on_day_started() -> void:
	var s := _session(TestStates.stand_at(TestStates.fresh(), 2, 2, "n"))
	var player: Dictionary = s.state["player"]
	player["location"] = "house"
	_service(s)
	assert_false(FileAccess.file_exists(_slot_path(1)))
	s.dispatch({"type": "cycleHotbar", "dir": 1})
	assert_false(FileAccess.file_exists(_slot_path(1)), "no save without a new morning")
	var events := s.dispatch({"type": "sleep"})
	assert_true(events.any(func(e: Dictionary) -> bool: return e["type"] == "dayStarted"))
	var res := SaveSlots.new(_base).load_slot(1)
	eq(res["kind"], "ok")
	var file: Dictionary = res["file"]
	eq(JsonNorm.first_diff(file["state"], s.state), "", "the new morning is saved")


func test_save_skipped_when_state_identical() -> void:
	var s := _session()
	var svc := _service(s)
	eq(svc.save_now(), OK)
	DirAccess.remove_absolute(_slot_path(1))
	eq(svc.save_now(), OK)
	assert_false(FileAccess.file_exists(_slot_path(1)), "the identical state is not written again")
	s.dispatch({"type": "cycleHotbar", "dir": 1})
	eq(svc.save_now(), OK)
	assert_true(FileAccess.file_exists(_slot_path(1)), "a changed state is written")


func test_load_slot_starts_session() -> void:
	var saved_state := TestStates.lesson_at(TestStates.fresh(3), "water")
	SaveSlots.new(_base).save(2, SaveMigrate.make_save_file(saved_state, 777, "2026-11-03T10:00:00Z"))
	var s: GameSessionScript = GameSessionScript.new()
	add_child_autofree(s)
	s.set_process(false)
	var svc := _service(s)
	var res := svc.load_slot(2)
	eq(res["kind"], "ok")
	eq(JsonNorm.first_diff(s.state, saved_state), "")
	eq(s.slot, 2)
	eq(s.play_time_ms, 777)
	eq(s.screen, "title", "loading does not start the clock")
	eq(svc.load_slot(3)["kind"], "missing")
	eq(s.slot, 2, "a missing slot leaves the session alone")


func test_autosave_failure_keeps_playing() -> void:
	var s := _session()
	var svc := _service(s)
	eq(svc.save_now(), OK)
	var old := FileAccess.get_file_as_string(_slot_path(1))
	# A directory where the temp file goes blocks the write.
	DirAccess.make_dir_recursive_absolute(_slot_path(1) + ".tmp")
	s.dispatch({"type": "cycleHotbar", "dir": 1})
	assert_ne(svc.save_now(), OK)
	eq(_failures, [FAILED_TEXT])
	assert_ne(svc.last_error, "")
	eq(s.screen, "game", "the game keeps playing")
	eq(FileAccess.get_file_as_string(_slot_path(1)), old, "the old save is intact")
	s.step([], Clock.STEP_MS)
	eq(s.play_time_ms, 5000 + Clock.STEP_MS)


func test_failed_save_is_retried() -> void:
	var s := _session()
	var svc := _service(s)
	DirAccess.make_dir_recursive_absolute(_slot_path(1) + ".tmp")
	assert_ne(svc.save_now(), OK)
	_remove_tree(_slot_path(1) + ".tmp")
	eq(svc.save_now(), OK, "the same state is saved once the folder is free")
	assert_true(FileAccess.file_exists(_slot_path(1)))


func test_newer_slot_is_not_overwritten_by_autosave() -> void:
	DirAccess.make_dir_recursive_absolute(_base)
	var newer := '{"version": 99, "state": {}}'
	var f := FileAccess.open(_slot_path(1), FileAccess.WRITE)
	f.store_string(newer)
	f.close()
	var s := _session()
	var svc := _service(s)
	eq(svc.save_now(), ERR_ALREADY_EXISTS)
	eq(_failures, [FAILED_TEXT])
	eq(FileAccess.get_file_as_string(_slot_path(1)), newer)
	eq(s.screen, "game")


func test_focus_out_saves() -> void:
	var s := _session()
	var svc := _service(s)
	svc.notification(Node.NOTIFICATION_APPLICATION_FOCUS_OUT)
	assert_true(FileAccess.file_exists(_slot_path(1)))


func test_close_request_saves() -> void:
	var s := _session()
	var svc := _service(s)
	svc.notification(Node.NOTIFICATION_WM_CLOSE_REQUEST)
	assert_true(FileAccess.file_exists(_slot_path(1)))


func test_focus_out_on_the_title_screen_does_not_save() -> void:
	var s := _session()
	s.set_screen("title")
	var svc := _service(s)
	svc.notification(Node.NOTIFICATION_APPLICATION_FOCUS_OUT)
	assert_false(FileAccess.file_exists(_slot_path(1)))


func test_session_round_trip_in_lowmere() -> void:
	var state := TestStates.lesson_at(TestStates.stand_at(TestStates.fresh(), 12, 6, "s"), "buySeeds")
	var player: Dictionary = state["player"]
	player["location"] = "lowmere"
	var s := _session(state, 3)
	var svc := _service(s)
	eq(svc.save_now(), OK)
	var fresh: GameSessionScript = GameSessionScript.new()
	add_child_autofree(fresh)
	fresh.set_process(false)
	var svc2 := _service(fresh)
	eq(svc2.load_slot(3)["kind"], "ok")
	var loaded: Dictionary = fresh.state["player"]
	eq(loaded["location"], "lowmere")
	eq(loaded["x"], 12.5)
	eq(loaded["z"], 6.5)
	eq(d(fresh.state["tutorial"])["lesson"], "buySeeds")
	eq(JsonNorm.first_diff(fresh.state, state), "")


func test_set_pose_survives_save() -> void:
	var s := _session()
	var svc := _service(s)
	eq(svc.save_now(), OK)
	var player: Dictionary = s.state["player"]
	var old_x: float = player["x"]
	var z: float = player["z"]
	s.set_pose(old_x + 2.0, z, "e")
	eq(svc.save_now(), OK)
	var file: Dictionary = svc.slots.load_slot(1)["file"]
	var saved_player: Dictionary = d(file["state"])["player"]
	eq(saved_player["x"], old_x + 2.0, "the in-place pose change is seen as a new state and saved")
	eq(saved_player["facing"], "e")


func test_new_session_clears_the_last_saved_state() -> void:
	var s := _session()
	var svc := _service(s)
	eq(svc.save_now(), OK)
	DirAccess.remove_absolute(_slot_path(1))
	s.start(TestStates.fresh(), 1, 5000)
	svc.notification(Node.NOTIFICATION_APPLICATION_FOCUS_OUT)
	assert_true(FileAccess.file_exists(_slot_path(1)), "an identical new game in the same slot is written again")


func test_load_slot_clears_the_last_saved_state() -> void:
	var s := _session()
	var svc := _service(s)
	eq(svc.save_now(), OK)
	eq(svc.load_slot(1)["kind"], "ok")
	DirAccess.remove_absolute(_slot_path(1))
	eq(svc.save_now(), OK)
	assert_true(FileAccess.file_exists(_slot_path(1)), "the loaded game is written again")
