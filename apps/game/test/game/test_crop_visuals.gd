extends CoreTest
## CropVisuals and the soil/crop side of ZoneView.sync, ported from apps/web/src/scene/CropModels.tsx, Crops.tsx,
## Tiles.tsx and palette.ts.

## CropModels.tsx cropModel() per crop at the stages seed, sprout, young and mature ("" = the procedural speck).
const MODEL_TABLE: Dictionary[String, Array] = {
	"turnip": ["", "crop-sprout", "crop-young", "crop-turnip"],
	"potato": ["", "crop-sprout", "crop-young", "crop-young"],
	"strawberry": ["", "crop-sprout", "crop-young", "crop-young"],
	"tomato": ["", "crop-sprout", "crop-young", "crop-young"],
	"corn": ["", "corn-a", "corn-b", "corn-d"],
	"melon": ["", "crop-sprout", "crop-young", "crop-melon"],
	"pumpkin": ["", "crop-sprout", "crop-young", "crop-pumpkin"],
	"eggplant": ["", "crop-sprout", "crop-young", "crop-young"],
}


## A crop of `id` at `stage` (the first age that reaches it).
func _crop(id: String, stage: String) -> Dictionary:
	var days: int = d(CropData.CROPS[id])["days"]
	var age := 0
	match stage:
		"sprout":
			age = 1
		"young":
			age = ceili(days / 3.0)
		"mature":
			age = days
	var crop := {"id": id, "age": age, "regrowing": false}
	eq(Crops.crop_stage(crop), stage, "%s at age %d" % [id, age])
	return crop


func _view(state: Dictionary) -> ZoneView:
	var view := ZoneView.new()
	add_child_autofree(view)
	view.build("farm", state)
	return view


## A blank farm with one tilled tile, made with the hoe; returns [state, tile].
func _tilled() -> Array:
	var state := TestStates.blank_farm(TestStates.fresh())
	var farm := farm_of(state)
	var width: int = farm["width"]
	var tiles: Array = farm["tiles"]
	var spot := Vector2i(-1, -1)
	for i: int in tiles.size():
		var t: Dictionary = tiles[i]
		var west: Variant = Grid.tile_at(farm, i % width - 1, i / width)
		if t["kind"] == "grass" and west != null and d(west)["kind"] == "grass":
			spot = Vector2i(i % width, i / width)
			break
	var s := TestStates.stand_at(state, spot.x - 1, spot.y, "e")
	s = Bag.select_hotbar(s, Balance.TOOL_ORDER.find("hoe"))
	s = st(Tools.use_tool(s))
	eq(d(TestStates.tile_of(s, spot.x, spot.y))["kind"], "tilled")
	return [s, spot]


func _water(state: Dictionary, spot: Vector2i) -> Dictionary:
	var tile := d(TestStates.tile_of(state, spot.x, spot.y)).duplicate(true)
	tile["watered"] = true
	return TestStates.with_tile(state, spot.x, spot.y, tile)


## One watered night: Crops.grow_crops on the farm.
func _grow(state: Dictionary, spot: Vector2i) -> Dictionary:
	var out := _water(state, spot)
	var grown := Crops.grow_crops(farm_of(out))
	d(out["maps"])["farm"] = grown["grid"]
	return out


func _model_key(view: ZoneView, spot: Vector2i) -> String:
	var node := view.crop_node(spot.x, spot.y)
	assert_not_null(node, "crop node at %s" % spot)
	if node == null:
		return "<none>"
	return String(node.get_child(0).name)


func _soil_albedo(view: ZoneView, spot: Vector2i) -> Color:
	var soil := view.soil_node(spot.x, spot.y)
	assert_not_null(soil, "soil at %s" % spot)
	if soil == null:
		return Color()
	return (soil.material_override as StandardMaterial3D).albedo_color


