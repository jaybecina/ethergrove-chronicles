extends CoreTest
## The Bramble Matron (M1 spec 6.4): phase 1 thorn walls split the arena into lanes every 20 s; at 50% HP she staggers
## and, in phase 2, summons 3 saplings (20 HP, slow, explode for 12 after 6 s) every 25 s. Only a phase change staggers her.

const FAR := Vector2(100, 100)


func _boss() -> Dictionary:
	return BossMatron.make(40.5, 8.5)


func _run(boss: Dictionary, target: Vector2, ms: int, dt: int = 50) -> Dictionary:
	var cur := boss
	var events: Array = []
	var t := 0
	while t < ms:
		var r := BossMatron.step(cur, target, dt)
		cur = d(r["boss"])
		events.append_array(a(r["events"]))
		t += dt
	return {"boss": cur, "events": events}


func _types(events: Array) -> Array:
	var out: Array = []
	for e: Variant in events:
		out.append(d(e)["type"])
	return out


func test_make_matches_the_spec() -> void:
	var b := _boss()
	eq(b["hp"], 2600)
	eq(b["max_hp"], 2600)
	eq(b["phase"], 1)
	eq(b["state"], "idle")
	eq(b["saplings"], [])
	eq(b["walls_up"], false)


func test_she_sleeps_until_the_player_is_close() -> void:
	var r := _run(_boss(), FAR, 2000)
	eq(d(r["boss"])["state"], "idle")
	var near := d(BossMatron.step(_boss(), Vector2(40.5, 14.5), 50)["boss"])
	eq(near["state"], "chase")


func test_lash_telegraphs_for_700ms_then_hits_for_24() -> void:
	var b := _boss()
	b["state"] = "chase"
	var early := _run(b, Vector2(41.5, 8.5), 650)
	eq(_types(a(early["events"])).has("hit"), false, "no hit inside the 0.7 s telegraph")
	var done := _run(b, Vector2(41.5, 8.5), 900)
	var hits := a(done["events"]).filter(func(e: Variant) -> bool: return d(e)["type"] == "hit")
	assert_true(hits.size() >= 1)
	var hit := d(hits[0])
	eq(hit["attack"], "lash")
	eq(hit["power"], 24)
	eq(hit["parry_stagger_ms"], 0)
	var telegraph: int = hit["telegraph_ms"]
	assert_true(telegraph >= 700)


func test_root_burst_is_a_3m_circle_for_30() -> void:
	var b := _boss()
	b["state"] = "chase"
	b["attack_index"] = 1
	var r := _run(b, Vector2(41.5, 8.5), 1000)
	var hits := a(r["events"]).filter(func(e: Variant) -> bool: return d(e)["type"] == "hit")
	var hit := d(hits[0])
	eq(hit["attack"], "burst")
	eq(hit["power"], 30)
	eq(hit["radius"], 3.0)


func test_attacks_alternate_lash_and_burst() -> void:
	var b := _boss()
	b["state"] = "chase"
	var r := _run(b, Vector2(41.5, 8.5), 6000)
	var attacks: Array = []
	for e: Variant in a(r["events"]):
		if d(e)["type"] == "hit":
			attacks.append(d(e)["attack"])
	assert_true(attacks.size() >= 3)
	eq(attacks[0], "lash")
	eq(attacks[1], "burst")
	eq(attacks[2], "lash")


func test_thorn_walls_rise_every_20_seconds_and_fall_again() -> void:
	var b := _boss()
	b["state"] = "chase"
	var r := _run(b, FAR, 19900)
	eq(_types(a(r["events"])).has("wallsRaised"), false)
	r = _run(d(r["boss"]), FAR, 200)
	eq(_types(a(r["events"])).has("wallsRaised"), true)
	eq(d(r["boss"])["walls_up"], true)
	r = _run(d(r["boss"]), FAR, BossMatron.WALLS_UP_MS + 100)
	eq(_types(a(r["events"])).has("wallsLowered"), true)
	eq(d(r["boss"])["walls_up"], false)


func test_the_boss_takes_damage_without_staggering() -> void:
	var b := _boss()
	b["state"] = "telegraph"
	b["timer_ms"] = 300
	var hurt := BossMatron.take_damage(b, 100)
	eq(hurt["hp"], 2500)
	eq(hurt["state"], "telegraph")


