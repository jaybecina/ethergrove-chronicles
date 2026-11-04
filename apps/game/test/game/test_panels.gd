extends CoreTest
## The modal panels under a PanelHost: bag, shipping bin, merchant cart, sleep confirm, morning report, dialogue box
## and the pause menu. Every panel is driven through its Buttons (or `ui_*` input) and must change the game only
## through GameSession.dispatch. Strings are pinned from apps/web/src/ui/screens (BagPanel, ShippingBin,
## MerchantCart, SleepConfirm, MorningReport, Pause, Settings, Panel), lessons/lessonText.ts and save/fileIO.ts.
## Settings, saves and exports live under a fresh `user://test-panels-<random>`, removed in after_each.

const GameSessionScript := preload("res://game/autoload/game_session.gd")
const SettingsScript := preload("res://game/autoload/settings.gd")
const SaveServiceScript := preload("res://game/autoload/save_service.gd")

const SAVE_FAILED := "Couldn't save. Use Export save to keep your progress."

var _base: String = ""
var _session: GameSessionScript
var _settings: SettingsScript
var _save: SaveServiceScript
var _quits: int = 0


func before_each() -> void:
	_base = "user://test-panels-%d" % randi()
	_quits = 0
	DirAccess.make_dir_recursive_absolute(_base)


func after_each() -> void:
	_release_inputs()
	_remove_tree(_base)


func _remove_tree(path: String) -> void:
	if not DirAccess.dir_exists_absolute(path):
		return
	for dir: String in DirAccess.get_directories_at(path):
		_remove_tree(path.path_join(dir))
	for name: String in DirAccess.get_files_at(path):
		DirAccess.remove_absolute(path.path_join(name))
	DirAccess.remove_absolute(path)


## A PanelHost wired to its own GameSession (started on `state`, slot `slot`, screen "game"), Settings and
## SaveService, all children of this test.
func _host(state: Dictionary = TestStates.fresh(), slot: int = 1, renderer: String = "Apple M4") -> PanelHost:
	_session = GameSessionScript.new()
	add_child_autofree(_session)
	_session.set_process(false)
	_session.start(state, slot, 0)
	_session.set_screen("game")
	_settings = SettingsScript.new()
	_settings.set("_path", _base.path_join("settings.cfg"))
	_settings.renderer_override = renderer
	add_child_autofree(_settings)
	_save = SaveServiceScript.new()
	_save.session = _session
	_save.slots = SaveSlots.new(_base.path_join("saves"))
	add_child_autofree(_save)
	var host := PanelHost.new()
	host.session = _session
	host.settings = _settings
	host.save_service = _save
	host.export_dir = _base.path_join("exports")
	add_child_autofree(host)
	host.quit_to_title_requested.connect(_on_quit)
	return host


func _on_quit() -> void:
	_quits += 1


func _send(event: InputEvent) -> void:
	Input.parse_input_event(event)
	Input.flush_buffered_events()


func _action(action: String, pressed: bool = true) -> void:
	var e := InputEventAction.new()
	e.action = action
	e.pressed = pressed
	_send(e)


## Presses and releases an action (a Button fires on the release).
func _tap(action: String) -> void:
	_action(action, true)
	_action(action, false)


func _key(key: Key) -> void:
	var down := InputEventKey.new()
	down.physical_keycode = key
	down.keycode = key
	down.pressed = true
	_send(down)
	var up := InputEventKey.new()
	up.physical_keycode = key
	up.keycode = key
	up.pressed = false
	_send(up)


func _release_inputs() -> void:
	for action: String in ["ui_accept", "ui_cancel", "ui_up", "ui_down", "ui_left", "ui_right", "cancel", "menu"]:
		if InputMap.has_action(action):
			Input.action_release(action)


func _press(host: PanelHost, text: String) -> void:
	var b := host.current_panel().button(text)
	assert_not_null(b, "button \"%s\" in %s: %s" % [text, host.current(), host.current_panel().texts()])
	if b != null:
		assert_false(b.disabled, "\"%s\" is enabled" % text)
		b.pressed.emit()


func _focused(host: PanelHost) -> String:
	var owner := host.get_viewport().gui_get_focus_owner()
	var b := owner as Button
	if b == null:
		return "<none>"
	return b.text


func _has(host: PanelHost, text: String) -> void:
	var texts := host.current_panel().texts()
	assert_true(texts.has(text), "\"%s\" shown in %s: %s" % [text, host.current(), texts])


func _lacks(host: PanelHost, text: String) -> void:
	var texts := host.current_panel().texts()
	assert_false(texts.has(text), "\"%s\" not shown in %s: %s" % [text, host.current(), texts])


## The player in the house, where `sleep` is allowed.
func _in_house(state: Dictionary = TestStates.fresh()) -> Dictionary:
	var out := state.duplicate(true)
	d(out["player"])["location"] = "house"
	return out


func _bag(state: Dictionary) -> Array:
	return a(state["bag"])


func _bin(state: Dictionary) -> Array:
	return a(state["bin"])


func _count_nodes(node: Node) -> int:
	var n := 1
	for child: Node in node.get_children():
		n += _count_nodes(child)
	return n


