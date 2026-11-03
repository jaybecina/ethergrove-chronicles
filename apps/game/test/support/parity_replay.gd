class_name ParityReplay
extends RefCounted
## Replays a TypeScript parity fixture (written by packages/core/test/parityFixtures.test.ts) through
## the GDScript core and returns "" when every step's events, every snapshot and the final state match,
## else the first difference: `step 12 (cmd useTool): events[0].hit: true != false`.
##
## Step semantics, identical to packages/core/test/parity/recorder.ts:
## - `cmd`: `ApplyCommand.apply(state, cmd)`.
## - `patch`: deep merge into the state; dictionaries merge key by key, arrays, scalars and null replace.
## - `tile`: set tile (x, y) on the map of `state.player.location`.
## - `blankFarm`: weed, rock and stump tiles of the farm become grass.
##
## Every input taken from the fixture (start state, commands, patches, tiles) goes through
## `JsonNorm.ints` first, so the core sees ints where TypeScript had whole numbers.


## `fixture` is the parsed JSON; nothing is loaded here. The start is `start.state` when the fixture has
## one (hand-made fixtures), else `NewGame.create(start)`. `upgrade`, when valid, maps a state to a newer
## save version: it is applied to the start state and to every expected state before comparing, so it must
## leave a state already at that version alone (NewGame.create makes the newest one). `upgrade_patch`, when
## valid, maps each `patch` step's dictionary (written in the fixture's older words) before it is merged.
static func run(fixture: Dictionary, upgrade: Callable = Callable(), upgrade_patch: Callable = Callable()) -> String:
	var start: Dictionary = fixture.get("start", {})
	var state: Dictionary
	if start.has("state"):
		state = JsonNorm.ints(start["state"])
	else:
		var opts: Dictionary = JsonNorm.ints(start)
		state = NewGame.create(opts)
	if upgrade.is_valid():
		state = upgrade.call(state)

	var expected: Dictionary = fixture.get("expected", {})
	var events: Array = expected.get("events", [])
	var snapshots: Dictionary = expected.get("snapshots", {})
	var steps: Array = fixture.get("steps", [])
	if events.size() != steps.size():
		return "fixture: %d steps but %d event lists" % [steps.size(), events.size()]

	for i: int in steps.size():
		var step: Dictionary = steps[i]
		var label := "step %d (%s)" % [i, _label(step)]
		var result := _apply(state, step, upgrade_patch)
		if result.has("error"):
			return "%s: %s" % [label, result["error"]]
		state = result["state"]
		var diff := JsonNorm.first_diff(result["events"], events[i], "events")
		if diff != "":
			return "%s: %s" % [label, diff]
		var key := str(i)
		if snapshots.has(key):
			diff = JsonNorm.first_diff(state, _expected_state(snapshots[key], upgrade), "state")
			if diff != "":
				return "%s: %s" % [label, diff]

	var final_diff := JsonNorm.first_diff(state, _expected_state(expected.get("final", {}), upgrade), "state")
	return "" if final_diff == "" else "final: %s" % final_diff


## Deep merge: dictionaries merge key by key; arrays, scalars and null replace. Returns new containers.
static func merge(base: Variant, patch: Variant) -> Variant:
	if typeof(base) != TYPE_DICTIONARY or typeof(patch) != TYPE_DICTIONARY:
		return _copy(patch)
	var b: Dictionary = base
	var p: Dictionary = patch
	var out := b.duplicate(true)
	for k: Variant in p:
		out[k] = merge(b.get(k), p[k])
	return out


static func _apply(state: Dictionary, step: Dictionary, upgrade_patch: Callable) -> Dictionary:
	if step.has("cmd"):
		var cmd: Dictionary = JsonNorm.ints(step["cmd"])
		var r := ApplyCommand.apply(state, cmd)
		return {"state": r["state"], "events": r["events"]}
	if step.has("patch"):
		var patch: Dictionary = JsonNorm.ints(step["patch"])
		if upgrade_patch.is_valid():
			patch = upgrade_patch.call(patch)
		var merged: Dictionary = merge(state, patch)
		return {"state": merged, "events": []}
	if step.has("tile"):
		var tile: Dictionary = JsonNorm.ints(step["tile"])
		return _set_tile(state, tile)
	if step.has("blankFarm"):
		return {"state": _blank_farm(state), "events": []}
	return {"error": "unknown step %s" % JSON.stringify(step)}


static func _set_tile(state: Dictionary, tile: Dictionary) -> Dictionary:
	var out := state.duplicate(true)
	var player: Dictionary = out["player"]
	var maps: Dictionary = out["maps"]
	var grid: Dictionary = maps[player["location"]]
	var x: int = tile["x"]
	var y: int = tile["y"]
	var width: int = grid["width"]
	var height: int = grid["height"]
	if x < 0 or y < 0 or x >= width or y >= height:
		return {"error": "tile %d,%d is out of bounds" % [x, y]}
	var tiles: Array = grid["tiles"]
	tiles[y * width + x] = tile["value"]
	return {"state": out, "events": []}


static func _blank_farm(state: Dictionary) -> Dictionary:
	var out := state.duplicate(true)
	var maps: Dictionary = out["maps"]
	var farm: Dictionary = maps["farm"]
	var tiles: Array = farm["tiles"]
	for i: int in tiles.size():
		var t: Dictionary = tiles[i]
		var kind: String = t.get("kind", "")
		if kind == "weed" or kind == "rock" or kind == "stump":
			tiles[i] = {"kind": "grass"}
	return out


static func _expected_state(raw: Variant, upgrade: Callable) -> Dictionary:
	var s: Dictionary = JsonNorm.ints(raw)
	return upgrade.call(s) if upgrade.is_valid() else s


static func _label(step: Dictionary) -> String:
	if step.has("cmd"):
		var cmd: Dictionary = step["cmd"]
		return "cmd %s" % cmd.get("type", "?")
	for kind: String in ["patch", "tile", "blankFarm"]:
		if step.has(kind):
			return kind
	return "?"


static func _copy(v: Variant) -> Variant:
	match typeof(v):
		TYPE_DICTIONARY:
			var d: Dictionary = v
			return d.duplicate(true)
		TYPE_ARRAY:
			var a: Array = v
			return a.duplicate(true)
	return v
