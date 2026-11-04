extends CoreTest
## Enemy data (M1 spec 6.4). Every attack telegraphs at least 0.5 s, bosses at least 0.7 s (October spec 6.3).


func test_ids() -> void:
	eq(Enemies.IDS, ["burrower", "brute", "wisp", "mossmaw", "bramble_matron"])


func test_burrower_scales_with_level() -> void:
	eq(Enemies.hp("burrower", 1), 50)
	eq(Enemies.hp("burrower", 5), 90)
	eq(Enemies.attack_power("burrower", 3), 14)
	eq(Enemies.def("burrower")["telegraph_ms"], 500)
	eq(Enemies.def("burrower")["parry_stagger_ms"], 1500)


func test_brute_scales_with_level() -> void:
	eq(Enemies.hp("brute", 3), 235)
	eq(Enemies.attack_power("brute", 3), 31)
	eq(Enemies.def("brute")["telegraph_ms"], 900)
	eq(Enemies.def("brute")["parry_stagger_ms"], 0, "a parry does not stagger a brute")
	eq(Enemies.def("brute")["radius"], 2.5)


func test_wisp_keeps_distance_and_fires_blockable_bolts() -> void:
	eq(Enemies.hp("wisp", 2), 42)
	eq(Enemies.attack_power("wisp", 2), 14)
	var wisp := Enemies.def("wisp")
	eq(wisp["keep_min"], 6.0)
	eq(wisp["keep_max"], 9.0)
	eq(wisp["projectile_speed"], 12.0)
	eq(wisp["telegraph_ms"], 1000)


func test_elite_and_boss_are_fixed() -> void:
	eq(Enemies.hp("mossmaw", 7), 900)
	eq(Enemies.attack_power("mossmaw", 7), 30)
	eq(Enemies.hp("bramble_matron", 10), 2600)
	eq(Enemies.attack_power("bramble_matron", 10), 24)
	eq(Enemies.def("bramble_matron")["root_burst_power"], 30)


func test_telegraph_minimums() -> void:
	for id: String in Enemies.IDS:
		var minimum := 700 if id == "bramble_matron" else 500
		var t: int = Enemies.def(id)["telegraph_ms"]
		assert_true(t >= minimum, "%s telegraph %d" % [id, t])


func test_level_ranges() -> void:
	eq(Enemies.def("burrower")["levels"], [1, 5])
	eq(Enemies.def("brute")["levels"], [3, 8])
	eq(Enemies.def("wisp")["levels"], [2, 8])


func test_clamp_level_into_range() -> void:
	eq(Enemies.clamp_level("burrower", 9), 5)
	eq(Enemies.clamp_level("brute", 1), 3)
	eq(Enemies.clamp_level("mossmaw", 2), 7, "fixed level")
