class_name ZoneView
extends Node3D
## The 3D view of one zone ("farm", "house" or "lowmere"), ported from the web scene's Tiles, TileModels, Features
## and HouseInterior. Tile (x, y) spans world x..x+1, z..y+1 (tiles are metres).
##
## Children: `Apron` (outdoors: a grass plane reaching past the map edges), `Ground` (one vertex-coloured mesh for
## the grid, grass in the season's colour), `Fences` (MultiMesh, never changes), `Static`
## (building masses, the pond, the house walls, furniture and lamp light) and `Tiles` (one Node3D per rock, weed,
## stump and feature tile, kept in a Vector2i-keyed dictionary). `sync` compares each tile with the last seen copy
## and rebuilds only the tiles that changed through `_apply_tile`. Tilled tiles also get a soil overlay under `Soil`
## and their crop under `Crops` (CropVisuals); a crop planted or grown a stage between syncs pops. Lowmere adds the
## villagers under `Villagers` (VillagerVisuals).
## The farm and house read their grids from `state.maps`; Lowmere is static (`Zones.grid`).

const BASE_ALBEDO_META := "base_albedo"

var zone: String = ""

var _width: int = 0
var _height: int = 0
## Deep copies of the tiles as last applied, indexed y * width + x.
var _last: Array[Dictionary] = []
var _nodes: Dictionary[Vector2i, Node3D] = {}
var _soil: Dictionary[Vector2i, MeshInstance3D] = {}
var _crops: Dictionary[Vector2i, Node3D] = {}
var _night: Array[StandardMaterial3D] = []
## Seasonal looks (AtmosphereDriver); they survive a rebuild and apply to every new tile.
var _grass_color: Color = TileVisuals.GRASS
var _foliage_tint: Color = Color.WHITE
## How many times a tint was really applied (an unchanged value returns early); tests read it.
var tint_apply_count: int = 0
var _tiles_root: Node3D = null
var _soil_root: Node3D = null
var _crops_root: Node3D = null


## Frees any previous zone and builds `zone` from `state` (ignored for Lowmere).
func build(zone_id: String, state: Dictionary) -> void:
	_clear()
	zone = zone_id
	var grid := _grid_of(state)
	_width = grid.get("width", 0)
	_height = grid.get("height", 0)
	if not Zones.is_interior(zone):
		add_child(TileVisuals.build_apron(grid, _grass_color))
	add_child(TileVisuals.build_ground(zone, grid, _grass_color))
	add_child(TileVisuals.build_fences(grid))
	if zone == "mossdeep":
		add_child(TileVisuals.build_walls(grid, TileVisuals.CAVE_WALL))
	elif zone == "clinic":
		add_child(TileVisuals.build_walls(grid, TileVisuals.CLINIC_WALL))
	var static_root := Node3D.new()
	static_root.name = "Static"
	add_child(static_root)
	for building: Node3D in FeatureVisuals.build_buildings(grid):
		static_root.add_child(building)
	var pond := FeatureVisuals.build_pond(grid)
	if pond != null:
		static_root.add_child(pond)
	if zone == "house":
		static_root.add_child(HouseInterior.build(grid))
	_tiles_root = Node3D.new()
	_tiles_root.name = "Tiles"
	add_child(_tiles_root)
	_soil_root = Node3D.new()
	_soil_root.name = "Soil"
	add_child(_soil_root)
	_crops_root = Node3D.new()
	_crops_root.name = "Crops"
	add_child(_crops_root)
	if zone == "lowmere":
		var villagers := Node3D.new()
		villagers.name = "Villagers"
		add_child(villagers)
		VillagerVisuals.spawn(villagers)
	var tiles: Array = grid.get("tiles", [])
	_last.resize(tiles.size())
	for i: int in tiles.size():
		var tile: Dictionary = tiles[i]
		_apply_tile(i % _width, i / _width, tile)
	set_night_factor(0.0)


## Rebuilds the tiles that differ from the last seen copy; returns how many changed.
func sync(state: Dictionary) -> int:
	if Zones.is_static(zone) or _width == 0:
		return 0
	var maps: Dictionary = state.get("maps", {})
	var grid: Dictionary = maps.get(zone, {})
	var tiles: Array = grid.get("tiles", [])
	if tiles.size() != _last.size():
		push_error("ZoneView.sync: %s grid size changed; rebuild the view instead" % zone)
		return 0
	var changed := 0
	for i: int in tiles.size():
		var tile: Dictionary = tiles[i]
		if tile == _last[i]:
			continue
		_apply_tile(i % _width, i / _width, tile, true)
		changed += 1
	return changed


## The node of tile (x, y): a rock, weed, stump or feature; null for every other tile.
func tile_node(x: int, y: int) -> Node3D:
	return _nodes.get(Vector2i(x, y))


## The soil overlay of tilled tile (x, y), or null.
func soil_node(x: int, y: int) -> MeshInstance3D:
	return _soil.get(Vector2i(x, y))


## The crop node on tile (x, y), or null.
func crop_node(x: int, y: int) -> Node3D:
	return _crops.get(Vector2i(x, y))


## How many tile nodes (rocks, weeds, stumps, features) the view holds; soil and crops are counted apart.
func node_count() -> int:
	return _nodes.size()


## Night glow of the farmhouse window (Features.tsx: emissive 0.15 + nightFactor * 3). AtmosphereDriver calls it.
func set_night_factor(f: float) -> void:
	for mat: StandardMaterial3D in _night:
		mat.emission_energy_multiplier = (
			FeatureVisuals.WINDOW_EMISSION_DAY + clampf(f, 0.0, 1.0) * FeatureVisuals.WINDOW_EMISSION_NIGHT
		)


