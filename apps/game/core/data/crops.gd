class_name CropData
extends RefCounted
## Crop definitions, ported from packages/core/src/data/crops.ts. Each crop has the keys
## season, seedCost, days, regrow (null for a single harvest), sell and eat.

const CROP_IDS: Array[String] = [
	"turnip",
	"potato",
	"strawberry",
	"tomato",
	"corn",
	"melon",
	"pumpkin",
	"eggplant",
]

const CROPS: Dictionary = {
	"turnip": {"season": "spring", "seedCost": 20, "days": 4, "regrow": null, "sell": 35, "eat": 8},
	"potato": {"season": "spring", "seedCost": 50, "days": 7, "regrow": null, "sell": 80, "eat": 12},
	"strawberry": {"season": "spring", "seedCost": 100, "days": 8, "regrow": 4, "sell": 60, "eat": 10},
	"tomato": {"season": "summer", "seedCost": 50, "days": 9, "regrow": 3, "sell": 60, "eat": 10},
	"corn": {"season": "summer", "seedCost": 150, "days": 12, "regrow": 4, "sell": 50, "eat": 12},
	"melon": {"season": "summer", "seedCost": 80, "days": 11, "regrow": null, "sell": 250, "eat": 20},
	"pumpkin": {"season": "fall", "seedCost": 100, "days": 13, "regrow": null, "sell": 320, "eat": 20},
	"eggplant": {"season": "fall", "seedCost": 20, "days": 9, "regrow": 4, "sell": 60, "eat": 10},
}
