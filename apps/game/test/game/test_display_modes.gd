extends CoreTest
## DisplayModes: window size at 80% of the screen, fixed sizes that fit, and centring. Pure; no window is touched.


func test_auto_is_80_percent_of_the_usable_screen() -> void:
	eq(DisplayModes.auto_size(Vector2i(1920, 1080)), Vector2i(1536, 864))
	eq(DisplayModes.auto_size(Vector2i(2560, 1415)), Vector2i(2048, 1132))


func test_auto_never_goes_below_the_minimum_or_above_the_screen() -> void:
	eq(DisplayModes.auto_size(Vector2i(1024, 600)), Vector2i(960, 540))
	eq(DisplayModes.auto_size(Vector2i(800, 480)), Vector2i(800, 480), "a screen below the minimum is used whole")


func test_parse_size() -> void:
	eq(DisplayModes.parse_size("1600x900"), Vector2i(1600, 900))
	eq(DisplayModes.parse_size("nonsense"), Vector2i.ZERO)
	eq(DisplayModes.parse_size("1600x"), Vector2i.ZERO)


func test_size_for_choice() -> void:
	var screen := Vector2i(1920, 1080)
	eq(DisplayModes.size_for("auto", screen), Vector2i(1536, 864))
	eq(DisplayModes.size_for("1280x720", screen), Vector2i(1280, 720))
	eq(DisplayModes.size_for("2560x1440", screen), Vector2i(1920, 1080), "clamped to the screen")
	eq(DisplayModes.size_for("junk", screen), Vector2i(1536, 864), "an unknown choice is automatic")


func test_available_sizes_only_those_that_fit() -> void:
	eq(DisplayModes.available_sizes(Vector2i(1920, 1080)), ["1280x720", "1600x900", "1920x1080"])
	eq(DisplayModes.available_sizes(Vector2i(1366, 768)), ["1280x720"])
	eq(DisplayModes.available_sizes(Vector2i(800, 600)), [])


func test_valid_choice() -> void:
	assert_true(DisplayModes.is_valid_choice("auto"))
	assert_true(DisplayModes.is_valid_choice("1920x1080"))
	assert_false(DisplayModes.is_valid_choice("1234x567"))


func test_centered_position() -> void:
	eq(DisplayModes.centered_position(Rect2i(0, 25, 1920, 1055), Vector2i(1536, 864)), Vector2i(192, 120))


func test_apply_does_nothing_headless() -> void:
	DisplayModes.apply("fullscreen", "auto")
	DisplayModes.apply("windowed", "1280x720")
	eq(DisplayModes.usable_size(), DisplayModes.FALLBACK_SCREEN)
