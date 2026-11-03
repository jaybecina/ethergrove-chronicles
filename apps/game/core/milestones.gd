class_name Milestones
extends RefCounted
## Milestone detection, ported from packages/core/src/systems/milestones.ts.


static func _has(events: Array, type: String) -> bool:
	for e_v: Variant in events:
		var e: Dictionary = e_v
		if e["type"] == type:
			return true
	return false


static func _shipped_something(events: Array) -> bool:
	for e_v: Variant in events:
		var e: Dictionary = e_v
		if e["type"] == "shippingReport":
			var total: int = e["total"]
			if total > 0:
				return true
	return false


static func _all_crops_harvested(harvested: Dictionary) -> bool:
	for c: String in CropData.CROP_IDS:
		var n: int = harvested.get(c, 0)
		if n < 1:
			return false
	return true


## Returns {state, events}: `next` plus a `milestoneReached` event for each newly earned milestone.
static func check(_prev: Dictionary, next: Dictionary, events: Array) -> Dictionary:
	var gold: int = next["gold"]
	var calendar: Dictionary = next["calendar"]
	var year: int = calendar["year"]
	var harvested: Dictionary = next["harvested"]
	var earned: Array = [
		["firstTill", _has(events, "tileTilled")],
		["firstPlant", _has(events, "cropPlanted")],
		["firstHarvest", _has(events, "cropHarvested")],
		["firstShipment", _shipped_something(events)],
		["gold1k", gold >= 1000],
		["gold10k", gold >= 10000],
		["allCrops", _all_crops_harvested(harvested)],
		["fullYear", year >= 2],
	]
	var have: Array = next["milestones"]
	var fresh: Array = []
	for pair_v: Variant in earned:
		var pair: Array = pair_v
		var id: String = pair[0]
		var ok: bool = pair[1]
		if ok and not have.has(id):
			fresh.append(id)
	if fresh.is_empty():
		return GameStateUtil.result(next, events)
	var out := next.duplicate(true)
	var out_milestones: Array = out["milestones"]
	out_milestones.append_array(fresh)
	var out_events := events.duplicate(true)
	for id: String in fresh:
		out_events.append({"type": "milestoneReached", "id": id})
	return GameStateUtil.result(out, out_events)
