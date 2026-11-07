class_name MusicDirector
extends RefCounted
## Which music fits the moment (soundtrack spec REQ-14). Pure: the first matching rule wins, and the answer is always a
## literal, so it is cheap to ask on every state change.

## 20:00: the night tracks take over.
const NIGHT_MINUTE := 1200
## The fight and boss tracks: they fade in fast and are held a few seconds after the fight (MusicConductor).
const COMBAT_CUES: Array[String] = ["woodsFight", "mossdeepFight", "matron"]


## `engagement` is "none", "fight" or "boss" (`CombatLayer.engagement()`).
static func pick(screen: String, zone: String, minute: int, weather: String, season: String, engagement: String) -> String:
	if screen != "game":
		return "title"
	if engagement == "boss":
		return "matron"
	if engagement == "fight":
		if zone == "woods":
			return "woodsFight"
		if zone == "mossdeep":
			return "mossdeepFight"
	if zone == "mossdeep":
		return "mossdeep"
	if zone == "house":
		return "home"
	if minute >= NIGHT_MINUTE:
		if zone == "lowmere" or zone == "clinic":
			return "lowmereNight"
		if zone == "woods":
			return "woodsNight"
		return "night"
	if zone == "lowmere" or zone == "clinic":
		return "lowmere"
	if zone == "woods":
		return "woods"
	if weather == "rain" or weather == "storm":
		return "rain"
	return season


static func is_combat(cue: String) -> bool:
	return COMBAT_CUES.has(cue)
