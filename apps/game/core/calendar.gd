class_name Calendar
extends RefCounted
## Calendar rules, ported from packages/core/src/systems/calendar.ts. A calendar is {year, season, day, minute}.

const SEASONS: Array[String] = ["spring", "summer", "fall", "winter"]
const WEEKDAYS: Array[String] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


## Adds minutes without rolling the day. Negative input pushes an error and returns the calendar unchanged.
static func advance_minutes(cal: Dictionary, minutes: int) -> Dictionary:
	if minutes < 0:
		push_error("Cannot advance time backwards")
		return cal
	var next := cal.duplicate(true)
	var minute: int = cal["minute"]
	next["minute"] = minute + minutes
	return next


static func next_day(cal: Dictionary) -> Dictionary:
	var day: int = cal["day"]
	if day < Balance.SEASON_DAYS:
		var same := cal.duplicate(true)
		same["day"] = day + 1
		same["minute"] = Balance.DAY_START_MINUTE
		return same
	var current: String = cal["season"]
	var season := SEASONS[(SEASONS.find(current) + 1) % SEASONS.size()]
	var year: int = cal["year"]
	return {
		"year": year + 1 if season == "spring" else year,
		"season": season,
		"day": 1,
		"minute": Balance.DAY_START_MINUTE,
	}


## Seasons are 28 days (4 weeks), so day 1 of every season is a Monday.
static func weekday(cal: Dictionary) -> String:
	var day: int = cal["day"]
	return WEEKDAYS[(day - 1) % 7]


static func format_clock(minute: int) -> String:
	var m := minute % 1440
	var h24 := m / 60
	var h12 := 12 if h24 % 12 == 0 else h24 % 12
	return "%d:%02d %s" % [h12, m % 60, "AM" if h24 < 12 else "PM"]


static func should_pass_out(cal: Dictionary) -> bool:
	var minute: int = cal["minute"]
	return minute >= Balance.PASS_OUT_MINUTE
