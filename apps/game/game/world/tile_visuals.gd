class_name TileVisuals
extends RefCounted
## The ground and the tile obstacles of a zone, ported from apps/web/src/scene/Tiles.tsx, TileModels.tsx, palette.ts
## and kenneyColors.ts: one vertex-coloured ground mesh for the whole grid, a Node3D per rock, weed and stump tile
## (model picked by the web's stable position hash), and the boundary fence as MultiMesh instances.
##
## Kenney glTFs omit metallicFactor, so Godot imports them as metal (metallic 1) and the tint hides; `make_matte`
## swaps every surface for a cached copy with metallic 0 / roughness 0.9 and the tinted albedo. Built once per zone
## or changed tile, never per frame.

## palette.ts COLORS (sRGB, as the web sets them).
const GRASS := Color("#6f9e4c")
const PATH := Color("#c8a56c")
const FLOOR := Color("#b98a5a")
## Mossdeep's stone floor and walls, and the clinic walls.
const CAVE_FLOOR := Color("#4d4a42")
const CAVE_WALL := Color("#2f2c28")
const CLINIC_WALL := Color("#e8dcc4")
const WALL_HEIGHT := 1.6
const WALL := Color("#e8dcc4")
const ROCK := Color("#8f979e")
const WATER := Color("#4f8fb3")
const HOUSE_WALL := Color("#f1e4c8")
const ROOF := Color("#a7473a")
const WOOD := Color("#8a5a33")

## kenneyColors.ts: material name → colour. ROCK_TINT overrides dirt and grass; WOOD_TINT is the base map.
const KENNEY_BASE: Dictionary[String, Color] = {
	"grass": Color("#5f9a3c"),
	"dirt": Color("#5a3d26"),
	"woodBark": Color("#7a5434"),
	"woodInner": Color("#d8bd8e"),
	"woodBirch": Color("#efe3d2"),
	"leafsFall": Color("#e8822e"),
	"leafs": Color("#4f8a34"),
}
const NO_TINT: Dictionary[String, Color] = {}
const ROCK_OVERRIDES: Dictionary[String, Color] = {"dirt": Color("#8f979e"), "grass": Color("#6c8a48")}

## TileModels.tsx fits: rocks and stumps by width, weed-1 by width and weed-2 by height, fences by width.
const ROCK_WIDTH := 0.7
const STUMP_WIDTH := 0.7
const WEED_1_WIDTH := 0.75
const WEED_2_HEIGHT := 0.55
const FENCE_WIDTH := 1.02
## Tiles.tsx offsets the hash by 17 for per-tile rotation and scale; weeds are two tufts per tile.
const JITTER_OFFSET := 17
## offsetHSL lightness jitter of the ground: (hash01(i) - 0.5) * 0.06.
const GROUND_JITTER := 0.06
const MATTE_ROUGHNESS := 0.9
const GROUND_ROUGHNESS := 0.95
## How far the grass apron reaches past each edge of an outdoor zone, in metres. The orthographic view (CameraMath:
## 40.9 x 30 m of ground) is wider than the farm, so without it the sky's ground colour showed around the map.
const APRON := 40.0

## Matte, tinted copies keyed by the source material's instance id and the tint map's id.
static var _matte_cache: Dictionary[String, StandardMaterial3D] = {}
static var _rock_tint: Dictionary[String, Color] = {}


## TileModels.tsx byVariant: floor(abs(sin(x * 12.9 + z * 78.2)) * 1000) % n, at world position (x, z).
static func variant(x: float, z: float, n: int) -> int:
	return floori(absf(sin(x * 12.9 + z * 78.2)) * 1000.0) % n


## palette.ts hash01: stable per-tile jitter in [0, 1).
static func hash01(i: int) -> float:
	var v := sin(i * 127.1 + 311.7) * 43758.5453
	return v - floorf(v)


## ROCK_TINT: the base Kenney map with dirt and grass overridden.
static func rock_tint() -> Dictionary[String, Color]:
	if _rock_tint.is_empty():
		_rock_tint = KENNEY_BASE.duplicate()
		_rock_tint.merge(ROCK_OVERRIDES, true)
	return _rock_tint


## Whether the tile shows ground (the pond does not: its bed and water sit below).
static func has_ground(_zone: String, tile: Dictionary) -> bool:
	return tile["kind"] != "water"


