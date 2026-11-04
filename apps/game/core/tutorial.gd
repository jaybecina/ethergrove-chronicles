class_name Tutorial
extends RefCounted
## Grandpa's lessons, ported from packages/core/src/systems/tutorial.ts. Pure: the tutorial state lives in
## `state["tutorial"]` ({lesson, count, notesSeen, gifted}). `advance` is the post-pass applyCommand runs after every
## command. `start_lesson` appends to the `events` array it is given (like the TypeScript), but never mutates `state`.


static func _farm_tiles(s: Dictionary) -> Array:
	var maps: Dictionary = s["maps"]
	var farm: Dictionary = maps["farm"]
	var tiles: Array = farm["tiles"]
	return tiles


static func _crop_count(s: Dictionary) -> int:
	var n := 0
	for t_v: Variant in _farm_tiles(s):
		var t: Dictionary = t_v
		if t.has("crop"):
			n += 1
	return n


static func _all_watered(s: Dictionary) -> bool:
	var crops := 0
	for t_v: Variant in _farm_tiles(s):
		var t: Dictionary = t_v
		if t.has("crop"):
			crops += 1
			if t.get("watered", false) != true:
				return false
	return crops > 0


static func _is_seed(cell: Variant) -> bool:
	if cell == null:
		return false
	var stack: Dictionary = cell
	var id: String = stack["id"]
	return id.begins_with("seed:")


static func _has_seed(s: Dictionary) -> bool:
	var bag: Array = s["bag"]
	for cell: Variant in bag:
		if _is_seed(cell):
			return true
	return false


static func _bin_total(s: Dictionary) -> int:
	var n := 0
	var bin: Array = s["bin"]
	for c_v: Variant in bin:
		var c: Dictionary = c_v
		var qty: int = c["qty"]
		n += qty
	return n


static func _in_field(s: Dictionary) -> bool:
	var player: Dictionary = s["player"]
	var px: float = player["x"]
	var pz: float = player["z"]
	var x := floori(px)
	var y := floori(pz)
	var r: Dictionary = Layouts.FIELD_RECT
	var x0: int = r["x0"]
	var y0: int = r["y0"]
	var x1: int = r["x1"]
	var y1: int = r["y1"]
	return player["location"] == "farm" and x >= x0 and x <= x1 and y >= y0 and y <= y1


static func _count(events: Array, type: String) -> int:
	var n := 0
	for e_v: Variant in events:
		var e: Dictionary = e_v
		if e["type"] == type:
			n += 1
	return n


static func _lesson_of(s: Dictionary) -> String:
	var tutorial: Dictionary = s["tutorial"]
	var lesson: String = tutorial["lesson"]
	return lesson


static func _tutorial_count(s: Dictionary) -> int:
	var tutorial: Dictionary = s["tutorial"]
	var count: int = tutorial["count"]
	return count


## Spec 3.2, "Done when".
static func _is_done(id: String, prev: Dictionary, next: Dictionary, events: Array) -> bool:
	var goal: int = Lessons.LESSON_GOAL.get(id, 0)
	var count := _tutorial_count(next)
	match id:
		"walkToField":
			return _in_field(next)
		"till":
			return count >= goal
		"plant":
			return count >= goal or (count >= 1 and not _has_seed(next))
		"water", "waterDaily":
			return _all_watered(next)
		"sleep":
			return _count(events, "dayStarted") > 0
		"harvest":
			return _count(events, "cropHarvested") > 0
		"ship":
			return _bin_total(next) > _bin_total(prev)
		"sellOvernight":
			for e_v: Variant in events:
				var e: Dictionary = e_v
				if e["type"] == "shippingReport":
					var total: int = e["total"]
					if total > 0:
						return true
			return false
		"buySeeds":
			var bought := false
			var spent := false
			for e_v: Variant in events:
				var e: Dictionary = e_v
				if e["type"] == "itemGained":
					var item: String = e["item"]
					if item.begins_with("seed:"):
						bought = true
				elif e["type"] == "goldChanged":
					var delta: int = e["delta"]
					if delta < 0:
						spent = true
			return bought and spent
		_:
			return false


