extends CoreTest
## Quick slot pins follow items, not positions. Ported from packages/core/test/quickSlots.test.ts; the
## applyCommand steps are replayed through the same rule functions (the post-pass is Bag.prune_pins).


func _farm_with_tilled_target() -> Dictionary:
	var s := TestStates.stand_at(TestStates.blank_farm(TestStates.fresh()), 10, 10, "e")
	return TestStates.with_tile(s, 11, 10, {"kind": "tilled", "watered": false})


func test_planting_last_seed_clears_pin_so_later_harvest_is_not_eaten() -> void:
	var s := Bag.select_hotbar(TestStates.with_bag(_farm_with_tilled_target(), [{"id": "seed:turnip", "qty": 1}]), 5)
	s = Bag.prune_pins(st(Crops.use_item(s)))
	var bag: Array = bag_of(s)
	var quick: Array = s["quickSlots"]
	eq(bag[0], null)
	eq(quick[0], null)
	s = TestStates.with_bag(s, [{"id": "turnip", "qty": 1}])
	var r := Crops.use_item(s)
	eq(ev(r), [{"type": "actionFailed", "reason": "noItem"}])


func test_shipping_whole_pinned_stack_clears_pin() -> void:
	var s := TestStates.with_bag(TestStates.fresh(), [{"id": "turnip", "qty": 2}])
	var r := Economy.ship_item(s, 0, 2)
	var after := Bag.prune_pins(st(r))
	var quick: Array = after["quickSlots"]
	eq(quick[0], null)


func test_pins_stay_when_stack_still_has_items() -> void:
	var s := TestStates.with_bag(TestStates.fresh(), [{"id": "turnip", "qty": 2}])
	var after := Bag.prune_pins(st(Economy.ship_item(s, 0, 1)))
	var quick: Array = after["quickSlots"]
	eq(quick[0], 0)


func test_eating_at_full_energy_is_refused_and_keeps_food() -> void:
	var s := Bag.select_hotbar(TestStates.with_bag(TestStates.fresh(), [{"id": "melon", "qty": 1}]), 5)
	var r := Crops.use_item(s)
	eq(ev(r), [{"type": "actionFailed", "reason": "notHungry"}])
	var bag: Array = st(r)["bag"]
	eq(bag[0], {"id": "melon", "qty": 1})
