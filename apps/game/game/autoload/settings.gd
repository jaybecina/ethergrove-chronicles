extends Node
## Persisted player settings (autoload `Settings`): the graphics choice ("auto" or a tier id) and the UI scale.
## A missing or corrupt file, or an invalid stored value, yields the defaults without error.

signal tier_changed(tier: String)
## The UI scale changed (1.0, 1.25 or 1.5); the HUD rebuilds its theme from it.
signal ui_scale_changed(scale: float)
## The window mode or size changed (and was applied).
signal display_changed
## The music or effects volume changed (linear, 0 to 1); the audio buses follow it.
signal audio_changed

const DEFAULT_PATH := "user://settings.cfg"
const UI_SCALES: Array[float] = [1.0, 1.25, 1.5]

var choice: String = "auto"
var ui_scale: float = 1.0
## "windowed" (the default, at `window_size`) or "fullscreen".
var display_mode: String = "windowed"
## "auto" (80% of the screen) or one of `DisplayModes.SIZES`.
var window_size: String = "auto"
## Linear 0 to 1; the `Music` and `SFX` buses carry them (AudioBuses).
var music_volume: float = 0.6
var sfx_volume: float = 0.8
## Tests set these; production reads the real renderer.
var renderer_override: String = ""
var _path: String = DEFAULT_PATH


func _ready() -> void:
	load_settings()
	# After the window exists; the first frame would otherwise show the default size.
	apply_display.call_deferred()


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed(InputActions.FULLSCREEN):
		toggle_fullscreen()
		get_viewport().set_input_as_handled()


func set_display_mode(mode: String) -> void:
	if not DisplayModes.MODES.has(mode):
		return
	display_mode = mode
	save_settings()
	apply_display()


func set_window_size(size_id: String) -> void:
	if not DisplayModes.is_valid_choice(size_id):
		return
	window_size = size_id
	save_settings()
	apply_display()


func toggle_fullscreen() -> void:
	set_display_mode("windowed" if display_mode == "fullscreen" else "fullscreen")


## Puts the window in the saved mode and size (no effect without a real window) and tells listeners.
func apply_display() -> void:
	DisplayModes.apply(display_mode, window_size)
	display_changed.emit()


func renderer_name() -> String:
	if renderer_override != "":
		return renderer_override
	return RenderingServer.get_video_adapter_name()


## The tier currently in force ("auto" resolved against the renderer).
func tier() -> String:
	return Tiers.resolve(choice, renderer_name())


func set_choice(c: String) -> void:
	if c != "auto" and not Tiers.IDS.has(c):
		return
	var before: String = tier()
	choice = c
	save_settings()
	var after: String = tier()
	if after != before:
		tier_changed.emit(after)


func set_music_volume(v: float) -> void:
	music_volume = clampf(v, 0.0, 1.0)
	save_settings()
	audio_changed.emit()


func set_sfx_volume(v: float) -> void:
	sfx_volume = clampf(v, 0.0, 1.0)
	save_settings()
	audio_changed.emit()


func set_ui_scale(v: float) -> void:
	var before := ui_scale
	ui_scale = _valid_scale(v)
	save_settings()
	if not is_equal_approx(before, ui_scale):
		ui_scale_changed.emit(ui_scale)


func load_settings() -> void:
	choice = "auto"
	ui_scale = 1.0
	display_mode = "windowed"
	window_size = "auto"
	music_volume = 0.6
	sfx_volume = 0.8
	var cfg := ConfigFile.new()
	if cfg.load(_path) != OK:
		return
	var c: Variant = cfg.get_value("graphics", "choice", "auto")
	if c is String and (c == "auto" or Tiers.IDS.has(c)):
		choice = c
	var s: Variant = cfg.get_value("ui", "scale", 1.0)
	if s is float or s is int:
		var raw: float = s
		ui_scale = _valid_scale(raw)
	var m: Variant = cfg.get_value("display", "mode", "windowed")
	if m is String:
		var mode_text: String = m
		if DisplayModes.MODES.has(mode_text):
			display_mode = mode_text
	var z: Variant = cfg.get_value("display", "size", "auto")
	if z is String:
		var size_text: String = z
		if DisplayModes.is_valid_choice(size_text):
			window_size = size_text
	var mv: Variant = cfg.get_value("audio", "music", 0.6)
	if mv is float or mv is int:
		var music_raw: float = mv
		music_volume = clampf(music_raw, 0.0, 1.0)
	var sv: Variant = cfg.get_value("audio", "sfx", 0.8)
	if sv is float or sv is int:
		var sfx_raw: float = sv
		sfx_volume = clampf(sfx_raw, 0.0, 1.0)


func save_settings() -> void:
	var cfg := ConfigFile.new()
	cfg.set_value("graphics", "choice", choice)
	cfg.set_value("ui", "scale", ui_scale)
	cfg.set_value("display", "mode", display_mode)
	cfg.set_value("display", "size", window_size)
	cfg.set_value("audio", "music", music_volume)
	cfg.set_value("audio", "sfx", sfx_volume)
	var err: Error = cfg.save(_path)
	if err != OK:
		push_warning("Settings: could not save %s (%s)" % [_path, error_string(err)])


static func _valid_scale(v: float) -> float:
	for allowed: float in UI_SCALES:
		if is_equal_approx(v, allowed):
			return allowed
	return 1.0
