class_name CameraRig
extends Node3D
## Orthographic follow camera. The rig sits on the ground below `target` (x and z only, no smoothing) and carries a
## Camera3D 30 m away at a 50 degree pitch, looking at the rig origin.

const CAMERA_DISTANCE := 30.0

## The node to follow. Null means the rig stays where it is.
var target: Node3D

var _camera: Camera3D


func _ready() -> void:
	_camera = Camera3D.new()
	_camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	_camera.size = CameraMath.ORTHO_SIZE
	_camera.near = 0.1
	_camera.far = 80.0
	_camera.position = CameraMath.offset(CAMERA_DISTANCE)
	_camera.rotation_degrees = Vector3(-CameraMath.PITCH_DEG, 0.0, 0.0)
	add_child(_camera)


func _process(_delta: float) -> void:
	_follow()


## The orthographic Camera3D (null before the rig enters the tree). WorldRoot gives it the driver's attributes.
func camera() -> Camera3D:
	return _camera


## Move to the target immediately.
func snap() -> void:
	_follow()


## Screen position in viewport pixels of a world point.
func world_to_screen(world: Vector3) -> Vector2:
	return _camera.unproject_position(world)


## Whether a world point is inside the viewport, shrunk by `margin` pixels on every side.
func is_on_screen(world: Vector3, margin: float = 0.0) -> bool:
	if _camera.is_position_behind(world):
		return false
	var p := _camera.unproject_position(world)
	var size := _camera.get_viewport().get_visible_rect().size
	return p.x >= margin and p.y >= margin and p.x <= size.x - margin and p.y <= size.y - margin


func _follow() -> void:
	if target == null:
		return
	var at := target.global_position
	global_position = CameraMath.follow_target(at.x, at.z)
