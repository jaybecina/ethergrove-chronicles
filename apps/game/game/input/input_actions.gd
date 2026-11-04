class_name InputActions
extends RefCounted
## The game's InputMap actions and their default bindings (M1 spec §7.3 for movement and interact; tools follow the
## web game's keyboard.ts and gamepad.ts). Registered at runtime so tests and the game share one source of truth.
## Keys bind by physical position, so WASD stays in place on other keyboard layouts.

const MOVE_LEFT := "move_left"
const MOVE_RIGHT := "move_right"
const MOVE_UP := "move_up"
const MOVE_DOWN := "move_down"
const RUN := "run"
const PRIMARY := "primary"
const SECONDARY := "secondary"
const HOTBAR_NEXT := "hotbar_next"
const HOTBAR_PREV := "hotbar_prev"
const MENU := "menu"
const CONFIRM := "confirm"
const CANCEL := "cancel"
## Opens and closes the bag panel (Tab is the menu key).
const BAG := "bag"
## Combat (M1 spec 7.3): tap light, hold heavy; block (a block pressed just before a hit parries); dodge roll; lock-on.
const ATTACK := "attack"
const BLOCK := "block"
const DODGE := "dodge"
const LOCK_ON := "lock_on"
## F11 toggles full screen (handled by the Settings autoload).
const FULLSCREEN := "fullscreen"
## hotbar_1 .. hotbar_8 (keys 1-8 select hotbar index 0-7).
const HOTBAR_COUNT := 8
const STICK_DEADZONE := 0.2

const ACTIONS: Array[String] = [
	MOVE_LEFT, MOVE_RIGHT, MOVE_UP, MOVE_DOWN, RUN, PRIMARY, SECONDARY,
	"hotbar_1", "hotbar_2", "hotbar_3", "hotbar_4", "hotbar_5", "hotbar_6", "hotbar_7", "hotbar_8",
	HOTBAR_NEXT, HOTBAR_PREV, MENU, CONFIRM, CANCEL, BAG, ATTACK, BLOCK, DODGE, LOCK_ON, FULLSCREEN,
]


static func hotbar_action(index: int) -> String:
	return "hotbar_%d" % (index + 1)


## Creates every action with its default events. Calling it again resets the bindings to the defaults.
static func register() -> void:
	for action: String in ACTIONS:
		if InputMap.has_action(action):
			InputMap.action_erase_events(action)
		else:
			InputMap.add_action(action, STICK_DEADZONE)
	_keys(MOVE_LEFT, [KEY_A, KEY_LEFT])
	_axis(MOVE_LEFT, JOY_AXIS_LEFT_X, -1.0)
	_keys(MOVE_RIGHT, [KEY_D, KEY_RIGHT])
	_axis(MOVE_RIGHT, JOY_AXIS_LEFT_X, 1.0)
	_keys(MOVE_UP, [KEY_W, KEY_UP])
	_axis(MOVE_UP, JOY_AXIS_LEFT_Y, -1.0)
	_keys(MOVE_DOWN, [KEY_S, KEY_DOWN])
	_axis(MOVE_DOWN, JOY_AXIS_LEFT_Y, 1.0)
	_keys(RUN, [KEY_SHIFT])
	_button(RUN, JOY_BUTTON_LEFT_STICK)
	_keys(PRIMARY, [KEY_SPACE])
	_button(PRIMARY, JOY_BUTTON_A)
	_keys(SECONDARY, [KEY_F])
	_button(SECONDARY, JOY_BUTTON_X)
	for i: int in HOTBAR_COUNT:
		_keys(hotbar_action(i), [KEY_1 + i])
	_wheel(HOTBAR_NEXT, MOUSE_BUTTON_WHEEL_DOWN)
	_button(HOTBAR_NEXT, JOY_BUTTON_DPAD_RIGHT)
	_wheel(HOTBAR_PREV, MOUSE_BUTTON_WHEEL_UP)
	_button(HOTBAR_PREV, JOY_BUTTON_DPAD_LEFT)
	_keys(MENU, [KEY_ESCAPE, KEY_TAB])
	_button(MENU, JOY_BUTTON_START)
	_keys(CONFIRM, [KEY_ENTER, KEY_SPACE])
	_button(CONFIRM, JOY_BUTTON_A)
	_keys(CANCEL, [KEY_ESCAPE, KEY_BACKSPACE])
	_button(CANCEL, JOY_BUTTON_B)
	_keys(BAG, [KEY_B])
	_button(BAG, JOY_BUTTON_Y)
	_wheel(ATTACK, MOUSE_BUTTON_LEFT)
	_button(ATTACK, JOY_BUTTON_X)
	_wheel(BLOCK, MOUSE_BUTTON_RIGHT)
	_button(BLOCK, JOY_BUTTON_RIGHT_SHOULDER)
	_keys(DODGE, [KEY_SPACE])
	_button(DODGE, JOY_BUTTON_B)
	_keys(FULLSCREEN, [KEY_F11])
	_keys(LOCK_ON, [KEY_Q])
	_wheel(LOCK_ON, MOUSE_BUTTON_MIDDLE)
	_button(LOCK_ON, JOY_BUTTON_RIGHT_STICK)


static func _keys(action: String, keys: Array[Key]) -> void:
	for key: Key in keys:
		var e := InputEventKey.new()
		e.physical_keycode = key
		InputMap.action_add_event(action, e)


static func _button(action: String, button: JoyButton) -> void:
	var e := InputEventJoypadButton.new()
	e.button_index = button
	InputMap.action_add_event(action, e)


static func _axis(action: String, axis: JoyAxis, direction: float) -> void:
	var e := InputEventJoypadMotion.new()
	e.axis = axis
	e.axis_value = direction
	InputMap.action_add_event(action, e)


static func _wheel(action: String, button: MouseButton) -> void:
	var e := InputEventMouseButton.new()
	e.button_index = button
	InputMap.action_add_event(action, e)
