class_name Toasts
extends VBoxContainer
## Top-centre toast stack: at most MAX_TOASTS, each shown for DURATION_MS. There is no Timer: every toast carries an
## expiry in ms and `tick(now_ms)` (driven from Hud._process) removes the expired ones. The three Labels are built
## once and reused. Event to text mapping from apps/web/src/ui/uiBridge.ts.

const MAX_TOASTS := 3
const DURATION_MS := 3000
const PASSED_OUT_MS := 5000

## The web's FAIL_TEXT. Reasons without an entry (noTarget, noItem, notSellable, notHere) show no toast there either.
const FAIL_TEXT: Dictionary[String, String] = {
	"noStamina": "You're too tired. Eat something or get some sleep.",
	"canEmpty": "The watering can is empty. Refill it at the pond.",
	"bagFull": "Your bag is full. Ship or move some items.",
	"cartClosed": "Sol's cart is open 9 AM to 5 PM, spring to fall.",
	"wrongSeason": "Those seeds won't grow this season.",
	"notEnoughGold": "Not enough gold.",
	"notHungry": "You're already full of energy.",
}

const MILESTONE_TEXT: Dictionary[String, String] = {
	"firstTill": "Your first furrow.",
	"firstPlant": "First seeds in the ground. Water them every day.",
	"firstShipment": "Your first shipment sold!",
	"gold1k": "1,000 gold saved.",
	"gold10k": "10,000 gold. Grandpa would be proud.",
	"allCrops": "You've grown every crop in the valley.",
	"fullYear": "A full year on the farm.",
}

## Oldest first. Parallel arrays of the same length (MAX_TOASTS).
var _texts: Array[String] = []
var _kinds: Array[String] = []
var _expires: Array[int] = []
var _labels: Array[Label] = []


func _init() -> void:
	focus_mode = Control.FOCUS_NONE
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_theme_constant_override("separation", 6)
	for i: int in MAX_TOASTS:
		var label := Label.new()
		label.focus_mode = Control.FOCUS_NONE
		label.mouse_filter = Control.MOUSE_FILTER_IGNORE
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.visible = false
		add_child(label)
		_labels.append(label)


static func fail_text(reason: String) -> String:
	return FAIL_TEXT.get(reason, "")


## The toast an event produces as {text, kind, duration_ms}, or {} when it shows none.
static func toast_for(event: Dictionary) -> Dictionary:
	var type: String = event["type"]
	match type:
		"passedOut":
			return {
				"text": "You passed out from exhaustion and woke up at home.",
				"kind": "warn",
				"duration_ms": PASSED_OUT_MS,
			}
		"milestoneReached":
			var id: String = event["id"]
			if MILESTONE_TEXT.has(id):
				return {"text": MILESTONE_TEXT[id], "kind": "info", "duration_ms": DURATION_MS}
		"actionFailed":
			var reason: String = event["reason"]
			var text := fail_text(reason)
			if text != "":
				return {"text": text, "kind": "warn", "duration_ms": DURATION_MS}
	return {}


func count() -> int:
	return _texts.size()


func visible_count() -> int:
	var n := 0
	for label: Label in _labels:
		if label.visible:
			n += 1
	return n


func text_at(i: int) -> String:
	return _texts[i]


func kind_at(i: int) -> String:
	return _kinds[i]


## Adds a toast ("info" or "warn"); with the stack full the oldest goes. `now_ms` defaults to the engine clock.
func push(text: String, kind: String = "info", now_ms: int = -1, duration_ms: int = DURATION_MS) -> void:
	var now := Time.get_ticks_msec() if now_ms < 0 else now_ms
	if _texts.size() >= MAX_TOASTS:
		_texts.remove_at(0)
		_kinds.remove_at(0)
		_expires.remove_at(0)
	_texts.append(text)
	_kinds.append(kind)
	_expires.append(now + duration_ms)
	_sync()


## Removes the toasts whose expiry has passed.
func tick(now_ms: int) -> void:
	var changed := false
	var i := 0
	while i < _expires.size():
		if _expires[i] <= now_ms:
			_texts.remove_at(i)
			_kinds.remove_at(i)
			_expires.remove_at(i)
			changed = true
		else:
			i += 1
	if changed:
		_sync()


func _sync() -> void:
	for i: int in MAX_TOASTS:
		var label := _labels[i]
		if i < _texts.size():
			label.text = _texts[i]
			label.add_theme_color_override("font_color", ThemeFactory.DANGER.lightened(0.45) if _kinds[i] == "warn" else ThemeFactory.TEXT)
			label.visible = true
		else:
			label.visible = false