# --- PanelHost ---------------------------------------------------------------------------------------------------


func test_open_sets_modal_and_close_restores_game() -> void:
	var host := _host()
	assert_false(host.is_open())
	eq(host.current(), "")
	assert_true(host.open("bin"))
	assert_true(host.is_open())
	eq(host.current(), "bin")
	eq(_session.screen, "modal")
	assert_true(host.current_panel().visible)
	host.close()
	assert_false(host.is_open())
	eq(host.current(), "")
	eq(_session.screen, "game")
	assert_false(host.panel_of("bin").visible)


func test_open_is_refused_on_the_title_screen_and_for_unknown_ids() -> void:
	var host := _host()
	_session.set_screen("title")
	assert_false(host.open("bag"))
	assert_false(host.is_open())
	eq(_session.screen, "title")
	_session.set_screen("game")
	assert_false(host.open("nope"))
	assert_false(host.is_open())


func test_opening_another_panel_replaces_the_open_one() -> void:
	var host := _host()
	host.open("bin")
	host.open("cart")
	eq(host.current(), "cart")
	assert_false(host.panel_of("bin").visible)
	assert_true(host.panel_of("cart").visible)
	host.open("pause")
	eq(_session.screen, "paused")
	host.open("bag")
	eq(_session.screen, "modal")


func test_cancel_closes() -> void:
	var host := _host()
	host.open("bin")
	_tap("cancel")
	assert_false(host.is_open(), "the cancel action closes")
	eq(_session.screen, "game")
	host.open("cart")
	_tap("ui_cancel")
	assert_false(host.is_open(), "ui_cancel closes")
	host.open("sleep")
	_key(KEY_ESCAPE)
	assert_false(host.is_open(), "Esc closes")
	eq(_session.screen, "game")


func test_pause_sets_paused() -> void:
	var host := _host()
	_session.menu_requested.emit()
	eq(host.current(), "pause")
	eq(_session.screen, "paused")
	_session.menu_requested.emit()
	assert_false(host.is_open(), "the menu input toggles the pause menu")
	eq(_session.screen, "game")
	host.open("pause")
	_key(KEY_TAB)
	assert_false(host.is_open(), "Tab (the menu key) closes it too")


func test_bag_requested_toggles_the_bag() -> void:
	var host := _host()
	_session.bag_requested.emit()
	eq(host.current(), "bag")
	eq(_session.screen, "modal")
	_session.bag_requested.emit()
	assert_false(host.is_open())


func test_open_ui_events_open_their_panels() -> void:
	var host := _host()
	for ui: String in ["bin", "cart", "sleep"]:
		_session.events.emit([{"type": "openUi", "ui": ui}])
		eq(host.current(), ui)
		host.close()


func test_panel_open_blocks_commands() -> void:
	var host := _host()
	var before := _session.state.duplicate(true)
	host.open("bin")
	_session.step([{"type": "useTool"}, {"type": "cycleHotbar", "dir": 1}], Clock.STEP_MS)
	eq(JsonNorm.first_diff(_session.state, before), "", "no command and no tick while a panel is open")
	host.close()
	_session.step([{"type": "cycleHotbar", "dir": 1}], Clock.STEP_MS)
	eq(_session.state["activeSlot"], 1, "control: commands run again once it is closed")


func test_open_and_refresh_do_not_leak_nodes() -> void:
	var state := TestStates.with_bag(TestStates.at_calendar(TestStates.fresh(), 600), [{"id": "turnip", "qty": 5}])
	var host := _host(state)
	for id: String in PanelHost.PANEL_IDS:
		host.open(id)
	host.close()
	var nodes := _count_nodes(host)
	for i: int in 5:
		for id: String in PanelHost.PANEL_IDS:
			host.open(id)
			_session.state_changed.emit()
		host.close()
	eq(_count_nodes(host), nodes)


func test_ui_scale_changes_the_panel_theme() -> void:
	var host := _host()
	eq(host.root.theme.default_font_size, 18)
	_settings.set_ui_scale(1.5)
	eq(host.root.theme.default_font_size, 27)


func test_lessons_complete_shows_toasts() -> void:
	var host := _host()
	_session.events.emit([{"type": "lessonsComplete", "gift": 100}])
	eq(host.toasts.count(), 2)
	eq(host.toasts.text_at(0), "The rest is yours")
	eq(host.toasts.text_at(1), "Tucked in the last page: 100 gold.")
	_session.events.emit([{"type": "lessonsComplete", "gift": 0}])
	eq(host.toasts.text_at(host.toasts.count() - 1), "The rest is yours", "no gift line for a skipped gift")


# --- Bag ---------------------------------------------------------------------------------------------------------


