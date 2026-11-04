extends CoreTest
## IntentMapper, ported from apps/web/src/input/toCommands.ts minus `move` (the player body moves itself), plus
## InputActions and IntentReader against the live Input singleton.


func _intents() -> Dictionary:
	var out := {}
	IntentReader.clear(out)
	return out


func _farm() -> Dictionary:
	return TestStates.stand_at(TestStates.blank_farm(TestStates.fresh()), 10, 10, "e")


func _map(intents: Dictionary, state: Dictionary, gate: ActionGate = null, now_ms: int = 1000) -> Array:
	return IntentMapper.to_commands(intents, state, gate if gate != null else ActionGate.new(), now_ms)


func test_no_intents_no_commands() -> void:
	eq(_map(_intents(), _farm()), [])


func test_hotbar() -> void:
	var i := _intents()
	i["hotbar"] = 6
	eq(_map(i, _farm()), [{"type": "selectHotbar", "index": 6}])


func test_cycle() -> void:
	var i := _intents()
	i["cycle"] = -1
	eq(_map(i, _farm()), [{"type": "cycleHotbar", "dir": -1}])
	i["cycle"] = 1
	eq(_map(i, _farm()), [{"type": "cycleHotbar", "dir": 1}])


func test_primary_on_a_tool_slot_uses_the_tool() -> void:
	var i := _intents()
	i["primary"] = true
	eq(_map(i, Bag.select_hotbar(_farm(), 4)), [{"type": "useTool"}])


func test_primary_on_an_item_slot_uses_the_item() -> void:
	var i := _intents()
	i["primary"] = true
	eq(_map(i, Bag.select_hotbar(_farm(), 5)), [{"type": "useItem"}])


func test_primary_goes_through_the_gate() -> void:
	var i := _intents()
	i["primary"] = true
	var gate := ActionGate.new()
	eq(_map(i, _farm(), gate, 1000), [{"type": "useTool"}])
	eq(_map(i, _farm(), gate, 1050), [], "held within 350 ms")
	eq(_map(i, _farm(), gate, 1350), [{"type": "useTool"}])


func test_secondary_with_an_action() -> void:
	var i := _intents()
	i["secondary"] = true
	var bin := TestStates.stand_at(TestStates.fresh(), 7, 5, "n")
	eq(_map(i, bin), [{"type": "interact"}])


func test_secondary_without_an_action() -> void:
	var i := _intents()
	i["secondary"] = true
	eq(_map(i, TestStates.with_bag(_farm(), [])), [])


func test_intents_in_one_step_keep_the_order() -> void:
	var i := _intents()
	i["hotbar"] = 2
	i["cycle"] = 1
	i["primary"] = true
	i["secondary"] = true
	i["move"] = Vector2(1, 0)
	i["run"] = true
	var bin := TestStates.stand_at(TestStates.fresh(), 7, 5, "n")
	eq(_map(i, bin), [
		{"type": "selectHotbar", "index": 2}, {"type": "cycleHotbar", "dir": 1}, {"type": "useTool"},
		{"type": "interact"},
	], "hotbar, cycle, primary, secondary; no move command")


func test_map_into_reuses_the_array() -> void:
	var out: Array = [{"type": "stale"}]
	var i := _intents()
	i["cycle"] = 1
	IntentMapper.map_into(i, _farm(), ActionGate.new(), 0, out)
	eq(out, [{"type": "cycleHotbar", "dir": 1}])