## Tiles.tsx groundColor: path, house floor or grass, with the hash01 lightness jitter of tile index `i`.
static func ground_color(zone: String, tile: Dictionary, i: int, grass: Color = GRASS) -> Color:
	var base := grass
	if zone == "mossdeep":
		base = CAVE_FLOOR
	elif Zones.is_interior(zone):
		base = FLOOR
	elif tile["kind"] == "path":
		base = PATH
	return offset_lightness(base, (hash01(i) - 0.5) * GROUND_JITTER)


## three.js Color.offsetHSL(0, 0, dl): the colour with its HSL lightness moved by `dl`, clamped to [0, 1].
static func offset_lightness(c: Color, dl: float) -> Color:
	var mx := maxf(c.r, maxf(c.g, c.b))
	var mn := minf(c.r, minf(c.g, c.b))
	var l := (mx + mn) / 2.0
	var h := 0.0
	var s := 0.0
	if mx != mn:
		var delta := mx - mn
		s = delta / (2.0 - mx - mn) if l > 0.5 else delta / (mx + mn)
		if mx == c.r:
			h = (c.g - c.b) / delta + (6.0 if c.g < c.b else 0.0)
		elif mx == c.g:
			h = (c.b - c.r) / delta + 2.0
		else:
			h = (c.r - c.g) / delta + 4.0
		h /= 6.0
	l = clampf(l + dl, 0.0, 1.0)
	if s == 0.0:
		return Color(l, l, l, c.a)
	var q := l * (1.0 + s) if l < 0.5 else l + s - l * s
	var p := 2.0 * l - q
	return Color(_hue(p, q, h + 1.0 / 3.0), _hue(p, q, h), _hue(p, q, h - 1.0 / 3.0), c.a)


static func _hue(p: float, q: float, t: float) -> float:
	if t < 0.0:
		t += 1.0
	if t > 1.0:
		t -= 1.0
	if t < 1.0 / 6.0:
		return p + (q - p) * 6.0 * t
	if t < 0.5:
		return q
	if t < 2.0 / 3.0:
		return p + (q - p) * (2.0 / 3.0 - t) * 6.0
	return p


## One MeshInstance3D for the whole grid: a 1 x 1 quad at y = 0 per tile that shows ground, coloured per vertex.
static func build_ground(zone: String, grid: Dictionary, grass: Color = GRASS) -> MeshInstance3D:
	var width: int = grid["width"]
	var tiles: Array = grid["tiles"]
	var verts := PackedVector3Array()
	var normals := PackedVector3Array()
	var colors := PackedColorArray()
	var indices := PackedInt32Array()
	for i: int in tiles.size():
		var tile: Dictionary = tiles[i]
		if not has_ground(zone, tile):
			continue
		var x := float(i % width)
		var z := float(i / width)
		var color := ground_color(zone, tile, i, grass)
		var first := verts.size()
		verts.append_array([Vector3(x, 0, z), Vector3(x + 1, 0, z), Vector3(x + 1, 0, z + 1), Vector3(x, 0, z + 1)])
		for k: int in 4:
			normals.append(Vector3.UP)
			colors.append(color)
		# Godot treats clockwise (seen from the front, here from above) as the front face.
		indices.append_array([first, first + 1, first + 2, first, first + 2, first + 3])
	var arrays: Array = []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = verts
	arrays[Mesh.ARRAY_NORMAL] = normals
	arrays[Mesh.ARRAY_COLOR] = colors
	arrays[Mesh.ARRAY_INDEX] = indices
	var mesh := ArrayMesh.new()
	if not verts.is_empty():
		mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	var mat := StandardMaterial3D.new()
	mat.vertex_color_use_as_albedo = true
	mat.vertex_color_is_srgb = true
	mat.roughness = GROUND_ROUGHNESS
	var mi := MeshInstance3D.new()
	mi.name = "Ground"
	mi.mesh = mesh
	mi.material_override = mat
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	return mi


