extends CoreTest
## GameSession autoload script: dispatch, pose, the fixed-step clock and the screens that freeze it. Instances are
## built directly (not the autoload singleton) with processing off, so the live frame loop never interferes.

const SCRIPT_PATH := "res://game/autoload/game_session.gd"
const GameSessionScript := preload("res://game/autoload/game_session.gd")

var _events: Array = []


func before_each() -> void:
	_events = []


func _make(state: Dictionary = TestStates.fresh()) -> GameSessionScript:
	var s: GameSessionScript = GameSessionScript.new()
	add_child_autofree(s)
	s.set_process(false)
	s.start(state, 1, 0)
	s.set_screen("game")
	s.events.connect(_on_events)
	return s


func _on_events(events: Array) -> void:
	_events.append(events)


func _minute(s: GameSessionScript) -> int:
	var cal: Dictionary = s.state["calendar"]
	var m: int = cal["minute"]
	return m


func test_start_sets_state_slot_and_play_time() -> void:
	var s: GameSessionScript = GameSessionScript.new()
	add_child_autofree(s)
	s.set_process(false)
	eq(s.screen, "title")
	var fresh := TestStates.fresh()
	s.start(fresh, 2, 1234)
	eq(JsonNorm.first_diff(s.state, fresh), "")
	eq(s.slot, 2)
	eq(s.play_time_ms, 1234)
	eq(s.screen, "title", "the clock stays frozen until the caller shows the game")
	assert_false(s.clock_running())


func test_dispatch_updates_state_and_emits_events() -> void:
	var s := _make()
	watch_signals(s)
	var events := s.dispatch({"type": "cycleHotbar", "dir": 1})
	eq(s.state["activeSlot"], 1)
	eq(events, [])
	eq(_events, [], "no events: no signal")
	assert_signal_emitted(s, "state_changed")
	var bin := TestStates.stand_at(TestStates.fresh(), 7, 5, "n")
	s.start(bin, 1, 0)
	var opened := s.dispatch({"type": "interact"})
	assert_true(opened.size() > 0)
	eq(_events, [opened], "one emission per dispatch")


func test_set_pose_changes_only_the_pose() -> void:
	var s := _make()
	var before := s.state.duplicate(true)
	var player_before: Dictionary = s.state["player"]
	watch_signals(s)
	s.set_pose(12.25, 9.75, "w")
	var player: Dictionary = s.state["player"]
	assert_same(player, player_before, "the pose is written in place, no state copy")
	eq(player["x"], 12.25)
	eq(player["z"], 9.75)
	eq(player["facing"], "w")
	var expected := before.duplicate(true)
	var p: Dictionary = expected["player"]
	p["x"] = 12.25
	p["z"] = 9.75
	p["facing"] = "w"
	eq(JsonNorm.first_diff(s.state, expected), "", "every other key is unchanged")
	assert_signal_not_emitted(s, "state_changed")
	eq(_events, [], "no events")


func test_set_pose_refuses_a_bad_facing() -> void:
	var s := _make()
	var before := s.state.duplicate(true)
	s.set_pose(1.0, 2.0, "up")
	assert_push_error("Unknown facing")
	eq(JsonNorm.first_diff(s.state, before), "")


func test_start_does_not_alias_the_callers_state() -> void:
	var mine := TestStates.fresh()
	var s := _make(mine)
	var mine_player: Dictionary = mine["player"]
	mine_player["x"] = 99.5
	mine["gold"] = 123456
	var player: Dictionary = s.state["player"]
	var x: float = player["x"]
	var gold: int = s.state["gold"]
	assert_ne(x, 99.5, "mutating the caller's dictionary after start does not reach the session")
	assert_ne(gold, 123456)
	s.set_pose(3.5, 4.5, "e")
	eq(mine_player["x"], 99.5, "set_pose does not change the caller's dictionary")
	eq(mine_player["facing"], "n")


func test_start_emits_session_started() -> void:
	var s := _make()
	watch_signals(s)
	s.start(TestStates.fresh(), 2, 0)
	assert_signal_emitted(s, "session_started")


func test_screens_and_clock_running() -> void:
	var s := _make()
	for screen: String in GameSessionScript.SCREENS:
		s.set_screen(screen)
		eq(s.clock_running(), screen == "game", screen)
	s.set_screen("game")
	s.set_screen("nonsense")
	assert_push_error("Unknown screen")
	eq(s.screen, "game", "an unknown screen is refused")


func test_step_ticks_the_calendar_while_game_screen() -> void:
	var s := _make()
	var start := _minute(s)
	for i: int in 13:
		s.step([], Clock.STEP_MS)
	eq(_minute(s), start, "13 steps: no minute yet")
	s.step([], Clock.STEP_MS)
	eq(_minute(s), start + 1, "one minute every 14 steps")
	eq(s.play_time_ms, 14 * Clock.STEP_MS)
	for i: int in 126:
		s.step([], Clock.STEP_MS)
	eq(_minute(s), start + 10, "10 minutes per 7 s")


