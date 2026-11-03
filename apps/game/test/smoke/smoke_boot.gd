extends SceneTree

const BOOT_SCENE: String = "res://boot/boot.tscn"
const SMOKE_SAVES: String = "user://smoke-saves"


func _init() -> void:
	var scene: PackedScene = load(BOOT_SCENE) as PackedScene
	if scene == null:
		printerr("SMOKE FAIL: cannot load " + BOOT_SCENE)
		quit(1)
		return
	var node: Node = scene.instantiate()
	if node == null:
		printerr("SMOKE FAIL: cannot instantiate " + BOOT_SCENE)
		quit(1)
		return
	node.free()
	var problem := _save_round_trip()
	if problem != "":
		printerr("SMOKE FAIL: " + problem)
		quit(1)
		return
	print("SMOKE OK")
	quit(0)


## A new game saved to slot 1 and loaded again must be identical. Returns "" or what went wrong.
func _save_round_trip() -> String:
	var state := NewGame.create({"seed": 7, "farmName": "Smoke", "playerName": "Test"})
	var file := SaveMigrate.make_save_file(state, 0, "2026-01-01T00:00:00.000Z")
	var slots := SaveSlots.new(SMOKE_SAVES)
	var problem := ""
	var saved := slots.save(1, file)
	if saved != OK:
		problem = "save failed: " + error_string(saved)
	else:
		var res := slots.load_slot(1)
		if res["kind"] != "ok":
			problem = "load returned " + str(res["kind"])
		else:
			var loaded: Dictionary = res["file"]
			problem = JsonNorm.first_diff(loaded["state"], state)
	for name: String in DirAccess.get_files_at(SMOKE_SAVES):
		DirAccess.remove_absolute(SMOKE_SAVES.path_join(name))
	DirAccess.remove_absolute(SMOKE_SAVES)
	return problem
