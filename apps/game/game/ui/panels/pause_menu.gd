class_name PauseMenu
extends ModalPanel
## The pause menu, from apps/web/src/ui/screens/Pause.tsx, Settings.tsx and JournalPanel.tsx: the farm's name as the
## title, Resume and Bag; the Graphics choice (radios bound to `Settings.set_choice`, the selection read from
## `Settings.choice`, never the resolved tier) and Text size (`Settings.set_ui_scale`); Skip lessons (with the
## Journal's confirm) or Start lessons again (`skipLessons` / `restartLessons`); Save now, Export save (the web's
## `*.ethergrove.json` file written to `PanelHost.export_dir`) and Save and quit.

const SaveServiceScript := preload("res://game/autoload/save_service.gd")
const SettingsScript := preload("res://game/autoload/settings.gd")

const PAUSED := "Paused"
const RESUME := "Resume"
const BAG := "Bag"
const GRAPHICS := "Graphics"
const QUALITY_ORDER: Array[String] = ["auto", "high", "medium", "low"]
const QUALITY_LABEL: Dictionary[String, String] = {
	"auto": "Automatic (recommended)",
	"high": "High (stronger GPUs)",
	"medium": "Medium",
	"low": "Low (older or built-in graphics)",
}
const DISPLAY := "Display"
const MODE_LABEL: Dictionary[String, String] = {"windowed": "Windowed", "fullscreen": "Full screen (F11)"}
const SIZE_AUTO_LABEL := "Window size: automatic (80% of the screen)"
const TEXT_SIZE := "Text size"
## `{t * 100}%`.
const SCALE_LABEL := "%d%%"
## lessonText.ts JOURNAL_TEXT.
const SKIP := "Skip lessons"
const RESTART := "Start lessons again"
const SKIP_TITLE := "Skip Grandpa's lessons?"
const SKIP_BODY := "You can start them again from this Journal any time."
const SKIP_CONFIRM := "Skip"
const SKIP_CANCEL := "Keep learning"
## New in the Godot game (the web has no Save now button and downloads the export).
const SAVE_NOW := "Save now"
const SAVED := "Game saved."
const EXPORTED := "Save exported to %s"
const EXPORT_FAILED := "Couldn't export the save."
const EXPORT := "Export save"
const SAVE_AND_QUIT := "Save and quit"
const SAVE_FAILED := SaveServiceScript.SAVE_FAILED_TEXT
## Pause.tsx pushes the save failure with a 6 s duration.
const SAVE_FAILED_MS := 6000

var _quality: Dictionary[String, CheckBox] = {}
var _scales: Array[CheckBox] = []
var _modes: Dictionary[String, CheckBox] = {}
var _sizes: Dictionary[String, CheckBox] = {}
var _lessons: Button
var _confirm: VBoxContainer
var _keep: Button
var _confirming: bool = false


