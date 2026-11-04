extends CoreTest
## CombatLayer: the scene glue for fights in the Woods. Driven through `tick` (no window, no real input), on its own
## GameSession and PlayerController.

const GameSessionScript := preload("res://game/autoload/game_session.gd")

var _session: GameSessionScript
var _controller: PlayerController
var _layer: CombatLayer

const NONE := {
	"attack_down": false, "attack_pressed": false, "attack_released": false, "block": false, "dodge_pressed": false,
	"lock_pressed": false,
}


func _in(extra: Dictionary) -> Dictionary:
	var i := NONE.duplicate()
	i.merge(extra, true)
	return i


func _setup(minute: int = 600) -> void:
	var state := NewGame.create({"seed": 1, "farmName": "A", "playerName": "B"})
	var player := d(state["player"])
	player["location"] = "woods"
	player["x"] = 10.5
	player["z"] = 45.5
	player["facing"] = "e"
	d(state["calendar"])["minute"] = minute
	_session = GameSessionScript.new()
	_session.set_process(false)
	add_child_autofree(_session)
	_session.start(state, 1, 0)
	_session.set_screen("game")
	_controller = PlayerController.new()
	_controller.session = _session
	add_child_autofree(_controller)
	_layer = CombatLayer.new()
	_layer.session = _session
	_layer.controller = _controller
	add_child_autofree(_layer)
	_layer.enter_zone("woods")


func _spawn(id: String, level: int, x: float, y: float) -> EnemyActor:
	var actor := _layer._add_actor(EnemyAI.make(id, level, x, y), false)
	return actor


static func _i(v: Variant) -> int:
	var out: int = v
	return out


func _tap() -> Dictionary:
	return _in({"attack_pressed": true, "attack_released": true})


func _run(input: Dictionary, ms: int) -> void:
	var t := 0
	while t < ms:
		_layer.tick(input, 50)
		input = NONE
		t += 50


func test_the_woods_start_with_a_training_dummy_by_day() -> void:
	_setup(600)
	eq(_layer.enemies.size(), 1)
	assert_true(_layer.enemies[0].passive)
	assert_true(_layer.hud_label.visible)


func test_night_adds_burrower_packs() -> void:
	_setup(1300)
	assert_true(_layer.enemies.size() >= 1 + 3 * 2, "dummy plus at least three packs of two")
	var alive := 0
	for actor: EnemyActor in _layer.enemies:
		if not actor.passive:
			alive += 1
	assert_true(alive >= 6)


func test_leaving_for_a_non_combat_zone_clears_the_enemies() -> void:
	_setup(1300)
	_layer.enter_zone("lowmere")
	eq(_layer.enemies.size(), 0)
	assert_false(_layer.hud_label.visible)


func test_a_light_swing_hurts_an_enemy_in_front() -> void:
	_setup()
	var burrower := _spawn("burrower", 1, 11.5, 45.5)
	_layer.tick(_tap(), 50)
	eq(burrower.data["hp"], 50 - Combat.damage(Gear.UNARMED_POWER, 1.0, 0))
	eq(burrower.data["state"], "staggered", "any hit staggers a burrower")


func test_a_swing_misses_enemies_behind_or_far() -> void:
	_setup()
	var behind := _spawn("burrower", 1, 8.5, 45.5)
	var far := _spawn("burrower", 1, 15.5, 45.5)
	_layer.tick(_tap(), 50)
	eq(behind.data["hp"], 50)
	eq(far.data["hp"], 50)


func test_killing_an_enemy_pays_xp_and_levels_up() -> void:
	_setup()
	var burrower := _spawn("burrower", 3, 11.5, 45.5)
	burrower.data["hp"] = 1
	_layer.tick(_tap(), 50)
	eq(burrower.data["state"], "dead")
	eq(_session.state["xp"], 30)
	_layer._award_xp(1000)
	assert_true(_i(_session.state["level"]) > 1)
	eq(_session.state["hp"], Cooking.max_hp(_session.state), "a level-up heals")


func test_a_dead_enemy_pays_only_once() -> void:
	_setup()
	var burrower := _spawn("burrower", 3, 11.5, 45.5)
	burrower.data["hp"] = 1
	_layer.tick(_tap(), 50)
	_run(_tap(), 50)
	eq(_session.state["xp"], 30)


