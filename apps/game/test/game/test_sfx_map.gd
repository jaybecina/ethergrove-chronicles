extends CoreTest
## SfxMap: which one-shot sound or jingle a core event earns (the web game's soundMap, soundtrack spec REQ-17).


func test_a_tool_that_hits_makes_its_tools_sound() -> void:
	eq(SfxMap.sounds_for({"type": "toolUsed", "tool": "hoe", "hit": true}), ["hoe"])
	eq(SfxMap.sounds_for({"type": "toolUsed", "tool": "can", "hit": true}), ["water"])
	eq(SfxMap.sounds_for({"type": "toolUsed", "tool": "sickle", "hit": true}), ["sickle"])
	eq(SfxMap.sounds_for({"type": "toolUsed", "tool": "axe", "hit": true}), ["chop"])
	eq(SfxMap.sounds_for({"type": "toolUsed", "tool": "hammer", "hit": true}), ["break"])


func test_a_tool_that_misses_swings() -> void:
	eq(SfxMap.sounds_for({"type": "toolUsed", "tool": "hoe", "hit": false}), ["swing"])
	eq(SfxMap.sounds_for({"type": "toolUsed", "tool": "unknown_tool", "hit": true}), ["swing"])


func test_the_farm_events() -> void:
	eq(SfxMap.sounds_for({"type": "canRefilled"}), ["refill"])
	eq(SfxMap.sounds_for({"type": "cropHarvested"}), ["harvest"])
	eq(SfxMap.sounds_for({"type": "cropPlanted"}), ["plant"])
	eq(SfxMap.sounds_for({"type": "itemEaten"}), ["eat"])
	eq(SfxMap.sounds_for({"type": "locationChanged"}), ["door"])
	eq(SfxMap.sounds_for({"type": "actionFailed"}), ["deny"])


func test_gold_only_makes_a_sound_when_it_is_earned() -> void:
	eq(SfxMap.sounds_for({"type": "goldChanged", "delta": 50}), ["coin"])
	eq(SfxMap.sounds_for({"type": "goldChanged", "delta": -50}), [])


func test_milestones_and_lessons_chime() -> void:
	for t: String in ["milestoneReached", "lessonDone", "lessonsComplete"]:
		eq(SfxMap.sounds_for({"type": t}), ["chime"], t)


func test_other_events_are_silent() -> void:
	eq(SfxMap.sounds_for({"type": "xpGained"}), [])


func test_the_most_important_jingle_wins() -> void:
	eq(SfxMap.jingle_for([{"type": "dayStarted"}, {"type": "seasonChanged", "season": "summer"}]), "season-summer")
	eq(SfxMap.jingle_for([{"type": "dayStarted"}, {"type": "passedOut"}]), "faint")
	eq(SfxMap.jingle_for([{"type": "lessonsComplete"}]), "lessonsComplete")
	eq(SfxMap.jingle_for([{"type": "dayStarted"}]), "morning")
	eq(SfxMap.jingle_for([{"type": "xpGained"}]), "")
