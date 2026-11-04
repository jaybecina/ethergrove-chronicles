extends CoreTest
## VillagerVisuals: the four Lowmere villagers as tinted, idling `player` models.

const TINTS: Dictionary[String, Color] = {
	"hilda": Color("#b5603a"),
	"aldous": Color("#4f8a5b"),
	"fern": Color("#d8b84a"),
	"bram": Color("#4a74b8"),
}


func _spawned() -> Node3D:
	var root := Node3D.new()
	add_child_autofree(root)
	VillagerVisuals.spawn(root)
	return root


func _first_material(node: Node) -> StandardMaterial3D:
	for found: Node in node.find_children("*", "MeshInstance3D", true, false):
		var mi := found as MeshInstance3D
		var mat := mi.get_active_material(0) as StandardMaterial3D
		if mat != null:
			return mat
	return null


func test_four_villagers_spawn_at_their_tiles() -> void:
	var plain := ModelCatalog.instantiate("player")
	add_child_autofree(plain)
	var base := _first_material(plain).albedo_color
	var root := _spawned()
	eq(root.get_child_count(), Villagers.ALL.size())
	eq(Villagers.ALL.size(), 4)
	var seen: Array[Color] = []
	for v: Dictionary in Villagers.ALL:
		var id: String = v["id"]
		var node := root.get_node_or_null("Villager_%s" % id) as Node3D
		assert_not_null(node, id)
		if node == null:
			continue
		var x: int = v["x"]
		var y: int = v["y"]
		assert_almost_eq(node.position, Vector3(x + 0.5, 0.0, y + 0.5), Vector3.ONE * 1e-5)
		var facing: String = v["facing"]
		assert_almost_eq(node.rotation.y, PlayerVisual.FACING_YAW[facing], 1e-5)
		var anim := node.find_children("*", "AnimationPlayer", true, false)[0] as AnimationPlayer
		eq(anim.current_animation, PlayerClips.IDLE)
		eq(anim.get_animation(PlayerClips.IDLE).loop_mode, Animation.LOOP_LINEAR)
		var mat := _first_material(node)
		assert_not_null(mat)
		if mat != null:
			seen.append(mat.albedo_color)
			assert_true(mat.albedo_color.is_equal_approx(base * TINTS[id]), "%s tint" % id)
	# Each villager reads differently.
	for i: int in seen.size():
		for j: int in range(i + 1, seen.size()):
			assert_false(seen[i].is_equal_approx(seen[j]), "villagers %d and %d differ" % [i, j])


func test_player_model_keeps_its_look() -> void:
	var plain := ModelCatalog.instantiate("player")
	add_child_autofree(plain)
	var before := _first_material(plain).albedo_color
	_spawned()
	var again := ModelCatalog.instantiate("player")
	add_child_autofree(again)
	assert_true(_first_material(again).albedo_color.is_equal_approx(before))


func test_villagers_only_in_lowmere() -> void:
	var state := TestStates.fresh()
	for zone: String in ["farm", "house", "lowmere"]:
		var view := ZoneView.new()
		add_child_autofree(view)
		view.build(zone, state)
		var found := view.find_children("Villager_*", "", true, false).size()
		eq(found, 4 if zone == "lowmere" else 0, zone)
