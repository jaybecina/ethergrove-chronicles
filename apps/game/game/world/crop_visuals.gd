class_name CropVisuals
extends RefCounted
## Tilled soil and crops, ported from apps/web/src/scene/CropModels.tsx (cropModel, FIT, the 250 ms pop),
## Crops.tsx (MODEL_MATURE, the seed speck, procedural fruit on mature crops without their own model) and Tiles.tsx
## (tilled / watered soil from palette.ts). The soil colour is not in the shared ground mesh, so each tilled tile gets
## a thin overlay box; the two soil materials, the overlay mesh, the speck and the fruit materials are shared.
## Crop sway (the web wind shader) is not ported in M1.

## palette.ts COLORS.tilled / COLORS.watered (Tiles.tsx groundColor for tilled tiles).
const TILLED := Color("#6e4a2e")
const WATERED := Color("#47301d")
const SOIL_SIZE := Vector3(0.96, 0.04, 0.96)
const SOIL_Y := 0.02
## Crops.tsx seed speck colour; size and height per the M1 controller ruling.
const SEED := Color("#3d2816")
const SEED_RADIUS := 0.05
const SEED_Y := 0.05
const SEED_ROUGHNESS := 0.75
const FRUIT_ROUGHNESS := 0.45
## CropModels.tsx: rotY = (tile * 2.3) % 6.28.
const ROT_STEP := 2.3
const ROT_WRAP := 6.28
## The pop: 0.8 → 1.1 → 1.0 over POP_SECONDS (POP_MS 250), linear like the web curve.
const POP_SECONDS := 0.25
const POP_FROM := 0.8
const POP_PEAK := 1.1

## Crops whose mature look comes from a model (Crops.tsx MODEL_MATURE).
const MODEL_MATURE: Array[String] = ["turnip", "melon", "pumpkin", "corn"]

## CropModels.tsx FIT.
const FIT: Dictionary[String, Dictionary] = {
	"crop-sprout": {"width": 0.45},
	"crop-young": {"width": 0.7},
	"crop-turnip": {"width": 0.55},
	"crop-melon": {"width": 0.75},
	"crop-pumpkin": {"width": 0.8},
	"corn-a": {"height": 0.35},
	"corn-b": {"height": 0.8},
	"corn-c": {"height": 1.2},
	"corn-d": {"height": 1.55},
}

## Crops.tsx LOOK, the fruit part only (fruit colour, size x/y/z, fruitY, bush, count) for the crops drawn with
## procedural fruit on the `crop-young` model when mature.
const FRUIT: Dictionary[String, Dictionary] = {
	"potato": {"color": Color("#b28c5c"), "size": Vector3(0.12, 0.1, 0.12), "y": 0.08, "bush": 0.22, "count": 3},
	"strawberry": {"color": Color("#e0313f"), "size": Vector3(0.07, 0.08, 0.07), "y": 0.16, "bush": 0.2, "count": 4},
	"tomato": {"color": Color("#e64b35"), "size": Vector3(0.09, 0.09, 0.09), "y": 0.5, "bush": 0.2, "count": 4},
	"eggplant": {"color": Color("#6b3a8a"), "size": Vector3(0.08, 0.17, 0.08), "y": 0.3, "bush": 0.2, "count": 3},
}

static var _soil_mesh: BoxMesh = null
static var _soil_mats: Dictionary[bool, StandardMaterial3D] = {}
static var _sphere: SphereMesh = null
static var _plain_mats: Dictionary[String, StandardMaterial3D] = {}


## cropModel(): the ModelCatalog key for the crop at its stage, or "" for the seed speck.
static func model_for(crop: Dictionary) -> String:
	var stage := Crops.crop_stage(crop)
	if stage == "seed":
		return ""
	var id: String = crop["id"]
	if id == "corn":
		if stage == "sprout":
			return "corn-a"
		if stage == "young":
			var days: int = CropData.CROPS["corn"]["days"]
			var age: int = crop["age"]
			return "corn-b" if float(age) < float(days * 2) / 3.0 else "corn-c"
		return "corn-d"
	if stage == "sprout":
		return "crop-sprout"
	if stage == "mature" and MODEL_MATURE.has(id):
		return "crop-%s" % id
	return "crop-young"


## The FIT entry of a model key: {"width": w} or {"height": h}; {} for an unknown key.
static func fit_for(key: String) -> Dictionary:
	return FIT.get(key, {})


## The soil colour of a tilled tile: darker when watered.
static func soil_color(tile: Dictionary) -> Color:
	return WATERED if tile.get("watered", false) else TILLED


## The crop's resting scale. The web only scales a crop during the pop, which `pop` plays as a Tween.
static func scale_for(_crop: Dictionary) -> float:
	return 1.0


