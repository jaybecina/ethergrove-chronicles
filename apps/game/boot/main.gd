class_name GameMain
extends Node
## The main scene (boot/main.tscn): Title → New game / Load game / Continue → WorldRoot → Save and quit → Title.
## The menus only report a choice; this node loads the slot (`SaveService.load_slot`), frees the menu, shows the game
## (`GameSession.screen = "game"`) and adds the WorldRoot. While a menu shows, the screen is "title" (no clock, no
## input, no autosave on focus loss). Only one menu or the world exists at a time.

const GameSessionScript := preload("res://game/autoload/game_session.gd")
const SettingsScript := preload("res://game/autoload/settings.gd")
const SaveServiceScript := preload("res://game/autoload/save_service.gd")

## Injectable for tests; default to the autoloads.
var session: GameSessionScript
var settings: SettingsScript
var save_service: SaveServiceScript
## Called by Quit; tests replace it.
var quitter: Callable

var title: TitleScreen
var new_game: NewGameScreen
var slot_screen: SlotScreen
var world: WorldRoot
## `--debug-deep` was passed: a loaded game starts ready for the Woods and Mossdeep (DebugStart).
var debug_deep: bool = false

var _menus: CanvasLayer


func _ready() -> void:
	if session == null:
		session = get_node_or_null("/root/GameSession") as GameSessionScript
	if settings == null:
		settings = get_node_or_null("/root/Settings") as SettingsScript
	if save_service == null:
		save_service = get_node_or_null("/root/SaveService") as SaveServiceScript
	debug_deep = DebugStart.requested(OS.get_cmdline_user_args())
	if not quitter.is_valid():
		quitter = func() -> void: get_tree().quit()
	_menus = CanvasLayer.new()
	_menus.name = "Menus"
	add_child(_menus)
	show_title()


## Frees whatever is shown and shows the title screen on the "title" screen state.
func show_title() -> void:
	_clear()
	session.set_screen("title")
	title = TitleScreen.new()
	title.name = "Title"
	title.settings = settings
	title.slots = save_service.slots
	title.new_game_requested.connect(_show_new_game)
	title.load_requested.connect(_show_slots)
	title.continue_requested.connect(start_slot)
	title.quit_requested.connect(func() -> void: quitter.call())
	_menus.add_child(title)


func _show_new_game() -> void:
	_clear_menus()
	new_game = NewGameScreen.new()
	new_game.name = "NewGame"
	new_game.settings = settings
	new_game.slots = save_service.slots
	new_game.start_game.connect(start_slot)
	new_game.back_requested.connect(show_title)
	_menus.add_child(new_game)


func _show_slots() -> void:
	_clear_menus()
	slot_screen = SlotScreen.new()
	slot_screen.name = "Slots"
	slot_screen.settings = settings
	slot_screen.slots = save_service.slots
	slot_screen.load_slot.connect(start_slot)
	slot_screen.back_requested.connect(show_title)
	_menus.add_child(slot_screen)


## Loads `slot` and shows the world. A slot that does not load (missing, corrupt, newer) leaves the menu as it is:
## the menus only offer readable slots, so this is only a file changed behind the menu's back.
func start_slot(slot: int) -> void:
	var result := save_service.load_slot(slot)
	if result["kind"] != "ok":
		return
	_clear_menus()
	if debug_deep:
		session.replace_state(DebugStart.apply(session.state))
	session.set_screen("game")
	world = WorldRoot.new()
	world.session = session
	world.settings = settings
	world.save_service = save_service
	world.quit_to_title.connect(show_title)
	add_child(world)


func _clear() -> void:
	_clear_menus()
	if world != null:
		remove_child(world)
		world.queue_free()
		world = null


## Frees the menus. Called from a menu's own signal, so the node is removed now and freed at the end of the frame.
func _clear_menus() -> void:
	for menu: Control in [title, new_game, slot_screen]:
		if menu != null:
			_menus.remove_child(menu)
			menu.queue_free()
	title = null
	new_game = null
	slot_screen = null
