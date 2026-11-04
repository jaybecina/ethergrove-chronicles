extends SceneTree
## Headless playthrough: `node scripts/game.mjs playthrough` (part of `pnpm game:smoke`). Prints PLAYTHROUGH OK and
## exits 0, or prints PLAYTHROUGH FAIL: <reason> and exits 1. test_world_root.gd runs the same `run`.
##
## A new game with lessons on, shown by a real WorldRoot on its own GameSession, Settings and SaveService (saves in a
## temporary directory). The first lessons are driven through `GameSession.dispatch` as the parity fixtures'
## playLessons does (walk into the field, hoe, till 3, plant 3, water, sleep, water daily until ripe, harvest, ship,
## sleep to sell, buy seeds), with each walk a teleport of the player body; doors and the farm gate are used through
## `interact`, so the world swaps zones as in play. Then it talks to Hilda in Lowmere, saves, loads the save into a
## fresh session and compares the two states.

const GameSessionScript := preload("res://game/autoload/game_session.gd")
const SettingsScript := preload("res://game/autoload/settings.gd")
const SaveServiceScript := preload("res://game/autoload/save_service.gd")

const SEED := 11
const PLOT: Array[int] = [11, 12, 13]
const PLOT_Y := 10
const SLOT := 1
const OK_LINE := "PLAYTHROUGH OK"

var _done := false


func _process(_delta: float) -> bool:
	# Runs in the first frame, when the autoloads are in the tree (they are not yet in _init).
	if _done:
		return false
	_done = true
	var problem := run(root, "user://playthrough-%d" % (Time.get_ticks_usec() % 1000000))
	if problem == "":
		print(verdict(problem))
		quit(0)
	else:
		printerr(verdict(problem))
		quit(1)
	return false


## The line the runner looks for.
static func verdict(problem: String) -> String:
	return OK_LINE if problem == "" else "PLAYTHROUGH FAIL: " + problem


## Plays the slice under `parent`, keeping saves and settings under `dir` (removed afterwards). Returns "" or what
## went wrong. Synchronous: every check follows a dispatch directly.
static func run(parent: Node, dir: String) -> String:
	DirAccess.make_dir_recursive_absolute(dir)
	var made: Array[Node] = []
	var problem := _play(parent, dir, made)
	# The world first (it listens to the sessions), then the services.
	made.reverse()
	for node: Node in made:
		if is_instance_valid(node):
			node.get_parent().remove_child(node)
			node.free()
	_remove_tree(dir)
	return problem


