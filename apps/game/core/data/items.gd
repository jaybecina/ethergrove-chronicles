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

## Items added by the Godot slice (M1 spec 7.5, 7.6). Kept apart from ITEMS, which mirrors the TypeScript data exactly.
## Gear and dishes are not eaten through the farm rule (eat is null): dishes go through `Cooking.eat`.
const SLICE_ITEMS: Dictionary = {
	"copperOre": {"kind": "material", "sell": 15, "eat": null},
	"copperBar": {"kind": "material", "sell": 80, "eat": null},
	"practiceSword": {"kind": "gear", "sell": null, "eat": null},
	"copperSword": {"kind": "gear", "sell": null, "eat": null},
	"woodBuckler": {"kind": "gear", "sell": null, "eat": null},
	"copperHelm": {"kind": "gear", "sell": null, "eat": null},
	"copperMail": {"kind": "gear", "sell": null, "eat": null},
	"copperBoots": {"kind": "gear", "sell": null, "eat": null},
	"turnipStew": {"kind": "dish", "sell": null, "eat": null},
	"potatoHash": {"kind": "dish", "sell": null, "eat": null},
	"strawberryTart": {"kind": "dish", "sell": null, "eat": null},
	"verdantRootstone": {"kind": "quest", "sell": null, "eat": null},
	"mossmawTusk": {"kind": "quest", "sell": null, "eat": null},
	"groundsLantern": {"kind": "quest", "sell": null, "eat": null},
	"brokenBlade": {"kind": "quest", "sell": null, "eat": null},
}

const _SEED_PREFIX := "seed:"


static func seed_of(crop: String) -> String:
	return _SEED_PREFIX + crop


## The crop a seed item grows, or "" for a non-seed.
static func crop_of_seed(id: String) -> String:
	return id.substr(_SEED_PREFIX.length()) if id.begins_with(_SEED_PREFIX) else ""


## True for any known item, ported or slice.
static func has_item(id: String) -> bool:
	return ITEMS.has(id) or SLICE_ITEMS.has(id)


## The definition of a known item. Callers check `has_item` first.
static func def_of(id: String) -> Dictionary:
	var out: Dictionary = ITEMS[id] if ITEMS.has(id) else SLICE_ITEMS[id]
	return out
