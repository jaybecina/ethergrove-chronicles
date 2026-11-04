class_name IntentMapper
extends RefCounted
## Turns one step's intents into core commands. Port of apps/web/src/input/toCommands.ts minus `move` (the
## CharacterBody3D player controller moves the body and writes the pose). Order: hotbar, cycle, primary, secondary.


## The commands for `intents` in a new Array.
static func to_commands(intents: Dictionary, state: Dictionary, gate: ActionGate, now_ms: int) -> Array:
	var out: Array = []
	map_into(intents, state, gate, now_ms, out)
	return out


## Like `to_commands`, but clears and fills the caller-owned `out` (the per-step path reuses one Array).
static func map_into(intents: Dictionary, state: Dictionary, gate: ActionGate, now_ms: int, out: Array) -> void:
	out.clear()
	var hotbar: int = intents["hotbar"]
	if hotbar >= 0:
		out.append({"type": "selectHotbar", "index": hotbar})
	var cycle: int = intents["cycle"]
	if cycle != 0:
		out.append({"type": "cycleHotbar", "dir": cycle})
	var primary: bool = intents["primary"]
	var player: Dictionary = state["player"]
	var here: String = player["location"]
	# Where you fight, Space dodges (CombatLayer) instead of using a tool (M1 spec 7.3).
	if Zones.is_combat(here):
		primary = false
	if gate.allow(primary, now_ms):
		var active: int = state["activeSlot"]
		out.append({"type": "useTool" if active <= 4 else "useItem"})
	var secondary: bool = intents["secondary"]
	if secondary:
		var action := Interact.resolve_secondary(state)
		if action != "":
			out.append({"type": action})