static func _play(parent: Node, dir: String, made: Array[Node]) -> String:
	var session: GameSessionScript = GameSessionScript.new()
	session.set_process(false)
	parent.add_child(session)
	made.append(session)
	var settings: SettingsScript = SettingsScript.new()
	settings.set("_path", dir.path_join("settings.cfg"))
	settings.renderer_override = "playthrough"
	parent.add_child(settings)
	made.append(settings)
	var save: SaveServiceScript = SaveServiceScript.new()
	save.session = session
	save.slots = SaveSlots.new(dir.path_join("saves"))
	parent.add_child(save)
	made.append(save)

	var state := NewGame.create({"seed": SEED, "farmName": "Playthrough", "playerName": "Tester", "lessons": true})
	# As the fixture's blank farm, only for the three plot tiles: the seeded obstacles elsewhere stay.
	var farm: Dictionary = (state["maps"] as Dictionary)["farm"]
	for x: int in PLOT:
		farm = Grid.set_tile(farm, x, PLOT_Y, {"kind": "grass"})
	(state["maps"] as Dictionary)["farm"] = farm
	session.start(state, SLOT, 0)
	session.set_screen("game")

	var world := WorldRoot.new()
	world.session = session
	world.settings = settings
	world.save_service = save
	parent.add_child(world)
	made.append(world)
	if world.zone_view == null or world.zone_view.zone != "farm":
		return "the world did not build the farm"

	var lessons: Array[String] = []
	var note_lesson := func() -> void:
		var lesson: String = (session.state["tutorial"] as Dictionary)["lesson"]
		if lessons.is_empty() or lessons[-1] != lesson:
			lessons.append(lesson)
	note_lesson.call()
	var clock_before := world.hud.clock.text
	var gold_before := world.hud.gold.text

	# A failed action shows its toast (the cart opens at 9 AM; a new game starts at 6 AM).
	session.dispatch({"type": "buyItem", "itemId": "seed:turnip", "qty": 1})
	if not _has_toast(world.hud.toasts, Toasts.fail_text("cartClosed")):
		return "no toast for the failed purchase"

	# walkToField
	_stand(world, 10, 17, "n")
	session.dispatch({"type": "tick", "minutes": 1})
	_stand(world, 10, 16, "n")
	session.dispatch({"type": "tick", "minutes": 1})
	note_lesson.call()
	# till 3 with the hoe
	session.dispatch({"type": "selectHotbar", "index": Balance.TOOL_ORDER.find("hoe")})
	for x: int in PLOT:
		_stand(world, x - 1, PLOT_Y, "e")
		session.dispatch({"type": "useTool"})
		note_lesson.call()
	if world.zone_view.soil_node(PLOT[0], PLOT_Y) == null:
		return "the tilled tile shows no soil"
	# plant 3 (the hotbar's first quick slot holds the starting seeds)
	session.dispatch({"type": "selectHotbar", "index": 5})
	for x: int in PLOT:
		_stand(world, x - 1, PLOT_Y, "e")
		session.dispatch({"type": "useItem"})
		note_lesson.call()
	if world.zone_view.crop_node(PLOT[0], PLOT_Y) == null:
		return "the planted tile shows no crop"
	# water, sleep, water daily, until ripe
	for night: int in 10:
		if _ripe(session.state):
			break
		session.dispatch({"type": "selectHotbar", "index": Balance.TOOL_ORDER.find("can")})
		for x: int in PLOT:
			var tile: Dictionary = _tile(session.state, x, PLOT_Y)
			if tile.get("watered", false):
				continue
			_stand(world, x - 1, PLOT_Y, "e")
			session.dispatch({"type": "useTool"})
			note_lesson.call()
		var slept := _sleep(session, world)
		if slept != "":
			return slept
		note_lesson.call()
		var back := _leave_house(session, world)
		if back != "":
			return back
	if not _ripe(session.state):
		return "the turnips never ripened"
	if world.hud.clock.text == clock_before:
		return "the HUD clock did not change over the days"
	# harvest by hand, ship one
	for x: int in PLOT:
		_stand(world, x - 1, PLOT_Y, "e")
		session.dispatch({"type": "interact"})
		note_lesson.call()
	var turnips := -1
	var bag: Array = session.state["bag"]
	for i: int in bag.size():
		if bag[i] != null and (bag[i] as Dictionary)["id"] == "turnip":
			turnips = i
			break
	if turnips < 0:
		return "no turnips in the bag after the harvest"
	session.dispatch({"type": "shipItem", "bagIndex": turnips, "qty": 1})
	note_lesson.call()
	# sleep to sell
	var sold := _sleep(session, world)
	if sold != "":
		return sold
	note_lesson.call()
	if world.hud.gold.text == gold_before:
		return "the HUD gold did not change after the sale"
	if world.panel_host.current() == "morning":
		world.panel_host.close()
	var out := _leave_house(session, world)
	if out != "":
		return out
	var expected: Array[String] = []
	expected.assign(Lessons.LESSON_ORDER)
	if lessons != expected:
		return "the lessons went %s, expected %s" % [str(lessons), str(expected)]

	# Through the farm gate to Lowmere.
	var gate := Grid.find_feature(GameStateUtil.current_grid(session.state), "farmGate")
	_stand(world, gate.x, gate.y - 1, "s")
	session.dispatch({"type": "interact"})
	if _location(session) != "lowmere":
		return "the farm gate did not lead to Lowmere (location %s)" % _location(session)
	if world.zone_view.zone != "lowmere":
		return "the world did not swap the zone view to Lowmere"
	# Talk to Hilda, facing her from the tile below.
	var hilda: Dictionary = Villagers.ALL[0]
	var hilda_x: int = hilda["x"]
	var hilda_y: int = hilda["y"]
	_stand(world, hilda_x, hilda_y + 1, "n")
	session.dispatch({"type": "interact"})
	if world.panel_host.current() != "dialogue":
		return "talking to Hilda opened %s, not the dialogue box" % world.panel_host.current()
	var texts := world.panel_host.current_panel().texts()
	if not texts.has(hilda["name"]) or not texts.has(hilda["first"]):
		return "the dialogue box does not show Hilda's first line: %s" % str(texts)
	world.panel_host.close()

	# Save, load into a fresh session, compare.
	var saved := save.save_now()
	if saved != OK:
		return "save_now failed: %s %s" % [error_string(saved), save.last_error]
	var other: GameSessionScript = GameSessionScript.new()
	other.set_process(false)
	parent.add_child(other)
	made.append(other)
	var loader: SaveServiceScript = SaveServiceScript.new()
	loader.session = other
	loader.slots = SaveSlots.new(dir.path_join("saves"))
	parent.add_child(loader)
	made.append(loader)
	var loaded := loader.load_slot(SLOT)
	if loaded["kind"] != "ok":
		return "loading the save returned %s" % str(loaded["kind"])
	var diff := JsonNorm.first_diff(other.state, session.state)
	if diff != "":
		return "the loaded state differs: %s" % diff
	return ""


