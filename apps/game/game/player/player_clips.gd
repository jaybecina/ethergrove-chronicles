class_name PlayerClips
extends RefCounted
## The farmer's animation choice, ported from apps/web/src/scene/playerClips.ts. Clip names are the model's own.

const IDLE := "Idle"
const WALKING := "Walking_A"
const RUNNING := "Running_A"
## The clips that loop; the rest play once.
const LOOPED: Array[String] = [IDLE, WALKING, RUNNING]


## The AnimationPlayer of a `player` model instance with the locomotion clips set to loop, or null if it has none.
## PlayerVisual and VillagerVisuals share it.
static func prepare(model: Node) -> AnimationPlayer:
	var found: Array[Node] = model.find_children("*", "AnimationPlayer", true, false)
	if found.is_empty():
		return null
	var anim := found[0] as AnimationPlayer
	for clip: String in LOOPED:
		if anim.has_animation(clip):
			anim.get_animation(clip).loop_mode = Animation.LOOP_LINEAR
	return anim


## The one-shot clip an event plays on the farmer, or "" for none.
static func clip_for_event(e: Dictionary) -> String:
	match e.get("type", ""):
		"toolUsed":
			var tool: Variant = e.get("tool", "")
			if tool == "sickle":
				return "1H_Melee_Attack_Slice_Horizontal"
			if tool == "can":
				return "Use_Item"
			return "2H_Melee_Attack_Chop"
		"cropHarvested":
			return "PickUp"
		"cropPlanted":
			return "Interact"
		"itemEaten":
			return "Use_Item"
		"milestoneReached":
			return "Cheer"
	return ""


## Looping clip for the current ground speed (tiles per second).
static func locomotion_clip(speed: float, exhausted: bool) -> String:
	if speed < 0.3:
		return IDLE
	if exhausted or speed < (Balance.WALK_SPEED + Balance.RUN_SPEED) / 2.0:
		return WALKING
	return RUNNING


## Playback rate so the feet keep pace with the ground (no skating, no sprinting on the spot).
static func clip_rate(clip: String, speed: float) -> float:
	if clip == WALKING:
		return clampf(speed / Balance.WALK_SPEED, 0.5, 1.4)
	if clip == RUNNING:
		return clampf(speed / Balance.RUN_SPEED, 0.7, 1.3)
	return 1.0