## Spec 3.2, "Already done when it starts".
static func _done_at_start(id: String, s: Dictionary) -> bool:
	match id:
		"walkToField":
			return _in_field(s)
		"till":
			var bare := 0
			for t_v: Variant in _farm_tiles(s):
				var t: Dictionary = t_v
				if t["kind"] == "tilled" and not t.has("crop"):
					bare += 1
			return bare >= 3 or _crop_count(s) >= 3
		"plant":
			return _crop_count(s) >= 3
		"water", "waterDaily":
			return _all_watered(s)
		"ship":
			var bin: Array = s["bin"]
			return bin.size() > 0
		_:
			return false


## Ends the path. The gift is paid once per save; a restarted path completes with no gift.
static func _complete(state: Dictionary, events: Array) -> Dictionary:
	var out := state.duplicate(true)
	var tutorial: Dictionary = out["tutorial"]
	tutorial["lesson"] = "complete"
	tutorial["count"] = 0
	var already_gifted: bool = tutorial["gifted"]
	tutorial["gifted"] = true
	if already_gifted:
		events.append({"type": "lessonsComplete", "gift": 0})
		return out
	var gold: int = out["gold"]
	gold += Lessons.LESSONS_GIFT
	out["gold"] = gold
	events.append({"type": "goldChanged", "gold": gold, "delta": Lessons.LESSONS_GIFT})
	events.append({"type": "lessonsComplete", "gift": Lessons.LESSONS_GIFT})
	return out


## Starts a lesson, passing straight through any the farm already satisfies (spec 3.4). Appends to `events`.
static func start_lesson(state: Dictionary, id: String, events: Array) -> Dictionary:
	var s := state.duplicate(true)
	var lesson := id
	while lesson != "":
		var tutorial: Dictionary = s["tutorial"]
		tutorial["lesson"] = lesson
		tutorial["count"] = 0
		events.append({"type": "lessonStarted", "id": lesson})
		if not _done_at_start(lesson, s):
			return s
		events.append({"type": "lessonDone", "id": lesson})
		var next_index := Lessons.LESSON_ORDER.find(lesson) + 1
		lesson = Lessons.LESSON_ORDER[next_index] if next_index < Lessons.LESSON_ORDER.size() else ""
	return _complete(s, events)


static func _season_seeds(s: Dictionary) -> Array[String]:
	var calendar: Dictionary = s["calendar"]
	var out: Array[String] = []
	for c: String in CropData.CROP_IDS:
		var def: Dictionary = CropData.CROPS[c]
		if def["season"] == calendar["season"]:
			out.append(c)
	return out


static func _has_season_seed(s: Dictionary) -> bool:
	var bag: Array = s["bag"]
	var seeds := _season_seeds(s)
	for cell: Variant in bag:
		if cell == null:
			continue
		var stack: Dictionary = cell
		for crop: String in seeds:
			if stack["id"] == "seed:" + crop:
				return true
	return false


## Spec 3.5: never trap the player on a lesson they can no longer finish.
static func _adapt(state: Dictionary, events: Array) -> Dictionary:
	var s := state
	var lesson := _lesson_of(s)
	var needs_crops := lesson == "plant" or lesson == "water" or lesson == "waterDaily" or lesson == "harvest"
	if needs_crops and _crop_count(s) == 0:
		if _has_season_seed(s):
			return s if lesson == "plant" else start_lesson(s, "plant", events)
		s = start_lesson(s, "buySeeds", events)
	if _lesson_of(s) != "buySeeds" or _has_seed(s) or _crop_count(s) > 0:
		return s
	var costs: Array[int] = []
	for c: String in _season_seeds(s):
		var def: Dictionary = CropData.CROPS[c]
		var cost: int = def["seedCost"]
		costs.append(cost)
	var gold: int = s["gold"]
	var cheapest: int = 0 if costs.is_empty() else costs.min()
	var broke: bool = costs.is_empty() or gold < cheapest
	return _complete(s, events) if broke else s


static func _failed(events: Array, reason: String) -> bool:
	for e_v: Variant in events:
		var e: Dictionary = e_v
		if e["type"] == "actionFailed" and e["reason"] == reason:
			return true
	return false


