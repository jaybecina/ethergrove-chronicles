extends Node
## The running game (autoload `GameSession`): the core state, its save slot and play time, the screen that decides
## whether the clock runs, and the fixed 50 ms step. The Godot side of apps/web/src/game/store.ts and loop.ts.
## Each step reads the intents, maps them to commands (IntentMapper), dispatches them through
## `ApplyCommand.apply`, then ticks the whole game minutes. Movement is not a command here: the player controller
## writes the pose with `set_pose`.
##
## Ownership: `state` and `state["player"]` are live, mutable objects owned by the session. `start` takes its own
## deep copy; `set_pose` writes the player's x, z and facing in place every frame (no copy, no signal), while a
## dispatch replaces `state` with the rule's new dictionary. UI and scene code must never cache `state` or any
## sub-dictionary, never detect a change by reference identity, and must copy what it needs.
##
## Input and focus rule for the UI tasks: HUD Controls use `focus_mode = FOCUS_NONE`; modal panels are the only focus
## owners. Esc, Space, Tab and the D-pad overlap Godot's `ui_*` actions, so the pause and panel code must consume the
## press that closes it (`get_viewport().set_input_as_handled()`). The intent reader only polls while
## `screen == "game"`, and not in the frame the screen changed.

## Emitted after a dispatch or a start (not after set_pose: the pose changes every frame).
signal state_changed
## Emitted by `start` when a new or loaded game begins.
signal session_started
## The events of one dispatch, emitted once per dispatch that produced any.
signal events(events: Array)
## The menu input was pressed during play; the UI decides what to open.
signal menu_requested
## The bag input was pressed during play; the PanelHost opens the bag.
signal bag_requested

const SCREENS: Array[String] = ["title", "game", "paused", "modal"]

var state: Dictionary = {}
## 1..3, or 0 when the game has no slot.
var slot: int = 0
var play_time_ms: int = 0
## "title", "game", "paused" or "modal"; only "game" runs the clock.
var screen: String = "title"

var _frame_acc_ms: float = 0.0
var _minute_acc: float = 0.0
## Simulation time in ms (whole steps), the clock of the action gate.
var _sim_ms: int = 0
## The process frame of the last screen change; input is not polled in that frame.
var _screen_frame: int = -1
var _reader := IntentReader.new()
var _gate := ActionGate.new()
## Reused every step so the loop allocates no containers of its own.
var _intents: Dictionary = {}
var _commands: Array = []
var _tick: Dictionary = {"type": "tick", "minutes": 0}


func _ready() -> void:
	InputActions.register()
	IntentReader.clear(_intents)


## Starts (or loads) a game. The screen is left as it is: the caller shows the game when it is ready.
func start(new_state: Dictionary, new_slot: int, new_play_time_ms: int) -> void:
	# The session owns its state: nothing the caller still holds is aliased or later mutated.
	state = new_state.duplicate(true)
	slot = new_slot
	play_time_ms = new_play_time_ms
	_frame_acc_ms = 0.0
	_minute_acc = 0.0
	_reader.reset()
	_gate = ActionGate.new()
	session_started.emit()
	state_changed.emit()


func set_screen(next: String) -> void:
	if not SCREENS.has(next):
		push_error("Unknown screen \"%s\"" % next)
		return
	if next != screen:
		# The press that changed the screen (Esc closing the pause menu) must not reach the game as well.
		_reader.reset()
		_screen_frame = Engine.get_process_frames()
	screen = next


func clock_running() -> bool:
	return screen == "game"


## Applies one command to the state, emits its events (if any) and returns them.
func dispatch(cmd: Dictionary) -> Array:
	var result := ApplyCommand.apply(state, cmd)
	state = result["state"]
	var out: Array = result["events"]
	state_changed.emit()
	if not out.is_empty():
		events.emit(out)
	return out


## Replaces the whole state (a fall, a level-up) and emits `state_changed`. The new dictionary becomes the session's own:
## callers must not keep or mutate it afterwards.
func replace_state(new_state: Dictionary) -> void:
	state = new_state
	state_changed.emit()


## Moves the player (from the player controller, every frame): writes x, z and facing in place, with no copy, no
## events and no signal. A bad facing pushes an error and changes nothing.
func set_pose(x: float, z: float, facing: String) -> void:
	if not PlayerPose.FACINGS.has(facing):
		push_error("Unknown facing \"%s\"" % facing)
		return
	var player: Dictionary = state["player"]
	player["x"] = x
	player["z"] = z
	player["facing"] = facing


## One fixed step: the commands, then the whole-minute tick, then `dt_ms` of play time. Does nothing at all unless
## the clock runs (screen "game"), as loop.ts's stepper.
func step(commands: Array, dt_ms: int) -> void:
	if not clock_running():
		return
	for cmd: Dictionary in commands:
		dispatch(cmd)
	var minutes := Clock.minutes_for_step(_minute_acc)
	_minute_acc = minutes["acc"]
	var whole: int = minutes["whole"]
	if whole > 0:
		_tick["minutes"] = whole
		dispatch(_tick)
	play_time_ms += dt_ms


func _process(delta: float) -> void:
	if not clock_running() or state.is_empty():
		_frame_acc_ms = 0.0
		return
	if Engine.get_process_frames() != _screen_frame:
		_reader.poll()
	var advanced := Clock.advance(_frame_acc_ms, delta * 1000.0)
	_frame_acc_ms = advanced["acc_ms"]
	var steps: int = advanced["steps"]
	for i: int in steps:
		_reader.read(_intents)
		var menu: bool = _intents["menu"]
		if menu:
			menu_requested.emit()
		var bag: bool = _intents["bag"]
		if bag:
			bag_requested.emit()
		_sim_ms += Clock.STEP_MS
		IntentMapper.map_into(_intents, state, _gate, _sim_ms, _commands)
		step(_commands, Clock.STEP_MS)
		if not clock_running():
			_frame_acc_ms = 0.0
			return
