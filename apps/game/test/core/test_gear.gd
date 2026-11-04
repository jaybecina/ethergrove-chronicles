extends CoreTest
## Slice items, gear, the forge and cooking (M1 spec 7.5, 7.6). Numbers are the spec's drafts.


func _state(extra: Dictionary = {}) -> Dictionary:
	var s := NewGame.create({"seed": 1, "farmName": "A", "playerName": "B"})
	s["bag"] = []
	for i: int in Balance.BAG_SLOTS:
		(s["bag"] as Array).append(null)
	for k: Variant in extra.keys():
		s[k] = extra[k]
	return s


func _with_items(s: Dictionary, items: Dictionary) -> Dictionary:
	for id: String in items.keys():
		var qty: int = items[id]
		var r := Bag.add_item(a(s["bag"]), id, qty)
		s["bag"] = r["bag"]
	return s


func test_slice_items_are_known_and_validate_in_a_save() -> void:
	for id: String in ["copperOre", "copperBar", "practiceSword", "copperSword", "woodBuckler", "copperHelm", "copperMail",
			"copperBoots", "turnipStew", "potatoHash", "strawberryTart", "verdantRootstone", "mossmawTusk", "groundsLantern", "brokenBlade"]:
		assert_true(ItemData.has_item(id), id)
	assert_false(ItemData.has_item("nonsense"))
	eq(ItemData.def_of("fiber")["kind"], "material", "ported items still resolve")


func test_every_falling_protected_id_is_an_item() -> void:
	for id: String in Falling.PROTECTED + Falling.GEAR_IDS:
		assert_true(ItemData.has_item(id), id)


func test_gear_table_matches_spec() -> void:
	eq(Gear.def("practiceSword"), {"slot": "weapon", "power": 10, "defence": 0, "shield": false})
	eq(Gear.def("copperSword")["power"], 16)
	eq(Gear.def("woodBuckler"), {"slot": "offHand", "power": 0, "defence": 5, "shield": true})
	eq(Gear.def("copperHelm")["defence"], 4)
	eq(Gear.def("copperMail")["defence"], 8)
	eq(Gear.def("copperBoots")["defence"], 3)


func test_recipes_match_spec() -> void:
	eq(Forge.RECIPES["copperSword"], {"copperBar": 3, "gold": 100})
	eq(Forge.RECIPES["woodBuckler"], {"wood": 5, "gold": 50})
	eq(Forge.RECIPES["copperHelm"], {"copperBar": 2, "gold": 60})
	eq(Forge.RECIPES["copperMail"], {"copperBar": 4, "gold": 120})
	eq(Forge.RECIPES["copperBoots"], {"copperBar": 2, "gold": 60})
	eq(Forge.SMELT, {"copperOre": 5, "gold": 25})


func test_smelt_turns_five_ore_and_25_gold_into_a_bar() -> void:
	var s := _with_items(_state({"gold": 100}), {"copperOre": 7})
	var r := Forge.smelt(s)
	eq(r["ok"], true)
	var n := d(r["state"])
	eq(Bag.count_of(a(n["bag"]), "copperOre"), 2)
	eq(Bag.count_of(a(n["bag"]), "copperBar"), 1)
	eq(n["gold"], 75)
	eq(Bag.count_of(a(s["bag"]), "copperOre"), 7, "input untouched")


func test_smelt_needs_ore_and_gold() -> void:
	eq(Forge.smelt(_with_items(_state({"gold": 100}), {"copperOre": 4}))["reason"], "missing")
	eq(Forge.smelt(_with_items(_state({"gold": 24}), {"copperOre": 5}))["reason"], "gold")


func test_craft_spends_bars_and_gold_and_adds_gear() -> void:
	var s := _with_items(_state({"gold": 150}), {"copperBar": 3})
	var r := Forge.craft(s, "copperSword")
	eq(r["ok"], true)
	var n := d(r["state"])
	eq(Bag.count_of(a(n["bag"]), "copperSword"), 1)
	eq(Bag.count_of(a(n["bag"]), "copperBar"), 0)
	eq(n["gold"], 50)


