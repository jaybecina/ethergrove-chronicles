class_name FeatureVisuals
extends RefCounted
## Feature tiles, building masses and the pond, ported from apps/web/src/scene/Features.tsx (farmhouse, door,
## window, shipping bin, Sol's cart, pond) plus M1 features drawn from primitives in the palette: the farm gate and
## the Lowmere gates, the Root Shrine, the house stove, the Lowmere buildings with their coloured door lintels and
## the notice board. Every feature node is named `Feature_<id>` and sits on its tile centre (x + 0.5, 0, y + 0.5).

const WALL_HEIGHT := 2.2
const ROOF_HEIGHT := 1.5
const ROOF_OVERHANG := 0.3
const DOOR_Z := 0.47
const WINDOW_EMISSION_DAY := 0.15
const WINDOW_EMISSION_NIGHT := 3.0

## Door features that belong to a building block (its mass covers the door tile, like the web bounds()).
const BUILDING_DOORS: Array[String] = ["houseDoor", "forgeDoor", "clinicDoor", "cottageDoor"]
## Lowmere door lintels: forge red, clinic green, cottage yellow.
const LINTELS: Dictionary[String, Color] = {
	"forgeDoor": Color("#c2452d"),
	"clinicDoor": Color("#4f8a34"),
	"cottageDoor": Color("#e0b84a"),
}
const GATES: Array[String] = ["farmGate", "toFarm", "toWoods", "toLowmere", "clinicExit"]
const DARK_DOOR := Color("#4a3020")
const SHRINE_RUNE := Color("#7fe08a")
const STOVE_BODY := Color("#2f2a28")
const STOVE_GLOW := Color("#ff8a2a")

static var _materials: Dictionary[String, StandardMaterial3D] = {}


## A shared opaque material of `color` and `roughness` (never mutated after creation).
static func material(color: Color, roughness: float = 0.8) -> StandardMaterial3D:
	var key := "%s|%.3f" % [color.to_html(), roughness]
	var mat: StandardMaterial3D = _materials.get(key)
	if mat == null:
		mat = StandardMaterial3D.new()
		mat.albedo_color = color
		mat.roughness = roughness
		_materials[key] = mat
	return mat


## A fresh emissive material (owned by its node, so it may be changed later).
static func glow(color: Color, emission: Color, energy: float) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.emission_enabled = true
	mat.emission = emission
	mat.emission_energy_multiplier = energy
	return mat


static func box(node_name: String, size: Vector3, pos: Vector3, mat: Material) -> MeshInstance3D:
	var mesh := BoxMesh.new()
	mesh.size = size
	var mi := MeshInstance3D.new()
	mi.name = node_name
	mi.mesh = mesh
	mi.position = pos
	mi.material_override = mat
	return mi


static func cylinder(node_name: String, radius: float, height: float, pos: Vector3, mat: Material) -> MeshInstance3D:
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.height = height
	mesh.radial_segments = 12
	mesh.rings = 1
	var mi := MeshInstance3D.new()
	mi.name = node_name
	mi.mesh = mesh
	mi.position = pos
	mi.material_override = mat
	return mi


static func plane(node_name: String, size: Vector2, pos: Vector3, mat: Material) -> MeshInstance3D:
	var mesh := PlaneMesh.new()
	mesh.size = size
	var mi := MeshInstance3D.new()
	mi.name = node_name
	mi.mesh = mesh
	mi.position = pos
	mi.material_override = mat
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	return mi


