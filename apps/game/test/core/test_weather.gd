extends GutTest
## Weather rolls, ported from packages/core/test/weather.test.ts, including the
## "new game forecast" case.


func _tally(season: String, n: int = 10000) -> Dictionary:
	var counts: Dictionary = {"sunny": 0, "cloudy": 0, "rain": 0, "storm": 0, "snow": 0}
	var rng := 99
	for i: int in n:
		var res := Weather.roll(season, 5, rng)
		var w: String = res[0]
		var seen: int = counts[w]
		counts[w] = seen + 1
		rng = res[1]
	return counts


func _count(counts: Dictionary, key: String) -> int:
	var n: int = counts[key]
	return n


func test_day_1_is_always_sunny_and_does_not_consume_rng() -> void:
	for season: String in ["spring", "summer", "fall", "winter"]:
		assert_eq(Weather.roll(season, 1, 1234), ["sunny", 1234])


func test_only_rolls_weather_valid_for_the_season() -> void:
	var spring := _tally("spring")
	assert_eq(_count(spring, "snow") + _count(spring, "storm"), 0)
	var winter := _tally("winter")
	assert_eq(_count(winter, "rain") + _count(winter, "storm"), 0)
	assert_eq(_count(_tally("summer"), "snow"), 0)


func test_spring_rain_share_is_within_0_27_to_0_33() -> void:
	var share := float(_count(_tally("spring"), "rain")) / 10000.0
	assert_gt(share, 0.27)
	assert_lt(share, 0.33)


func test_is_deterministic_for_the_same_rng() -> void:
	var a := Weather.roll("summer", 9, 555)
	var b := Weather.roll("summer", 9, 555)
	assert_eq(a, b)


func test_roll_advances_rng_by_one_step() -> void:
	var rolled := Weather.roll("spring", 5, 555)
	var stepped := Rng.next_float(555)
	var got: int = rolled[1]
	var want: int = stepped[1]
	assert_eq(got, want)


func test_new_game_forecast_rolls_tomorrow_for_spring_2_from_the_game_rng() -> void:
	var forecasts: Dictionary = {}
	for seed_value: int in 40:
		var s := NewGame.create({"seed": seed_value, "farmName": "a", "playerName": "b"})
		var weather: Dictionary = s["weather"]
		forecasts[weather["tomorrow"]] = true
	assert_true(forecasts.has("rain"))
	assert_false(forecasts.has("snow"))
