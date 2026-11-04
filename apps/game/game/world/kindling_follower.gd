class_name KindlingFollower
extends Node3D
## The first Kindling (M1 spec 6.5): a small glowing wisp of the shrine that drifts behind the player in the Woods and
## Mossdeep and lights a 6 m radius. Placeholder art: an emissive sphere and an omni light. The healing is `Kindling.heal`
## (run by the CombatLayer); this node only shows it.

const OFFSET := Vector3(-0.9, 1.5, 0.7)
const FOLLOW_SPEED := 5.0

var light: OmniLight3D
var _body: MeshInstance3D


func _init() -> void:
	name = "Kindling"
	visible = false
	var sphere := SphereMesh.new()
	sphere.radius = 0.16
	sphere.height = 0.32
	var material := StandardMaterial3D.new()
	material.albedo_color = Color("#ffe9a8")
	material.emission_enabled = true
	material.emission = Color("#ffc25a")
	material.emission_energy_multiplier = 3.0
	_body = MeshInstance3D.new()
	_body.name = "Glow"
	_body.mesh = sphere
	_body.material_override = material
	add_child(_body)
	light = OmniLight3D.new()
	light.name = "Light"
	light.omni_range = Kindling.LIGHT_RADIUS
	light.light_color = Color("#ffc25a")
	light.light_energy = 1.4
	add_child(light)


## Snaps beside `target` (the player's position).
func snap(target: Vector3) -> void:
	position = target + OFFSET


## Drifts toward its place beside `target` over `dt` seconds, with a small bob.
func follow(target: Vector3, dt: float, time_s: float) -> void:
	var goal := target + OFFSET + Vector3(0.0, sin(time_s * 2.0) * 0.08, 0.0)
	position = position.lerp(goal, clampf(FOLLOW_SPEED * dt, 0.0, 1.0))