func test_model_for_each_crop_and_stage() -> void:
	var stages: Array[String] = ["seed", "sprout", "young", "mature"]
	eq(MODEL_TABLE.size(), CropData.CROPS.size())
	for id: String in MODEL_TABLE:
		for k: int in stages.size():
			var want: String = MODEL_TABLE[id][k]
			eq(CropVisuals.model_for(_crop(id, stages[k])), want, "%s %s" % [id, stages[k]])
	# Corn swaps to the taller young model from two thirds of its days (age 8 of 12).
	eq(CropVisuals.model_for({"id": "corn", "age": 7, "regrowing": false}), "corn-b")
	eq(CropVisuals.model_for({"id": "corn", "age": 8, "regrowing": false}), "corn-c")
	# A regrowing crop is young.
	eq(CropVisuals.model_for({"id": "strawberry", "age": 4, "regrowing": true}), "crop-young")


func test_fit_table() -> void:
	eq(CropVisuals.fit_for("crop-sprout"), {"width": 0.45})
	eq(CropVisuals.fit_for("crop-young"), {"width": 0.7})
	eq(CropVisuals.fit_for("crop-turnip"), {"width": 0.55})
	eq(CropVisuals.fit_for("crop-melon"), {"width": 0.75})
	eq(CropVisuals.fit_for("crop-pumpkin"), {"width": 0.8})
	eq(CropVisuals.fit_for("corn-a"), {"height": 0.35})
	eq(CropVisuals.fit_for("corn-b"), {"height": 0.8})
	eq(CropVisuals.fit_for("corn-c"), {"height": 1.2})
	eq(CropVisuals.fit_for("corn-d"), {"height": 1.55})


func test_soil_colors() -> void:
	# palette.ts COLORS.tilled / COLORS.watered, which Tiles.tsx groundColor uses for tilled soil.
	assert_true(CropVisuals.soil_color({"kind": "tilled", "watered": false}).is_equal_approx(Color("#6e4a2e")))
	assert_true(CropVisuals.soil_color({"kind": "tilled", "watered": true}).is_equal_approx(Color("#47301d")))
	eq(CropVisuals.scale_for({"id": "turnip", "age": 1, "regrowing": false}), 1.0)


func test_sync_tills_soil() -> void:
	var state := TestStates.blank_farm(TestStates.fresh())
	var view := _view(state)
	var made := _tilled()
	var tilled: Dictionary = made[0]
	var spot: Vector2i = made[1]
	assert_null(view.soil_node(spot.x, spot.y))
	eq(view.sync(tilled), 1)
	var soil := view.soil_node(spot.x, spot.y)
	assert_not_null(soil)
	eq(String(soil.name), "Soil_%d_%d" % [spot.x, spot.y])
	assert_almost_eq(soil.position, Vector3(spot.x + 0.5, 0.02, spot.y + 0.5), Vector3.ONE * 1e-5)
	assert_almost_eq((soil.mesh as BoxMesh).size, Vector3(0.96, 0.04, 0.96), Vector3.ONE * 1e-5)
	# Hammered back to grass: the overlay goes.
	eq(view.sync(TestStates.with_tile(tilled, spot.x, spot.y, {"kind": "grass"})), 1)
	assert_false(is_instance_valid(soil))
	assert_null(view.soil_node(spot.x, spot.y))


func test_watered_tile_is_darker() -> void:
	var made := _tilled()
	var spot: Vector2i = made[1]
	var view := _view(d(made[0]))
	var dry := _soil_albedo(view, spot)
	eq(view.sync(_water(d(made[0]), spot)), 1)
	var wet := _soil_albedo(view, spot)
	assert_true(dry.is_equal_approx(Color("#6e4a2e")))
	assert_true(wet.is_equal_approx(Color("#47301d")))
	assert_lt(wet.get_luminance(), dry.get_luminance())
	# Two shared materials, not one per tile.
	var other := _view(_water(d(made[0]), spot))
	assert_same(
		other.soil_node(spot.x, spot.y).material_override, view.soil_node(spot.x, spot.y).material_override
	)


