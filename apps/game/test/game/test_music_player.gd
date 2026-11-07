extends CoreTest
## MusicPlayer and SfxPlayer wired to a session, with no audio files (a missing file is skipped): what they ask for,
## and the jingle duck. The crossfade timing itself is MusicConductor's (test_music_conductor.gd).

const GameSessionScript := preload("res://game/autoload/game_session.gd")
const SettingsScript := preload("res://game/autoload/settings.gd")

var _session: GameSessionScript


func _start(location: String = "farm", minute: int = 600) -> void:
	var state := NewGame.create({"seed": 1, "farmName": "A", "playerName": "B"})
	d(state["player"])["location"] = location
	d(state["calendar"])["minute"] = minute
	_session = GameSessionScript.new()
	_session.set_process(false)
	add_child_autofree(_session)
	_session.start(state, 1, 0)


func _music(engagement: String = "none") -> MusicPlayer:
	var m := MusicPlayer.new()
	m.session = _session
	m.manifest = {}
	m.engagement_source = func() -> String: return engagement
	add_child_autofree(m)
	return m


func test_the_title_screen_asks_for_the_title_track() -> void:
	_start()
	_session.set_screen("title")
	eq(_music().wanted(), "title")


func test_the_game_asks_by_place_time_and_fight() -> void:
	_start("woods", 600)
	_session.set_screen("game")
	eq(_music().wanted(), "woods")
	eq(_music("fight").wanted(), "woodsFight")
	_start("lowmere", 1300)
	_session.set_screen("game")
	eq(_music().wanted(), "lowmereNight")


func test_it_follows_the_state_on_a_change() -> void:
	_start("farm", 600)
	_session.set_screen("game")
	var m := _music()
	eq(m.conductor.current, "spring")
	_session.state["player"]["location"] = "house"
	_session.state_changed.emit()
	eq(m.conductor.current, "home")


func test_a_missing_file_plays_nothing_and_does_not_crash() -> void:
	_start()
	_session.set_screen("game")
	var m := _music()
	eq(m.playing, "")


func test_a_jingle_ducks_the_music_for_its_length_then_restores_it() -> void:
	_start()
	_session.set_screen("game")
	var m := _music()
	var sfx := SfxPlayer.new()
	sfx.session = _session
	sfx.jingle_started.connect(m.duck)
	add_child_autofree(sfx)
	eq(m.ducked(), false)
	sfx.on_events([{"type": "dayStarted"}, {"type": "seasonChanged", "season": "summer"}])
	eq(m.ducked(), true)
	m._process(10.0)
	eq(m.ducked(), false)


func test_events_play_their_sounds_and_only_one_jingle() -> void:
	_start()
	var sfx := SfxPlayer.new()
	sfx.session = _session
	add_child_autofree(sfx)
	sfx.on_events([{"type": "cropHarvested"}, {"type": "goldChanged", "delta": 10}, {"type": "dayStarted"}, {"type": "lessonsComplete"}])
	eq(sfx.log, ["sfx:harvest", "sfx:coin", "sfx:chime", "jingle:morning"])
