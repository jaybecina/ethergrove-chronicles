class_name ClockLabel
extends Label
## Top-left clock: time, "Mon, Spring 1" and today's and tomorrow's weather (apps/web/src/ui/hud/Clock.tsx; its
## weather icons become the text of their aria labels).


static func text_for(state: Dictionary) -> String:
	var cal: Dictionary = state["calendar"]
	var weather: Dictionary = state["weather"]
	var minute: int = cal["minute"]
	var season: String = cal["season"]
	var day: int = cal["day"]
	var today: String = weather["today"]
	var tomorrow: String = weather["tomorrow"]
	return "%s\n%s, %s %d\nToday: %s   Tomorrow: %s" % [
		Calendar.format_clock(minute),
		Calendar.weekday(cal),
		HudLabels.SEASON_NAMES[season],
		day,
		HudLabels.WEATHER_NAMES[today],
		HudLabels.WEATHER_NAMES[tomorrow],
	]


func _init() -> void:
	focus_mode = Control.FOCUS_NONE
	mouse_filter = Control.MOUSE_FILTER_IGNORE


func refresh(state: Dictionary) -> void:
	var next := text_for(state)
	if next != text:
		text = next
