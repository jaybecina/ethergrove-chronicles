extends CoreTest
## Combat rules (M1 spec 7.1, 7.2): damage, block, parry, dodge, stamina and lock-on. All numbers are the spec's.


func test_constants_match_spec() -> void:
	eq(Combat.LIGHT_STAMINA, 12.0)
	eq(Combat.HEAVY_STAMINA, 25.0)
	eq(Combat.DODGE_STAMINA, 20.0)
	eq(Combat.PARRY_WINDOW_MS, 150)
	eq(Combat.DODGE_IFRAME_MS, 250)
	eq(Combat.HEAVY_HOLD_MS, 350)
	eq(Combat.HEAVY_MULTIPLIER, 1.8)
	eq(Combat.STAMINA_IDLE_MS, 800)
	eq(Combat.STAMINA_PER_SECOND, 30.0)
	eq(Combat.BLOCK_NO_SHIELD, 0.7)
	eq(Combat.BLOCK_SHIELD, 0.9)
	eq(Combat.RUN_STAMINA_PER_SECOND, 10.0)


func test_damage_formula() -> void:
	eq(Combat.damage(10, 1.0, 0), 10)
	eq(Combat.damage(10, 1.8, 0), 18)
	eq(Combat.damage(10, 1.0, 100), 5, "defence 100 halves damage")
	eq(Combat.damage(16, 1.0, 8), 15, "round(16 * 100 / 108) = 15")
	eq(Combat.damage(1, 1.0, 1000), 0, "never negative")


func test_attack_kind_by_hold_time() -> void:
	eq(Combat.attack_kind(0), "light")
	eq(Combat.attack_kind(349), "light")
	eq(Combat.attack_kind(350), "heavy")
	eq(Combat.attack_kind(2000), "heavy")


func test_move_multiplier_and_stamina() -> void:
	eq(Combat.move_multiplier("heavy", 0), 1.8)
	eq(Combat.move_multiplier("light", 2), 1.2, "third hit of the chain")
	eq(Combat.move_multiplier("light", 9), 1.2, "chain index clamps")
	eq(Combat.move_stamina("light"), 12.0)
	eq(Combat.move_stamina("heavy"), 25.0)
	eq(Combat.move_stamina("dodge"), 20.0)


func _defender(extra: Dictionary = {}) -> Dictionary:
	var base := {"defence": 0, "blocking": false, "block_held_ms": -1, "shield": false, "iframe_ms": 0, "block_drain_mult": 1.0}
	base.merge(extra, true)
	return base


func test_plain_hit() -> void:
	var r := Combat.resolve_hit({"power": 20, "parry_stagger_ms": 1500}, _defender(), 1.0)
	eq(r["damage"], 20)
	eq(r["blocked"], false)
	eq(r["parried"], false)
	eq(r["dodged"], false)
	eq(r["stamina_cost"], 0.0)


func test_dodge_iframes_negate_the_hit() -> void:
	var r := Combat.resolve_hit({"power": 20}, _defender({"iframe_ms": 100}), 1.0)
	eq(r["damage"], 0)
	eq(r["dodged"], true)


func test_block_without_shield_takes_30_percent_and_pays_half_blocked_damage() -> void:
	var r := Combat.resolve_hit({"power": 20}, _defender({"blocking": true, "block_held_ms": 400}), 1.0)
	eq(r["blocked"], true)
	eq(r["parried"], false)
	eq(r["damage"], 6, "30% of 20")
	eq(r["stamina_cost"], 7.0, "half of the 14 blocked")


func test_block_with_shield_takes_10_percent() -> void:
	var r := Combat.resolve_hit({"power": 20}, _defender({"blocking": true, "block_held_ms": 400, "shield": true}), 1.0)
	eq(r["damage"], 2)
	eq(r["stamina_cost"], 9.0)


func test_steady_buff_cuts_block_stamina_by_a_quarter() -> void:
	var r := Combat.resolve_hit({"power": 20}, _defender({"blocking": true, "block_held_ms": 400, "block_drain_mult": 0.75}), 1.0)
	eq(r["stamina_cost"], 5.25)