## The thin soil overlay `Soil_<x>_<y>` on a tilled tile, with the shared dry or watered material.
static func build_soil(tile: Dictionary, x: int, y: int) -> MeshInstance3D:
	if _soil_mesh == null:
		_soil_mesh = BoxMesh.new()
		_soil_mesh.size = SOIL_SIZE
	var watered: bool = tile.get("watered", false)
	var mat: StandardMaterial3D = _soil_mats.get(watered)
	if mat == null:
		mat = StandardMaterial3D.new()
		mat.albedo_color = soil_color(tile)
		mat.roughness = TileVisuals.GROUND_ROUGHNESS
		_soil_mats[watered] = mat
	var mi := MeshInstance3D.new()
	mi.name = "Soil_%d_%d" % [x, y]
	mi.mesh = _soil_mesh
	mi.material_override = mat
	mi.position = Vector3(x + 0.5, SOIL_Y, y + 0.5)
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	return mi


## The node `Crop_<x>_<y>` for `crop` on tile (x, y) of a grid `width` wide. Its first child is the model holder,
## named by the model key and turned by the web rotY, or `Seed` for the speck; mature crops without their own model
## add `Fruit_<n>` spheres.
static func build_crop(crop: Dictionary, x: int, y: int, width: int) -> Node3D:
	var root := Node3D.new()
	root.name = "Crop_%d_%d" % [x, y]
	root.position = Vector3(x + 0.5, 0.0, y + 0.5)
	root.scale = Vector3.ONE * scale_for(crop)
	var key := model_for(crop)
	if key == "":
		var speck := _sphere_part("Seed", SEED, SEED_ROUGHNESS)
		speck.position = Vector3(0.0, SEED_Y, 0.0)
		speck.scale = Vector3.ONE * SEED_RADIUS
		root.add_child(speck)
		return root
	var tile := y * width + x
	var holder := Node3D.new()
	holder.name = key
	holder.rotation = Vector3(0.0, fmod(tile * ROT_STEP, ROT_WRAP), 0.0)
	var model := ModelCatalog.instantiate(key)
	var fit := fit_for(key)
	var fit_width: float = fit.get("width", 0.0)
	var fit_height: float = fit.get("height", 0.0)
	ModelCatalog.fit(model, fit_width, fit_height)
	TileVisuals.make_matte(model, TileVisuals.KENNEY_BASE)
	holder.add_child(model)
	root.add_child(holder)
	var id: String = crop["id"]
	if Crops.crop_stage(crop) == "mature" and FRUIT.has(id):
		_add_fruit(root, FRUIT[id], tile)
	return root


## Plays the web pop on a crop node: 0.8 → 1.1 → 1.0 in 0.25 s. Needs the node in the scene tree.
static func pop(node: Node3D) -> void:
	node.scale = Vector3.ONE * POP_FROM
	if not node.is_inside_tree():
		node.scale = Vector3.ONE
		return
	var tween := node.create_tween()
	tween.tween_property(node, "scale", Vector3.ONE * POP_PEAK, POP_SECONDS / 2.0)
	tween.tween_property(node, "scale", Vector3.ONE, POP_SECONDS / 2.0)


## Crops.tsx fruit: `count` spheres on a ring of radius bush * 0.7 (one in the middle when count is 1), every other
## one 0.08 higher. Positions are relative to the tile centre and not turned with the model, as in the web.
static func _add_fruit(root: Node3D, look: Dictionary, tile: int) -> void:
	var count: int = look["count"]
	var bush: float = look["bush"]
	var base_y: float = look["y"]
	var size: Vector3 = look["size"]
	var color: Color = look["color"]
	var r := bush * 0.7 if count > 1 else 0.0
	for n: int in count:
		var a := float(n) / count * TAU + tile
		var fruit := _sphere_part("Fruit_%d" % n, color, FRUIT_ROUGHNESS)
		var lift := float(n % 2) * 0.08 if count > 1 else 0.0
		fruit.position = Vector3(cos(a) * r, base_y + lift, sin(a) * r)
		fruit.scale = size
		root.add_child(fruit)


## A unit sphere (radius 1, the web's 12 x 8 segments) with a cached plain material.
static func _sphere_part(node_name: String, color: Color, roughness: float) -> MeshInstance3D:
	if _sphere == null:
		_sphere = SphereMesh.new()
		_sphere.radius = 1.0
		_sphere.height = 2.0
		_sphere.radial_segments = 12
		_sphere.rings = 8
	var key := "%s|%f" % [color.to_html(), roughness]
	var mat: StandardMaterial3D = _plain_mats.get(key)
	if mat == null:
		mat = StandardMaterial3D.new()
		mat.albedo_color = color
		mat.roughness = roughness
		_plain_mats[key] = mat
	var mi := MeshInstance3D.new()
	mi.name = node_name
	mi.mesh = _sphere
	mi.material_override = mat
	return mi
