extends CoreTest
## Falling in a Deep and passing out away from home (M1 spec 6.6, October spec 6.3, ARPG 9.1).


func test_wake_minute_before_20_is_20_same_day() -> void:
	eq(Falling.wake_at(600), {"minute": 1200, "next_day": false})
	eq(Falling.wake_at(1199), {"minute": 1200, "next_day": false})


func test_wake_minute_at_or_after_20_is_8_next_day() -> void:
	eq(Falling.wake_at(1200), {"minute": 480, "next_day": true})
	eq(Falling.wake_at(1500), {"minute": 480, "next_day": true})


func test_half_of_each_looted_stack_is_lost_rounded_down() -> void:
	var bag: Array = [{"id": "fiber", "qty": 9}, {"id": "stone", "qty": 3}, null]
	var loot: Array = [{"id": "fiber", "qty": 7}, {"id": "stone", "qty": 1}]
	var r := Falling.lose_loot(bag, loot)
	eq(a(r["bag"]), [{"id": "fiber", "qty": 6}, {"id": "stone", "qty": 3}, null], "lose floor(7/2) = 3 fiber, floor(1/2) = 0 stone")
	eq(a(r["lost"]), [{"id": "fiber", "qty": 3}])


func test_loss_never_exceeds_what_the_bag_holds() -> void:
	var bag: Array = [{"id": "fiber", "qty": 1}]
	var r := Falling.lose_loot(bag, [{"id": "fiber", "qty": 8}])
	eq(a(r["bag"]), [null], "the bag held only 1, so only 1 can go")
	eq(a(r["lost"]), [{"id": "fiber", "qty": 1}])


func test_protected_items_are_never_lost() -> void:
	var bag: Array = [{"id": "verdantRootstone", "qty": 1}, {"id": "mossmawTusk", "qty": 2}, {"id": "copperSword", "qty": 1}, {"id": "groundsLantern", "qty": 1}]
	var loot: Array = [{"id": "verdantRootstone", "qty": 1}, {"id": "mossmawTusk", "qty": 2}, {"id": "copperSword", "qty": 1}, {"id": "groundsLantern", "qty": 1}]
	var r := Falling.lose_loot(bag, loot)
	eq(a(r["bag"]), bag)
	eq(a(r["lost"]), [])


func test_loss_spans_several_bag_stacks() -> void:
	var bag: Array = [{"id": "wood", "qty": 4}, {"id": "wood", "qty": 4}]
	var r := Falling.lose_loot(bag, [{"id": "wood", "qty": 6}])
	eq(a(r["lost"]), [{"id": "wood", "qty": 3}])
	eq(Bag.count_of(a(r["bag"]), "wood"), 5)


func test_input_is_not_mutated() -> void:
	var bag: Array = [{"id": "fiber", "qty": 4}]
	Falling.lose_loot(bag, [{"id": "fiber", "qty": 4}])
	eq(bag, [{"id": "fiber", "qty": 4}])


func test_fall_result_heals_clears_loot_and_moves_to_clinic() -> void:
	var state := NewGame.create({"seed": 1, "farmName": "A", "playerName": "B"})
	state["bag"] = [{"id": "fiber", "qty": 6}] + (state["bag"] as Array).slice(1)
	state["lootSinceSleep"] = [{"id": "fiber", "qty": 6}]
	state["hp"] = 0
	state["player"]["location"] = "mossdeep"
	state["calendar"]["minute"] = 900
	var out := Falling.fall(state)
	var next := d(out["state"])
	eq(next["hp"], Progression.max_hp(1))
	eq(next["lootSinceSleep"], [])
	eq(d(next["player"])["location"], "clinic")
	eq(d(next["calendar"])["minute"], 1200)
	eq(Bag.count_of(a(next["bag"]), "fiber"), 3)
	eq(state["hp"], 0, "input untouched")


func test_fall_after_20_advances_the_day() -> void:
	var state := NewGame.create({"seed": 1, "farmName": "A", "playerName": "B"})
	state["calendar"]["minute"] = 1300
	var cal := d(d(Falling.fall(state)["state"])["calendar"])
	eq(cal["minute"], 480)
	eq(cal["day"], d(state["calendar"])["day"] + 1)
