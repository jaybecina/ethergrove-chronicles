extends CoreTest
## The always-on HUD: clock, gold, energy bar, hotbar, prompt line, toasts and the theme factory. Strings are
## pinned from apps/web/src/ui (hud/*.tsx, uiBridge.ts, labels.ts).

const GameSessionScript := preload("res://game/autoload/game_session.gd")

## Every FailReason of packages/core/src/types.ts with the toast the web shows ("" = no toast in the web either).
const FAIL_TEXTS: Dictionary[String, String] = {
	"noStamina": "You're too tired. Eat something or get some sleep.",
	"canEmpty": "The watering can is empty. Refill it at the pond.",
	"bagFull": "Your bag is full. Ship or move some items.",
	"cartClosed": "Sol's cart is open 9 AM to 5 PM, spring to fall.",
	"wrongSeason": "Those seeds won't grow this season.",
	"notEnoughGold": "Not enough gold.",
	"notHungry": "You're already full of energy.",
	"noTarget": "",
	"noItem": "",
	"notSellable": "",
	"notHere": "",
}


func _farm_state() -> Dictionary:
	return TestStates.fresh()


func _feature(state: Dictionary, loc: String, feature: String) -> Vector2i:
	var grid: Dictionary = Zones.grid("lowmere") if loc == "lowmere" else d(d(state["maps"])[loc])
	return Grid.find_feature(grid, feature)


## Stands one tile below `tile` facing north, in `loc`, with the given active slot.
func _facing(state: Dictionary, loc: String, tile: Vector2i, slot: int = 0) -> Dictionary:
	var out := TestStates.stand_at(state, tile.x, tile.y + 1, "n")
	d(out["player"])["location"] = loc
	out["activeSlot"] = slot
	return out


func _make_hud(state: Dictionary) -> Hud:
	var session: GameSessionScript = GameSessionScript.new()
	add_child_autofree(session)
	session.set_process(false)
	session.start(state, 1, 0)
	var hud := Hud.new()
	hud.session = session
	add_child_autofree(hud)
	return hud


func _count_nodes(node: Node) -> int:
	var n := 1
	for child: Node in node.get_children():
		n += _count_nodes(child)
	return n


func _controls_ignore_input(node: Node) -> bool:
	if node is Control:
		var c: Control = node
		if c.focus_mode != Control.FOCUS_NONE or c.mouse_filter != Control.MOUSE_FILTER_IGNORE:
			return false
	for child: Node in node.get_children():
		if not _controls_ignore_input(child):
			return false
	return true


# --- clock, gold, energy --------------------------------------------------------------------------------------

func test_clock_text_for_known_states() -> void:
	var s := TestStates.at_calendar(TestStates.fresh(), 360, "spring", "sunny")
	d(s["weather"])["tomorrow"] = "rain"
	eq(ClockLabel.text_for(s), "6:00 AM\nMon, Spring 1\nToday: Sunny   Tomorrow: Rain")
	var noon := TestStates.at_calendar(TestStates.fresh(), 780, "summer", "storm")
	d(noon["calendar"])["day"] = 9
	d(noon["weather"])["tomorrow"] = "cloudy"
	eq(ClockLabel.text_for(noon), "1:00 PM\nTue, Summer 9\nToday: Storm   Tomorrow: Cloudy")
	# 26:00 (the pass-out hour) wraps to 2:00 AM.
	var late := TestStates.at_calendar(TestStates.fresh(), 1560, "winter", "snow")
	d(late["calendar"])["day"] = 28
	d(late["weather"])["tomorrow"] = "snow"
	eq(ClockLabel.text_for(late), "2:00 AM\nSun, Winter 28\nToday: Snow   Tomorrow: Snow")
	var fall := TestStates.at_calendar(TestStates.fresh(), 1080, "fall", "rain")
	d(fall["weather"])["tomorrow"] = "sunny"
	eq(ClockLabel.text_for(fall), "6:00 PM\nMon, Fall 1\nToday: Rain   Tomorrow: Sunny")


