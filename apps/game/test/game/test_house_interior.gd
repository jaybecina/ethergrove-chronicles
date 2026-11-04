extends CoreTest
## The farmhouse interior (ported from apps/web/src/scene/HouseInterior.tsx and Furniture.tsx): low walls, the six
## furniture pieces at the web positions, the lamp's warm light, the stove and the exit mat.

## key, x, z, rotY, width: Furniture.tsx with the bed tile at (6, 1).
const PIECES: Array[Array] = [
	["bed", 6.5, 1.55, PI, 1.05],
	["rug", 3.5, 2.9, 0.0, 2.2],
	["table", 1.7, 1.7, 0.0, 0.9],
	["chair", 2.5, 1.8, -PI / 2.0, 0.5],
	["potted-plant", 6.4, 4.4, 0.0, 0.45],
	["lamp", 1.4, 4.4, 0.0, 0.4],
]


func _house_view() -> ZoneView:
	var view := ZoneView.new()
	add_child_autofree(view)
	view.build("house", TestStates.fresh())
	return view


func _house_grid() -> Dictionary:
	return d(d(TestStates.fresh()["maps"])["house"])


## The x/z extent of a node's meshes in world space.
func _world_width(root: Node3D) -> float:
	var box := AABB()
	var first := true
	for node: Node in root.find_children("*", "MeshInstance3D", true, false):
		var mi := node as MeshInstance3D
		var b: AABB = mi.global_transform * mi.get_aabb()
		box = b if first else box.merge(b)
		first = false
	return maxf(box.size.x, box.size.z)


func test_pieces_table_matches_furniture_tsx() -> void:
	var pieces := HouseInterior.pieces(Vector2i(6, 1))
	eq(pieces.size(), 6)
	for i: int in PIECES.size():
		var want: Array = PIECES[i]
		var got: Dictionary = pieces[i]
		var key: String = want[0]
		eq(got["key"], key)
		for f: int in 4:
			var field: String = ["x", "z", "rotY", "width"][f]
			var got_v: float = got[field]
			var want_v: float = want[f + 1]
			assert_almost_eq(got_v, want_v, 1e-5, "%s %s" % [key, field])


func test_house_has_six_furniture_pieces() -> void:
	var view := _house_view()
	var found: Array[Node] = view.find_children("Furniture_*", "Node3D", true, false)
	eq(found.size(), 6)
	for want: Array in PIECES:
		var key: String = want[0]
		var x: float = want[1]
		var z: float = want[2]
		var rot_y: float = want[3]
		var width: float = want[4]
		var node := view.find_child("Furniture_%s" % key, true, false) as Node3D
		assert_not_null(node, key)
		if node == null:
			continue
		var pos := node.global_position
		assert_almost_eq(pos.x, x, 1e-4, key)
		assert_almost_eq(pos.z, z, 1e-4, key)
		assert_almost_eq(angle_difference(node.global_rotation.y, rot_y), 0.0, 1e-4, "%s turn" % key)
		assert_almost_eq(_world_width(node), width, 0.02, "%s width" % key)
	var bed_feature := view.find_child("Feature_bed", true, false)
	assert_not_null(bed_feature.find_child("Furniture_bed", true, false), "bed sits on the bed feature")


func test_house_walls_are_low() -> void:
	var view := _house_view()
	var walls: Array[Node] = view.find_children("Wall_*", "MeshInstance3D", true, false)
	var expected := 0
	for t: Dictionary in a(_house_grid()["tiles"]):
		if t["kind"] == "wall":
			expected += 1
	eq(walls.size(), expected)
	for node: Node in walls:
		var mi := node as MeshInstance3D
		var box := mi.mesh as BoxMesh
		assert_almost_eq(box.size.y, 0.7, 1e-5)
		assert_almost_eq(mi.global_position.y, 0.35, 1e-5)
		var mat := mi.get_active_material(0) as StandardMaterial3D
		assert_true(mat.albedo_color.is_equal_approx(Color("#e8dcc4")))


func test_lamp_light_is_warm() -> void:
	var view := _house_view()
	var light := view.find_child("LampLight", true, false) as OmniLight3D
	assert_not_null(light)
	assert_almost_eq(light.global_position, Vector3(1.4, 1.3, 4.4), Vector3.ONE * 1e-5)
	assert_true(light.light_color.is_equal_approx(Color("#ffcf8a")))
	assert_almost_eq(light.light_energy, 1.6, 1e-5)
	assert_almost_eq(light.omni_range, 5.0, 1e-5)


func test_house_floor_and_no_lamp_outside() -> void:
	var view := _house_view()
	var ground := view.get_node("Ground") as MeshInstance3D
	eq(ground.mesh.get_faces().size() / 3, a(_house_grid()["tiles"]).size() * 2)
	var farm := ZoneView.new()
	add_child_autofree(farm)
	farm.build("farm", TestStates.fresh())
	assert_null(farm.find_child("LampLight", true, false))
	eq(farm.find_children("Furniture_*", "", true, false).size(), 0)


func test_stove_has_a_glowing_door() -> void:
	var view := _house_view()
	var stove := view.find_child("Feature_stove", true, false)
	assert_not_null(stove)
	var body := stove.get_node("Body") as MeshInstance3D
	assert_almost_eq((body.mesh as BoxMesh).size, Vector3(0.9, 0.9, 0.7), Vector3.ONE * 1e-5)
	var door := stove.get_node("Door") as MeshInstance3D
	var mat := door.get_active_material(0) as StandardMaterial3D
	assert_true(mat.emission_enabled)
	assert_gt(mat.emission_energy_multiplier, 0.5)