func test_bag_move_dispatches_move_bag_item() -> void:
	var state := TestStates.with_bag(TestStates.fresh(), [{"id": "turnip", "qty": 5}, null, {"id": "stone", "qty": 3}])
	state["quickSlots"] = [null, null, null]
	var host := _host(state)
	host.open("bag")
	var bag := host.current_panel() as BagPanel
	eq(bag.cells.size(), Balance.BAG_SLOTS)
	eq(bag.cells[0].text, "Turnip × 5")
	eq(bag.cells[1].text, "")
	eq(bag.cells[1].accessibility_name, "Empty bag slot 2")
	bag.cells[1].pressed.emit()
	eq(bag.picked, -1, "an empty cell cannot be picked")
	bag.cells[0].pressed.emit()
	eq(bag.picked, 0)
	assert_true(bag.cells[0].button_pressed, "the picked cell shows pressed")
	_has(host, "Turnip")
	bag.cells[2].pressed.emit()
	eq(bag.picked, -1)
	eq(_bag(_session.state)[0], {"id": "stone", "qty": 3})
	eq(_bag(_session.state)[2], {"id": "turnip", "qty": 5})
	eq(bag.cells[2].text, "Turnip × 5", "the grid follows the new state")
	# Pick, then pin to key 7 (quick slot 1).
	bag.cells[2].pressed.emit()
	_press(host, "Pin to 7")
	eq(a(_session.state["quickSlots"])[1], 2)
	eq(bag.picked, -1)
	eq(bag.cells[2].text, "Turnip × 5 (7)")
	eq(bag.cells[2].accessibility_name, "Turnip, 5, key 7")
	# Picking the same cell twice drops the pick without a command.
	var before := _session.state.duplicate(true)
	bag.cells[0].pressed.emit()
	bag.cells[0].pressed.emit()
	eq(JsonNorm.first_diff(_session.state, before), "")


# --- Shipping bin ------------------------------------------------------------------------------------------------


func test_bin_ship_and_unship() -> void:
	var state := TestStates.with_bag(TestStates.fresh(), [{"id": "seed:turnip", "qty": 4}, {"id": "turnip", "qty": 5}])
	var host := _host(state)
	host.open("bin")
	_has(host, "Shipping bin")
	_has(host, "Turnip × 5")
	_has(host, "35 gold each")
	_lacks(host, "Turnip Seeds × 4")
	_has(host, "The bin is empty.")
	_has(host, "Sells tonight for 0 gold")
	_press(host, "Ship one Turnip")
	eq(_bin(_session.state), [{"id": "turnip", "qty": 1}])
	eq(_bag(_session.state)[1], {"id": "turnip", "qty": 4})
	_has(host, "Turnip × 4")
	_has(host, "Turnip × 1")
	_has(host, "Sells tonight for 35 gold")
	_lacks(host, "The bin is empty.")
	_press(host, "Ship all Turnip")
	eq(_bin(_session.state), [{"id": "turnip", "qty": 5}])
	eq(_bag(_session.state)[1], null)
	_has(host, "Nothing to sell yet. Harvest crops or clear the field.")
	_has(host, "Sells tonight for 175 gold")
	_press(host, "Take back Turnip")
	eq(_bin(_session.state), [])
	eq(Bag.count_of(_bag(_session.state), "turnip"), 5)
	_has(host, "The bin is empty.")


func test_bin_total_uses_thousands_separators() -> void:
	var state := TestStates.fresh()
	state["bin"] = [{"id": "pumpkin", "qty": 50}]
	var host := _host(state)
	host.open("bin")
	_has(host, "Sells tonight for 16,000 gold")


# --- Merchant cart -----------------------------------------------------------------------------------------------


func test_cart_buys_when_open_and_shows_reason_when_closed() -> void:
	var open_state := TestStates.with_bag(TestStates.at_calendar(TestStates.fresh(), 600), [])
	var host := _host(open_state)
	host.open("cart")
	_has(host, "Sol's cart")
	_has(host, "Fresh seeds from over the hills. What are you planting today?")
	_has(host, "Turnip Seeds")
	_has(host, "20 gold each, ripe in 4 days")
	_has(host, "100 gold each, ripe in 8 days, regrows every 4")
	_has(host, "You have 500 gold.")
	_has(host, "Buy for 20")
	_press(host, "One more Turnip Seeds")
	_press(host, "One more Turnip Seeds")
	_has(host, "Buy for 60")
	_press(host, "One fewer Turnip Seeds")
	_press(host, "One more Turnip Seeds")
	var buy := host.current_panel().button("Buy 3 Turnip Seeds for 60 gold")
	assert_not_null(buy)
	buy.pressed.emit()
	eq(Bag.count_of(_bag(_session.state), "seed:turnip"), 3)
	eq(_session.state["gold"], 440)
	_has(host, "You have 440 gold.")
	assert_not_null(host.current_panel().button("Buy 1 Turnip Seeds for 20 gold"), "the quantity resets after buying")
	# The stepper stays within 1..99.
	_press(host, "One fewer Turnip Seeds")
	assert_not_null(host.current_panel().button("Buy 1 Turnip Seeds for 20 gold"))
	host.close()

	for closed: Dictionary in [
		TestStates.at_calendar(TestStates.fresh(), 8 * 60),
		TestStates.at_calendar(TestStates.fresh(), 600, "winter"),
		TestStates.at_calendar(TestStates.fresh(), 600, "spring", "storm"),
	]:
		_session.start(closed, 1, 0)
		host.open("cart")
		_has(host, "I'm packing up for now. Come back between 9 AM and 5 PM.")
		_lacks(host, "Turnip Seeds")
		assert_null(host.current_panel().button("Buy for 20"))
		_has(host, "You have 500 gold.")
		host.close()