func test_input_actions_register_the_bindings() -> void:
	InputActions.register()
	for action: String in InputActions.ACTIONS:
		assert_true(InputMap.has_action(action), action)
	assert_true(_has_key("primary", KEY_SPACE))
	assert_true(_has_key("secondary", KEY_F))
	assert_true(_has_key("move_up", KEY_W) and _has_key("move_up", KEY_UP))
	assert_true(_has_key("move_left", KEY_A) and _has_key("move_right", KEY_D) and _has_key("move_down", KEY_S))
	assert_true(_has_key("run", KEY_SHIFT))
	assert_true(_has_key("menu", KEY_ESCAPE) and _has_key("menu", KEY_TAB))
	assert_true(_has_key("confirm", KEY_ENTER) and _has_key("confirm", KEY_SPACE))
	assert_true(_has_key("cancel", KEY_ESCAPE) and _has_key("cancel", KEY_BACKSPACE))
	for n: int in range(1, 9):
		assert_true(_has_key("hotbar_%d" % n, KEY_0 + n), "hotbar_%d" % n)
	assert_true(_has_button("primary", JOY_BUTTON_A))
	assert_true(_has_button("secondary", JOY_BUTTON_X))
	assert_true(_has_button("run", JOY_BUTTON_LEFT_STICK))
	assert_true(_has_button("hotbar_next", JOY_BUTTON_DPAD_RIGHT))
	assert_true(_has_button("hotbar_prev", JOY_BUTTON_DPAD_LEFT))
	assert_true(_has_button("menu", JOY_BUTTON_START))
	assert_true(_has_key("bag", KEY_B), "B opens the bag")
	assert_true(_has_button("bag", JOY_BUTTON_Y), "gamepad Y opens the bag")
	assert_true(_has_button("cancel", JOY_BUTTON_B))
	assert_true(_has_wheel("hotbar_next", MOUSE_BUTTON_WHEEL_DOWN))
	assert_true(_has_wheel("hotbar_prev", MOUSE_BUTTON_WHEEL_UP))
	InputActions.register()
	eq(InputMap.action_get_events("primary").size(), 2, "registering twice does not duplicate events")


func test_reader_reads_live_input() -> void:
	InputActions.register()
	var reader := IntentReader.new()
	var into := {}
	Input.action_press("move_right")
	Input.action_press("run")
	Input.action_press("primary")
	reader.read(into)
	eq(into["move"], Vector2(1, 0))
	eq(into["run"], true)
	eq(into["primary"], true)
	eq(into["hotbar"], -1)
	eq(into["cycle"], 0)
	Input.action_release("move_right")
	Input.action_release("run")
	Input.action_release("primary")
	reader.read(into)
	eq(into["move"], Vector2.ZERO)
	eq(into["primary"], false)
	await wait_process_frames(1)


func test_reader_latches_edges_until_read() -> void:
	InputActions.register()
	# A press stays "just pressed" for the rest of its frame: start on a frame no other test pressed in.
	await wait_process_frames(1)
	var reader := IntentReader.new()
	var into := {}
	Input.action_press("hotbar_3")
	reader.poll()
	Input.action_release("hotbar_3")
	reader.read(into)
	eq(into["hotbar"], 2, "a press seen by poll survives until the next read")
	reader.read(into)
	eq(into["hotbar"], -1, "consumed once")
	await wait_process_frames(1)


func test_reader_latches_the_bag_press() -> void:
	InputActions.register()
	await wait_process_frames(1)
	var reader := IntentReader.new()
	var into := {}
	IntentReader.clear(into)
	eq(into["bag"], false)
	Input.action_press("bag")
	reader.poll()
	Input.action_release("bag")
	reader.read(into)
	eq(into["bag"], true)
	reader.read(into)
	eq(into["bag"], false, "consumed once")
	await wait_process_frames(1)


func _has_key(action: String, key: Key) -> bool:
	for e: InputEvent in InputMap.action_get_events(action):
		var k := e as InputEventKey
		if k != null and k.physical_keycode == key:
			return true
	return false


func _has_button(action: String, button: JoyButton) -> bool:
	for e: InputEvent in InputMap.action_get_events(action):
		var b := e as InputEventJoypadButton
		if b != null and b.button_index == button:
			return true
	return false


func _has_wheel(action: String, button: MouseButton) -> bool:
	for e: InputEvent in InputMap.action_get_events(action):
		var b := e as InputEventMouseButton
		if b != null and b.button_index == button:
			return true
	return false


func test_primary_is_not_a_tool_where_you_fight() -> void:
	var s := _farm()
	d(s["player"])["location"] = "woods"
	var i := _intents()
	i["primary"] = true
	eq(_map(i, s), [], "Space dodges in the Woods")


func test_combat_actions_are_bound() -> void:
	InputActions.register()
	assert_true(_has_wheel("attack", MOUSE_BUTTON_LEFT))
	assert_true(_has_button("attack", JOY_BUTTON_X))
	assert_true(_has_wheel("block", MOUSE_BUTTON_RIGHT))
	assert_true(_has_button("block", JOY_BUTTON_RIGHT_SHOULDER))
	assert_true(_has_key("dodge", KEY_SPACE))
	assert_true(_has_button("dodge", JOY_BUTTON_B))
	assert_true(_has_key("lock_on", KEY_Q))
	assert_true(_has_wheel("lock_on", MOUSE_BUTTON_MIDDLE))
