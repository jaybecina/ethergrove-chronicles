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


static func interact(state: Dictionary) -> Dictionary:
	var player_in: Dictionary = state["player"]
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
	var target := Grid.target_tile(player)
	var tile_v: Variant = Grid.tile_at(GameStateUtil.current_grid(state), target.x, target.y)
	if _is_interactable(tile_v):
		return "interact"
	var q := Bag.quick_item(state)
	if q.is_empty():
		return ""
	var stack: Dictionary = q["stack"]
	var id: String = stack["id"]
	var def: Dictionary = ItemData.ITEMS[id]
	if def["kind"] == "seed":
		if tile_v != null:
			var tile: Dictionary = tile_v
			if tile["kind"] == "tilled" and not tile.has("crop"):
				return "useItem"
		return ""
	return "useItem" if def["eat"] != null else ""
