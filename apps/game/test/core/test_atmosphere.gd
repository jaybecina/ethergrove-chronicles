extends CoreTest
## Atmosphere: season palette, night factor (apps/web/src/render/lighting.ts nightFactor), sun energy, weather amounts.

const SEASON_IDS: Array[String] = ["spring", "summer", "fall", "winter"]


func _hm(h: int, m: int = 0) -> int:
	return h * 60 + m


func test_night_factor_curve() -> void:
	# The TypeScript curve is authoritative: 0 from 07:00 to 18:00, ramps up to 1 at 21:00, 1 until 05:00, ramps
	# down to 0 at 07:00.
	for h: int in [7, 8, 12, 17, 18]:
		assert_almost_eq(Atmosphere.night_factor(_hm(h)), 0.0, 0.0001, "hour %d" % h)
	assert_almost_eq(Atmosphere.night_factor(_hm(19)), 60.0 / 180.0, 0.0001)
	assert_almost_eq(Atmosphere.night_factor(_hm(19, 30)), 0.5, 0.0001)
	for h: int in [21, 23, 2, 5]:
		assert_almost_eq(Atmosphere.night_factor(_hm(h)), 1.0, 0.0001, "hour %d" % h)
	assert_almost_eq(Atmosphere.night_factor(_hm(6)), 0.5, 0.0001)
	assert_almost_eq(Atmosphere.night_factor(_hm(6, 30)), 0.25, 0.0001)


func test_night_factor_wraps_past_midnight() -> void:
	assert_almost_eq(Atmosphere.night_factor(1560), 1.0, 0.0001)
	assert_almost_eq(Atmosphere.night_factor(1440 + _hm(12)), 0.0, 0.0001)
	assert_almost_eq(Atmosphere.night_factor(1440), 1.0, 0.0001)


func test_season_table_values() -> void:
	var seasons: Dictionary = Atmosphere.SEASONS
	eq(seasons.keys().size(), 4)
	for id: String in SEASON_IDS:
		assert_true(seasons.has(id), id)
		var row: Dictionary = d(seasons[id])
		for key: String in ["ground", "foliage", "sky", "snow"]:
			assert_true(row.has(key), "%s.%s" % [id, key])
	eq(d(seasons["spring"])["ground"], Color("#5e7d3c"))
	eq(d(seasons["spring"])["foliage"], Color(1, 1, 1))
	eq(d(seasons["spring"])["sky"], Color(0.55, 0.75, 0.92))
	eq(d(seasons["summer"])["ground"], Color("#6d7f3a"))
	eq(d(seasons["summer"])["foliage"], Color(1.05, 1.0, 0.82))
	eq(d(seasons["summer"])["sky"], Color(0.5, 0.72, 0.95))
	eq(d(seasons["fall"])["ground"], Color("#7d7434"))
	eq(d(seasons["fall"])["foliage"], Color(1.25, 0.72, 0.38))
	eq(d(seasons["fall"])["sky"], Color(0.75, 0.72, 0.65))
	eq(d(seasons["winter"])["ground"], Color(0.86, 0.9, 0.95))
	eq(d(seasons["winter"])["foliage"], Color(0.75, 0.8, 0.82))
	eq(d(seasons["winter"])["sky"], Color(0.72, 0.8, 0.88))
	for id: String in SEASON_IDS:
		eq(d(seasons[id])["snow"], id == "winter")


func test_rain_and_snow_amounts() -> void:
	eq(Atmosphere.rain_amount("rain"), 1.0)
	eq(Atmosphere.rain_amount("storm"), 1.6)
	for w: String in ["sunny", "cloudy", "snow"]:
		eq(Atmosphere.rain_amount(w), 0.0, w)
	eq(Atmosphere.snow_amount("snow"), 1.0)
	for w: String in ["sunny", "cloudy", "rain", "storm"]:
		eq(Atmosphere.snow_amount(w), 0.0, w)


func test_sun_energy_by_weather_and_time() -> void:
	assert_almost_eq(Atmosphere.sun_energy(_hm(12), "sunny"), 1.0, 0.0001)
	assert_almost_eq(Atmosphere.sun_energy(_hm(12), "cloudy"), 0.75, 0.0001)
	assert_almost_eq(Atmosphere.sun_energy(_hm(12), "rain"), 0.55, 0.0001)
	assert_almost_eq(Atmosphere.sun_energy(_hm(12), "storm"), 0.4, 0.0001)
	assert_almost_eq(Atmosphere.sun_energy(_hm(12), "snow"), 0.7, 0.0001)
	# Night keeps a floor, dusk is in between.
	assert_almost_eq(Atmosphere.sun_energy(_hm(23), "sunny"), Atmosphere.NIGHT_SUN_ENERGY, 0.0001)
	assert_almost_eq(Atmosphere.sun_energy(_hm(23), "storm"), Atmosphere.NIGHT_SUN_ENERGY, 0.0001)
	var dusk: float = Atmosphere.sun_energy(_hm(19, 30), "sunny")
	assert_true(dusk > Atmosphere.NIGHT_SUN_ENERGY and dusk < 1.0)


func test_ground_color_is_the_season_ground() -> void:
	eq(Atmosphere.ground_color("spring"), Color("#5e7d3c"))
	eq(Atmosphere.ground_color("fall"), Color("#7d7434"))
	eq(Atmosphere.ground_color("winter"), Color(0.86, 0.9, 0.95), "winter reaches its snow white")
	eq(Atmosphere.foliage_tint("fall"), Color(1.25, 0.72, 0.38))


func test_unknown_season_and_weather_fall_back() -> void:
	eq(Atmosphere.ground_color("nope"), Atmosphere.ground_color("spring"))
	assert_almost_eq(Atmosphere.sun_energy(_hm(12), "meteors"), 1.0, 0.0001)
