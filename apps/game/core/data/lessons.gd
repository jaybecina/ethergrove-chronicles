class_name Lessons
extends RefCounted
## Grandpa's lessons and notes, ported from packages/core/src/data/lessons.ts.

## Grandpa's lessons, in the order they are taught (spec 3.2).
const LESSON_ORDER: Array[String] = [
	"walkToField",
	"till",
	"plant",
	"water",
	"sleep",
	"waterDaily",
	"harvest",
	"ship",
	"sellOvernight",
	"buySeeds",
]

## Lessons whose card shows "count / goal".
const LESSON_GOAL: Dictionary = {"till": 3, "plant": 3}

## One-time notes, in priority order when several trigger at once (spec 3.7).
const NOTE_IDS: Array[String] = [
	"canEmpty",
	"staminaLow",
	"exhausted",
	"passedOut",
	"rain",
	"obstacles",
	"wrongSeason",
	"newSeason",
	"bagFull",
	"cartClosed",
]

## Gold given when the last lesson is done.
const LESSONS_GIFT := 100