## The grass ring around an outdoor zone: four flat quads at y = 0 reaching APRON metres past every edge, never over
## the map (the pond's water sits below y = 0 and would be hidden), in `grass`. The house has none: its interior sits
## in the dark.
static func build_apron(grid: Dictionary, grass: Color) -> MeshInstance3D:
	var w := float(grid["width"] as int)
	var h := float(grid["height"] as int)
	var a := APRON
	# (x0, z0, x1, z1): north and south strips span the full width, west and east strips the map's depth.
	var rects: Array[Rect2] = [
		Rect2(-a, -a, w + 2.0 * a, a), Rect2(-a, h, w + 2.0 * a, a), Rect2(-a, 0.0, a, h), Rect2(w, 0.0, a, h),
	]
	var verts := PackedVector3Array()
	var normals := PackedVector3Array()
	var indices := PackedInt32Array()
	for r: Rect2 in rects:
		var first := verts.size()
		verts.append_array([
			Vector3(r.position.x, 0, r.position.y), Vector3(r.end.x, 0, r.position.y),
			Vector3(r.end.x, 0, r.end.y), Vector3(r.position.x, 0, r.end.y),
		])
		for k: int in 4:
			normals.append(Vector3.UP)
		indices.append_array([first, first + 1, first + 2, first, first + 2, first + 3])
	var arrays: Array = []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = verts
	arrays[Mesh.ARRAY_NORMAL] = normals
	arrays[Mesh.ARRAY_INDEX] = indices
	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	var mat := StandardMaterial3D.new()
	mat.albedo_color = grass
	mat.roughness = GROUND_ROUGHNESS
	var mi := MeshInstance3D.new()
	mi.name = "Apron"
	mi.mesh = mesh
	mi.material_override = mat
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	return mi


## Whether a tile of this kind gets its own obstacle node.
static func is_obstacle(kind: String) -> bool:
	return kind == "rock" or kind == "weed" or kind == "stump"


## The node for a rock, weed or stump tile at (x, y) of a grid `width` wide, centred on the tile; null otherwise.
static func build_obstacle(tile: Dictionary, x: int, y: int, width: int) -> Node3D:
	var kind: String = tile["kind"]
	if not is_obstacle(kind):
		return null
	var root := Node3D.new()
	root.name = "Tile_%d_%d" % [x, y]
	var cx := x + 0.5
	var cz := y + 0.5
	root.position = Vector3(cx, 0.0, cz)
	var j := hash01(y * width + x + JITTER_OFFSET)
	match kind:
		"rock":
			var key := "rock-%d" % (variant(cx, cz, 3) + 1)
			root.add_child(_model(key, key, ROCK_WIDTH, 0.0, rock_tint(), Vector3.ZERO, j * 6.0, 0.85 + j * 0.3))
		"stump":
			root.add_child(_model("stump", "stump", STUMP_WIDTH, 0.0, KENNEY_BASE, Vector3.ZERO, j * 6.0, 1.0))
		"weed":
			# Two tufts, each with its own variant by its own position (Tiles.tsx).
			var tufts: Array[Array] = [
				[Vector3(-0.15, 0.0, -0.1), j * 6.0, 0.9 + j * 0.4],
				[Vector3(0.18, 0.0, 0.12), j * 3.0, 0.7 + j * 0.3],
			]
			for k: int in tufts.size():
				var offset: Vector3 = tufts[k][0]
				var rot: float = tufts[k][1]
				var size: float = tufts[k][2]
				var key := "weed-%d" % (variant(cx + offset.x, cz + offset.z, 2) + 1)
				var w := WEED_1_WIDTH if key == "weed-1" else 0.0
				var h := 0.0 if key == "weed-1" else WEED_2_HEIGHT
				var tuft := _model(key, "%s_%d" % [key, k], w, h, NO_TINT, offset, rot, size)
				root.add_child(tuft)
	return root


## A fitted, matte, tinted model under a holder placed at `offset`, turned by `rot_y` and scaled by `scale`.
static func _model(
	key: String, node_name: String, width: float, height: float, tint: Dictionary[String, Color],
	offset: Vector3, rot_y: float, scale: float
) -> Node3D:
	var holder := Node3D.new()
	holder.name = node_name
	holder.position = offset
	holder.rotation = Vector3(0.0, rot_y, 0.0)
	holder.scale = Vector3.ONE * scale
	var model := ModelCatalog.instantiate(key)
	ModelCatalog.fit(model, width, height)
	make_matte(model, tint)
	holder.add_child(model)
	return holder


## Overrides every surface of every mesh under `node` with a matte copy, tinted by material name from `tint`.
static func make_matte(node: Node, tint: Dictionary[String, Color]) -> void:
	for found: Node in node.find_children("*", "MeshInstance3D", true, false):
		var mi := found as MeshInstance3D
		for s: int in mi.mesh.get_surface_count():
			var src := mi.get_active_material(s) as BaseMaterial3D
			if src != null:
				mi.set_surface_override_material(s, matte_copy(src, tint))