func test_cart_disables_buy_with_the_web_reasons() -> void:
	var poor := TestStates.at_calendar(TestStates.fresh(), 600)
	poor["gold"] = 30
	var host := _host(poor)
	host.open("cart")
	var cart := host.current_panel()
	var turnip := cart.button("Buy 1 Turnip Seeds for 20 gold")
	var potato := cart.button("Buy 1 Potato Seeds for 50 gold")
	assert_false(turnip.disabled)
	assert_true(potato.disabled, "50 > 30 gold")
	_has(host, "Not enough gold")
	_press(host, "One more Turnip Seeds")
	_press(host, "One more Turnip Seeds")
	assert_true(cart.button("Buy 3 Turnip Seeds for 60 gold").disabled)
	host.close()

	var full := TestStates.at_calendar(TestStates.fresh(), 600)
	full["bag"] = TestStates.full_bag()
	_session.start(full, 1, 0)
	host.open("cart")
	assert_true(host.current_panel().button("Buy 1 Turnip Seeds for 20 gold").disabled)
	_has(host, "Your bag is full")
	_lacks(host, "Not enough gold")


# --- Sleep and the morning report --------------------------------------------------------------------------------


func test_sleep_confirm_dispatches_sleep_and_opens_morning_report() -> void:
	var state := _in_house()
	state["bin"] = [{"id": "turnip", "qty": 2}, {"id": "wood", "qty": 3}]
	var host := _host(state)
	host.open("sleep")
	_has(host, "Go to bed?")
	_has(host, "Sleeping ends the day, sells what's in the bin, and saves your farm.")
	_press(host, "Sleep and save")
	eq(d(_session.state["calendar"])["day"], 2, "slept into day 2")
	eq(host.current(), "morning")
	eq(_session.screen, "modal")
	_has(host, "Yesterday's sales")
	_has(host, "Turnip × 2")
	_has(host, "70")
	_has(host, "Wood × 3")
	_has(host, "6")
	_has(host, "Total")
	_has(host, "76 gold")
	assert_true(FileAccess.file_exists(_base.path_join("saves/slot-1.json")), "sleeping saves the farm")
	_press(host, "Start the day")
	assert_false(host.is_open())
	eq(_session.screen, "game")


func test_sleep_with_an_empty_bin_shows_no_report() -> void:
	var host := _host(_in_house())
	host.open("sleep")
	_press(host, "Sleep and save")
	assert_false(host.is_open(), "no sales, no report (uiBridge.ts)")
	eq(_session.screen, "game")


func test_not_yet_closes_without_sleeping() -> void:
	var host := _host()
	host.open("sleep")
	_press(host, "Not yet")
	assert_false(host.is_open())
	eq(d(_session.state["calendar"])["day"], 1)


# --- Dialogue ----------------------------------------------------------------------------------------------------


func test_dialogue_shows_name_and_text_then_closes_on_confirm() -> void:
	var host := _host()
	var line := "Welcome to Lowmere. Stay out of the woods after dark. Please."
	_session.events.emit([{"type": "talked", "villager": "bram", "name": "Mayor Bram", "text": line}])
	eq(host.current(), "dialogue")
	eq(_session.screen, "modal")
	_has(host, "Mayor Bram")
	_has(host, line)
	eq(_focused(host), "Close")
	_tap("ui_accept")
	assert_false(host.is_open(), "confirm closes the dialogue")
	eq(_session.screen, "game")


# --- Pause menu --------------------------------------------------------------------------------------------------


func test_pause_graphics_radio_updates_settings() -> void:
	var host := _host(TestStates.fresh(), 1, "Intel(R) UHD Graphics 620")
	eq(_settings.tier(), "low", "control: a weak GPU resolves Automatic to Low")
	host.open("pause")
	var pause := host.current_panel() as PauseMenu
	assert_true(pause.quality_radio("auto").button_pressed, "the radio shows the choice, not the resolved tier")
	assert_false(pause.quality_radio("low").button_pressed)
	pause.quality_radio("high").pressed.emit()
	eq(_settings.choice, "high")
	assert_true(pause.quality_radio("high").button_pressed)
	assert_false(pause.quality_radio("auto").button_pressed)
	pause.quality_radio("auto").pressed.emit()
	eq(_settings.choice, "auto")
	pause.scale_radio(1.5).pressed.emit()
	assert_true(is_equal_approx(_settings.ui_scale, 1.5))
	assert_true(pause.scale_radio(1.5).button_pressed)
	assert_false(pause.scale_radio(1.0).button_pressed)
	eq(host.root.theme.default_font_size, 27)


