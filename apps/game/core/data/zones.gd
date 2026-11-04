class_name Zones
extends RefCounted
## Static zones that are not part of the saved state. Lowmere (spec M1 §3) is parsed once and cached.

## 24 x 16. `S` is a plain path tile that only marks the spawn; see LOWMERE_SPAWN.
const LOWMERE_LAYOUT: Array[String] = [
	"############N###########",
	"#___________S__________#",
	"#_HHHHH___HHHHH___HHHHH#",
	"#_HHHHH___HHHHH___HHHHH#",
	"#_HHFHH___HHCHH___HHWHH#",
	"#______________________#",
	"#______________________#",
	"#__.______B_______.____#",
	"#______________________E",
	"#______________________#",
	"#______________________#",
	"#......................#",
	"#......................#",
	"#......................#",
	"#......................#",
	"########################",
]

const LOWMERE_LEGEND: Dictionary = {
	"#": {"kind": "fence"},
	"_": {"kind": "path"},
	".": {"kind": "grass"},
	"H": {"kind": "building"},
	"S": {"kind": "path"},
	"N": {"kind": "feature", "feature": "toFarm"},
	"E": {"kind": "feature", "feature": "toWoods"},
	"F": {"kind": "feature", "feature": "forgeDoor"},
	"C": {"kind": "feature", "feature": "clinicDoor"},
	"W": {"kind": "feature", "feature": "cottageDoor"},
	"B": {"kind": "feature", "feature": "noticeBoard"},
}

## Where the player arrives in Lowmere (below the `toFarm` gate) and back on the farm (above `farmGate`).
const LOWMERE_SPAWN := Vector2(12.5, 1.5)
const FARM_GATE_ARRIVAL := Vector2(16.5, 22.5)

## Lowmere Woods (M1 spec 6.1): a hand-made forest, 120 x 90 m (draft), generated from a fixed hash so it is the same
## every time. The way back to Lowmere is the fence gap at (0, 45); obstacles never touch the spawn corridor.
const WOODS_WIDTH := 120
const WOODS_HEIGHT := 90
const WOODS_SPAWN := Vector2(1.5, 45.5)
## Where the player stands in Lowmere when coming back from the Woods (west of the east door).
const LOWMERE_FROM_WOODS := Vector2(22.5, 8.5)
## The old well (the way down to Mossdeep) and where you stand beside it, and the clear ground around it.
const WOODS_WELL := Vector2i(100, 45)
const WOODS_WELL_ARRIVAL := Vector2(99.5, 45.5)

## The clinic (Doc Aldous's room), where a fall ends: 10 x 7, wall ring, floor, one exit door in the south wall.
const CLINIC_LAYOUT: Array[String] = [
	"##########",
	"#________#",
	"#________#",
	"#________#",
	"#________#",
	"#________#",
	"####X#####",
]
const CLINIC_LEGEND: Dictionary = {
	"#": {"kind": "wall"},
	"_": {"kind": "floor"},
	"X": {"kind": "feature", "feature": "clinicExit"},
}
## Where you wake in the clinic, and where you stand in Lowmere after leaving (below the clinic door).
const CLINIC_SPAWN := Vector2(4.5, 3.5)
## Where you stand after walking in through the clinic door (just inside the exit, facing north).
const CLINIC_ENTRY := Vector2(4.5, 5.5)
const LOWMERE_FROM_CLINIC := Vector2(12.5, 5.5)

static var _lowmere: Dictionary = {}
static var _clinic: Dictionary = {}
static var _woods: Dictionary = {}


## The static grid of `zone`, parsed once. Callers must not mutate it. Other ids give {}.
static func grid(zone: String) -> Dictionary:
	if zone == "clinic":
		if _clinic.is_empty():
			_clinic = Grid.parse_layout(CLINIC_LAYOUT, CLINIC_LEGEND)
		return _clinic
	if zone == "woods":
		if _woods.is_empty():
			_woods = build_woods()
		return _woods
	if zone != "lowmere":
		return {}
	if _lowmere.is_empty():
		_lowmere = Grid.parse_layout(LOWMERE_LAYOUT, LOWMERE_LEGEND)
	return _lowmere


## Zones whose grid is fixed data, not saved state.
static func is_static(zone: String) -> bool:
	return zone == "lowmere" or zone == "woods" or zone == "clinic" or zone == "mossdeep"


## Indoor zones: a closer camera, fixed warm light, no weather.
static func is_interior(zone: String) -> bool:
	return zone == "house" or zone == "clinic" or zone == "mossdeep"


## Zones where you fight: Space dodges instead of using a tool, and enemies live there.
static func is_combat(zone: String) -> bool:
	return zone == "woods" or zone == "mossdeep"


## A well-mixed byte for tile (x, y): a plain XOR of two products drew visible diagonal lines of stumps.
static func _scatter(x: int, y: int) -> int:
	var h := (x * 374761393 + y * 668265263) & 0xFFFFFFFF
	h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
	h = h ^ (h >> 16)
	return h & 0xFF


## The Woods grid, built from a fixed hash: a fence border, the gate at (0, 45), and about 4% stumps and 2% rocks
## outside the clear corridor around the spawn.
static func build_woods() -> Dictionary:
	var tiles: Array = []
	for y: int in WOODS_HEIGHT:
		for x: int in WOODS_WIDTH:
			var border := x == 0 or y == 0 or x == WOODS_WIDTH - 1 or y == WOODS_HEIGHT - 1
			if x == 0 and y == WOODS_HEIGHT / 2:
				tiles.append({"kind": "feature", "feature": "toLowmere"})
			elif border:
				tiles.append({"kind": "fence"})
			elif x == WOODS_WELL.x and y == WOODS_WELL.y:
				tiles.append({"kind": "feature", "feature": "well"})
			elif absi(x - WOODS_WELL.x) <= 2 and absi(y - WOODS_WELL.y) <= 2:
				tiles.append({"kind": "grass"})
			elif x < 9 and absi(y - WOODS_HEIGHT / 2) <= 4:
				tiles.append({"kind": "grass"})
			else:
				var h := _scatter(x, y)
				if h < 10:
					tiles.append({"kind": "stump", "hits": 0})
				elif h < 15:
					tiles.append({"kind": "rock", "hits": 0})
				else:
					tiles.append({"kind": "grass"})
	return {"width": WOODS_WIDTH, "height": WOODS_HEIGHT, "tiles": tiles}