func test_parry_inside_window_negates_damage_and_staggers() -> void:
	var r := Combat.resolve_hit({"power": 20, "parry_stagger_ms": 1500}, _defender({"blocking": true, "block_held_ms": 150}), 1.0)
	eq(r["parried"], true)
	eq(r["blocked"], true)
	eq(r["damage"], 0)
	eq(r["stagger_ms"], 1500)
	eq(r["stamina_cost"], 0.0)


func test_parry_just_outside_window_is_a_block() -> void:
	var r := Combat.resolve_hit({"power": 20, "parry_stagger_ms": 1500}, _defender({"blocking": true, "block_held_ms": 151}), 1.0)
	eq(r["parried"], false)
	eq(r["blocked"], true)
	eq(r["stagger_ms"], 0)


func test_brute_parry_does_not_stagger() -> void:
	var r := Combat.resolve_hit({"power": 22, "parry_stagger_ms": 0}, _defender({"blocking": true, "block_held_ms": 10}), 1.0)
	eq(r["parried"], true)
	eq(r["stagger_ms"], 0)


func test_defence_reduces_the_hit() -> void:
	var r := Combat.resolve_hit({"power": 22}, _defender({"defence": 8}), 1.0)
	eq(r["damage"], 20, "round(22 * 100 / 108)")


func test_stamina_spend_resets_idle_and_clamps_at_zero() -> void:
	var r := Combat.stamina_step(50.0, 100.0, 12.0, 900, 50)
	eq(r["stamina"], 38.0)
	eq(r["idle_ms"], 0)
	r = Combat.stamina_step(5.0, 100.0, 12.0, 0, 50)
	eq(r["stamina"], 0.0)


func test_stamina_waits_800ms_then_refills_30_per_second() -> void:
	var r := Combat.stamina_step(50.0, 100.0, 0.0, 700, 50)
	eq(r["stamina"], 50.0, "still inside the 0.8 s wait")
	eq(r["idle_ms"], 750)
	r = Combat.stamina_step(50.0, 100.0, 0.0, 800, 1000)
	eq(r["stamina"], 80.0)
	r = Combat.stamina_step(95.0, 100.0, 0.0, 2000, 1000)
	eq(r["stamina"], 100.0, "clamps at max")


func test_quickstep_refills_20_percent_faster() -> void:
	var r := Combat.stamina_step(0.0, 100.0, 0.0, 800, 1000, 1.2)
	eq(r["stamina"], 36.0)


func test_lock_on_picks_nearest_in_front_cone() -> void:
	var enemies: Array = [
		{"id": "far", "x": 8.0, "y": 0.0},
		{"id": "near", "x": 3.0, "y": 0.5},
		{"id": "behind", "x": -2.0, "y": 0.0},
		{"id": "too_far", "x": 12.0, "y": 0.0},
	]
	eq(Combat.pick_target(Vector2.ZERO, Vector2.RIGHT, enemies, ""), "near")


func test_lock_on_ignores_enemies_outside_cone_and_range() -> void:
	var enemies: Array = [{"id": "behind", "x": -2.0, "y": 0.0}, {"id": "side", "x": 0.0, "y": 3.0}, {"id": "far", "x": 11.0, "y": 0.0}]
	eq(Combat.pick_target(Vector2.ZERO, Vector2.RIGHT, enemies, ""), "")


func test_lock_on_switch_cycles_by_distance() -> void:
	var enemies: Array = [{"id": "a", "x": 2.0, "y": 0.0}, {"id": "b", "x": 4.0, "y": 0.0}, {"id": "c", "x": 6.0, "y": 0.0}]
	eq(Combat.pick_target(Vector2.ZERO, Vector2.RIGHT, enemies, "a"), "b")
	eq(Combat.pick_target(Vector2.ZERO, Vector2.RIGHT, enemies, "b"), "c")
	eq(Combat.pick_target(Vector2.ZERO, Vector2.RIGHT, enemies, "c"), "a", "wraps")


func test_lock_on_keeps_only_target_when_alone() -> void:
	var enemies: Array = [{"id": "a", "x": 2.0, "y": 0.0}]
	eq(Combat.pick_target(Vector2.ZERO, Vector2.RIGHT, enemies, "a"), "a")