func test_pause_skip_lessons() -> void:
	var host := _host(TestStates.lesson_at(TestStates.fresh(), "till"))
	host.open("pause")
	_has(host, "Skip lessons")
	_lacks(host, "Skip Grandpa's lessons?")
	_press(host, "Skip lessons")
	_has(host, "Skip Grandpa's lessons?")
	_has(host, "You can start them again from this Journal any time.")
	eq(_focused(host), "Keep learning", "the confirm focuses the safe choice")
	_press(host, "Keep learning")
	_lacks(host, "Skip Grandpa's lessons?")
	eq(d(_session.state["tutorial"])["lesson"], "till")
	_press(host, "Skip lessons")
	_press(host, "Skip")
	eq(d(_session.state["tutorial"])["lesson"], "off")
	_lacks(host, "Skip Grandpa's lessons?")
	_has(host, "Start lessons again")
	eq(_focused(host), "Start lessons again", "focus returns to the lessons button")
	_press(host, "Start lessons again")
	eq(d(_session.state["tutorial"])["lesson"], "walkToField")
	assert_false(host.is_open(), "restarting closes the menu (JournalPanel.tsx)")


func test_pause_resume_and_bag() -> void:
	var host := _host()
	host.open("pause")
	_has(host, "Elm")
	_press(host, "Resume")
	assert_false(host.is_open())
	eq(_session.screen, "game")
	host.open("pause")
	_press(host, "Bag")
	eq(host.current(), "bag")
	eq(_session.screen, "modal")


func test_pause_title_is_the_farm_name() -> void:
	var state := TestStates.fresh()
	state["farmName"] = "Moss Hollow"
	var host := _host(state)
	host.open("pause")
	_has(host, "Moss Hollow")
	_lacks(host, "Paused")
	host.close()
	var unnamed := TestStates.fresh()
	unnamed["farmName"] = ""
	_session.start(unnamed, 1, 0)
	host.open("pause")
	_has(host, "Paused")


func test_pause_save_now_toasts_the_result() -> void:
	var host := _host()
	host.open("pause")
	_press(host, "Save now")
	assert_true(FileAccess.file_exists(_base.path_join("saves/slot-1.json")))
	eq(host.toasts.text_at(host.toasts.count() - 1), "Game saved.")
	eq(host.toasts.kind_at(host.toasts.count() - 1), "info")
	host.close()
	var no_slot := _host(TestStates.fresh(), 0)
	no_slot.open("pause")
	_press(no_slot, "Save now")
	eq(no_slot.toasts.text_at(no_slot.toasts.count() - 1), SAVE_FAILED)
	eq(no_slot.toasts.kind_at(no_slot.toasts.count() - 1), "warn")


func test_pause_export_save_writes_the_web_file_and_toasts_the_path() -> void:
	var state := TestStates.fresh()
	state["farmName"] = "  Moss & Fern Farm!! "
	var host := _host(state)
	host.open("pause")
	_press(host, "Export save")
	var path := _base.path_join("exports/ethergrove-moss-fern-farm-y1-spring1.ethergrove.json")
	assert_true(FileAccess.file_exists(path), path)
	var text := FileAccess.get_file_as_string(path)
	var parsed: Variant = JSON.parse_string(text)
	assert_true(parsed is Dictionary)
	var file: Dictionary = parsed
	eq(file["version"], float(SaveMigrate.CURRENT_SAVE_VERSION))
	eq(d(file["summary"])["farmName"], "  Moss & Fern Farm!! ")
	var migrated := SaveMigrate.migrate(parsed)
	var migrated_ok: bool = migrated["ok"]
	assert_true(migrated_ok, "the exported file migrates back: %s" % [migrated])
	eq(host.toasts.text_at(host.toasts.count() - 1), "Save exported to %s" % ProjectSettings.globalize_path(path))


func test_export_file_name_follows_file_io_ts() -> void:
	var file := SaveMigrate.make_save_file(TestStates.fresh(), 0, "2026-11-04T00:00:00Z")
	eq(PauseMenu.export_file_name(file), "ethergrove-elm-y1-spring1.ethergrove.json")
	d(file["summary"])["farmName"] = "---"
	eq(PauseMenu.export_file_name(file), "ethergrove-farm-y1-spring1.ethergrove.json")
	d(file["summary"])["farmName"] = "Ünïcode Fields 2"
	var cal: Dictionary = d(file["summary"])["calendar"]
	cal["year"] = 3
	cal["season"] = "fall"
	cal["day"] = 28
	eq(PauseMenu.export_file_name(file), "ethergrove-n-code-fields-2-y3-fall28.ethergrove.json")


func test_pause_save_and_quit() -> void:
	var host := _host()
	host.open("pause")
	_press(host, "Save and quit")
	assert_true(FileAccess.file_exists(_base.path_join("saves/slot-1.json")))
	assert_false(host.is_open())
	eq(_session.screen, "title")
	eq(_quits, 1)


## Makes every save fail: a file where the saves folder should be.
func _block_saves() -> void:
	var blocker := FileAccess.open(_base.path_join("saves"), FileAccess.WRITE)
	blocker.store_string("not a folder")
	blocker.close()


