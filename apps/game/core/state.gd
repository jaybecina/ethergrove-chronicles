class_name GameStateUtil
extends RefCounted
## State helpers, ported from packages/core/src/state.ts, plus the `Result` constructors every rule shares.
## A result is {"state": Dictionary, "events": Array}.


static func current_grid(state: Dictionary) -> Dictionary:
	var player: Dictionary = state["player"]
	var maps: Dictionary = state["maps"]
	var grid: Dictionary = maps[player["location"]]
	return grid


## A new state with the current location's grid replaced.
static func with_grid(state: Dictionary, grid: Dictionary) -> Dictionary:
	var out := state.duplicate(true)
	var player: Dictionary = out["player"]
	var maps: Dictionary = out["maps"]
	maps[player["location"]] = grid.duplicate(true)
	return out


static func result(state: Dictionary, events: Array = []) -> Dictionary:
	return {"state": state, "events": events}


## The state unchanged plus one `actionFailed` event.
static func fail(state: Dictionary, reason: String) -> Dictionary:
	return {"state": state, "events": [{"type": "actionFailed", "reason": reason}]}
