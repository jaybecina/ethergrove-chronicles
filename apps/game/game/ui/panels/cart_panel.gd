class_name CartPanel
extends ModalPanel
## Sol's cart, from apps/web/src/ui/screens/MerchantCart.tsx: the season's seeds (`Economy.cart_stock`) at
## `CropData.CROPS[crop].seedCost` each, a 1..99 quantity stepper per row and a Buy button (`buyItem`) that is disabled
## with the web's reason ("Not enough gold", "Your bag is full"). A closed cart (before 9 AM, from 5 PM, in winter or
## in a storm) shows Sol's closed line and no rows. The quantities live here, not in the rows, and reset on open and
## after a purchase.

const TITLE := "Sol's cart"
const OPEN_SPEECH := "Fresh seeds from over the hills. What are you planting today?"
const CLOSED_SPEECH := "I'm packing up for now. Come back between 9 AM and 5 PM."
const EACH := "%d gold each"
const RIPE := ", ripe in %d days"
const REGROWS := ", regrows every %d"
const FEWER := "−"
const MORE := "+"
const FEWER_LABEL := "One fewer %s"
const MORE_LABEL := "One more %s"
## The stepper group's aria-label.
const QUANTITY_LABEL := "Quantity of %s"
## The visible Buy text ("Buy for 60"); BUY_LABEL adds the web's screen-reader words.
const BUY := "Buy for %s"
const BUY_LABEL := "Buy %d %s for %s gold"
const NOT_ENOUGH_GOLD := "Not enough gold"
const BAG_FULL := "Your bag is full"
const YOU_HAVE := "You have %s gold."
const MAX_QTY := 99


class Row:
	var root: HBoxContainer
	var name_label: Label
	var info: Label
	var stepper: HBoxContainer
	var fewer: Button
	var qty_label: Label
	var more: Button
	var buy: Button
	var reason: Label
	var seed_id: String = ""


var _speech: Label
var _list: VBoxContainer
var _gold: Label
var _rows: Array[Row] = []
## Seed id -> chosen quantity.
var _qty: Dictionary[String, int] = {}


func build() -> void:
	title_label.text = TITLE
	_speech = ModalPanel.make_label("", true)
	_speech.add_theme_color_override("font_color", ThemeFactory.ACCENT_BRIGHT.lightened(0.3))
	body.add_child(_speech)
	_list = VBoxContainer.new()
	_list.add_theme_constant_override("separation", 8)
	body.add_child(_list)
	_gold = ModalPanel.make_muted("", false)
	body.add_child(_gold)
	var close := ModalPanel.make_button(ModalPanel.CLOSE)
	close.size_flags_horizontal = Control.SIZE_SHRINK_END
	close.pressed.connect(func() -> void: host.close())
	body.add_child(close)


func apply_scale(ui_scale: float) -> void:
	_ui_scale = ui_scale
	custom_minimum_size = Vector2(MIN_WIDTH * 1.5 * ui_scale, 0)


func on_open() -> void:
	_qty.clear()


func refresh() -> void:
	var state := session.state
	var open := Economy.is_cart_open(state)
	_speech.text = OPEN_SPEECH if open else CLOSED_SPEECH
	var gold: int = state["gold"]
	var bag: Array = state["bag"]
	var shown := 0
	if open:
		for seed_v: Variant in Economy.cart_stock(state):
			var seed_id: String = seed_v
			_fill(_row(shown), seed_id, gold, bag)
			shown += 1
	for i: int in range(shown, _rows.size()):
		_rows[i].root.visible = false
	_list.visible = shown > 0
	_gold.text = YOU_HAVE % HudLabels.format_int(gold)


func _fill(row: Row, seed_id: String, gold: int, bag: Array) -> void:
	row.seed_id = seed_id
	var crop := ItemData.crop_of_seed(seed_id)
	var def: Dictionary = CropData.CROPS[crop]
	var price: int = def["seedCost"]
	var days: int = def["days"]
	var qty: int = _qty.get(seed_id, 1)
	var total := price * qty
	var fits: bool = Bag.add_item(bag, seed_id, qty)["overflow"] == 0
	var reason := ""
	if total > gold:
		reason = NOT_ENOUGH_GOLD
	elif not fits:
		reason = BAG_FULL
	var item_name := HudLabels.display_name(seed_id)
	var info := (EACH % price) + (RIPE % days)
	var regrow: Variant = def["regrow"]
	if regrow != null:
		var every: int = regrow
		info += REGROWS % every
	row.name_label.text = item_name
	row.info.text = info
	row.stepper.accessibility_name = QUANTITY_LABEL % item_name
	row.fewer.accessibility_name = FEWER_LABEL % item_name
	row.more.accessibility_name = MORE_LABEL % item_name
	row.qty_label.text = str(qty)
	row.qty_label.custom_minimum_size = Vector2(36, 0) * _ui_scale
	var total_text := HudLabels.format_int(total)
	row.buy.text = BUY % total_text
	row.buy.accessibility_name = BUY_LABEL % [qty, item_name, total_text]
	row.buy.disabled = reason != ""
	row.reason.text = reason
	row.reason.visible = reason != ""
	row.root.visible = true


func _row(index: int) -> Row:
	while _rows.size() <= index:
		var row := Row.new()
		row.root = ModalPanel.make_row()
		row.name_label = ModalPanel.make_label()
		row.info = ModalPanel.make_muted("", false)
		var text := VBoxContainer.new()
		text.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		text.add_child(row.name_label)
		text.add_child(row.info)
		row.root.add_child(text)
		row.stepper = ModalPanel.make_row()
		row.fewer = ModalPanel.make_button(FEWER)
		row.qty_label = ModalPanel.make_label()
		row.qty_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		row.more = ModalPanel.make_button(MORE)
		row.fewer.pressed.connect(_step.bind(row, -1))
		row.more.pressed.connect(_step.bind(row, 1))
		row.stepper.add_child(row.fewer)
		row.stepper.add_child(row.qty_label)
		row.stepper.add_child(row.more)
		row.root.add_child(row.stepper)
		var buy_box := VBoxContainer.new()
		row.buy = ModalPanel.make_button("")
		row.buy.pressed.connect(_buy.bind(row))
		row.reason = ModalPanel.make_label()
		row.reason.add_theme_color_override("font_color", ThemeFactory.DANGER.lightened(0.45))
		buy_box.add_child(row.buy)
		buy_box.add_child(row.reason)
		row.root.add_child(buy_box)
		_list.add_child(row.root)
		_rows.append(row)
	return _rows[index]


func _step(row: Row, dir: int) -> void:
	var qty: int = _qty.get(row.seed_id, 1)
	_qty[row.seed_id] = clampi(qty + dir, 1, MAX_QTY)
	content_changed.emit()


func _buy(row: Row) -> void:
	var qty: int = _qty.get(row.seed_id, 1)
	_qty.erase(row.seed_id)
	session.dispatch({"type": "buyItem", "itemId": row.seed_id, "qty": qty})
	content_changed.emit()