func test_half_health_triggers_a_phase_change_stagger() -> void:
	var b := _boss()
	b["state"] = "telegraph"
	b["timer_ms"] = 300
	var hurt := BossMatron.take_damage(b, 1400)
	eq(hurt["phase"], 2)
	eq(hurt["state"], "phase_change")
	eq(hurt["walls_up"], false, "walls drop at the phase change")
	var r := _run(hurt, FAR, 100)
	eq(_types(a(r["events"])), ["phaseChanged"])
	var later := _run(hurt, FAR, BossMatron.PHASE_CHANGE_MS + 100)
	var left: String = d(later["boss"])["state"]
	assert_true(left != "phase_change", left)


func test_phase_change_event_is_emitted_once() -> void:
	var b := BossMatron.take_damage(_boss(), 1400)
	var r := BossMatron.step(b, FAR, 50)
	eq(_types(a(r["events"])), ["phaseChanged"])
	eq(_types(a(BossMatron.step(d(r["boss"]), FAR, 50)["events"])), [])


func test_phase_two_summons_three_saplings_every_25_seconds() -> void:
	var b := BossMatron.take_damage(_boss(), 1400)
	var r := _run(b, FAR, 3200)
	var summons := _types(a(r["events"])).filter(func(t: Variant) -> bool: return t == "saplingsSummoned")
	eq(summons.size(), 1, "first summon shortly after the change")
	eq(a(d(r["boss"])["saplings"]).size(), 3)
	var sap := d(a(d(r["boss"])["saplings"])[0])
	eq(sap["hp"], 20)
	var more := _run(d(r["boss"]), FAR, 25000)
	var total := _types(a(more["events"])).filter(func(t: Variant) -> bool: return t == "saplingsSummoned")
	assert_true(total.size() >= 1, "and again 25 s later")


func test_saplings_chase_slowly_and_explode_after_six_seconds() -> void:
	var b := BossMatron.take_damage(_boss(), 1400)
	var r := _run(b, Vector2(35.5, 8.5), 3200)
	var boss := d(r["boss"])
	var before := d(a(boss["saplings"])[0])
	var bx: float = before["x"]
	var moved := _run(boss, Vector2(35.5, 8.5), 1000)
	var after := d(a(d(moved["boss"])["saplings"])[0])
	var ax: float = after["x"]
	assert_true(absf(ax - bx) < 1.5 and absf(ax - bx) > 0.0, "slow, but moving")
	var boom := _run(boss, Vector2(100, 100), BossMatron.SAPLING_FUSE_MS + 200)
	var blasts := a(boom["events"]).filter(func(e: Variant) -> bool: return d(e)["type"] == "saplingExploded")
	eq(blasts.size(), 3)
	eq(d(blasts[0])["power"], 12)
	eq(a(d(boom["boss"])["saplings"]).size(), 0)


func test_killing_a_sapling_removes_it_without_an_explosion() -> void:
	var b := BossMatron.take_damage(_boss(), 1400)
	var r := _run(b, FAR, 3200)
	var boss := d(r["boss"])
	var hurt := BossMatron.damage_sapling(boss, 0, 25)
	eq(a(hurt["saplings"]).size(), 2)
	var soft := BossMatron.damage_sapling(boss, 0, 5)
	eq(d(a(soft["saplings"])[0])["hp"], 15)


func test_death_is_terminal_and_clears_saplings_and_walls() -> void:
	var b := BossMatron.take_damage(_boss(), 1400)
	b = d(_run(b, FAR, 3200)["boss"])
	var dead := BossMatron.take_damage(b, 99999)
	eq(dead["hp"], 0)
	eq(dead["state"], "dead")
	eq(dead["saplings"], [])
	eq(dead["walls_up"], false)
	var r := BossMatron.step(dead, Vector2(40.5, 8.5), 50)
	eq(_types(a(r["events"])), ["died"])
	eq(_types(a(BossMatron.step(d(r["boss"]), Vector2(40.5, 8.5), 50)["events"])), [])


func test_step_does_not_mutate_input() -> void:
	var b := _boss()
	b["state"] = "chase"
	BossMatron.step(b, Vector2(41.5, 8.5), 1000)
	eq(b["state"], "chase")
	eq(b["x"], 40.5)
