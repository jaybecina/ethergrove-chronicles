extends CoreTest
## CollisionBuilder: blocked tiles become 1 x 2 x 1 boxes on collision layer 1, runs of blocked tiles in one row merge
## into one wider box, and extra tiles (the Lowmere villagers) block as well.

const FREE := {"kind": "grass"}
const FENCE := {"kind": "fence"}


func _grid(width: int, height: int) -> Dictionary:
	var tiles: Array = []
	for i: int in width * height:
		tiles.append(FREE.duplicate())
	return {"width": width, "height": height, "tiles": tiles}


func _shapes(body: StaticBody3D) -> Array[CollisionShape3D]:
	var out: Array[CollisionShape3D] = []
	for child: Node in body.get_children():
		var cs := child as CollisionShape3D
		if cs != null:
			out.append(cs)
	return out


func _box_aabb(cs: CollisionShape3D) -> AABB:
	var box: BoxShape3D = cs.shape as BoxShape3D
	return AABB(cs.position - box.size / 2.0, box.size)


## True when the centre of tile (tx, ty), at mid height, lies inside one of the body's boxes.
func _covered(boxes: Array[CollisionShape3D], tx: int, ty: int) -> bool:
	var p := Vector3(tx + 0.5, 1.0, ty + 0.5)
	for cs: CollisionShape3D in boxes:
		if _box_aabb(cs).has_point(p):
			return true
	return false


func _build(grid: Dictionary, extra: Array[Vector2i] = []) -> StaticBody3D:
	var body := CollisionBuilder.build(grid, extra)
	autofree(body)
	return body


func test_blocked_tiles_become_boxes() -> void:
	var house: Dictionary = Grid.parse_layout(Layouts.HOUSE_LAYOUT, Layouts.HOUSE_LEGEND)
	var body := _build(house)
	var boxes := _shapes(body)
	# Rows: WWWWWWWW | WK....ZW | W......W x3 | WWWXWWWW: 1 + 2 + 2 + 2 + 2 + 1 boxes.
	eq(boxes.size(), 10)
	eq(CollisionBuilder.count_boxes(house), 10)
	eq(body.collision_layer, 1)
	for cs: CollisionShape3D in boxes:
		var box := cs.shape as BoxShape3D
		assert_not_null(box)
		assert_almost_eq(box.size.y, 2.0, 1e-5)
		assert_almost_eq(box.size.z, 1.0, 1e-5)
		assert_almost_eq(cs.position.y, 1.0, 1e-5)
	for ty: int in 6:
		for tx: int in 8:
			var blocked := Grid.is_blocked(Grid.tile_at(house, tx, ty))
			eq(_covered(boxes, tx, ty), blocked, "tile %d,%d" % [tx, ty])


func test_adjacent_blocked_tiles_merge_per_row() -> void:
	var grid := _grid(7, 3)
	var tiles: Array = grid["tiles"]
	for x: int in range(1, 6):
		tiles[1 * 7 + x] = FENCE.duplicate()
	var boxes := _shapes(_build(grid))
	eq(boxes.size(), 1)
	eq(CollisionBuilder.count_boxes(grid), 1)
	var box := boxes[0].shape as BoxShape3D
	assert_almost_eq(box.size.x, 5.0, 1e-5)
	assert_almost_eq(boxes[0].position.x, 3.5, 1e-5)
	assert_almost_eq(boxes[0].position.z, 1.5, 1e-5)


func test_free_grid_has_no_boxes() -> void:
	var grid := _grid(6, 4)
	eq(_shapes(_build(grid)).size(), 0)
	eq(CollisionBuilder.count_boxes(grid), 0)


func test_extra_tiles_merge_with_blocked_runs() -> void:
	var grid := _grid(7, 3)
	var tiles: Array = grid["tiles"]
	tiles[0] = FENCE.duplicate()
	var extra: Array[Vector2i] = [Vector2i(1, 0), Vector2i(4, 2)]
	var boxes := _shapes(_build(grid, extra))
	eq(boxes.size(), 2)
	eq(CollisionBuilder.count_boxes(grid, extra), 2)
	assert_true(_covered(boxes, 1, 0))
	assert_true(_covered(boxes, 4, 2))
	assert_false(_covered(boxes, 2, 0))


func test_villager_tiles_are_the_lowmere_extras() -> void:
	var tiles := CollisionBuilder.extra_blocked_for("lowmere")
	eq(tiles.size(), Villagers.ALL.size())
	for v: Dictionary in Villagers.ALL:
		var vx: int = v["x"]
		var vy: int = v["y"]
		assert_true(tiles.has(Vector2i(vx, vy)), "%s blocks" % v["id"])
	eq(CollisionBuilder.extra_blocked_for("farm").size(), 0)
	eq(CollisionBuilder.extra_blocked_for("house").size(), 0)


## Every outer border tile of `grid` is blocked and covered by a wall box: no exit tile leads off the map.
func _assert_sealed(grid: Dictionary, zone: String) -> void:
	var width: int = grid["width"]
	var height: int = grid["height"]
	assert_gt(width, 0, zone)
	var boxes := _shapes(_build(grid, CollisionBuilder.extra_blocked_for(zone)))
	var checked := 0
	for ty: int in height:
		for tx: int in width:
			if tx != 0 and ty != 0 and tx != width - 1 and ty != height - 1:
				continue
			checked += 1
			assert_true(Grid.is_blocked(Grid.tile_at(grid, tx, ty)), "%s border %d,%d is blocked" % [zone, tx, ty])
			assert_true(_covered(boxes, tx, ty), "%s border %d,%d has a wall" % [zone, tx, ty])
	eq(checked, 2 * width + 2 * height - 4, zone)


func test_zone_perimeters_are_sealed() -> void:
	var maps := d(TestStates.fresh()["maps"])
	_assert_sealed(d(maps["farm"]), "farm")
	_assert_sealed(d(maps["house"]), "house")
	_assert_sealed(Zones.grid("lowmere"), "lowmere")
