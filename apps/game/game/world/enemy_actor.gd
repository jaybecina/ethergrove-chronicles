class_name EnemyActor
extends Node3D
## One enemy in the world: a placeholder capsule whose colour follows its family and whose tint flashes while it winds
## up an attack. The rules live in `EnemyAI` (the `data` dictionary); this node only shows it. Combat feel is judged on
## placeholder enemies (M1 spec 16); real models come with the art pass.

const COLORS := {
	"burrower": Color("#6b4a2e"), "brute": Color("#7a2a2a"), "wisp": Color("#4fd3d9"),
	"mossmaw": Color("#3d5a2a"), "bramble_matron": Color("#2d6b3a"), "dummy": Color("#c9a56a"),
	"sapling": Color("#7fbf3a"),
}
const TELEGRAPH := Color("#ff3b2f")

## The EnemyAI dictionary; the layer replaces it every step.
var data: Dictionary = {}
## A training dummy never attacks and never dies.
var passive: bool = false
## Set once the XP for this kill was paid.
var rewarded: bool = false
## Seconds since it died (the layer frees it after a moment).
var dead_for: float = 0.0
var _mesh: MeshInstance3D
var _material: StandardMaterial3D
var _shown_state: String = ""


func setup(enemy: Dictionary, is_passive: bool = false) -> void:
	data = enemy
	passive = is_passive
	var id: String = "dummy" if is_passive else enemy["id"]
	var scale_up := 1.0
	if id == "brute":
		scale_up = 1.5
	elif id == "mossmaw":
		scale_up = 1.8
	elif id == "bramble_matron":
		scale_up = 2.4
	elif id == "sapling":
		scale_up = 0.5
	_material = StandardMaterial3D.new()
	_material.albedo_color = COLORS[id]
	var capsule := CapsuleMesh.new()
	capsule.radius = 0.35 * scale_up
	capsule.height = 1.2 * scale_up
	_mesh = MeshInstance3D.new()
	_mesh.name = "Body"
	_mesh.mesh = capsule
	_mesh.material_override = _material
	_mesh.position = Vector3(0.0, capsule.height / 2.0, 0.0)
	add_child(_mesh)
	sync_visual()


## Moves the node to the data's position and tints it for the current state.
func sync_visual() -> void:
	var x: float = data["x"]
	var y: float = data["y"]
	position = Vector3(x, 0.0, y)
	var state: String = data["state"]
	if state == _shown_state or _material == null:
		return
	_shown_state = state
	var id: String = "dummy" if passive else data["id"]
	var base: Color = COLORS[id]
	match state:
		"telegraph":
			_material.albedo_color = TELEGRAPH
		"staggered":
			_material.albedo_color = base.lightened(0.5)
		"dead":
			_material.albedo_color = base.darkened(0.6)
			rotation_degrees.x = 80.0
		_:
			_material.albedo_color = base


func tint() -> Color:
	return _material.albedo_color
