extends CoreTest
## CombatLayer.engagement(): what the music sees of a fight (soundtrack spec REQ-15).

const GameSessionScript := preload("res://game/autoload/game_session.gd")

var _session: GameSessionScript
var _layer: CombatLayer


func _setup() -> void:
	var state := NewGame.create({"seed": 1, "farmName": "A", "playerName": "B"})
	var player := d(state["player"])
	player["location"] = "woods"
	player["x"] = 10.5
	player["z"] = 45.5
	d(state["calendar"])["minute"] = 600
	_session = GameSessionScript.new()
	_session.set_process(false)
	add_child_autofree(_session)
	_session.start(state, 1, 0)
	_session.set_screen("game")
	var controller := PlayerController.new()
	controller.session = _session
	add_child_autofree(controller)
	_layer = CombatLayer.new()
	_layer.session = _session
	_layer.controller = controller
	add_child_autofree(_layer)
	_layer.enter_zone("woods")


func _enemy(state_name: String, passive: bool = false) -> EnemyActor:
	var actor := _layer._add_actor(EnemyAI.make("burrower", 1, 12.0, 45.0), passive)
	actor.data["state"] = state_name
	return actor


func test_an_idle_training_dummy_is_not_a_fight() -> void:
	_setup()
	eq(_layer.engagement(), "none")


func test_an_idle_enemy_is_not_a_fight() -> void:
	_setup()
	_enemy("idle")
	eq(_layer.engagement(), "none")


func test_a_chasing_telegraphing_recovering_or_staggered_enemy_is_a_fight() -> void:
	for s: String in ["chase", "telegraph", "recover", "staggered"]:
		_setup()
		_enemy(s)
		eq(_layer.engagement(), "fight", s)


func test_a_dead_enemy_is_not_a_fight() -> void:
	_setup()
	_enemy("dead")
	eq(_layer.engagement(), "none")


func test_a_passive_dummy_in_any_state_is_not_a_fight() -> void:
	_setup()
	_enemy("chase", true)
	eq(_layer.engagement(), "none")


func test_the_matron_alive_is_a_boss_fight_and_gone_when_she_has_fallen() -> void:
	_setup()
	_layer.boss = {"id": "bramble_matron", "hp": 10, "state": "idle"}
	eq(_layer.engagement(), "boss")
	_layer.boss = {}
	eq(_layer.engagement(), "none")
