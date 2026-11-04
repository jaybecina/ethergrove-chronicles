class_name HouseInterior
extends RefCounted
## The farmhouse interior, ported from apps/web/src/scene/HouseInterior.tsx and Furniture.tsx: low 0.7 m walls so
## the angled camera sees inside, the six CC0 furniture pieces at the web positions (the bed on the core's bed
## tile, built by FeatureVisuals for the `bed` feature) and the lamp's warm point light.

const WALL_HEIGHT := 0.7
## Furniture.tsx's pointLight: intensity 4 / distance 5 in three.js; Godot energy ~1.6 with range 5.
const LAMP_LIGHT_POS := Vector3(1.4, 1.3, 4.4)
const LAMP_LIGHT_COLOR := Color("#ffcf8a")
const LAMP_LIGHT_ENERGY := 1.6
const LAMP_LIGHT_RANGE := 5.0


## Furniture.tsx's six pieces for a bed on tile `bed`: key, world x/z of the piece centre, rotY and fit width.
## The bed is first.
static func pieces(bed: Vector2i) -> Array[Dictionary]:
	return [
		{"key": "bed", "x": bed.x + 0.5, "z": bed.y + 0.55, "rotY": PI, "width": 1.05},
		{"key": "rug", "x": 3.5, "z": 2.9, "rotY": 0.0, "width": 2.2},
		{"key": "table", "x": 1.7, "z": 1.7, "rotY": 0.0, "width": 0.9},
		{"key": "chair", "x": 2.5, "z": 1.8, "rotY": -PI / 2.0, "width": 0.5},
		{"key": "potted-plant", "x": 6.4, "z": 4.4, "rotY": 0.0, "width": 0.45},
		{"key": "lamp", "x": 1.4, "z": 4.4, "rotY": 0.0, "width": 0.4},
	]


## A piece as `Furniture_<key>`: a holder at (x, 0, z) turned by rotY, holding the model fitted to its width.
static func make_piece(piece: Dictionary) -> Node3D:
	var key: String = piece["key"]
	var x: float = piece["x"]
	var z: float = piece["z"]
	var rot_y: float = piece["rotY"]
	var width: float = piece["width"]
	var holder := Node3D.new()
	holder.name = "Furniture_%s" % key
	holder.position = Vector3(x, 0.0, z)
	holder.rotation = Vector3(0.0, rot_y, 0.0)
	var model := ModelCatalog.instantiate(key)
	ModelCatalog.fit(model, width)
	TileVisuals.make_matte(model, TileVisuals.NO_TINT)
	holder.add_child(model)
	return holder


## The static interior of the house grid: walls, the five pieces that are not the bed, and the lamp light.
static func build(grid: Dictionary) -> Node3D:
	var root := Node3D.new()
	root.name = "Interior"
	var walls := Node3D.new()
	walls.name = "Walls"
	root.add_child(walls)
	var width: int = grid["width"]
	var tiles: Array = grid["tiles"]
	var wall_mat := FeatureVisuals.material(TileVisuals.WALL, 0.9)
	for i: int in tiles.size():
		var tile: Dictionary = tiles[i]
		if tile["kind"] != "wall":
			continue
		var x := i % width
		var y := i / width
		var pos := Vector3(x + 0.5, WALL_HEIGHT / 2.0, y + 0.5)
		walls.add_child(FeatureVisuals.box("Wall_%d_%d" % [x, y], Vector3(1.0, WALL_HEIGHT, 1.0), pos, wall_mat))
	var furniture := Node3D.new()
	furniture.name = "Furniture"
	root.add_child(furniture)
	var bed := Grid.find_feature(grid, "bed")
	var all := pieces(bed)
	for k: int in range(1, all.size()):
		furniture.add_child(make_piece(all[k]))
	var light := OmniLight3D.new()
	light.name = "LampLight"
	light.position = LAMP_LIGHT_POS
	light.light_color = LAMP_LIGHT_COLOR
	light.light_energy = LAMP_LIGHT_ENERGY
	light.omni_range = LAMP_LIGHT_RANGE
	root.add_child(light)
	return root
