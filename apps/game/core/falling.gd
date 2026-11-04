class_name Falling
extends RefCounted
## Falling in a Deep or Lowmere Woods, or passing out away from home (M1 spec 6.6, ARPG 9.1). Pure: returns new data.

## Wake at 20:00 the same day, or at 08:00 the next day when it was already 20:00 or later.
const WAKE_EVENING := 1200
const WAKE_MORNING := 480
## Where the player wakes in the clinic (matches `Zones.CLINIC_SPAWN`).
const CLINIC_SPAWN := {"x": 4.5, "y": 3.5}
## Items that are never lost (ARPG 9.1): quest items, the Rootstone and the Mossmaw tusk.
const PROTECTED: Array[String] = ["verdantRootstone", "mossmawTusk", "groundsLantern", "brokenBlade"]
## Gear ids are never lost either (equipped or carried).
const GEAR_IDS: Array[String] = ["practiceSword", "copperSword", "woodBuckler", "copperHelm", "copperMail", "copperBoots"]


static func is_protected(id: String) -> bool:
	return PROTECTED.has(id) or GEAR_IDS.has(id)


## {minute, next_day} for a fall at `minute`.
static func wake_at(minute: int) -> Dictionary:
	if minute >= WAKE_EVENING:
		return {"minute": WAKE_MORNING, "next_day": true}
	return {"minute": WAKE_EVENING, "next_day": false}


## Loses half (rounded down, per stack) of `loot` from `bag`, never more than the bag holds and never a protected item.
## Returns {bag, lost: [{id, qty}]}.
static func lose_loot(bag: Array, loot: Array) -> Dictionary:
	var next := bag.duplicate(true)
	var lost: Array = []
	for entry: Variant in loot:
		var stack: Dictionary = entry
		var id: String = stack["id"]
		var qty: int = stack["qty"]
		if is_protected(id):
			continue
		var want := qty / 2
		var taken := 0
		for i: int in next.size():
			if taken >= want:
				break
			var cell: Variant = next[i]
			if cell == null:
				continue
			var held_stack: Dictionary = cell
			if held_stack["id"] != id:
				continue
			var held: int = held_stack["qty"]
			var take := mini(want - taken, held)
			next[i] = null if take == held else {"id": id, "qty": held - take}
			taken += take
		if taken > 0:
			lost.append({"id": id, "qty": taken})
	return {"bag": next, "lost": lost}


## The state after a fall: full HP, half the loot gone, loot list cleared, and the player in the clinic at the wake time.
## Returns {state, lost}.
static func fall(state: Dictionary) -> Dictionary:
	var next := state.duplicate(true)
	var bag: Array = next["bag"]
	var loot: Array = next["lootSinceSleep"]
	var result := lose_loot(bag, loot)
	next["bag"] = result["bag"]
	next["lootSinceSleep"] = []
	var level: int = next["level"]
	next["hp"] = Progression.max_hp(level)
	var cal: Dictionary = next["calendar"]
	var minute: int = cal["minute"]
	var wake := wake_at(minute)
	var wake_minute: int = wake["minute"]
	var advance: bool = wake["next_day"]
	var new_cal := Calendar.next_day(cal) if advance else cal.duplicate(true)
	new_cal["minute"] = wake_minute
	next["calendar"] = new_cal
	var player: Dictionary = next["player"]
	player["location"] = "clinic"
	player["x"] = CLINIC_SPAWN["x"]
	player["y"] = CLINIC_SPAWN["y"]
	player["floor"] = 0
	return {"state": next, "lost": result["lost"]}
