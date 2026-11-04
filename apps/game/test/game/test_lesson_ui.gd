extends CoreTest
## The tutorial UI: lesson and note texts (pinned from apps/web/src/ui/lessons/lessonText.ts), hints, the transient
## lesson state (lessonStore.ts), the goal and note cards, the world marker, the off-screen pointer, the device
## tracker and the Hud's mounting plus its save_failed toast.

const GameSessionScript := preload("res://game/autoload/game_session.gd")
const SaveServiceScript := preload("res://game/autoload/save_service.gd")

const GOAL_TEXT: Dictionary[String, Array] = {
	"walkToField": ["Walk to the field", "The old field lies north of where you stand. Walk up and take a look."],
	"till": ["Break some ground", "Grass won't take seeds. Pick the hoe and turn three patches of grass into soil."],
	"plant": ["Plant your turnips", "Turnips are forgiving. Pick the seed pouch, face the soil, and tuck a seed into each patch."],
	"water": ["Water the seedlings", "Seeds are thirsty. Pick the watering can and give every planted patch a drink."],
	"sleep": ["Rest for the night", "Watch the clock and your energy. Sleeping in your bed ends the day and saves the farm."],
	"waterDaily": ["Water every morning", "Morning! Crops only grow on days they're watered. Rain does it for you. Turnips need four days."],
	"harvest": ["Harvest a turnip", "Look at that, it's ripe! Cut it with the sickle, or face it and pick it by hand."],
	"ship": ["Fill the shipping bin", "The bin by the house buys anything you grow. Open it and put your turnip in."],
	"sellOvernight": ["Sleep on it", "The bin is emptied at night, and the money is yours by morning. Go to bed."],
	"buySeeds": ["Buy more seeds", "Sol's cart on the east road sells seeds from nine to five. Spend some of those coins."],
}

const NOTE_TEXT: Dictionary[String, Array] = {
	"canEmpty": ["Out of water", "An empty can waters nothing. Face the pond and use the can to fill it up."],
	"staminaLow": ["Running low", "You're tiring. Eat a crop you grew, or call it a day and sleep."],
	"exhausted": ["Worn out", "You've worked yourself to the bone. You'll move slowly until you eat or sleep."],
	"passedOut": ["Too late a night", "You stayed out too late and collapsed. You wake with half your energy. Bed earlier!"],
	"rain": ["Rainy day", "Rain waters every crop for you. Spend the day clearing the field instead."],
	"obstacles": ["Clearing the field", "Weeds need the sickle, rocks the hammer, stumps the axe. Clear them to make room."],
	"wrongSeason": ["Wrong season", "Every seed has its season. Seeds planted out of season won't sprout."],
	"newSeason": ["A new season", "The season turned. Last season's crops wither, so plant what the cart sells now."],
	"bagFull": ["Bag is full", "Your bag is full. Ship or eat something to make room."],
	"cartClosed": ["Cart is closed", "Sol keeps the cart open nine to five, spring to fall. Come back then."],
}

var _session: GameSessionScript


func _make_session(state: Dictionary, screen: String = "game") -> GameSessionScript:
	_session = GameSessionScript.new()
	add_child_autofree(_session)
	_session.set_process(false)
	_session.start(state, 1, 0)
	_session.set_screen(screen)
	return _session


func _lesson_state(id: String, count: int = 0) -> Dictionary:
	return TestStates.lesson_at(TestStates.fresh(), id, count)


func _crop_tile(watered: bool, age: int = 0) -> Dictionary:
	var t := {"kind": "tilled", "crop": {"id": "turnip", "age": age, "regrowing": false}}
	if watered:
		t["watered"] = true
	return t


func _make_hud(state: Dictionary, screen: String = "game") -> Hud:
	var session := _make_session(state, screen)
	var hud := Hud.new()
	hud.session = session
	add_child_autofree(hud)
	return hud


