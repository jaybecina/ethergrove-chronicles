class_name Atmosphere
extends RefCounted
## Season palette, time of day and weather numbers for the world look. Pure: the AtmosphereDriver node applies them.
## SEASONS is copied from the Godot proof (ethergrove-godot-proof/main.gd). night_factor is the web curve
## (apps/web/src/render/lighting.ts nightFactor); the plan summarised it as 08:00-17:00, but the TypeScript is
## authoritative: 0 from 07:00 to 18:00, up to 1 at 21:00, 1 until 05:00, down to 0 at 07:00.

const SEASONS: Dictionary = {
	"spring": {"ground": Color("#5e7d3c"), "foliage": Color(1, 1, 1), "sky": Color(0.55, 0.75, 0.92), "snow": false},
	"summer": {"ground": Color("#6d7f3a"), "foliage": Color(1.05, 1.0, 0.82), "sky": Color(0.5, 0.72, 0.95), "snow": false},
	"fall": {"ground": Color("#7d7434"), "foliage": Color(1.25, 0.72, 0.38), "sky": Color(0.75, 0.72, 0.65), "snow": false},
	"winter": {"ground": Color(0.86, 0.9, 0.95), "foliage": Color(0.75, 0.8, 0.82), "sky": Color(0.72, 0.8, 0.88), "snow": true},
}

## Sun strength at night (a floor so moonlight still shows shapes). Draft value.
const NIGHT_SUN_ENERGY := 0.12

## Sun energy multiplier at full daylight per weather. Draft values (clear 1.0 at noon).
const WEATHER_SUN: Dictionary = {"sunny": 1.0, "cloudy": 0.75, "rain": 0.55, "storm": 0.4, "snow": 0.7}

const MINUTES_PER_DAY := 1440


## 0 in daylight, 1 at night; drives window glow and the dark sky. Minutes of 1440 or more wrap (the day runs to 26:00).
static func night_factor(minute: int) -> float:
	var m: int = posmod(minute, MINUTES_PER_DAY)
	if m >= 420 and m <= 1080:
		return 0.0
	if m > 1080 and m < 1260:
		return (m - 1080) / 180.0
	if m > 300 and m < 420:
		return (420 - m) / 120.0
	return 1.0


static func sun_energy(minute: int, weather: String) -> float:
	var day: float = 1.0 - night_factor(minute)
	var mult: float = WEATHER_SUN.get(weather, 1.0)
	return maxf(NIGHT_SUN_ENERGY, mult * day)


static func rain_amount(weather: String) -> float:
	match weather:
		"rain":
			return 1.0
		"storm":
			return 1.6
	return 0.0


static func snow_amount(weather: String) -> float:
	return 1.0 if weather == "snow" else 0.0


static func season_row(season: String) -> Dictionary:
	var row: Dictionary = SEASONS.get(season, SEASONS["spring"])
	return row


## The season's grass colour (sRGB). ZoneView puts it into the grass tiles' vertex colours (with their lightness
## jitter) and the apron; paths, floors and water keep theirs. (Task 12 multiplied the ground material instead, which
## cannot reach winter's near-white and tinted the paths as well; replaced after the Task 17 by-eye check.)
static func ground_color(season: String) -> Color:
	var ground: Color = season_row(season)["ground"]
	return ground


static func foliage_tint(season: String) -> Color:
	var foliage: Color = season_row(season)["foliage"]
	return foliage


static func sky_color(season: String) -> Color:
	var sky: Color = season_row(season)["sky"]
	return sky