## The visual of feature `id` on tile (x, y). Emissive materials that follow the night (the farmhouse window) are
## appended to `night`.
static func build_feature(id: String, x: int, y: int, grid: Dictionary, night: Array[StandardMaterial3D]) -> Node3D:
	var root := Node3D.new()
	root.name = "Feature_%s" % id
	root.position = Vector3(x + 0.5, 0.0, y + 0.5)
	if id == "houseDoor":
		root.add_child(box("Door", Vector3(0.7, 1.3, 0.08), Vector3(0.0, 0.65, DOOR_Z), material(TileVisuals.WOOD, 0.7)))
		var window_mat := glow(Color("#ffd98a"), Color("#ffb84d"), WINDOW_EMISSION_DAY)
		root.add_child(box("Window", Vector3(0.6, 0.5, 0.06), Vector3(1.1, 1.4, DOOR_Z), window_mat))
		night.append(window_mat)
	elif LINTELS.has(id):
		root.add_child(box("Door", Vector3(0.7, 1.3, 0.08), Vector3(0.0, 0.65, DOOR_Z), material(DARK_DOOR, 0.8)))
		root.add_child(box("Lintel", Vector3(0.9, 0.15, 0.12), Vector3(0.0, 1.38, DOOR_Z), material(LINTELS[id], 0.7)))
	elif GATES.has(id):
		_gate(root, x, y, grid)
	else:
		match id:
			"bin":
				_bin(root)
			"cart":
				_cart(root)
			"rootShrine":
				_shrine(root)
			"stove":
				_stove(root)
			"noticeBoard":
				_notice_board(root)
			"bed":
				var bed := HouseInterior.pieces(Vector2i(x, y))[0]
				var piece := HouseInterior.make_piece(bed)
				piece.position -= root.position
				root.add_child(piece)
			"well":
				root.add_child(box("Ring", Vector3(0.95, 0.5, 0.95), Vector3(0.0, 0.25, 0.0), material(Color("#8a8a82"), 0.95)))
				root.add_child(box("Water", Vector3(0.6, 0.02, 0.6), Vector3(0.0, 0.51, 0.0), material(Color("#1c2a36"), 0.3)))
			"stairsDown":
				root.add_child(box("Pit", Vector3(0.9, 0.04, 0.9), Vector3(0.0, 0.02, 0.0), material(Color("#0d0b0a"), 1.0)))
				root.add_child(box("Marker", Vector3(0.5, 0.06, 0.12), Vector3(0.0, 0.07, -0.35), glow(Color("#7fe08a"), SHRINE_RUNE, 1.5)))
			"stairsUp":
				root.add_child(box("Ladder", Vector3(0.7, 1.4, 0.1), Vector3(0.0, 0.7, 0.35), material(TileVisuals.WOOD, 0.7)))
				root.add_child(box("Marker", Vector3(0.5, 0.06, 0.12), Vector3(0.0, 0.07, 0.0), glow(Color("#ffd98a"), Color("#ffb84d"), 1.2)))
			"checkpointStone":
				root.add_child(box("Stone", Vector3(0.6, 1.3, 0.6), Vector3(0.0, 0.65, 0.0), material(Color("#6f7378"), 0.9)))
				root.add_child(box("Rune", Vector3(0.3, 0.5, 0.04), Vector3(0.0, 0.8, 0.32), glow(Color("#7fc8ff"), Color("#4fa8ff"), 2.0)))
			"lantern":
				root.add_child(box("Frame", Vector3(0.3, 0.4, 0.3), Vector3(0.0, 0.25, 0.0), material(Color("#4a3a2a"), 0.8)))
				root.add_child(box("Flame", Vector3(0.18, 0.24, 0.18), Vector3(0.0, 0.27, 0.0), glow(Color("#ffe9a8"), Color("#ffc25a"), 2.5)))
			"brokenBlade":
				root.add_child(box("Blade", Vector3(0.12, 0.04, 0.8), Vector3(0.0, 0.05, 0.0), material(Color("#9aa0a6"), 0.5)))
				root.add_child(box("Hilt", Vector3(0.3, 0.05, 0.08), Vector3(0.0, 0.06, 0.4), material(Color("#5a3a22"), 0.8)))
			"copperNode":
				root.add_child(box("Rock", Vector3(0.8, 0.7, 0.8), Vector3(0.0, 0.35, 0.0), material(Color("#4a463f"), 0.95)))
				root.add_child(box("Vein", Vector3(0.35, 0.3, 0.35), Vector3(0.1, 0.55, 0.3), glow(Color("#c8703a"), Color("#e08a4a"), 0.8)))
			"exitDoor":
				root.add_child(plane("Mat", Vector2(0.8, 0.8), Vector3(0.0, 0.02, 0.0), material(Color("#9e4b3c"))))
			_:
				push_error("No visual for feature %s" % id)
	return root


## Shipping bin (Features.tsx).
static func _bin(root: Node3D) -> void:
	root.add_child(box("Body", Vector3(0.8, 0.6, 0.7), Vector3(0.0, 0.3, 0.0), material(TileVisuals.WOOD)))
	var lid := box("Lid", Vector3(0.86, 0.08, 0.76), Vector3(0.0, 0.65, -0.05), material(Color("#6d4426")))
	lid.rotation = Vector3(-0.25, 0.0, 0.0)
	root.add_child(lid)


