class_name MusicConductor
extends RefCounted
## Decides which cue plays and how fast it fades in (soundtrack spec REQ-16). Pure logic on a clock the caller supplies,
## so it is tested without audio: `update(wanted, dt_s)` returns true when the cue to play changed.

## A normal change crossfades over this long; a fight or boss track comes in faster.
const FADE_S := 2.0
const FADE_FAST_S := 0.8
## The fight or boss track stays this long after the fight ends before the place's own music returns.
const HOLD_S := 4.0

## The cue that should be playing ("" before the first update).
var current: String = ""
## The crossfade length for the last change.
var fade_s: float = FADE_S
var _hold_s: float = 0.0


func update(wanted: String, dt_s: float) -> bool:
	var wants_combat := MusicDirector.is_combat(wanted)
	if wants_combat:
		_hold_s = HOLD_S
	elif MusicDirector.is_combat(current):
		_hold_s -= dt_s
		if _hold_s > 0.0:
			return false
	if wanted == current:
		return false
	current = wanted
	fade_s = FADE_FAST_S if wants_combat else FADE_S
	return true