func build() -> void:
	var top := ModalPanel.make_row()
	var resume := ModalPanel.make_button(RESUME)
	resume.pressed.connect(func() -> void: host.close())
	var bag := ModalPanel.make_button(BAG)
	bag.pressed.connect(func() -> void: host.open("bag"))
	top.add_child(resume)
	top.add_child(bag)
	body.add_child(top)

	body.add_child(_legend(GRAPHICS))
	var quality_group := ButtonGroup.new()
	for id: String in QUALITY_ORDER:
		var radio := _radio(QUALITY_LABEL[id], quality_group)
		radio.pressed.connect(_on_quality.bind(id))
		body.add_child(radio)
		_quality[id] = radio

	body.add_child(_legend(DISPLAY))
	var mode_group := ButtonGroup.new()
	var modes := ModalPanel.make_row()
	for mode: String in DisplayModes.MODES:
		var radio := _radio(MODE_LABEL[mode], mode_group)
		radio.pressed.connect(_on_mode.bind(mode))
		modes.add_child(radio)
		_modes[mode] = radio
	body.add_child(modes)
	var size_group := ButtonGroup.new()
	var size_ids: Array[String] = [DisplayModes.AUTO]
	size_ids.append_array(DisplayModes.available_sizes(DisplayModes.usable_size()))
	for id: String in size_ids:
		var radio := _radio(SIZE_AUTO_LABEL if id == DisplayModes.AUTO else "Window size: %s" % id, size_group)
		radio.pressed.connect(_on_window_size.bind(id))
		body.add_child(radio)
		_sizes[id] = radio

	body.add_child(_legend(TEXT_SIZE))
	var scale_group := ButtonGroup.new()
	var scales := ModalPanel.make_row()
	for value: float in SettingsScript.UI_SCALES:
		var radio := _radio(SCALE_LABEL % roundi(value * 100), scale_group)
		radio.pressed.connect(_on_scale.bind(value))
		scales.add_child(radio)
		_scales.append(radio)
	body.add_child(scales)

	_lessons = ModalPanel.make_button(SKIP)
	_lessons.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	_lessons.pressed.connect(_on_lessons)
	body.add_child(_lessons)
	_confirm = VBoxContainer.new()
	var confirm_title := ModalPanel.make_label(SKIP_TITLE)
	confirm_title.add_theme_color_override("font_color", ThemeFactory.ACCENT_BRIGHT)
	_confirm.add_child(confirm_title)
	_confirm.add_child(ModalPanel.make_label(SKIP_BODY, true))
	var confirm_row := ModalPanel.make_row()
	var skip := ModalPanel.make_button(SKIP_CONFIRM)
	skip.pressed.connect(_on_skip)
	_keep = ModalPanel.make_button(SKIP_CANCEL)
	_keep.pressed.connect(_on_keep)
	confirm_row.add_child(skip)
	confirm_row.add_child(_keep)
	_confirm.add_child(confirm_row)
	body.add_child(_confirm)

	var bottom := ModalPanel.make_row()
	var save_now := ModalPanel.make_button(SAVE_NOW)
	save_now.pressed.connect(_on_save_now)
	var export := ModalPanel.make_button(EXPORT)
	export.pressed.connect(_on_export)
	var quit := ModalPanel.make_button(SAVE_AND_QUIT)
	quit.pressed.connect(_on_quit)
	bottom.add_child(save_now)
	bottom.add_child(export)
	bottom.add_child(quit)
	body.add_child(bottom)


func on_open() -> void:
	_confirming = false


func refresh() -> void:
	var farm: String = session.state.get("farmName", "")
	title_label.text = farm if farm != "" else PAUSED
	var settings := host.settings
	if settings != null:
		for id: String in QUALITY_ORDER:
			_quality[id].set_pressed_no_signal(settings.choice == id)
		for mode: String in _modes:
			_modes[mode].set_pressed_no_signal(settings.display_mode == mode)
		for id: String in _sizes:
			_sizes[id].set_pressed_no_signal(settings.window_size == id)
		for i: int in _scales.size():
			_scales[i].set_pressed_no_signal(is_equal_approx(settings.ui_scale, SettingsScript.UI_SCALES[i]))
	_lessons.text = SKIP if _lessons_active() else RESTART
	_confirm.visible = _confirming


## The Graphics radio for a choice ("auto", "high", "medium", "low").
func quality_radio(id: String) -> CheckBox:
	return _quality[id]


## The Display radio for a mode ("windowed", "fullscreen").
func mode_radio(mode: String) -> CheckBox:
	return _modes[mode]


## The window size radio for "auto" or a size that fits the screen; null when that size is not offered.
func size_radio(id: String) -> CheckBox:
	return _sizes.get(id)


## The Text size radio for a UI scale (1.0, 1.25, 1.5).
func scale_radio(value: float) -> CheckBox:
	for i: int in _scales.size():
		if is_equal_approx(SettingsScript.UI_SCALES[i], value):
			return _scales[i]
	return null


