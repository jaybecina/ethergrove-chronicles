extends GutTest
## CameraRig: orthographic 50 degree camera that follows a target on x and z, plus the screen helpers.

var _viewport: SubViewport
var _rig: CameraRig
var _target: Node3D


func before_each() -> void:
	_viewport = SubViewport.new()
	_viewport.size = Vector2i(1280, 720)
	add_child_autofree(_viewport)
	_rig = CameraRig.new()
	_viewport.add_child(_rig)
	_target = Node3D.new()
	_viewport.add_child(_target)
	_rig.target = _target
	_rig.snap()


func _camera() -> Camera3D:
	return _rig.get_child(0) as Camera3D


func test_camera_is_orthogonal_and_pitched() -> void:
	var cam := _camera()
	assert_not_null(cam)
	assert_eq(cam.projection, Camera3D.PROJECTION_ORTHOGONAL)
	assert_almost_eq(cam.size, CameraMath.ORTHO_SIZE, 1e-3)
	assert_almost_eq(cam.rotation_degrees.x, -50.0, 1e-3)
	assert_almost_eq(cam.rotation_degrees.y, 0.0, 1e-3)
	assert_almost_eq(cam.near, 0.1, 1e-4)
	assert_almost_eq(cam.far, 80.0, 1e-4)


func test_camera_accessor_returns_the_rig_camera() -> void:
	assert_true(_rig.camera() == _camera())


func test_camera_looks_at_rig_origin() -> void:
	var cam := _camera()
	var forward := -cam.global_transform.basis.z
	var landing := cam.global_position + forward * 30.0
	assert_almost_eq(landing.distance_to(_rig.global_position), 0.0, 1e-3)


func test_rig_follows_target_on_process() -> void:
	_target.global_position = Vector3(10.0, 5.0, -4.0)
	await get_tree().process_frame
	assert_almost_eq(_rig.global_position.x, 10.0, 1e-4)
	assert_almost_eq(_rig.global_position.y, 0.0, 1e-4)
	assert_almost_eq(_rig.global_position.z, -4.0, 1e-4)


func test_snap_moves_immediately() -> void:
	_target.global_position = Vector3(3.0, 0.0, 8.0)
	_rig.snap()
	assert_almost_eq(_rig.global_position.x, 3.0, 1e-4)
	assert_almost_eq(_rig.global_position.z, 8.0, 1e-4)


func test_no_target_does_not_crash() -> void:
	_rig.target = null
	_rig.snap()
	await get_tree().process_frame
	assert_not_null(_rig)


func test_world_to_screen_centres_the_rig_origin() -> void:
	var p := _rig.world_to_screen(_rig.global_position)
	assert_almost_eq(p.x, 640.0, 1.0)
	assert_almost_eq(p.y, 360.0, 1.0)


func test_is_on_screen() -> void:
	assert_true(_rig.is_on_screen(_target.global_position))
	assert_false(_rig.is_on_screen(_target.global_position + Vector3(100.0, 0.0, 0.0)))
	assert_false(_rig.is_on_screen(_target.global_position + Vector3(0.0, 0.0, -100.0)))


func test_is_on_screen_margin_shrinks_the_area() -> void:
	var edge := _target.global_position + Vector3(0.0, 0.0, 0.0)
	assert_true(_rig.is_on_screen(edge, 100.0))
	assert_false(_rig.is_on_screen(edge, 400.0), "a margin bigger than half the viewport excludes the centre")
