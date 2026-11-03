extends CoreTest
## Milestone rules, ported from packages/core/test/milestones.test.ts. "firstTill fires once through
## applyCommand" calls Tools.use_tool then Milestones.check directly; test_apply_command.gd runs the full path.


func _reached(events: Array) -> Array:
	var out: Array = []
	for e_v: Variant in events:
		var e: Dictionary = e_v
		if e["type"] == "milestoneReached":
			out.append(e["id"])
	return out


func test_first_till_fires_once() -> void:
	var s := TestStates.stand_at(TestStates.blank_farm(TestStates.fresh()), 10, 10, "e")
	var used := Tools.use_tool(s)
	var first := Milestones.check(s, st(used), ev(used))
	eq(_reached(ev(first)), ["firstTill"])
	eq(st(first)["milestones"], ["firstTill"])
	var s2 := TestStates.with_tile(st(first), 11, 10, {"kind": "grass"})
	var again := Tools.use_tool(s2)
	eq(_reached(ev(Milestones.check(s2, st(again), ev(again)))), [])


func test_first_harvest_is_emitted_once_across_two_harvests() -> void:
	var s := TestStates.fresh()
	var events: Array = [{"type": "cropHarvested", "x": 1, "y": 1, "crop": "turnip"}]
	var once := Milestones.check(s, s, events)
	eq(_reached(ev(once)), ["firstHarvest"])
	eq(_reached(ev(Milestones.check(st(once), st(once), events))), [])


func test_first_plant_and_first_shipment_only_when_something_sold() -> void:
	var s := TestStates.fresh()
	eq(_reached(ev(Milestones.check(s, s, [{"type": "cropPlanted", "x": 0, "y": 0, "crop": "turnip"}]))), ["firstPlant"])
	eq(_reached(ev(Milestones.check(s, s, [{"type": "shippingReport", "items": [], "total": 0}]))), [])
	eq(_reached(ev(Milestones.check(s, s, [{"type": "shippingReport", "items": [], "total": 35}]))), ["firstShipment"])


func test_gold_990_to_1010_emits_gold1k_and_10000_emits_gold10k() -> void:
	var prev := TestStates.fresh()
	prev["gold"] = 990
	var a := prev.duplicate(true)
	a["gold"] = 1010
	eq(_reached(ev(Milestones.check(prev, a, []))), ["gold1k"])
	var b := prev.duplicate(true)
	b["gold"] = 10000
	eq(_reached(ev(Milestones.check(prev, b, []))), ["gold1k", "gold10k"])


func test_all_crops_and_full_year() -> void:
	var s := TestStates.fresh()
	var harvested: Dictionary = {}
	for c: String in CropData.CROP_IDS:
		harvested[c] = 1
	var all := s.duplicate(true)
	all["harvested"] = harvested
	eq(_reached(ev(Milestones.check(s, all, []))), ["allCrops"])
	var y2 := s.duplicate(true)
	var cal: Dictionary = y2["calendar"]
	cal["year"] = 2
	eq(_reached(ev(Milestones.check(s, y2, []))), ["fullYear"])


func test_does_not_mutate_its_arguments() -> void:
	var s := TestStates.fresh()
	s["gold"] = 2000
	var events: Array = []
	var r := Milestones.check(s, s, events)
	eq(s["milestones"], [])
	eq(events, [])
	eq(st(r)["milestones"], ["gold1k"])
