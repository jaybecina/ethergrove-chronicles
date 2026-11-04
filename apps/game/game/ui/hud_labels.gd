class_name HudLabels
extends RefCounted
## Display names, number format and prompt verbs, ported from apps/web/src/ui/labels.ts and format.ts.

const TOOL_NAMES: Dictionary[String, String] = {
	"hoe": "Hoe",
	"can": "Watering Can",
	"sickle": "Sickle",
	"axe": "Axe",
	"hammer": "Hammer",
}

const ITEM_NAMES: Dictionary[String, String] = {
	"fiber": "Fiber",
	"wood": "Wood",
	"stone": "Stone",
	"turnip": "Turnip",
	"potato": "Potato",
	"strawberry": "Strawberry",
	"tomato": "Tomato",
	"corn": "Corn",
	"melon": "Melon",
	"pumpkin": "Pumpkin",
	"eggplant": "Eggplant",
	"copperOre": "Copper Ore",
	"copperBar": "Copper Bar",
	"practiceSword": "Practice Sword",
	"copperSword": "Copper Sword",
	"woodBuckler": "Wood Buckler",
	"copperHelm": "Copper Helm",
	"copperMail": "Copper Mail",
	"copperBoots": "Copper Boots",
	"turnipStew": "Turnip Stew",
	"potatoHash": "Potato Hash",
	"strawberryTart": "Strawberry Tart",
	"verdantRootstone": "Verdant Rootstone",
	"mossmawTusk": "Mossmaw Tusk",
	"groundsLantern": "Grandpa's Lantern",
	"brokenBlade": "Broken Blade",
}

const SEASON_NAMES: Dictionary[String, String] = {
	"spring": "Spring", "summer": "Summer", "fall": "Fall", "winter": "Winter",
}

const WEATHER_NAMES: Dictionary[String, String] = {
	"sunny": "Sunny", "cloudy": "Cloudy", "rain": "Rain", "storm": "Storm", "snow": "Snow",
}


static func display_name(id: String) -> String:
	if TOOL_NAMES.has(id):
		return TOOL_NAMES[id]
	var crop := ItemData.crop_of_seed(id)
	if crop != "":
		return "%s Seeds" % ITEM_NAMES.get(crop, crop)
	return ITEM_NAMES.get(id, id)


## 1234567 -> "1,234,567" (Intl.NumberFormat('en-US')).
static func format_int(n: int) -> String:
	var digits := str(absi(n))
	var out := ""
	var count := 0
	for i: int in range(digits.length() - 1, -1, -1):
		if count > 0 and count % 3 == 0:
			out = "," + out
		out = digits[i] + out
		count += 1
	return "-" + out if n < 0 else out
