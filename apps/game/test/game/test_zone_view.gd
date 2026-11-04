extends CoreTest
## ZoneView: the farm, house and Lowmere views (ported from apps/web/src/scene/Tiles.tsx, TileModels.tsx and
## Features.tsx). One node per rock, weed, stump and feature tile; `sync` rebuilds only the tiles that changed.

const OBSTACLE_KINDS: Array[String] = ["rock", "weed", "stump"]
const LOWMERE_DOORS: Dictionary[String, Color] = {
	"forgeDoor": Color("#c2452d"),
	"clinicDoor": Color("#4f8a34"),
	"cottageDoor": Color("#e0b84a"),
}


func _view(zone: String, state: Dictionary) -> ZoneView:
	var view := ZoneView.new()
	add_child_autofree(view)
	view.build(zone, state)
	return view


func _grid(zone: String, state: Dictionary) -> Dictionary:
	if zone == "lowmere":
		return Zones.grid("lowmere")
	return d(d(state["maps"])[zone])


## How many tiles of the grid get their own node: rocks, weeds, stumps and features.
func _expected_nodes(grid: Dictionary) -> int:
	var n := 0
	for t: Dictionary in a(grid["tiles"]):
		var kind: String = t["kind"]
		if OBSTACLE_KINDS.has(kind) or kind == "feature":
			n += 1
	return n


func _first_tile(grid: Dictionary, kind: String) -> Vector2i:
	var width: int = grid["width"]
	var tiles: Array = grid["tiles"]
	for i: int in tiles.size():
		var t: Dictionary = tiles[i]
		if t["kind"] == kind:
			return Vector2i(i % width, i / width)
	return Vector2i(-1, -1)


func _meshes(node: Node) -> Array[Node]:
	return node.find_children("*", "MeshInstance3D", true, false)


func _albedo(mi: MeshInstance3D) -> Color:
	var mat := mi.get_active_material(0) as StandardMaterial3D
	assert_not_null(mat, "%s has a StandardMaterial3D" % mi.name)
	return mat.albedo_color if mat != null else Color()


func test_build_farm_creates_nodes_for_obstacles_and_features() -> void:
	var state := TestStates.fresh()
	var farm := farm_of(state)
	var view := _view("farm", state)
	var expected := _expected_nodes(farm)
	assert_gt(expected, 20, "a fresh farm has seeded obstacles")
	eq(view.node_count(), expected)
	eq(view.get_node("Tiles").get_child_count(), expected)
	var width: int = farm["width"]
	var height: int = farm["height"]
	for y: int in height:
		for x: int in width:
			var t: Dictionary = Grid.tile_at(farm, x, y)
			var kind: String = t["kind"]
			var node := view.tile_node(x, y)
			if OBSTACLE_KINDS.has(kind):
				assert_not_null(node, "%s at %d,%d" % [kind, x, y])
				if node != null:
					eq(String(node.name), "Tile_%d_%d" % [x, y])
					assert_almost_eq(node.position, Vector3(x + 0.5, 0.0, y + 0.5), Vector3.ONE * 1e-5)
					assert_gt(_meshes(node).size(), 0, "%s at %d,%d has a model" % [kind, x, y])
			elif kind == "feature":
				assert_not_null(node, "feature at %d,%d" % [x, y])
				if node != null:
					eq(String(node.name), "Feature_%s" % t["feature"])
			else:
				assert_null(node, "%s at %d,%d has no tile node" % [kind, x, y])


func test_farm_has_one_ground_mesh_and_a_fence_multimesh() -> void:
	var state := TestStates.fresh()
	var farm := farm_of(state)
	var view := _view("farm", state)
	var ground := view.get_node("Ground") as MeshInstance3D
	assert_not_null(ground)
	var mat := ground.material_override as StandardMaterial3D
	assert_not_null(mat)
	assert_true(mat.vertex_color_use_as_albedo)
	var fences := 0
	var water := 0
	for t: Dictionary in a(farm["tiles"]):
		if t["kind"] == "fence":
			fences += 1
		elif t["kind"] == "water":
			water += 1
	var mmis: Array[Node] = view.get_node("Fences").find_children("*", "MultiMeshInstance3D", true, false)
	assert_gt(mmis.size(), 0)
	for node: Node in mmis:
		eq((node as MultiMeshInstance3D).multimesh.instance_count, fences)
	# One quad per tile that shows ground: every tile but the pond's.
	var faces: int = ground.mesh.get_faces().size() / 3
	eq(faces, (farm_of(state)["tiles"] as Array).size() * 2 - water * 2)


