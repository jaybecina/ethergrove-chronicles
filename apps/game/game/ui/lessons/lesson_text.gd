class_name LessonText
extends RefCounted
## Grandpa's lesson texts, notes, completion text and the control hints. Strings are copied verbatim from
## apps/web/src/ui/lessons/lessonText.ts (spec appendix A) and hints.ts; the hint key names follow this game's
## bindings (InputActions), see `KEYS`. Pure: no nodes.

const DEVICES: Array[String] = ["keyboard", "gamepad"]

## Lesson id -> {title, body}. Spec Appendix A.1.
const GOAL: Dictionary[String, Dictionary] = {
	"walkToField": {
		"title": "Walk to the field",
		"body": "The old field lies north of where you stand. Walk up and take a look.",
	},
	"till": {
		"title": "Break some ground",
		"body": "Grass won't take seeds. Pick the hoe and turn three patches of grass into soil.",
	},
	"plant": {
		"title": "Plant your turnips",
		"body": "Turnips are forgiving. Pick the seed pouch, face the soil, and tuck a seed into each patch.",
	},
	"water": {
		"title": "Water the seedlings",
		"body": "Seeds are thirsty. Pick the watering can and give every planted patch a drink.",
	},
	"sleep": {
		"title": "Rest for the night",
		"body": "Watch the clock and your energy. Sleeping in your bed ends the day and saves the farm.",
	},
	"waterDaily": {
		"title": "Water every morning",
		"body": "Morning! Crops only grow on days they're watered. Rain does it for you. Turnips need four days.",
	},
	"harvest": {
		"title": "Harvest a turnip",
		"body": "Look at that, it's ripe! Cut it with the sickle, or face it and pick it by hand.",
	},
	"ship": {
		"title": "Fill the shipping bin",
		"body": "The bin by the house buys anything you grow. Open it and put your turnip in.",
	},
	"sellOvernight": {
		"title": "Sleep on it",
		"body": "The bin is emptied at night, and the money is yours by morning. Go to bed.",
	},
	"buySeeds": {
		"title": "Buy more seeds",
		"body": "Sol's cart on the east road sells seeds from nine to five. Spend some of those coins.",
	},
}

## Note id -> {title, body}. Spec Appendix A.2.
const NOTE: Dictionary[String, Dictionary] = {
	"canEmpty": {
		"title": "Out of water",
		"body": "An empty can waters nothing. Face the pond and use the can to fill it up.",
	},
	"staminaLow": {
		"title": "Running low",
		"body": "You're tiring. Eat a crop you grew, or call it a day and sleep.",
	},
	"exhausted": {
		"title": "Worn out",
		"body": "You've worked yourself to the bone. You'll move slowly until you eat or sleep.",
	},
	"passedOut": {
		"title": "Too late a night",
		"body": "You stayed out too late and collapsed. You wake with half your energy. Bed earlier!",
	},
	"rain": {
		"title": "Rainy day",
		"body": "Rain waters every crop for you. Spend the day clearing the field instead.",
	},
	"obstacles": {
		"title": "Clearing the field",
		"body": "Weeds need the sickle, rocks the hammer, stumps the axe. Clear them to make room.",
	},
	"wrongSeason": {
		"title": "Wrong season",
		"body": "Every seed has its season. Seeds planted out of season won't sprout.",
	},
	"newSeason": {
		"title": "A new season",
		"body": "The season turned. Last season's crops wither, so plant what the cart sells now.",
	},
	"bagFull": {"title": "Bag is full", "body": "Your bag is full. Ship or eat something to make room."},
	"cartClosed": {
		"title": "Cart is closed",
		"body": "Sol keeps the cart open nine to five, spring to fall. Come back then.",
	},
}

## Spec Appendix A.3 (the web's COMPLETE_TEXT).
const COMPLETE_TITLE := "The rest is yours"
const COMPLETE_BODY := "That's all I can teach you from a notebook. The valley remembers people who stay. — Elias"
const COMPLETE_GIFT_FORMAT := "Tucked in the last page: %d gold."
const COMPLETE_BUTTON := "Thanks, Grandpa"
## The note card's eyebrow (the web's JOURNAL_TEXT.eyebrow) and its dismiss button text.
const NOTE_EYEBROW := "From Grandpa's notes"
const NOTE_DISMISS := "Got it"

const _LABEL: Dictionary[String, String] = {
	"walk": "Walk",
	"run": "Run",
	"pickHoe": "Hoe",
	"pickCan": "Can",
	"pickSickle": "Sickle",
	"pickSeeds": "Seeds",
	"useTool": "Use",
	"interact": "Interact",
	"bag": "Bag",
}

