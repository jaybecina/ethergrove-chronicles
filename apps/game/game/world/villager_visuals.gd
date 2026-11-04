class_name VillagerVisuals
extends RefCounted
## The four Lowmere villagers (Villagers.ALL): each a `player` model fitted like the farmer (PlayerVisual), standing
## on its tile centre, turned to its facing (PlayerVisual.FACING_YAW), looping Idle, and tinted to its own palette by
## multiplying every surface's albedo with a per-villager duplicate of the material (the farmer keeps his look).

## Villager id → albedo multiplier.
const TINTS: Dictionary[String, Color] = {
	"hilda": Color("#b5603a"),
	"aldous": Color("#4f8a5b"),
	"fern": Color("#d8b84a"),
	"bram": Color("#4a74b8"),
}


## Adds one `Villager_<id>` per villager under `parent`.
static func spawn(parent: Node3D) -> void:
	for v: Dictionary in Villagers.ALL:
		var id: String = v["id"]
		var x: int = v["x"]
		var y: int = v["y"]
		var facing: String = v["facing"]
		var node := Node3D.new()
		node.name = "Villager_%s" % id
		node.position = Vector3(x + 0.5, 0.0, y + 0.5)
		var yaw: float = PlayerVisual.FACING_YAW.get(facing, 0.0)
		node.rotation = Vector3(0.0, yaw, 0.0)
		var model := ModelCatalog.instantiate("player")
		ModelCatalog.fit(model, 0.0, PlayerVisual.MODEL_HEIGHT)
		var tint: Color = TINTS.get(id, Color.WHITE)
		_tint(model, tint)
		node.add_child(model)
		parent.add_child(node)
		var anim := PlayerClips.prepare(model)
		if anim != null and anim.has_animation(PlayerClips.IDLE):
			anim.play(PlayerClips.IDLE)


## Overrides every surface under `model` with a copy of its material whose albedo is multiplied by `tint`; each
## source material is copied once per villager.
static func _tint(model: Node, tint: Color) -> void:
	var copies: Dictionary[BaseMaterial3D, BaseMaterial3D] = {}
	for found: Node in model.find_children("*", "MeshInstance3D", true, false):
		var mi := found as MeshInstance3D
		for s: int in mi.mesh.get_surface_count():
			var src := mi.get_active_material(s) as BaseMaterial3D
			if src == null:
				continue
			var copy: BaseMaterial3D = copies.get(src)
			if copy == null:
				copy = src.duplicate() as BaseMaterial3D
				copy.albedo_color = src.albedo_color * tint
				copies[src] = copy
			mi.set_surface_override_material(s, copy)
