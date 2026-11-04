extends CoreTest
## Villagers data and the talk rule (spec M1 6.2).


func _lowmere(x: int, y: int, facing: String) -> Dictionary:
	var s := TestStates.stand_at(TestStates.fresh(), x, y, facing)
	d(s["player"])["location"] = "lowmere"
	return s


func _talk(id: String) -> Dictionary:
	# Stand one tile south of the villager, facing north.
	var v := Villagers.at(0, 0)
	for e: Dictionary in Villagers.ALL:
		if e["id"] == id:
			v = e
	return _lowmere((v["x"] as int), (v["y"] as int) + 1, "n")


func test_villager_lines_match_spec() -> void:
	var want: Dictionary = {
		"hilda": ["Hilda", 4, 5, "Elias's grandchild. Same stubborn chin. Bring me ore.", "Copper first. Five ore, one bar."],
		"aldous": ["Doc Aldous", 12, 5, "If the woods knock you flat, they carry you here. Try not to make it a habit.", "Eat before you go down. Empty stomachs make poor fighters."],
		"fern": ["Granny Fern", 20, 5, "The old well in the woods has woken, dear. Elias would have gone down already. Bring its stone home to the shrine.", "The shrine remembers him, dear. Give it time to remember you."],
		"bram": ["Mayor Bram", 10, 8, "Welcome to Lowmere. Stay out of the woods after dark. Please.", "Lock your gate at night. Everyone's doing it now."],
	}
	eq(Villagers.ALL.size(), 4)
	var order: Array = []
	for v: Dictionary in Villagers.ALL:
		var id: String = v["id"]
		order.append(id)
		var w: Array = want[id]
		eq(v["name"], w[0], id)
		eq([v["x"], v["y"], v["facing"]], [w[1], w[2], "n"], id)
		eq(v["first"], w[3], id)
		eq(v["repeat"], w[4], id)
	eq(order, ["hilda", "aldous", "fern", "bram"])


func test_at_finds_villager_or_empty() -> void:
	eq(Villagers.at(20, 5)["id"], "fern")
	eq(Villagers.at(0, 0), {})


func test_first_talk_adds_to_talked_and_uses_first_line() -> void:
	var r := Interact.interact(_talk("hilda"))
	eq(ev(r), [{"type": "talked", "villager": "hilda", "name": "Hilda", "text": "Elias's grandchild. Same stubborn chin. Bring me ore."}])
	eq(st(r)["talked"], ["hilda"])


func test_second_talk_uses_repeat_line_and_no_duplicate() -> void:
	var first := st(Interact.interact(_talk("bram")))
	var r := Interact.interact(first)
	eq(ev(r), [{"type": "talked", "villager": "bram", "name": "Mayor Bram", "text": "Lock your gate at night. Everyone's doing it now."}])
	eq(st(r)["talked"], ["bram"])


func test_talked_state_still_validates() -> void:
	var r := Interact.interact(_talk("fern"))
	eq(SaveSchema.validate_state(st(r)), "")


func test_villager_beats_feature_on_same_tile() -> void:
	# No Lowmere tile is both a feature and a villager, so pin the order through the gating instead: the talk
	# rule runs first in Lowmere only. On the farm the same stance (Hilda's coordinates) does not talk.
	var farm := TestStates.stand_at(TestStates.fresh(), 4, 6, "n")
	eq(ev(Interact.interact(farm)), [{"type": "actionFailed", "reason": "noTarget"}], "farm: no talk")
	eq(ev(Interact.interact(_lowmere(4, 6, "n")))[0]["type"], "talked", "lowmere: talk")
	# A feature in front with no villager still works in Lowmere (talk check does not swallow features).
	eq(ev(Interact.interact(_lowmere(12, 1, "n"))), [{"type": "locationChanged", "location": "farm"}])


func test_secondary_is_interact_on_villager() -> void:
	eq(Interact.resolve_secondary(_talk("aldous")), "interact")
	eq(Interact.resolve_secondary(_lowmere(4, 8, "n")), "")
	eq(Interact.resolve_secondary(TestStates.stand_at(TestStates.fresh(), 4, 6, "n")), "", "farm: no villager")


func test_talk_does_not_change_state_otherwise() -> void:
	var s := _talk("aldous")
	var out := st(Interact.interact(s))
	var a := s.duplicate(true)
	var b := out.duplicate(true)
	eq(b["talked"], ["aldous"])
	a.erase("talked")
	b.erase("talked")
	eq(b, a)
	eq(s["talked"], [], "argument not mutated")