func test_pause_save_and_quit_stays_when_the_save_fails() -> void:
	var host := _host()
	_block_saves()
	var failures: Array[String] = []
	_save.save_failed.connect(func(message: String) -> void: failures.append(message))
	host.open("pause")
	var toasts_before := host.toasts.count()
	_press(host, "Save and quit")
	assert_true(host.is_open(), "the menu stays open")
	eq(_session.screen, "paused")
	eq(_quits, 0)
	eq(failures, [SAVE_FAILED], "SaveService reports the failure")
	eq(host.toasts.count(), toasts_before, "the menu adds no toast of its own (the HUD shows save_failed)")


func test_pause_save_now_failure_adds_no_toast_of_its_own() -> void:
	var host := _host()
	_block_saves()
	var failures: Array[String] = []
	_save.save_failed.connect(func(message: String) -> void: failures.append(message))
	host.open("pause")
	var toasts_before := host.toasts.count()
	_press(host, "Save now")
	eq(failures, [SAVE_FAILED], "control: the save failed and save_failed fired")
	eq(host.toasts.count(), toasts_before, "no second toast for the same failure")
	assert_true(host.is_open())


func test_pause_save_and_quit_without_a_slot_quits() -> void:
	var host := _host(TestStates.fresh(), 0)
	host.open("pause")
	_press(host, "Save and quit")
	eq(_session.screen, "title")
	eq(_quits, 1)


func test_cancel_press_is_consumed() -> void:
	var host := _host()
	for action: String in ["cancel", "ui_cancel", "menu"]:
		host.open("bin")
		var e := InputEventAction.new()
		e.action = action
		e.pressed = true
		host.get_viewport().push_input(e)
		assert_false(host.is_open(), action)
		assert_true(host.get_viewport().is_input_handled(), "%s is marked handled" % action)
		var up := InputEventAction.new()
		up.action = action
		up.pressed = false
		host.get_viewport().push_input(up)


func test_injected_toasts_are_used_and_not_ticked() -> void:
	var injected := Toasts.new()
	add_child_autofree(injected)
	_session = GameSessionScript.new()
	add_child_autofree(_session)
	_session.set_process(false)
	_session.start(TestStates.fresh(), 1, 0)
	_session.set_screen("game")
	var host := PanelHost.new()
	host.session = _session
	host.toasts = injected
	add_child_autofree(host)
	assert_same(host.toasts, injected)
	eq(host.find_children("*", "Toasts", true, false).size(), 0, "no second toast stack")
	host.toast("Hello")
	eq(injected.text_at(0), "Hello")
	# Already expired: only its owner (the HUD) may tick it away.
	injected.push("Old", "info", 0, 1)
	host._process(0.016)
	eq(injected.count(), 2, "the host does not tick a stack it does not own")


# --- Focus and keyboard ------------------------------------------------------------------------------------------


func test_panels_are_keyboard_navigable() -> void:
	var host := _host(_in_house())
	host.open("sleep")
	eq(_focused(host), "Not yet", "the first control has focus")
	_tap("ui_down")
	eq(_focused(host), "Sleep and save")
	_tap("ui_down")
	eq(_focused(host), "Not yet", "focus wraps")
	_tap("ui_up")
	eq(_focused(host), "Sleep and save", "and wraps backwards")
	_tap("ui_left")
	eq(_focused(host), "Not yet")
	_tap("ui_right")
	_tap("ui_accept")
	eq(d(_session.state["calendar"])["day"], 2, "ui_accept presses the focused button")
	host.open("pause")
	eq(_focused(host), "Resume")
	_tap("ui_accept")
	assert_false(host.is_open())


func test_every_button_takes_focus() -> void:
	var state := TestStates.with_bag(TestStates.at_calendar(TestStates.fresh(), 600), [{"id": "turnip", "qty": 5}])
	state["bin"] = [{"id": "wood", "qty": 1}]
	var host := _host(state)
	for id: String in PanelHost.PANEL_IDS:
		host.open(id)
		var buttons := host.current_panel().find_children("*", "BaseButton", true, false)
		assert_gt(buttons.size(), 0, id)
		for node: Node in buttons:
			var b: BaseButton = node
			eq(b.focus_mode, Control.FOCUS_ALL, "%s: %s" % [id, b.name])
		assert_not_null(host.get_viewport().gui_get_focus_owner(), "%s has a focused control" % id)


func test_cart_focus_survives_a_purchase() -> void:
	var host := _host(TestStates.with_bag(TestStates.at_calendar(TestStates.fresh(), 600), []))
	host.open("cart")
	var buy := host.current_panel().button("Buy 1 Turnip Seeds for 20 gold")
	buy.grab_focus()
	_tap("ui_accept")
	eq(Bag.count_of(_bag(_session.state), "seed:turnip"), 1)
	assert_true(buy.has_focus(), "the same button keeps focus after the refresh")


# --- Strings -----------------------------------------------------------------------------------------------------


