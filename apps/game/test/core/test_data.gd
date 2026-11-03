extends GutTest
## The ported game data modules.


func test_crops() -> void:
	var turnip: Dictionary = CropData.CROPS["turnip"]
	var strawberry: Dictionary = CropData.CROPS["strawberry"]
	var potato: Dictionary = CropData.CROPS["potato"]
	var turnip_days: int = turnip["days"]
	var strawberry_regrow: int = strawberry["regrow"]
	var potato_regrow: Variant = potato["regrow"]
	assert_eq(turnip_days, 4)
	assert_eq(strawberry_regrow, 4)
	assert_true(potato_regrow == null, "potato regrow is null")
	assert_eq(CropData.CROP_IDS.size(), 8)
	assert_eq(CropData.CROPS.size(), 8)
	var pumpkin: Dictionary = CropData.CROPS["pumpkin"]
	assert_eq(pumpkin, {"season": "fall", "seedCost": 100, "days": 13, "regrow": null, "sell": 320, "eat": 20})


func test_items() -> void:
	var melon_seed: Dictionary = ItemData.ITEMS["seed:melon"]
	var melon_kind: String = melon_seed["kind"]
	assert_eq(melon_kind, "seed")
	assert_eq(ItemData.ITEMS.size(), 3 + 16)
	assert_eq(ItemData.ITEMS["wood"], {"kind": "material", "sell": 2, "eat": null})
	assert_eq(ItemData.ITEMS["corn"], {"kind": "crop", "sell": 50, "eat": 12})
	assert_eq(ItemData.seed_of("corn"), "seed:corn")
	assert_eq(ItemData.crop_of_seed("seed:corn"), "corn")
	assert_eq(ItemData.crop_of_seed("corn"), "")


func test_layouts() -> void:
	assert_eq(Layouts.FARM_LAYOUT.size(), 24)
	for row: String in Layouts.FARM_LAYOUT:
		assert_eq(row.length(), 32, row)
	assert_eq(Layouts.HOUSE_LAYOUT.size(), 6)
	for row: String in Layouts.HOUSE_LAYOUT:
		assert_eq(row.length(), 8, row)
	assert_eq(Layouts.FARM_LAYOUT[4], "#_HHDHHB_______________________#")
	assert_eq(Layouts.FARM_LAYOUT[17], "#______________________________C")
	assert_eq(Layouts.FARM_LEGEND["D"], {"kind": "feature", "feature": "houseDoor"})
	assert_eq(Layouts.HOUSE_LEGEND["S"], {"kind": "floor"})
	assert_eq(Layouts.FIELD_RECT, {"x0": 3, "y0": 6, "x1": 27, "y1": 16})
	assert_eq(Layouts.FARM_SPAWN_CHAR, "P")
	assert_eq(Layouts.HOUSE_SPAWN_CHAR, "S")


func test_lessons() -> void:
	assert_eq(Lessons.LESSON_ORDER.size(), 10)
	assert_eq(Lessons.LESSON_ORDER[9], "buySeeds")
	assert_eq(Lessons.LESSON_GOAL, {"till": 3, "plant": 3})
	assert_eq(Lessons.NOTE_IDS.size(), 10)
	assert_eq(Lessons.NOTE_IDS[0], "canEmpty")
	assert_eq(Lessons.LESSONS_GIFT, 100)


func test_balance() -> void:
	assert_eq(Balance.START_GOLD, 500)
	assert_eq(Balance.BAG_SLOTS, 12)
	assert_eq(Balance.PASS_OUT_MINUTE, 1560)
	assert_eq(Balance.WALK_SPEED, 2.6)
	assert_eq(Balance.MISS_COSTS_STAMINA, true)
	assert_eq(Balance.MAX_ENERGY, 100)
	assert_eq(Balance.BASE_MAX_HP, 100)
	assert_eq(Balance.TOOL_ORDER, ["hoe", "can", "sickle", "axe", "hammer"])
	assert_eq(Balance.TOOL_COST, {"hoe": 2, "can": 2, "sickle": 1, "axe": 4, "hammer": 4})


func test_weather_weights_sum_to_one() -> void:
	assert_eq(WeatherTable.TABLE.size(), 4)
	for season: String in WeatherTable.TABLE:
		var picks: Array = WeatherTable.TABLE[season]
		var total := 0.0
		for pick: Array in picks:
			var w: float = pick[1]
			total += w
		assert_almost_eq(total, 1.0, 1e-9, season)
	assert_eq(WeatherTable.TABLE["winter"], [["sunny", 0.35], ["cloudy", 0.25], ["snow", 0.4]])
