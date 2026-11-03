extends CoreTest
## ApplyCommand: the dispatch of every command and the post-pass (prune pins, milestones, lessons), ported
## from packages/core/src/applyCommand.ts. The parity fixtures (test_parity.gd) replay every command type;
## these cases pin the wiring directly, including the applyCommand-only cases of day.test.ts,
## milestones.test.ts and interact.test.ts.


func _reached(events: Array) -> Array:
	var out: Array = []
	for e_v: Variant in events:
		var e := d(e_v)
		if e["type"] == "milestoneReached":
			out.append(e["id"])
	return out


func test_move_command_is_refused() -> void:
	var s := TestStates.fresh()
	var before := s.duplicate(true)
	var r := ApplyCommand.apply(s, {"type": "move", "dx": 1, "dz": 0, "dtMs": 50})
	assert_push_error("Unsupported command: move")
	eq(st(r), before)
	eq(ev(r), [])
	eq(s, before)


func test_unknown_command_is_refused() -> void:
	var s := TestStates.fresh()
	var before := s.duplicate(true)
	var r := ApplyCommand.apply(s, {"type": "teleport"})
	assert_push_error("Unsupported command: teleport")
	eq(st(r), before)
	eq(ev(r), [])


func test_ticking_past_26_00_triggers_pass_out() -> void:
	var s := TestStates.at_calendar(TestStates.fresh(), 1550)
	var r := ApplyCommand.apply(s, {"type": "tick", "minutes": 10})
	eq(ev(r)[0], {"type": "passedOut"})
	eq(d(st(r)["calendar"])["day"], 2)
	var short := ApplyCommand.apply(s, {"type": "tick", "minutes": 9})
	eq(d(st(short)["calendar"])["minute"], 1559)
	eq(ev(short), [])


func test_sleep_outside_the_house_fails_not_here() -> void:
	var s := TestStates.fresh()
	var r := ApplyCommand.apply(s, {"type": "sleep"})
	eq(ev(r), [{"type": "actionFailed", "reason": "notHere"}])
	eq(st(r), s)


func test_interact_is_wired_into_apply_command() -> void:
	var r := ApplyCommand.apply(TestStates.stand_at(TestStates.fresh(), 7, 5, "n"), {"type": "interact"})
	eq(ev(r), [{"type": "openUi", "ui": "bin"}])


func test_first_till_fires_once_through_apply_command() -> void:
	var s := TestStates.stand_at(TestStates.blank_farm(TestStates.fresh()), 10, 10, "e")
	var first := ApplyCommand.apply(s, {"type": "useTool"})
	eq(_reached(ev(first)), ["firstTill"])
	s = TestStates.with_tile(st(first), 11, 10, {"kind": "grass"})
	eq(_reached(ev(ApplyCommand.apply(s, {"type": "useTool"}))), [])
	eq(st(first)["milestones"], ["firstTill"])


func test_lessons_advance_through_apply_command() -> void:
	var s := TestStates.lesson_at(TestStates.stand_at(TestStates.blank_farm(TestStates.fresh()), 10, 10, "e"), "till")
	var r := ApplyCommand.apply(s, {"type": "useTool"})
	eq(d(st(r)["tutorial"])["lesson"], "till")
	eq(d(st(r)["tutorial"])["count"], 1)


func test_shipping_a_pinned_stack_away_unpins_its_quick_slot() -> void:
	var s := TestStates.with_bag(TestStates.fresh(), [{"id": "turnip", "qty": 2}])
	s["quickSlots"] = [0, null, null]
	var r := ApplyCommand.apply(s, {"type": "shipItem", "bagIndex": 0, "qty": 2})
	eq(st(r)["quickSlots"], [null, null, null])
	var kept := ApplyCommand.apply(s, {"type": "shipItem", "bagIndex": 0, "qty": 1})
	eq(st(kept)["quickSlots"], [0, null, null])


func test_does_not_mutate_its_arguments() -> void:
	var s := TestStates.stand_at(TestStates.blank_farm(TestStates.fresh()), 10, 10, "e")
	var cmd := {"type": "useTool"}
	var before := s.duplicate(true)
	ApplyCommand.apply(s, cmd)
	eq(s, before)
	eq(cmd, {"type": "useTool"})
