extends CoreTest
## Economy rules, ported from packages/core/test/economy.test.ts. `applyCommand` steps call the rule directly.


func _fresh() -> Dictionary:
	return TestStates.fresh()


func _shop(s: Dictionary) -> Dictionary:
	return TestStates.at_calendar(s, 600)


func _fail(reason: String) -> Array:
	return [{"type": "actionFailed", "reason": reason}]


func test_ship_unship_and_sell_the_rest() -> void:
	var s := TestStates.with_bag(_fresh(), [{"id": "turnip", "qty": 12}])
	s = st(Economy.ship_item(s, 0, 10))
	eq(s["bin"], [{"id": "turnip", "qty": 10}])
	eq(Bag.count_of(bag_of(s), "turnip"), 2)
	s = st(Economy.unship_item(s, 0, 4))
	eq(s["bin"], [{"id": "turnip", "qty": 6}])
	eq(Bag.count_of(bag_of(s), "turnip"), 6)
	var sold := Economy.sell_bin(s)
	eq(sold["total"], 210)
	eq(sold["items"], [{"id": "turnip", "qty": 6}])
	eq(st(sold)["bin"], [])
	eq(st(sold)["pendingGold"], 210)
	eq(st(sold)["gold"], 500)


func test_merges_repeat_shipments() -> void:
	var s := TestStates.with_bag(_fresh(), [{"id": "wood", "qty": 5}])
	s = st(Economy.ship_item(s, 0, 2))
	s = st(Economy.ship_item(s, 0, 3))
	eq(s["bin"], [{"id": "wood", "qty": 5}])
	eq((bag_of(s) as Array)[0], null)


func test_seeds_are_not_sellable() -> void:
	eq(Economy.sell_price("seed:turnip"), null)
	eq(Economy.sell_price("turnip"), 35)
	eq(ev(Economy.ship_item(_fresh(), 0, 1)), _fail("notSellable"))


func test_shipping_more_than_held_or_from_empty_slot_fails() -> void:
	var s := TestStates.with_bag(_fresh(), [{"id": "turnip", "qty": 1}])
	eq(ev(Economy.ship_item(s, 0, 2)), _fail("noItem"))
	eq(ev(Economy.ship_item(s, 4, 1)), _fail("noItem"))
	eq(ev(Economy.unship_item(s, 0, 1)), _fail("noItem"))


func test_unshipping_into_full_bag_fails_and_keeps_bin() -> void:
	var s := TestStates.with_bag(_fresh(), [{"id": "turnip", "qty": 3}])
	s = st(Economy.ship_item(s, 0, 3))
	s = TestStates.with_bag(s, TestStates.full_bag())
	var r := Economy.unship_item(s, 0, 3)
	eq(ev(r), _fail("bagFull"))
	eq(st(r)["bin"], [{"id": "turnip", "qty": 3}])


func test_cart_is_open_nine_to_before_five() -> void:
	assert_false(Economy.is_cart_open(TestStates.at_calendar(_fresh(), 539)))
	assert_true(Economy.is_cart_open(TestStates.at_calendar(_fresh(), 540)))
	assert_true(Economy.is_cart_open(TestStates.at_calendar(_fresh(), 1019)))
	assert_false(Economy.is_cart_open(TestStates.at_calendar(_fresh(), 1020)))


func test_cart_is_closed_in_winter_and_storms() -> void:
	assert_false(Economy.is_cart_open(TestStates.at_calendar(_fresh(), 600, "winter")))
	assert_false(Economy.is_cart_open(TestStates.at_calendar(_fresh(), 600, "summer", "storm")))
	assert_true(Economy.is_cart_open(TestStates.at_calendar(_fresh(), 600, "summer", "rain")))


func test_cart_stocks_only_current_season_seeds() -> void:
	eq(Economy.cart_stock(TestStates.at_calendar(_fresh(), 600, "summer")), ["seed:tomato", "seed:corn", "seed:melon"])
	eq(Economy.cart_stock(TestStates.at_calendar(_fresh(), 600, "fall")), ["seed:pumpkin", "seed:eggplant"])


func test_buys_five_potato_seeds_with_exactly_250_gold() -> void:
	var s := _shop(_fresh())
	s["gold"] = 250
	var r := Economy.buy_item(s, "seed:potato", 5)
	eq(st(r)["gold"], 0)
	eq(Bag.count_of(bag_of(st(r)), "seed:potato"), 5)
	assert_true((ev(r) as Array).has({"type": "goldChanged", "gold": 0, "delta": -250}))
	assert_true((ev(r) as Array).has({"type": "itemGained", "item": "seed:potato", "qty": 5}))


func test_rejects_when_one_gold_short_and_changes_nothing() -> void:
	var s := _shop(_fresh())
	s["gold"] = 249
	var r := Economy.buy_item(s, "seed:potato", 5)
	eq(ev(r), _fail("notEnoughGold"))
	eq(st(r), s)


func test_rejects_closed_hours_off_season_seeds_and_full_bag() -> void:
	eq(ev(Economy.buy_item(TestStates.at_calendar(_fresh(), 400), "seed:turnip", 1)), _fail("cartClosed"))
	eq(ev(Economy.buy_item(_shop(_fresh()), "seed:corn", 1)), _fail("wrongSeason"))
	var full := TestStates.with_bag(_shop(_fresh()), TestStates.full_bag())
	var r := Economy.buy_item(full, "seed:turnip", 1)
	eq(ev(r), _fail("bagFull"))
	eq(st(r)["gold"], 500)


func test_rejects_non_positive_quantities() -> void:
	var s := _shop(_fresh())
	var zero := Economy.buy_item(s, "seed:turnip", 0)
	assert_push_error("Bad quantity")
	eq(zero, {"state": s, "events": []})
	var negative := Economy.buy_item(s, "seed:turnip", -2)
	assert_push_error("Bad quantity")
	eq(negative, {"state": s, "events": []})


func test_core_does_not_mutate_input() -> void:
	var s := TestStates.with_bag(_shop(_fresh()), [{"id": "turnip", "qty": 12}])
	s = st(Economy.ship_item(s, 0, 5))
	var before := s.duplicate(true)
	Economy.ship_item(s, 0, 3)
	Economy.unship_item(s, 0, 2)
	Economy.sell_bin(s)
	Economy.is_cart_open(s)
	Economy.cart_stock(s)
	Economy.buy_item(s, "seed:turnip", 2)
	Economy.sell_price("turnip")
	eq(s, before)