## fileIO.ts exportFileName: `ethergrove-<farm slug or "farm">-y<year>-<season><day>.ethergrove.json`.
static func export_file_name(file: Dictionary) -> String:
	var summary: Dictionary = file["summary"]
	var farm_name: String = summary["farmName"]
	var slug := RegEx.create_from_string("[^a-z0-9]+").sub(farm_name.to_lower(), "-", true)
	slug = RegEx.create_from_string("^-|-$").sub(slug, "", true)
	var calendar: Dictionary = summary["calendar"]
	var year: int = calendar["year"]
	var season: String = calendar["season"]
	var day: int = calendar["day"]
	return "ethergrove-%s-y%d-%s%d.ethergrove.json" % [slug if slug != "" else "farm", year, season, day]


func _lessons_active() -> bool:
	var tutorial: Dictionary = session.state["tutorial"]
	var lesson: String = tutorial["lesson"]
	return lesson != "off" and lesson != "complete"


func _legend(text: String) -> Label:
	var label := ModalPanel.make_label(text)
	label.add_theme_color_override("font_color", ThemeFactory.ACCENT)
	return label


func _radio(text: String, group: ButtonGroup) -> CheckBox:
	var radio := CheckBox.new()
	radio.text = text
	radio.toggle_mode = true
	radio.button_group = group
	radio.focus_mode = Control.FOCUS_ALL
	return radio


func _on_quality(id: String) -> void:
	if host.settings != null:
		host.settings.set_choice(id)
	content_changed.emit()


func _on_mode(mode: String) -> void:
	if host.settings != null:
		host.settings.set_display_mode(mode)
	content_changed.emit()


func _on_window_size(id: String) -> void:
	if host.settings != null:
		host.settings.set_window_size(id)
	content_changed.emit()


func _on_scale(value: float) -> void:
	if host.settings != null:
		host.settings.set_ui_scale(value)
	content_changed.emit()


func _on_lessons() -> void:
	if _lessons_active():
		_confirming = true
		content_changed.emit()
		_keep.grab_focus()
		return
	session.dispatch({"type": "restartLessons"})
	host.close()


func _on_keep() -> void:
	_confirming = false
	content_changed.emit()
	_lessons.grab_focus()


func _on_skip() -> void:
	_confirming = false
	session.dispatch({"type": "skipLessons"})
	content_changed.emit()
	_lessons.grab_focus()


## A write failure is not toasted here: SaveService emits `save_failed` with the same text and the HUD shows it.
## With no slot SaveService emits nothing, so the menu says it could not save (the player asked to save).
func _on_save_now() -> void:
	var err := _save()
	if err == OK:
		host.toast(SAVED)
	elif err == ERR_UNCONFIGURED:
		host.toast(SAVE_FAILED, "warn", SAVE_FAILED_MS)


func _on_export() -> void:
	var file := SaveMigrate.make_save_file(session.state, session.play_time_ms, _now())
	var path := host.export_dir.path_join(export_file_name(file))
	var err := DirAccess.make_dir_recursive_absolute(host.export_dir)
	if err == OK:
		var out := FileAccess.open(path, FileAccess.WRITE)
		if out == null:
			err = FileAccess.get_open_error()
		else:
			if not out.store_string(JSON.stringify(file)):
				err = FAILED
			if err == OK:
				err = out.get_error()
			out.close()
	if err != OK:
		push_warning("Export to %s failed: %s" % [path, error_string(err)])
		host.toast(EXPORT_FAILED, "warn", SAVE_FAILED_MS)
		return
	host.toast(EXPORTED % ProjectSettings.globalize_path(path))


func _on_quit() -> void:
	var err := _save()
	# As the web's saveNow, a game with no slot has nothing to save and quits. A failed save stays in the menu; its
	# toast comes from SaveService.save_failed (shown by the HUD), not from here.
	if err == OK or err == ERR_UNCONFIGURED:
		host.quit_to_title()


## Saves through SaveService: OK, ERR_UNCONFIGURED (no game, slot or service) or the write error.
func _save() -> Error:
	var service := host.save_service
	if service == null:
		return ERR_UNCONFIGURED
	return service.save_now()


static func _now() -> String:
	return Time.get_datetime_string_from_system(true) + "Z"
