class_name SfxPlayer
extends Node
## Plays the one-shot sounds and the jingle that core events earn (soundtrack spec REQ-17), on the `SFX` bus. A sound
## whose file is missing is skipped silently. A jingle tells the music to duck for its length.

const GameSessionScript := preload("res://game/autoload/game_session.gd")
const SettingsScript := preload("res://game/autoload/settings.gd")
const VOICES := 8

signal jingle_started(length_s: float)

var session: GameSessionScript
var settings: SettingsScript
## sound id -> path, jingle id -> path. Tests inject their own.
var sounds: Dictionary = AudioManifest.SFX
var jingles: Dictionary = AudioManifest.JINGLES
## The sounds and jingles asked for, newest last (tests read it; capped).
var log: Array[String] = []

var _voices: Array[AudioStreamPlayer] = []
var _next: int = 0


func _ready() -> void:
	AudioBuses.ensure()
	for i in VOICES:
		var p := AudioStreamPlayer.new()
		p.bus = AudioBuses.SFX
		add_child(p)
		_voices.append(p)
	if session != null:
		session.events.connect(on_events)
	if settings != null:
		settings.audio_changed.connect(apply_volume)
	apply_volume()


func apply_volume() -> void:
	AudioBuses.set_volume(AudioBuses.SFX, settings.sfx_volume if settings != null else 0.8)


## One dispatch's events: every sound they earn, and at most one jingle.
func on_events(events: Array) -> void:
	for e: Dictionary in events:
		for id: String in SfxMap.sounds_for(e):
			play(id)
	var jingle := SfxMap.jingle_for(events)
	if jingle != "":
		play_jingle(jingle)


func play(id: String) -> void:
	_record("sfx:" + id)
	var path: String = sounds.get(id, "")
	_play_file(path)


func play_jingle(id: String) -> void:
	_record("jingle:" + id)
	var path: String = jingles.get(id, "")
	var length := _play_file(path)
	jingle_started.emit(length if length > 0.0 else 3.0)


func _record(entry: String) -> void:
	log.append(entry)
	if log.size() > 64:
		log.pop_front()


## Plays the file on the next voice; returns its length in seconds (0 when it is missing).
func _play_file(path: String) -> float:
	if path == "" or not ResourceLoader.exists(path):
		return 0.0
	var stream: AudioStream = load(path)
	var voice: AudioStreamPlayer = _voices[_next]
	_next = (_next + 1) % VOICES
	voice.stream = stream
	voice.play()
	return stream.get_length()
