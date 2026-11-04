class_name Interact
extends RefCounted
## Interaction rules, ported from packages/core/src/systems/interact.ts.


static func _is_interactable(tile: Variant) -> bool:
	if tile == null:
		return false
	var t: Dictionary = tile
	if t.has("feature") or t["kind"] == "water":
		return true
	if t.has("crop"):
		var crop: Dictionary = t["crop"]
		return Crops.is_mature(crop)
	return false


static func _travel(state: Dictionary, location: String, at: Vector2, facing: String) -> Dictionary:
	var out := state.duplicate(true)
	var player: Dictionary = out["player"]
	player["location"] = location
	player["x"] = at.x
	player["z"] = at.y
	player["facing"] = facing
	return GameStateUtil.result(out, [{"type": "locationChanged", "location": location}])


## The villager standing on the tile the player faces, or {} (villagers exist in Lowmere only).
static func _villager_in_front(state: Dictionary) -> Dictionary:
	var player: Dictionary = state["player"]
	if player["location"] != "lowmere":
		return {}
	var target := Grid.target_tile(player)
	return Villagers.at(target.x, target.y)


## Talk to a villager: the first conversation adds the id to `talked` and says the first line.
static func _talk(state: Dictionary, villager: Dictionary) -> Dictionary:
	var id: String = villager["id"]
	var out := state.duplicate(true)
	var talked: Array = out["talked"]
	var text: String = villager["repeat"]
	if not talked.has(id):
		talked.append(id)
		text = villager["first"]
	var events: Array = [{"type": "talked", "villager": id, "name": villager["name"], "text": text}]
	if id == "hilda":
		var gift := Mossdeep.hilda_gift(out)
		out = gift["state"]
		var gift_events: Array = gift["events"]
		events.append_array(gift_events)
	return GameStateUtil.result(out, events)


static func interact(state: Dictionary) -> Dictionary:
	var player_in: Dictionary = state["player"]
	var villager := _villager_in_front(state)
	if not villager.is_empty():
		return _talk(state, villager)
	var target := Grid.target_tile(player_in)
	var x := target.x
	var y := target.y
	var tile_v: Variant = Grid.tile_at(GameStateUtil.current_grid(state), x, y)
	var tile: Dictionary = {}
	if tile_v != null:
		tile = tile_v
	var feature: String = tile.get("feature", "")
	match feature:
		"houseDoor":
			var spawn := Grid.find_char(Layouts.HOUSE_LAYOUT, Layouts.HOUSE_SPAWN_CHAR)
			var out := state.duplicate(true)
			var player: Dictionary = out["player"]
			player["location"] = "house"
			player["x"] = spawn.x + 0.5
			player["z"] = spawn.y + 0.5
			player["facing"] = "n"
			return GameStateUtil.result(out, [{"type": "locationChanged", "location": "house"}])
		"exitDoor":
			var maps: Dictionary = state["maps"]
			var farm: Dictionary = maps["farm"]
			var door := Grid.find_feature(farm, "houseDoor")
			var out := state.duplicate(true)
			var player: Dictionary = out["player"]
			player["location"] = "farm"
			player["x"] = door.x + 0.5
			player["z"] = door.y + 1.5
			player["facing"] = "s"
			return GameStateUtil.result(out, [{"type": "locationChanged", "location": "farm"}])
		"farmGate":
			return _travel(state, "lowmere", Zones.LOWMERE_SPAWN, "s")
		"toWoods":
			return _travel(state, "woods", Zones.WOODS_SPAWN, "e")
		"rootShrine":
			return Mossdeep.place_rootstone(state)
		"well":
			var deeps: Dictionary = state["deeps"]
			var m: Dictionary = deeps["mossdeep"]
			var checkpoints: Array = m["checkpoints"]
			var deeper := false
			for c: Variant in checkpoints:
				var floor_n: int = c
				if floor_n > 0:
					deeper = true
			if deeper and Mossdeep.is_open(state):
				return GameStateUtil.result(state, [{"type": "openUi", "ui": "well"}])
			return Mossdeep.enter(state, 0)
		"forgeDoor":
			return GameStateUtil.result(state, [{"type": "openUi", "ui": "forge"}])
		"stove":
			return GameStateUtil.result(state, [{"type": "openUi", "ui": "stove"}])
		"clinicDoor":
			return _travel(state, "clinic", Zones.CLINIC_ENTRY, "n")
		"lantern", "brokenBlade":
			return Mossdeep.pick_up(state, feature)
		"stairsDown":
			return Mossdeep.stairs_down(state)
		"stairsUp":
			return Mossdeep.stairs_up(state)
		"checkpointStone":
			return Mossdeep.touch_checkpoint(state)
		"copperNode":
			return Mossdeep.mine(state, x, y)
		"clinicExit":
			return _travel(state, "lowmere", Zones.LOWMERE_FROM_CLINIC, "s")
		"toLowmere":
			return _travel(state, "lowmere", Zones.LOWMERE_FROM_WOODS, "w")
		"toFarm":
			return _travel(state, "farm", Zones.FARM_GATE_ARRIVAL, "n")
		"bin":
			return GameStateUtil.result(state, [{"type": "openUi", "ui": "bin"}])
		"bed":
			return GameStateUtil.result(state, [{"type": "openUi", "ui": "sleep"}])
		"cart":
			if Economy.is_cart_open(state):
				return GameStateUtil.result(state, [{"type": "openUi", "ui": "cart"}])
			return GameStateUtil.fail(state, "cartClosed")
	if tile.has("crop"):
		var crop: Dictionary = tile["crop"]
		if Crops.is_mature(crop):
			return Crops.harvest_at(state, x, y)
	if tile.get("kind", "") == "water":
		var refilled := state.duplicate(true)
		refilled["canCharges"] = Balance.CAN_CHARGES
		return GameStateUtil.result(refilled, [{"type": "canRefilled"}])
	return GameStateUtil.fail(state, "noTarget")


## What the secondary button does right now (spec 5.3 order): "interact", "useItem" or "".
static func resolve_secondary(state: Dictionary) -> String:
	var player: Dictionary = state["player"]
	if not _villager_in_front(state).is_empty():
		return "interact"
	var target := Grid.target_tile(player)
	var tile_v: Variant = Grid.tile_at(GameStateUtil.current_grid(state), target.x, target.y)
	if _is_interactable(tile_v):
		return "interact"
	var q := Bag.quick_item(state)
	if q.is_empty():
		return ""
	var stack: Dictionary = q["stack"]
	var id: String = stack["id"]
	var def := ItemData.def_of(id)
	if def["kind"] == "seed":
		if tile_v != null:
			var tile: Dictionary = tile_v
			if tile["kind"] == "tilled" and not tile.has("crop"):
				return "useItem"
		return ""
	return "useItem" if def["eat"] != null else ""
