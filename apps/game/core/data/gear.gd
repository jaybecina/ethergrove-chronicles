class_name Gear
extends RefCounted
## Slice gear (M1 spec 7.5; all drafts) and what it does to the player's combat numbers. Gear never breaks.

const UNARMED_POWER := 4
const DEFS := {
	"practiceSword": {"slot": "weapon", "power": 10, "defence": 0, "shield": false},
	"copperSword": {"slot": "weapon", "power": 16, "defence": 0, "shield": false},
	"woodBuckler": {"slot": "offHand", "power": 0, "defence": 5, "shield": true},
	"copperHelm": {"slot": "head", "power": 0, "defence": 4, "shield": false},
	"copperMail": {"slot": "body", "power": 0, "defence": 8, "shield": false},
	"copperBoots": {"slot": "feet", "power": 0, "defence": 3, "shield": false},
}


static func def(id: String) -> Dictionary:
	var out: Dictionary = DEFS[id]
	return out


## Moves `id` from the bag into its slot; the previous occupant returns to the bag. Returns {ok, state, reason}.
static func equip(state: Dictionary, id: String) -> Dictionary:
	if not DEFS.has(id):
		return {"ok": false, "state": state, "reason": "notGear"}
	var bag: Array = state["bag"]
	var removed: Variant = Bag.remove_item(bag, id, 1)
	if removed == null:
		return {"ok": false, "state": state, "reason": "missing"}
	var next := state.duplicate(true)
	var slot: String = def(id)["slot"]
	var worn: Dictionary = next["gear"]
	var old: Variant = worn[slot]
	var new_bag: Array = removed
	if old != null:
		var old_id: String = old
		var added := Bag.add_item(new_bag, old_id, 1)
		var overflow: int = added["overflow"]
		if overflow > 0:
			return {"ok": false, "state": state, "reason": "full"}
		new_bag = added["bag"]
	worn[slot] = id
	next["bag"] = new_bag
	return {"ok": true, "state": next, "reason": ""}


## {power, defence, shield} from the equipped gear.
static func stats(state: Dictionary) -> Dictionary:
	var worn: Dictionary = state["gear"]
	var power := UNARMED_POWER
	var defence := 0
	var shield := false
	for slot: Variant in worn.keys():
		var id: Variant = worn[slot]
		if id == null:
			continue
		var gear_id: String = id
		var g := def(gear_id)
		var p: int = g["power"]
		if p > 0:
			power = p
		var df: int = g["defence"]
		defence += df
		var sh: bool = g["shield"]
		shield = shield or sh
	return {"power": power, "defence": defence, "shield": shield}
