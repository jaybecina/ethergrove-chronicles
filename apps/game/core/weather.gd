class_name Weather
extends RefCounted
## Weather rolls, ported from packages/core/src/systems/weather.ts.


## Returns `[weather: String, rng: int]`. Day 1 is always sunny and does not consume the rng.
static func roll(season: String, day: int, rng: int) -> Array:
	if day == 1:
		return ["sunny", rng]
	var res := Rng.next_float(rng)
	var v: float = res[0]
	var next: int = res[1]
	var acc := 0.0
	var table: Array = WeatherTable.TABLE[season]
	for entry_value: Variant in table:
		var entry: Array = entry_value
		var weight: float = entry[1]
		acc += weight
		if v < acc:
			return [entry[0], next]
	return ["sunny", next]