## Spec 3.7 triggers.
static func _triggered(id: String, next: Dictionary, events: Array) -> bool:
	match id:
		"canEmpty", "wrongSeason", "bagFull", "cartClosed":
			return _failed(events, id)
		"staminaLow", "exhausted", "passedOut":
			return _count(events, id) > 0
		"rain":
			var weather: Dictionary = next["weather"]
			return _count(events, "dayStarted") > 0 and (weather["today"] == "rain" or weather["today"] == "storm")
		"newSeason":
			return _count(events, "seasonChanged") > 0
		"obstacles":
			var missed := _failed(events, "noTarget")
			for e_v: Variant in events:
				var e: Dictionary = e_v
				if e["type"] == "toolUsed" and not e.get("hit", false):
					missed = true
			if not missed:
				return false
			var player: Dictionary = next["player"]
			var grid := GameStateUtil.current_grid(next)
			var t := Grid.target_tile(player)
			var tile: Variant = Grid.tile_at(grid, t.x, t.y)
			if tile == null:
				return false
			var kind: String = (tile as Dictionary)["kind"]
			return kind == "weed" or kind == "rock" or kind == "stump"
		_:
			return false


## Shows at most one unseen note whose trigger fired in this command's `events`; appends to `out`.
static func _note(s: Dictionary, events: Array, out: Array) -> Dictionary:
	var tutorial: Dictionary = s["tutorial"]
	var seen: Array = tutorial["notesSeen"]
	for id: String in Lessons.NOTE_IDS:
		if seen.has(id) or not _triggered(id, s, events):
			continue
		out.append({"type": "noteShown", "id": id})
		var next := s.duplicate(true)
		var next_tutorial: Dictionary = next["tutorial"]
		var next_seen: Array = next_tutorial["notesSeen"]
		next_seen.append(id)
		return next
	return s


## Runs after every command (spec 3.3). Pure; touches only `tutorial` and the gift's `gold`.
static func advance(prev: Dictionary, next: Dictionary, events: Array) -> Dictionary:
	var lesson := _lesson_of(next)
	if lesson == "off":
		return GameStateUtil.result(next, events)
	var out := events.duplicate(true)
	var s := next
	if lesson != "complete":
		# 1. count
		if lesson == "till" or lesson == "plant":
			var add := _count(events, "tileTilled" if lesson == "till" else "cropPlanted")
			if add > 0:
				s = s.duplicate(true)
				var tutorial: Dictionary = s["tutorial"]
				var count: int = tutorial["count"]
				tutorial["count"] = count + add
		# 2. done -> next lesson (or complete past the last one)
		if _is_done(lesson, prev, s, events):
			out.append({"type": "lessonDone", "id": lesson})
			var following_index := Lessons.LESSON_ORDER.find(lesson) + 1
			# Seeds bought after losing every crop (adaptive rule) lead back to planting until the
			# player has made a first sale, so harvest, ship and sell still get taught.
			var milestones: Array = s["milestones"]
			var replant := lesson == "buySeeds" and not milestones.has("firstShipment")
			if replant:
				s = start_lesson(s, "plant", out)
			elif following_index < Lessons.LESSON_ORDER.size():
				s = start_lesson(s, Lessons.LESSON_ORDER[following_index], out)
			else:
				s = _complete(s, out)
		# 3. adaptive rules
		s = _adapt(s, out)
	# 4. notes (also after completion)
	s = _note(s, events, out)
	return GameStateUtil.result(s, out)


static func skip_lessons(state: Dictionary) -> Dictionary:
	if _lesson_of(state) == "off":
		return GameStateUtil.result(state, [])
	var out := state.duplicate(true)
	var tutorial: Dictionary = out["tutorial"]
	tutorial["lesson"] = "off"
	tutorial["count"] = 0
	return GameStateUtil.result(out, [])


static func restart_lessons(state: Dictionary) -> Dictionary:
	var events: Array = []
	var s := start_lesson(state, "walkToField", events)
	return GameStateUtil.result(s, events)


## Nearest tile by Manhattan distance; the row-major scan keeps the lower y, then lower x, on ties.
## `matches` is called as (tile: Dictionary, x: int, y: int) -> bool. Returns a Vector2i, or null when none match.
static func _nearest(grid: Dictionary, from: Vector2i, matches: Callable) -> Variant:
	var tiles: Array = grid["tiles"]
	var width: int = grid["width"]
	var best: Variant = null
	var best_d := 1 << 30
	for i: int in tiles.size():
		var t: Dictionary = tiles[i]
		var x := i % width
		var y := i / width
		var ok: bool = matches.call(t, x, y)
		if not ok:
			continue
		var dist := absi(x - from.x) + absi(y - from.y)
		if dist < best_d:
			best = Vector2i(x, y)
			best_d = dist
	return best


