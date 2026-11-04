class_name LessonUiState
extends RefCounted
## The transient lesson UI state of apps/web/src/ui/lessons/lessonStore.ts (never saved), pure and clocked by the
## `now_ms` the caller passes. The goal card opens on a lesson start and collapses 8 s later, a finished lesson
## shows ticked for 1.2 s, and a note shows for 10 s (NoteCard.tsx AUTO_DISMISS_MS; the controller named 8 s, which
## is the web's collapse time, so the web note time is used). Timers run only while the cards can be seen: a lesson
## that starts behind a menu is still shown open once the menu closes.

const COLLAPSE_MS := 8000
const DONE_FLASH_MS := 1200
const NOTE_MS := 10000

## The goal card shows its body and hints.
var expanded: bool = false
## The lesson just finished, shown ticked for a moment ("" for none).
var done_flash: String = ""
## Note ids waiting, the head is on screen. Uncapped like the web: the core shows each note once per save, so a
## dropped note would be lost for good (at most ten ids exist).
var note_queue: Array[String] = []
## Whether the cards can be seen now (the game screen is running).
var visible: bool = false

var _collapse_at: int = -1
var _flash_at: int = -1
var _note_at: int = -1
var _note_key: String = ""


func head_note() -> String:
	return "" if note_queue.is_empty() else note_queue[0]


## The game screen shows or hides. The timers restart on every change (as the web's `arm`).
func set_visible(value: bool, now_ms: int) -> void:
	if value == visible:
		return
	visible = value
	_arm(now_ms)


## A new game or a loaded save began and the farm shows: open the card for the saved lesson.
func enter_game(lesson: String, now_ms: int) -> void:
	if lesson != "off" and lesson != "complete" and lesson != "":
		_expand(now_ms)


## Routes one core event (lessonStarted, lessonDone, noteShown); other events change nothing.
func on_event(event: Dictionary, now_ms: int) -> void:
	match str(event["type"]):
		"lessonStarted":
			_expand(now_ms)
		"lessonDone":
			done_flash = str(event["id"])
			_arm(now_ms)
		"noteShown":
			var id := str(event["id"])
			if not note_queue.has(id):
				note_queue.append(id)
				_arm_note(now_ms)


func dismiss_note(now_ms: int) -> void:
	if note_queue.is_empty():
		return
	note_queue.remove_at(0)
	_arm_note(now_ms)


## Fires the timers that are due. Returns true when something changed.
func tick(now_ms: int) -> bool:
	var changed := false
	if _collapse_at >= 0 and now_ms >= _collapse_at:
		_collapse_at = -1
		expanded = false
		changed = true
	if _flash_at >= 0 and now_ms >= _flash_at:
		_flash_at = -1
		done_flash = ""
		changed = true
	if _note_at >= 0 and now_ms >= _note_at:
		_note_at = -1
		_note_key = ""
		dismiss_note(now_ms)
		changed = true
	return changed


func set_expanded(value: bool, now_ms: int) -> void:
	expanded = value
	_arm(now_ms)


func _expand(now_ms: int) -> void:
	expanded = true
	_arm(now_ms)


func _arm(now_ms: int) -> void:
	_collapse_at = -1
	_flash_at = -1
	if visible:
		if expanded:
			_collapse_at = now_ms + COLLAPSE_MS
		if done_flash != "":
			_flash_at = now_ms + DONE_FLASH_MS
	_arm_note(now_ms)


## The note timer restarts when the head note changes or the cards become visible.
func _arm_note(now_ms: int) -> void:
	if note_queue.is_empty() or not visible:
		_note_at = -1
		_note_key = ""
		return
	var key := "%s|%d" % [note_queue[0], note_queue.size()]
	if key != _note_key:
		_note_key = key
		_note_at = now_ms + NOTE_MS