func _action(name: String) -> InputEventAction:
	var e := InputEventAction.new()
	e.action = name
	e.pressed = true
	return e


# --- texts -------------------------------------------------------------------------------------------------------

func test_goal_text_for_every_lesson() -> void:
	eq(LessonText.GOAL.size(), 10)
	for id: String in Lessons.LESSON_ORDER:
		eq(LessonText.title_of(id), GOAL_TEXT[id][0], "title of %s" % id)
		eq(LessonText.body_of(id), GOAL_TEXT[id][1], "body of %s" % id)
	eq(LessonText.GOAL.keys().size(), Lessons.LESSON_ORDER.size())


func test_note_text_for_every_note() -> void:
	eq(LessonText.NOTE.size(), 10)
	for id: String in Lessons.NOTE_IDS:
		eq(str(LessonText.NOTE[id]["title"]), NOTE_TEXT[id][0], "title of %s" % id)
		eq(str(LessonText.NOTE[id]["body"]), NOTE_TEXT[id][1], "body of %s" % id)


func test_completion_and_note_card_strings() -> void:
	eq(LessonText.COMPLETE_TITLE, "The rest is yours")
	eq(LessonText.COMPLETE_BODY, "That's all I can teach you from a notebook. The valley remembers people who stay. — Elias")
	eq(LessonText.COMPLETE_GIFT_FORMAT % 100, "Tucked in the last page: 100 gold.")
	eq(LessonText.COMPLETE_BUTTON, "Thanks, Grandpa")
	eq(LessonText.NOTE_EYEBROW, "From Grandpa's notes")
	eq(LessonText.NOTE_DISMISS, "Got it")


func test_hints_use_this_games_bindings() -> void:
	var s := _lesson_state("till")
	eq(LessonText.hint("till", "keyboard", s), "[1] Hoe   [Space] Use")
	eq(LessonText.hint("till", "gamepad", s), "[D-pad] Hoe   [A] Use")
	eq(LessonText.hint("walkToField", "keyboard"), "[WASD] Walk   [Shift] Run")
	eq(LessonText.hint("walkToField", "gamepad"), "[L-stick] Walk   [L-stick click] Run")
	eq(LessonText.hint("harvest", "keyboard"), "[3] Sickle   [Space] Use   [F] Interact")
	eq(LessonText.hint("sleep", "gamepad"), "[X] Interact")
	eq(LessonText.hint("water", "keyboard"), "[2] Can   [Space] Use")
	# An unknown device falls back to the keyboard.
	eq(LessonText.hint("ship", "touch"), "[F] Interact")
	for id: String in Lessons.LESSON_ORDER:
		for device: String in ["keyboard", "gamepad"]:
			assert_ne(LessonText.hint(id, device), "", "%s on %s has a hint" % [id, device])


func test_seed_hint_names_the_real_slot_or_the_bag() -> void:
	var s := _lesson_state("plant")
	var slot := Tutorial.lesson_slot(s)
	assert_gt(slot, -1, "a new game pins its seeds")
	eq(LessonText.hint("plant", "keyboard", s), "[%d] Seeds   [F] Interact" % (slot + 1))
	var none := s.duplicate(true)
	none["quickSlots"] = [null, null, null]
	eq(LessonText.hint("plant", "keyboard", none), "[B] Bag   [F] Interact")
	eq(LessonText.hint("plant", "gamepad", none), "[Y] Bag   [X] Interact")
	eq(LessonText.dismiss_hint("keyboard"), "[Enter] Got it")
	eq(LessonText.dismiss_hint("gamepad"), "[A] Got it")


