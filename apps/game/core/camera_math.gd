class_name CameraMath
extends RefCounted
## Camera maths, ported from apps/web/src/scene/cameraMath.ts (offsetAt at yaw 0, tileToWorld). Pure: no nodes.

const PITCH_DEG := 50.0
## Orthographic vertical size in world metres. Tuned by eye in Task 17 (draft 14.0 showed only the field): at
## 1280 x 720 the view is 23 * 16 / 9 = 40.9 m wide, so the farm's 25-tile field fills about 61 % of the width.
## Recorded in the M1 spec §8.
const ORTHO_SIZE := 23.0
## The farmhouse interior (8 x 6 tiles) at the outdoor size was a speck: indoors the view is 17.8 m wide (the room
## fills about 45 % of it). Tuned by eye in Task 17.
const HOUSE_ORTHO_SIZE := 10.0


## Mossdeep is indoors but needs room to see a fight coming (draft).
const MOSSDEEP_ORTHO_SIZE := 15.0


## The orthographic size for a zone: closer indoors.
static func ortho_size_for(zone: String) -> float:
	if zone == "mossdeep":
		return MOSSDEEP_ORTHO_SIZE
	return HOUSE_ORTHO_SIZE if Zones.is_interior(zone) else ORTHO_SIZE


## Camera position relative to its target at yaw 0 (the camera sits south of the target, +z).
static func offset(distance: float) -> Vector3:
	var pitch := deg_to_rad(PITCH_DEG)
	return Vector3(0.0, distance * sin(pitch), distance * cos(pitch))


## The world point at the centre of tile (x, y).
static func tile_to_world(x: float, y: float) -> Vector3:
	return Vector3(x + 0.5, 0.0, y + 0.5)


## Where the rig sits for a player at (px, pz): the ground point below them.
static func follow_target(px: float, pz: float) -> Vector3:
	return Vector3(px, 0.0, pz)


## A screen-space direction as a world-space (x, z) direction. Yaw is fixed at 0, so this is the identity.
static func screen_dir_to_world(dx: float, dz: float) -> Vector2:
	return Vector2(dx, dz)
