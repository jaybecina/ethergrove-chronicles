class_name BinPanel
extends ModalPanel
## The shipping bin, from apps/web/src/ui/screens/ShippingBin.tsx: the sellable bag stacks with "Ship 1" and
## "Ship all" (`shipItem` with 1 or the whole stack), the bin with "Take back" (`unshipItem`, the whole stack), and
## tonight's total. Rows come from pools that only grow (at most one row per bag cell and per item kind).

const TITLE := "Shipping bin"
const YOUR_BAG := "Your bag"
const NOTHING_TO_SELL := "Nothing to sell yet. Harvest crops or clear the field."
## "{name} × {qty}" (the same line in both columns).
const STACK := "%s × %d"
const EACH := "%d gold each"
const SHIP_ONE := "Ship 1"
const SHIP_ALL := "Ship all"
const SHIP_ONE_LABEL := "Ship one %s"
const SHIP_ALL_LABEL := "Ship all %s"
const IN_THE_BIN := "In the bin"
const BIN_EMPTY := "The bin is empty."
const TAKE_BACK := "Take back"
const TAKE_BACK_LABEL := "Take back %s"
const TOTAL := "Sells tonight for %s gold"


class BagRow:
	var root: HBoxContainer
	var name_label: Label
	var price: Label
	var ship_one: Button
	var ship_all: Button
	## The bag cell this row shows.
	var bag_index: int = -1
	var qty: int = 0


class BinRow:
	var root: HBoxContainer
	var name_label: Label
	var take_back: Button
	var qty: int = 0


var _bag_rows: Array[BagRow] = []
var _bin_rows: Array[BinRow] = []
var _bag_list: VBoxContainer
var _bin_list: VBoxContainer
var _nothing: Label
var _empty: Label
var _total: Label


func build() -> void:
	title_label.text = TITLE
	var columns := ModalPanel.make_row()
	columns.add_theme_constant_override("separation", 24)
	body.add_child(columns)

	var left := VBoxContainer.new()
	left.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	left.add_child(ModalPanel.make_label(YOUR_BAG))
	_nothing = ModalPanel.make_muted(NOTHING_TO_SELL)
	left.add_child(_nothing)
	_bag_list = VBoxContainer.new()
	left.add_child(_bag_list)
	columns.add_child(left)

	var right := VBoxContainer.new()
	right.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	right.add_child(ModalPanel.make_label(IN_THE_BIN))
	_empty = ModalPanel.make_muted(BIN_EMPTY)
	right.add_child(_empty)
	_bin_list = VBoxContainer.new()
	right.add_child(_bin_list)
	_total = ModalPanel.make_label()
	right.add_child(_total)
	columns.add_child(right)

	var close := ModalPanel.make_button(ModalPanel.CLOSE)
	close.size_flags_horizontal = Control.SIZE_SHRINK_END
	close.pressed.connect(func() -> void: host.close())
	body.add_child(close)


func apply_scale(ui_scale: float) -> void:
	_ui_scale = ui_scale
	custom_minimum_size = Vector2(MIN_WIDTH * 1.6 * ui_scale, 0)


func refresh() -> void:
	var bag: Array = session.state["bag"]
	var shown := 0
	for i: int in bag.size():
		var cell: Variant = bag[i]
		if cell == null:
			continue
		var stack: Dictionary = cell
		var id: String = stack["id"]
		var price: Variant = Economy.sell_price(id)
		if price == null:
			continue
		var row := _bag_row(shown)
		var item_name := HudLabels.display_name(id)
		var qty: int = stack["qty"]
		var unit: int = price
		row.bag_index = i
		row.qty = qty
		row.name_label.text = STACK % [item_name, qty]
		row.price.text = EACH % unit
		row.ship_one.accessibility_name = SHIP_ONE_LABEL % item_name
		row.ship_all.accessibility_name = SHIP_ALL_LABEL % item_name
		row.root.visible = true
		shown += 1
	for i: int in range(shown, _bag_rows.size()):
		_bag_rows[i].root.visible = false
	_nothing.visible = shown == 0

	var bin: Array = session.state["bin"]
	var total := 0
	for i: int in bin.size():
		var s: Dictionary = bin[i]
		var id: String = s["id"]
		var qty: int = s["qty"]
		var price: Variant = Economy.sell_price(id)
		if price != null:
			var unit: int = price
			total += unit * qty
		var row := _bin_row(i)
		var item_name := HudLabels.display_name(id)
		row.qty = qty
		row.name_label.text = STACK % [item_name, qty]
		row.take_back.accessibility_name = TAKE_BACK_LABEL % item_name
		row.root.visible = true
	for i: int in range(bin.size(), _bin_rows.size()):
		_bin_rows[i].root.visible = false
	_empty.visible = bin.is_empty()
	_total.text = TOTAL % HudLabels.format_int(total)


func _bag_row(index: int) -> BagRow:
	while _bag_rows.size() <= index:
		var row := BagRow.new()
		row.root = ModalPanel.make_row()
		row.name_label = ModalPanel.make_label()
		row.name_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.price = ModalPanel.make_muted("", false)
		row.ship_one = ModalPanel.make_button(SHIP_ONE)
		row.ship_all = ModalPanel.make_button(SHIP_ALL)
		row.ship_one.pressed.connect(_ship.bind(row, false))
		row.ship_all.pressed.connect(_ship.bind(row, true))
		var text := VBoxContainer.new()
		text.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		text.add_child(row.name_label)
		text.add_child(row.price)
		row.root.add_child(text)
		row.root.add_child(row.ship_one)
		row.root.add_child(row.ship_all)
		_bag_list.add_child(row.root)
		_bag_rows.append(row)
	return _bag_rows[index]


func _bin_row(index: int) -> BinRow:
	while _bin_rows.size() <= index:
		var row := BinRow.new()
		row.root = ModalPanel.make_row()
		row.name_label = ModalPanel.make_label()
		row.name_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.take_back = ModalPanel.make_button(TAKE_BACK)
		row.take_back.pressed.connect(_take_back.bind(_bin_rows.size()))
		row.root.add_child(row.name_label)
		row.root.add_child(row.take_back)
		_bin_list.add_child(row.root)
		_bin_rows.append(row)
	return _bin_rows[index]


func _ship(row: BagRow, all: bool) -> void:
	var qty := row.qty if all else 1
	session.dispatch({"type": "shipItem", "bagIndex": row.bag_index, "qty": qty})


func _take_back(bin_index: int) -> void:
	var row := _bin_rows[bin_index]
	session.dispatch({"type": "unshipItem", "binIndex": bin_index, "qty": row.qty})
