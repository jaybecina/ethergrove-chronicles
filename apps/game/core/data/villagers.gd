class_name Villagers
extends RefCounted
## The four Lowmere villagers (spec M1 6.2). They are entities, not blocked grid tiles.

const ALL: Array = [
	{
		"id": "hilda", "name": "Hilda", "x": 4, "y": 5, "facing": "n",
		"first": "Elias's grandchild. Same stubborn chin. Bring me ore.",
		"repeat": "Copper first. Five ore, one bar.",
	},
	{
		"id": "aldous", "name": "Doc Aldous", "x": 12, "y": 5, "facing": "n",
		"first": "If the woods knock you flat, they carry you here. Try not to make it a habit.",
		"repeat": "Eat before you go down. Empty stomachs make poor fighters.",
	},
	{
		"id": "fern", "name": "Granny Fern", "x": 20, "y": 5, "facing": "n",
		"first": "The old well in the woods has woken, dear. Elias would have gone down already. Bring its stone home to the shrine.",
		"repeat": "The shrine remembers him, dear. Give it time to remember you.",
	},
	{
		"id": "bram", "name": "Mayor Bram", "x": 10, "y": 8, "facing": "n",
		"first": "Welcome to Lowmere. Stay out of the woods after dark. Please.",
		"repeat": "Lock your gate at night. Everyone's doing it now.",
	},
]


## The villager standing on tile (x, y), or {} if none.
static func at(x: int, y: int) -> Dictionary:
	for v: Dictionary in ALL:
		if v["x"] == x and v["y"] == y:
			return v
	return {}