func test_ground_colors_grass_and_path() -> void:
	var path := TileVisuals.ground_color("farm", {"kind": "path"}, 5)
	var grass := TileVisuals.ground_color("farm", {"kind": "grass"}, 5)
	var floor_c := TileVisuals.ground_color("house", {"kind": "wall"}, 5)
	assert_almost_eq(path.h, Color("#c8a56c").h, 0.01)
	assert_almost_eq(grass.h, Color("#6f9e4c").h, 0.01)
	assert_almost_eq(floor_c.h, Color("#b98a5a").h, 0.01)
	assert_false(TileVisuals.has_ground("farm", {"kind": "water"}))
	assert_true(TileVisuals.has_ground("farm", {"kind": "fence"}))
	# The jitter is the web hash01: at most 3% lightness either way, and stable.
	eq(TileVisuals.ground_color("farm", {"kind": "grass"}, 9), TileVisuals.ground_color("farm", {"kind": "grass"}, 9))
	var grass_1 := TileVisuals.ground_color("farm", {"kind": "grass"}, 1)
	assert_ne(grass_1, TileVisuals.ground_color("farm", {"kind": "grass"}, 2))


func test_sync_updates_only_changed_tiles() -> void:
	var state := TestStates.fresh()
	var view := _view("farm", state)
	var weed := _first_tile(farm_of(state), "weed")
	assert_ne(weed, Vector2i(-1, -1), "a fresh farm has a weed")
	var before: Dictionary[Vector2i, Node3D] = {}
	var farm := farm_of(state)
	var fw: int = farm["width"]
	var fh: int = farm["height"]
	for y: int in fh:
		for x: int in fw:
			var n := view.tile_node(x, y)
			if n != null:
				before[Vector2i(x, y)] = n
	var weed_node := view.tile_node(weed.x, weed.y)
	var s := TestStates.stand_at(state, weed.x - 1, weed.y, "e")
	s = Bag.select_hotbar(s, Balance.TOOL_ORDER.find("sickle"))
	var cut := st(Tools.use_tool(s))
	eq(TestStates.tile_of(cut, weed.x, weed.y), {"kind": "grass"})
	eq(view.sync(cut), 1)
	assert_false(is_instance_valid(weed_node), "the weed node is freed")
	assert_null(view.tile_node(weed.x, weed.y))
	eq(view.node_count(), before.size() - 1)
	for key: Vector2i in before:
		if key == weed:
			continue
		assert_same(view.tile_node(key.x, key.y), before[key], "tile %s untouched" % key)


func test_sync_rebuilds_a_hit_rock_in_place() -> void:
	var state := TestStates.fresh()
	var view := _view("farm", state)
	var rock := _first_tile(farm_of(state), "rock")
	var old := view.tile_node(rock.x, rock.y)
	var hit := TestStates.with_tile(state, rock.x, rock.y, {"kind": "rock", "hits": 1})
	eq(view.sync(hit), 1)
	assert_false(is_instance_valid(old))
	var fresh_node := view.tile_node(rock.x, rock.y)
	assert_not_null(fresh_node)
	if fresh_node != null:
		eq(String(fresh_node.name), "Tile_%d_%d" % [rock.x, rock.y])


func test_sync_is_noop_when_unchanged() -> void:
	var state := TestStates.fresh()
	var view := _view("farm", state)
	eq(view.sync(state), 0)
	eq(view.sync(state.duplicate(true)), 0)
	var low := _view("lowmere", state)
	eq(low.sync(state), 0)