func test_progress_and_ripe_in_text() -> void:
	var till := _lesson_state("till", 2)
	eq(LessonText.progress(till, "till"), "2 / 3")
	eq(LessonText.progress(_lesson_state("plant", 1), "plant"), "1 / 3")
	eq(LessonText.progress(till, "walkToField"), "")
	eq(LessonText.progress(till, "water"), "", "no crops, no water count")
	var s := _lesson_state("water")
	s = TestStates.with_tile(s, 5, 10, _crop_tile(true))
	s = TestStates.with_tile(s, 6, 10, _crop_tile(false))
	eq(LessonText.progress(s, "water"), "1 / 2")
	eq(LessonText.progress(s, "waterDaily"), "1 / 2")
	var growing := TestStates.with_tile(_lesson_state("harvest"), 5, 10, _crop_tile(false, 2))
	eq(LessonText.ripe_in(growing), "Ripe in 2 days")
	var nearly := TestStates.with_tile(_lesson_state("harvest"), 5, 10, _crop_tile(false, 3))
	eq(LessonText.ripe_in(nearly), "Ripe in 1 day")
	var ripe := TestStates.with_tile(_lesson_state("harvest"), 5, 10, _crop_tile(false, 4))
	eq(LessonText.ripe_in(ripe), "", "nothing to wait for when one is ripe")
	eq(LessonText.ripe_in(_lesson_state("harvest")), "", "no crops")


# --- LessonUiState (lessonStore.ts) -------------------------------------------------------------------------------

func test_ui_state_expands_on_lesson_started_and_collapses_after_8_seconds() -> void:
	var ui := LessonUiState.new()
	ui.set_visible(true, 0)
	ui.on_event({"type": "lessonStarted", "id": "till"}, 1000)
	assert_true(ui.expanded)
	assert_false(ui.tick(8999))
	assert_true(ui.expanded)
	assert_true(ui.tick(9000))
	assert_false(ui.expanded)


func test_ui_state_flashes_done_for_1200_ms() -> void:
	var ui := LessonUiState.new()
	ui.set_visible(true, 0)
	ui.on_event({"type": "lessonDone", "id": "till"}, 500)
	eq(ui.done_flash, "till")
	ui.tick(1699)
	eq(ui.done_flash, "till")
	ui.tick(1700)
	eq(ui.done_flash, "")


func test_ui_state_timers_wait_until_the_cards_can_be_seen() -> void:
	var ui := LessonUiState.new()
	ui.on_event({"type": "lessonDone", "id": "ship"}, 0)
	ui.on_event({"type": "lessonStarted", "id": "sellOvernight"}, 0)
	ui.tick(60000)
	assert_true(ui.expanded, "still open behind a menu")
	eq(ui.done_flash, "ship")
	ui.set_visible(true, 60000)
	ui.tick(61200)
	eq(ui.done_flash, "")
	assert_true(ui.expanded)
	ui.tick(68000)
	assert_false(ui.expanded)
	# Hiding and showing again restarts nothing that already ended, and a hidden card runs no timer.
	ui.on_event({"type": "lessonStarted", "id": "buySeeds"}, 70000)
	ui.set_visible(false, 70001)
	ui.tick(200000)
	assert_true(ui.expanded)


func test_ui_state_enter_game_opens_the_saved_lesson_only() -> void:
	var ui := LessonUiState.new()
	ui.set_visible(true, 0)
	ui.enter_game("off", 0)
	assert_false(ui.expanded)
	ui.enter_game("complete", 0)
	assert_false(ui.expanded)
	ui.enter_game("water", 0)
	assert_true(ui.expanded)