func _hold(input: Dictionary, ms: int) -> void:
	var t := 0
	while t < ms:
		_layer.tick(input, 50)
		t += 50


func test_corpses_are_removed_after_a_moment() -> void:
	_setup()
	var burrower := _spawn("burrower", 1, 11.5, 45.5)
	burrower.data["hp"] = 1
	_layer.tick(_tap(), 50)
	_run(NONE, 1700)
	assert_false(is_instance_valid(burrower))


func test_the_dummy_never_dies() -> void:
	_setup()
	var dummy := _layer.enemies[0]
	dummy.data["x"] = 11.5
	dummy.data["y"] = 45.5
	for i: int in 30:
		_run(_tap(), 500)
	eq(dummy.data["hp"], dummy.data["max_hp"])
	var dummy_state: String = dummy.data["state"]
	assert_true(dummy_state != "dead")


func test_an_enemy_attack_hurts_an_unguarded_player() -> void:
	_setup()
	var burrower := _spawn("burrower", 1, 11.2, 45.5)
	_run(NONE, 1000)
	assert_true(_i(_session.state["hp"]) < 100)
	burrower.data["hp"] = 1


func test_a_dodge_roll_avoids_the_hit() -> void:
	_setup()
	_spawn("burrower", 1, 11.2, 45.5)
	_run(NONE, 400)
	var before: int = _session.state["hp"]
	_layer.tick(_in({"dodge_pressed": true}), 50)
	_run(NONE, 150)
	eq(_session.state["hp"], before, "hit lands during the i-frames or not yet")


func test_blocking_just_before_the_hit_parries_it() -> void:
	_setup()
	var burrower := _spawn("burrower", 1, 11.2, 45.5)
	_hold(NONE, 450)
	_hold(_in({"block": true}), 150)
	eq(_session.state["hp"], 100, "a parry takes no damage")
	var state: String = burrower.data["state"]
	eq(state, "staggered")


func test_blocking_too_early_only_reduces_the_hit() -> void:
	_setup()
	_spawn("burrower", 1, 11.2, 45.5)
	_hold(NONE, 100)
	_hold(_in({"block": true}), 650)
	var hp: int = _session.state["hp"]
	assert_true(hp < 100 and hp >= 96, "30%% of 10 is 3, got %d" % hp)


func test_a_wisp_bolt_is_a_projectile_that_can_hit() -> void:
	_setup()
	d(_session.state["player"])["x"] = 2.0
	_spawn("wisp", 2, 8.5, 45.5)
	_run(NONE, 2200)
	assert_true(_i(_session.state["hp"]) < 100 or _layer.projectiles.size() > 0)


func test_enemies_do_not_walk_through_obstacles() -> void:
	_setup()
	var grid := Zones.grid("woods")
	var burrower := _spawn("burrower", 1, 30.5, 30.5)
	burrower.data["state"] = "chase"
	for i: int in 200:
		_layer.tick(NONE, 50)
		var x: float = burrower.data["x"]
		var y: float = burrower.data["y"]
		assert_false(Grid.is_blocked(Grid.tile_at(grid, floori(x), floori(y))), "step %d at %f,%f" % [i, x, y])


func test_falling_wakes_the_player_in_the_clinic() -> void:
	_setup(900)
	_session.state["hp"] = 1
	d(_session.state["player"])["x"] = 11.0
	var burrower := _spawn("burrower", 3, 11.2, 45.5)
	burrower.data["state"] = "telegraph"
	burrower.data["timer_ms"] = 50
	_layer.tick(NONE, 50)
	eq(d(_session.state["player"])["location"], "clinic")
	eq(_session.state["hp"], Progression.max_hp(1))
	eq(d(_session.state["calendar"])["minute"], 1200)


func test_lock_on_picks_the_nearest_in_front_and_aims_the_swing() -> void:
	_setup()
	var near := _spawn("burrower", 1, 12.5, 46.5)
	_spawn("burrower", 1, 14.5, 45.5)
	_layer.tick(_in({"lock_pressed": true}), 50)
	eq(_layer.lock_id, near.name)
	near.data["x"] = 10.5
	near.data["y"] = 44.0
	_layer.tick(_tap(), 50)
	assert_true(_i(near.data["hp"]) < 50, "the swing turned toward the locked target")


