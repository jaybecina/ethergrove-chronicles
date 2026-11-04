class_name CollisionBuilder
extends RefCounted
## Builds a zone's walls for the player: one StaticBody3D on collision layer 1 holding a 1 x 2 x 1 BoxShape3D per
## blocked tile (Grid.is_blocked), where each run of adjacent blocked tiles in a row merges into one wider box.
## Tile (x, y) spans world x..x+1 and z..y+1 (tiles are metres). Extra tiles (the Lowmere villagers, who are entities
## rather than blocked tiles) block too. Built once per zone, never per frame.

const WALL_LAYER := 1
const WALL_HEIGHT := 2.0


## The zone's walls. `extra_blocked` tiles are blocked as well (pass `extra_blocked_for(zone)`).
static func build(grid: Dictionary, extra_blocked: Array[Vector2i] = []) -> StaticBody3D:
	var body := StaticBody3D.new()
	body.name = "Walls"
	body.collision_layer = WALL_LAYER
	body.collision_mask = 0
	for run: Vector3i in _runs(grid, extra_blocked):
		var length := float(run.z)
		var box := BoxShape3D.new()
		box.size = Vector3(length, WALL_HEIGHT, 1.0)
		var cs := CollisionShape3D.new()
		cs.shape = box
		cs.position = Vector3(run.x + length / 2.0, WALL_HEIGHT / 2.0, run.y + 0.5)
		body.add_child(cs)
	return body


## How many boxes `build` makes for the grid.
static func count_boxes(grid: Dictionary, extra_blocked: Array[Vector2i] = []) -> int:
	return _runs(grid, extra_blocked).size()


## The tiles that block in `zone` although the grid does not mark them: the villagers' tiles in Lowmere.
static func extra_blocked_for(zone: String) -> Array[Vector2i]:
	var out: Array[Vector2i] = []
	if zone != "lowmere":
		return out
	for v: Dictionary in Villagers.ALL:
		var x: int = v["x"]
		var y: int = v["y"]
		out.append(Vector2i(x, y))
	return out


## Each run of blocked tiles in a row as (first x, row y, length).
static func _runs(grid: Dictionary, extra_blocked: Array[Vector2i]) -> Array[Vector3i]:
	var out: Array[Vector3i] = []
	var width: int = grid.get("width", 0)
	var height: int = grid.get("height", 0)
	for y: int in height:
		var start := -1
		for x: int in width + 1:
			var blocked := x < width and _blocked(grid, extra_blocked, x, y)
			if blocked and start < 0:
				start = x
			elif not blocked and start >= 0:
				out.append(Vector3i(start, y, x - start))
				start = -1
	return out


static func _blocked(grid: Dictionary, extra_blocked: Array[Vector2i], x: int, y: int) -> bool:
	return Grid.is_blocked(Grid.tile_at(grid, x, y)) or extra_blocked.has(Vector2i(x, y))
