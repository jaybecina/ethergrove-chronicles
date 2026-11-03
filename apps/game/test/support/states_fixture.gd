class_name TestStates
extends RefCounted
## Hand-built GameState fixtures for core unit tests (the GDScript twin of packages/core/test/helpers.ts).
## `fresh` calls NewGame.create with the same arguments as helpers.ts, so the two cannot drift.


static func fresh(seed_value: int = 1) -> Dictionary:
	return NewGame.create({"seed": seed_value, "farmName": "Elm", "playerName": "Ari"})


static func empty_bag() -> Array:
	var bag: Array = []
	for i: int in Balance.BAG_SLOTS:
		bag.append(null)
	return bag


static func full_bag() -> Array:
	var bag: Array = []
	for i: int in Balance.BAG_SLOTS:
		bag.append({"id": "stone", "qty": 99})
	return bag


## Replaces the bag: `cells` fill from slot 0, the rest stay empty.
static func with_bag(state: Dictionary, cells: Array) -> Dictionary:
	var out := state.duplicate(true)
	var bag := empty_bag()
	for i: int in cells.size():
		bag[i] = cells[i]
	out["bag"] = bag
	return out


## Turns weed, rock and stump tiles of the farm into grass.
static func blank_farm(state: Dictionary) -> Dictionary:
	var out := state.duplicate(true)
	var maps: Dictionary = out["maps"]
	var farm: Dictionary = maps["farm"]
	var tiles: Array = farm["tiles"]
	for i: int in tiles.size():
		var t: Dictionary = tiles[i]
		var kind: String = t["kind"]
		if kind == "weed" or kind == "rock" or kind == "stump":
			tiles[i] = {"kind": "grass"}
	return out


static func with_tile(state: Dictionary, x: int, y: int, tile: Dictionary) -> Dictionary:
	var out := state.duplicate(true)
	var player: Dictionary = out["player"]
	var maps: Dictionary = out["maps"]
	var loc: String = player["location"]
	var grid: Dictionary = maps[loc]
	maps[loc] = Grid.set_tile(grid, x, y, tile)
	return out


## Stands on tile (x, y) facing the given direction.
static func stand_at(state: Dictionary, x: int, y: int, facing: String) -> Dictionary:
	var out := state.duplicate(true)
	var player: Dictionary = out["player"]
	player["x"] = x + 0.5
	player["z"] = y + 0.5
	player["facing"] = facing
	return out


static func tile_of(state: Dictionary, x: int, y: int) -> Variant:
	var maps: Dictionary = state["maps"]
	var player: Dictionary = state["player"]
	var loc: String = player["location"]
	var grid: Dictionary = maps[loc]
	return Grid.tile_at(grid, x, y)


static func at_calendar(state: Dictionary, minute: int, season: String = "spring", weather: String = "sunny") -> Dictionary:
	var out := state.duplicate(true)
	var cal: Dictionary = out["calendar"]
	cal["minute"] = minute
	cal["season"] = season
	var w: Dictionary = out["weather"]
	w["today"] = weather
	return out


## Puts the save on a given lesson (lessons on).
static func lesson_at(state: Dictionary, id: String, count: int = 0) -> Dictionary:
	var out := state.duplicate(true)
	var tutorial: Dictionary = out["tutorial"]
	tutorial["lesson"] = id
	tutorial["count"] = count
	return out