## Found by eye in Task 17: overriding _get_minimum_size with the coin's width alone clipped the amount off screen.
func test_gold_label_is_wide_enough_for_coin_and_amount() -> void:
	var hud := _make_hud(_farm_state())
	var font := hud.gold.get_theme_font("font")
	var size := hud.gold.get_theme_font_size("font_size")
	var text_width := font.get_string_size(hud.gold.text, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x
	assert_gt(hud.gold.get_combined_minimum_size().x, text_width + GoldLabel.COIN_RADIUS * 2.0, "coin plus amount")


## Found by eye in Task 17: the top-right corner grew to the right when the amount widened, off the screen.
func test_gold_stays_on_screen_when_the_amount_grows() -> void:
	var state := _farm_state()
	state["gold"] = 1234567
	var vp := SubViewport.new()
	vp.size = Vector2i(1280, 720)
	add_child_autofree(vp)
	var session: GameSessionScript = GameSessionScript.new()
	session.set_process(false)
	vp.add_child(session)
	session.start(state, 1, 0)
	var hud := Hud.new()
	hud.session = session
	vp.add_child(hud)
	await wait_process_frames(2)
	var right := hud.gold.get_global_rect().end.x
	assert_lt(right, hud.root.get_viewport_rect().size.x - Hud.MARGIN + 1.0, "the amount ends inside the margin")


func test_gold_text() -> void:
	eq(GoldLabel.text_for(0), "0")
	eq(GoldLabel.text_for(500), "500")
	eq(GoldLabel.text_for(1234567), "1,234,567")
	eq(GoldLabel.text_for(1000), "1,000")


func test_energy_bar_fraction_and_low_state() -> void:
	var bar := EnergyBar.new()
	add_child_autofree(bar)
	bar.set_energy(100)
	eq(bar.fraction(), 1.0)
	eq(bar.is_low, false)
	bar.set_energy(21)
	eq(bar.is_low, false)
	bar.set_energy(20)
	eq(bar.is_low, true)
	eq(bar.fraction(), 0.2)
	bar.set_energy(0)
	eq(bar.is_low, true)
	eq(bar.is_empty, true)
	eq(bar.value, 0.0)
	eq(bar.label_text(), "Energy")


# --- hotbar ---------------------------------------------------------------------------------------------------

func test_hotbar_marks_active_slot_and_counts() -> void:
	var bar := Hotbar.new()
	add_child_autofree(bar)
	var s := _farm_state()
	var bag: Array = s["bag"]
	bag[3] = {"id": "turnip", "qty": 12}
	s["quickSlots"] = [0, 3, null]
	s["activeSlot"] = 6
	s["canCharges"] = 7
	bar.refresh(s)
	eq(bar.slot_count(), 8)
	eq(bar.slot_text(0), "1 Hoe")
	eq(bar.slot_text(1), "2 Watering Can\n7/20")
	eq(bar.slot_text(4), "5 Hammer")
	eq(bar.slot_text(5), "6 Turnip Seeds\nx6")
	eq(bar.slot_text(6), "7 Turnip\nx12")
	eq(bar.slot_text(7), "8 Empty")
	for i: int in 8:
		eq(bar.is_active(i), i == 6, "slot %d" % i)
	s["activeSlot"] = 0
	bar.refresh(s)
	eq(bar.is_active(0), true)
	eq(bar.is_active(6), false)


# --- prompt ---------------------------------------------------------------------------------------------------

func test_prompt_for_door_bin_bed_water_crop_and_none() -> void:
	var s := _farm_state()
	eq(Prompt.text_for(_facing(s, "farm", _feature(s, "farm", "houseDoor"))), "F  Enter")
	eq(Prompt.text_for(_facing(s, "farm", _feature(s, "farm", "bin"))), "F  Ship")
	eq(Prompt.text_for(_facing(s, "farm", _feature(s, "farm", "cart"))), "F  Shop")
	eq(Prompt.text_for(_facing(s, "house", _feature(s, "house", "bed"))), "F  Sleep")
	eq(Prompt.text_for(_facing(s, "house", _feature(s, "house", "exitDoor"))), "F  Exit")
	# Water: the hoe has no verb there, the can refills with both buttons.
	var pond := Vector2i(3, 18)
	eq(d(TestStates.tile_of(s, pond.x, pond.y))["kind"], "water")
	var by_pond := TestStates.stand_at(s, 3, 17, "s")
	eq(Prompt.text_for(by_pond), "F  Refill")
	by_pond["activeSlot"] = 1
	eq(Prompt.text_for(by_pond), "Space  Refill    F  Refill")
	# A ripe crop: harvest with the sickle and with F.
	var ripe := TestStates.with_tile(s, 10, 10, {"kind": "tilled", "crop": {"id": "turnip", "age": 4, "regrowing": false}})
	ripe = TestStates.stand_at(ripe, 10, 11, "n")
	eq(Prompt.text_for(ripe), "F  Harvest")
	ripe["activeSlot"] = 2
	eq(Prompt.text_for(ripe), "Space  Harvest    F  Harvest")
	# Empty tilled ground: F plants the pinned seed.
	var tilled := TestStates.with_tile(s, 10, 10, {"kind": "tilled"})
	tilled = TestStates.stand_at(tilled, 10, 11, "n")
	eq(Prompt.text_for(tilled), "F  Plant")
	# Grass with the hoe: till. Grass with the can: nothing at all.
	var grass := TestStates.with_tile(s, 10, 10, {"kind": "grass"})
	grass = TestStates.stand_at(grass, 10, 11, "n")
	eq(Prompt.text_for(grass), "Space  Till")
	grass["activeSlot"] = 1
	eq(Prompt.text_for(grass), "")


func test_prompt_in_lowmere() -> void:
	var s := _farm_state()
	var hilda := _facing(s, "lowmere", Vector2i(4, 5))
	eq(Prompt.text_for(hilda), "F  Talk to Hilda")
	eq(Prompt.text_for(_facing(s, "lowmere", _feature(s, "lowmere", "toFarm"))), "F  Go home")
	eq(Prompt.text_for(_facing(s, "lowmere", _feature(s, "lowmere", "noticeBoard"))), "")
	eq(Prompt.text_for(_facing(s, "lowmere", _feature(s, "lowmere", "forgeDoor"))), "F  Forge")
	eq(Prompt.text_for(_facing(s, "lowmere", _feature(s, "lowmere", "clinicDoor"))), "F  Enter the clinic")
	eq(Prompt.text_for(_facing(s, "farm", _feature(s, "farm", "farmGate"))), "F  Go to Lowmere")


# --- toasts ---------------------------------------------------------------------------------------------------

func test_toast_text_for_each_failed_reason() -> void:
	eq(FAIL_TEXTS.size(), 11)
	for reason: String in FAIL_TEXTS:
		eq(Toasts.fail_text(reason), FAIL_TEXTS[reason], reason)
	eq(Toasts.fail_text("somethingNew"), "")


func test_toast_for_event_mapping() -> void:
	var passed := Toasts.toast_for({"type": "passedOut"})
	eq(passed["text"], "You passed out from exhaustion and woke up at home.")
	eq(passed["kind"], "warn")
	eq(passed["duration_ms"], 5000)
	var fail := Toasts.toast_for({"type": "actionFailed", "reason": "notEnoughGold"})
	eq(fail["text"], "Not enough gold.")
	eq(fail["kind"], "warn")
	eq(fail["duration_ms"], Toasts.DURATION_MS)
	var milestone := Toasts.toast_for({"type": "milestoneReached", "id": "gold10k"})
	eq(milestone["text"], "10,000 gold. Grandpa would be proud.")
	eq(milestone["kind"], "info")
	eq(Toasts.toast_for({"type": "milestoneReached", "id": "firstTill"})["text"], "Your first furrow.")
	eq(Toasts.toast_for({"type": "milestoneReached", "id": "nope"}), {})
	eq(Toasts.toast_for({"type": "actionFailed", "reason": "noTarget"}), {})
	eq(Toasts.toast_for({"type": "canRefilled"}), {})


func test_toast_stack_limit_and_expiry() -> void:
	var toasts := Toasts.new()
	add_child_autofree(toasts)
	toasts.push("one", "info", 0)
	toasts.push("two", "warn", 1000)
	toasts.push("three", "info", 2000)
	eq(toasts.count(), 3)
	toasts.push("four", "warn", 2500)
	eq(toasts.count(), 3, "at most three")
	eq(toasts.text_at(0), "two", "the oldest is dropped")
	eq(toasts.text_at(2), "four")
	eq(toasts.kind_at(2), "warn")
	toasts.tick(3999)
	eq(toasts.count(), 3, "two expires at 4000")
	toasts.tick(4000)
	eq(toasts.count(), 2)
	toasts.tick(5500)
	eq(toasts.count(), 0)
	eq(toasts.visible_count(), 0)
	toasts.push("five", "info", 6000)
	eq(toasts.visible_count(), 1)


# --- hud ------------------------------------------------------------------------------------------------------

func test_hud_shows_state_and_follows_state_changed() -> void:
	var hud := _make_hud(_farm_state())
	eq(hud.clock.text.begins_with("6:00 AM\nMon, Spring 1"), true)
	eq(hud.gold.text, "500")
	eq(hud.energy.value, 100.0)
	eq(hud.hotbar.is_active(0), true)
	hud.session.dispatch({"type": "selectHotbar", "index": 2})
	eq(hud.hotbar.is_active(2), true)
	eq(hud.hotbar.is_active(0), false)
	eq(hud.prompt.text.begins_with("Space"), false, "sickle on grass has no verb")


func test_hud_turns_events_into_toasts_and_dedupes_repeated_failures() -> void:
	var hud := _make_hud(_farm_state())
	hud.session.events.emit([{"type": "actionFailed", "reason": "canEmpty"}])
	eq(hud.toasts.count(), 1)
	hud.session.events.emit([{"type": "actionFailed", "reason": "canEmpty"}])
	eq(hud.toasts.count(), 1, "same reason within 1.5 s")
	hud.session.events.emit([{"type": "actionFailed", "reason": "bagFull"}, {"type": "passedOut"}])
	eq(hud.toasts.count(), 3)


func test_hud_does_not_rebuild_nodes_on_refresh() -> void:
	var hud := _make_hud(_farm_state())
	var before := _count_nodes(hud)
	var s := _farm_state()
	for i: int in 50:
		s["gold"] = 100 * i
		d(s["player"])["energy"] = i * 2
		s["activeSlot"] = i % 8
		hud.refresh(s)
	eq(_count_nodes(hud), before)


func test_hud_never_takes_focus_or_clicks() -> void:
	var hud := _make_hud(_farm_state())
	eq(_controls_ignore_input(hud), true)


# --- theme ----------------------------------------------------------------------------------------------------

func test_theme_scales_font_with_ui_scale() -> void:
	eq(ThemeFactory.font_size(1.0), 18)
	eq(ThemeFactory.font_size(1.25), 22)
	eq(ThemeFactory.font_size(1.5), 27)
	eq(ThemeFactory.make(1.0).default_font_size, 18)
	eq(ThemeFactory.make(1.5).default_font_size, 27)


func test_theme_button_focus_outline_is_two_pixel_accent() -> void:
	var theme := ThemeFactory.make(1.0)
	var focus: StyleBoxFlat = theme.get_stylebox("focus", "Button") as StyleBoxFlat
	assert_not_null(focus)
	eq(focus.border_width_left, 2)
	eq(focus.border_color, ThemeFactory.ACCENT)
	eq(theme.get_color("font_color", "Label"), ThemeFactory.TEXT)


## Task 17 by eye: the clock's pale text over the snow-white winter ground needed more than a 1 px shadow.
func test_labels_have_a_dark_outline_for_bright_ground() -> void:
	var theme := ThemeFactory.make(1.0)
	assert_gt(theme.get_constant("outline_size", "Label"), 0)
	assert_lt(theme.get_color("font_outline_color", "Label").get_luminance(), 0.2)


## Task 17 by eye: a disabled Continue on the title looked exactly like an enabled button.
func test_disabled_buttons_look_disabled() -> void:
	var theme := ThemeFactory.make(1.0)
	assert_lt(theme.get_color("font_disabled_color", "Button").a, 0.7, "muted text")
	var normal := theme.get_stylebox("normal", "Button") as StyleBoxFlat
	var disabled := theme.get_stylebox("disabled", "Button") as StyleBoxFlat
	assert_ne(disabled.bg_color, normal.bg_color)
	assert_ne(disabled.border_color, normal.border_color)


func test_hud_apply_scale_changes_the_root_theme() -> void:
	var hud := _make_hud(_farm_state())
	hud.apply_scale(1.5)
	eq(hud.root.theme.default_font_size, 27)
	hud.apply_scale(1.0)
	eq(hud.root.theme.default_font_size, 18)


func test_hud_reenter_tree_does_not_error_or_double_connect() -> void:
	var hud := _make_hud(_farm_state())
	var session: GameSessionScript = hud.session
	eq(session.state_changed.get_connections().size(), 1)
	remove_child(hud)
	eq(session.state_changed.get_connections().size(), 0)
	eq(session.events.get_connections().size(), 0)
	add_child(hud)
	eq(session.state_changed.get_connections().size(), 1)
	eq(session.events.get_connections().size(), 1)
	session.events.emit([{"type": "actionFailed", "reason": "bagFull"}])
	eq(hud.toasts.count(), 1, "one toast, not two")


func test_ui_scale_signal_reaches_hud() -> void:
	var settings: Node = (load("res://game/autoload/settings.gd") as GDScript).new()
	autofree(settings)
	var session: GameSessionScript = GameSessionScript.new()
	add_child_autofree(session)
	session.set_process(false)
	session.start(_farm_state(), 1, 0)
	var hud := Hud.new()
	hud.session = session
	hud.settings = settings
	add_child_autofree(hud)
	eq(hud.root.theme.default_font_size, 18)
	settings.emit_signal("ui_scale_changed", 1.5)
	eq(hud.root.theme.default_font_size, 27)
	settings.emit_signal("ui_scale_changed", 1.0)
	eq(hud.root.theme.default_font_size, 18)


func test_prompt_follows_faced_tile_in_process() -> void:
	var s := _farm_state()
	s["activeSlot"] = 1
	var door := _feature(s, "farm", "houseDoor")
	var hud := _make_hud(s)
	var session: GameSessionScript = hud.session
	eq(hud.prompt.text, "")
	session.set_pose(door.x + 0.5, door.y + 1.5, "n")
	await wait_process_frames(2)
	eq(hud.prompt.text, "F  Enter")
	session.set_pose(10.5, 11.5, "n")
	await wait_process_frames(2)
	eq(hud.prompt.text, "")


func test_prompt_has_no_tool_verb_where_you_fight() -> void:
	var s := _farm_state()
	d(s["player"])["location"] = "woods"
	d(s["player"]).merge({"x": 5.5, "z": 45.5, "facing": "e"}, true)
	s["activeSlot"] = 0
	eq(Prompt.tool_verb(s), "", "Space dodges in the Woods, so no Till")
