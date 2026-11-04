extends CoreTest
## Levels and XP (M1 spec 7.4, October spec 6.1).


func test_xp_to_next() -> void:
	eq(Progression.xp_to_next(1), 100)
	eq(Progression.xp_to_next(2), 283, "round(100 * 2^1.5)")
	eq(Progression.xp_to_next(4), 800)
	eq(Progression.xp_to_next(10), 3162)


func test_max_hp_and_stamina() -> void:
	eq(Progression.max_hp(1), 100)
	eq(Progression.max_hp(5), 132)
	eq(Progression.max_stamina(1), 100)
	eq(Progression.max_stamina(11), 130)


func test_xp_sources() -> void:
	eq(Progression.monster_xp(3), 30)
	eq(Progression.BOSS_XP, 1000)
	eq(Progression.FIRST_FLOOR_XP, 50)
	eq(Progression.HARVEST_XP, 1)


func test_add_xp_without_level_up() -> void:
	eq(Progression.add_xp(1, 0, 40), {"level": 1, "xp": 40, "levels_gained": 0})


func test_add_xp_levels_up_and_carries_over() -> void:
	eq(Progression.add_xp(1, 90, 30), {"level": 2, "xp": 20, "levels_gained": 1})


func test_add_xp_can_gain_several_levels() -> void:
	var r := Progression.add_xp(1, 0, 1000)
	eq(r["levels_gained"], 3, "100 + 283 + 520 = 903 <= 1000 < 903 + 800")
	eq(r["level"], 4)
	eq(r["xp"], 97)


func test_add_xp_ignores_negative() -> void:
	eq(Progression.add_xp(3, 10, -5), {"level": 3, "xp": 10, "levels_gained": 0})