func test_sync_plants_and_grows_a_crop() -> void:
	var made := _tilled()
	var state: Dictionary = made[0]
	var spot: Vector2i = made[1]
	var view := _view(state)
	assert_null(view.crop_node(spot.x, spot.y))
	state = st(Crops.plant_at(state, spot.x, spot.y, "seed:turnip"))
	eq(view.sync(state), 1)
	var crop := view.crop_node(spot.x, spot.y)
	eq(String(crop.name), "Crop_%d_%d" % [spot.x, spot.y])
	eq(_model_key(view, spot), "Seed")
	assert_almost_eq(crop.position, Vector3(spot.x + 0.5, 0.0, spot.y + 0.5), Vector3.ONE * 1e-5)
	# Planting pops the crop from 0.8.
	assert_almost_eq(crop.scale.x, 0.8, 1e-5)
	var width: int = farm_of(state)["width"]
	state = _grow(state, spot)
	eq(view.sync(state), 1)
	eq(_model_key(view, spot), "crop-sprout")
	crop = view.crop_node(spot.x, spot.y)
	var model := crop.get_child(0) as Node3D
	assert_almost_eq(model.rotation.y, fmod((spot.y * width + spot.x) * 2.3, 6.28), 1e-4)
	assert_gt(model.find_children("*", "MeshInstance3D", true, false).size(), 0)
	for i: int in 3:
		state = _grow(state, spot)
		view.sync(state)
	eq(_model_key(view, spot), "crop-turnip")
	# A view built from the state shows the crop at rest (no pop).
	var fresh_view := _view(state)
	eq(fresh_view.crop_node(spot.x, spot.y).scale, Vector3.ONE)


func test_sync_removes_crop_on_harvest_or_death() -> void:
	var made := _tilled()
	var state: Dictionary = made[0]
	var spot: Vector2i = made[1]
	state = st(Crops.plant_at(state, spot.x, spot.y, "seed:turnip"))
	for i: int in 4:
		state = _grow(state, spot)
	var view := _view(state)
	var crop := view.crop_node(spot.x, spot.y)
	assert_not_null(crop)
	var harvested := st(Crops.harvest_at(state, spot.x, spot.y))
	eq(view.sync(harvested), 1)
	assert_false(is_instance_valid(crop))
	assert_null(view.crop_node(spot.x, spot.y))
	assert_not_null(view.soil_node(spot.x, spot.y), "the soil stays")
	# A crop of another season dies, leaving the soil.
	var view2 := _view(state)
	var killed := state.duplicate(true)
	d(killed["maps"])["farm"] = Crops.kill_out_of_season(farm_of(state), "summer")["grid"]
	eq(view2.sync(killed), 1)
	assert_null(view2.crop_node(spot.x, spot.y))
	assert_not_null(view2.soil_node(spot.x, spot.y))


func test_mature_fruit_crop_shows_fruit() -> void:
	var made := _tilled()
	var spot: Vector2i = made[1]
	var ripe := TestStates.with_tile(
		d(made[0]), spot.x, spot.y, {"kind": "tilled", "watered": false, "crop": _crop("potato", "mature")}
	)
	var view := _view(ripe)
	var crop := view.crop_node(spot.x, spot.y)
	eq(String(crop.get_child(0).name), "crop-young")
	eq(crop.find_children("Fruit_*", "", false, false).size(), 3)
	# Turnips carry their own mature model: no procedural fruit.
	var turnip := TestStates.with_tile(
		d(made[0]), spot.x, spot.y, {"kind": "tilled", "watered": false, "crop": _crop("turnip", "mature")}
	)
	eq(view.sync(turnip), 1)
	eq(view.crop_node(spot.x, spot.y).find_children("Fruit_*", "", false, false).size(), 0)
