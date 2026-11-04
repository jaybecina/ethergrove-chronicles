class_name GoldLabel
extends Label
## Top-right gold: a coin and the amount with thousands separators (apps/web/src/ui/hud/Gold.tsx). The web counts the
## number up over 0.6 s; here it changes at once.

const COIN_RADIUS := 8.0


static func text_for(gold: int) -> String:
	return HudLabels.format_int(gold)


func _init() -> void:
	focus_mode = Control.FOCUS_NONE
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	add_theme_constant_override("line_spacing", 0)
	# Room for the coin left of the amount: a Label's minimum size includes its stylebox margins. (Overriding
	# _get_minimum_size with the coin alone clipped the amount off screen; found by eye in Task 17.)
	var box := StyleBoxEmpty.new()
	box.content_margin_left = COIN_RADIUS * 2.0 + 8.0
	add_theme_stylebox_override("normal", box)


func _draw() -> void:
	var cy := size.y * 0.5
	var cx := COIN_RADIUS + 2.0
	draw_circle(Vector2(cx, cy), COIN_RADIUS, ThemeFactory.ACCENT)
	draw_circle(Vector2(cx, cy), COIN_RADIUS * 0.6, ThemeFactory.ACCENT_BRIGHT)


func refresh(state: Dictionary) -> void:
	var gold: int = state["gold"]
	var next := text_for(gold)
	if next != text:
		text = next
