class_name DeviceTracker
extends Node
## The input device used last: "keyboard" (keys and mouse) or "gamepad" (joypad buttons and sticks). The lesson hints
## name the keys of this device. Touch is out of scope for the Godot game. A stick must pass the action deadzone
## before it counts, so drift does not switch the hints.

signal device_changed(device: String)

var device: String = "keyboard"


func _input(event: InputEvent) -> void:
	process_event(event)


## Public for tests: the same as an event arriving in `_input`.
func process_event(event: InputEvent) -> void:
	if event is InputEventKey or event is InputEventMouse:
		_switch_to("keyboard")
	elif event is InputEventJoypadButton:
		_switch_to("gamepad")
	elif event is InputEventJoypadMotion:
		var motion: InputEventJoypadMotion = event
		if absf(motion.axis_value) >= InputActions.STICK_DEADZONE:
			_switch_to("gamepad")


func _switch_to(next: String) -> void:
	if next == device:
		return
	device = next
	device_changed.emit(next)
