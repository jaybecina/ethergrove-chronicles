class_name Cooking
extends RefCounted
## Cooking at the house stove and food buffs (M1 spec 7.6; all drafts). One buff at a time; it lasts 6 in-game hours
## (`untilMinute` = the clock minute when eaten + 360, which may pass 1440) or until you sleep.

const BUFF_MINUTES := 360
const HEARTY_BONUS_HP := 20
const STEADY_DRAIN_MULT := 0.75
const QUICKSTEP_RATE_MULT := 1.2
const DISHES := {
	"turnipStew": {"ingredients": {"turnip": 2}, "hp": 40, "buff": "steady"},
	"potatoHash": {"ingredients": {"potato": 1, "turnip": 1}, "hp": 60, "buff": "hearty"},
	"strawberryTart": {"ingredients": {"strawberry": 3}, "hp": 30, "buff": "quickstep"},
}


## Cooks `dish_id`, spending its ingredients. Returns {ok, state, reason}.
static func cook(state: Dictionary, dish_id: String) -> Dictionary:
	if not DISHES.has(dish_id):
		return {"ok": false, "state": state, "reason": "unknown"}
	var dish: Dictionary = DISHES[dish_id]
	var needs: Dictionary = dish["ingredients"]
	var bag: Array = state["bag"]
	for id: String in needs.keys():
		var need: int = needs[id]
		if Bag.count_of(bag, id) < need:
			return {"ok": false, "state": state, "reason": "missing"}
	var next_bag := bag
	for id: String in needs.keys():
		var need: int = needs[id]
		var removed: Variant = Bag.remove_item(next_bag, id, need)
		next_bag = removed
	var added := Bag.add_item(next_bag, dish_id, 1)
	var overflow: int = added["overflow"]
	if overflow > 0:
		return {"ok": false, "state": state, "reason": "full"}
	var next := state.duplicate(true)
	next["bag"] = added["bag"]
	return {"ok": true, "state": next, "reason": ""}


## Active buff id, or "" when none or expired.
static func active_buff(state: Dictionary) -> String:
	var buff: Variant = state["buff"]
	if buff == null:
		return ""
	var b: Dictionary = buff
	var until: int = b["untilMinute"]
	var cal: Dictionary = state["calendar"]
	var minute: int = cal["minute"]
	if minute >= until:
		return ""
	var id: String = b["id"]
	return id


static func max_hp(state: Dictionary) -> int:
	var level: int = state["level"]
	var base := Progression.max_hp(level)
	return base + (HEARTY_BONUS_HP if active_buff(state) == "hearty" else 0)


static func block_drain_mult(state: Dictionary) -> float:
	return STEADY_DRAIN_MULT if active_buff(state) == "steady" else 1.0


static func stamina_rate_mult(state: Dictionary) -> float:
	return QUICKSTEP_RATE_MULT if active_buff(state) == "quickstep" else 1.0


## Eats one `dish_id` from the bag: heals (capped at max HP) and replaces the buff. Returns {ok, state, reason}.
static func eat(state: Dictionary, dish_id: String) -> Dictionary:
	if not DISHES.has(dish_id):
		return {"ok": false, "state": state, "reason": "unknown"}
	var bag: Array = state["bag"]
	var removed: Variant = Bag.remove_item(bag, dish_id, 1)
	if removed == null:
		return {"ok": false, "state": state, "reason": "missing"}
	var dish: Dictionary = DISHES[dish_id]
	var next := state.duplicate(true)
	next["bag"] = removed
	var buff_id: String = dish["buff"]
	var cal: Dictionary = next["calendar"]
	var minute: int = cal["minute"]
	next["buff"] = {"id": buff_id, "untilMinute": minute + BUFF_MINUTES}
	var heal: int = dish["hp"]
	var hp: int = next["hp"]
	next["hp"] = mini(max_hp(next), hp + heal)
	return {"ok": true, "state": next, "reason": ""}
