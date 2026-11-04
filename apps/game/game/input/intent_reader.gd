class_name IntentReader
extends RefCounted
## Reads the player's intents from the live `Input` singleton (actions from InputActions), the Godot side of
## apps/web/src/input/keyboard.ts and gamepad.ts. Held inputs (move, run, primary) are read live; one-shot inputs
## (secondary, hotbar, cycle, menu, and a primary tap) are latched by `poll()` every frame, so a press in a frame
## that runs no 50 ms step is still seen, once, by the next `read()`.
##
## Intents: {move: Vector2 (x right, y down the screen), run: bool, primary: bool, secondary: bool, hotbar: int
## (0-7, -1 none), cycle: int (-1, 0, 1), menu: bool, bag: bool}.

var _secondary := false
var _primary_tap := false
var _menu := false
var _bag := false
var _hotbar := -1
var _cycle := 0


## Fills `into` with "no intents".
static func clear(into: Dictionary) -> void:
	into["move"] = Vector2.ZERO
	into["run"] = false
	into["primary"] = false
	into["secondary"] = false
	into["hotbar"] = -1
	into["cycle"] = 0
	into["menu"] = false
	into["bag"] = false


## Latches this frame's presses. Call exactly once per frame, before any `read()`.
func poll() -> void:
	if Input.is_action_just_pressed(InputActions.SECONDARY):
		_secondary = true
	if Input.is_action_just_pressed(InputActions.PRIMARY):
		_primary_tap = true
	if Input.is_action_just_pressed(InputActions.MENU):
		_menu = true
	if Input.is_action_just_pressed(InputActions.BAG):
		_bag = true
	if Input.is_action_just_pressed(InputActions.HOTBAR_NEXT):
		_cycle = 1
	elif Input.is_action_just_pressed(InputActions.HOTBAR_PREV):
		_cycle = -1
	for i: int in InputActions.HOTBAR_COUNT:
		if Input.is_action_just_pressed(InputActions.hotbar_action(i)):
			_hotbar = i


## Fills the caller-owned `into` (no allocation) with the current intents and consumes the latched presses. It does
## not poll: a frame that runs several steps must see each press once, in its first step.
func read(into: Dictionary) -> void:
	into["move"] = Input.get_vector(
		InputActions.MOVE_LEFT, InputActions.MOVE_RIGHT, InputActions.MOVE_UP, InputActions.MOVE_DOWN
	)
	into["run"] = Input.is_action_pressed(InputActions.RUN)
	into["primary"] = Input.is_action_pressed(InputActions.PRIMARY) or _primary_tap
	into["secondary"] = _secondary
	into["hotbar"] = _hotbar
	into["cycle"] = _cycle
	into["menu"] = _menu
	into["bag"] = _bag
	reset()


## Drops the latched presses (after a read, or when the game loses the input).
func reset() -> void:
	_secondary = false
	_primary_tap = false
	_menu = false
	_bag = false
	_hotbar = -1
	_cycle = 0
