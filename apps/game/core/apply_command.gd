class_name ApplyCommand
extends RefCounted
## The single entry point for player commands, ported from packages/core/src/applyCommand.ts: dispatch the
## command to its rule, then the fixed post-pass every command shares (unpin quick slots whose bag cell
## emptied, milestones, lessons). A command is a Dictionary with TypeScript's keys, e.g.
## {"type": "shipItem", "bagIndex": 0, "qty": 2}; the result is {"state": Dictionary, "events": Array}.
##
## `move` is not handled here: movement runs in the game scene in this port. It and any unknown type
## push an error and return the state unchanged with no events.


static func apply(state: Dictionary, cmd: Dictionary) -> Dictionary:
	var result := _dispatch(state, cmd)
	var next: Dictionary = result["state"]
	var events: Array = result["events"]
	# TypeScript compares the bag by reference; GDScript copies have no identity, so this compares by
	# value. They agree: a rule that rebuilds an equal bag leaves no pin to prune, since every command
	# ends with pins pointing at non-empty cells.
	if next["bag"] != state["bag"]:
		next = Bag.prune_pins(next)
	var m := Milestones.check(state, next, events)
	var m_state: Dictionary = m["state"]
	var m_events: Array = m["events"]
	return Tutorial.advance(state, m_state, m_events)


static func _dispatch(state: Dictionary, cmd: Dictionary) -> Dictionary:
	var type: String = cmd.get("type", "")
	match type:
		"tick":
			var next := state.duplicate(true)
			var minutes: int = cmd["minutes"]
			var calendar: Dictionary = state["calendar"]
			next["calendar"] = Calendar.advance_minutes(calendar, minutes)
			var next_calendar: Dictionary = next["calendar"]
			if Calendar.should_pass_out(next_calendar):
				return Day.end_day(next, "passOut")
			return GameStateUtil.result(next)
		"sleep":
			return Day.sleep(state)
		"interact":
			return Interact.interact(state)
		"selectHotbar":
			var index: int = cmd["index"]
			return GameStateUtil.result(Bag.select_hotbar(state, index))
		"cycleHotbar":
			var dir: int = cmd["dir"]
			return GameStateUtil.result(Bag.cycle_hotbar(state, dir))
		"moveBagItem":
			var from: int = cmd["from"]
			var to: int = cmd["to"]
			return GameStateUtil.result(Bag.move_bag_item(state, from, to))
		"assignQuickSlot":
			var slot: int = cmd["slot"]
			return GameStateUtil.result(Bag.assign_quick_slot(state, slot, cmd["bagIndex"]))
		"useTool":
			return Tools.use_tool(state)
		"useItem":
			return Crops.use_item(state)
		"shipItem":
			var bag_index: int = cmd["bagIndex"]
			var ship_qty: int = cmd["qty"]
			return Economy.ship_item(state, bag_index, ship_qty)
		"unshipItem":
			var bin_index: int = cmd["binIndex"]
			var unship_qty: int = cmd["qty"]
			return Economy.unship_item(state, bin_index, unship_qty)
		"buyItem":
			var item_id: String = cmd["itemId"]
			var buy_qty: int = cmd["qty"]
			return Economy.buy_item(state, item_id, buy_qty)
		"skipLessons":
			return Tutorial.skip_lessons(state)
		"restartLessons":
			return Tutorial.restart_lessons(state)
	push_error("Unsupported command: %s" % type)
	return GameStateUtil.result(state)
