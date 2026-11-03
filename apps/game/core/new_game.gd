class_name NewGame
extends RefCounted
## New game creation, ported from packages/core/src/newGame.ts, at save version 3 (spec 5.1): TypeScript's
## version 2 new game with `player.stamina` renamed to `player.energy` and the version 3 keys at their start
## values. SaveMigrate.state_2_to_3 must produce the same state from TypeScript's (test_new_game.gd checks it).


## Seeds the field's "." cells with weeds, rocks and stumps. Returns [grid, rng].
static func _roll_obstacles(grid: Dictionary, rng: int) -> Array:
	var out := grid.duplicate(true)
	var tiles: Array = out["tiles"]
	var width: int = out["width"]
	var r := rng
	for y: int in Layouts.FARM_LAYOUT.size():
		var row: String = Layouts.FARM_LAYOUT[y]
		for x: int in row.length():
			if row[x] != ".":
				continue
			var res := Rng.next_float(r)
			var v: float = res[0]
			r = res[1]
			var tile: Dictionary
			if v < Balance.OBSTACLE_WEED:
				tile = {"kind": "weed"}
			elif v < Balance.OBSTACLE_WEED + Balance.OBSTACLE_ROCK:
				tile = {"kind": "rock", "hits": 0}
			elif v < Balance.OBSTACLE_WEED + Balance.OBSTACLE_ROCK + Balance.OBSTACLE_STUMP:
				tile = {"kind": "stump", "hits": 0}
			else:
				tile = {"kind": "grass"}
			tiles[y * width + x] = tile
	return [out, r]


## `opts`: seed, farmName, playerName and optionally lessons (default false).
static func create(opts: Dictionary) -> Dictionary:
	var seed_value: int = opts["seed"]
	var rolled := _roll_obstacles(Grid.parse_layout(Layouts.FARM_LAYOUT, Layouts.FARM_LEGEND), seed_value & 0xFFFFFFFF)
	var farm: Dictionary = rolled[0]
	var after_map: int = rolled[1]
	var forecast := Weather.roll("spring", 2, after_map)
	var tomorrow: String = forecast[0]
	var rng: int = forecast[1]
	var spawn := Grid.find_char(Layouts.FARM_LAYOUT, Layouts.FARM_SPAWN_CHAR)
	var bag: Array = []
	for i: int in Balance.BAG_SLOTS:
		bag.append(null)
	bag[0] = {"id": "seed:turnip", "qty": Balance.START_TURNIP_SEEDS}
	var lessons: bool = opts.get("lessons", false) == true
	return {
		"version": 3,
		"seed": seed_value,
		"rng": rng,
		"farmName": opts["farmName"],
		"playerName": opts["playerName"],
		"calendar": {"year": 1, "season": "spring", "day": 1, "minute": Balance.DAY_START_MINUTE},
		"weather": {"today": "sunny", "tomorrow": tomorrow},
		"player": {
			"location": "farm",
			"x": spawn.x + 0.5,
			"z": spawn.y + 0.5,
			"facing": "n",
			"energy": Balance.MAX_ENERGY,
			"floor": 0,
		},
		"canCharges": Balance.CAN_CHARGES,
		"activeSlot": 0,
		"selectedQuick": 0,
		"quickSlots": [0, null, null],
		"bag": bag,
		"bin": [],
		"gold": Balance.START_GOLD,
		"pendingGold": 0,
		"wakeHalfStamina": false,
		"maps": {"farm": farm, "house": Grid.parse_layout(Layouts.HOUSE_LAYOUT, Layouts.HOUSE_LEGEND)},
		"milestones": [],
		"harvested": {},
		"tutorial": {"lesson": "walkToField" if lessons else "off", "count": 0, "notesSeen": [], "gifted": false},
		"hp": Balance.BASE_MAX_HP,
		"xp": 0,
		"level": 1,
		"gear": {
			"weapon": null, "offHand": null, "head": null, "body": null, "feet": null, "trinket1": null, "trinket2": null,
		},
		"buff": null,
		"deeps": {"mossdeep": {"open": false, "cleared": false, "checkpoints": []}},
		"lootSinceSleep": [],
		"elites": {"mossmaw": {"defeatedSeason": null}},
		"rootstones": [],
		"kindlings": 0,
		"talked": [],
	}
