class_name ForgePanel
extends ChoicePanel
## Hilda's forge (M1 spec 7.5): smelt a copper bar (5 copper ore + 25 gold) and craft the copper gear and the buckler.

const FORGE_TITLE := "Hilda's forge"
const SPEECH := "Copper first. Five ore, one bar."
const SMELT_LABEL := "Copper bar: 5 copper ore, 25 gold"
const SMELT_BUTTON := "Smelt"
const MADE := "Craft"
const YOU_HAVE := "You have %s gold."


func setup() -> void:
	title_label.text = FORGE_TITLE
	set_speech(SPEECH)


func options() -> Array[Dictionary]:
	var out: Array[Dictionary] = []
	var smelt := Forge.smelt(session.state)
	var ok: bool = smelt["ok"]
	var reason: String = smelt["reason"]
	out.append({"label": SMELT_LABEL, "button": SMELT_BUTTON, "enabled": ok, "reason": reason, "command": {"type": "smelt"}})
	for gear_id: String in Forge.RECIPES:
		var r := Forge.craft(session.state, gear_id)
		var can: bool = r["ok"]
		var why: String = r["reason"]
		out.append({
			"label": "%s: %s" % [HudLabels.display_name(gear_id), _cost_text(gear_id)], "button": MADE, "enabled": can,
			"reason": why, "command": {"type": "craft", "gearId": gear_id},
		})
	return out


static func _cost_text(gear_id: String) -> String:
	var cost: Dictionary = Forge.RECIPES[gear_id]
	var parts: Array[String] = []
	for item: String in cost:
		var qty: int = cost[item]
		parts.append("%d gold" % qty if item == "gold" else "%d %s" % [qty, HudLabels.display_name(item).to_lower()])
	return ", ".join(parts)


func footer() -> String:
	var gold: int = session.state["gold"]
	return YOU_HAVE % HudLabels.format_int(gold)