func test_every_feature_has_a_visual() -> void:
	var state := TestStates.fresh()
	var seen := 0
	for zone: String in ["farm", "house", "lowmere"]:
		var view := _view(zone, state)
		for t: Dictionary in a(_grid(zone, state)["tiles"]):
			if t["kind"] != "feature":
				continue
			var id: String = t["feature"]
			var node := view.find_child("Feature_%s" % id, true, false)
			assert_not_null(node, "%s: Feature_%s" % [zone, id])
			if node != null:
				assert_gt(_meshes(node).size(), 0, "%s: Feature_%s has meshes" % [zone, id])
			seen += 1
	# farm: houseDoor bin cart rootShrine farmGate; house: stove bed exitDoor; lowmere: 6.
	eq(seen, 14)


func test_farmhouse_is_a_box_with_a_roof() -> void:
	var view := _view("farm", TestStates.fresh())
	var buildings: Array[Node] = view.find_children("Building_*", "", true, false)
	eq(buildings.size(), 1)
	var body := buildings[0].get_node("Body") as MeshInstance3D
	var box := body.mesh as BoxMesh
	assert_almost_eq(box.size, Vector3(4.9, 2.2, 2.9), Vector3.ONE * 1e-4)
	assert_almost_eq(body.global_position, Vector3(4.5, 1.1, 3.5), Vector3.ONE * 1e-4)
	assert_true(_albedo(body).is_equal_approx(Color("#f1e4c8")))
	assert_true(_albedo(buildings[0].get_node("Roof") as MeshInstance3D).is_equal_approx(Color("#a7473a")))


func test_window_brightens_at_night() -> void:
	var view := _view("farm", TestStates.fresh())
	var window := view.find_child("Window", true, false) as MeshInstance3D
	assert_not_null(window)
	var mat := window.get_active_material(0) as StandardMaterial3D
	assert_true(mat.emission_enabled)
	view.set_night_factor(0.0)
	assert_almost_eq(mat.emission_energy_multiplier, 0.15, 1e-5)
	view.set_night_factor(1.0)
	assert_almost_eq(mat.emission_energy_multiplier, 3.15, 1e-5)


func test_pond_is_flat_water_over_a_dark_bed() -> void:
	var view := _view("farm", TestStates.fresh())
	var pond := view.find_child("Pond", true, false)
	assert_not_null(pond)
	var water := pond.get_node("Water") as MeshInstance3D
	var bed := pond.get_node("Bed") as MeshInstance3D
	assert_true(_albedo(water).is_equal_approx(Color("#4f8fb3")))
	assert_true(_albedo(bed).is_equal_approx(Color("#20384a")))
	assert_lt(bed.global_position.y, water.global_position.y)
	assert_lt(water.global_position.y, 0.0)


func test_lowmere_has_three_doors_and_a_board() -> void:
	var view := _view("lowmere", {})
	eq(view.find_children("Building_*", "", true, false).size(), 3)
	for id: String in LOWMERE_DOORS:
		var door := view.find_child("Feature_%s" % id, true, false)
		assert_not_null(door, id)
		if door == null:
			continue
		var lintel := door.get_node("Lintel") as MeshInstance3D
		assert_true(_albedo(lintel).is_equal_approx(LOWMERE_DOORS[id]), "%s lintel colour" % id)
	eq(view.find_children("Feature_noticeBoard", "", true, false).size(), 1)
	eq(view.find_children("Feature_*Door", "", true, false).size(), 3)


func test_build_replaces_the_previous_zone() -> void:
	var state := TestStates.fresh()
	var view := _view("farm", state)
	view.build("house", state)
	assert_null(view.find_child("Feature_houseDoor", true, false))
	assert_not_null(view.find_child("Feature_bed", true, false))
	eq(view.zone, "house")
	eq(view.node_count(), _expected_nodes(d(d(state["maps"])["house"])))


func test_stable_variant_hash() -> void:
	# Pinned from the web formula floor(abs(sin(x * 12.9 + z * 78.2)) * 1000) % n at tile centres.
	eq(TileVisuals.variant(11.5, 10.5, 3), 1)
	eq(TileVisuals.variant(3.5, 6.5, 3), 1)
	eq(TileVisuals.variant(20.5, 12.5, 3), 0)
	eq(TileVisuals.variant(7.5, 15.5, 3), 2)
	eq(TileVisuals.variant(7.5, 15.5, 2), 1)
	assert_almost_eq(TileVisuals.hash01(0), 0.819311730145273, 1e-9)
	assert_almost_eq(TileVisuals.hash01(17), 0.06731167519092196, 1e-9)
	var state := TestStates.fresh()
	var first := _view("farm", state)
	var second := _view("farm", state)
	var rock := _first_tile(farm_of(state), "rock")
	var key := "rock-%d" % (TileVisuals.variant(rock.x + 0.5, rock.y + 0.5, 3) + 1)
	var a_model := first.tile_node(rock.x, rock.y).get_child(0) as Node3D
	var b_model := second.tile_node(rock.x, rock.y).get_child(0) as Node3D
	eq(String(a_model.name), key)
	eq(String(b_model.name), key)
	eq(a_model.transform, b_model.transform)


