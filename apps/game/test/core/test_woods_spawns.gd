extends CoreTest
## Lowmere Woods night spawns (M1 spec 6.4): packs of 2-3 Gloamed burrowers at levels 1-3, 20:00 to 05:00.


func test_night_window() -> void:
	assert_true(WoodsSpawns.is_night(1200))
	assert_true(WoodsSpawns.is_night(1500))
	assert_true(WoodsSpawns.is_night(120))
	assert_false(WoodsSpawns.is_night(1199))
	assert_false(WoodsSpawns.is_night(360))
	assert_false(WoodsSpawns.is_night(300))


func test_packs_are_two_or_three_burrowers_of_level_one_to_three() -> void:
	var packs := WoodsSpawns.packs(7)
	assert_true(packs.size() >= 3)
	for p: Variant in packs:
		var pack := a(p)
		assert_true(pack.size() >= 2 and pack.size() <= 3, "pack size %d" % pack.size())
		for e: Variant in pack:
			var enemy := d(e)
			eq(enemy["id"], "burrower")
			var lvl: int = enemy["level"]
			assert_true(lvl >= 1 and lvl <= 3, "level %d" % lvl)


func test_spawn_points_are_free_tiles_inside_the_woods() -> void:
	var g := Zones.grid("woods")
	for salt: int in [0, 1, 2, 99]:
		for p: Variant in WoodsSpawns.packs(salt):
			for e: Variant in a(p):
				var enemy := d(e)
				var x: float = enemy["x"]
				var y: float = enemy["y"]
				assert_false(Grid.is_blocked(Grid.tile_at(g, floori(x), floori(y))), "%f,%f" % [x, y])
				assert_true(x > 12.0, "not on top of the spawn corridor")


func test_same_salt_same_packs_and_other_salt_differs() -> void:
	eq(WoodsSpawns.packs(5), WoodsSpawns.packs(5))
	assert_ne(WoodsSpawns.packs(5), WoodsSpawns.packs(6))


func test_salt_from_calendar_changes_every_day() -> void:
	var c := {"year": 1, "season": "spring", "day": 3, "minute": 600}
	var n := {"year": 1, "season": "spring", "day": 4, "minute": 600}
	assert_ne(WoodsSpawns.salt(c), WoodsSpawns.salt(n))
	eq(WoodsSpawns.salt(c), WoodsSpawns.salt(c))
