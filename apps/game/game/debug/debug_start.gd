class_name DebugStart
extends RefCounted
## `--debug-deep` (a developer flag, run as `Godot --path apps/game -- --debug-deep`): turns the loaded save into a state
## ready for the Woods, Mossdeep and the boss, so the new content can be tried without playing to day 8: day 9 of spring,
## the first shipment made, lessons skipped, gold, a stocked bag with copper gear and dishes, and the player standing by
## the old well. It only changes the state in memory (the next autosave keeps it), so use a throwaway slot.

const FLAG := "--debug-deep"


static func requested(args: PackedStringArray) -> bool:
	return args.has(FLAG)


## The state after the debug changes. Pure: returns a new state.
static func apply(state: Dictionary) -> Dictionary:
	var out := state.duplicate(true)
	var cal: Dictionary = out["calendar"]
	cal["season"] = "spring"
	cal["year"] = 1
	cal["day"] = 9
	cal["minute"] = 600
	var milestones: Array = out["milestones"]
	if not milestones.has("firstShipment"):
		milestones.append("firstShipment")
	out["gold"] = 5000
	out["level"] = 5
	out["hp"] = Progression.max_hp(5)
	var bag: Array = []
	for i: int in Balance.BAG_SLOTS:
		bag.append(null)
	for id: String in ["practiceSword", "copperSword", "woodBuckler", "copperHelm", "copperMail", "copperBoots"]:
		bag = Bag.add_item(bag, id, 1)["bag"]
	for id: String in ["turnipStew", "potatoHash"]:
		bag = Bag.add_item(bag, id, 3)["bag"]
	bag = Bag.add_item(bag, "copperOre", 10)["bag"]
	bag = Bag.add_item(bag, "turnip", 6)["bag"]
	out["bag"] = bag
	var player: Dictionary = out["player"]
	player["location"] = "woods"
	player["floor"] = 0
	player["x"] = Zones.WOODS_WELL_ARRIVAL.x
	player["z"] = Zones.WOODS_WELL_ARRIVAL.y
	player["facing"] = "e"
	var skipped := Tutorial.skip_lessons(out)
	return skipped["state"]