func test_step_dispatches_commands_before_the_tick() -> void:
	var s := _make()
	s.step([{"type": "cycleHotbar", "dir": 1}, {"type": "cycleHotbar", "dir": 1}], Clock.STEP_MS)
	eq(s.state["activeSlot"], 2)


func test_step_does_nothing_while_paused() -> void:
	var s := _make()
	s.set_screen("paused")
	var before := s.state.duplicate(true)
	for i: int in 100:
		s.step([{"type": "cycleHotbar", "dir": 1}], Clock.STEP_MS)
	eq(JsonNorm.first_diff(s.state, before), "")
	eq(s.play_time_ms, 0)
	s.set_screen("game")
	s.step([], Clock.STEP_MS)
	eq(s.play_time_ms, Clock.STEP_MS, "the minute accumulator did not run while paused")
	eq(_minute(s), _minute_of(before))


func test_menu_blocks_commands() -> void:
	var playing := _make()
	var before := playing.state.duplicate(true)
	playing.step([{"type": "useTool"}], Clock.STEP_MS)
	assert_ne(JsonNorm.first_diff(playing.state, before), "", "control: useTool changes state in game")
	_events.clear()
	var s := _make()
	s.set_screen("modal")
	s.step([{"type": "useTool"}], Clock.STEP_MS)
	eq(JsonNorm.first_diff(s.state, before), "")
	eq(_events, [])


func test_tick_events_are_emitted_from_step() -> void:
	var s := _make(TestStates.at_calendar(TestStates.fresh(), 26 * 60 - 1))
	for i: int in 14:
		s.step([], Clock.STEP_MS)
	var types: Array = []
	for batch: Array in _events:
		for e: Dictionary in batch:
			types.append(e["type"])
	assert_true(types.has("dayStarted"), "passing out at 2am starts a new day: %s" % [types])


func _minute_of(state: Dictionary) -> int:
	var cal: Dictionary = state["calendar"]
	var m: int = cal["minute"]
	return m


func test_process_runs_whole_steps_and_maps_input() -> void:
	InputActions.register()
	var s := _make()
	# Input is not polled in the frame the screen changed, and a press is "just pressed" for the whole frame.
	await wait_process_frames(1)
	s._process(0.12)
	eq(s.play_time_ms, 2 * Clock.STEP_MS, "120 ms frame: two 50 ms steps, 20 ms carried")
	s._process(0.03)
	eq(s.play_time_ms, 3 * Clock.STEP_MS)
	Input.action_press("hotbar_6")
	s._process(0.05)
	Input.action_release("hotbar_6")
	await wait_process_frames(1)
	eq(s.state["activeSlot"], 5, "key 6 selects hotbar index 5")
	s._process(10.0)
	eq(s.play_time_ms, 4 * Clock.STEP_MS + 5 * Clock.STEP_MS, "a 10 s frame is clamped to 250 ms")


func test_process_emits_menu_and_bag_requests() -> void:
	InputActions.register()
	var s := _make()
	var seen: Array[String] = []
	s.menu_requested.connect(func() -> void: seen.append("menu"))
	s.bag_requested.connect(func() -> void: seen.append("bag"))
	await wait_process_frames(1)
	Input.action_press("bag")
	s._process(0.05)
	Input.action_release("bag")
	await wait_process_frames(1)
	eq(seen, ["bag"])
	Input.action_press("menu")
	s._process(0.05)
	Input.action_release("menu")
	await wait_process_frames(1)
	eq(seen, ["bag", "menu"])


func test_bag_and_menu_are_not_requested_outside_the_game_screen() -> void:
	InputActions.register()
	var s := _make()
	var seen: Array[String] = []
	s.menu_requested.connect(func() -> void: seen.append("menu"))
	s.bag_requested.connect(func() -> void: seen.append("bag"))
	for screen: String in ["modal", "paused", "title"]:
		s.set_screen(screen)
		await wait_process_frames(1)
		Input.action_press("bag")
		Input.action_press("menu")
		s._process(0.05)
		Input.action_release("bag")
		Input.action_release("menu")
		await wait_process_frames(1)
	eq(seen, [])
	# Control: the same press on the game screen is seen.
	s.set_screen("game")
	await wait_process_frames(1)
	Input.action_press("bag")
	s._process(0.05)
	Input.action_release("bag")
	await wait_process_frames(1)
	eq(seen, ["bag"])


func test_process_does_nothing_on_the_title_screen() -> void:
	var s := _make()
	s.set_screen("title")
	s._process(1.0)
	eq(s.play_time_ms, 0)
