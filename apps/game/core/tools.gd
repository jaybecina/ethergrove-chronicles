class_name Tools
extends RefCounted
## Tool rules, ported from packages/core/src/systems/tools.ts.


## TypeScript's spendStamina. The events keep their version 2 names (`staminaLow`, `exhausted`).
static func spend_energy(state: Dictionary, cost: int) -> Dictionary:
	var player: Dictionary = state["player"]
	var before: int = player["energy"]
	var energy := maxi(0, before - cost)
	var events: Array = []
	if before > Balance.STAMINA_LOW_AT and energy <= Balance.STAMINA_LOW_AT:
		events.append({"type": "staminaLow"})
	if before > 0 and energy == 0:
		events.append({"type": "exhausted"})
	var out := state.duplicate(true)
	var out_player: Dictionary = out["player"]
	out_player["energy"] = energy
	return GameStateUtil.result(out, events)


## What a tool does to a tile, or {} for a miss. Keys: tile, and optionally drop {item, qty}, events, charges.
static func _effect_of(tool: String, tile: Dictionary, x: int, y: int, state: Dictionary) -> Dictionary:
	var kind: String = tile["kind"]
	var prior: int = tile.get("hits", 0)
	var hits := prior + 1
	match tool:
		"hoe":
			if kind == "grass":
				return {"tile": {"kind": "tilled", "watered": false}, "events": [{"type": "tileTilled", "x": x, "y": y}]}
		"can":
			if kind == "tilled":
				var wet := tile.duplicate(true)
				wet["watered"] = true
				var charges: int = state["canCharges"]
				return {"tile": wet, "charges": charges - 1, "events": [{"type": "cropWatered", "x": x, "y": y}]}
		"sickle":
			if kind == "weed":
				return {"tile": {"kind": "grass"}, "drop": {"item": "fiber", "qty": 1}}
		"axe":
			if kind == "stump":
				if hits >= Balance.AXE_HITS:
					return {"tile": {"kind": "grass"}, "drop": {"item": "wood", "qty": 4}}
				var chopped := tile.duplicate(true)
				chopped["hits"] = hits
				return {"tile": chopped}
		"hammer":
			if kind == "tilled" and not tile.has("crop"):
				return {"tile": {"kind": "grass"}}
			if kind == "rock":
				if hits >= Balance.HAMMER_HITS:
					return {"tile": {"kind": "grass"}, "drop": {"item": "stone", "qty": 2}}
				var cracked := tile.duplicate(true)
				cracked["hits"] = hits
				return {"tile": cracked}
	return {}


static func _crop(tile: Dictionary) -> Dictionary:
	var crop: Dictionary = tile["crop"]
	return crop


static func use_tool(state: Dictionary) -> Dictionary:
	var tool := Bag.active_tool(state)
	if tool == "":
		return GameStateUtil.result(state)
	var player: Dictionary = state["player"]
	var energy: int = player["energy"]
	if energy <= 0:
		return GameStateUtil.fail(state, "noStamina")
	var target := Grid.target_tile(player)
	var x := target.x
	var y := target.y
	var tile_v: Variant = Grid.tile_at(GameStateUtil.current_grid(state), x, y)
	var tile: Dictionary = {}
	if tile_v != null:
		tile = tile_v
	var kind: String = tile.get("kind", "")
	var cost: int = Balance.TOOL_COST[tool]

	if tool == "can" and kind == "water":
		var out := state.duplicate(true)
		out["canCharges"] = Balance.CAN_CHARGES
		return GameStateUtil.result(out, [{"type": "toolUsed", "tool": tool, "x": x, "y": y, "hit": true}, {"type": "canRefilled"}])
	var held_charges: int = state["canCharges"]
	if tool == "can" and held_charges <= 0:
		return GameStateUtil.fail(state, "canEmpty")

	if tool == "sickle" and tile.has("crop") and Crops.is_mature(_crop(tile)):
		var harvest := Crops.harvest_at(state, x, y)
		var harvest_events: Array = harvest["events"]
		var first: Dictionary = harvest_events[0]
		if first["type"] != "cropHarvested":
			return harvest
		var harvest_state: Dictionary = harvest["state"]
		var spent := spend_energy(harvest_state, cost)
		var events: Array = [{"type": "toolUsed", "tool": tool, "x": x, "y": y, "hit": true}]
		events.append_array(harvest_events)
		var spent_events: Array = spent["events"]
		var spent_state: Dictionary = spent["state"]
		events.append_array(spent_events)
		return GameStateUtil.result(spent_state, events)

	var effect: Dictionary = {}
	if tile_v != null:
		effect = _effect_of(tool, tile, x, y, state)
	if effect.is_empty():
		var miss: Dictionary = {"type": "toolUsed", "tool": tool, "x": x, "y": y, "hit": false}
		if not Balance.MISS_COSTS_STAMINA:
			return GameStateUtil.result(state, [miss])
		var missed := spend_energy(state, cost)
		var miss_events: Array = [miss]
		var missed_events: Array = missed["events"]
		var missed_state: Dictionary = missed["state"]
		miss_events.append_array(missed_events)
		return GameStateUtil.result(missed_state, miss_events)

	var effect_tile: Dictionary = effect["tile"]
	var next := GameStateUtil.with_grid(state, Grid.set_tile(GameStateUtil.current_grid(state), x, y, effect_tile))
	var used: Array = [{"type": "toolUsed", "tool": tool, "x": x, "y": y, "hit": true}]
	if effect.has("events"):
		var effect_events: Array = effect["events"]
		used.append_array(effect_events)
	if effect.has("drop"):
		var drop: Dictionary = effect["drop"]
		var drop_item: String = drop["item"]
		var drop_qty: int = drop["qty"]
		var bag_in: Array = state["bag"]
		var added := Bag.add_item(bag_in, drop_item, drop_qty)
		var overflow: int = added["overflow"]
		if overflow > 0:
			return GameStateUtil.fail(state, "bagFull")
		next["bag"] = added["bag"]
		used.append({"type": "tileCleared", "x": x, "y": y})
		used.append({"type": "itemGained", "item": drop_item, "qty": drop_qty})
	if effect.has("charges"):
		next["canCharges"] = effect["charges"]
	var done := spend_energy(next, cost)
	var done_events: Array = done["events"]
	var done_state: Dictionary = done["state"]
	used.append_array(done_events)
	return GameStateUtil.result(done_state, used)
