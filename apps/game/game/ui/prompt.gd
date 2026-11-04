class_name Prompt
extends Label
## The line above the hotbar that says what the buttons do on the tile you face (apps/web/src/ui/hud/Prompt.tsx and
## labels.ts `promptsFor`). Keyboard keys only for now: primary "Space", secondary "F". Lowmere has no tool verbs.

const PRIMARY_KEY := "Space"
const SECONDARY_KEY := "F"

const FEATURE_VERBS: Dictionary[String, String] = {
	"houseDoor": "Enter",
	"exitDoor": "Exit",
	"bin": "Ship",
	"bed": "Sleep",
	"cart": "Shop",
	"farmGate": "Go to Lowmere",
	"toFarm": "Go home",
	"toWoods": "Enter the Woods",
	"toLowmere": "Back to Lowmere",
	"clinicExit": "Leave the clinic",
	"well": "Climb down the old well",
	"stairsDown": "Go down",
	"stairsUp": "Go up",
	"checkpointStone": "Touch the stone",
	"copperNode": "Mine copper",
	"forgeDoor": "Forge",
	"clinicDoor": "Enter the clinic",
	"stove": "Cook",
	"lantern": "Take the lantern",
	"brokenBlade": "Take the blade",
	"rootShrine": "Root Shrine",
}


func _init() -> void:
	focus_mode = Control.FOCUS_NONE
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER


## The tile the player faces, or null off the map.
static func _target(state: Dictionary) -> Variant:
	var player: Dictionary = state["player"]
	var t := Grid.target_tile(player)
	return Grid.tile_at(GameStateUtil.current_grid(state), t.x, t.y)


static func tool_verb(state: Dictionary) -> String:
	var player: Dictionary = state["player"]
	var here: String = player["location"]
	# No tool verbs in Lowmere, and none where you fight (Space dodges there).
	if here == "lowmere" or Zones.is_combat(here):
		return ""
	var tool := Bag.active_tool(state)
	if tool == "":
		return ""
	var tile_v: Variant = _target(state)
	if tile_v == null:
		return ""
	var tile: Dictionary = tile_v
	var kind: String = tile["kind"]
	var crop: Dictionary = {}
	if tile.has("crop"):
		crop = tile["crop"]
	if tool == "hoe" and kind == "grass":
		return "Till"
	if tool == "can" and kind == "water":
		return "Refill"
	if tool == "can" and kind == "tilled":
		return "Water"
	if tool == "sickle" and kind == "weed":
		return "Cut"
	if tool == "sickle" and not crop.is_empty() and Crops.is_mature(crop):
		return "Harvest"
	if tool == "axe" and kind == "stump":
		return "Chop"
	if tool == "hammer" and kind == "rock":
		return "Break"
	return ""


static func secondary_verb(state: Dictionary) -> String:
	var action := Interact.resolve_secondary(state)
	if action == "useItem":
		var q := Bag.quick_item(state)
		var stack: Dictionary = q["stack"]
		var id: String = stack["id"]
		var def := ItemData.def_of(id)
		return "Plant" if def["kind"] == "seed" else "Eat"
	if action != "interact":
		return ""
	var player: Dictionary = state["player"]
	if player["location"] == "lowmere":
		var t := Grid.target_tile(player)
		var villager := Villagers.at(t.x, t.y)
		if not villager.is_empty():
			var who: String = villager["name"]
			return "Talk to %s" % who
	var tile_v: Variant = _target(state)
	if tile_v == null:
		return ""
	var tile: Dictionary = tile_v
	if tile.has("feature"):
		var feature: String = tile["feature"]
		return FEATURE_VERBS.get(feature, "")
	return "Refill" if tile["kind"] == "water" else "Harvest"


static func text_for(state: Dictionary) -> String:
	var primary := tool_verb(state)
	var secondary := secondary_verb(state)
	if primary != "" and secondary != "":
		return "%s  %s    %s  %s" % [PRIMARY_KEY, primary, SECONDARY_KEY, secondary]
	if primary != "":
		return "%s  %s" % [PRIMARY_KEY, primary]
	if secondary != "":
		return "%s  %s" % [SECONDARY_KEY, secondary]
	return ""


func refresh(state: Dictionary) -> void:
	var next := text_for(state)
	if next != text:
		text = next