func test_ui_state_notes_queue_dedupe_keep_all_and_time_out() -> void:
	var ui := LessonUiState.new()
	ui.set_visible(true, 0)
	ui.on_event({"type": "noteShown", "id": "rain"}, 0)
	ui.on_event({"type": "noteShown", "id": "rain"}, 0)
	eq(ui.note_queue, ["rain"] as Array[String], "the same note is queued once")
	ui.on_event({"type": "noteShown", "id": "bagFull"}, 0)
	ui.on_event({"type": "noteShown", "id": "canEmpty"}, 0)
	ui.on_event({"type": "noteShown", "id": "exhausted"}, 0)
	ui.on_event({"type": "noteShown", "id": "obstacles"}, 0)
	eq(ui.note_queue.size(), 5, "no note is dropped")
	eq(ui.head_note(), "rain")
	ui.tick(9999)
	eq(ui.head_note(), "rain")
	ui.tick(10000)
	eq(ui.head_note(), "bagFull", "the next note gets its own 10 s")
	ui.tick(19999)
	eq(ui.head_note(), "bagFull")
	ui.dismiss_note(15000)
	eq(ui.head_note(), "canEmpty")
	ui.tick(24999)
	eq(ui.head_note(), "canEmpty")
	ui.tick(25000)
	eq(ui.head_note(), "exhausted", "all five show, in arrival order")
	ui.tick(35000)
	eq(ui.head_note(), "obstacles")
	ui.tick(45000)
	eq(ui.head_note(), "")


func test_ui_state_ignores_other_events() -> void:
	var ui := LessonUiState.new()
	ui.set_visible(true, 0)
	ui.on_event({"type": "goldChanged", "gold": 5, "delta": 5}, 0)
	assert_false(ui.expanded)
	eq(ui.done_flash, "")
	eq(ui.note_queue.size(), 0)


# --- cards -------------------------------------------------------------------------------------------------------

func _card_with(state: Dictionary, ui: LessonUiState = null, shown: bool = true, device: String = "keyboard") -> GoalCard:
	var card := GoalCard.new()
	add_child_autofree(card)
	var u := ui if ui != null else LessonUiState.new()
	card.refresh(state, u, device, shown)
	return card


func test_goal_card_shows_count_for_till_and_plant() -> void:
	var till := _card_with(_lesson_state("till", 2))
	assert_true(till.visible)
	eq(till.title_text(), "Break some ground")
	eq(till.pill_text(), "2 / 3")
	var plant := _card_with(_lesson_state("plant", 1))
	eq(plant.title_text(), "Plant your turnips")
	eq(plant.pill_text(), "1 / 3")
	var walk := _card_with(_lesson_state("walkToField"))
	eq(walk.pill_text(), "", "no count for an uncounted lesson")


func test_goal_card_shows_water_and_ripe_progress() -> void:
	var water := TestStates.with_tile(_lesson_state("water"), 5, 10, _crop_tile(true))
	water = TestStates.with_tile(water, 6, 10, _crop_tile(false))
	eq(_card_with(water).pill_text(), "1 / 2")
	var harvest := TestStates.with_tile(_lesson_state("harvest"), 5, 10, _crop_tile(false, 2))
	eq(_card_with(harvest).sub_text(), "Ripe in 2 days")


func test_goal_card_hidden_when_lessons_off_or_complete_or_not_shown() -> void:
	assert_false(_card_with(_lesson_state("off")).visible)
	assert_false(_card_with(_lesson_state("complete")).visible)
	assert_false(_card_with(_lesson_state("till"), null, false).visible, "hidden behind a menu or the title")
	var card := _card_with(_lesson_state("till"))
	assert_true(card.visible)
	card.refresh(_lesson_state("complete"), LessonUiState.new(), "keyboard", true)
	assert_false(card.visible)


func test_goal_card_body_and_hint_follow_expanded_and_device() -> void:
	var ui := LessonUiState.new()
	var card := _card_with(_lesson_state("till"), ui)
	assert_false(card.is_open())
	eq(card.body_text(), GOAL_TEXT["till"][1])
	eq(card.hint_text(), "[1] Hoe   [Space] Use")
	ui.set_visible(true, 0)
	ui.on_event({"type": "lessonStarted", "id": "till"}, 0)
	card.refresh(_lesson_state("till"), ui, "gamepad", true)
	assert_true(card.is_open())
	eq(card.hint_text(), "[D-pad] Hoe   [A] Use")
	ui.tick(8000)
	card.refresh(_lesson_state("till"), ui, "gamepad", true)
	assert_false(card.is_open())
	# The fade ends hidden: wait for the tween.
	await get_tree().create_timer(GoalCard.FADE_S + 0.2).timeout
	assert_false(card.body_visible())