static func _field_grass(t: Dictionary, x: int, y: int) -> bool:
	var r: Dictionary = Layouts.FIELD_RECT
	var x0: int = r["x0"]
	var y0: int = r["y0"]
	var x1: int = r["x1"]
	var y1: int = r["y1"]
	return t["kind"] == "grass" and x >= x0 and x <= x1 and y >= y0 and y <= y1


static func _bare_soil(t: Dictionary, _x: int, _y: int) -> bool:
	return t["kind"] == "tilled" and not t.has("crop")


static func _dry_crop(t: Dictionary, _x: int, _y: int) -> bool:
	return t.has("crop") and t.get("watered", false) != true


static func _mature_crop(t: Dictionary, _x: int, _y: int) -> bool:
	if not t.has("crop"):
		return false
	var crop: Dictionary = t["crop"]
	return Crops.is_mature(crop)


static func _located(location: String, p: Variant) -> Dictionary:
	if p == null:
		return {}
	var v: Vector2i = p
	return {"location": location, "x": v.x, "y": v.y}


## Where the marker goes for the active lesson (spec 3.9): {location, x, y}, or {} for none.
static func lesson_target(state: Dictionary) -> Dictionary:
	var lesson := _lesson_of(state)
	if lesson == "off" or lesson == "complete":
		return {}
	var maps: Dictionary = state["maps"]
	var farm: Dictionary = maps["farm"]
	var house: Dictionary = maps["house"]
	var player: Dictionary = state["player"]
	var here: String = player["location"]
	# Beyond Lowmere (the Woods, the clinic, Mossdeep) the lessons have nothing to point at.
	if here != "farm" and here != "house" and here != "lowmere":
		return {}
	if here == "lowmere":
		var gate := Grid.find_feature(Zones.grid("lowmere"), "toFarm")
		return {"location": here, "x": gate.x, "y": gate.y}
	var px: float = player["x"]
	var pz: float = player["z"]
	# Positions measured from the player only make sense on the farm; in the house use the door.
	var origin := Vector2i(floori(px), floori(pz)) if here == "farm" else Grid.find_feature(farm, "houseDoor")
	var target: Dictionary = {}
	match lesson:
		"walkToField", "till":
			target = _located("farm", _nearest(farm, origin, _field_grass))
		"plant":
			var soil: Variant = _nearest(farm, origin, _bare_soil)
			target = _located("farm", soil if soil != null else _nearest(farm, origin, _field_grass))
		"water", "waterDaily":
			target = _located("farm", _nearest(farm, origin, _dry_crop))
		"harvest":
			target = _located("farm", _nearest(farm, origin, _mature_crop))
		"sleep", "sellOvernight":
			target = _located("house", Grid.find_feature(house, "bed"))
		"ship":
			target = _located("farm", Grid.find_feature(farm, "bin"))
		"buySeeds":
			target = _located("farm", Grid.find_feature(farm, "cart"))
	if target.is_empty() or target["location"] == here:
		return target
	var door := Grid.find_feature(_dict(maps[here]), "houseDoor" if here == "farm" else "exitDoor")
	return {"location": here, "x": door.x, "y": door.y}


static func _dict(v: Variant) -> Dictionary:
	var out: Dictionary = v
	return out


## The hotbar slot the active lesson wants (spec 3.9), or -1 for none.
static func lesson_slot(state: Dictionary) -> int:
	match _lesson_of(state):
		"till":
			return 0
		"water", "waterDaily":
			return 1
		"harvest":
			return 2
		"plant":
			var quick: Array = state["quickSlots"]
			var bag: Array = state["bag"]
			for i: int in quick.size():
				var b: Variant = quick[i]
				if b == null:
					continue
				var idx: int = b
				if idx >= 0 and idx < bag.size() and _is_seed(bag[idx]):
					return 5 + i
			return -1
		_:
			return -1
