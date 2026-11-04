class_name GameStateUtil
extends RefCounted
## State helpers, ported from packages/core/src/state.ts, plus the `Result` constructors every rule shares.
## A result is {"state": Dictionary, "events": Array}.


static func current_grid(state: Dictionary) -> Dictionary:
	var player: Dictionary = state["player"]
	var here: String = player["location"]
	if here == "mossdeep":
		return Mossdeep.grid_for(state)
	if Zones.is_static(here):
		return Zones.grid(here)
	var maps: Dictionary = state["maps"]
	var grid: Dictionary = maps[player["location"]]
	return grid


## A new state with the current location's grid replaced.
## Lowmere is static data: replacing its grid pushes an error and returns the state unchanged.
static func with_grid(state: Dictionary, grid: Dictionary) -> Dictionary:
	var here: Dictionary = state["player"]
	var here_zone: String = here["location"]
	if Zones.is_static(here_zone):
		push_error("Lowmere is static; its grid cannot be replaced")
		return state
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
