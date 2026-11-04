class_name ModelCatalog
extends RefCounted
## The CC0 glTF models the web scene also uses (credited in CREDITS.md), loaded by key. `instantiate` caches the
## PackedScene and returns a fresh instance each call; `fit` mirrors the web `fitTransform` (uniform scale to a
## footprint width or a height, base on y = 0, x/z centred).
##
## The files in assets/models are the web .glb files decoded for Godot: Godot 4.7 cannot import
## EXT_meshopt_compression or KHR_mesh_quantization, so the originals were decoded, dequantized, pruned and
## welded with glTF Transform (see CREDITS.md). Godot keeps the glTF names unchanged on import: the `player`
## model holds one AnimationPlayer with the clips `1H_Melee_Attack_Slice_Horizontal`, `2H_Melee_Attack_Chop`,
## `Cheer`, `Idle`, `Interact`, `Lie_Idle`, `PickUp`, `Running_A`, `Use_Item` and `Walking_A` (no renames).

const KEYS: Array[String] = [
	"player",
	"tree-round-1",
	"tree-round-2",
	"tree-round-3",
	"tree-dead-1",
	"tree-dead-2",
	"tree-pine-1",
	"tree-pine-2",
	"bush",
	"bush-flowers",
	"flowers-1",
	"flowers-2",
	"rock-1",
	"rock-2",
	"rock-3",
	"weed-1",
	"weed-2",
	"stump",
	"fence",
	"crop-sprout",
	"crop-young",
	"crop-turnip",
	"crop-melon",
	"crop-pumpkin",
	"corn-a",
	"corn-b",
	"corn-c",
	"corn-d",
	"bed",
	"rug",
	"potted-plant",
	"table",
	"chair",
	"lamp",
]

static var _cache: Dictionary[String, PackedScene] = {}


static func path(key: String) -> String:
	return "res://assets/models/%s.glb" % key


## A fresh instance of the model. An unknown key or a missing file pushes an error and yields an empty Node3D.
static func instantiate(key: String) -> Node3D:
	if not KEYS.has(key):
		push_error("Unknown model key: %s" % key)
		return Node3D.new()
	var scene: PackedScene = _cache.get(key)
	if scene == null:
		scene = load(path(key)) as PackedScene
		if scene == null:
			push_error("Model failed to load: %s" % path(key))
			return Node3D.new()
		_cache[key] = scene
	var inst: Node3D = scene.instantiate() as Node3D
	if inst == null:
		push_error("Model root is not a Node3D: %s" % key)
		return Node3D.new()
	return inst


## Scales `node` uniformly so the larger of its x/z extents equals `width` (when width > 0) or its height equals
## `height`, then moves it so the base sits at y = 0 and x/z are centred. Measures all MeshInstance3D descendants
## in the node's local space; a node without meshes is left alone. Call once per fresh instance.
static func fit(node: Node3D, width: float = 0.0, height: float = 0.0) -> void:
	var box: AABB = _local_bounds(node)
	if box.size == Vector3.ZERO:
		return
	var extent: float = maxf(box.size.x, box.size.z) if width > 0.0 else box.size.y
	var target: float = width if width > 0.0 else height
	if extent <= 0.0 or target <= 0.0:
		return
	var s: float = target / extent
	var center: Vector3 = box.get_center()
	var offset := Vector3(-center.x, -box.position.y, -center.z)
	node.transform = node.transform * Transform3D(Basis.from_scale(Vector3(s, s, s)), offset * s)


static func _local_bounds(node: Node3D) -> AABB:
	var box := AABB()
	var first: bool = true
	for found: Node in node.find_children("*", "MeshInstance3D", true, false):
		var mi: MeshInstance3D = found as MeshInstance3D
		var xf: Transform3D = mi.transform
		var p: Node = mi.get_parent()
		while p != node and p is Node3D:
			xf = (p as Node3D).transform * xf
			p = p.get_parent()
		var b: AABB = xf * mi.get_aabb()
		box = b if first else box.merge(b)
		first = false
	return box