func test_panel_text_matches_web_strings() -> void:
	eq(BagPanel.HINT, "Choose an item, then another slot to move it. Pin items to keys 6 to 8 for quick use.")
	eq(BagPanel.TITLE, "Bag")
	eq(BagPanel.PIN, "Pin to %d")
	eq(BagPanel.EMPTY_CELL, "Empty bag slot %d")
	eq(BinPanel.TITLE, "Shipping bin")
	eq(BinPanel.YOUR_BAG, "Your bag")
	eq(BinPanel.NOTHING_TO_SELL, "Nothing to sell yet. Harvest crops or clear the field.")
	eq(BinPanel.EACH, "%d gold each")
	eq(BinPanel.SHIP_ONE, "Ship 1")
	eq(BinPanel.SHIP_ALL, "Ship all")
	eq(BinPanel.SHIP_ONE_LABEL, "Ship one %s")
	eq(BinPanel.SHIP_ALL_LABEL, "Ship all %s")
	eq(BinPanel.IN_THE_BIN, "In the bin")
	eq(BinPanel.BIN_EMPTY, "The bin is empty.")
	eq(BinPanel.TAKE_BACK, "Take back")
	eq(BinPanel.TAKE_BACK_LABEL, "Take back %s")
	eq(BinPanel.TOTAL, "Sells tonight for %s gold")
	eq(CartPanel.TITLE, "Sol's cart")
	eq(CartPanel.OPEN_SPEECH, "Fresh seeds from over the hills. What are you planting today?")
	eq(CartPanel.CLOSED_SPEECH, "I'm packing up for now. Come back between 9 AM and 5 PM.")
	eq(CartPanel.EACH, "%d gold each")
	eq(CartPanel.RIPE, ", ripe in %d days")
	eq(CartPanel.REGROWS, ", regrows every %d")
	eq(CartPanel.FEWER, "−")
	eq(CartPanel.MORE, "+")
	eq(CartPanel.FEWER_LABEL, "One fewer %s")
	eq(CartPanel.MORE_LABEL, "One more %s")
	eq(CartPanel.QUANTITY_LABEL, "Quantity of %s")
	eq(CartPanel.BUY, "Buy for %s")
	eq(CartPanel.BUY_LABEL, "Buy %d %s for %s gold")
	eq(CartPanel.NOT_ENOUGH_GOLD, "Not enough gold")
	eq(CartPanel.BAG_FULL, "Your bag is full")
	eq(CartPanel.YOU_HAVE, "You have %s gold.")
	eq(SleepConfirm.TITLE, "Go to bed?")
	eq(SleepConfirm.BODY, "Sleeping ends the day, sells what's in the bin, and saves your farm.")
	eq(SleepConfirm.NOT_YET, "Not yet")
	eq(SleepConfirm.SLEEP, "Sleep and save")
	eq(MorningReport.TITLE, "Yesterday's sales")
	eq(MorningReport.TOTAL, "Total")
	eq(MorningReport.TOTAL_GOLD, "%s gold")
	eq(MorningReport.START, "Start the day")
	eq(ModalPanel.CLOSE, "Close")
	eq(PauseMenu.PAUSED, "Paused")
	eq(PauseMenu.RESUME, "Resume")
	eq(PauseMenu.BAG, "Bag")
	eq(PauseMenu.GRAPHICS, "Graphics")
	eq(PauseMenu.QUALITY_LABEL, {
		"auto": "Automatic (recommended)",
		"high": "High (stronger GPUs)",
		"medium": "Medium",
		"low": "Low (older or built-in graphics)",
	})
	eq(PauseMenu.QUALITY_ORDER, ["auto", "high", "medium", "low"])
	eq(PauseMenu.TEXT_SIZE, "Text size")
	eq(PauseMenu.SCALE_LABEL, "%d%%")
	eq(PauseMenu.SKIP, "Skip lessons")
	eq(PauseMenu.RESTART, "Start lessons again")
	eq(PauseMenu.SKIP_TITLE, "Skip Grandpa's lessons?")
	eq(PauseMenu.SKIP_BODY, "You can start them again from this Journal any time.")
	eq(PauseMenu.SKIP_CONFIRM, "Skip")
	eq(PauseMenu.SKIP_CANCEL, "Keep learning")
	eq(PauseMenu.SAVE_NOW, "Save now")
	eq(PauseMenu.SAVED, "Game saved.")
	eq(PauseMenu.EXPORT, "Export save")
	eq(PauseMenu.EXPORTED, "Save exported to %s")
	eq(PauseMenu.EXPORT_FAILED, "Couldn't export the save.")
	eq(PauseMenu.SAVE_AND_QUIT, "Save and quit")
	eq(PauseMenu.SAVE_FAILED, SAVE_FAILED)
	eq(PanelHost.COMPLETE_TITLE, "The rest is yours")
	eq(PanelHost.COMPLETE_GIFT, "Tucked in the last page: %d gold.")


func test_shown_text_matches_web_strings() -> void:
	var host := _host(TestStates.lesson_at(TestStates.fresh(), "till"))
	host.open("bag")
	_has(host, "Bag")
	_has(host, "Choose an item, then another slot to move it. Pin items to keys 6 to 8 for quick use.")
	_has(host, "Close")
	host.open("bin")
	_has(host, "Your bag")
	_has(host, "In the bin")
	host.open("sleep")
	_has(host, "Not yet")
	host.open("pause")
	for text: String in [
		"Elm", "Resume", "Bag", "Graphics", "Automatic (recommended)", "High (stronger GPUs)", "Medium",
		"Low (older or built-in graphics)", "Text size", "100%", "125%", "150%", "Skip lessons", "Save now",
		"Export save", "Save and quit",
	]:
		_has(host, text)
	_lacks(host, "Start lessons again")


