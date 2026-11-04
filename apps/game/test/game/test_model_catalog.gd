extends CoreTest
## ModelCatalog: every web-scene model key has a file that Godot imported, the player carries the animation clips
## the game plays, `fit` scales and grounds a model, and a missing key fails loudly.

const EXPECTED_KEYS: Array[String] = [
	"player",
	"tree-round-1", "tree-round-2", "tree-round-3",
	"tree-dead-1", "tree-dead-2",
	"tree-pine-1", "tree-pine-2",
	"bush", "bush-flowers", "flowers-1", "flowers-2",
	"rock-1", "rock-2", "rock-3",
	"weed-1", "weed-2", "stump", "fence",
	"crop-sprout", "crop-young", "crop-turnip", "crop-melon", "crop-pumpkin",
	"corn-a", "corn-b", "corn-c", "corn-d",
	"bed", "rug", "potted-plant", "table", "chair", "lamp",
]  # gdlint: ignore=max-line-length

const PLAYER_CLIPS: Array[String] = [
	"Idle",
	"Walking_A",
	"Running_A",
	"2H_Melee_Attack_Chop",
	"1H_Melee_Attack_Slice_Horizontal",
	"Use_Item",
	"Interact",
	"PickUp",
	"Cheer",
]


## The combined AABB of all mesh descendants in `root`'s parent space (so `fit`'s change to root.transform shows).
func _footprint(root: Node3D) -> AABB:
	var box := AABB()
	var first := true
	for node: Node in root.find_children("*", "MeshInstance3D", true, false):
		var mi: MeshInstance3D = node as MeshInstance3D
		var xf: Transform3D = mi.transform
		var p: Node = mi.get_parent()
		while p != root and p is Node3D:
			xf = (p as Node3D).transform * xf
			p = p.get_parent()
		var b: AABB = xf * mi.get_aabb()
		box = b if first else box.merge(b)
		first = false
	return root.transform * box


func test_keys_are_the_web_scene_models() -> void:
	eq(ModelCatalog.KEYS.size(), 34)
	eq(ModelCatalog.KEYS, EXPECTED_KEYS)


func test_path_is_under_assets_models() -> void:
	eq(ModelCatalog.path("tree-pine-1"), "res://assets/models/tree-pine-1.glb")


func test_every_key_has_a_file() -> void:
	for key: String in ModelCatalog.KEYS:
		assert_true(ResourceLoader.exists(ModelCatalog.path(key)), "missing model file: %s" % key)


func test_every_model_instantiates_nodes() -> void:
	for key: String in ModelCatalog.KEYS:
		var inst: Node3D = ModelCatalog.instantiate(key)
		var meshes: int = inst.find_children("*", "MeshInstance3D", true, false).size()
		assert_gt(meshes, 0, "model '%s' has no MeshInstance3D (silent import failure? run pnpm game:models)" % key)
		inst.free()


func test_instantiate_returns_fresh_instances() -> void:
	var a_inst: Node3D = ModelCatalog.instantiate("bed")
	var b_inst: Node3D = ModelCatalog.instantiate("bed")
	assert_ne(a_inst, b_inst)
	a_inst.free()
	b_inst.free()


func test_player_has_animations() -> void:
	var inst: Node3D = ModelCatalog.instantiate("player")
	var players: Array[Node] = inst.find_children("*", "AnimationPlayer", true, false)
	eq(players.size(), 1)
	var ap: AnimationPlayer = players[0] as AnimationPlayer
	for clip: String in PLAYER_CLIPS:
		assert_true(ap.has_animation(clip), "missing clip: %s" % clip)
	inst.free()


func test_fit_width_scales_and_grounds() -> void:
	var root := Node3D.new()
	var mi := MeshInstance3D.new()
	var box := BoxMesh.new()
	box.size = Vector3(2, 2, 2)
	mi.mesh = box
	mi.position = Vector3(3, 5, -4)
	root.add_child(mi)
	ModelCatalog.fit(root, 1.0)
	var size: Vector3 = _footprint(root).size
	assert_almost_eq(size.x, 1.0, 0.0001)
	assert_almost_eq(size.y, 1.0, 0.0001)
	var fitted: AABB = _footprint(root)
	assert_almost_eq(fitted.position.y, 0.0, 0.0001)
	assert_almost_eq(fitted.position.x + fitted.size.x / 2.0, 0.0, 0.0001)
	assert_almost_eq(fitted.position.z + fitted.size.z / 2.0, 0.0, 0.0001)
	root.free()


func test_fit_height_scales_by_height_when_no_width() -> void:
	var root := Node3D.new()
	var mi := MeshInstance3D.new()
	var box := BoxMesh.new()
	box.size = Vector3(1, 4, 1)
	mi.mesh = box
	root.add_child(mi)
	ModelCatalog.fit(root, 0.0, 2.0)
	var fitted: AABB = _footprint(root)
	assert_almost_eq(fitted.size.y, 2.0, 0.0001)
	assert_almost_eq(fitted.size.x, 0.5, 0.0001)
	assert_almost_eq(fitted.position.y, 0.0, 0.0001)
	root.free()


func test_missing_key_is_loud() -> void:
	var inst: Node3D = ModelCatalog.instantiate("no-such-model")
	assert_push_error("Unknown model key")
	assert_not_null(inst)
	eq(inst.get_child_count(), 0)
	inst.free()