## A cached matte copy of `src` (metallic 0, roughness 0.9) with the tint for its name applied.
static func matte_copy(src: BaseMaterial3D, tint: Dictionary[String, Color]) -> StandardMaterial3D:
	var key := "%d|%d" % [src.get_instance_id(), tint.hash()]
	var cached: StandardMaterial3D = _matte_cache.get(key)
	if cached != null:
		return cached
	var mat := src.duplicate() as StandardMaterial3D
	if mat == null:
		mat = StandardMaterial3D.new()
		mat.albedo_color = src.albedo_color
	mat.resource_name = src.resource_name
	mat.metallic = 0.0
	mat.roughness = MATTE_ROUGHNESS
	if tint.has(src.resource_name):
		mat.albedo_color = tint[src.resource_name]
	_matte_cache[key] = mat
	return mat


## The boundary fence: one MultiMeshInstance3D per mesh part of the fitted `fence` model, one instance per fence
## tile. Rows 0 and height - 1 run along x; the side columns are turned a quarter (Tiles.tsx).
## The wall blocks of an indoor zone (the clinic, Mossdeep): one MultiMesh of boxes, only for walls that touch a
## non-wall tile (the rock behind them is never seen).
static func build_walls(grid: Dictionary, color: Color) -> MultiMeshInstance3D:
	var width: int = grid["width"]
	var height: int = grid["height"]
	var tiles: Array = grid["tiles"]
	var places: Array[Vector3] = []
	for y: int in height:
		for x: int in width:
			var tile: Dictionary = tiles[y * width + x]
			if tile["kind"] != "wall":
				continue
			var exposed := false
			for dy: int in range(-1, 2):
				for dx: int in range(-1, 2):
					var nx := x + dx
					var ny := y + dy
					if nx < 0 or ny < 0 or nx >= width or ny >= height:
						continue
					var other: Dictionary = tiles[ny * width + nx]
					if other["kind"] != "wall":
						exposed = true
			if exposed:
				places.append(Vector3(x + 0.5, WALL_HEIGHT / 2.0, y + 0.5))
	var box := BoxMesh.new()
	box.size = Vector3(1.0, WALL_HEIGHT, 1.0)
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	material.roughness = 1.0
	box.material = material
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = box
	mm.instance_count = places.size()
	for i: int in places.size():
		mm.set_instance_transform(i, Transform3D(Basis.IDENTITY, places[i]))
	var node := MultiMeshInstance3D.new()
	node.name = "Walls"
	node.multimesh = mm
	return node


static func build_fences(grid: Dictionary) -> Node3D:
	var root := Node3D.new()
	root.name = "Fences"
	var width: int = grid["width"]
	var height: int = grid["height"]
	var tiles: Array = grid["tiles"]
	var places: Array[Transform3D] = []
	for i: int in tiles.size():
		var tile: Dictionary = tiles[i]
		if tile["kind"] != "fence":
			continue
		var row := i / width
		var edge_row := row == 0 or row == height - 1
		var basis := Basis.IDENTITY if edge_row else Basis(Vector3.UP, PI / 2.0)
		places.append(Transform3D(basis, Vector3(i % width + 0.5, 0.0, row + 0.5)))
	var model := ModelCatalog.instantiate("fence")
	ModelCatalog.fit(model, FENCE_WIDTH)
	make_matte(model, KENNEY_BASE)
	var parts: Array[Node] = model.find_children("*", "MeshInstance3D", true, false)
	for p: int in parts.size():
		var mi := parts[p] as MeshInstance3D
		var local := mi.transform
		var parent: Node = mi.get_parent()
		while parent != null and parent is Node3D:
			local = (parent as Node3D).transform * local
			if parent == model:
				break
			parent = parent.get_parent()
		var mesh := mi.mesh.duplicate() as Mesh
		for s: int in mesh.get_surface_count():
			mesh.surface_set_material(s, mi.get_active_material(s))
		var mm := MultiMesh.new()
		mm.transform_format = MultiMesh.TRANSFORM_3D
		mm.mesh = mesh
		mm.instance_count = places.size()
		for k: int in places.size():
			mm.set_instance_transform(k, places[k] * local)
		var mmi := MultiMeshInstance3D.new()
		mmi.name = "FencePart_%d" % p
		mmi.multimesh = mm
		root.add_child(mmi)
	model.free()
	return root
