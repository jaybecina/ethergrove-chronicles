class_name Economy
extends RefCounted
## Shipping bin and merchant cart rules, ported from packages/core/src/systems/economy.ts.


## The sell price of an item, or null when it cannot be sold.
static func sell_price(id: String) -> Variant:
	if not ItemData.ITEMS.has(id):
		return null
	var def: Dictionary = ItemData.ITEMS[id]
	return def["sell"]


static func _stack_at(list: Array, index: int) -> Variant:
	if index < 0 or index >= list.size():
		return null
	return list[index]


static func ship_item(state: Dictionary, bag_index: int, qty: int) -> Dictionary:
	var bag: Array = state["bag"]
	var cell: Variant = _stack_at(bag, bag_index)
	if cell == null:
		return GameStateUtil.fail(state, "noItem")
	var stack: Dictionary = cell
	var held: int = stack["qty"]
	if qty < 1 or qty > held:
		return GameStateUtil.fail(state, "noItem")
	var id: String = stack["id"]
	if sell_price(id) == null:
		return GameStateUtil.fail(state, "notSellable")
	var out := state.duplicate(true)
	var bin: Array = out["bin"]
	var found := false
	for s_v: Variant in bin:
		var s: Dictionary = s_v
		if s["id"] == id:
			var have: int = s["qty"]
			s["qty"] = have + qty
			found = true
			break
	if not found:
		bin.append({"id": id, "qty": qty})
	out["bag"] = Bag.remove_at(bag, bag_index, qty)
	return GameStateUtil.result(out)


static func unship_item(state: Dictionary, bin_index: int, qty: int) -> Dictionary:
	var bin_in: Array = state["bin"]
	var cell: Variant = _stack_at(bin_in, bin_index)
	if cell == null:
		return GameStateUtil.fail(state, "noItem")
	var stack: Dictionary = cell
	var held: int = stack["qty"]
	if qty < 1 or qty > held:
		return GameStateUtil.fail(state, "noItem")
	var unship_id: String = stack["id"]
	var bag_in: Array = state["bag"]
	var added := Bag.add_item(bag_in, unship_id, qty)
	var overflow: int = added["overflow"]
	if overflow > 0:
		return GameStateUtil.fail(state, "bagFull")
	var out := state.duplicate(true)
	var bin: Array = out["bin"]
	if held == qty:
		bin.remove_at(bin_index)
	else:
		var left: Dictionary = bin[bin_index]
		left["qty"] = held - qty
	out["bag"] = added["bag"]
	return GameStateUtil.result(out)


## Moves the bin's worth into pendingGold. Returns {state, total, items}.
static func sell_bin(state: Dictionary) -> Dictionary:
	var total := 0
	var bin: Array = state["bin"]
	for s_v: Variant in bin:
		var s: Dictionary = s_v
		var sold_id: String = s["id"]
		var price: Variant = sell_price(sold_id)
		if price != null:
			var unit: int = price
			var qty: int = s["qty"]
			total += unit * qty
	var out := state.duplicate(true)
	out["bin"] = []
	var pending: int = state["pendingGold"]
	out["pendingGold"] = pending + total
	return {"state": out, "total": total, "items": bin.duplicate(true)}


static func is_cart_open(state: Dictionary) -> bool:
	var calendar: Dictionary = state["calendar"]
	var weather: Dictionary = state["weather"]
	var minute: int = calendar["minute"]
	return (
		calendar["season"] != "winter"
		and weather["today"] != "storm"
		and minute >= Balance.CART_OPEN
		and minute < Balance.CART_CLOSE
	)


## Seed ids the cart sells this season.
static func cart_stock(state: Dictionary) -> Array:
	var calendar: Dictionary = state["calendar"]
	var stock: Array = []
	for crop: String in CropData.CROP_IDS:
		var def: Dictionary = CropData.CROPS[crop]
		if def["season"] == calendar["season"]:
			stock.append(ItemData.seed_of(crop))
	return stock


static func buy_item(state: Dictionary, item_id: String, qty: int) -> Dictionary:
	if qty < 1:
		push_error("Bad quantity %d" % qty)
		return GameStateUtil.result(state)
	if not is_cart_open(state):
		return GameStateUtil.fail(state, "cartClosed")
	if not cart_stock(state).has(item_id):
		return GameStateUtil.fail(state, "wrongSeason")
	var crop := ItemData.crop_of_seed(item_id)
	if crop == "":
		return GameStateUtil.fail(state, "notEnoughGold")
	var def: Dictionary = CropData.CROPS[crop]
	var seed_cost: int = def["seedCost"]
	var cost := seed_cost * qty
	var held: int = state["gold"]
	if cost > held:
		return GameStateUtil.fail(state, "notEnoughGold")
	var bag_in: Array = state["bag"]
	var added := Bag.add_item(bag_in, item_id, qty)
	var overflow: int = added["overflow"]
	if overflow > 0:
		return GameStateUtil.fail(state, "bagFull")
	var gold := held - cost
	var out := state.duplicate(true)
	out["bag"] = added["bag"]
	out["gold"] = gold
	return GameStateUtil.result(out, [
		{"type": "goldChanged", "gold": gold, "delta": -cost},
		{"type": "itemGained", "item": item_id, "qty": qty},
	])