func test_hud_shows_vitals() -> void:
	_setup()
	_layer.tick(NONE, 50)
	assert_true(_layer.hud_label.text.begins_with("HP 100/100"))
	assert_true(_layer.hud_label.text.contains("Lv 1"))


# --- the Bramble Matron (floor 8) -----------------------------------------------------------------------------------

func _boss_setup(defeated: bool = false) -> void:
	_setup()
	var s := _session.state
	d(s["player"]).merge({"location": "mossdeep", "floor": 8, "x": 33.5, "z": 8.5, "facing": "e"}, true)
	if defeated:
		d(d(s["deeps"])["mossdeep"])["bossDefeated"] = true
	_layer.enter_zone("mossdeep")


func _stand_next_to_boss() -> void:
	var bx: float = _layer.boss["x"]
	var by: float = _layer.boss["y"]
	d(_session.state["player"]).merge({"x": bx - 1.2, "z": by, "facing": "e"}, true)


func test_the_matron_waits_in_the_arena_on_floor_8() -> void:
	_boss_setup()
	assert_false(_layer.boss.is_empty())
	eq(_layer.boss["hp"], 2600)
	assert_not_null(_layer.boss_actor)
	assert_false(_layer.thorns_up())


func test_she_does_not_return_once_defeated() -> void:
	_boss_setup(true)
	assert_true(_layer.boss.is_empty())
	assert_null(_layer.boss_actor)


func test_other_floors_have_no_matron() -> void:
	_setup()
	d(_session.state["player"]).merge({"location": "mossdeep", "floor": 3}, true)
	_layer.enter_zone("mossdeep")
	assert_true(_layer.boss.is_empty())
	assert_true(_layer.enemies.size() > 0, "floor 3 has its regular enemies")


func test_a_swing_hurts_the_matron_and_wakes_her() -> void:
	_boss_setup()
	_stand_next_to_boss()
	_layer.tick(_tap(), 50)
	var power := Combat.damage(Gear.UNARMED_POWER, 1.0, 0)
	eq(_layer.boss["hp"], 2600 - power)
	var woke: String = _layer.boss["state"]
	assert_true(woke == "chase" or woke == "telegraph", "awake: " + woke)


func test_her_lash_hurts_an_unguarded_player() -> void:
	_boss_setup()
	_stand_next_to_boss()
	_run(NONE, 3000)
	assert_true(_i(_session.state["hp"]) < 100)


func test_a_parried_lash_does_no_damage() -> void:
	_boss_setup()
	_stand_next_to_boss()
	_layer.tick(NONE, 50)
	_layer.tick(NONE, 50)
	# She is chasing/telegraphing now; guard through the whole wind-up and hit.
	_hold(_in({"block": true}), 1000)
	var hp: int = _session.state["hp"]
	assert_true(hp >= 93, "a guard takes at most 30%% of 24 (7): got %d" % hp)


func test_thorn_walls_rise_after_20_seconds_and_fall_after_8() -> void:
	_boss_setup()
	_layer.boss["state"] = "chase"
	d(_session.state["player"]).merge({"x": 33.5, "z": 8.5}, true)
	_hold(NONE, 19900)
	assert_false(_layer.thorns_up())
	_hold(NONE, 300)
	assert_true(_layer.thorns_up())
	_hold(NONE, BossMatron.WALLS_UP_MS + 200)
	assert_false(_layer.thorns_up())


func test_a_wall_rising_under_the_player_moves_them_to_the_next_lane() -> void:
	_boss_setup()
	_layer.boss["state"] = "chase"
	_session.state["hp"] = 100000
	d(_session.state["player"]).merge({"x": 35.5, "z": 6.5}, true)
	_hold(NONE, 20100)
	assert_true(_layer.thorns_up())
	var z: float = d(_session.state["player"])["z"]
	assert_true(z >= 7.0, "pushed below the wall row, z=%f" % z)


func test_half_health_drops_the_walls_and_summons_saplings() -> void:
	_boss_setup()
	_layer.boss["state"] = "chase"
	_layer.boss = BossMatron.take_damage(_layer.boss, 1400)
	_hold(NONE, 3300)
	eq(_layer.boss["phase"], 2)
	eq(_layer.sapling_actors.size(), 3)
	assert_false(_layer.thorns_up())


