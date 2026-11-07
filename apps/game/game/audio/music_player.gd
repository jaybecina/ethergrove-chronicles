class_name MusicPlayer
extends Node
## Plays the music the situation asks for (soundtrack spec REQ-16): asks `MusicDirector` on every state change and every
## half second (for the fight), lets `MusicConductor` decide, and crossfades two looping players on the `Music` bus. A
## cue whose file is missing is skipped with one warning, never an error. Lives for the whole run, title included.

const GameSessionScript := preload("res://game/autoload/game_session.gd")
const SettingsScript := preload("res://game/autoload/settings.gd")
const CHECK_S := 0.5
## Music is ducked this much under a jingle.
const DUCK_DB := -9.0

var session: GameSessionScript
var settings: SettingsScript
## Returns "none", "fight" or "boss"; the game wires it to the live CombatLayer.
var engagement_source: Callable
## cue -> "res://….ogg". Tests inject their own.
var manifest: Dictionary = AudioManifest.MUSIC
var conductor := MusicConductor.new()
## The cue whose stream is playing now ("" when none could load).
var playing: String = ""

var _players: Array[AudioStreamPlayer] = []
var _front: int = 0
var _acc_s: float = 0.0
var _duck_left_s: float = 0.0
var _warned: Dictionary = {}


func _ready() -> void:
	AudioBuses.ensure()
	for i in 2:
		var p := AudioStreamPlayer.new()
		p.bus = AudioBuses.MUSIC
		p.volume_db = -80.0
		add_child(p)
		_players.append(p)
	if session != null:
		session.state_changed.connect(_evaluate.bind(0.0))
	if settings != null:
		settings.audio_changed.connect(apply_volume)
	apply_volume()
	_evaluate(0.0)


func _process(delta: float) -> void:
	if _duck_left_s > 0.0:
		_duck_left_s -= delta
		if _duck_left_s <= 0.0:
			apply_volume()
	_acc_s += delta
	if _acc_s >= CHECK_S:
		_evaluate(_acc_s)
		_acc_s = 0.0


## The cue the situation asks for right now.
func wanted() -> String:
	var engagement := "none"
	if engagement_source.is_valid():
		engagement = engagement_source.call()
	if session == null:
		return "title"
	var state: Dictionary = session.state
	if session.screen != "game" or state.is_empty():
		return MusicDirector.pick(session.screen, "", 0, "", "", engagement)
	var player: Dictionary = state["player"]
	var calendar: Dictionary = state["calendar"]
	var weather: Dictionary = state["weather"]
	var zone: String = player["location"]
	var minute: int = calendar["minute"]
	var today: String = weather["today"]
	var season: String = calendar["season"]
	return MusicDirector.pick(session.screen, zone, minute, today, season, engagement)


func _evaluate(dt_s: float) -> void:
	if conductor.update(wanted(), dt_s):
		_start(conductor.current, conductor.fade_s)


## Fades the front player out and the other in with `cue`'s stream.
func _start(cue: String, fade_s: float) -> void:
	var out: AudioStreamPlayer = _players[_front]
	var path: String = manifest.get(cue, "")
	if path == "" or not ResourceLoader.exists(path):
		if not _warned.has(cue):
			_warned[cue] = true
			push_warning("MusicPlayer: no music file for \"%s\"" % cue)
		playing = ""
		_fade(out, -80.0, fade_s, true)
		return
	var stream: AudioStream = load(path)
	if stream is AudioStreamOggVorbis:
		var ogg: AudioStreamOggVorbis = stream
		ogg.loop = true
	_front = 1 - _front
	var incoming: AudioStreamPlayer = _players[_front]
	incoming.stream = stream
	incoming.volume_db = -80.0
	incoming.play()
	playing = cue
	_fade(incoming, 0.0, fade_s, false)
	_fade(out, -80.0, fade_s, true)


func _fade(p: AudioStreamPlayer, to_db: float, seconds: float, stop_after: bool) -> void:
	if not p.playing:
		return
	var tween := create_tween()
	tween.tween_property(p, "volume_db", to_db, seconds)
	if stop_after:
		tween.tween_callback(p.stop)


## Lowers the music for `seconds` under a jingle.
func duck(seconds: float) -> void:
	_duck_left_s = seconds
	AudioBuses.set_volume(AudioBuses.MUSIC, settings.music_volume if settings != null else 0.6, DUCK_DB)


func ducked() -> bool:
	return _duck_left_s > 0.0


func apply_volume() -> void:
	var v: float = settings.music_volume if settings != null else 0.6
	AudioBuses.set_volume(AudioBuses.MUSIC, v, DUCK_DB if _duck_left_s > 0.0 else 0.0)
