class_name WoodsSpawns
extends RefCounted
## Night spawns in Lowmere Woods (M1 spec 6.4): packs of 2-3 Gloamed burrowers at levels 1-3, 20:00 to 05:00 (Gloam
## stage 1, ARPG 8.3). Pure and deterministic: the same `salt` (derived from the calendar day) gives the same packs.

## Where each pack gathers (draft); every spawn is then moved to the nearest free tile.
const ANCHORS: Array[Vector2] = [
	Vector2(35.5, 22.5), Vector2(55.5, 66.5), Vector2(78.5, 30.5), Vector2(96.5, 58.5), Vector2(64.5, 44.5),
]


static func is_night(minute: int) -> bool:
	return minute >= 1200 or minute < 300


## A number that changes every calendar day.
static func salt(cal: Dictionary) -> int:
	var year: int = cal["year"]
	var season: String = cal["season"]
	var day: int = cal["day"]
	return year * 112 + Calendar.SEASONS.find(season) * 28 + day


static func _hash(a: int, b: int) -> int:
	return ((a * 73856093) ^ (b * 19349663) ^ 0x5bd1e995) & 0x7FFFFFFF


## The packs for `salt_value`: an Array of packs, each an Array of {id, level, x, y}.
static func packs(salt_value: int) -> Array:
	var woods := Zones.grid("woods")
	var out: Array = []
	for i: int in ANCHORS.size():
		var anchor := ANCHORS[i]
		var h := _hash(salt_value, i + 1)
		var count := 2 + (h % 2)
		var pack: Array = []
		for j: int in count:
			var hj := _hash(h, j + 11)
			var level := 1 + (hj % 3)
			var angle := float(hj % 360) * PI / 180.0
			var wanted := anchor + Vector2(cos(angle), sin(angle)) * (1.0 + float(j))
			var spot := _free_near(woods, wanted)
			pack.append({"id": "burrower", "level": level, "x": spot.x, "y": spot.y})
		out.append(pack)
	return out


static func _free_near(grid: Dictionary, wanted: Vector2) -> Vector2:
	for radius: int in 8:
		for dx: int in range(-radius, radius + 1):
			for dy: int in range(-radius, radius + 1):
				var tx := floori(wanted.x) + dx
				var ty := floori(wanted.y) + dy
				if not Grid.is_blocked(Grid.tile_at(grid, tx, ty)):
					return Vector2(tx + 0.5, ty + 0.5)
	return wanted
