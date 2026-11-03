extends CoreTest
## Lesson data, ported from packages/core/test/lessonsData.test.ts.


func test_field_rect_covers_exactly_the_field_cells_of_the_farm_layout() -> void:
	var r: Dictionary = Layouts.FIELD_RECT
	var x0: int = r["x0"]
	var y0: int = r["y0"]
	var x1: int = r["x1"]
	var y1: int = r["y1"]
	var mismatches := 0
	for y: int in Layouts.FARM_LAYOUT.size():
		var row: String = Layouts.FARM_LAYOUT[y]
		for x: int in row.length():
			var inside := x >= x0 and x <= x1 and y >= y0 and y <= y1
			if (row[x] == ".") != inside:
				mismatches += 1
	eq(mismatches, 0)


func test_lists_10_lessons_and_10_notes() -> void:
	eq(Lessons.LESSON_ORDER.size(), 10)
	var lessons: Dictionary = {}
	for id: String in Lessons.LESSON_ORDER:
		lessons[id] = true
	eq(lessons.size(), 10)
	var notes: Dictionary = {}
	for id: String in Lessons.NOTE_IDS:
		notes[id] = true
	eq(notes.size(), 10)
	eq(Lessons.LESSON_GOAL, {"till": 3, "plant": 3})
	eq(Lessons.LESSONS_GIFT, 100)
