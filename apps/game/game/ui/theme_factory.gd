class_name ThemeFactory
extends RefCounted
## The one Theme of the game UI, from the colour tokens of apps/web/src/ui/theme.css (--wood-dark, --wood, --parchment,
## --gold, --gold-bright, --danger). Default Godot font; Fraunces and Nunito are a later polish.

const BASE_FONT_SIZE := 18
## --wood-dark, translucent so the world shows through the HUD panels.
const BACKGROUND := Color(0.231, 0.149, 0.090, 0.82)
## --wood
const PANEL := Color("#6b4428")
## --wood-light
const PANEL_LIGHT := Color("#8f5f38")
## --parchment
const TEXT := Color("#ecdcb8")
## --gold
const ACCENT := Color("#d9a441")
## --gold-bright
const ACCENT_BRIGHT := Color("#f3cf72")
## --danger
const DANGER := Color("#c2452d")


## The default font size for a UI scale (1.0, 1.25, 1.5 give 18, 22, 27: the fraction is cut, never rounded up).
static func font_size(ui_scale: float) -> int:
	return floori(BASE_FONT_SIZE * ui_scale)


## A rounded box: `fill`, with a `border_px` border in `border` (0 for none).
static func box(fill: Color, border: Color, border_px: int, radius: int = 6) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = fill
	sb.border_color = border
	sb.set_border_width_all(border_px)
	sb.set_corner_radius_all(radius)
	sb.content_margin_left = 10
	sb.content_margin_right = 10
	sb.content_margin_top = 6
	sb.content_margin_bottom = 6
	return sb


static func make(ui_scale: float) -> Theme:
	var theme := Theme.new()
	theme.default_font_size = font_size(ui_scale)
	theme.set_color("font_color", "Label", TEXT)
	theme.set_color("font_shadow_color", "Label", Color(0, 0, 0, 0.6))
	theme.set_constant("shadow_offset_x", "Label", 1)
	theme.set_constant("shadow_offset_y", "Label", 1)
	# Readable over the snow-white winter ground too (Task 17 by eye).
	theme.set_color("font_outline_color", "Label", Color(0.1, 0.07, 0.04, 0.75))
	theme.set_constant("outline_size", "Label", 4)
	theme.set_stylebox("panel", "PanelContainer", box(BACKGROUND, PANEL, 2))
	theme.set_stylebox("panel", "Panel", box(BACKGROUND, PANEL, 2))
	for state: String in ["normal", "hover", "pressed", "disabled"]:
		var fill := PANEL
		if state == "hover":
			fill = PANEL_LIGHT
		elif state == "pressed":
			fill = BACKGROUND
		var border := ACCENT
		var text := TEXT
		if state == "disabled":
			# Muted, so a disabled choice (Continue with no save) reads as unavailable (Task 17 by eye).
			fill = PANEL.darkened(0.35)
			border = PANEL_LIGHT
			text = Color(TEXT, 0.45)
		theme.set_stylebox(state, "Button", box(fill, border, 1))
		theme.set_color("font_%s_color" % state, "Button", text)
	# The focus ring is always visible: a 2 px accent outline over the normal look.
	var focus := box(Color(0, 0, 0, 0), ACCENT_BRIGHT, 2)
	focus.border_color = ACCENT
	focus.draw_center = false
	theme.set_stylebox("focus", "Button", focus)
	theme.set_color("font_color", "Button", TEXT)
	theme.set_stylebox("background", "ProgressBar", box(BACKGROUND, PANEL, 2, 4))
	theme.set_stylebox("fill", "ProgressBar", box(ACCENT, ACCENT, 0, 4))
	return theme
