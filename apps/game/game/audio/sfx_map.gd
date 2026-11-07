class_name SfxMap
extends RefCounted
## Which one-shot sound or jingle a core event earns: the web game's `soundMap` and `jingleFor`, ported
## (soundtrack spec REQ-17). Only events the Godot core emits today are mapped.

const TOOL_SOUND := {"hoe": "hoe", "can": "water", "sickle": "sickle", "axe": "chop", "hammer": "break"}


static func sounds_for(event: Dictionary) -> Array[String]:
	var out: Array[String] = []
	match event["type"]:
		"toolUsed":
			var tool: String = event.get("tool", "")
			if event.get("hit", false) and TOOL_SOUND.has(tool):
				out.append(TOOL_SOUND[tool])
			else:
				out.append("swing")
		"canRefilled":
			out.append("refill")
		"cropHarvested":
			out.append("harvest")
		"cropPlanted":
			out.append("plant")
		"itemEaten":
			out.append("eat")
		"goldChanged":
			var delta: int = event.get("delta", 0)
			if delta > 0:
				out.append("coin")
		"locationChanged":
			out.append("door")
		"milestoneReached", "lessonDone", "lessonsComplete":
			out.append("chime")
		"actionFailed":
			out.append("deny")
	return out


## The one jingle a batch of events earns ("" for none), by priority: passing out, a new season, a new day, the lessons.
static func jingle_for(events: Array) -> String:
	for e: Dictionary in events:
		if e["type"] == "passedOut":
			return "faint"
	for e: Dictionary in events:
		if e["type"] == "seasonChanged":
			return "season-%s" % e["season"]
	for e: Dictionary in events:
		if e["type"] == "dayStarted":
			return "morning"
	for e: Dictionary in events:
		if e["type"] == "lessonsComplete":
			return "lessonsComplete"
	return ""
