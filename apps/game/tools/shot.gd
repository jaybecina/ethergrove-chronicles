extends SceneTree
## One screenshot of the real world (or the title screen), for by-eye checks: `pnpm game:shot --
## scene=<farm|house|lowmere|woods|clinic|mossdeep|arena|well|title>
## tier=<low|medium|high> season=<spring|summer|fall|winter> out=<absolute png path>` (a 1280x720 window, not
## headless; see scripts/game.mjs shotArgs). Optional: `minute=<0..1559>` (default 720, noon), `weather=<sunny|
## cloudy|rain|storm|snow>` (default sunny), `perf=1` (vsync off, ~4 s of frames, then a PERF line with the frame
## rate, draw calls, objects, primitives and nodes).
##
## A fresh game (seed 11, lessons on) on its own GameSession (clock frozen), Settings and SaveService, all under a
## temporary user:// directory, so the player's real settings and saves are never touched. The farm gets a few crops
## at every stage in the field's south rows so the crop models show.

const GameSessionScript := preload("res://game/autoload/game_session.gd")
const SettingsScript := preload("res://game/autoload/settings.gd")
const SaveServiceScript := preload("res://game/autoload/save_service.gd")

const SEED := 11
const TMP := "user://shot-tmp"
const SETTLE_FRAMES := 40
const PERF_FRAMES := 240
## Where the player stands: farm on the path just south of the field (centred on it), house on the bed-side spawn,
## Lowmere in front of Hilda.
const POSES: Dictionary[String, Vector2] = {
	"farm": Vector2(15.5, 17.5),
	"house": Vector2(3.5, 3.5),
	"lowmere": Vector2(4.5, 7.5),
	"woods": Vector2(6.5, 45.5),
	"clinic": Vector2(4.5, 3.5),
	"mossdeep": Vector2(20.5, 8.5),
	"arena": Vector2(36.5, 8.5),
	"well": Vector2(97.5, 45.5),
}
## Crops shown on the farm: (x, crop id, age).
const CROPS: Array[Array] = [
	[8, "turnip", 0], [9, "turnip", 2], [10, "turnip", 5], [11, "potato", 3], [12, "potato", 7],
	[13, "tomato", 4], [14, "tomato", 12], [15, "corn", 6], [16, "corn", 14], [17, "pumpkin", 15],
]
const CROP_ROW := 15

var _started := false


func _process(_delta: float) -> bool:
	if _started:
		return false
	_started = true
	_run()
	return false


func _run() -> void:
	var args := _args()
	var scene: String = args.get("scene", "farm")
	var tier: String = args.get("tier", "medium")
	var season: String = args.get("season", "spring")
	var weather: String = args.get("weather", "sunny")
	var minute_text: String = args.get("minute", "720")
	var minute := minute_text.to_int()
	var out: String = args.get("out", "")
	var perf: bool = args.get("perf", "0") == "1"
	if (not POSES.has(scene) and scene != "title") or not Tiers.IDS.has(tier) or out == "":
		printerr("shot: need scene=<farm|house|lowmere|woods|clinic|mossdeep|arena|well|title> tier=<low|medium|high> out=<png>")
		quit(2)
		return
	DirAccess.make_dir_recursive_absolute(TMP)
	var session: GameSessionScript = GameSessionScript.new()
	session.set_process(false)
	root.add_child(session)
	var settings: SettingsScript = SettingsScript.new()
	settings.set("_path", TMP.path_join("settings.cfg"))
	root.add_child(settings)
	settings.set_choice(tier)
	var save: SaveServiceScript = SaveServiceScript.new()
	save.session = session
	save.slots = SaveSlots.new(TMP.path_join("saves"))
	root.add_child(save)

	if scene == "title":
		# The boot flow of boot/main.tscn on the temporary saves (empty: Continue is disabled).
		var main: GameMain = (load("res://boot/main.tscn") as PackedScene).instantiate()
		main.session = session
		main.settings = settings
		main.save_service = save
		root.add_child(main)
	else:
		var state := _state(scene, season, minute, weather)
		session.start(state, 0, 0)
		session.set_screen("game")
		var world := WorldRoot.new()
		world.session = session
		world.settings = settings
		world.save_service = save
		root.add_child(world)
	if perf:
		DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_DISABLED)
	for i: int in SETTLE_FRAMES:
		await process_frame
	if perf:
		_measure()
		for i: int in PERF_FRAMES:
			await process_frame
		_report(scene, tier)
	await RenderingServer.frame_post_draw
	var img := root.get_texture().get_image()
	var err := img.save_png(out)
	_cleanup()
	if err != OK:
		printerr("shot: could not save %s (%s)" % [out, error_string(err)])
		quit(1)
		return
	print("SHOT %s %dx%d" % [out, img.get_width(), img.get_height()])
	quit(0)


var _t0: int = 0
var _f0: int = 0


func _measure() -> void:
	_t0 = Time.get_ticks_usec()
	_f0 = Engine.get_frames_drawn()


func _report(scene: String, tier: String) -> void:
	var seconds := (Time.get_ticks_usec() - _t0) / 1e6
	var frames := Engine.get_frames_drawn() - _f0
	print("PERF scene=%s tier=%s fps=%.1f draw_calls=%d objects=%d primitives=%d nodes=%d video_mem_mb=%.0f" % [
		scene, tier, frames / seconds,
		int(Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME)),
		int(Performance.get_monitor(Performance.RENDER_TOTAL_OBJECTS_IN_FRAME)),
		int(Performance.get_monitor(Performance.RENDER_TOTAL_PRIMITIVES_IN_FRAME)),
		int(Performance.get_monitor(Performance.OBJECT_NODE_COUNT)),
		Performance.get_monitor(Performance.RENDER_VIDEO_MEM_USED) / 1048576.0,
	])


func _state(scene: String, season: String, minute: int, weather: String) -> Dictionary:
	var state := NewGame.create({"seed": SEED, "farmName": "Shot", "playerName": "Shot", "lessons": true})
	var cal: Dictionary = state["calendar"]
	cal["season"] = season
	cal["minute"] = minute
	(state["weather"] as Dictionary)["today"] = weather
	var maps: Dictionary = state["maps"]
	var farm: Dictionary = maps["farm"]
	for c: Array in CROPS:
		var x: int = c[0]
		var id: String = c[1]
		var age: int = c[2]
		farm = Grid.set_tile(farm, x, CROP_ROW, {
			"kind": "tilled", "watered": x % 2 == 0, "crop": {"id": id, "age": age, "regrowing": false},
		})
	maps["farm"] = farm
	var pose: Vector2 = POSES[scene]
	var player: Dictionary = state["player"]
	player["location"] = "mossdeep" if scene == "arena" else ("woods" if scene == "well" else scene)
	player["floor"] = 8 if scene == "arena" else (4 if scene == "mossdeep" else 0)
	player["x"] = pose.x
	player["z"] = pose.y
	player["facing"] = "s" if scene == "house" else "n"
	return state


static func _args() -> Dictionary:
	var out: Dictionary = {}
	for a: String in OS.get_cmdline_user_args():
		var kv := a.split("=", true, 1)
		if kv.size() == 2:
			out[kv[0]] = kv[1]
	return out


static func _cleanup() -> void:
	for dir: String in [TMP.path_join("saves"), TMP]:
		if not DirAccess.dir_exists_absolute(dir):
			continue
		for file: String in DirAccess.get_files_at(dir):
			DirAccess.remove_absolute(dir.path_join(file))
		DirAccess.remove_absolute(dir)
