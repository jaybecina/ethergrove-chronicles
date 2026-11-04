extends GutTest
## Farmer animation choice, ported from apps/web/src/scene/playerClips.test.ts.


func test_tool_used_chop_for_hoe_and_axe() -> void:
	assert_eq(PlayerClips.clip_for_event({"type": "toolUsed", "tool": "hoe", "x": 0, "y": 0, "hit": true}), "2H_Melee_Attack_Chop")
	assert_eq(PlayerClips.clip_for_event({"type": "toolUsed", "tool": "axe", "x": 0, "y": 0, "hit": false}), "2H_Melee_Attack_Chop")


func test_tool_used_sickle() -> void:
	assert_eq(PlayerClips.clip_for_event({"type": "toolUsed", "tool": "sickle", "x": 0, "y": 0, "hit": true}), "1H_Melee_Attack_Slice_Horizontal")


func test_tool_used_can() -> void:
	assert_eq(PlayerClips.clip_for_event({"type": "toolUsed", "tool": "can", "x": 0, "y": 0, "hit": true}), "Use_Item")


func test_crop_harvested() -> void:
	assert_eq(PlayerClips.clip_for_event({"type": "cropHarvested", "x": 0, "y": 0, "crop": "turnip"}), "PickUp")


func test_crop_planted() -> void:
	assert_eq(PlayerClips.clip_for_event({"type": "cropPlanted", "x": 0, "y": 0, "crop": "turnip"}), "Interact")


func test_item_eaten() -> void:
	assert_eq(PlayerClips.clip_for_event({"type": "itemEaten", "item": "turnip", "stamina": 8}), "Use_Item")


func test_milestone_reached() -> void:
	assert_eq(PlayerClips.clip_for_event({"type": "milestoneReached", "id": "gold1k"}), "Cheer")


func test_unknown_event_has_no_clip() -> void:
	assert_eq(PlayerClips.clip_for_event({"type": "staminaLow"}), "")
	assert_eq(PlayerClips.clip_for_event({}), "")


func test_locomotion_thresholds() -> void:
	assert_eq(PlayerClips.locomotion_clip(0.0, false), "Idle")
	assert_eq(PlayerClips.locomotion_clip(0.2, false), "Idle")
	assert_eq(PlayerClips.locomotion_clip(0.3, false), "Walking_A")
	assert_eq(PlayerClips.locomotion_clip(1.0, false), "Walking_A")
	assert_eq(PlayerClips.locomotion_clip(2.6, false), "Walking_A")
	assert_eq(PlayerClips.locomotion_clip(3.6, false), "Running_A")
	assert_eq(PlayerClips.locomotion_clip(3.59, false), "Walking_A")
	assert_eq(PlayerClips.locomotion_clip(4.6, false), "Running_A")
	assert_eq(PlayerClips.locomotion_clip(4.6, true), "Walking_A")


func test_clip_rate_walk_clamps() -> void:
	assert_almost_eq(PlayerClips.clip_rate("Walking_A", 2.6), 1.0, 0.0001)
	assert_almost_eq(PlayerClips.clip_rate("Walking_A", 1.3), 0.5, 0.0001)
	assert_almost_eq(PlayerClips.clip_rate("Walking_A", 0.2), 0.5, 0.0001)
	assert_almost_eq(PlayerClips.clip_rate("Walking_A", 9.0), 1.4, 0.0001)


func test_clip_rate_run_clamps() -> void:
	assert_almost_eq(PlayerClips.clip_rate("Running_A", 4.6), 1.0, 0.0001)
	assert_almost_eq(PlayerClips.clip_rate("Running_A", 9.0), 1.3, 0.0001)
	assert_almost_eq(PlayerClips.clip_rate("Running_A", 1.0), 0.7, 0.0001)


func test_clip_rate_other_clips_are_one() -> void:
	assert_eq(PlayerClips.clip_rate("Idle", 0.0), 1.0)
	assert_eq(PlayerClips.clip_rate("Cheer", 5.0), 1.0)


func test_prepare_loops_the_locomotion_clips() -> void:
	var model := ModelCatalog.instantiate("player")
	add_child_autofree(model)
	var anim := PlayerClips.prepare(model)
	assert_not_null(anim)
	for clip: String in PlayerClips.LOOPED:
		assert_eq(anim.get_animation(clip).loop_mode, Animation.LOOP_LINEAR, clip)
	var bare := Node3D.new()
	add_child_autofree(bare)
	assert_null(PlayerClips.prepare(bare))
