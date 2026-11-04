extends GutTest
## Player pose rules: facing, speed, and pushing the player circle off blocked tiles.


## A 3x3 farm with one fence tile in the middle, wrapped in the minimum state the pose rules read.
func _state(energy: int = 10) -> Dictionary:
	var grid := Grid.parse_layout(["___", "_#_", "___"], Layouts.FARM_LEGEND)
	return {
		"player": {"location": "farm", "x": 0.5, "z": 0.5, "facing": "s", "energy": energy},
		"maps": {"farm": grid},
	}


func test_with_pose_sets_fields_and_copies() -> void:
	var before := _state()
	var after := PlayerPose.with_pose(before, 2.5, 1.5, "w")
	var p: Dictionary = after["player"]
	var got: Array = [p["x"], p["z"], p["facing"]]
	assert_eq(got, [2.5, 1.5, "w"])
	var old: Dictionary = before["player"]
	var kept: Array = [old["x"], old["z"], old["facing"]]
	assert_eq(kept, [0.5, 0.5, "s"])


func test_with_pose_rejects_bad_facing() -> void:
	var after := PlayerPose.with_pose(_state(), 1.0, 1.0, "up")
	assert_push_error("facing")
	var p: Dictionary = after["player"]
	var facing: String = p["facing"]
	assert_eq(facing, "s")


func test_facing_of_matches_ts() -> void:
	assert_eq(PlayerPose.facing_of(1, 0), "e")
	assert_eq(PlayerPose.facing_of(-1, 0), "w")
	assert_eq(PlayerPose.facing_of(0, 1), "s")
	assert_eq(PlayerPose.facing_of(0, -1), "n")
	assert_eq(PlayerPose.facing_of(1, 1), "e")
	assert_eq(PlayerPose.facing_of(-1, -1), "w")
	assert_eq(PlayerPose.facing_of(-1, 1), "w")
	assert_eq(PlayerPose.facing_of(0.2, 0.3), "s")


func test_speed_for() -> void:
	var s := _state(10)
	assert_almost_eq(PlayerPose.speed_for(s, false), 2.6, 0.0001)
	assert_almost_eq(PlayerPose.speed_for(s, true), 4.6, 0.0001)
	var tired := _state(0)
	assert_almost_eq(PlayerPose.speed_for(tired, false), 1.56, 0.0001)
	assert_almost_eq(PlayerPose.speed_for(tired, true), 1.56, 0.0001)


func test_pose_is_pushed_out_of_blocked_tile() -> void:
	# (1.4, 1.5) sits inside the fence tile; the nearest free tile centre is the one to the left.
	var out := PlayerPose.push_out_of_blocked(_state(), 1.4, 1.5)
	assert_eq(out, Vector2(0.5, 1.5))


func test_extra_blocked_tiles_push_out_too() -> void:
	# (0, 0) is free in the grid but listed as an extra blocked tile (a villager). (1, 0) and (0, 1) tie in ring 1;
	# the smaller x wins, so the player lands on (0, 1).
	var extra: Array[Vector2i] = [Vector2i(0, 0)]
	assert_eq(PlayerPose.push_out_of_blocked(_state(), 0.5, 0.5, extra), Vector2(0.5, 1.5))
	assert_eq(PlayerPose.push_out_of_blocked(_state(), 0.5, 0.5), Vector2(0.5, 0.5), "no extras: unchanged")


func test_pose_pushed_when_circle_only_overlaps_edge() -> void:
	# Centre on the free tile at x=0.5 would be fine, but x=0.8 puts the radius-0.3 circle across the fence edge.
	var out := PlayerPose.push_out_of_blocked(_state(), 0.8, 1.5)
	assert_eq(out, Vector2(0.5, 1.5))


func test_pose_unchanged_when_free() -> void:
	assert_eq(PlayerPose.push_out_of_blocked(_state(), 0.6, 1.5), Vector2(0.6, 1.5))


func test_pose_out_of_grid_counts_as_blocked() -> void:
	var out := PlayerPose.push_out_of_blocked(_state(), -0.5, 0.5)
	assert_eq(out, Vector2(0.5, 0.5))


func test_pose_tie_prefers_smaller_x_then_y() -> void:
	# Dead centre of the fence tile: the four edge neighbours tie; smaller x wins.
	var out := PlayerPose.push_out_of_blocked(_state(), 1.5, 1.5)
	assert_eq(out, Vector2(0.5, 1.5))


func _state_with(location: String, grid: Dictionary) -> Dictionary:
	return {
		"player": {"location": location, "x": 0.5, "z": 0.5, "facing": "s", "energy": 10},
		"maps": {location: grid},
	}


func test_push_out_in_house() -> void:
	var grid := Grid.parse_layout(Layouts.HOUSE_LAYOUT, Layouts.HOUSE_LEGEND)
	var out := PlayerPose.push_out_of_blocked(_state_with("house", grid), 3.5, 0.9)
	assert_eq(out, Vector2(3.5, 1.5))


func test_push_out_in_lowmere() -> void:
	var grid := Zones.grid("lowmere")
	var width: int = grid["width"]
	var height: int = grid["height"]
	var found := Vector2i(-1, -1)
	for ty: int in range(height):
		for tx: int in range(width - 1):
			if Grid.is_blocked(Grid.tile_at(grid, tx, ty)) and not Grid.is_blocked(Grid.tile_at(grid, tx + 1, ty)) \
					and not Grid.is_blocked(Grid.tile_at(grid, tx - 1, ty)) and found.x < 0:
				found = Vector2i(tx, ty)
	assert_true(found.x >= 0, "lowmere has an isolated blocked tile")
	var state := _state_with("lowmere", {})
	var out := PlayerPose.push_out_of_blocked(state, found.x + 0.5, found.y + 0.5)
	assert_ne(out, Vector2(found.x + 0.5, found.y + 0.5))
	assert_false(Grid.is_blocked(Grid.tile_at(grid, floori(out.x), floori(out.y))))


func test_all_blocked_grid_is_unchanged() -> void:
	var grid := Grid.parse_layout(["##", "##"], Layouts.FARM_LEGEND)
	assert_eq(PlayerPose.push_out_of_blocked(_state_with("farm", grid), 1.0, 1.0), Vector2(1.0, 1.0))


func test_far_outside_grid_is_unchanged() -> void:
	assert_eq(PlayerPose.push_out_of_blocked(_state(), -50.0, 0.5), Vector2(-50.0, 0.5))


func test_corner_clearance_is_a_circle_not_a_square() -> void:
	# Fence tile spans 1..2. (0.75, 0.75) is 0.25 from the corner on both axes: distance 0.354 > 0.3, so free.
	assert_eq(PlayerPose.push_out_of_blocked(_state(), 0.75, 0.75), Vector2(0.75, 0.75))


func test_facing_of_zero_vector_is_west() -> void:
	assert_eq(PlayerPose.facing_of(0.0, 0.0), "w")


func test_with_pose_keeps_other_player_fields() -> void:
	var after := PlayerPose.with_pose(_state(7), 2.5, 1.5, "n")
	var p: Dictionary = after["player"]
	var rest: Array = [p["energy"], p["location"]]
	assert_eq(rest, [7, "farm"])