## The season's grass colour: rebuilds the ground mesh with it in the grass tiles' vertex colours (paths, floors
## and the pond keep theirs) and recolours the apron. Only on a season change (AtmosphereDriver), never per frame.
func set_grass_color(color: Color) -> void:
	if color == _grass_color:
		return
	_grass_color = color
	tint_apply_count += 1
	var ground := get_node_or_null("Ground") as MeshInstance3D
	if ground != null and _width > 0:
		var fresh := TileVisuals.build_ground(zone, _grid_of_last(), _grass_color)
		ground.mesh = fresh.mesh
		fresh.free()
	var apron := get_node_or_null("Apron") as MeshInstance3D
	if apron != null:
		(apron.material_override as StandardMaterial3D).albedo_color = color


func grass_color() -> Color:
	return _grass_color


## Multiplies the albedo of the foliage the zone holds. Limitation: only weed tiles are foliage in the zones today
## (trees and bushes are not placed yet, crops keep their own colours), so only weeds are tinted. The shared matte
## material cache is never touched: each weed surface gets its own copy remembering its base colour in meta.
func set_foliage_tint(color: Color) -> void:
	if color == _foliage_tint:
		return
	_foliage_tint = color
	tint_apply_count += 1
	for key: Vector2i in _nodes:
		_tint_foliage(key)


func _tint_foliage(key: Vector2i) -> void:
	var tile: Dictionary = _last[key.y * _width + key.x]
	if tile["kind"] != "weed":
		return
	for found: Node in _nodes[key].find_children("*", "MeshInstance3D", true, false):
		var mi: MeshInstance3D = found as MeshInstance3D
		if mi.mesh == null:
			continue
		for s: int in mi.mesh.get_surface_count():
			var mat := mi.get_active_material(s) as StandardMaterial3D
			if mat == null:
				continue
			if not mat.has_meta(BASE_ALBEDO_META):
				mat = mat.duplicate() as StandardMaterial3D
				mat.set_meta(BASE_ALBEDO_META, mat.albedo_color)
				mi.set_surface_override_material(s, mat)
			var base: Color = mat.get_meta(BASE_ALBEDO_META)
			mat.albedo_color = Color(base.r * _foliage_tint.r, base.g * _foliage_tint.g, base.b * _foliage_tint.b, base.a)


## Replaces whatever stands on tile (x, y) with the visuals for `tile` and records it as seen. With `animate` (a
## sync), a crop that was planted or grew a stage since the last copy pops.
func _apply_tile(x: int, y: int, tile: Dictionary, animate: bool = false) -> void:
	var key := Vector2i(x, y)
	var previous: Dictionary = _last[y * _width + x]
	_drop(_nodes, key)
	_drop(_soil, key)
	_drop(_crops, key)
	_last[y * _width + x] = tile.duplicate(true)
	var node: Node3D = null
	var kind: String = tile["kind"]
	if TileVisuals.is_obstacle(kind):
		node = TileVisuals.build_obstacle(tile, x, y, _width)
	elif kind == "feature":
		var id: String = tile["feature"]
		node = FeatureVisuals.build_feature(id, x, y, _grid_dims(), _night)
	elif kind == "tilled":
		_apply_soil(key, tile, previous, animate)
	if node != null:
		_nodes[key] = node
		_tiles_root.add_child(node)
		if _foliage_tint != Color.WHITE:
			_tint_foliage(key)


func _apply_soil(key: Vector2i, tile: Dictionary, previous: Dictionary, animate: bool) -> void:
	var soil := CropVisuals.build_soil(tile, key.x, key.y)
	_soil[key] = soil
	_soil_root.add_child(soil)
	if not tile.has("crop"):
		return
	var crop: Dictionary = tile["crop"]
	var node := CropVisuals.build_crop(crop, key.x, key.y, _width)
	_crops[key] = node
	_crops_root.add_child(node)
	if animate and _popped(crop, previous):
		CropVisuals.pop(node)


## Whether `crop` was planted or grew a stage since `previous` (the web pops on cropPlanted and cropGrew; a harvest
## that leaves a regrowing crop does not pop).
static func _popped(crop: Dictionary, previous: Dictionary) -> bool:
	if not previous.has("crop"):
		return true
	var before: Dictionary = previous["crop"]
	if before["id"] != crop["id"]:
		return true
	var age_before: int = before["age"]
	var age_now: int = crop["age"]
	return age_now > age_before and Crops.crop_stage(crop) != Crops.crop_stage(before)


## Frees and forgets the node at `key` in `nodes`, if any.
static func _drop(nodes: Dictionary, key: Vector2i) -> void:
	var old: Node = nodes.get(key)
	if old == null:
		return
	nodes.erase(key)
	old.get_parent().remove_child(old)
	old.free()


## The tiles as last applied, as a grid (the ground's kinds never change between rebuilds of a tile).
func _grid_of_last() -> Dictionary:
	return {"width": _width, "height": _height, "tiles": _last}


func _grid_dims() -> Dictionary:
	return {"width": _width, "height": _height}


func _grid_of(state: Dictionary) -> Dictionary:
	if zone == "mossdeep":
		return GameStateUtil.current_grid(state)
	if Zones.is_static(zone):
		return Zones.grid(zone)
	var maps: Dictionary = state.get("maps", {})
	var grid: Dictionary = maps.get(zone, {})
	if grid.is_empty():
		push_error("ZoneView: no %s grid in the state" % zone)
	return grid


func _clear() -> void:
	for child: Node in get_children():
		remove_child(child)
		child.free()
	_nodes.clear()
	_soil.clear()
	_crops.clear()
	_last.clear()
	_night.clear()
	_tiles_root = null
	_soil_root = null
	_crops_root = null
	_width = 0
	_height = 0
