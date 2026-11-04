class_name ActionGate
extends RefCounted
## Lets a held button fire once on press, then at most once per `repeat_ms`. Port of apps/web/src/input/actionGate.ts.

const DEFAULT_REPEAT_MS := 350

var _repeat_ms: int
var _last_ms: int = 0
var _held: bool = false


func _init(repeat_ms: int = DEFAULT_REPEAT_MS) -> void:
	_repeat_ms = repeat_ms


func allow(pressed: bool, now_ms: int) -> bool:
	if not pressed:
		_held = false
		return false
	if not _held or now_ms - _last_ms >= _repeat_ms:
		_held = true
		_last_ms = now_ms
		return true
	return false
