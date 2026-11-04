extends CoreTest
## The player's combat state machine (M1 spec 7.1, 7.2): idle, attack_hold, light, heavy, dodge, block, staggered, down.

const NONE := {"attack_down": false, "attack_pressed": false, "attack_released": false, "block": false, "dodge_pressed": false}


func _in(extra: Dictionary) -> Dictionary:
	var i := NONE.duplicate()
	i.merge(extra, true)
	return i


func _step(pc: Dictionary, input: Dictionary, dt: int = 50) -> Dictionary:
	return PlayerCombat.step(pc, input, dt, 100.0)


func _run(pc: Dictionary, input: Dictionary, ms: int) -> Dictionary:
	var cur := pc
	var events: Array = []
	var t := 0
	while t < ms:
		var r := _step(cur, input)
		cur = d(r["pc"])
		events.append_array(a(r["events"]))
		t += 50
	return {"pc": cur, "events": events}


func test_new_player_is_idle_with_full_stamina() -> void:
	var pc := PlayerCombat.make(100.0)
	eq(pc["state"], "idle")
	eq(pc["stamina"], 100.0)


func test_a_tap_is_a_light_attack_that_spends_12() -> void:
	var r := _step(PlayerCombat.make(100.0), _in({"attack_pressed": true, "attack_released": true}))
	eq(d(r["pc"])["state"], "light")
	eq(d(d(r["pc"]))["stamina"], 88.0)
	eq(a(r["events"]), [{"type": "swing", "kind": "light", "multiplier": 1.0, "chain": 0}])


func test_holding_350ms_then_releasing_is_a_heavy_attack() -> void:
	var r := _step(PlayerCombat.make(100.0), _in({"attack_pressed": true, "attack_down": true}))
	eq(d(r["pc"])["state"], "attack_hold")
	var held := _run(d(r["pc"]), _in({"attack_down": true}), 350)
	eq(a(held["events"]).size(), 0, "no swing while holding")
	var rel := _step(d(held["pc"]), _in({"attack_released": true}))
	eq(a(rel["events"]), [{"type": "swing", "kind": "heavy", "multiplier": 1.8, "chain": 0}])
	eq(d(rel["pc"])["stamina"], 75.0)
	eq(d(rel["pc"])["state"], "heavy")


func test_release_before_350ms_is_light() -> void:
	var r := _step(PlayerCombat.make(100.0), _in({"attack_pressed": true, "attack_down": true}))
	var held := _run(d(r["pc"]), _in({"attack_down": true}), 150)
	var rel := _step(d(held["pc"]), _in({"attack_released": true}))
	eq(d(a(rel["events"])[0])["kind"], "light")


func test_light_chain_runs_three_hits_with_the_third_stronger() -> void:
	var pc := PlayerCombat.make(100.0)
	var tap := _in({"attack_pressed": true, "attack_released": true})
	var r := _step(pc, tap)
	pc = d(r["pc"])
	var swings: Array = a(r["events"]).duplicate()
	for i: int in 2:
		r = _step(pc, tap)
		pc = d(r["pc"])
		swings.append_array(a(r["events"]))
		r = _run(pc, NONE, 450)
		pc = d(r["pc"])
		swings.append_array(a(r["events"]))
	var chains: Array = []
	for s: Variant in swings:
		chains.append(d(s)["chain"])
	eq(chains, [0, 1, 2])
	eq(d(swings[2])["multiplier"], 1.2)


func test_chain_resets_to_idle_after_the_third_hit() -> void:
	var pc := PlayerCombat.make(100.0)
	pc["state"] = "light"
	pc["chain"] = 2
	pc["timer_ms"] = 50
	var r := _step(pc, NONE)
	eq(d(r["pc"])["state"], "idle")
	eq(d(r["pc"])["chain"], 0)


func test_no_attack_without_enough_stamina() -> void:
	var pc := PlayerCombat.make(100.0)
	pc["stamina"] = 5.0
	var r := _step(pc, _in({"attack_pressed": true, "attack_released": true}))
	eq(d(r["pc"])["state"], "idle")
	eq(a(r["events"]).size(), 0)


