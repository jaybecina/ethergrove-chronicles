extends CoreTest
## Interact rules, ported from packages/core/test/interact.test.ts. The "is wired into applyCommand" case is
## in test_apply_command.gd.

const MATURE: Dictionary = {"kind": "tilled", "watered": false, "crop": {"id": "turnip", "age": 4, "regrowing": false}}


func _at(s: Dictionary, minute: int) -> Dictionary:
	var out := s.duplicate(true)
	var cal: Dictionary = out["calendar"]
	cal["minute"] = minute
	return out


func _house(s: Dictionary) -> Dictionary:
	var out := s.duplicate(true)
	var player: Dictionary = out["player"]
	player["location"] = "house"
	return out


func _open_ui(ui: String) -> Array:
	return [{"type": "openUi", "ui": ui}]


func test_the_house_door_takes_the_player_inside() -> void:
	var r := Interact.interact(TestStates.stand_at(TestStates.fresh(), 4, 5, "n"))
	var player: Dictionary = st(r)["player"]
	eq(player["location"], "house")
	eq(player["x"], 3.5)
	eq(player["z"], 3.5)
	eq(player["facing"], "n")
	eq(ev(r), [{"type": "locationChanged", "location": "house"}])


func test_the_exit_door_returns_the_player_below_the_house_door_facing_south() -> void:
	var r := Interact.interact(TestStates.stand_at(_house(TestStates.fresh()), 3, 4, "s"))
	var player: Dictionary = st(r)["player"]
	eq(player["location"], "farm")
	eq(player["x"], 4.5)
	eq(player["z"], 5.5)
	eq(player["facing"], "s")
	eq(ev(r), [{"type": "locationChanged", "location": "farm"}])


func test_opens_the_bin_the_bed_and_the_cart_when_open() -> void:
	eq(ev(Interact.interact(TestStates.stand_at(TestStates.fresh(), 7, 5, "n"))), _open_ui("bin"))
	eq(ev(Interact.interact(TestStates.stand_at(_house(TestStates.fresh()), 6, 2, "n"))), _open_ui("sleep"))
	var cart := TestStates.stand_at(TestStates.fresh(), 30, 17, "e")
	eq(ev(Interact.interact(_at(cart, 600))), _open_ui("cart"))
	eq(ev(Interact.interact(_at(cart, 400))), [{"type": "actionFailed", "reason": "cartClosed"}])


func test_harvests_a_mature_crop_by_hand() -> void:
	var s := TestStates.with_tile(TestStates.stand_at(TestStates.blank_farm(TestStates.fresh()), 10, 10, "e"), 11, 10, MATURE)
	assert_has(ev(Interact.interact(s)), {"type": "cropHarvested", "x": 11, "y": 10, "crop": "turnip"})


func test_refills_the_can_at_the_pond() -> void:
	var s := TestStates.stand_at(TestStates.fresh(), 7, 19, "w")
	s["canCharges"] = 2
	var r := Interact.interact(s)
	eq(st(r)["canCharges"], 20)
	eq(ev(r), [{"type": "canRefilled"}])
	eq(s["canCharges"], 2, "argument not mutated")


func test_nothing_to_interact_with_fails_with_no_target() -> void:
	var s := TestStates.stand_at(TestStates.blank_farm(TestStates.fresh()), 10, 10, "e")
	eq(ev(Interact.interact(s)), [{"type": "actionFailed", "reason": "noTarget"}])


func _seeds(target: Dictionary) -> Dictionary:
	var s := TestStates.with_tile(TestStates.stand_at(TestStates.blank_farm(TestStates.fresh()), 10, 10, "e"), 11, 10, target)
	return Bag.select_hotbar(s, 5)


func test_resolve_secondary_prefers_interact_facing_the_bin_even_with_seeds_selected() -> void:
	var s := Bag.select_hotbar(TestStates.stand_at(TestStates.fresh(), 7, 5, "n"), 5)
	eq(Interact.resolve_secondary(s), "interact")


func test_resolve_secondary_plants_facing_empty_tilled_soil_with_seeds() -> void:
	eq(Interact.resolve_secondary(_seeds({"kind": "tilled", "watered": false})), "useItem")


func test_resolve_secondary_eats_facing_grass_with_a_turnip_selected() -> void:
	var s := TestStates.with_bag(TestStates.stand_at(TestStates.blank_farm(TestStates.fresh()), 10, 10, "e"), [{"id": "turnip", "qty": 1}])
	eq(Interact.resolve_secondary(s), "useItem")


