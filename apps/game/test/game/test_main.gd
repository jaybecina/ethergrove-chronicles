extends CoreTest
## The boot flow of boot/main.tscn (GameMain): Title → New game / Load / Continue → WorldRoot → Save and quit →
## Title. Every test injects its own GameSession, Settings and SaveService (files under `user://test-main-<random>`)
## and runs the flow inside a SubViewport.

const GameSessionScript := preload("res://game/autoload/game_session.gd")
const SettingsScript := preload("res://game/autoload/settings.gd")
const SaveServiceScript := preload("res://game/autoload/save_service.gd")
const MAIN_SCENE := "res://boot/main.tscn"

var _base: String = ""
var _session: GameSessionScript
var _save: SaveServiceScript
var _quits: Array[int] = [0]


func before_each() -> void:
	_base = "user://test-main-%d" % randi()
	_quits = [0]
	DirAccess.make_dir_recursive_absolute(_base)


func after_each() -> void:
	_remove_tree(_base)
	# The menus and the world are freed with queue_free (from their own signals): let that happen before GUT counts
	# orphans.
	await wait_process_frames(1)


func _remove_tree(path: String) -> void:
	if not DirAccess.dir_exists_absolute(path):
		return
	for dir: String in DirAccess.get_directories_at(path):
		_remove_tree(path.path_join(dir))
	for name: String in DirAccess.get_files_at(path):
		DirAccess.remove_absolute(path.path_join(name))
	DirAccess.remove_absolute(path)


func _main() -> GameMain:
	var vp := SubViewport.new()
	vp.size = Vector2i(1280, 720)
	add_child_autofree(vp)
	_session = GameSessionScript.new()
	_session.set_process(false)
	vp.add_child(_session)
	var settings: SettingsScript = SettingsScript.new()
	settings.set("_path", _base.path_join("settings.cfg"))
	settings.renderer_override = "Apple M4"
	vp.add_child(settings)
	_save = SaveServiceScript.new()
	_save.session = _session
	_save.slots = SaveSlots.new(_base.path_join("saves"))
	vp.add_child(_save)
	var scene: PackedScene = load(MAIN_SCENE)
	var main: GameMain = scene.instantiate()
	main.session = _session
	main.settings = settings
	main.save_service = _save
	main.quitter = func() -> void: _quits[0] += 1
	vp.add_child(main)
	return main


func _save_slot(slot: int) -> void:
	var state := NewGame.create({"seed": 5, "farmName": "Elm", "playerName": "Ari", "lessons": true})
	_save.slots.save(slot, SaveMigrate.make_save_file(state, 0, "2026-11-04T00:00:00.000Z"))


func test_main_scene_is_the_project_main_scene() -> void:
	eq(ProjectSettings.get_setting("application/run/main_scene"), MAIN_SCENE)


func test_boots_to_the_title() -> void:
	var main := _main()
	assert_not_null(main.title)
	assert_true(main.title.is_visible_in_tree())
	assert_null(main.world)
	eq(_session.screen, "title")
	assert_true(main.title.slots == _save.slots, "the screens read the SaveService's slots")


func test_new_game_then_start_shows_the_world() -> void:
	var main := _main()
	main.title.new_game_requested.emit()
	assert_not_null(main.new_game)
	assert_true(main.new_game.is_visible_in_tree())
	assert_null(main.title, "the title is freed while another menu shows")
	_save_slot(2)
	main.new_game.start_game.emit(2)
	assert_not_null(main.world)
	assert_true(main.world.is_inside_tree())
	eq(_session.screen, "game")
	eq(_session.slot, 2)
	assert_null(main.new_game, "the menus are freed while playing")
	assert_null(main.title)


func test_back_from_new_game_returns_to_title() -> void:
	var main := _main()
	main.title.new_game_requested.emit()
	main.new_game.back_requested.emit()
	assert_true(main.title.is_visible_in_tree())
	assert_null(main.new_game)


func test_load_screen_and_continue_start_the_game() -> void:
	var main := _main()
	_save_slot(3)
	main.title.load_requested.emit()
	assert_not_null(main.slot_screen)
	main.slot_screen.load_slot.emit(3)
	assert_not_null(main.world)
	eq(_session.slot, 3)
	eq(_session.screen, "game")


func test_continue_starts_the_game() -> void:
	var main := _main()
	_save_slot(1)
	main.title.continue_requested.emit(1)
	assert_not_null(main.world)
	eq(_session.slot, 1)


func test_debug_deep_puts_the_loaded_game_by_the_well() -> void:
	var main := _main()
	_save_slot(1)
	main.debug_deep = true
	main.title.continue_requested.emit(1)
	assert_not_null(main.world)
	eq(d(_session.state["player"])["location"], "woods")
	assert_true(Mossdeep.is_open(_session.state))


func test_without_the_flag_the_loaded_game_is_untouched() -> void:
	var main := _main()
	_save_slot(1)
	main.title.continue_requested.emit(1)
	eq(d(_session.state["player"])["location"], "farm")


func test_a_slot_that_fails_to_load_stays_on_the_menu() -> void:
	var main := _main()
	main.title.continue_requested.emit(1)
	assert_null(main.world, "an empty slot starts nothing")
	assert_true(main.title.is_visible_in_tree())
	eq(_session.screen, "title")


func test_save_and_quit_returns_to_the_title() -> void:
	var main := _main()
	_save_slot(1)
	main.title.continue_requested.emit(1)
	var world := main.world
	world.panel_host.quit_to_title()
	assert_null(main.world)
	assert_false(is_instance_valid(world) and world.is_inside_tree(), "the world left the tree")
	assert_not_null(main.title)
	assert_true(main.title.is_visible_in_tree())
	eq(_session.screen, "title")
	assert_false(main.title.continue_button.disabled, "Continue offers the saved farm again")


func test_quit_quits() -> void:
	var main := _main()
	main.title.quit_requested.emit()
	eq(_quits[0], 1)
