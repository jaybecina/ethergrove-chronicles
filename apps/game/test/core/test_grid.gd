extends GutTest
## Grid rules, ported from packages/core/test/grid.test.ts.


func _small() -> Dictionary:
	return Grid.parse_layout(["#_", "~#"], Layouts.FARM_LEGEND)


func test_parses_farm_layout_to_32x24() -> void:
	var g := Grid.parse_layout(Layouts.FARM_LAYOUT, Layouts.FARM_LEGEND)
	var tiles: Array = g["tiles"]
	assert_eq([g["width"], g["height"], tiles.size()], [32, 24, 768])


func test_parses_house_layout_to_8x6() -> void:
	var g := Grid.parse_layout(Layouts.HOUSE_LAYOUT, Layouts.HOUSE_LEGEND)
	assert_eq([g["width"], g["height"]], [8, 6])


func test_rejects_ragged_rows_and_unknown_characters() -> void:
	var ragged := Grid.parse_layout(["##", "#"], Layouts.FARM_LEGEND)
	assert_push_error("equal length")
	assert_eq(ragged, {"width": 0, "height": 0, "tiles": []})
	var unknown := Grid.parse_layout(["#?"], Layouts.FARM_LEGEND)
	assert_push_error("Unknown layout character")
	assert_eq(unknown, {"width": 0, "height": 0, "tiles": []})


func test_parse_layout_copies_legend_tiles() -> void:
	var g := Grid.parse_layout(["##"], Layouts.FARM_LEGEND)
	var tiles: Array = g["tiles"]
	var first: Dictionary = tiles[0]
	first["kind"] = "grass"
	assert_eq(Layouts.FARM_LEGEND["#"], {"kind": "fence"})
	var at: Dictionary = Grid.tile_at(g, 1, 0)
	assert_eq(at, {"kind": "fence"})


func test_places_every_feature_exactly_once() -> void:
	var farm := Grid.parse_layout(Layouts.FARM_LAYOUT, Layouts.FARM_LEGEND)
	var house := Grid.parse_layout(Layouts.HOUSE_LAYOUT, Layouts.HOUSE_LEGEND)
	assert_eq(Grid.find_feature(farm, "houseDoor"), Vector2i(4, 4))
	assert_eq(Grid.find_feature(farm, "bin"), Vector2i(7, 4))
	assert_eq(Grid.find_feature(farm, "cart"), Vector2i(31, 17))
	assert_eq(Grid.find_feature(house, "bed"), Vector2i(6, 1))
	assert_eq(Grid.find_feature(house, "exitDoor"), Vector2i(3, 5))
	var missing := Grid.find_feature(house, "cart")
	assert_push_error("not found")
	assert_eq(missing, Vector2i(-1, -1))


func test_find_char() -> void:
	assert_eq(Grid.find_char(Layouts.HOUSE_LAYOUT, "S"), Vector2i(3, 3))
	var missing := Grid.find_char(Layouts.HOUSE_LAYOUT, "?")
	assert_push_error("not found")
	assert_eq(missing, Vector2i(-1, -1))


func test_tile_at_returns_null_out_of_bounds() -> void:
	var g := _small()
	var inside: Dictionary = Grid.tile_at(g, 1, 0)
	var left: Variant = Grid.tile_at(g, -1, 0)
	var right: Variant = Grid.tile_at(g, 2, 0)
	var below: Variant = Grid.tile_at(g, 0, 2)
	assert_eq(inside, {"kind": "path"})
	assert_true(left == null)
	assert_true(right == null)
	assert_true(below == null)


func test_set_tile_does_not_mutate_the_source_grid() -> void:
	var g := _small()
	var next := Grid.set_tile(g, 1, 0, {"kind": "tilled", "watered": false})
	var changed: Dictionary = Grid.tile_at(next, 1, 0)
	var original: Dictionary = Grid.tile_at(g, 1, 0)
	assert_eq(changed, {"kind": "tilled", "watered": false})
	assert_eq(original, {"kind": "path"})
	var unchanged := Grid.set_tile(g, 5, 5, {"kind": "grass"})
	assert_push_error("out of bounds")
	assert_eq(unchanged, g)


func test_is_blocked() -> void:
	for kind: String in ["rock", "stump", "water", "building", "fence", "wall", "feature"]:
		assert_true(Grid.is_blocked({"kind": kind}), kind)
	for kind: String in ["grass", "path", "weed", "tilled", "floor"]:
		assert_false(Grid.is_blocked({"kind": kind}), kind)
	assert_true(Grid.is_blocked(null))


func test_target_tile_faces() -> void:
	var cases: Dictionary = {"n": Vector2i(10, 9), "s": Vector2i(10, 11), "e": Vector2i(11, 10), "w": Vector2i(9, 10)}
	for facing: String in cases:
		var player: Dictionary = {"x": 10.5, "z": 10.5, "facing": facing}
		var want: Vector2i = cases[facing]
		assert_eq(Grid.target_tile(player), want, facing)
