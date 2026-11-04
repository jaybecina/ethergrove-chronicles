extends CoreTest
## Enemy state machine (M1 spec 6.4, 7.2): idle, chase, telegraph, attack, recover, staggered.


func _run(e: Dictionary, target: Vector2, ms: int, dt: int = 50) -> Dictionary:
	var cur := e
	var events: Array = []
	var t := 0
	while t < ms:
		var r := EnemyAI.step(cur, target, dt)
		cur = d(r["enemy"])
		events.append_array(a(r["events"]))
		t += dt
	return {"enemy": cur, "events": events}


func test_make_uses_enemy_data() -> void:
	var e := EnemyAI.make("brute", 3, 5.0, 6.0)
	eq(e["hp"], 235)
	eq(e["max_hp"], 235)
	eq(e["state"], "idle")
	eq(e["level"], 3)
	eq(e["x"], 5.0)


func test_make_clamps_level() -> void:
	eq(EnemyAI.make("burrower", 99, 0.0, 0.0)["level"], 5)


func test_idle_ignores_far_player_and_chases_near_one() -> void:
	var e := EnemyAI.make("burrower", 1, 0.0, 0.0)
	eq(d(EnemyAI.step(e, Vector2(30, 0), 50)["enemy"])["state"], "idle")
	eq(d(EnemyAI.step(e, Vector2(5, 0), 50)["enemy"])["state"], "chase")


func test_chase_moves_toward_player_at_speed() -> void:
	var e := EnemyAI.make("burrower", 1, 0.0, 0.0)
	e["state"] = "chase"
	var next := d(EnemyAI.step(e, Vector2(6, 0), 1000)["enemy"])
	var nx: float = next["x"]
	assert_almost_eq(nx, 3.6, 0.001, "speed 3.6 m/s for 1 s")
	eq(next["y"], 0.0)


func test_chase_into_reach_starts_telegraph_with_full_timer() -> void:
	var e := EnemyAI.make("burrower", 1, 0.0, 0.0)
	e["state"] = "chase"
	var next := d(EnemyAI.step(e, Vector2(1.0, 0), 50)["enemy"])
	eq(next["state"], "telegraph")
	eq(next["timer_ms"], 500)


func test_attack_lands_only_after_the_full_telegraph() -> void:
	var e := EnemyAI.make("burrower", 1, 0.0, 0.0)
	e["state"] = "chase"
	var early := _run(e, Vector2(1.0, 0), 450)
	eq(a(early["events"]).size(), 0, "no hit before 500 ms")
	var done := _run(e, Vector2(1.0, 0), 600)
	var hits := a(done["events"])
	eq(hits.size(), 1)
	var hit := d(hits[0])
	eq(hit["type"], "hit")
	eq(hit["power"], 10)
	eq(hit["multiplier"], 1.0)


func test_after_attack_enemy_recovers_then_chases() -> void:
	var e := EnemyAI.make("burrower", 1, 0.0, 0.0)
	e["state"] = "chase"
	var r := _run(e, Vector2(1.0, 0), 600)
	eq(d(r["enemy"])["state"], "recover")
	r = _run(d(r["enemy"]), Vector2(1.0, 0), 700)
	var after: String = d(r["enemy"])["state"]
	assert_true(["chase", "telegraph"].has(after), after)


func test_brute_slam_has_radius_and_long_telegraph() -> void:
	var e := EnemyAI.make("brute", 3, 0.0, 0.0)
	e["state"] = "chase"
	var r := _run(e, Vector2(1.5, 0), 850)
	eq(a(r["events"]).size(), 0, "0.9 s telegraph")
	r = _run(e, Vector2(1.5, 0), 1000)
	var hit := d(a(r["events"])[0])
	eq(hit["radius"], 2.5)
	eq(hit["power"], 31)


func test_wisp_backs_off_when_too_close_and_fires_a_projectile() -> void:
	var e := EnemyAI.make("wisp", 2, 0.0, 0.0)
	e["state"] = "chase"
	var back := d(EnemyAI.step(e, Vector2(3, 0), 1000)["enemy"])
	var back_x: float = back["x"]
	assert_true(back_x < 0.0, "moves away from a player 3 m off")
	e["x"] = -7.0
	var r := _run(e, Vector2(0, 0), 1100)
	var hit := d(a(r["events"])[0])
	eq(hit["projectile"], true)
	eq(hit["speed"], 12.0)


func test_light_hit_staggers_a_burrower_and_cancels_its_telegraph() -> void:
	var e := EnemyAI.make("burrower", 1, 0.0, 0.0)
	e["state"] = "telegraph"
	e["timer_ms"] = 300
	var hurt := EnemyAI.take_damage(e, 10, false)
	eq(hurt["hp"], 40)
	eq(hurt["state"], "staggered")
	eq(hurt["timer_ms"], EnemyAI.HIT_STUN_MS)


func test_brute_ignores_light_hits_but_staggers_on_heavy() -> void:
	var e := EnemyAI.make("brute", 3, 0.0, 0.0)
	e["state"] = "telegraph"
	e["timer_ms"] = 400
	var light := EnemyAI.take_damage(e, 10, false)
	eq(light["state"], "telegraph")
	eq(light["hp"], 225)
	eq(EnemyAI.take_damage(e, 18, true)["state"], "staggered")


func test_boss_does_not_stagger_from_hits() -> void:
	var e := EnemyAI.make("bramble_matron", 10, 0.0, 0.0)
	e["state"] = "telegraph"
	e["timer_ms"] = 400
	eq(EnemyAI.take_damage(e, 50, true)["state"], "telegraph")


func test_death_at_zero_hp() -> void:
	var e := EnemyAI.make("wisp", 2, 0.0, 0.0)
	var dead := EnemyAI.take_damage(e, 999, true)
	eq(dead["hp"], 0)
	eq(dead["state"], "dead")
	eq(d(EnemyAI.step(dead, Vector2.ZERO, 50)["enemy"])["state"], "dead")


func test_parry_stagger_holds_for_given_time_then_recovers() -> void:
	var e := EnemyAI.make("burrower", 1, 0.0, 0.0)
	var s := EnemyAI.stagger(e, 1500)
	eq(s["state"], "staggered")
	var r := _run(s, Vector2(1, 0), 1400)
	eq(d(r["enemy"])["state"], "staggered")
	r = _run(s, Vector2(1, 0), 1600)
	var left: String = d(r["enemy"])["state"]
	assert_true(left != "staggered", left)


func test_step_does_not_mutate_input() -> void:
	var e := EnemyAI.make("burrower", 1, 0.0, 0.0)
	e["state"] = "chase"
	EnemyAI.step(e, Vector2(6, 0), 1000)
	eq(e["x"], 0.0)
