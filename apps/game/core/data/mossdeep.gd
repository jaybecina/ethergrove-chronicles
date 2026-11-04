class_name Mossdeep
extends RefCounted
## Mossdeep, the first Deep under the old well in Lowmere Woods (M1 spec 6.1, 6.3, 6.4): floor 0 is the entrance chamber
## (checkpoint stone, ladder up to the Woods), floors 1-8 are the Deep itself. Floors are generated from the floor number
## alone, so they are the same every time and never saved; only what you did in them is (`deeps.mossdeep`).
## Pure: every rule returns {state, events} like the rest of the core.

const FLOORS := 8
const FLOOR_HEIGHT := 18
const ROOM_WIDTH := 11
const ROOM_HEIGHT := 10
const ROOM_STEP := 16
## Row of the corridors and of the stairs (inside every room's rows).
const DOOR_ROW := 8
const FIRST_FLOOR_XP := Progression.FIRST_FLOOR_XP
const NODE_SWINGS := 2
const NODE_ENERGY := 4
## The first day of the opening rule (spec 6.3): Spring Year 1, day 8, or the first shipment, whichever comes later.
const OPEN_DAY := 8

static var _cache: Dictionary = {}


## Spring Y1 day 8 or later, and the first shipment made.
static func is_open(state: Dictionary) -> bool:
	var milestones: Array = state["milestones"]
	if not milestones.has("firstShipment"):
		return false
	var cal: Dictionary = state["calendar"]
	var year: int = cal["year"]
	var season: String = cal["season"]
	var day: int = cal["day"]
	return year > 1 or season != "spring" or day >= OPEN_DAY


## Interior rectangles of the rooms of `floor_n` (the entrance chamber is one wide room).
static func rooms(floor_n: int) -> Array[Rect2i]:
	var out: Array[Rect2i] = []
	if floor_n == 0:
		out.append(Rect2i(2, 3, 12, ROOM_HEIGHT))
		return out
	var count := 3 if floor_n % 2 == 0 else 4
	for i: int in count:
		out.append(Rect2i(2 + i * ROOM_STEP, 3 if i % 2 == 0 else 5, ROOM_WIDTH, ROOM_HEIGHT))
	return out


static func grid(floor_n: int) -> Dictionary:
	if not _cache.has(floor_n):
		_cache[floor_n] = build_floor(floor_n)
	var g: Dictionary = _cache[floor_n]
	return g


## Builds the grid of a floor: wall everywhere, floor in the rooms and corridors, then the features.
static func build_floor(floor_n: int) -> Dictionary:
	var room_list := rooms(floor_n)
	var last := room_list[room_list.size() - 1]
	var width := last.position.x + last.size.x + 3
	var tiles: Array = []
	for i: int in width * FLOOR_HEIGHT:
		tiles.append({"kind": "wall"})
	var floor_tile := {"kind": "floor"}
	for r: Rect2i in room_list:
		for y: int in range(r.position.y, r.position.y + r.size.y):
			for x: int in range(r.position.x, r.position.x + r.size.x):
				tiles[y * width + x] = floor_tile.duplicate()
	for i: int in room_list.size() - 1:
		var from_x := room_list[i].position.x + room_list[i].size.x
		var to_x := room_list[i + 1].position.x
		for x: int in range(from_x, to_x):
			for y: int in [DOOR_ROW, DOOR_ROW + 1]:
				tiles[y * width + x] = floor_tile.duplicate()
	tiles[DOOR_ROW * width + 1] = {"kind": "feature", "feature": "stairsUp"}
	if floor_n < FLOORS:
		var down_x := last.position.x + last.size.x
		tiles[DOOR_ROW * width + down_x] = {"kind": "feature", "feature": "stairsDown"}
	if floor_n == 0 or floor_n == 4 or floor_n == 8:
		var first := room_list[0]
		tiles[(first.position.y + 2) * width + first.position.x + 5] = {"kind": "feature", "feature": "checkpointStone"}
	if floor_n >= 1:
		var n := room_list.size()
		if floor_n == FLOORS:
			var arena := room_list[2]
			tiles[arena.position.y * width + arena.position.x + 9] = {"kind": "feature", "feature": "lantern"}
			tiles[arena.position.y * width + arena.position.x + 10] = {"kind": "feature", "feature": "brokenBlade"}
		var count := 2 + floor_n % 3
		for k: int in count:
			var r := room_list[1 + (k % (n - 1))]
			var x := r.position.x + 2 + ((floor_n * 7 + k * 5) % (r.size.x - 4))
			tiles[r.position.y * width + x] = {"kind": "feature", "feature": "copperNode"}
	return {"width": width, "height": FLOOR_HEIGHT, "tiles": tiles}


