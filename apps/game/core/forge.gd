class_name Forge
extends RefCounted
## Hilda's forge (M1 spec 7.5): smelt copper bars and craft gear. Pure: every call returns {ok, state, reason}.

const SMELT := {"copperOre": 5, "gold": 25}
const RECIPES := {
	"copperSword": {"copperBar": 3, "gold": 100},
	"woodBuckler": {"wood": 5, "gold": 50},
	"copperHelm": {"copperBar": 2, "gold": 60},
	"copperMail": {"copperBar": 4, "gold": 120},
	"copperBoots": {"copperBar": 2, "gold": 60},
}


static func smelt(state: Dictionary) -> Dictionary:
	var r := _make(state, SMELT, "copperBar")
	return r


static func craft(state: Dictionary, gear_id: String) -> Dictionary:
	if not RECIPES.has(gear_id):
		return {"ok": false, "state": state, "reason": "unknown"}
	var cost: Dictionary = RECIPES[gear_id]
	return _make(state, cost, gear_id)


static func _make(state: Dictionary, cost: Dictionary, result_id: String) -> Dictionary:
	var gold: int = state["gold"]
	var need_gold: int = cost.get("gold", 0)
	var bag: Array = state["bag"]
	for id: String in cost.keys():
		if id == "gold":
			continue
		var need: int = cost[id]
		if Bag.count_of(bag, id) < need:
			return {"ok": false, "state": state, "reason": "missing"}
	if gold < need_gold:
		return {"ok": false, "state": state, "reason": "gold"}
	var next_bag := bag
	for id: String in cost.keys():
		if id == "gold":
			continue
		var need: int = cost[id]
		var removed: Variant = Bag.remove_item(next_bag, id, need)
		next_bag = removed
	var added := Bag.add_item(next_bag, result_id, 1)
	var overflow: int = added["overflow"]
	if overflow > 0:
		return {"ok": false, "state": state, "reason": "full"}
	var next := state.duplicate(true)
	next["bag"] = added["bag"]
	next["gold"] = gold - need_gold
	return {"ok": true, "state": next, "reason": ""}
