class_name EnergyBar
extends ProgressBar
## Bottom-left energy bar (apps/web/src/ui/hud/Stamina.tsx; named Energy from ARPG section 9.5, so the label says
## "Energy"). The fill turns red at Balance.STAMINA_LOW_AT or less.

var is_low: bool = false
var is_empty: bool = false

var _label := Label.new()
var _fill_normal: StyleBoxFlat = ThemeFactory.box(ThemeFactory.ACCENT, ThemeFactory.ACCENT, 0, 4)
var _fill_low: StyleBoxFlat = ThemeFactory.box(ThemeFactory.DANGER, ThemeFactory.DANGER, 0, 4)


func _init() -> void:
	min_value = 0.0
	max_value = float(Balance.MAX_ENERGY)
	value = max_value
	show_percentage = false
	focus_mode = Control.FOCUS_NONE
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	custom_minimum_size = Vector2(200, 22)
	_label.text = label_text()
	_label.focus_mode = Control.FOCUS_NONE
	_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_label.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(_label)
	add_theme_stylebox_override("fill", _fill_normal)


func label_text() -> String:
	return "Energy"


func fraction() -> float:
	return value / max_value


func set_energy(energy: int) -> void:
	value = float(energy)
	is_empty = energy <= 0
	var low := energy <= Balance.STAMINA_LOW_AT
	if low != is_low:
		is_low = low
		add_theme_stylebox_override("fill", _fill_low if low else _fill_normal)


func refresh(state: Dictionary) -> void:
	var player: Dictionary = state["player"]
	var energy: int = player["energy"]
	set_energy(energy)
