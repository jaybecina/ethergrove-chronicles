class_name DisplayModes
extends RefCounted
## Window size and full-screen rules. The pure functions take the screen's usable size, so they are testable without a
## window; `apply` is the one place that touches `DisplayServer`.
##
## The default is a windowed game at 80% of the usable screen (`AUTO`), centred. The player can pick a fixed size from
## `SIZES` (only those that fit the screen are offered) or full screen.

const AUTO := "auto"
const AUTO_FRACTION := 0.8
const MIN_SIZE := Vector2i(960, 540)
## Used when the screen size is unknown (headless runs).
const FALLBACK_SCREEN := Vector2i(1920, 1080)
const SIZES: Array[String] = ["1280x720", "1600x900", "1920x1080", "2560x1440"]
const MODES: Array[String] = ["windowed", "fullscreen"]


## 80% of the usable screen, never smaller than MIN_SIZE and never larger than the screen.
static func auto_size(usable: Vector2i) -> Vector2i:
	var w := maxi(MIN_SIZE.x, floori(usable.x * AUTO_FRACTION))
	var h := maxi(MIN_SIZE.y, floori(usable.y * AUTO_FRACTION))
	return Vector2i(mini(w, usable.x), mini(h, usable.y))


## "1600x900" as a Vector2i, or (0, 0) when it is not a size.
static func parse_size(text: String) -> Vector2i:
	var parts := text.split("x")
	if parts.size() != 2 or not parts[0].is_valid_int() or not parts[1].is_valid_int():
		return Vector2i.ZERO
	return Vector2i(parts[0].to_int(), parts[1].to_int())


static func is_valid_choice(choice: String) -> bool:
	return choice == AUTO or SIZES.has(choice)


## The window size for a choice ("auto" or one of SIZES), clamped to the screen. An unknown choice is "auto".
static func size_for(choice: String, usable: Vector2i) -> Vector2i:
	if choice == AUTO or not SIZES.has(choice):
		return auto_size(usable)
	var wanted := parse_size(choice)
	return Vector2i(mini(wanted.x, usable.x), mini(wanted.y, usable.y))


## The fixed sizes that fit the screen.
static func available_sizes(usable: Vector2i) -> Array[String]:
	var out: Array[String] = []
	for text: String in SIZES:
		var s := parse_size(text)
		if s.x <= usable.x and s.y <= usable.y:
			out.append(text)
	return out


## Top-left of a window of `size` centred in the usable rect.
static func centered_position(usable: Rect2i, size: Vector2i) -> Vector2i:
	return usable.position + (usable.size - size) / 2


## Applies `mode` ("windowed" or "fullscreen") and `size_choice` to the main window. Does nothing without a real window.
static func apply(mode: String, size_choice: String) -> void:
	if DisplayServer.get_name() == "headless":
		return
	if mode == "fullscreen":
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN)
		return
	DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED)
	var screen := DisplayServer.window_get_current_screen()
	var usable := DisplayServer.screen_get_usable_rect(screen)
	if usable.size.x <= 0 or usable.size.y <= 0:
		return
	var size := size_for(size_choice, usable.size)
	DisplayServer.window_set_size(size)
	DisplayServer.window_set_position(centered_position(usable, size))


## The usable size of the current screen, or FALLBACK_SCREEN when unknown.
static func usable_size() -> Vector2i:
	if DisplayServer.get_name() == "headless":
		return FALLBACK_SCREEN
	var usable := DisplayServer.screen_get_usable_rect(DisplayServer.window_get_current_screen())
	return usable.size if usable.size.x > 0 and usable.size.y > 0 else FALLBACK_SCREEN
