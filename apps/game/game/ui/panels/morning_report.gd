class_name MorningReport
extends ModalPanel
## "Yesterday's sales", from apps/web/src/ui/screens/MorningReport.tsx: one line per item sold ("Turnip × 2", its
## gold) and the total. Read-only; the report comes from the night's `shippingReport` event (`set_report`).

const TITLE := "Yesterday's sales"
const TOTAL := "Total"
const TOTAL_GOLD := "%s gold"
const START := "Start the day"


class Line:
	var root: HBoxContainer
	var item: Label
	var value: Label


## {items: Array of {id, qty}, total: int}; empty before the first report.
var report: Dictionary = {}
var _list: VBoxContainer
var _lines: Array[Line] = []
var _total: Label


func build() -> void:
	title_label.text = TITLE
	_list = VBoxContainer.new()
	body.add_child(_list)
	var total_row := ModalPanel.make_row()
	var total_name := ModalPanel.make_label(TOTAL)
	total_name.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	total_name.add_theme_color_override("font_color", ThemeFactory.ACCENT_BRIGHT)
	_total = ModalPanel.make_label()
	_total.add_theme_color_override("font_color", ThemeFactory.ACCENT_BRIGHT)
	total_row.add_child(total_name)
	total_row.add_child(_total)
	body.add_child(total_row)
	var start := ModalPanel.make_button(START)
	start.pressed.connect(func() -> void: host.close())
	body.add_child(start)


## Keeps a copy of a `shippingReport` event's items and total.
func set_report(event: Dictionary) -> void:
	var total: int = event.get("total", 0)
	report = {"items": a(event.get("items", [])).duplicate(true), "total": total}


func refresh() -> void:
	var items: Array = report.get("items", [])
	for i: int in items.size():
		var s: Dictionary = items[i]
		var id: String = s["id"]
		var qty: int = s["qty"]
		var unit := 0
		var price: Variant = Economy.sell_price(id)
		if price != null:
			unit = price
		var line := _line(i)
		line.item.text = "%s × %d" % [HudLabels.display_name(id), qty]
		line.value.text = HudLabels.format_int(unit * qty)
		line.root.visible = true
	for i: int in range(items.size(), _lines.size()):
		_lines[i].root.visible = false
	var total: int = report.get("total", 0)
	_total.text = TOTAL_GOLD % HudLabels.format_int(total)


func _line(index: int) -> Line:
	while _lines.size() <= index:
		var line := Line.new()
		line.root = ModalPanel.make_row()
		line.item = ModalPanel.make_label()
		line.item.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		line.value = ModalPanel.make_label()
		line.root.add_child(line.item)
		line.root.add_child(line.value)
		_list.add_child(line.root)
		_lines.append(line)
	return _lines[index]


static func a(v: Variant) -> Array:
	var out: Array = v
	return out