## Sol's merchant cart (Features.tsx), its group at (x + 0.3, 0, y + 0.5) turned -90°.
static func _cart(root: Node3D) -> void:
	var g := Node3D.new()
	g.name = "Cart"
	g.position = Vector3(-0.2, 0.0, 0.0)
	g.rotation = Vector3(0.0, -PI / 2.0, 0.0)
	root.add_child(g)
	g.add_child(box("Body", Vector3(1.6, 0.5, 0.9), Vector3(0.0, 0.55, 0.0), material(Color("#9b6a3c"))))
	g.add_child(box("Canopy", Vector3(1.8, 0.08, 1.1), Vector3(0.0, 1.45, 0.0), material(Color("#d8604a"), 0.6)))
	for px: float in [-0.75, 0.75]:
		g.add_child(cylinder("Pole", 0.03, 0.9, Vector3(px, 1.0, 0.45), material(Color("#5a3a20"))))
	for wx: float in [-0.55, 0.55]:
		var wheel := cylinder("Wheel", 0.3, 0.08, Vector3(wx, 0.3, 0.5), material(Color("#4b3220")))
		wheel.rotation = Vector3(PI / 2.0, 0.0, 0.0)
		g.add_child(wheel)


## Two posts and a cross-bar spanning the gap in the fence; the bar runs along x on the top and bottom rows and
## along z on the side columns.
static func _gate(root: Node3D, x: int, y: int, grid: Dictionary) -> void:
	var height: int = grid["height"]
	var along_x := y == 0 or y == height - 1
	var g := Node3D.new()
	g.name = "Gate"
	if not along_x:
		g.rotation = Vector3(0.0, PI / 2.0, 0.0)
	root.add_child(g)
	var wood := material(TileVisuals.WOOD)
	for px: float in [-0.5, 0.5]:
		g.add_child(box("Post", Vector3(0.16, 1.2, 0.16), Vector3(px, 0.6, 0.0), wood))
	g.add_child(box("Bar", Vector3(1.16, 0.1, 0.1), Vector3(0.0, 1.15, 0.0), wood))


## Root Shrine: a stone plinth, four small boulders around it and a faint green rune disc.
static func _shrine(root: Node3D) -> void:
	root.add_child(box("Plinth", Vector3(1.0, 0.3, 1.0), Vector3(0.0, 0.15, 0.0), material(TileVisuals.ROCK, 0.9)))
	var corners: Array[Vector3] = [
		Vector3(-0.5, 0, -0.5), Vector3(0.5, 0, -0.5), Vector3(0.5, 0, 0.5), Vector3(-0.5, 0, 0.5)
	]
	for k: int in corners.size():
		var rock := ModelCatalog.instantiate("rock-1")
		ModelCatalog.fit(rock, 0.3)
		TileVisuals.make_matte(rock, TileVisuals.rock_tint())
		rock.name = "Boulder_%d" % k
		rock.position += corners[k]
		root.add_child(rock)
	var rune := cylinder("Rune", 0.32, 0.02, Vector3(0.0, 0.31, 0.0), glow(SHRINE_RUNE, SHRINE_RUNE, 0.6))
	rune.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(rune)


## House stove: a dark box with a glowing door facing into the room (+z).
static func _stove(root: Node3D) -> void:
	root.add_child(box("Body", Vector3(0.9, 0.9, 0.7), Vector3(0.0, 0.45, 0.0), material(STOVE_BODY, 0.7)))
	var door := box("Door", Vector3(0.5, 0.35, 0.02), Vector3(0.0, 0.35, 0.36), glow(STOVE_GLOW, STOVE_GLOW, 1.5))
	door.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(door)


## Lowmere notice board: two posts and a board.
static func _notice_board(root: Node3D) -> void:
	var wood := material(TileVisuals.WOOD)
	for px: float in [-0.35, 0.35]:
		root.add_child(box("Post", Vector3(0.1, 1.4, 0.1), Vector3(px, 0.7, 0.0), wood))
	root.add_child(box("Board", Vector3(0.9, 0.6, 0.06), Vector3(0.0, 1.05, 0.05), material(Color("#6d4426"))))
	root.add_child(box("Paper", Vector3(0.3, 0.36, 0.01), Vector3(-0.15, 1.05, 0.085), material(Color("#f4ecdc"), 0.9)))