func test_dodge_spends_20_and_grants_250ms_of_iframes() -> void:
	var r := _step(PlayerCombat.make(100.0), _in({"dodge_pressed": true}))
	var pc := d(r["pc"])
	eq(pc["state"], "dodge")
	eq(pc["stamina"], 80.0)
	eq(pc["iframe_ms"], 250 - 50, "one step already elapsed")
	eq(a(r["events"]), [{"type": "dodge"}])
	var later := _run(pc, NONE, 250)
	eq(d(later["pc"])["iframe_ms"], 0)


func test_block_holds_and_tracks_how_long() -> void:
	var pc := d(_step(PlayerCombat.make(100.0), _in({"block": true}))["pc"])
	eq(pc["state"], "block")
	eq(pc["block_held_ms"], 50)
	pc = d(_run(pc, _in({"block": true}), 200)["pc"])
	eq(pc["block_held_ms"], 250)
	pc = d(_step(pc, NONE)["pc"])
	eq(pc["state"], "idle")
	eq(pc["block_held_ms"], -1)


func test_cannot_block_while_swinging() -> void:
	var pc := d(_step(PlayerCombat.make(100.0), _in({"attack_pressed": true, "attack_released": true}))["pc"])
	eq(d(_step(pc, _in({"block": true}))["pc"])["state"], "light")


func test_defender_view_feeds_resolve_hit() -> void:
	var pc := d(_step(PlayerCombat.make(100.0), _in({"block": true}))["pc"])
	var view := PlayerCombat.defender(pc, 4, true, 0.75)
	eq(view, {"defence": 4, "blocking": true, "block_held_ms": 50, "shield": true, "iframe_ms": 0, "block_drain_mult": 0.75})
	var res := Combat.resolve_hit({"power": 10, "parry_stagger_ms": 1500}, view, 1.0)
	eq(res["parried"], true, "blocked 50 ms ago is inside the 150 ms window")


func test_taking_a_hit_spends_block_stamina_and_staggers_on_a_big_unblocked_hit() -> void:
	var pc := PlayerCombat.make(100.0)
	var res := {"damage": 12, "blocked": false, "parried": false, "dodged": false, "stamina_cost": 0.0, "stagger_ms": 0}
	var hurt := PlayerCombat.receive(pc, res)
	eq(hurt["state"], "staggered")
	var blocked := PlayerCombat.receive(pc, {"damage": 2, "blocked": true, "parried": false, "dodged": false, "stamina_cost": 9.0, "stagger_ms": 0})
	eq(blocked["stamina"], 91.0)
	eq(blocked["state"], "idle", "a block holds the stance")
	var dodged := PlayerCombat.receive(pc, {"damage": 0, "blocked": false, "parried": false, "dodged": true, "stamina_cost": 0.0, "stagger_ms": 0})
	eq(dodged["state"], "idle")


func test_guard_break_when_block_stamina_runs_out() -> void:
	var pc := d(_step(PlayerCombat.make(100.0), _in({"block": true}))["pc"])
	pc["stamina"] = 3.0
	var out := PlayerCombat.receive(pc, {"damage": 2, "blocked": true, "parried": false, "dodged": false, "stamina_cost": 9.0, "stagger_ms": 0})
	eq(out["state"], "staggered")
	eq(out["stamina"], 0.0)


func test_stamina_refills_after_idle() -> void:
	var pc := PlayerCombat.make(100.0)
	pc["stamina"] = 40.0
	var r := _run(pc, NONE, 1800)
	var refilled: float = d(r["pc"])["stamina"]
	assert_true(refilled > 55.0, str(refilled))


func test_down_is_terminal_until_revived() -> void:
	var pc := PlayerCombat.down(PlayerCombat.make(100.0))
	eq(pc["state"], "down")
	eq(d(_step(pc, _in({"attack_pressed": true, "attack_released": true}))["pc"])["state"], "down")
	eq(PlayerCombat.make(100.0)["state"], "idle")


func test_step_does_not_mutate_input() -> void:
	var pc := PlayerCombat.make(100.0)
	_step(pc, _in({"dodge_pressed": true}))
	eq(pc["stamina"], 100.0)