func test_goal_card_shows_a_tick_for_the_lesson_just_done() -> void:
	var ui := LessonUiState.new()
	ui.set_visible(true, 0)
	ui.on_event({"type": "lessonDone", "id": "till"}, 0)
	var card := _card_with(_lesson_state("plant", 0), ui)
	eq(card.title_text(), "Break some ground")
	eq(card.icon_text(), "✓")
	eq(card.pill_text(), "")
	ui.tick(1200)
	card.refresh(_lesson_state("plant", 0), ui, "keyboard", true)
	eq(card.title_text(), "Plant your turnips")


func test_note_card_shows_once_per_note_and_dismisses_with_confirm_or_cancel() -> void:
	var hud := _make_hud(_lesson_state("till"))
	var layer := hud.lesson_layer
	var now := 1000
	layer.on_events([{"type": "noteShown", "id": "rain"}], now)
	layer.on_events([{"type": "noteShown", "id": "rain"}], now)
	assert_true(hud.note_card.visible)
	eq(hud.note_card.note_id(), "rain")
	eq(hud.note_card.title_text(), "Rainy day")
	eq(layer.ui.note_queue.size(), 1, "the note shows once")
	hud.note_card._input(_action("confirm"))
	assert_false(hud.note_card.visible)
	layer.on_events([{"type": "noteShown", "id": "bagFull"}], now)
	assert_true(hud.note_card.visible)
	hud.note_card._input(_action("primary"))
	assert_true(hud.note_card.visible, "only confirm and cancel dismiss")
	hud.note_card._input(_action("cancel"))
	assert_false(hud.note_card.visible)


func test_note_card_ignores_confirm_while_hidden_and_consumes_nothing() -> void:
	var hud := _make_hud(_lesson_state("till"))
	var seen: Array[bool] = []
	hud.note_card.dismissed.connect(func() -> void: seen.append(true))
	hud.note_card._input(_action("confirm"))
	eq(seen.size(), 0)
	hud.lesson_layer.on_events([{"type": "noteShown", "id": "rain"}], 0)
	var viewport := hud.get_viewport()
	hud.note_card._input(_action("confirm"))
	eq(seen.size(), 1)
	assert_false(viewport.is_input_handled(), "the press still reaches the game")


func test_note_card_hides_behind_a_menu_and_after_10_seconds() -> void:
	var hud := _make_hud(_lesson_state("till"))
	var layer := hud.lesson_layer
	layer.on_events([{"type": "noteShown", "id": "rain"}], 0)
	assert_true(hud.note_card.visible)
	_session.set_screen("paused")
	layer.tick(1)
	assert_false(hud.note_card.visible, "paused: no card")
	_session.set_screen("game")
	layer.tick(2)
	assert_true(hud.note_card.visible)
	layer.tick(2 + LessonUiState.NOTE_MS)
	assert_false(hud.note_card.visible)


# --- Hud mounting ------------------------------------------------------------------------------------------------

func test_hud_mounts_the_cards_and_the_layer_ignores_input() -> void:
	var hud := _make_hud(_lesson_state("till", 1))
	assert_not_null(hud.goal_card)
	assert_not_null(hud.note_card)
	eq(hud.lesson_layer.focus_mode, Control.FOCUS_NONE)
	eq(hud.lesson_layer.mouse_filter, Control.MOUSE_FILTER_IGNORE)
	assert_true(hud.goal_card.visible)
	eq(hud.goal_card.pill_text(), "1 / 3")
	assert_true(hud.goal_card.is_open(), "the card opens when the farm first shows")


