extends CoreTest
## Settings autoload script: persisted graphics choice and UI scale. Instances are built directly with a temp path
## so the real user://settings.cfg is never touched.

const SCRIPT_PATH := "res://game/autoload/settings.gd"

var _path: String = ""
var _made: Array[Node] = []


func before_each() -> void:
	_path = "user://test-settings-%d.cfg" % randi()


func after_each() -> void:
	for n: Node in _made:
		n.free()
	_made.clear()
	if FileAccess.file_exists(_path):
		DirAccess.remove_absolute(_path)


func _make(renderer: String = "Apple M4") -> Node:
	var script: GDScript = load(SCRIPT_PATH)
	var s: Node = script.new()
	s.set("_path", _path)
	s.set("renderer_override", renderer)
	s.call("load_settings")
	_made.append(s)
	return s


func test_defaults() -> void:
	var s: Node = _make()
	eq(s.get("choice"), "auto")
	eq(s.get("ui_scale"), 1.0)
	eq(s.call("tier"), "medium")
	eq(_make("llvmpipe").call("tier"), "low")


func test_settings_round_trip() -> void:
	var s: Node = _make()
	s.call("set_choice", "high")
	s.set("ui_scale", 1.5)
	s.call("save_settings")
	var again: Node = _make()
	eq(again.get("choice"), "high")
	eq(again.get("ui_scale"), 1.5)
	eq(again.call("tier"), "high")


func test_settings_corrupt_file_defaults() -> void:
	var f: FileAccess = FileAccess.open(_path, FileAccess.WRITE)
	f.store_string("[graphics\nchoice = = garbage ]]]")
	f.close()
	var s: Node = _make()
	eq(s.get("choice"), "auto")
	eq(s.get("ui_scale"), 1.0)


func test_invalid_stored_values_default() -> void:
	var cfg := ConfigFile.new()
	cfg.set_value("graphics", "choice", "ultra")
	cfg.set_value("ui", "scale", 2.0)
	cfg.save(_path)
	var s: Node = _make()
	eq(s.get("choice"), "auto")
	eq(s.get("ui_scale"), 1.0)


func test_ui_scale_allowed_values() -> void:
	var s: Node = _make()
	for v: float in [1.0, 1.25, 1.5]:
		s.call("set_ui_scale", v)
		eq(s.get("ui_scale"), v)
	s.call("set_ui_scale", 3.0)
	eq(s.get("ui_scale"), 1.0)


func test_set_choice_rejects_unknown() -> void:
	var s: Node = _make()
	s.call("set_choice", "low")
	s.call("set_choice", "ultra")
	eq(s.get("choice"), "low")


func test_tier_changed_signal_fires_once() -> void:
	var s: Node = _make()
	watch_signals(s)
	s.call("set_choice", "high")
	assert_signal_emit_count(s, "tier_changed", 1)
	assert_signal_emitted_with_parameters(s, "tier_changed", ["high"])
	s.call("set_choice", "high")
	assert_signal_emit_count(s, "tier_changed", 1)


func test_auto_to_equivalent_tier_does_not_emit() -> void:
	var s: Node = _make()
	s.call("set_choice", "medium")
	watch_signals(s)
	s.call("set_choice", "auto")
	assert_signal_not_emitted(s, "tier_changed")


func test_ui_scale_changed_signal_fires_only_on_a_change() -> void:
	var s: Node = _make()
	watch_signals(s)
	s.call("set_ui_scale", 1.5)
	assert_signal_emitted_with_parameters(s, "ui_scale_changed", [1.5])
	s.call("set_ui_scale", 1.5)
	assert_signal_emit_count(s, "ui_scale_changed", 1)
	s.call("set_ui_scale", 3.0)
	assert_signal_emitted_with_parameters(s, "ui_scale_changed", [1.0])
	assert_signal_emit_count(s, "ui_scale_changed", 2)


func test_display_defaults_and_persistence() -> void:
	var s: Node = _make()
	eq(s.get("display_mode"), "windowed")
	eq(s.get("window_size"), "auto")
	s.call("set_display_mode", "fullscreen")
	s.call("set_window_size", "1600x900")
	var again: Node = _make()
	eq(again.get("display_mode"), "fullscreen")
	eq(again.get("window_size"), "1600x900")


func test_invalid_display_values_are_ignored() -> void:
	var s: Node = _make()
	s.call("set_display_mode", "borderless")
	s.call("set_window_size", "1234x567")
	eq(s.get("display_mode"), "windowed")
	eq(s.get("window_size"), "auto")
	var cfg := ConfigFile.new()
	cfg.set_value("display", "mode", 7)
	cfg.set_value("display", "size", "weird")
	cfg.save(_path)
	var loaded: Node = _make()
	eq(loaded.get("display_mode"), "windowed")
	eq(loaded.get("window_size"), "auto")


func test_toggle_fullscreen_flips_and_emits() -> void:
	var s: Node = _make()
	watch_signals(s)
	s.call("toggle_fullscreen")
	eq(s.get("display_mode"), "fullscreen")
	assert_signal_emitted(s, "display_changed")
	s.call("toggle_fullscreen")
	eq(s.get("display_mode"), "windowed")


func test_f11_is_bound_to_fullscreen() -> void:
	InputActions.register()
	var found := false
	for e: InputEvent in InputMap.action_get_events(InputActions.FULLSCREEN):
		var k := e as InputEventKey
		if k != null and k.physical_keycode == KEY_F11:
			found = true
	assert_true(found)
