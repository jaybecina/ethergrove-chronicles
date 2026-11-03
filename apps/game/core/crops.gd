class_name Crops
extends RefCounted
## Crop rules, ported from packages/core/src/systems/crops.ts. A crop is {id, age, regrowing}; a tile's `crop`
## key is absent when it holds none.


static func is_mature(crop: Dictionary) -> bool:
	var def: Dictionary = CropData.CROPS[crop["id"]]
	var age: int = crop["age"]
	var days: int = def["days"]
	return age >= days


## One of "seed", "sprout", "young", "mature".
static func crop_stage(crop: Dictionary) -> String:
	var def: Dictionary = CropData.CROPS[crop["id"]]
	var days: int = def["days"]
	var age: int = crop["age"]
	if is_mature(crop):
		return "mature"
	if crop["regrowing"]:
		return "young"
	if age == 0:
		return "seed"
	return "sprout" if float(age) < float(days) / 3.0 else "young"


static func plant_at(state: Dictionary, x: int, y: int, seed_id: String) -> Dictionary:
	var tile_v: Variant = Grid.tile_at(GameStateUtil.current_grid(state), x, y)
	var crop := ItemData.crop_of_seed(seed_id)
	if crop == "" or tile_v == null:
		return GameStateUtil.fail(state, "noTarget")
	var tile: Dictionary = tile_v
	if tile["kind"] != "tilled" or tile.has("crop"):
		return GameStateUtil.fail(state, "noTarget")
	var def: Dictionary = CropData.CROPS[crop]
	var calendar: Dictionary = state["calendar"]
	if def["season"] != calendar["season"]:
		return GameStateUtil.fail(state, "wrongSeason")
	var planted := tile.duplicate(true)
	planted["crop"] = {"id": crop, "age": 0, "regrowing": false}
	var grid := Grid.set_tile(GameStateUtil.current_grid(state), x, y, planted)
	return GameStateUtil.result(
		GameStateUtil.with_grid(state, grid),
		[{"type": "cropPlanted", "x": x, "y": y, "crop": crop}]
	)


static func harvest_at(state: Dictionary, x: int, y: int) -> Dictionary:
	var tile_v: Variant = Grid.tile_at(GameStateUtil.current_grid(state), x, y)
	if tile_v == null:
		return GameStateUtil.fail(state, "noTarget")
	var tile: Dictionary = tile_v
	if not tile.has("crop"):
		return GameStateUtil.fail(state, "noTarget")
	var crop: Dictionary = tile["crop"]
	if not is_mature(crop):
		return GameStateUtil.fail(state, "noTarget")
	var crop_id: String = crop["id"]
	var bag_in: Array = state["bag"]
	var added := Bag.add_item(bag_in, crop_id, 1)
	var overflow: int = added["overflow"]
	if overflow > 0:
		return GameStateUtil.fail(state, "bagFull")
	var def: Dictionary = CropData.CROPS[crop_id]
	var next := tile.duplicate(true)
	if def["regrow"] == null:
		next.erase("crop")
	else:
		var days: int = def["days"]
		var regrow: int = def["regrow"]
		next["crop"] = {"id": crop_id, "age": days - regrow, "regrowing": true}
	var out := GameStateUtil.with_grid(state, Grid.set_tile(GameStateUtil.current_grid(state), x, y, next))
	out["bag"] = added["bag"]
	var harvested: Dictionary = out["harvested"]
	var seen: int = harvested.get(crop_id, 0)
	harvested[crop_id] = seen + 1
	return GameStateUtil.result(out, [
		{"type": "cropHarvested", "x": x, "y": y, "crop": crop_id},
		{"type": "itemGained", "item": crop_id, "qty": 1},
	])


## One overnight growth pass: watered crops age a day. Returns {grid, events}.
static func grow_crops(grid: Dictionary) -> Dictionary:
	var events: Array = []
	var next := grid.duplicate(true)
	var tiles: Array = next["tiles"]
	var width: int = next["width"]
	for i: int in tiles.size():
		var t: Dictionary = tiles[i]
		if not t.has("crop") or not t.get("watered", false):
			continue
		var before: Dictionary = t["crop"]
		var crop := before.duplicate(true)
		var age: int = before["age"]
		crop["age"] = age + 1
		if crop_stage(crop) != crop_stage(before):
			events.append({"type": "cropGrew", "x": i % width, "y": floori(float(i) / float(width)), "crop": crop["id"]})
		t["crop"] = crop
	return {"grid": next, "events": events}


## Crops of another season die, leaving the soil. Returns {grid, events}.
static func kill_out_of_season(grid: Dictionary, season: String) -> Dictionary:
	var events: Array = []
	var next := grid.duplicate(true)
	var tiles: Array = next["tiles"]
	var width: int = next["width"]
	for i: int in tiles.size():
		var t: Dictionary = tiles[i]
		if not t.has("crop"):
			continue
		var crop: Dictionary = t["crop"]
		var def: Dictionary = CropData.CROPS[crop["id"]]
		if def["season"] == season:
			continue
		events.append({"type": "cropDied", "x": i % width, "y": floori(float(i) / float(width)), "crop": crop["id"]})
		t.erase("crop")
	return {"grid": next, "events": events}


## Uses the pinned quick-slot item: plants a seed on the faced tile or eats food.
static func use_item(state: Dictionary) -> Dictionary:
	var q := Bag.quick_item(state)
	if q.is_empty():
		return GameStateUtil.fail(state, "noItem")
	var stack: Dictionary = q["stack"]
	var bag_index: int = q["bagIndex"]
	var id: String = stack["id"]
	var bag_now: Array = state["bag"]
	if not ItemData.ITEMS.has(id):
		return GameStateUtil.fail(state, "noTarget")
	var def: Dictionary = ItemData.ITEMS[id]
	if def["kind"] == "seed":
		var player_in: Dictionary = state["player"]
		var target := Grid.target_tile(player_in)
		var planted := plant_at(state, target.x, target.y, id)
		var planted_events: Array = planted["events"]
		var first: Dictionary = planted_events[0]
		if first["type"] != "cropPlanted":
			return planted
		var out: Dictionary = planted["state"]
		out["bag"] = Bag.remove_at(bag_now, bag_index, 1)
		return planted
	if def["eat"] != null:
		var player: Dictionary = state["player"]
		var current: int = player["energy"]
		if current >= Balance.MAX_ENERGY:
			return GameStateUtil.fail(state, "notHungry")
		var eat: int = def["eat"]
		var energy := mini(Balance.MAX_ENERGY, current + eat)
		var out := state.duplicate(true)
		out["bag"] = Bag.remove_at(bag_now, bag_index, 1)
		var out_player: Dictionary = out["player"]
		out_player["energy"] = energy
		# The event keeps its version 2 field name, `stamina`.
		return GameStateUtil.result(out, [{"type": "itemEaten", "item": id, "stamina": energy - current}])
	return GameStateUtil.fail(state, "noTarget")