func test_hud_goal_card_follows_lesson_events_and_state() -> void:
	var hud := _make_hud(_lesson_state("till", 0))
	_session.state = _lesson_state("plant", 0)
	_session.events.emit([{"type": "lessonDone", "id": "till"}, {"type": "lessonStarted", "id": "plant"}])
	_session.state_changed.emit()
	eq(hud.goal_card.title_text(), "Break some ground", "the finished lesson is ticked for a moment")
	hud.lesson_layer.tick(Time.get_ticks_msec() + LessonUiState.DONE_FLASH_MS + 10)
	eq(hud.goal_card.title_text(), "Plant your turnips")
	_session.state = _lesson_state("off")
	_session.state_changed.emit()
	assert_false(hud.goal_card.visible)


func test_hud_goal_card_hidden_on_the_title_screen() -> void:
	var hud := _make_hud(_lesson_state("till"), "title")
	assert_false(hud.goal_card.visible)
	_session.set_screen("game")
	hud.lesson_layer.tick(Time.get_ticks_msec())
	assert_true(hud.goal_card.visible)


func test_save_failed_shows_toast() -> void:
	var service: SaveServiceScript = SaveServiceScript.new()
	autofree(service)
	var session := _make_session(TestStates.fresh())
	var hud := Hud.new()
	hud.session = session
	hud.save_service = service
	add_child_autofree(hud)
	eq(hud.toasts.count(), 0)
	service.save_failed.emit("Couldn't save. Use Export save to keep your progress.")
	eq(hud.toasts.count(), 1)
	eq(hud.toasts.text_at(0), "Couldn't save. Use Export save to keep your progress.")
	eq(hud.toasts.kind_at(0), "warn")


# --- device tracker ----------------------------------------------------------------------------------------------

func test_device_tracker_follows_the_last_device_used() -> void:
	var tracker := DeviceTracker.new()
	add_child_autofree(tracker)
	var seen: Array[String] = []
	tracker.device_changed.connect(func(d: String) -> void: seen.append(d))
	eq(tracker.device, "keyboard")
	tracker.process_event(InputEventKey.new())
	eq(seen.size(), 0, "no change, no signal")
	tracker.process_event(InputEventJoypadButton.new())
	eq(tracker.device, "gamepad")
	var drift := InputEventJoypadMotion.new()
	drift.axis_value = 0.05
	tracker.process_event(InputEventMouseMotion.new())
	eq(tracker.device, "keyboard")
	tracker.process_event(drift)
	eq(tracker.device, "keyboard", "stick drift below the deadzone does not switch")
	var push := InputEventJoypadMotion.new()
	push.axis_value = 0.9
	tracker.process_event(push)
	eq(tracker.device, "gamepad")
	tracker.process_event(InputEventMouseButton.new())
	eq(tracker.device, "keyboard")
	eq(seen, ["gamepad", "keyboard", "gamepad", "keyboard"] as Array[String])


func test_hud_hint_follows_the_device_tracker() -> void:
	var tracker := DeviceTracker.new()
	add_child_autofree(tracker)
	var session := _make_session(_lesson_state("till"))
	var hud := Hud.new()
	hud.session = session
	hud.devices = tracker
	add_child_autofree(hud)
	eq(hud.goal_card.hint_text(), "[1] Hoe   [Space] Use")
	tracker.process_event(InputEventJoypadButton.new())
	eq(hud.goal_card.hint_text(), "[D-pad] Hoe   [A] Use")


# --- marker ------------------------------------------------------------------------------------------------------

func _marker(state: Dictionary) -> LessonMarker:
	var session := _make_session(state)
	var marker := LessonMarker.new()
	marker.session = session
	add_child_autofree(marker)
	return marker


