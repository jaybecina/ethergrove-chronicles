extends CoreTest
## MusicConductor: when the playing cue changes and how fast it fades (soundtrack spec REQ-16). Pure logic on a fake
## clock: `update(wanted, dt_s)` returns true when the cue to play changed.


func test_the_first_cue_starts_with_the_normal_fade() -> void:
	var c := MusicConductor.new()
	eq(c.update("title", 0.0), true)
	eq(c.current, "title")
	eq(c.fade_s, 2.0)


func test_the_same_cue_twice_does_not_restart() -> void:
	var c := MusicConductor.new()
	c.update("spring", 0.0)
	eq(c.update("spring", 0.5), false)
	eq(c.current, "spring")


func test_a_normal_change_fades_over_two_seconds() -> void:
	var c := MusicConductor.new()
	c.update("spring", 0.0)
	eq(c.update("night", 0.5), true)
	eq(c.current, "night")
	eq(c.fade_s, 2.0)


func test_a_fight_fades_in_fast() -> void:
	var c := MusicConductor.new()
	c.update("woods", 0.0)
	eq(c.update("woodsFight", 0.5), true)
	eq(c.fade_s, 0.8)
	var b := MusicConductor.new()
	b.update("mossdeep", 0.0)
	b.update("matron", 0.5)
	eq(b.fade_s, 0.8)


func test_the_fight_track_stays_four_seconds_after_the_fight_ends() -> void:
	var c := MusicConductor.new()
	c.update("woods", 0.0)
	c.update("woodsFight", 0.5)
	eq(c.update("woods", 0.5), false)
	eq(c.update("woods", 3.0), false)
	eq(c.current, "woodsFight")
	eq(c.update("woods", 0.6), true)
	eq(c.current, "woods")
	eq(c.fade_s, 2.0)


func test_a_new_fight_during_the_hold_restarts_the_hold() -> void:
	var c := MusicConductor.new()
	c.update("woods", 0.0)
	c.update("woodsFight", 0.0)
	c.update("woods", 3.0)
	c.update("woodsFight", 0.5)
	eq(c.update("woods", 3.9), false)
	eq(c.current, "woodsFight")
	eq(c.update("woods", 0.2), true)


func test_the_boss_gives_way_to_a_fight_track_at_once() -> void:
	var c := MusicConductor.new()
	c.update("mossdeep", 0.0)
	c.update("matron", 0.0)
	eq(c.update("mossdeepFight", 0.1), true)
	eq(c.current, "mossdeepFight")
