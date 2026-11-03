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


## Version 3 features have no action in this plan (Plans 2 and 4 add them): interacting fails with noTarget.
func test_the_new_features_have_no_action_yet() -> void:
	var fail := [{"type": "actionFailed", "reason": "noTarget"}]
	var shrine := TestStates.stand_at(TestStates.fresh(), 28, 3, "n")
	eq(ev(Interact.interact(shrine)), fail, "rootShrine")
	var gate := TestStates.stand_at(TestStates.fresh(), 16, 22, "s")
	eq(ev(Interact.interact(gate)), fail, "farmGate")
	var stove := TestStates.stand_at(_house(TestStates.fresh()), 1, 2, "n")
	eq(ev(Interact.interact(stove)), fail, "stove")
	eq(st(Interact.interact(stove)), stove, "nothing changes")
