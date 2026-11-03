extends CoreTest
## State invariants over every recorded snapshot and final state of the two long fixtures
## (full-year: a whole year of play; tutorial: every lesson). The fixtures were written by TypeScript, so
## this checks the recorded truth that the GDScript replay must equal (test_parity.gd).

const FIXTURES: Array[String] = ["full-year", "tutorial"]


func _states(name: String) -> Array[Dictionary]:
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string("res://test/fixtures/%s.json" % name))
	var fixture: Dictionary = parsed
	var expected: Dictionary = fixture["expected"]
	var out: Array[Dictionary] = []
	var snapshots: Dictionary = expected["snapshots"]
	for k: Variant in snapshots:
		out.append(d(JsonNorm.ints(snapshots[k])))
	out.append(d(JsonNorm.ints(expected["final"])))
	return out


## "" when `s` holds every invariant, else the first broken one.
static func violation(s: Dictionary) -> String:
	var bag := a(s["bag"])
	if bag.size() != Balance.BAG_SLOTS:
		return "bag has %d cells" % bag.size()
	for i: int in bag.size():
		if bag[i] == null:
			continue
		var qty: int = d(bag[i])["qty"]
		if qty < 1 or qty > 99:
			return "bag[%d] qty %d" % [i, qty]
	var gold: int = s["gold"]
	var pending: int = s["pendingGold"]
	if gold < 0 or pending < 0:
		return "gold %d pendingGold %d" % [gold, pending]
	var quick := a(s["quickSlots"])
	for k: int in quick.size():
		if quick[k] == null:
			continue
		var qi: int = quick[k]
		if qi < 0 or qi >= bag.size() or bag[qi] == null:
			return "quickSlots[%d] points at empty cell %d" % [k, qi]
	var tutorial := d(s["tutorial"])
	var count: int = tutorial["count"]
	if count < 0:
		return "tutorial.count %d" % count
	var seen := a(tutorial["notesSeen"])
	for i: int in seen.size():
		if seen.find(seen[i]) != i:
			return "notesSeen repeats %s" % str(seen[i])
	return ""


func test_long_fixture_states_hold_every_invariant() -> void:
	for name: String in FIXTURES:
		var states := _states(name)
		assert_gt(states.size(), 1, "%s has snapshots" % name)
		for i: int in states.size():
			assert_eq(violation(states[i]), "", "%s state %d" % [name, i])


func test_violation_catches_each_broken_invariant() -> void:
	var ok := TestStates.with_bag(TestStates.fresh(), [{"id": "stone", "qty": 5}])
	assert_eq(violation(ok), "")
	var short := ok.duplicate(true)
	a(short["bag"]).pop_back()
	assert_eq(violation(short), "bag has 11 cells")
	assert_eq(violation(TestStates.with_bag(ok, [{"id": "stone", "qty": 0}])), "bag[0] qty 0")
	assert_eq(violation(TestStates.with_bag(ok, [{"id": "stone", "qty": 100}])), "bag[0] qty 100")
	var broke := ok.duplicate(true)
	broke["gold"] = -1
	assert_eq(violation(broke), "gold -1 pendingGold 0")
	var owed := ok.duplicate(true)
	owed["pendingGold"] = -1
	assert_eq(violation(owed), "gold 500 pendingGold -1")
	var pinned := ok.duplicate(true)
	pinned["quickSlots"] = [null, 3, null]
	assert_eq(violation(pinned), "quickSlots[1] points at empty cell 3")
	var counted := ok.duplicate(true)
	d(counted["tutorial"])["count"] = -1
	assert_eq(violation(counted), "tutorial.count -1")
	var seen := ok.duplicate(true)
	d(seen["tutorial"])["notesSeen"] = ["rain", "bagFull", "rain"]
	assert_eq(violation(seen), "notesSeen repeats rain")
