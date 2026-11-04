class_name Hotbar
extends HBoxContainer
## Bottom-centre hotbar (apps/web/src/ui/hud/Hotbar.tsx): five tool slots in Balance.TOOL_ORDER, a gap, then the
## three quick slots showing the pinned bag item and its count. The active slot has a bright outline. The nodes are
## built once; `refresh` only changes text and styles.

const SLOTS := 8
const SLOT_SIZE := Vector2(88, 56)

var _panels: Array[PanelContainer] = []
var _labels: Array[Label] = []
var _active: Array[bool] = []
var _normal: StyleBoxFlat = ThemeFactory.box(ThemeFactory.BACKGROUND, ThemeFactory.PANEL, 2)
var _highlight: StyleBoxFlat = ThemeFactory.box(ThemeFactory.PANEL, ThemeFactory.ACCENT_BRIGHT, 3)


func _init() -> void:
	focus_mode = Control.FOCUS_NONE
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_theme_constant_override("separation", 6)
	for i: int in SLOTS:
		if i == Balance.TOOL_ORDER.size():
			var gap := Control.new()
			gap.custom_minimum_size = Vector2(14, 0)
			gap.focus_mode = Control.FOCUS_NONE
			gap.mouse_filter = Control.MOUSE_FILTER_IGNORE
			add_child(gap)
		var panel := PanelContainer.new()
		panel.custom_minimum_size = SLOT_SIZE
		panel.focus_mode = Control.FOCUS_NONE
		panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
		panel.add_theme_stylebox_override("panel", _normal)
		var label := Label.new()
		label.focus_mode = Control.FOCUS_NONE
		label.mouse_filter = Control.MOUSE_FILTER_IGNORE
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		label.autowrap_mode = TextServer.AUTOWRAP_OFF
		panel.add_child(label)
		add_child(panel)
		_panels.append(panel)
		_labels.append(label)
		_active.append(false)


func slot_count() -> int:
	return _panels.size()


func slot_text(i: int) -> String:
	return _labels[i].text


func is_active(i: int) -> bool:
	return _active[i]


## Scales the slot size with the UI scale (the font scales through the theme).
func apply_scale(ui_scale: float) -> void:
	for panel: PanelContainer in _panels:
		panel.custom_minimum_size = SLOT_SIZE * ui_scale


func refresh(state: Dictionary) -> void:
	var active: int = state["activeSlot"]
	var quick: Array = state["quickSlots"]
	var bag: Array = state["bag"]
	for i: int in SLOTS:
		var text := ""
		if i < Balance.TOOL_ORDER.size():
			var tool: String = Balance.TOOL_ORDER[i]
			text = "%d %s" % [i + 1, HudLabels.display_name(tool)]
			if tool == "can":
				var charges: int = state["canCharges"]
				text += "\n%d/%d" % [charges, Balance.CAN_CHARGES]
		else:
			var pinned: Variant = quick[i - Balance.TOOL_ORDER.size()]
			var stack: Variant = null
			if pinned != null:
				var bag_index: int = pinned
				if bag_index >= 0 and bag_index < bag.size():
					stack = bag[bag_index]
			if stack == null:
				text = "%d Empty" % (i + 1)
			else:
				var cell: Dictionary = stack
				var id: String = cell["id"]
				var qty: int = cell["qty"]
				text = "%d %s\nx%d" % [i + 1, HudLabels.display_name(id), qty]
		if _labels[i].text != text:
			_labels[i].text = text
		var on := i == active
		if on != _active[i]:
			_active[i] = on
			_panels[i].add_theme_stylebox_override("panel", _highlight if on else _normal)
