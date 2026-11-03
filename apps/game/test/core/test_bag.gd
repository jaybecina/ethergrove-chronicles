extends CoreTest
## Bag rules, ported from packages/core/test/bag.test.ts (every case that avoids applyCommand).


func _fresh() -> Dictionary:
	return TestStates.fresh()


func _hotbar(index: int) -> Dictionary:
	return Bag.select_hotbar(_fresh(), index)


func test_add_item_splits_150_turnips_into_99_and_51() -> void:
	var r := Bag.add_item(TestStates.empty_bag(), "turnip", 150)
	var bag: Array = bag_of(r)
	eq(bag.slice(0, 3), [{"id": "turnip", "qty": 99}, {"id": "turnip", "qty": 51}, null])
	eq([r["added"], r["overflow"]], [150, 0])


func test_add_item_tops_up_existing_stack_first() -> void:
	var start: Array = Bag.add_item(TestStates.empty_bag(), "wood", 98)["bag"]
	var bag: Array = Bag.add_item(start, "wood", 3)["bag"]
	eq(bag.slice(0, 2), [{"id": "wood", "qty": 99}, {"id": "wood", "qty": 2}])


func test_add_item_reports_overflow_and_leaves_full_bag_unchanged() -> void:
	var full := TestStates.full_bag()
	var r := Bag.add_item(full, "turnip", 5)
	eq(bag_of(r), TestStates.full_bag())
	eq([r["added"], r["overflow"]], [0, 5])


func test_add_item_does_not_mutate_input_bag() -> void:
	var start := TestStates.empty_bag()
	Bag.add_item(start, "fiber", 1)
	eq(start, TestStates.empty_bag())


func test_remove_at_removes_and_empties_at_zero() -> void:
	var bag: Array = Bag.add_item(TestStates.empty_bag(), "turnip", 3)["bag"]
	eq(Bag.remove_at(bag, 0, 2)[0], {"id": "turnip", "qty": 1})
	eq(Bag.remove_at(bag, 0, 3)[0], null)


func test_remove_at_rejects_too_many_or_empty_slot() -> void:
	var bag: Array = Bag.add_item(TestStates.empty_bag(), "turnip", 3)["bag"]
	var too_many := Bag.remove_at(bag, 0, 4)
	assert_push_error("Cannot remove")
	eq(too_many, bag)
	var empty_slot := Bag.remove_at(bag, 5, 1)
	assert_push_error("Cannot remove")
	eq(empty_slot, bag)
	Bag.remove_at(bag, 99, 1)
	assert_push_error("Bad bag index")


func test_count_of_counts_across_stacks() -> void:
	eq(Bag.count_of(bag_of(Bag.add_item(TestStates.empty_bag(), "turnip", 150)), "turnip"), 150)
	eq(Bag.count_of(TestStates.empty_bag(), "turnip"), 0)


func test_active_tool_maps_slots() -> void:
	eq(Bag.active_tool(_fresh()), "hoe")
	eq(Bag.active_tool(_hotbar(4)), "hammer")
	eq(Bag.active_tool(_hotbar(5)), "")


func test_selecting_quick_slot_updates_selected_quick() -> void:
	eq(_hotbar(7)["selectedQuick"], 2)
	eq(Bag.select_hotbar(_hotbar(7), 1)["selectedQuick"], 2)


func test_cycle_hotbar_wraps_both_ways() -> void:
	var back := Bag.cycle_hotbar(_fresh(), -1)
	eq(back["activeSlot"], 7)
	eq(back["selectedQuick"], 2)
	eq(Bag.cycle_hotbar(back, 1)["activeSlot"], 0)
	eq(Bag.cycle_hotbar(_fresh(), 1)["activeSlot"], 1)


func test_move_bag_item_swaps_cells_and_quick_slots_follow() -> void:
	var s := Bag.move_bag_item(_fresh(), 0, 3)
	var bag: Array = bag_of(s)
	var quick: Array = s["quickSlots"]
	eq(bag[3], {"id": "seed:turnip", "qty": 6})
	eq(bag[0], null)
	eq(quick[0], 3)


func test_move_bag_item_swapping_two_pinned_cells_swaps_both_pins() -> void:
	var s := TestStates.with_bag(_fresh(), [{"id": "turnip", "qty": 1}, {"id": "wood", "qty": 1}])
	s = Bag.assign_quick_slot(Bag.assign_quick_slot(s, 0, 0), 1, 1)
	s = Bag.move_bag_item(s, 0, 1)
	eq(s["quickSlots"], [1, 0, null])


func test_quick_item_resolves_selected_quick_slot() -> void:
	eq(Bag.quick_item(_fresh()), {"bagIndex": 0, "stack": {"id": "seed:turnip", "qty": 6}})


func test_quick_item_empty_when_pinned_cell_was_emptied() -> void:
	var s := _fresh()
	s["bag"] = Bag.remove_at(bag_of(s), 0, 6)
	eq(Bag.quick_item(s), {})


func test_quick_item_empty_for_unassigned_slot() -> void:
	var s := _fresh()
	s["selectedQuick"] = 1
	eq(Bag.quick_item(s), {})


func test_assign_quick_slot_clears_and_rejects_bad_indexes() -> void:
	eq(Bag.assign_quick_slot(_fresh(), 0, null)["quickSlots"], [null, null, null])
	var bad_assign := Bag.assign_quick_slot(_fresh(), 0, 12)
	assert_push_error("Bad bag index")
	eq(bad_assign, _fresh())
	var bad_move := Bag.move_bag_item(_fresh(), 0, 12)
	assert_push_error("Bad bag index")
	eq(bad_move, _fresh())


func test_prune_pins_unpins_emptied_cells_only() -> void:
	var s := TestStates.with_bag(_fresh(), [{"id": "turnip", "qty": 1}])
	s["quickSlots"] = [0, 5, null]
	eq(Bag.prune_pins(s)["quickSlots"], [0, null, null])
	var kept := _fresh()
	eq(Bag.prune_pins(kept)["quickSlots"], [0, null, null])


func test_core_does_not_mutate_input() -> void:
	var s := TestStates.with_bag(_fresh(), [{"id": "turnip", "qty": 3}, {"id": "wood", "qty": 2}])
	s["quickSlots"] = [0, 7, null]
	var before := s.duplicate(true)
	var bag: Array = bag_of(s)
	var bag_before := bag.duplicate(true)
	Bag.add_item(bag, "turnip", 5)
	Bag.remove_at(bag, 0, 1)
	Bag.count_of(bag, "turnip")
	eq(bag, bag_before)
	Bag.quick_item(s)
	Bag.active_tool(s)
	Bag.select_hotbar(s, 6)
	Bag.cycle_hotbar(s, 1)
	Bag.move_bag_item(s, 0, 1)
	Bag.assign_quick_slot(s, 1, 1)
	Bag.prune_pins(s)
	eq(s, before)