## Puts the player on tile (x, y) facing `facing`, as a walk would (through the body, which writes the pose).
static func _stand(world: WorldRoot, x: int, y: int, facing: String) -> void:
	world.controller.teleport(x + 0.5, y + 0.5, facing)


## Walks in at the farmhouse door and sleeps; the house view must be on screen.
static func _sleep(session: GameSessionScript, world: WorldRoot) -> String:
	if _location(session) == "farm":
		var door := Grid.find_feature(GameStateUtil.current_grid(session.state), "houseDoor")
		_stand(world, door.x, door.y + 1, "n")
		session.dispatch({"type": "interact"})
	if _location(session) != "house" or world.zone_view.zone != "house":
		return "the house door did not lead into the house"
	var events := session.dispatch({"type": "sleep"})
	for e: Dictionary in events:
		if e["type"] == "dayStarted":
			return ""
	return "sleeping started no new day"


## Leaves the house through its exit door; the farm view must be back.
static func _leave_house(session: GameSessionScript, world: WorldRoot) -> String:
	if world.panel_host.is_open():
		world.panel_host.close()
	var exit := Grid.find_feature(GameStateUtil.current_grid(session.state), "exitDoor")
	_stand(world, exit.x, exit.y - 1, "s")
	session.dispatch({"type": "interact"})
	if _location(session) != "farm" or world.zone_view.zone != "farm":
		return "the exit door did not lead back to the farm"
	return ""


static func _location(session: GameSessionScript) -> String:
	return (session.state["player"] as Dictionary)["location"]


static func _tile(state: Dictionary, x: int, y: int) -> Dictionary:
	var grid: Dictionary = (state["maps"] as Dictionary)["farm"]
	var tile: Variant = Grid.tile_at(grid, x, y)
	return tile if tile != null else {}


static func _ripe(state: Dictionary) -> bool:
	for x: int in PLOT:
		var tile := _tile(state, x, PLOT_Y)
		if not tile.has("crop") or not Crops.is_mature(tile["crop"] as Dictionary):
			return false
	return true


static func _has_toast(toasts: Toasts, text: String) -> bool:
	for i: int in toasts.count():
		if toasts.text_at(i) == text:
			return true
	return false


static func _remove_tree(path: String) -> void:
	if not DirAccess.dir_exists_absolute(path):
		return
	for sub: String in DirAccess.get_directories_at(path):
		_remove_tree(path.path_join(sub))
	for file: String in DirAccess.get_files_at(path):
		DirAccess.remove_absolute(path.path_join(file))
	DirAccess.remove_absolute(path)