func test_craft_fails_without_materials_gold_or_room() -> void:
	eq(Forge.craft(_with_items(_state({"gold": 0}), {"copperBar": 3}), "copperSword")["reason"], "gold")
	eq(Forge.craft(_with_items(_state({"gold": 999}), {"copperBar": 1}), "copperSword")["reason"], "missing")
	eq(Forge.craft(_state({"gold": 999}), "nonsense")["reason"], "unknown")


func test_equip_moves_gear_from_bag_to_slot_and_swaps_back() -> void:
	var s := _with_items(_state(), {"practiceSword": 1, "copperSword": 1})
	var n := d(Gear.equip(s, "practiceSword")["state"])
	eq(d(n["gear"])["weapon"], "practiceSword")
	eq(Bag.count_of(a(n["bag"]), "practiceSword"), 0)
	n = d(Gear.equip(n, "copperSword")["state"])
	eq(d(n["gear"])["weapon"], "copperSword")
	eq(Bag.count_of(a(n["bag"]), "practiceSword"), 1, "old weapon goes back to the bag")


func test_equip_rejects_missing_or_non_gear() -> void:
	eq(Gear.equip(_state(), "copperSword")["ok"], false)
	eq(Gear.equip(_with_items(_state(), {"fiber": 1}), "fiber")["ok"], false)


func test_stats_sum_equipped_gear() -> void:
	var s := _state()
	eq(Gear.stats(s), {"power": Gear.UNARMED_POWER, "defence": 0, "shield": false})
	s["gear"] = {"weapon": "copperSword", "offHand": "woodBuckler", "head": "copperHelm", "body": "copperMail", "feet": "copperBoots", "trinket1": null, "trinket2": null}
	eq(Gear.stats(s), {"power": 16, "defence": 20, "shield": true})


func test_dish_table_matches_spec() -> void:
	eq(Cooking.DISHES["turnipStew"], {"ingredients": {"turnip": 2}, "hp": 40, "buff": "steady"})
	eq(Cooking.DISHES["potatoHash"], {"ingredients": {"potato": 1, "turnip": 1}, "hp": 60, "buff": "hearty"})
	eq(Cooking.DISHES["strawberryTart"], {"ingredients": {"strawberry": 3}, "hp": 30, "buff": "quickstep"})


func test_cook_consumes_ingredients() -> void:
	var s := _with_items(_state(), {"turnip": 3})
	var r := Cooking.cook(s, "turnipStew")
	eq(r["ok"], true)
	var n := d(r["state"])
	eq(Bag.count_of(a(n["bag"]), "turnip"), 1)
	eq(Bag.count_of(a(n["bag"]), "turnipStew"), 1)
	eq(Cooking.cook(_with_items(_state(), {"turnip": 1}), "turnipStew")["ok"], false)


func test_eat_heals_and_sets_a_six_hour_buff() -> void:
	var s := _with_items(_state({"hp": 50}), {"turnipStew": 1})
	s["calendar"]["minute"] = 600
	var n := d(Cooking.eat(s, "turnipStew")["state"])
	eq(n["hp"], 90)
	eq(n["buff"], {"id": "steady", "untilMinute": 960})
	eq(Bag.count_of(a(n["bag"]), "turnipStew"), 0)


func test_eat_caps_hp_at_max_and_a_new_dish_replaces_the_buff() -> void:
	var s := _with_items(_state({"hp": 95}), {"turnipStew": 1, "strawberryTart": 1})
	var n := d(Cooking.eat(s, "turnipStew")["state"])
	eq(n["hp"], 100)
	n = d(Cooking.eat(n, "strawberryTart")["state"])
	eq(d(n["buff"])["id"], "quickstep")


func test_buff_modifiers_apply_only_while_active() -> void:
	var s := _state()
	s["calendar"]["minute"] = 600
	eq(Cooking.block_drain_mult(s), 1.0)
	s["buff"] = {"id": "steady", "untilMinute": 960}
	eq(Cooking.block_drain_mult(s), 0.75)
	s["buff"] = {"id": "quickstep", "untilMinute": 960}
	eq(Cooking.stamina_rate_mult(s), 1.2)
	s["buff"] = {"id": "hearty", "untilMinute": 960}
	eq(Cooking.max_hp(s), 120)
	s["calendar"]["minute"] = 961
	eq(Cooking.max_hp(s), 100, "expired")
	eq(Cooking.block_drain_mult(s), 1.0)
