class_name StovePanel
extends ChoicePanel
## The house stove (M1 spec 7.6): cook a dish from farm crops. Eat it from the bag before a fight for HP and a buff.

const STOVE_TITLE := "Stove"
const SPEECH := "Eat before you go down. Empty stomachs make poor fighters."
const COOK := "Cook"


func setup() -> void:
	title_label.text = STOVE_TITLE
	set_speech(SPEECH)


func options() -> Array[Dictionary]:
	var out: Array[Dictionary] = []
	for dish_id: String in Cooking.DISHES:
		var r := Cooking.cook(session.state, dish_id)
		var ok: bool = r["ok"]
		var reason: String = r["reason"]
		out.append({
			"label": "%s: %s (+%d HP)" % [HudLabels.display_name(dish_id), _ingredients(dish_id), _hp(dish_id)],
			"button": COOK, "enabled": ok, "reason": reason, "command": {"type": "cook", "dish": dish_id},
		})
	return out


static func _hp(dish_id: String) -> int:
	var dish: Dictionary = Cooking.DISHES[dish_id]
	var hp: int = dish["hp"]
	return hp


static func _ingredients(dish_id: String) -> String:
	var dish: Dictionary = Cooking.DISHES[dish_id]
	var needs: Dictionary = dish["ingredients"]
	var parts: Array[String] = []
	for item: String in needs:
		var qty: int = needs[item]
		parts.append("%d %s" % [qty, HudLabels.display_name(item).to_lower()])
	return ", ".join(parts)
