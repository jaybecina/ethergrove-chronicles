class_name PlayerWorld
extends RefCounted
## Builds the minimal physics scene the player tests share: a test GameSession (not the autoload) on the screen
## "game" with its own frame loop off, plus a Node3D holding the zone's CollisionBuilder body and a PlayerController
## wired to that session. Everything is freed by GUT after the test.

const GameSessionScript := preload("res://game/autoload/game_session.gd")


static func session(test: GutTest, state: Dictionary) -> GameSessionScript:
	var s: GameSessionScript = GameSessionScript.new()
	test.add_child_autofree(s)
	s.set_process(false)
	s.start(state, 1, 0)
	s.set_screen("game")
	return s


## The zone's collision body and a controller standing on (x, z) facing `facing`, both under one autofreed Node3D.
static func controller(
	test: GutTest, s: GameSessionScript, x: float, z: float, facing: String = "s"
) -> PlayerController:
	var root := Node3D.new()
	var grid := GameStateUtil.current_grid(s.state)
	var player: Dictionary = s.state["player"]
	var zone: String = player["location"]
	root.add_child(CollisionBuilder.build(grid, CollisionBuilder.extra_blocked_for(zone)))
	var c := PlayerController.new()
	c.session = s
	root.add_child(c)
	test.add_child_autofree(root)
	c.teleport(x, z, facing)
	return c


## A state on `zone` ("farm", "house" or "lowmere") with the field cleared of obstacles.
static func state_in(zone: String, energy: int = Balance.MAX_ENERGY) -> Dictionary:
	var state := TestStates.blank_farm(TestStates.fresh())
	var player: Dictionary = state["player"]
	player["location"] = zone
	player["energy"] = energy
	return state