## Key names per device for THIS game's bindings (input_actions.gd). Changes from the web hints.ts: the gamepad
## run key is the left stick click (not B), tool slots are cycled with the D-pad (not LB/RB), and there is no
## camera turn (the camera is fixed), so no "camera" chip.
const _KEYS: Dictionary[String, Dictionary] = {
	"walk": {"keyboard": "WASD", "gamepad": "L-stick"},
	"run": {"keyboard": "Shift", "gamepad": "L-stick click"},
	"pickHoe": {"keyboard": "1", "gamepad": "D-pad"},
	"pickCan": {"keyboard": "2", "gamepad": "D-pad"},
	"pickSickle": {"keyboard": "3", "gamepad": "D-pad"},
	"pickSeeds": {"keyboard": "6", "gamepad": "D-pad"},
	"useTool": {"keyboard": "Space", "gamepad": "A"},
	"interact": {"keyboard": "F", "gamepad": "X"},
	"bag": {"keyboard": "B", "gamepad": "Y"},
	"confirm": {"keyboard": "Enter", "gamepad": "A"},
}

const _CHIPS: Dictionary[String, Array] = {
	"walkToField": ["walk", "run"],
	"till": ["pickHoe", "useTool"],
	"plant": ["pickSeeds", "interact"],
	"water": ["pickCan", "useTool"],
	"waterDaily": ["pickCan", "useTool"],
	"sleep": ["interact"],
	"sellOvernight": ["interact"],
	"harvest": ["pickSickle", "useTool", "interact"],
	"ship": ["interact"],
	"buySeeds": ["interact"],
}


static func title_of(lesson_id: String) -> String:
	return str(GOAL[lesson_id]["title"])


static func body_of(lesson_id: String) -> String:
	return str(GOAL[lesson_id]["body"])


## One chip as "[key] Label". `state` (optional) lets the seed chip name the real hotbar slot.
static func chip(action: String, device: String, state: Dictionary = {}) -> String:
	var key: String = _KEYS[action][device]
	var label: String = _LABEL[action]
	if action == "pickSeeds" and not state.is_empty():
		var probe := state.duplicate(true)
		var tutorial: Dictionary = probe["tutorial"]
		tutorial["lesson"] = "plant"
		var slot := Tutorial.lesson_slot(probe)
		if slot < 0:
			key = _KEYS["bag"][device]
			label = _LABEL["bag"]
		elif device == "keyboard":
			key = str(slot + 1)
	return "[%s] %s" % [key, label]


## The control hint of a lesson for a device ("keyboard" or "gamepad"): its chips joined by three spaces.
static func hint(lesson_id: String, device: String, state: Dictionary = {}) -> String:
	if not _CHIPS.has(lesson_id):
		return ""
	var dev := device if DEVICES.has(device) else "keyboard"
	var parts: Array[String] = []
	for action: String in _CHIPS[lesson_id]:
		parts.append(chip(action, dev, state))
	return "   ".join(parts)


## "[Enter] Got it" for the note card.
static func dismiss_hint(device: String) -> String:
	var dev := device if DEVICES.has(device) else "keyboard"
	return "[%s] %s" % [_KEYS["confirm"][dev], NOTE_DISMISS]


## "2 / 3" for counted lessons, "watered / total" for water lessons, "" otherwise.
static func progress(state: Dictionary, lesson_id: String) -> String:
	var tutorial: Dictionary = state["tutorial"]
	if Lessons.LESSON_GOAL.has(lesson_id):
		var count: int = tutorial["count"]
		var goal: int = Lessons.LESSON_GOAL[lesson_id]
		return "%d / %d" % [count, goal]
	if lesson_id != "water" and lesson_id != "waterDaily":
		return ""
	var total := 0
	var watered := 0
	for crop_tile: Dictionary in _crop_tiles(state):
		total += 1
		if crop_tile.get("watered", false) == true:
			watered += 1
	if total == 0:
		return ""
	return "%d / %d" % [watered, total]


## "Ripe in N day(s)" while nothing is ripe yet, else "".
static func ripe_in(state: Dictionary) -> String:
	var soonest := 1 << 30
	for crop_tile: Dictionary in _crop_tiles(state):
		var crop: Dictionary = crop_tile["crop"]
		if Crops.is_mature(crop):
			return ""
		var def: Dictionary = CropData.CROPS[crop["id"]]
		var days: int = def["days"]
		var age: int = crop["age"]
		soonest = mini(soonest, days - age)
	if soonest == 1 << 30:
		return ""
	var left := maxi(1, soonest)
	return "Ripe in %d day%s" % [left, "" if left == 1 else "s"]


static func _crop_tiles(state: Dictionary) -> Array[Dictionary]:
	var out: Array[Dictionary] = []
	var maps: Dictionary = state["maps"]
	var farm: Dictionary = maps["farm"]
	var tiles: Array = farm["tiles"]
	for t_v: Variant in tiles:
		var t: Dictionary = t_v
		if t.has("crop"):
			out.append(t)
	return out