func test_marker_follows_lesson_target() -> void:
	var s := _lesson_state("till")
	var marker := _marker(s)
	var target := Tutorial.lesson_target(s)
	assert_true(marker.is_active())
	var tx: int = target["x"]
	var ty: int = target["y"]
	eq(marker.tile(), Vector2i(tx, ty))
	var at := marker.world_point()
	assert_almost_eq(at.x, tx + 0.5, 1e-4)
	assert_almost_eq(at.y, 0.05, 1e-4)
	assert_almost_eq(at.z, ty + 0.5, 1e-4)
	eq(marker.position, at, "the ring node sits on the target")
	# The target moves with the lesson (the bin for ship) on a state change.
	var before := marker.revision
	_session.state = _lesson_state("ship")
	_session.state_changed.emit()
	var bin := Grid.find_feature(farm_of(_session.state), "bin")
	eq(marker.tile(), bin)
	assert_gt(marker.revision, before)
	# An unchanged target does not bump the revision.
	var rev := marker.revision
	_session.state_changed.emit()
	eq(marker.revision, rev)


func test_marker_hidden_when_no_target() -> void:
	var marker := _marker(_lesson_state("off"))
	assert_false(marker.is_active())
	assert_false(marker.ring_shown())
	_session.state = _lesson_state("till")
	_session.state_changed.emit()
	assert_true(marker.is_active())
	assert_true(marker.ring_shown())
	_session.state = _lesson_state("complete")
	_session.state_changed.emit()
	assert_false(marker.is_active())
	assert_false(marker.ring_shown())


func test_marker_hidden_when_the_target_is_on_another_map() -> void:
	assert_true(LessonMarker.is_target_here({"location": "farm", "x": 1, "y": 2}, "farm"))
	assert_false(LessonMarker.is_target_here({"location": "house", "x": 1, "y": 2}, "farm"))
	assert_false(LessonMarker.is_target_here({}, "farm"))


func test_marker_in_the_house_points_at_the_bed() -> void:
	var s := _lesson_state("sleep")
	var player: Dictionary = s["player"]
	player["location"] = "house"
	player["x"] = 3.5
	player["z"] = 3.5
	var marker := _marker(s)
	assert_true(marker.is_active())
	var bed := Grid.find_feature(d(d(s["maps"])["house"]), "bed")
	eq(marker.tile(), bed)


func test_marker_ring_pulses_unless_still() -> void:
	var marker := _marker(_lesson_state("till"))
	marker._process(0.25)
	var mesh: MeshInstance3D = marker.get_child(0)
	var torus: TorusMesh = mesh.mesh
	var material: StandardMaterial3D = torus.material
	assert_almost_eq(material.albedo_color.a, 0.575 + 0.225, 1e-3)
	marker._process(0.5)
	assert_almost_eq(material.albedo_color.a, 0.575 - 0.225, 1e-3)
	marker.still = true
	marker._process(0.1)
	assert_almost_eq(material.albedo_color.a, 0.6, 1e-4)
	assert_almost_eq(torus.inner_radius, 0.36, 1e-4)
	assert_almost_eq(torus.outer_radius, 0.46, 1e-4)


# --- pointer -----------------------------------------------------------------------------------------------------

func test_edge_point_clamps_to_the_inset_and_points_outward() -> void:
	var view := Vector2(1000, 600)
	var right := MarkerPointer.edge_point(Vector2(2000, 300), view, 24.0)
	assert_almost_eq(right.x, 976.0, 1e-3)
	assert_almost_eq(right.y, 300.0, 1e-3)
	assert_almost_eq(right.z, 0.0, 1e-4)
	var up := MarkerPointer.edge_point(Vector2(500, -900), view, 24.0)
	assert_almost_eq(up.y, 24.0, 1e-3)
	assert_almost_eq(up.z, -PI / 2.0, 1e-4)
	var centre := MarkerPointer.edge_point(Vector2(500, 300), view, 24.0)
	eq(Vector2(centre.x, centre.y), Vector2(500, 300))
	var behind := MarkerPointer.edge_point(Vector2(900, 300), view, 24.0, true)
	assert_almost_eq(behind.x, 24.0, 1e-3, "a point behind the camera is mirrored")