func test_pause_display_radios_update_settings() -> void:
	var host := _host(TestStates.fresh())
	host.open("pause")
	var pause := host.current_panel() as PauseMenu
	assert_true(pause.mode_radio("windowed").button_pressed)
	assert_true(pause.size_radio("auto").button_pressed)
	pause.mode_radio("fullscreen").pressed.emit()
	eq(_settings.display_mode, "fullscreen")
	assert_true(pause.mode_radio("fullscreen").button_pressed)
	assert_false(pause.mode_radio("windowed").button_pressed)
	pause.size_radio("1280x720").pressed.emit()
	eq(_settings.window_size, "1280x720")
	assert_false(pause.size_radio("auto").button_pressed)
	assert_null(pause.size_radio("2560x1440"), "a size larger than the (fallback 1920x1080) screen is not offered")


# --- forge, stove, well and the bag's Equip / Eat ---------------------------------------------------------------

func _with_items(state: Dictionary, items: Dictionary) -> Dictionary:
	for id: String in items.keys():
		var qty: int = items[id]
		var r := Bag.add_item(a(state["bag"]), id, qty)
		state["bag"] = r["bag"]
	return state


func test_forge_lists_smelting_and_every_recipe_and_crafts() -> void:
	var state := _with_items(TestStates.fresh(), {"copperOre": 5, "wood": 5})
	state["gold"] = 200
	var host := _host(state)
	host.open("forge")
	var forge := host.current_panel() as ForgePanel
	eq(forge.visible_rows(), 6, "smelt plus five recipes")
	assert_false(forge.row_button(0).disabled, "5 ore and 25 gold")
	assert_true(forge.row_button(1).disabled, "no bars for a sword")
	forge.row_button(0).pressed.emit()
	eq(Bag.count_of(a(_session.state["bag"]), "copperBar"), 1)
	eq(_session.state["gold"], 175)
	assert_true(forge.texts().has("You have 175 gold."))


func test_forge_explains_why_a_row_is_disabled() -> void:
	var host := _host(TestStates.fresh())
	host.open("forge")
	var forge := host.current_panel() as ForgePanel
	assert_true(forge.texts().has("Missing materials") or forge.texts().has("Not enough gold"))


func test_stove_cooks_dishes_from_crops() -> void:
	var state := _with_items(TestStates.fresh(), {"turnip": 2})
	var host := _host(state)
	host.open("stove")
	var stove := host.current_panel() as StovePanel
	eq(stove.visible_rows(), 3)
	assert_false(stove.row_button(0).disabled)
	assert_true(stove.row_button(1).disabled)
	stove.row_button(0).pressed.emit()
	eq(Bag.count_of(a(_session.state["bag"]), "turnipStew"), 1)


func test_well_lists_the_entrance_and_recorded_checkpoints_and_closes_on_choice() -> void:
	var state := TestStates.fresh()
	d(state["calendar"]).merge({"day": 9}, true)
	(state["milestones"] as Array).append("firstShipment")
	d(state["player"]).merge({"location": "woods", "x": 99.5, "z": 45.5, "facing": "e"}, true)
	d(d(state["deeps"])["mossdeep"])["checkpoints"] = [0, 4]
	var host := _host(state)
	host.open("well")
	var well := host.current_panel() as WellPanel
	eq(well.visible_rows(), 2)
	assert_true(well.texts().has("Floor 4 checkpoint"))
	well.row_button(1).pressed.emit()
	assert_false(host.is_open())
	eq(d(_session.state["player"])["floor"], 4)
	eq(d(_session.state["player"])["location"], "mossdeep")


func test_bag_equips_gear_and_eats_dishes() -> void:
	var state := _with_items(TestStates.fresh(), {"copperSword": 1, "turnipStew": 1, "fiber": 1})
	state["hp"] = 50
	var host := _host(state)
	host.open("bag")
	var bag := host.current_panel() as BagPanel
	var slots: Dictionary = {}
	for i: int in a(_session.state["bag"]).size():
		var cell: Variant = a(_session.state["bag"])[i]
		if cell != null:
			slots[d(cell)["id"]] = i
	bag.cells[slots["fiber"]].pressed.emit()
	assert_false(bag.use_button.visible, "nothing to do with fiber")
	bag.cells[slots["fiber"]].pressed.emit()
	bag.cells[slots["copperSword"]].pressed.emit()
	assert_true(bag.use_button.visible)
	eq(bag.use_button.text, "Equip")
	bag.use_button.pressed.emit()
	eq(d(_session.state["gear"])["weapon"], "copperSword")
	bag.cells[slots["turnipStew"]].pressed.emit()
	eq(bag.use_button.text, "Eat")
	bag.use_button.pressed.emit()
	eq(_session.state["hp"], 90)
