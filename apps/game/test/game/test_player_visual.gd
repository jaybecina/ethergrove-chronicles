extends CoreTest
## PlayerVisual: the farmer model plays Idle when still and the walk or run clip when moving, plays a one-shot clip on
## a session event and then returns to locomotion, turns to the session facing, and shows the blob shadow only on
## the Low tier (live on a tier change). The settings node is a test instance with a temp path.

const GameSessionScript := preload("res://game/autoload/game_session.gd")
const SettingsScript := preload("res://game/autoload/settings.gd")

var _settings_path: String = ""


func before_each() -> void:
	_settings_path = "user://test-settings-%d.cfg" % randi()


func after_each() -> void:
	if FileAccess.file_exists(_settings_path):
		DirAccess.remove_absolute(_settings_path)


func _ticks(n: int) -> void:
	for i: int in n:
		await get_tree().physics_frame


func _settings(renderer: String) -> SettingsScript:
	var st: SettingsScript = SettingsScript.new()
	st.set("_path", _settings_path)
	st.renderer_override = renderer
	autofree(st)
	return st


func _visual(c: PlayerController, s: GameSessionScript, renderer: String = "Apple M4") -> PlayerVisual:
	var v := PlayerVisual.new()
	v.session = s
	v.settings = _settings(renderer)
	c.add_child(v)
	return v


func _rig(x: float = 10.5, z: float = 20.5) -> Array:
	var s := PlayerWorld.session(self, PlayerWorld.state_in("farm"))
	var c := PlayerWorld.controller(self, s, x, z)
	return [s, c, _visual(c, s)]


func test_model_is_the_fitted_farmer() -> void:
	var rig := _rig()
	var v: PlayerVisual = rig[2]
	assert_not_null(v.anim_player(), "the player model's AnimationPlayer")
	assert_true(v.anim_player().has_animation(PlayerClips.IDLE))


func test_locomotion_clips_loop() -> void:
	var rig := _rig()
	var v: PlayerVisual = rig[2]
	for clip: String in [PlayerClips.IDLE, PlayerClips.WALKING, PlayerClips.RUNNING]:
		eq(v.anim_player().get_animation(clip).loop_mode, Animation.LOOP_LINEAR, clip)


func test_idle_when_still() -> void:
	var rig := _rig()
	var v: PlayerVisual = rig[2]
	await _ticks(5)
	eq(v.current_clip(), PlayerClips.IDLE)
	eq(v.anim_player().current_animation, PlayerClips.IDLE)


func test_walk_clip_when_moving() -> void:
	var rig := _rig()
	var c: PlayerController = rig[1]
	var v: PlayerVisual = rig[2]
	c.set_intent(Vector2.RIGHT, false)
	await _ticks(10)
	await wait_process_frames(2)
	eq(v.anim_player().current_animation, PlayerClips.WALKING)
	assert_almost_eq(v.anim_player().speed_scale, 1.0, 0.06)
	c.set_intent(Vector2.RIGHT, true)
	await _ticks(10)
	await wait_process_frames(2)
	eq(v.anim_player().current_animation, PlayerClips.RUNNING)
	c.set_intent(Vector2.ZERO, false)
	await _ticks(3)
	await wait_process_frames(2)
	eq(v.anim_player().current_animation, PlayerClips.IDLE)


func test_chop_clip_on_tool_used_event() -> void:
	var rig := _rig()
	var s: GameSessionScript = rig[0]
	var v: PlayerVisual = rig[2]
	v.set_process(false)
	v.advance(0.016)
	eq(v.current_clip(), PlayerClips.IDLE)
	s.events.emit([{"type": "dayStarted"}, {"type": "toolUsed", "tool": "hoe", "x": 1, "y": 1}])
	v.advance(0.016)
	eq(v.anim_player().current_animation, "2H_Melee_Attack_Chop")
	eq(v.current_clip(), "2H_Melee_Attack_Chop")
	var length := v.anim_player().get_animation("2H_Melee_Attack_Chop").length
	v.advance(length * 0.5)
	eq(v.current_clip(), "2H_Melee_Attack_Chop", "still chopping halfway through")
	v.advance(length * 0.5 + 0.05)
	eq(v.current_clip(), PlayerClips.IDLE, "locomotion resumes after the one-shot")
	eq(v.anim_player().current_animation, PlayerClips.IDLE)


func test_event_without_a_clip_keeps_locomotion() -> void:
	var rig := _rig()
	var s: GameSessionScript = rig[0]
	var v: PlayerVisual = rig[2]
	v.set_process(false)
	s.events.emit([{"type": "dayStarted"}])
	v.advance(0.016)
	eq(v.current_clip(), PlayerClips.IDLE)


func test_faces_the_session_facing() -> void:
	var rig := _rig()
	var s: GameSessionScript = rig[0]
	var v: PlayerVisual = rig[2]
	v.set_process(false)
	var expected := {"s": 0.0, "e": PI / 2.0, "n": PI, "w": -PI / 2.0}
	for facing: String in expected:
		s.set_pose(10.5, 20.5, facing)
		v.advance(0.016)
		var yaw: float = expected[facing]
		var model_forward := v.pivot().global_transform.basis * Vector3(0.0, 0.0, 1.0)
		var want := Vector3(sin(yaw), 0.0, cos(yaw))
		assert_almost_eq(model_forward.distance_to(want), 0.0, 1e-4, "facing %s" % facing)
	# n = -z, e = +x.
	s.set_pose(10.5, 20.5, "n")
	v.advance(0.016)
	assert_almost_eq((v.pivot().global_transform.basis * Vector3.BACK).z, -1.0, 1e-4)


func test_blob_shadow_only_on_low() -> void:
	var s := PlayerWorld.session(self, PlayerWorld.state_in("farm"))
	var c := PlayerWorld.controller(self, s, 10.5, 20.5)
	var medium := _visual(c, s, "Apple M4")
	assert_false(medium.shadow().visible, "medium has real shadows")
	var low := _visual(c, s, "llvmpipe")
	assert_true(low.shadow().visible, "low draws the blob")
	assert_almost_eq(low.shadow().position.y, 0.02, 1e-5)
	var quad := low.shadow().mesh as QuadMesh
	assert_not_null(quad)
	assert_almost_eq(quad.size.x, 0.9, 1e-5, "radius 0.45")
	medium.settings.set_choice("low")
	assert_true(medium.shadow().visible, "a tier change applies live")
	medium.settings.set_choice("high")
	assert_false(medium.shadow().visible)