## Where the player stands on arriving at `floor_n`: "up" is from above (beside the ladder or stairs up, facing east), "down"
## is from below (beside the stairs down, facing west).
static func arrival(floor_n: int, from: String) -> Vector2:
	if from == "up":
		return Vector2(2.5, DOOR_ROW + 0.5)
	var last := rooms(floor_n)[rooms(floor_n).size() - 1]
	return Vector2(last.position.x + last.size.x - 0.5, DOOR_ROW + 0.5)


## The floor's grid with the copper nodes you have already mined turned into floor.
static func grid_for(state: Dictionary) -> Dictionary:
	var player: Dictionary = state["player"]
	var floor_n: int = player["floor"]
	var base := grid(floor_n)
	var nodes := _nodes(state)
	if nodes.is_empty():
		return base
	var out := base.duplicate(true)
	var width: int = out["width"]
	var tiles: Array = out["tiles"]
	for key: String in nodes.keys():
		var parts := key.split(":")
		if parts.size() != 3 or parts[0].to_int() != floor_n:
			continue
		var hits: int = nodes[key]
		if hits >= NODE_SWINGS:
			tiles[parts[2].to_int() * width + parts[1].to_int()] = {"kind": "floor"}
	return out


static func _nodes(state: Dictionary) -> Dictionary:
	var deeps: Dictionary = state["deeps"]
	var m: Dictionary = deeps["mossdeep"]
	var nodes: Dictionary = m.get("nodes", {})
	return nodes


## How many copper nodes of the player's floor are mined (the view rebuilds when it changes).
static func mined_count(state: Dictionary) -> int:
	var player: Dictionary = state["player"]
	var floor_n: int = player["floor"]
	var count := 0
	var nodes := _nodes(state)
	for key: String in nodes.keys():
		var hits: int = nodes[key]
		if key.begins_with("%d:" % floor_n) and hits >= NODE_SWINGS:
			count += 1
	return count


static func level_for_floor(floor_n: int) -> int:
	return clampi(roundi(1.0 + (floor_n - 1) * 7.0 / 6.0), 1, 8)


static func _hash(a: int, b: int, c: int) -> int:
	return ((a * 73856093) ^ (b * 19349663) ^ (c * 83492791)) & 0x7FFFFFFF


## The regular enemies of a floor: [{id, level, x, y}]. Floors 1-3 burrowers and wisps, 4-7 add brutes; the entrance chamber
## and the boss floor have none. Nothing spawns in the first room.
static func spawns(floor_n: int) -> Array:
	var out: Array = []
	if floor_n < 1 or floor_n > 7:
		return out
	var room_list := rooms(floor_n)
	var g := grid(floor_n)
	var base_level := level_for_floor(floor_n)
	for ri: int in range(1, room_list.size()):
		var r := room_list[ri]
		var kinds: Array[String] = ["burrower", "burrower", "wisp"]
		if floor_n >= 4:
			kinds.append("brute")
		for k: int in kinds.size():
			var id := kinds[k]
			var h := _hash(floor_n, ri, k + 1)
			var wanted := Vector2(r.position.x + 1 + h % (r.size.x - 2), r.position.y + 2 + (h / 7) % (r.size.y - 3))
			var spot := _free_near(g, wanted)
			out.append({"id": id, "level": Enemies.clamp_level(id, base_level), "x": spot.x, "y": spot.y})
	return out


static func _free_near(g: Dictionary, wanted: Vector2) -> Vector2:
	for radius: int in 5:
		for dx: int in range(-radius, radius + 1):
			for dy: int in range(-radius, radius + 1):
				var tx := floori(wanted.x) + dx
				var ty := floori(wanted.y) + dy
				if not Grid.is_blocked(Grid.tile_at(g, tx, ty)):
					return Vector2(tx + 0.5, ty + 0.5)
	return wanted


# --- rules ----------------------------------------------------------------------------------------------------

static func _move(state: Dictionary, location: String, floor_n: int, at: Vector2, facing: String) -> Dictionary:
	var out := state.duplicate(true)
	var player: Dictionary = out["player"]
	player["location"] = location
	player["floor"] = floor_n
	player["x"] = at.x
	player["z"] = at.y
	player["facing"] = facing
	return out


## Climbs down the well to `floor_n` (0 = the entrance, or a recorded checkpoint floor).
static func enter(state: Dictionary, floor_n: int) -> Dictionary:
	if not is_open(state):
		return GameStateUtil.fail(state, "wellBlocked")
	var deeps: Dictionary = state["deeps"]
	var m: Dictionary = deeps["mossdeep"]
	var checkpoints: Array = m["checkpoints"]
	if floor_n != 0 and not checkpoints.has(floor_n):
		return GameStateUtil.fail(state, "noCheckpoint")
	var out := _move(state, "mossdeep", floor_n, arrival(floor_n, "up"), "e")
	return GameStateUtil.result(out, [{"type": "locationChanged", "location": "mossdeep"}])


