extends CoreTest
## CameraMath: port of apps/web/src/scene/cameraMath.ts (offsetAt at yaw 0, tileToWorld) plus the follow helpers.


func test_pitch_constant() -> void:
	eq(CameraMath.PITCH_DEG, 50.0)


func test_offset_matches_ts() -> void:
	var o := CameraMath.offset(12.0)
	assert_almost_eq(o.x, 0.0, 1e-3)
	assert_almost_eq(o.y, 9.192, 1e-3)
	assert_almost_eq(o.z, 7.713, 1e-3)


func test_offset_keeps_distance_and_pitch() -> void:
	for dist: float in [9.0, 12.0, 16.0, 30.0]:
		var o := CameraMath.offset(dist)
		assert_almost_eq(o.length(), dist, 1e-4)
		assert_almost_eq(o.y / Vector2(o.x, o.z).length(), tan(deg_to_rad(50.0)), 1e-4)
		assert_gt(o.z, 0.0, "camera sits south of the target")


func test_tile_to_world() -> void:
	eq(CameraMath.tile_to_world(3.0, 4.0), Vector3(3.5, 0.0, 4.5))


func test_follow_target_keeps_y_zero() -> void:
	eq(CameraMath.follow_target(7.25, -2.5), Vector3(7.25, 0.0, -2.5))


func test_screen_dir_to_world_is_identity_at_yaw_zero() -> void:
	eq(CameraMath.screen_dir_to_world(0.5, -1.0), Vector2(0.5, -1.0))


## Tuned by eye in Task 17 (farm, 1280 x 720, Medium): the 25-tile field (FIELD_RECT x 3..27) fills about 60 % of
## the frame width. Godot keeps the orthographic size vertical, so the visible width is size * 16 / 9.
func test_ortho_size_frames_the_field_at_about_sixty_percent() -> void:
	var field_width := float(Layouts.FIELD_RECT["x1"] - Layouts.FIELD_RECT["x0"] + 1)
	var view_width := CameraMath.ORTHO_SIZE * 16.0 / 9.0
	var share := field_width / view_width
	assert_between(share, 0.55, 0.65, "field share of the frame width")


## The farmhouse interior (8 x 6 tiles) was a speck at the farm's size (Task 17 by eye): it gets a closer view that
## shows the whole room at about half the frame width.
func test_house_gets_a_closer_ortho_size() -> void:
	eq(CameraMath.ortho_size_for("farm"), CameraMath.ORTHO_SIZE)
	eq(CameraMath.ortho_size_for("lowmere"), CameraMath.ORTHO_SIZE)
	var size := CameraMath.ortho_size_for("house")
	var width := float(Layouts.HOUSE_LAYOUT[0].length())
	assert_between(width / (size * 16.0 / 9.0), 0.4, 0.6, "house share of the frame width")
	assert_gt(size, float(Layouts.HOUSE_LAYOUT.size()) / sin(deg_to_rad(CameraMath.PITCH_DEG)), "whole room fits")


func test_mossdeep_view_is_wider_than_a_room_but_closer_than_outdoors() -> void:
	eq(CameraMath.ortho_size_for("mossdeep"), 15.0)
	assert_true(CameraMath.ortho_size_for("mossdeep") > CameraMath.ortho_size_for("house"))
	assert_true(CameraMath.ortho_size_for("mossdeep") < CameraMath.ortho_size_for("farm"))
	eq(CameraMath.ortho_size_for("clinic"), CameraMath.ortho_size_for("house"))