func _pointer_rig() -> Dictionary:
	var vp := SubViewport.new()
	vp.size = Vector2i(1280, 720)
	add_child_autofree(vp)
	var rig := CameraRig.new()
	vp.add_child(rig)
	var focus := Node3D.new()
	vp.add_child(focus)
	rig.target = focus
	var s := _lesson_state("till")
	var marker := _marker(s)
	var pointer := MarkerPointer.new()
	pointer.marker = marker
	pointer.camera_rig = rig
	add_child_autofree(pointer)
	return {"rig": rig, "focus": focus, "marker": marker, "pointer": pointer}


func test_pointer_shows_when_the_marker_is_off_screen_and_hides_when_on_screen() -> void:
	var parts := _pointer_rig()
	var rig: CameraRig = parts["rig"]
	var focus: Node3D = parts["focus"]
	var marker: LessonMarker = parts["marker"]
	var pointer: MarkerPointer = parts["pointer"]
	focus.global_position = marker.world_point() + Vector3(60.0, 0.0, 0.0)
	rig.snap()
	pointer.recompute()
	assert_true(pointer.is_shown(), "far to the east: an arrow")
	assert_almost_eq(cos(pointer.rotation), -1.0, 1e-2, "the target lies west of the view, the arrow points west")
	assert_true(pointer.position.x < 40.0)
	focus.global_position = marker.world_point()
	rig.snap()
	pointer.recompute()
	assert_false(pointer.is_shown(), "centred: no arrow")


func test_pointer_hidden_without_a_target() -> void:
	var parts := _pointer_rig()
	var marker: LessonMarker = parts["marker"]
	var pointer: MarkerPointer = parts["pointer"]
	var rig: CameraRig = parts["rig"]
	var focus: Node3D = parts["focus"]
	focus.global_position = marker.world_point() + Vector3(60.0, 0.0, 0.0)
	rig.snap()
	pointer.recompute()
	assert_true(pointer.is_shown())
	_session.state = _lesson_state("off")
	_session.state_changed.emit()
	pointer._process(0.016)
	assert_false(pointer.is_shown())


func test_pointer_recomputes_only_when_the_pose_changed() -> void:
	var parts := _pointer_rig()
	var rig: CameraRig = parts["rig"]
	var focus: Node3D = parts["focus"]
	var marker: LessonMarker = parts["marker"]
	var pointer: MarkerPointer = parts["pointer"]
	pointer.session = _session
	focus.global_position = marker.world_point() + Vector3(60.0, 0.0, 0.0)
	rig.snap()
	_session.set_pose(10.0, 10.0, "n")
	pointer._process(0.016)
	assert_true(pointer.is_shown())
	# The camera moves onto the marker but the pose is the same: the cached answer stays.
	focus.global_position = marker.world_point()
	rig.snap()
	pointer._process(0.016)
	assert_true(pointer.is_shown(), "pose unchanged, nothing recomputed")
	_session.set_pose(11.0, 10.0, "n")
	pointer._process(0.016)
	assert_false(pointer.is_shown(), "the pose changed, so it recomputes")


func test_pointer_hidden_unless_the_game_screen_runs() -> void:
	var parts := _pointer_rig()
	var rig: CameraRig = parts["rig"]
	var focus: Node3D = parts["focus"]
	var marker: LessonMarker = parts["marker"]
	var pointer: MarkerPointer = parts["pointer"]
	pointer.session = _session
	focus.global_position = marker.world_point() + Vector3(60.0, 0.0, 0.0)
	rig.snap()
	pointer._process(0.016)
	assert_true(pointer.is_shown())
	_session.set_screen("paused")
	pointer._process(0.016)
	assert_false(pointer.is_shown(), "paused")
	_session.set_screen("modal")
	pointer._process(0.016)
	assert_false(pointer.is_shown(), "modal")
	_session.set_screen("game")
	pointer._process(0.016)
	assert_true(pointer.is_shown(), "back in game, off screen: the arrow returns")