static func stairs_down(state: Dictionary) -> Dictionary:
	var player: Dictionary = state["player"]
	var floor_n: int = player["floor"]
	if floor_n >= FLOORS:
		return GameStateUtil.fail(state, "noTarget")
	var next_floor := floor_n + 1
	var out := _move(state, "mossdeep", next_floor, arrival(next_floor, "up"), "e")
	var deeps: Dictionary = out["deeps"]
	var m: Dictionary = deeps["mossdeep"]
	var deepest: int = m.get("deepest", 0)
	var first := next_floor > deepest
	var events: Array = [{"type": "floorEntered", "floor": next_floor, "firstTime": first}]
	if first:
		m["deepest"] = next_floor
		var level: int = out["level"]
		var xp: int = out["xp"]
		var r := Progression.add_xp(level, xp, FIRST_FLOOR_XP)
		out["level"] = r["level"]
		out["xp"] = r["xp"]
		var gained: int = r["levels_gained"]
		if gained > 0:
			var new_level: int = out["level"]
			out["hp"] = Progression.max_hp(new_level)
		events.append({"type": "xpGained", "amount": FIRST_FLOOR_XP})
	return GameStateUtil.result(out, events)


static func stairs_up(state: Dictionary) -> Dictionary:
	var player: Dictionary = state["player"]
	var floor_n: int = player["floor"]
	if floor_n == 0:
		var out := _move(state, "woods", 0, Zones.WOODS_WELL_ARRIVAL, "e")
		return GameStateUtil.result(out, [{"type": "locationChanged", "location": "woods"}])
	var prev := floor_n - 1
	var out2 := _move(state, "mossdeep", prev, arrival(prev, "down"), "w")
	return GameStateUtil.result(out2, [{"type": "floorEntered", "floor": prev, "firstTime": false}])


static func touch_checkpoint(state: Dictionary) -> Dictionary:
	var player: Dictionary = state["player"]
	var floor_n: int = player["floor"]
	var out := state.duplicate(true)
	var deeps: Dictionary = out["deeps"]
	var m: Dictionary = deeps["mossdeep"]
	var checkpoints: Array = m["checkpoints"]
	if checkpoints.has(floor_n):
		return GameStateUtil.result(out, [])
	checkpoints.append(floor_n)
	checkpoints.sort()
	return GameStateUtil.result(out, [{"type": "checkpointRecorded", "floor": floor_n}])


## One pickaxe swing at the copper node on tile (x, y): 4 Energy, and the second swing breaks it for 1-2 ore.
static func mine(state: Dictionary, x: int, y: int) -> Dictionary:
	var player: Dictionary = state["player"]
	var floor_n: int = player["floor"]
	var energy: int = player["energy"]
	if energy < NODE_ENERGY:
		return GameStateUtil.fail(state, "tooTired")
	var spent := Tools.spend_energy(state, NODE_ENERGY)
	var out: Dictionary = spent["state"]
	var events: Array = spent["events"]
	var deeps: Dictionary = out["deeps"]
	var m: Dictionary = deeps["mossdeep"]
	var nodes: Dictionary = m.get("nodes", {})
	var key := "%d:%d:%d" % [floor_n, x, y]
	var hits: int = nodes.get(key, 0)
	hits += 1
	nodes[key] = hits
	m["nodes"] = nodes
	if hits < NODE_SWINGS:
		events.append({"type": "copperHit", "hits": hits})
		return GameStateUtil.result(out, events)
	var qty := 1 + (x + y + floor_n) % 2
	var bag: Array = out["bag"]
	var added := Bag.add_item(bag, "copperOre", qty)
	var overflow: int = added["overflow"]
	if overflow > 0:
		nodes[key] = hits - 1
		return GameStateUtil.fail(state, "bagFull")
	out["bag"] = added["bag"]
	var loot: Array = out["lootSinceSleep"]
	var merged := false
	for entry: Variant in loot:
		var stack: Dictionary = entry
		if stack["id"] == "copperOre":
			var held: int = stack["qty"]
			stack["qty"] = held + qty
			merged = true
	if not merged:
		loot.append({"id": "copperOre", "qty": qty})
	events.append({"type": "copperMined", "qty": qty})
	return GameStateUtil.result(out, events)


# --- the boss reward and the shrine ---------------------------------------------------------------------------

const BOSS_XP := Progression.BOSS_XP


