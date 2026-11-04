extends Node
## Saving and loading the running game (autoload `SaveService`), the Godot side of apps/web/src/save/autosave.ts.
## Autosaves on every new morning (a `dayStarted` event), when the window loses focus and when it is asked to close.
## A failed save never stops play: it emits `save_failed` with the pause menu's text and the game goes on. A slot
## holding a save from a newer game version is never overwritten (`force` is never passed to SaveSlots).

## Emitted with SAVE_FAILED_TEXT when a save fails.
signal save_failed(message: String)

## Copied from apps/web/src/ui/screens/Pause.tsx.
const SAVE_FAILED_TEXT := "Couldn't save. Use Export save to keep your progress."
const GameSessionScript := preload("res://game/autoload/game_session.gd")

## The session to save; defaults to the GameSession autoload. Tests set their own before adding the node.
var session: GameSessionScript = null
## The slot files; defaults to user://saves. Tests set SaveSlots on a temporary directory.
var slots: SaveSlots = null
## Why the last save failed ("" after a successful one).
var last_error: String = ""

## A deep copy (never an alias of the live session state, which set_pose mutates in place) of the last state
## written, and its slot: the same state is not written twice. Cleared when a new or loaded game starts.
var _last_saved: Dictionary = {}
var _last_slot: int = 0


func _ready() -> void:
	if session == null:
		session = get_node_or_null("/root/GameSession") as GameSessionScript
	if slots == null:
		slots = SaveSlots.new()
	install()


## Connects the autosave triggers that come from the session (focus and close arrive as notifications).
func install() -> void:
	if session == null:
		return
	if not session.events.is_connected(_on_events):
		session.events.connect(_on_events)
	if not session.session_started.is_connected(_forget_last_saved):
		session.session_started.connect(_forget_last_saved)


func _forget_last_saved() -> void:
	_last_saved = {}
	_last_slot = 0


func _on_events(events: Array) -> void:
	for e: Dictionary in events:
		if e["type"] == "dayStarted":
			save_now()
			return


func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT or what == NOTIFICATION_WM_CLOSE_REQUEST:
		# As the web game: only mid-game, never from the title screen.
		if session != null and session.screen != "title":
			save_now()


## Writes the session to its slot. OK when written, or skipped because this exact state was the last one written to
## that slot; ERR_UNCONFIGURED (not a failure) when there is no game or slot. Any other error emits `save_failed`.
func save_now() -> Error:
	if session == null or session.state.is_empty() or session.slot == 0:
		return ERR_UNCONFIGURED
	if session.slot == _last_slot and session.state == _last_saved:
		return OK
	var saved_at := Time.get_datetime_string_from_system(true) + "Z"
	var file := SaveMigrate.make_save_file(session.state, session.play_time_ms, saved_at)
	var err := slots.save(session.slot, file)
	if err != OK:
		last_error = "Saving slot %d failed: %s" % [session.slot, error_string(err)]
		save_failed.emit(SAVE_FAILED_TEXT)
		return err
	last_error = ""
	# make_save_file deep-copies the state, so this is not aliased to session.state.
	_last_saved = file["state"]
	_last_slot = session.slot
	return OK


## Loads `slot` (the SaveSlots.load_slot result); on "ok" starts the session with it. The clock stays frozen until
## the caller shows the game screen.
func load_slot(slot: int) -> Dictionary:
	var result := slots.load_slot(slot)
	if result["kind"] == "ok":
		# session.start emits session_started, which also clears this; done here too in case install() was not run.
		_forget_last_saved()
		var file: Dictionary = result["file"]
		var state: Dictionary = file["state"]
		var play_time: int = file["playTimeMs"]
		session.start(state, slot, play_time)
	return result