## One mass per connected block of `building` tiles (with the door features inside it): a wall box with a hipped
## roof, as the web farmhouse (Features.tsx). Named Building_0.. in reading order.
static func build_buildings(grid: Dictionary) -> Array[Node3D]:
	var out: Array[Node3D] = []
	var width: int = grid["width"]
	var height: int = grid["height"]
	var seen: Dictionary[Vector2i, bool] = {}
	for y: int in height:
		for x: int in width:
			var start := Vector2i(x, y)
			if seen.has(start) or not _is_building(grid, x, y):
				continue
			var lo := start
			var hi := start
			var stack: Array[Vector2i] = [start]
			seen[start] = true
			while not stack.is_empty():
				var p: Vector2i = stack.pop_back()
				lo = Vector2i(mini(lo.x, p.x), mini(lo.y, p.y))
				hi = Vector2i(maxi(hi.x, p.x), maxi(hi.y, p.y))
				for dir: Vector2i in [Vector2i.LEFT, Vector2i.RIGHT, Vector2i.UP, Vector2i.DOWN]:
					var q := p + dir
					if not seen.has(q) and _is_building(grid, q.x, q.y):
						seen[q] = true
						stack.append(q)
			out.append(_building("Building_%d" % out.size(), lo, hi))
	return out


static func _is_building(grid: Dictionary, x: int, y: int) -> bool:
	var t: Variant = Grid.tile_at(grid, x, y)
	if t == null:
		return false
	var tile: Dictionary = t
	return tile["kind"] == "building" or BUILDING_DOORS.has(tile.get("feature", ""))


static func _building(node_name: String, lo: Vector2i, hi: Vector2i) -> Node3D:
	var w := float(hi.x - lo.x + 1)
	var d := float(hi.y - lo.y + 1)
	var root := Node3D.new()
	root.name = node_name
	root.position = Vector3((lo.x + hi.x + 1) / 2.0, 0.0, (lo.y + hi.y + 1) / 2.0)
	var body := box("Body", Vector3(w - 0.1, WALL_HEIGHT, d - 0.1), Vector3(0.0, WALL_HEIGHT / 2.0, 0.0),
		material(TileVisuals.HOUSE_WALL, 0.9))
	root.add_child(body)
	var roof := MeshInstance3D.new()
	roof.name = "Roof"
	roof.mesh = hip_roof(w / 2.0 + ROOF_OVERHANG, d / 2.0 + ROOF_OVERHANG, ROOF_HEIGHT)
	roof.position = Vector3(0.0, WALL_HEIGHT, 0.0)
	roof.material_override = material(TileVisuals.ROOF, 0.7)
	root.add_child(roof)
	return root


## A flat-shaded four-sided pyramid with a hx x hz half-size base at y = 0 and its apex at y = h.
static func hip_roof(hx: float, hz: float, h: float) -> ArrayMesh:
	var apex := Vector3(0.0, h, 0.0)
	var base: Array[Vector3] = [Vector3(-hx, 0, -hz), Vector3(hx, 0, -hz), Vector3(hx, 0, hz), Vector3(-hx, 0, hz)]
	var verts := PackedVector3Array()
	var normals := PackedVector3Array()
	for k: int in 4:
		var a := base[k]
		var b := base[(k + 1) % 4]
		var outward := (a + b) / 2.0
		outward.y = 0.0
		var n := (b - a).cross(apex - a).normalized()
		# Godot's front faces wind clockwise as seen from outside: the cross product must point inward.
		if n.dot(outward) > 0.0:
			var tmp := a
			a = b
			b = tmp
			n = -n
		verts.append_array([a, b, apex])
		for i: int in 3:
			normals.append(-n)
	var arrays: Array = []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = verts
	arrays[Mesh.ARRAY_NORMAL] = normals
	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	return mesh


## The pond (Features.tsx): a dark bed plane under a flat blue water plane covering the water tiles' bounds, or
## null when the grid has no water.
static func build_pond(grid: Dictionary) -> Node3D:
	var width: int = grid["width"]
	var tiles: Array = grid["tiles"]
	var lo := Vector2i(width, tiles.size())
	var hi := Vector2i(-1, -1)
	for i: int in tiles.size():
		var tile: Dictionary = tiles[i]
		if tile["kind"] != "water":
			continue
		var p := Vector2i(i % width, i / width)
		lo = Vector2i(mini(lo.x, p.x), mini(lo.y, p.y))
		hi = Vector2i(maxi(hi.x, p.x), maxi(hi.y, p.y))
	if hi.x < 0:
		return null
	var w := float(hi.x - lo.x + 1) + 0.2
	var d := float(hi.y - lo.y + 1) + 0.2
	var root := Node3D.new()
	root.name = "Pond"
	root.position = Vector3((lo.x + hi.x + 1) / 2.0, 0.0, (lo.y + hi.y + 1) / 2.0)
	root.add_child(plane("Bed", Vector2(w, d), Vector3(0.0, -0.25, 0.0), material(Color("#20384a"), 1.0)))
	root.add_child(plane("Water", Vector2(w, d), Vector3(0.0, -0.08, 0.0), material(TileVisuals.WATER, 0.15)))
	return root