static func boss_defeated(state: Dictionary) -> bool:
	var deeps: Dictionary = state["deeps"]
	var m: Dictionary = deeps["mossdeep"]
	var done: bool = m.get("bossDefeated", false)
	return done


## The Bramble Matron falls: 1000 XP and the Verdant Rootstone. Pays once; with a full bag nothing happens (she can be
## fought again) so the stone is never lost.
static func award_boss(state: Dictionary) -> Dictionary:
	if boss_defeated(state):
		return GameStateUtil.result(state, [])
	var bag: Array = state["bag"]
	var added := Bag.add_item(bag, "verdantRootstone", 1)
	var overflow: int = added["overflow"]
	if overflow > 0:
		return GameStateUtil.fail(state, "bagFull")
	var out := state.duplicate(true)
	out["bag"] = added["bag"]
	var deeps: Dictionary = out["deeps"]
	var m: Dictionary = deeps["mossdeep"]
	m["bossDefeated"] = true
	var level: int = out["level"]
	var xp: int = out["xp"]
	var r := Progression.add_xp(level, xp, BOSS_XP)
	out["level"] = r["level"]
	out["xp"] = r["xp"]
	var gained: int = r["levels_gained"]
	if gained > 0:
		var new_level: int = out["level"]
		out["hp"] = Progression.max_hp(new_level)
	return GameStateUtil.result(out, [
		{"type": "bossDefeated", "boss": "bramble_matron"},
		{"type": "xpGained", "amount": BOSS_XP},
		{"type": "itemGained", "item": "verdantRootstone"},
	])


## Interact at the Root Shrine carrying the Verdant Rootstone: it is placed, Mossdeep is cleared and the first Kindling
## wakes (M1 spec 6.5). Without the stone, or once placed, nothing happens.
static func place_rootstone(state: Dictionary) -> Dictionary:
	var rootstones: Array = state["rootstones"]
	var bag: Array = state["bag"]
	var removed: Variant = Bag.remove_item(bag, "verdantRootstone", 1)
	if removed == null or rootstones.has("verdant"):
		return GameStateUtil.fail(state, "noTarget")
	var out := state.duplicate(true)
	out["bag"] = removed
	var placed: Array = out["rootstones"]
	placed.append("verdant")
	var deeps: Dictionary = out["deeps"]
	var m: Dictionary = deeps["mossdeep"]
	m["cleared"] = true
	out["kindlings"] = 1
	return GameStateUtil.result(out, [{"type": "kindlingWoke"}])


# --- gifts and pickups -----------------------------------------------------------------------------------------

static func _pickups(state: Dictionary) -> Array:
	var deeps: Dictionary = state["deeps"]
	var m: Dictionary = deeps["mossdeep"]
	var list: Array = m.get("pickups", [])
	return list


## Hilda's practice sword: given once, the first time you talk to her after the well opens (M1 spec 6.3).
static func hilda_gift(state: Dictionary) -> Dictionary:
	if not is_open(state) or _pickups(state).has("practiceSword"):
		return GameStateUtil.result(state, [])
	var bag: Array = state["bag"]
	var added := Bag.add_item(bag, "practiceSword", 1)
	var overflow: int = added["overflow"]
	if overflow > 0:
		return GameStateUtil.result(state, [])
	var out := state.duplicate(true)
	out["bag"] = added["bag"]
	var deeps: Dictionary = out["deeps"]
	var m: Dictionary = deeps["mossdeep"]
	var list: Array = m.get("pickups", [])
	list.append("practiceSword")
	m["pickups"] = list
	return GameStateUtil.result(out, [{"type": "itemGained", "item": "practiceSword"}])


const PICKUP_ITEMS := {"lantern": "groundsLantern", "brokenBlade": "brokenBlade"}


## Takes Grandpa's lantern or broken blade from the arena (only once the Matron has fallen). Quest items: never lost.
static func pick_up(state: Dictionary, feature: String) -> Dictionary:
	var item: String = PICKUP_ITEMS.get(feature, "")
	if item == "" or not boss_defeated(state) or _pickups(state).has(item):
		return GameStateUtil.fail(state, "noTarget")
	var bag: Array = state["bag"]
	var added := Bag.add_item(bag, item, 1)
	var overflow: int = added["overflow"]
	if overflow > 0:
		return GameStateUtil.fail(state, "bagFull")
	var out := state.duplicate(true)
	out["bag"] = added["bag"]
	var deeps: Dictionary = out["deeps"]
	var m: Dictionary = deeps["mossdeep"]
	var list: Array = m.get("pickups", [])
	list.append(item)
	m["pickups"] = list
	return GameStateUtil.result(out, [{"type": "itemGained", "item": item}])
