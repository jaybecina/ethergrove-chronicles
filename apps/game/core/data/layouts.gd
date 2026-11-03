class_name Layouts
extends RefCounted
## Map layouts, ported from packages/core/src/data/layouts.ts. Each legend value is a tile dictionary.
## Save version 3 (spec 6.1) adds the Root Shrine `R` at (28, 2), the farm gate `G` at (16, 23) and the house
## stove `K` at (1, 1). None is a "." cell, so NewGame's obstacle roll matches TypeScript's.

## 32 x 24. "." cells get seeded obstacles in NewGame.
const FARM_LAYOUT: Array[String] = [
	"################################",
	"#______________________________#",
	"#_HHHHH_____________________R__#",
	"#_HHHHH________________________#",
	"#_HHDHHB_______________________#",
	"#______________________________#",
	"#__.........................___#",
	"#__.........................___#",
	"#__.........................___#",
	"#__.........................___#",
	"#__.........................___#",
	"#__.........................___#",
	"#__.........................___#",
	"#__.........................___#",
	"#__.........................___#",
	"#__.........................___#",
	"#__.........................___#",
	"#______________________________C",
	"#_~~~~_________________________#",
	"#_~~~~~________________________#",
	"#_~~~~_________________________#",
	"#______________________________#",
	"#______________P_______________#",
	"################G###############",
]

const HOUSE_LAYOUT: Array[String] = [
	"WWWWWWWW",
	"WKFFFFZW",
	"WFFFFFFW",
	"WFFSFFFW",
	"WFFFFFFW",
	"WWWXWWWW",
]

const FARM_LEGEND: Dictionary = {
	"#": {"kind": "fence"},
	"H": {"kind": "building"},
	"D": {"kind": "feature", "feature": "houseDoor"},
	"B": {"kind": "feature", "feature": "bin"},
	"C": {"kind": "feature", "feature": "cart"},
	"~": {"kind": "water"},
	"_": {"kind": "path"},
	".": {"kind": "grass"},
	"P": {"kind": "path"},
	"R": {"kind": "feature", "feature": "rootShrine"},
	"G": {"kind": "feature", "feature": "farmGate"},
}

const HOUSE_LEGEND: Dictionary = {
	"W": {"kind": "wall"},
	"F": {"kind": "floor"},
	"Z": {"kind": "feature", "feature": "bed"},
	"X": {"kind": "feature", "feature": "exitDoor"},
	"S": {"kind": "floor"},
	"K": {"kind": "feature", "feature": "stove"},
}

## The farm's crop field: the "." cells of FARM_LAYOUT (inclusive).
const FIELD_RECT: Dictionary = {"x0": 3, "y0": 6, "x1": 27, "y1": 16}

const FARM_SPAWN_CHAR := "P"
const HOUSE_SPAWN_CHAR := "S"