func test_saplings_can_be_killed_with_a_swing() -> void:
	_boss_setup()
	_layer.boss = BossMatron.take_damage(_layer.boss, 1400)
	_layer.boss["state"] = "chase"
	_session.state["hp"] = 100000
	d(_session.state["gear"])["weapon"] = "copperSword"
	_hold(NONE, 3300)
	var sap := d(a(_layer.boss["saplings"])[0])
	var sx: float = sap["x"]
	var sy: float = sap["y"]
	d(_session.state["player"]).merge({"x": sx - 1.0, "z": sy, "facing": "e"}, true)
	for i: int in 6:
		_layer.tick(_tap(), 50)
		_hold(NONE, 500)
	assert_true(a(_layer.boss["saplings"]).size() < 3, "a sapling died to the sword")
	eq(_layer.sapling_actors.size(), a(_layer.boss["saplings"]).size())


func test_killing_the_matron_pays_xp_and_drops_the_rootstone() -> void:
	_boss_setup()
	_stand_next_to_boss()
	_layer.boss["hp"] = 1
	_layer.tick(_tap(), 50)
	_layer.tick(NONE, 50)
	eq(_layer.boss["state"], "dead")
	assert_true(Mossdeep.boss_defeated(_session.state))
	eq(Bag.count_of(a(_session.state["bag"]), "verdantRootstone"), 1)
	assert_true(_i(_session.state["level"]) >= 4)
	assert_false(_layer.thorns_up())


func test_the_hud_shows_the_matrons_health_once_awake() -> void:
	_boss_setup()
	_stand_next_to_boss()
	_layer.tick(_tap(), 50)
	assert_true(_layer.hud_label.text.contains("Bramble Matron"))


# --- Mossmaw and the Kindling --------------------------------------------------------------------------------------

func test_mossmaw_stands_in_the_clearing_once_mossdeep_is_cleared() -> void:
	_setup()
	var ids: Array = []
	for actor: EnemyActor in _layer.enemies:
		ids.append(actor.data["id"])
	assert_false(ids.has("mossmaw"), "not before Mossdeep is cleared")
	d(d(_session.state["deeps"])["mossdeep"])["cleared"] = true
	_layer.enter_zone("woods")
	var found: EnemyActor = null
	for actor: EnemyActor in _layer.enemies:
		if actor.data["id"] == "mossmaw":
			found = actor
	assert_not_null(found)
	eq(found.data["hp"], 900)


func test_killing_mossmaw_pays_the_tusk_and_he_stays_down_this_season() -> void:
	_setup()
	d(d(_session.state["deeps"])["mossdeep"])["cleared"] = true
	_layer.enter_zone("woods")
	var boar: EnemyActor = null
	for actor: EnemyActor in _layer.enemies:
		if actor.data["id"] == "mossmaw":
			boar = actor
	boar.data["x"] = 11.5
	boar.data["y"] = 45.5
	boar.data["hp"] = 1
	boar.data["state"] = "idle"
	_layer.tick(_tap(), 50)
	eq(Bag.count_of(a(_session.state["bag"]), "mossmawTusk"), 1)
	eq(_session.state["xp"], 70)
	_layer.enter_zone("woods")
	for actor: EnemyActor in _layer.enemies:
		var enemy_id: String = actor.data["id"]
		assert_true(enemy_id != "mossmaw")


func test_the_kindling_follows_and_heals_where_you_fight() -> void:
	_setup()
	_session.state["kindlings"] = 1
	_session.state["hp"] = 50
	_layer.tick(NONE, 50)
	assert_true(_layer.kindling.visible)
	_hold(NONE, 15000)
	eq(_session.state["hp"], 55)
	var near := (_layer.kindling.position - Vector3(10.5, 0.0, 45.5)).length()
	assert_true(near < 3.0, "stays close: %f" % near)


func test_the_kindling_stays_home_without_the_shrine_or_in_town() -> void:
	_setup()
	_layer.tick(NONE, 50)
	assert_false(_layer.kindling.visible, "not awake yet")
	_session.state["kindlings"] = 1
	d(_session.state["player"])["location"] = "lowmere"
	_layer.tick(NONE, 50)
	assert_false(_layer.kindling.visible)
