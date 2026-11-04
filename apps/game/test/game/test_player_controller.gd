extends CoreTest
## PlayerController: walks, runs and tires at the Balance speeds, is stopped by fences, slides along walls, cannot
## walk onto a villager, writes its pose back into the session state and teleports clear of blocked tiles.
## Each test builds its own physics scene (PlayerWorld) and drives it by awaiting physics frames.

const TOLERANCE := 0.05
const GameSessionScript := preload("res://game/autoload/game_session.gd")


## Waits `n` physics ticks; each one runs the controller's _physics_process exactly once.
func _ticks(n: int) -> void:
	for i: int in n:
		await get_tree().physics_frame


func _tick_seconds(n: int) -> float:
	return float(n) / float(Engine.physics_ticks_per_second)


## Ground speed (m/s) measured over `n` ticks with the given intent.
func _measured_speed(c: PlayerController, intent: Vector2, run: bool, n: int = 30) -> float:
	await _ticks(1)
	c.set_intent(intent, run)
	await _ticks(1)
	var start := c.global_position
	await _ticks(n)
	return c.global_position.distance_to(start) / _tick_seconds(n)


func _player(s: GameSessionScript) -> Dictionary:
	return d(s.state["player"])


func test_walks_at_walk_speed() -> void:
	var s := PlayerWorld.session(self, PlayerWorld.state_in("farm"))
	var c := PlayerWorld.controller(self, s, 5.5, 21.5)
	var speed: float = await _measured_speed(c, Vector2.RIGHT, false)
	assert_almost_eq(speed, Balance.WALK_SPEED, Balance.WALK_SPEED * TOLERANCE)
	assert_almost_eq(c.global_position.y, 0.0, 1e-4, "no gravity: y stays 0")
	assert_almost_eq(c.global_position.z, 21.5, 1e-3, "straight east")


func test_diagonal_intent_is_not_faster() -> void:
	var s := PlayerWorld.session(self, PlayerWorld.state_in("farm"))
	var c := PlayerWorld.controller(self, s, 10.5, 18.5)
	var speed: float = await _measured_speed(c, Vector2(1.0, 1.0), false)
	assert_almost_eq(speed, Balance.WALK_SPEED, Balance.WALK_SPEED * TOLERANCE)


func test_run_speed() -> void:
	var s := PlayerWorld.session(self, PlayerWorld.state_in("farm"))
	var c := PlayerWorld.controller(self, s, 5.5, 21.5)
	var speed: float = await _measured_speed(c, Vector2.RIGHT, true)
	assert_almost_eq(speed, Balance.RUN_SPEED, Balance.RUN_SPEED * TOLERANCE)


func test_exhausted_is_slower() -> void:
	var s := PlayerWorld.session(self, PlayerWorld.state_in("farm", 0))
	var c := PlayerWorld.controller(self, s, 5.5, 21.5)
	var expected := Balance.WALK_SPEED * Balance.EXHAUSTED_SPEED_FACTOR
	var speed: float = await _measured_speed(c, Vector2.RIGHT, true)
	assert_almost_eq(speed, expected, expected * TOLERANCE, "run held while exhausted still walks slowly")


func test_blocked_by_fence() -> void:
	var s := PlayerWorld.session(self, PlayerWorld.state_in("farm"))
	# Row 23 is the farm's south fence (z 23..24); the player circle may reach z = 23 - radius.
	var c := PlayerWorld.controller(self, s, 10.5, 22.5)
	c.set_intent(Vector2.DOWN, true)
	await _ticks(60)
	assert_lt(c.global_position.z, 23.0 - Balance.PLAYER_RADIUS + 0.02, "stopped by the fence")
	assert_gt(c.global_position.z, 22.6, "walked up to it")
	assert_almost_eq(c.global_position.x, 10.5, 1e-3)


func test_walking_into_the_farm_gate_does_not_leave_the_map() -> void:
	var s := PlayerWorld.session(self, PlayerWorld.state_in("farm"))
	var gate := Grid.find_feature(farm_of(s.state), "farmGate")
	eq(gate, Vector2i(16, 23), "the gate sits in the south fence")
	# The gate is a feature tile (blocked): the player travels by interacting, never by walking through it.
	var c := PlayerWorld.controller(self, s, gate.x + 0.5, gate.y - 0.5)
	c.set_intent(Vector2.DOWN, true)
	await _ticks(90)
	assert_lt(c.global_position.z, float(gate.y) - Balance.PLAYER_RADIUS + 0.02, "stopped at the gate")
	assert_lt(c.global_position.z, 24.0, "still inside the 32 x 24 farm")
	eq(d(s.state["player"])["location"], "farm")


func test_slides_along_wall() -> void:
	var s := PlayerWorld.session(self, PlayerWorld.state_in("farm"))
	var c := PlayerWorld.controller(self, s, 10.5, 22.5)
	c.set_intent(Vector2(1.0, 1.0).normalized(), false)
	await _ticks(60)
	assert_lt(c.global_position.z, 23.0 - Balance.PLAYER_RADIUS + 0.02, "the fence holds")
	assert_gt(c.global_position.x - 10.5, 1.5, "the east part of the intent slides along the fence")


