class_name PlayerPose
extends RefCounted
## Player pose rules, ported from packages/core/src/systems/movement.ts (facingOf and the speed choice) plus a
## push-out that keeps the player circle off blocked tiles after a teleport, load or zone change.

const FACINGS: Array[String] = ["n", "s", "e", "w"]


## A copy of `state` with the player moved to (x, z) and turned to `facing`. A bad facing pushes an error and
## returns the state unchanged.
static func with_pose(state: Dictionary, x: float, z: float, facing: String) -> Dictionary:
	if not FACINGS.has(facing):
		push_error("Unknown facing \"%s\"" % facing)
		return state.duplicate(true)
	var next := state.duplicate(true)
	var player: Dictionary = next["player"]
	player["x"] = x
	player["z"] = z
	player["facing"] = facing
	return next


## The facing for a movement vector: the dominant axis wins, ties go to east or west.
static func facing_of(dx: float, dz: float) -> String:
	if absf(dx) >= absf(dz):
		return "e" if dx > 0.0 else "w"
	return "s" if dz > 0.0 else "n"


## Ground speed in tiles per second. An exhausted player (energy <= 0) walks slowly whether or not run is held.
static func speed_for(state: Dictionary, run: bool) -> float:
	var player: Dictionary = state["player"]
	var energy: float = player["energy"]
	if energy <= 0.0:
		return Balance.WALK_SPEED * Balance.EXHAUSTED_SPEED_FACTOR
	return Balance.RUN_SPEED if run else Balance.WALK_SPEED


static func _tile_blocked(grid: Dictionary, tx: int, ty: int, extra_blocked: Array[Vector2i]) -> bool:
	return Grid.is_blocked(Grid.tile_at(grid, tx, ty)) or extra_blocked.has(Vector2i(tx, ty))


## True when the circle of the player radius at (x, z) overlaps any blocked tile (out of the grid is blocked).
static func _overlaps_blocked(grid: Dictionary, x: float, z: float, extra_blocked: Array[Vector2i]) -> bool:
	var r: float = Balance.PLAYER_RADIUS
	var x0 := floori(x - r)
	var x1 := floori(x + r)
	var y0 := floori(z - r)
	var y1 := floori(z + r)
	for ty: int in range(y0, y1 + 1):
		for tx: int in range(x0, x1 + 1):
			if not _tile_blocked(grid, tx, ty, extra_blocked):
				continue
			var nearest_x := clampf(x, float(tx), float(tx + 1))
			var nearest_z := clampf(z, float(ty), float(ty + 1))
			var ddx := x - nearest_x
			var ddz := z - nearest_z
			if ddx * ddx + ddz * ddz < r * r:
				return true
	return false


## (x, z) unchanged if the player circle is clear of blocked tiles. Otherwise the centre of the nearest free tile in
## the first ring (from the player's own tile outward) that has one; ties go to the smaller x, then the smaller z.
## Unchanged too if no free tile is within max(width, height) + 1 rings (all-blocked grid or far outside it).
## For teleport, load and zone change only, never per frame. The overlap test is a circle against 1x1 tile squares:
## it intentionally mirrors the game's capsule body (radius 0.3), not movement.ts spanOf (a square span).
## `extra_blocked` tiles count as blocked too (the Lowmere villagers, who are entities rather than grid tiles).
static func push_out_of_blocked(
	state: Dictionary, x: float, z: float, extra_blocked: Array[Vector2i] = []
) -> Vector2:
	var grid: Dictionary = GameStateUtil.current_grid(state)
	if not _overlaps_blocked(grid, x, z, extra_blocked):
		return Vector2(x, z)
	var cx := floori(x)
	var cy := floori(z)
	var width: int = grid["width"]
	var height: int = grid["height"]
	var max_ring := maxi(width, height) + 1
	for ring: int in range(0, max_ring + 1):
		var best := Vector2.ZERO
		var best_d := INF
		for tx: int in range(cx - ring, cx + ring + 1):
			for ty: int in range(cy - ring, cy + ring + 1):
				if maxi(absi(tx - cx), absi(ty - cy)) != ring or _tile_blocked(grid, tx, ty, extra_blocked):
					continue
				var centre := Vector2(tx + 0.5, ty + 0.5)
				var d := centre.distance_squared_to(Vector2(x, z))
				# Iteration is x (outer) then y (inner) ascending, so a strict < keeps the smaller x then y on ties.
				if d < best_d - 0.000001:
					best_d = d
					best = centre
		if best_d < INF:
			return best
	return Vector2(x, z)
