extends GutTest
## Calendar rules, ported from packages/core/test/calendar.test.ts.


func _cal(season: String, day: int, minute: int) -> Dictionary:
	return {"year": 1, "season": season, "day": day, "minute": minute}


func test_next_day_rolls_spring_28_into_summer_1() -> void:
	assert_eq(Calendar.next_day(_cal("spring", 28, 900)), _cal("summer", 1, 360))


func test_next_day_rolls_winter_28_into_year_2_spring_1() -> void:
	var want := _cal("spring", 1, 360)
	want["year"] = 2
	assert_eq(Calendar.next_day(_cal("winter", 28, 1500)), want)


func test_next_day_advances_a_normal_day() -> void:
	assert_eq(Calendar.next_day(_cal("fall", 3, 1200)), _cal("fall", 4, 360))


func test_next_day_does_not_mutate_input() -> void:
	var cal := _cal("fall", 3, 1200)
	Calendar.next_day(cal)
	assert_eq(cal, _cal("fall", 3, 1200))


func test_weekday() -> void:
	assert_eq(Calendar.weekday(_cal("spring", 1, 360)), "Mon")
	assert_eq(Calendar.weekday(_cal("spring", 8, 360)), "Mon")
	assert_eq(Calendar.weekday(_cal("summer", 1, 360)), "Mon")
	assert_eq(Calendar.weekday(_cal("spring", 7, 360)), "Sun")


func test_format_clock() -> void:
	var cases: Array = [
		[360, "6:00 AM"], [780, "1:00 PM"], [1500, "1:00 AM"], [0, "12:00 AM"],
		[720, "12:00 PM"], [1445, "12:05 AM"], [545, "9:05 AM"],
	]
	for c: Array in cases:
		var minute: int = c[0]
		var text: String = c[1]
		assert_eq(Calendar.format_clock(minute), text, "%d" % minute)


func test_should_pass_out_at_1560_but_not_1559() -> void:
	assert_false(Calendar.should_pass_out(_cal("spring", 1, 1559)))
	assert_true(Calendar.should_pass_out(_cal("spring", 1, 1560)))


func test_advance_minutes_adds_minutes_without_rolling_the_day() -> void:
	var cal := _cal("spring", 1, 1430)
	assert_eq(Calendar.advance_minutes(cal, 20), _cal("spring", 1, 1450))
	var minute: int = cal["minute"]
	assert_eq(minute, 1430)


func test_advance_minutes_rejects_negative_input() -> void:
	var cal := _cal("spring", 1, 360)
	var got := Calendar.advance_minutes(cal, -1)
	assert_push_error("backwards")
	assert_eq(got, cal)


func test_seasons_order() -> void:
	var want: Array[String] = ["spring", "summer", "fall", "winter"]
	assert_eq(Calendar.SEASONS, want)