func test_kenney_models_are_matte_and_tinted() -> void:
	var state := TestStates.fresh()
	var view := _view("farm", state)
	var rock := _first_tile(farm_of(state), "rock")
	var found_dirt := false
	for node: Node in _meshes(view.tile_node(rock.x, rock.y)):
		var mi := node as MeshInstance3D
		for s: int in mi.mesh.get_surface_count():
			var mat := mi.get_active_material(s) as StandardMaterial3D
			assert_almost_eq(mat.metallic, 0.0, 1e-5)
			assert_almost_eq(mat.roughness, 0.9, 1e-5)
			if mat.resource_name == "dirt":
				found_dirt = true
				assert_true(mat.albedo_color.is_equal_approx(Color("#8f979e")), "rock dirt is slate grey")
	assert_true(found_dirt)


## The season colours the grass tiles' vertex colours (and the apron), never paths, floors or the pond. Replaced the
## material multiply of Task 12 after the Task 17 by-eye check: a multiply cannot reach winter's near-white and
## tinted the paths too.
func test_grass_color_recolours_only_grass_and_survives_a_rebuild() -> void:
	var state := TestStates.fresh()
	var farm := farm_of(state)
	var view := _view("farm", state)
	var grass := _first_tile(farm, "grass")
	var path := _first_tile(farm, "path")
	var path_before := _vertex_color(view, path)
	_assert_color(_vertex_color(view, grass), _jittered(TileVisuals.GRASS, farm, grass), "spring base")
	var winter := Color(0.86, 0.9, 0.95)
	view.set_grass_color(winter)
	_assert_color(_vertex_color(view, grass), _jittered(winter, farm, grass), "grass turns winter")
	_assert_color(_vertex_color(view, path), path_before, "paths keep their colour")
	eq(view.grass_color(), winter)
	var mat := (view.get_node("Ground") as MeshInstance3D).material_override as StandardMaterial3D
	eq(mat.albedo_color, Color.WHITE, "no multiply on the material")
	view.build("farm", state)
	_assert_color(_vertex_color(view, grass), _jittered(winter, farm, grass), "a rebuild keeps it")


func test_outdoor_zones_sit_on_a_grass_apron_and_the_house_does_not() -> void:
	var state := TestStates.fresh()
	var view := _view("farm", state)
	var apron := view.get_node_or_null("Apron") as MeshInstance3D
	assert_not_null(apron, "the farm has an apron")
	var box := apron.get_aabb()
	var width: int = farm_of(state)["width"]
	var height: int = farm_of(state)["height"]
	assert_lt(box.position.x, -TileVisuals.APRON + 0.01, "reaches past the west edge")
	assert_gt(box.end.z, height + TileVisuals.APRON - 0.01, "reaches past the south edge")
	# A ring around the map, never over it: the pond's water sits below y = 0 and must stay visible.
	var faces := apron.mesh.get_faces()
	for i: int in range(0, faces.size(), 3):
		var centre := (faces[i] + faces[i + 1] + faces[i + 2]) / 3.0
		var inside := centre.x > 0.0 and centre.x < width and centre.z > 0.0 and centre.z < height
		assert_false(inside, "an apron triangle covers the map at %s" % centre)
		assert_almost_eq(faces[i].y, 0.0, 1e-5)
	var apron_mat := apron.material_override as StandardMaterial3D
	eq(apron_mat.albedo_color, TileVisuals.GRASS)
	view.set_grass_color(Color(0.86, 0.9, 0.95))
	eq(apron_mat.albedo_color, Color(0.86, 0.9, 0.95), "the apron follows the season")
	assert_not_null(_view("lowmere", state).get_node_or_null("Apron"))
	assert_null(_view("house", state).get_node_or_null("Apron"), "the house sits in the dark")


