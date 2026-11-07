class_name VillagerVisuals
extends RefCounted
## The four Lowmere villagers (Villagers.ALL), each standing on its tile centre.
##
## A villager with a character model (assets/characters/<id>.glb: made from the owner's concept with Hunyuan3D 2.1,
## coloured from the concept and simplified to 10k triangles, see assets-src/characters/tools) stands as that model,
## at its own baked height in metres, facing the camera (PlayerVisual.FACING_YAW["s"]): its back is a guess and its
## face is the best of it (character spec REQ-08). These models have no skeleton yet, so they do not animate.
##
## A villager without one is a `player` model fitted like the farmer (PlayerVisual), turned to its facing, looping
## Idle, and tinted to its own palette by multiplying every surface's albedo with a per-villager duplicate of the
## material (the farmer keeps his look). Each node carries meta `look`: "character" or "tinted".

## Villager id → albedo multiplier.
const TINTS: Dictionary[String, Color] = {
	"hilda": Color("#b5603a"),
	"aldous": Color("#4f8a5b"),
	"fern": Color("#d8b84a"),
	"bram": Color("#4a74b8"),
}


## The character model for a villager id (it may not exist yet).
static func model_path(id: String) -> String:
	return "res://assets/characters/%s.glb" % id


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
		if ResourceLoader.exists(model_path(id)):
			var scene := load(model_path(id)) as PackedScene
			if scene != null:
				node.rotation = Vector3(0.0, PlayerVisual.FACING_YAW["s"], 0.0)
				node.add_child(scene.instantiate())
				node.set_meta("look", "character")
				parent.add_child(node)
				continue
			push_error("Character model failed to load: %s" % model_path(id))
		node.set_meta("look", "tinted")
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
