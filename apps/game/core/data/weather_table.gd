class_name WeatherTable
extends RefCounted
## Weighted picks per season (spec 3.9); weights sum to 1. Ported from packages/core/src/data/weatherTable.ts.
## Each season maps to an ordered array of [weather, weight] pairs.

const TABLE: Dictionary = {
	"spring": [["sunny", 0.5], ["cloudy", 0.2], ["rain", 0.3]],
	"summer": [["sunny", 0.55], ["cloudy", 0.15], ["rain", 0.15], ["storm", 0.15]],
	"fall": [["sunny", 0.5], ["cloudy", 0.25], ["rain", 0.25]],
	"winter": [["sunny", 0.35], ["cloudy", 0.25], ["snow", 0.4]],
}
