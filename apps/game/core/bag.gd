class_name Bag
extends RefCounted
## Bag, hotbar and quick-slot rules, ported from packages/core/src/systems/bag.ts. A bag is an Array of
## stack Dictionaries ({id, qty}) or null. `RangeError` throws become `push_error` plus the input unchanged.


static func _check_index(bag: Array, i: Variant) -> bool:
	if typeof(i) != TYPE_INT:
		push_error("Bad bag index %s" % str(i))
		return false
	var index: int = i
	if index < 0 or index >= bag.size():
		push_error("Bad bag index %s" % str(i))
		return false
	return true


static func add_item(bag: Array, id: String, qty: int) -> Dictionary:
	var next := bag.duplicate(true)
	var left := qty
	for i: int in next.size():
		if left <= 0:
			break
		var cell: Variant = next[i]
		if cell == null:
			continue
		var stack: Dictionary = cell
		var held: int = stack["qty"]
		if stack["id"] != id or held >= Balance.STACK_MAX:
			continue
		var put := mini(left, Balance.STACK_MAX - held)
		next[i] = {"id": id, "qty": held + put}
		left -= put
	for i: int in next.size():
		if left <= 0:
			break
		if next[i] != null:
			continue
		var put := mini(left, Balance.STACK_MAX)
		next[i] = {"id": id, "qty": put}
		left -= put
	if left > 0:
		return {"bag": bag.duplicate(true), "added": 0, "overflow": qty}
	return {"bag": next, "added": qty, "overflow": 0}


static func remove_at(bag: Array, index: int, qty: int) -> Array:
	if not _check_index(bag, index):
		return bag.duplicate(true)
	var cell: Variant = bag[index]
	if cell == null:
		push_error("Cannot remove %d from slot %d" % [qty, index])
		return bag.duplicate(true)
	var stack: Dictionary = cell
	var held: int = stack["qty"]
	if qty > held:
		push_error("Cannot remove %d from slot %d" % [qty, index])
		return bag.duplicate(true)
	var next := bag.duplicate(true)
	next[index] = null if held == qty else {"id": stack["id"], "qty": held - qty}
	return next


static func count_of(bag: Array, id: String) -> int:
	var n := 0
	for cell: Variant in bag:
		if cell == null:
			continue
		var stack: Dictionary = cell
		if stack["id"] == id:
			var qty: int = stack["qty"]
			n += qty
	return n


## The pinned item of the selected quick slot as {bagIndex, stack}, or {} when none.
static func quick_item(state: Dictionary) -> Dictionary:
	var quick: Array = state["quickSlots"]
	var selected: int = state["selectedQuick"]
	var pinned: Variant = quick[selected]
	if pinned == null:
		return {}
	var bag_index: int = pinned
	var bag: Array = state["bag"]
	if bag_index < 0 or bag_index >= bag.size() or bag[bag_index] == null:
		return {}
	var stack: Dictionary = bag[bag_index]
	return {"bagIndex": bag_index, "stack": stack.duplicate(true)}


## The tool of the active hotbar slot, or "" for the quick slots 5 to 7.
static func active_tool(state: Dictionary) -> String:
	var slot: int = state["activeSlot"]
	if slot < 0 or slot >= Balance.TOOL_ORDER.size():
		return ""
	return Balance.TOOL_ORDER[slot]


static func select_hotbar(state: Dictionary, index: int) -> Dictionary:
	var out := state.duplicate(true)
	if index >= 5:
		out["selectedQuick"] = index - 5
	out["activeSlot"] = index
	return out


static func cycle_hotbar(state: Dictionary, dir: int) -> Dictionary:
	var slot: int = state["activeSlot"]
	return select_hotbar(state, posmod(slot + dir + 8, 8))


static func move_bag_item(state: Dictionary, from: int, to: int) -> Dictionary:
	var bag_in: Array = state["bag"]
	if not _check_index(bag_in, from) or not _check_index(bag_in, to):
		return state.duplicate(true)
	var out := state.duplicate(true)
	var bag: Array = out["bag"]
	var moved: Variant = bag[from]
	bag[from] = bag[to]
	bag[to] = moved
	var quick: Array = out["quickSlots"]
	for k: int in quick.size():
		var q: Variant = quick[k]
		if q == null:
			continue
		var qi: int = q
		if qi == from:
			quick[k] = to
		elif qi == to:
			quick[k] = from
	return out


## Pins quick slot `slot` to a bag cell, or clears it when `bag_index` is null.
static func assign_quick_slot(state: Dictionary, slot: int, bag_index: Variant) -> Dictionary:
	var bag: Array = state["bag"]
	if bag_index != null and not _check_index(bag, bag_index):
		return state.duplicate(true)
	var out := state.duplicate(true)
	var quick: Array = out["quickSlots"]
	quick[slot] = bag_index
	return out


## Unpins quick slots whose bag cell is now empty, so a pin never jumps to a different item.
static func prune_pins(state: Dictionary) -> Dictionary:
	var out := state.duplicate(true)
	var quick: Array = out["quickSlots"]
	var bag: Array = out["bag"]
	for k: int in quick.size():
		var q: Variant = quick[k]
		if q == null:
			continue
		var qi: int = q
		if qi < 0 or qi >= bag.size() or bag[qi] == null:
			quick[k] = null
	return out


## Removes `qty` of item `id` across stacks. Returns the new bag, or null when the bag holds fewer than `qty`.
static func remove_item(bag: Array, id: String, qty: int) -> Variant:
	if count_of(bag, id) < qty:
		return null
	var next := bag.duplicate(true)
	var left := qty
	for i: int in next.size():
		if left <= 0:
			break
		var cell: Variant = next[i]
		if cell == null:
			continue
		var stack: Dictionary = cell
		if stack["id"] != id:
			continue
		var held: int = stack["qty"]
		var take := mini(left, held)
		next[i] = null if take == held else {"id": id, "qty": held - take}
		left -= take
	return next
