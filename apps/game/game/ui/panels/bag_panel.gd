class_name BagPanel
extends ModalPanel
## The bag, from apps/web/src/ui/screens/BagPanel.tsx: pick a cell, then another to swap them (`moveBagItem`); pin
## the picked item to a quick slot, keys 6 to 8 (`assignQuickSlot`). The web shows it as the pause menu's Bag tab;
## here it is its own panel (key B, gamepad Y, or the pause menu's Bag button).

## The pause menu tab label (Pause.tsx TABS).
const TITLE := "Bag"
const HINT := "Choose an item, then another slot to move it. Pin items to keys 6 to 8 for quick use."
const PIN := "Pin to %d"
const EQUIP := "Equip"
const EAT := "Eat"
## The web's screen-reader text for an empty cell (1-based).
const EMPTY_CELL := "Empty bag slot %d"
const COLUMNS := 6
const QUICK_SLOTS := 3
## The first quick-slot key.
const FIRST_QUICK_KEY := 6

## One Button per bag cell, built once.
var cells: Array[Button] = []
## The picked cell, or -1.
var picked: int = -1
var pin_buttons: Array[Button] = []
## "Equip" for gear, "Eat" for a dish; hidden for anything else.
var use_button: Button
var _picked_row: HBoxContainer
var _picked_name: Label
var _grid: GridContainer


func build() -> void:
	title_label.text = TITLE
	body.add_child(ModalPanel.make_muted(HINT))
	_grid = GridContainer.new()
	_grid.columns = COLUMNS
	_grid.add_theme_constant_override("h_separation", 6)
	_grid.add_theme_constant_override("v_separation", 6)
	body.add_child(_grid)
	for i: int in Balance.BAG_SLOTS:
		var cell := ModalPanel.make_button("")
		cell.toggle_mode = true
		cell.clip_text = true
		cell.pressed.connect(_on_cell.bind(i))
		_grid.add_child(cell)
		cells.append(cell)
	_picked_row = ModalPanel.make_row()
	_picked_name = ModalPanel.make_label()
	_picked_row.add_child(_picked_name)
	use_button = ModalPanel.make_button("")
	use_button.pressed.connect(_on_use)
	_picked_row.add_child(use_button)
	for q: int in QUICK_SLOTS:
		var pin := ModalPanel.make_button(PIN % (q + FIRST_QUICK_KEY))
		pin.pressed.connect(_on_pin.bind(q))
		_picked_row.add_child(pin)
		pin_buttons.append(pin)
	body.add_child(_picked_row)
	var close := ModalPanel.make_button(ModalPanel.CLOSE)
	close.size_flags_horizontal = Control.SIZE_SHRINK_END
	close.pressed.connect(func() -> void: host.close())
	body.add_child(close)


func apply_scale(ui_scale: float) -> void:
	super(ui_scale)
	for cell: Button in cells:
		cell.custom_minimum_size = Vector2(120, 56) * ui_scale


func on_open() -> void:
	picked = -1


func refresh() -> void:
	var bag: Array = session.state["bag"]
	var quick: Array = session.state["quickSlots"]
	if picked >= 0 and bag[picked] == null:
		picked = -1
	for i: int in cells.size():
		var cell_button := cells[i]
		var pin := quick.find(i)
		var cell: Variant = bag[i]
		if cell == null:
			cell_button.text = ""
			cell_button.accessibility_name = EMPTY_CELL % (i + 1)
		else:
			var stack: Dictionary = cell
			var id: String = stack["id"]
			var item_name := HudLabels.display_name(id)
			var qty: int = stack["qty"]
			var text := "%s × %d" % [item_name, qty]
			var spoken := "%s, %d" % [item_name, qty]
			if pin >= 0:
				text += " (%d)" % (pin + FIRST_QUICK_KEY)
				spoken += ", key %d" % (pin + FIRST_QUICK_KEY)
			cell_button.text = text
			cell_button.accessibility_name = spoken
		cell_button.set_pressed_no_signal(picked == i)
	_picked_row.visible = picked >= 0
	if picked >= 0:
		var picked_stack: Dictionary = bag[picked]
		var picked_id: String = picked_stack["id"]
		_picked_name.text = HudLabels.display_name(picked_id)
		var kind: String = ItemData.def_of(picked_id)["kind"] if ItemData.has_item(picked_id) else ""
		use_button.visible = kind == "gear" or kind == "dish"
		use_button.text = EQUIP if kind == "gear" else EAT


func _on_cell(i: int) -> void:
	var bag: Array = session.state["bag"]
	if picked < 0:
		if bag[i] != null:
			picked = i
		content_changed.emit()
		return
	var from := picked
	picked = -1
	if from != i:
		session.dispatch({"type": "moveBagItem", "from": from, "to": i})
	content_changed.emit()


func _on_use() -> void:
	if picked < 0:
		return
	var bag: Array = session.state["bag"]
	var stack: Dictionary = bag[picked]
	var id: String = stack["id"]
	picked = -1
	var kind: String = ItemData.def_of(id)["kind"]
	session.dispatch({"type": "equip" if kind == "gear" else "eatDish", "itemId": id})
	content_changed.emit()


func _on_pin(q: int) -> void:
	if picked < 0:
		return
	var bag_index := picked
	picked = -1
	session.dispatch({"type": "assignQuickSlot", "slot": q, "bagIndex": bag_index})
	content_changed.emit()
