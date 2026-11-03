class_name ItemData
extends RefCounted
## Item definitions, ported from packages/core/src/data/items.ts. Each item has kind, sell and eat
## (null where TypeScript has null). Insertion order matches the TypeScript object.

const ITEMS: Dictionary = {
	"fiber": {"kind": "material", "sell": 1, "eat": null},
	"wood": {"kind": "material", "sell": 2, "eat": null},
	"stone": {"kind": "material", "sell": 2, "eat": null},
	"turnip": {"kind": "crop", "sell": 35, "eat": 8},
	"seed:turnip": {"kind": "seed", "sell": null, "eat": null},
	"potato": {"kind": "crop", "sell": 80, "eat": 12},
	"seed:potato": {"kind": "seed", "sell": null, "eat": null},
	"strawberry": {"kind": "crop", "sell": 60, "eat": 10},
	"seed:strawberry": {"kind": "seed", "sell": null, "eat": null},
	"tomato": {"kind": "crop", "sell": 60, "eat": 10},
	"seed:tomato": {"kind": "seed", "sell": null, "eat": null},
	"corn": {"kind": "crop", "sell": 50, "eat": 12},
	"seed:corn": {"kind": "seed", "sell": null, "eat": null},
	"melon": {"kind": "crop", "sell": 250, "eat": 20},
	"seed:melon": {"kind": "seed", "sell": null, "eat": null},
	"pumpkin": {"kind": "crop", "sell": 320, "eat": 20},
	"seed:pumpkin": {"kind": "seed", "sell": null, "eat": null},
	"eggplant": {"kind": "crop", "sell": 60, "eat": 10},
	"seed:eggplant": {"kind": "seed", "sell": null, "eat": null},
}

const _SEED_PREFIX := "seed:"


static func seed_of(crop: String) -> String:
	return _SEED_PREFIX + crop


## The crop a seed item grows, or "" for a non-seed.
static func crop_of_seed(id: String) -> String:
	return id.substr(_SEED_PREFIX.length()) if id.begins_with(_SEED_PREFIX) else ""