func test_villager_tiles_block_the_player() -> void:
	var s := PlayerWorld.session(self, PlayerWorld.state_in("lowmere"))
	# Hilda stands on (4, 5): tile z 5..6. Without her box the player would walk on to the forge at z = 5.
	var c := PlayerWorld.controller(self, s, 4.5, 6.5)
	c.set_intent(Vector2.UP, false)
	await _ticks(60)
	assert_gt(c.global_position.z, 6.0 + Balance.PLAYER_RADIUS - 0.02, "stopped in front of Hilda")
	assert_lt(c.global_position.z, 6.4, "walked up to her")


func test_pose_written_back_to_state() -> void:
	var s := PlayerWorld.session(self, PlayerWorld.state_in("farm"))
	var c := PlayerWorld.controller(self, s, 10.5, 20.5, "s")
	c.set_intent(Vector2.UP, false)
	await _ticks(10)
	var p := _player(s)
	eq(p["facing"], "n")
	var px: float = p["x"]
	var pz: float = p["z"]
	assert_almost_eq(px, c.global_position.x, 1e-5)
	assert_almost_eq(pz, c.global_position.z, 1e-5)
	assert_lt(pz, 20.3, "moved north")
	c.set_intent(Vector2(-1.0, 0.2), false)
	await _ticks(2)
	eq(_player(s)["facing"], "w", "the dominant axis decides")
	c.set_intent(Vector2.ZERO, false)
	await _ticks(3)
	eq(_player(s)["facing"], "w", "standing still keeps the facing")
	assert_almost_eq(c.ground_speed, 0.0, 1e-5)


func test_does_not_move_while_the_clock_is_frozen() -> void:
	var s := PlayerWorld.session(self, PlayerWorld.state_in("farm"))
	var c := PlayerWorld.controller(self, s, 10.5, 20.5)
	s.set_screen("paused")
	c.set_intent(Vector2.RIGHT, true)
	await _ticks(10)
	assert_almost_eq(c.global_position.x, 10.5, 1e-5)
	s.set_screen("game")
	await _ticks(10)
	assert_gt(c.global_position.x, 10.6)


func test_teleport_pushes_out_of_blocked_tile() -> void:
	var s := PlayerWorld.session(self, PlayerWorld.state_in("farm"))
	var c := PlayerWorld.controller(self, s, 10.5, 20.5)
	# (0, 10) is the west fence; the nearest free tile is (1, 10).
	c.teleport(0.5, 10.5, "e")
	assert_almost_eq(c.global_position.x, 1.5, 1e-5)
	assert_almost_eq(c.global_position.z, 10.5, 1e-5)
	assert_almost_eq(c.global_position.y, 0.0, 1e-5)
	var p := _player(s)
	eq(p["facing"], "e")
	var px: float = p["x"]
	var pz: float = p["z"]
	assert_almost_eq(px, 1.5, 1e-5)
	assert_almost_eq(pz, 10.5, 1e-5)
	assert_almost_eq(c.ground_speed, 0.0, 1e-5)


func test_teleport_pushes_out_of_a_villager_tile() -> void:
	var s := PlayerWorld.session(self, PlayerWorld.state_in("lowmere"))
	var c := PlayerWorld.controller(self, s, 8.5, 6.5)
	# Hilda stands on (4, 5); the grid alone calls that tile free.
	c.teleport(4.5, 5.5, "n")
	var tile := Vector2i(floori(c.global_position.x), floori(c.global_position.z))
	assert_ne(tile, Vector2i(4, 5), "not on Hilda")
	assert_false(Grid.is_blocked(Grid.tile_at(Zones.grid("lowmere"), tile.x, tile.y)), "on a free tile")
	assert_true(Villagers.at(tile.x, tile.y).is_empty(), "not on any villager")
	var p := _player(s)
	var px: float = p["x"]
	var pz: float = p["z"]
	assert_almost_eq(px, c.global_position.x, 1e-5)
	assert_almost_eq(pz, c.global_position.z, 1e-5)


func test_teleport_without_a_session_is_loud() -> void:
	var c := PlayerController.new()
	autofree(c)
	c.teleport(1.5, 1.5, "s")
	assert_push_error("no session")
	assert_almost_eq(c.position.x, 0.0, 1e-5, "nothing moved")


func test_pose_survives_save_load() -> void:
	var base := "user://test-saves-%d" % randi()
	var s := PlayerWorld.session(self, PlayerWorld.state_in("farm"))
	var c := PlayerWorld.controller(self, s, 10.5, 20.5)
	c.set_intent(Vector2(1.0, -0.4), false)
	await _ticks(20)
	c.set_intent(Vector2.ZERO, false)
	await _ticks(1)
	var saved := c.global_position
	var slots := SaveSlots.new(base)
	eq(slots.save(1, SaveMigrate.make_save_file(s.state, 0, "2026-11-03T00:00:00Z")), OK)
	var loaded := slots.load_slot(1)
	eq(loaded["kind"], "ok")
	var file: Dictionary = loaded["file"]
	var s2 := PlayerWorld.session(self, d(file["state"]))
	# A controller entering the tree takes its pose from the session state (as after a load).
	var root := Node3D.new()
	var c2 := PlayerController.new()
	c2.session = s2
	root.add_child(c2)
	add_child_autofree(root)
	assert_almost_eq(c2.global_position.x, saved.x, 1e-4)
	assert_almost_eq(c2.global_position.z, saved.z, 1e-4)
	eq(_player(s2)["facing"], "e")
	for name: String in DirAccess.get_files_at(base):
		DirAccess.remove_absolute(base.path_join(name))
	DirAccess.remove_absolute(base)