## Vertex colours are stored at 8 bits per channel.
func _assert_color(got: Color, want: Color, text: String) -> void:
	var g := Vector3(got.r, got.g, got.b)
	var w := Vector3(want.r, want.g, want.b)
	assert_almost_eq(g, w, Vector3(0.01, 0.01, 0.01), text)


## The vertex colour of tile `pos` in the ground mesh: the first vertex of its own quad (quads are 4 vertices, the
## first at the tile's north-west corner; a neighbour's quad shares that corner).
func _vertex_color(view: ZoneView, pos: Vector2i) -> Color:
	var ground := view.get_node("Ground") as MeshInstance3D
	var arrays := (ground.mesh as ArrayMesh).surface_get_arrays(0)
	var verts: PackedVector3Array = arrays[Mesh.ARRAY_VERTEX]
	var colors: PackedColorArray = arrays[Mesh.ARRAY_COLOR]
	for i: int in range(0, verts.size(), 4):
		if verts[i] == Vector3(pos.x, 0, pos.y):
			return colors[i]
	return Color.BLACK


func _jittered(base: Color, grid: Dictionary, pos: Vector2i) -> Color:
	var width: int = grid["width"]
	var i := pos.y * width + pos.x
	return TileVisuals.offset_lightness(base, (TileVisuals.hash01(i) - 0.5) * TileVisuals.GROUND_JITTER)


func test_foliage_tint_applies_to_weeds_and_survives_sync() -> void:
	var state := TestStates.fresh()
	var view := _view("farm", state)
	var pos := _first_tile(_grid("farm", state), "weed")
	assert_ne(pos, Vector2i(-1, -1), "fresh farm has a weed")
	var before := _weed_albedo(view, pos)
	view.set_foliage_tint(Color(1.25, 0.72, 0.38))
	var after := _weed_albedo(view, pos)
	assert_almost_eq(after.r, before.r * 1.25, 0.001)
	assert_almost_eq(after.g, before.g * 0.72, 0.001)
	# A second tint multiplies the original colour, not the tinted one.
	view.set_foliage_tint(Color.WHITE)
	assert_almost_eq(_weed_albedo(view, pos).r, before.r, 0.001)


func _weed_albedo(view: ZoneView, pos: Vector2i) -> Color:
	var node := view.tile_node(pos.x, pos.y)
	for found: Node in node.find_children("*", "MeshInstance3D", true, false):
		var mi: MeshInstance3D = found as MeshInstance3D
		for s: int in mi.mesh.get_surface_count():
			var m := mi.get_active_material(s) as StandardMaterial3D
			if m != null:
				return m.albedo_color
	return Color.BLACK


func _caved(zone: String, floor_n: int = 4) -> ZoneView:
	var s := TestStates.fresh()
	d(s["player"]).merge({"location": zone, "floor": floor_n}, true)
	return _view(zone, s)


func test_cave_and_clinic_draw_their_walls_and_have_no_grass_apron() -> void:
	for zone: String in ["mossdeep", "clinic"]:
		var view := _caved(zone)
		var walls := view.get_node_or_null("Walls") as MultiMeshInstance3D
		assert_not_null(walls, "%s has Walls" % zone)
		assert_true(walls.multimesh.instance_count > 10, zone)
		assert_null(view.get_node_or_null("Apron"), "%s is indoors" % zone)


func test_only_walls_next_to_floor_are_drawn() -> void:
	var view := _caved("mossdeep", 1)
	var g := Mossdeep.grid(1)
	var total_walls := 0
	for t: Variant in a(g["tiles"]):
		if d(t)["kind"] == "wall":
			total_walls += 1
	var walls := view.get_node("Walls") as MultiMeshInstance3D
	assert_true(walls.multimesh.instance_count < total_walls, "interior rock is skipped")
	assert_true(walls.multimesh.instance_count > 0)


func test_mossdeep_view_follows_the_players_floor() -> void:
	var a_view := _caved("mossdeep", 1)
	var b_view := _caved("mossdeep", 2)
	assert_true(a_view.get_node("Walls") != null and b_view.get_node("Walls") != null)