func test_resolve_secondary_returns_empty_facing_grass_with_seeds() -> void:
	eq(Interact.resolve_secondary(_seeds({"kind": "grass"})), "")


func test_resolve_secondary_interacts_with_a_mature_crop() -> void:
	eq(Interact.resolve_secondary(_seeds(MATURE)), "interact")


## The Root Shrine without the Rootstone does nothing; the stove opens cooking and changes nothing.
func test_the_shrine_needs_the_stone_and_the_stove_opens_cooking() -> void:
	var fail := [{"type": "actionFailed", "reason": "noTarget"}]
	var shrine := TestStates.stand_at(TestStates.fresh(), 28, 3, "n")
	eq(ev(Interact.interact(shrine)), fail, "rootShrine")
	var stove := TestStates.stand_at(_house(TestStates.fresh()), 1, 2, "n")
	eq(ev(Interact.interact(stove)), [{"type": "openUi", "ui": "stove"}], "stove")
	eq(st(Interact.interact(stove)), stove, "nothing changes")


func _lowmere(x: int, y: int, facing: String) -> Dictionary:
	var s := TestStates.stand_at(TestStates.fresh(), x, y, facing)
	d(s["player"])["location"] = "lowmere"
	return s


func test_farm_gate_enters_lowmere() -> void:
	var r := Interact.interact(TestStates.stand_at(TestStates.fresh(), 16, 22, "s"))
	var player: Dictionary = st(r)["player"]
	eq(player["location"], "lowmere")
	eq(player["x"], 12.5)
	eq(player["z"], 1.5)
	eq(player["facing"], "s")
	eq(ev(r), [{"type": "locationChanged", "location": "lowmere"}])
	eq(d(st(r)["maps"]).keys(), ["farm", "house"], "Lowmere is not saved state")


func test_to_farm_returns_to_farm_gate() -> void:
	var r := Interact.interact(_lowmere(12, 1, "n"))
	var player: Dictionary = st(r)["player"]
	eq(player["location"], "farm")
	eq(player["x"], 16.5)
	eq(player["z"], 22.5)
	eq(player["facing"], "n")
	eq(ev(r), [{"type": "locationChanged", "location": "farm"}])


func test_other_features_are_noTarget() -> void:
	var fail := [{"type": "actionFailed", "reason": "noTarget"}]
	var cases: Array = [
		["cottageDoor", 20, 5, "n", "lowmere"], ["noticeBoard", 10, 8, "n", "lowmere"],
	]
	for c: Array in cases:
		var s := _lowmere(c[1] as int, c[2] as int, c[3] as String)
		eq(ev(Interact.interact(s)), fail, c[0] as String)
		eq(st(Interact.interact(s)), s, "%s changes nothing" % c[0])
	eq(ev(Interact.interact(TestStates.stand_at(TestStates.fresh(), 28, 3, "n"))), fail, "rootShrine")


func test_interacting_does_not_alter_the_cached_lowmere_grid() -> void:
	var before := Zones.grid("lowmere").duplicate(true)
	Interact.interact(_lowmere(12, 1, "n"))
	Interact.interact(_lowmere(22, 8, "e"))
	eq(Zones.grid("lowmere"), before)


func test_lowmere_east_door_leads_to_woods_and_back() -> void:
	var s := TestStates.fresh()
	d(s["player"]).merge({"location": "lowmere", "x": 22.5, "z": 8.5, "facing": "e"}, true)
	var r := Interact.interact(s)
	var next := st(r)
	eq(d(next["player"])["location"], "woods")
	eq(d(next["player"])["x"], Zones.WOODS_SPAWN.x)
	eq(d(next["player"])["z"], Zones.WOODS_SPAWN.y)
	eq(d(ev(r)[0]), {"type": "locationChanged", "location": "woods"})
	d(next["player"]).merge({"x": 1.5, "z": 45.5, "facing": "w"}, true)
	var back := st(Interact.interact(next))
	eq(d(back["player"])["location"], "lowmere")
	eq(d(back["player"])["x"], Zones.LOWMERE_FROM_WOODS.x)
	eq(d(back["player"])["facing"], "w")


func test_clinic_exit_leads_to_lowmere_below_the_clinic_door() -> void:
	var s := TestStates.fresh()
	d(s["player"]).merge({"location": "clinic", "x": 4.5, "z": 5.5, "facing": "s"}, true)
	var next := st(Interact.interact(s))
	eq(d(next["player"])["location"], "lowmere")
	eq(d(next["player"])["x"], Zones.LOWMERE_FROM_CLINIC.x)
	eq(d(next["player"])["z"], Zones.LOWMERE_FROM_CLINIC.y)
