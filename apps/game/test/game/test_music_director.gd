extends CoreTest
## MusicDirector.pick: the first matching rule wins (soundtrack spec REQ-14).


func _pick(screen: String, zone: String, minute: int, weather: String, season: String, engagement: String) -> String:
	return MusicDirector.pick(screen, zone, minute, weather, season, engagement)


func test_anything_but_the_game_screen_plays_the_title() -> void:
	eq(_pick("title", "farm", 600, "sunny", "spring", "none"), "title")
	eq(_pick("title", "woods", 1300, "rain", "winter", "boss"), "title")


func test_the_boss_beats_every_zone_rule() -> void:
	eq(_pick("game", "mossdeep", 600, "sunny", "spring", "boss"), "matron")
	eq(_pick("game", "woods", 1300, "storm", "fall", "boss"), "matron")


func test_a_fight_picks_the_zones_fight_track_by_day_or_night() -> void:
	eq(_pick("game", "woods", 600, "sunny", "spring", "fight"), "woodsFight")
	eq(_pick("game", "woods", 1300, "sunny", "spring", "fight"), "woodsFight")
	eq(_pick("game", "mossdeep", 600, "sunny", "spring", "fight"), "mossdeepFight")


func test_a_fight_where_there_is_no_fight_track_falls_through() -> void:
	eq(_pick("game", "farm", 600, "sunny", "summer", "fight"), "summer")


func test_mossdeep_has_one_track_by_day_and_night() -> void:
	eq(_pick("game", "mossdeep", 600, "sunny", "spring", "none"), "mossdeep")
	eq(_pick("game", "mossdeep", 1300, "rain", "spring", "none"), "mossdeep")


func test_the_house_is_always_home_even_at_night_or_in_rain() -> void:
	eq(_pick("game", "house", 600, "sunny", "spring", "none"), "home")
	eq(_pick("game", "house", 1300, "rain", "winter", "none"), "home")


func test_night_is_by_place_from_twenty_hundred() -> void:
	eq(_pick("game", "lowmere", 1200, "sunny", "spring", "none"), "lowmereNight")
	eq(_pick("game", "clinic", 1250, "sunny", "spring", "none"), "lowmereNight")
	eq(_pick("game", "woods", 1200, "sunny", "spring", "none"), "woodsNight")
	eq(_pick("game", "farm", 1200, "sunny", "spring", "none"), "night")
	eq(_pick("game", "farm", 1199, "sunny", "spring", "none"), "spring")


func test_the_day_is_by_place() -> void:
	eq(_pick("game", "lowmere", 600, "sunny", "fall", "none"), "lowmere")
	eq(_pick("game", "clinic", 600, "sunny", "fall", "none"), "lowmere")
	eq(_pick("game", "woods", 600, "sunny", "fall", "none"), "woods")


func test_rain_only_changes_the_farm_and_never_lowmere_or_the_woods() -> void:
	eq(_pick("game", "farm", 600, "rain", "spring", "none"), "rain")
	eq(_pick("game", "farm", 600, "storm", "winter", "none"), "rain")
	eq(_pick("game", "lowmere", 600, "rain", "spring", "none"), "lowmere")
	eq(_pick("game", "woods", 600, "storm", "spring", "none"), "woods")


func test_the_farm_plays_its_season() -> void:
	for season: String in ["spring", "summer", "fall", "winter"]:
		eq(_pick("game", "farm", 600, "sunny", season, "none"), season)


func test_only_the_fight_and_boss_tracks_are_combat() -> void:
	for cue: String in ["woodsFight", "mossdeepFight", "matron"]:
		eq(MusicDirector.is_combat(cue), true)
	for cue: String in ["woods", "mossdeep", "title", "night"]:
		eq(MusicDirector.is_combat(cue), false)
