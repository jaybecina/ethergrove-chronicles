class_name Grid
extends RefCounted
## Tile grid rules, ported from packages/core/src/grid.ts. A grid is {width, height, tiles}; a tile is a
## Dictionary with TypeScript's keys. `RangeError` throws become `push_error` plus a safe return.

const BLOCKED: Array[String] = ["rock", "stump", "water", "building", "fence", "wall", "feature"]

const FACING_DELTA: Dictionary = {
	"n": Vector2i(0, -1),
	"s": Vector2i(0, 1),
	"e": Vector2i(1, 0),
	"w": Vector2i(-1, 0),
}


static func _empty() -> Dictionary:
	return {"width": 0, "height": 0, "tiles": []}


## Builds a grid from layout rows. Ragged rows or unknown characters push an error and return an empty grid.
static func parse_layout(rows: Array, legend: Dictionary) -> Dictionary:
	var width := 0
	if not rows.is_empty():
		var first: String = rows[0]
		width = first.length()
	var tiles: Array = []
	for row_value: Variant in rows:
		var row: String = row_value
		if row.length() != width:
			push_error("Layout rows must have equal length")
			return _empty()
		for i: int in row.length():
			var ch := row[i]
			if not legend.has(ch):
				push_error("Unknown layout character \"%s\"" % ch)
				return _empty()
			var tile: Dictionary = legend[ch]
			tiles.append(tile.duplicate(true))
	return {"width": width, "height": rows.size(), "tiles": tiles}


static func _in_bounds(grid: Dictionary, x: int, y: int) -> bool:
	var width: int = grid["width"]
	var height: int = grid["height"]
	return x >= 0 and y >= 0 and x < width and y < height


## The tile at (x, y), or null out of bounds.
static func tile_at(grid: Dictionary, x: int, y: int) -> Variant:
	if not _in_bounds(grid, x, y):
		return null
	var tiles: Array = grid["tiles"]
	var width: int = grid["width"]
	return tiles[y * width + x]


## A new grid with the tile replaced. Out of bounds pushes an error and returns the grid unchanged.
static func set_tile(grid: Dictionary, x: int, y: int, tile: Dictionary) -> Dictionary:
	if not _in_bounds(grid, x, y):
		push_error("Tile %d,%d is out of bounds" % [x, y])
		return grid
	var next := grid.duplicate(true)
	var tiles: Array = next["tiles"]
	var width: int = next["width"]
	tiles[y * width + x] = tile.duplicate(true)
	return next


static func is_blocked(tile: Variant) -> bool:
	if tile == null:
		return true
	var t: Dictionary = tile
	var kind: String = t["kind"]
	return BLOCKED.has(kind)


## The tile holding `feature`. Missing pushes an error and returns (-1, -1).
static func find_feature(grid: Dictionary, feature: String) -> Vector2i:
	var tiles: Array = grid["tiles"]
	var width: int = grid["width"]
	for i: int in tiles.size():
		var t: Dictionary = tiles[i]
		if t.get("feature", "") == feature:
			return Vector2i(i % width, i / width)
	push_error("Feature %s not found" % feature)
	return Vector2i(-1, -1)


## The first position of `ch` in the layout rows. Missing pushes an error and returns (-1, -1).
static func find_char(rows: Array, ch: String) -> Vector2i:
	for y: int in rows.size():
		var row: String = rows[y]
		var x := row.find(ch)
		if x >= 0:
			return Vector2i(x, y)
	push_error("Character %s not found" % ch)
	return Vector2i(-1, -1)


## The tile the player faces (TypeScript `targetTile`; lives here so crops, tools and interact share it).
static func target_tile(player: Dictionary) -> Vector2i:
	var facing: String = player["facing"]
	var delta: Vector2i = FACING_DELTA[facing]
	var px: float = player["x"]
	var pz: float = player["z"]
	return Vector2i(floori(px), floori(pz)) + delta
