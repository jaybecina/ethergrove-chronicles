class_name WellPanel
extends ChoicePanel
## The old well (M1 spec 6.1): start at the entrance, or at any checkpoint stone you have touched.

const WELL_TITLE := "The old well"
const SPEECH := "Where do you want to start?"
const GO := "Climb down"


func setup() -> void:
	title_label.text = WELL_TITLE
	set_speech(SPEECH)
	close_after = true


func options() -> Array[Dictionary]:
	var out: Array[Dictionary] = []
	var deeps: Dictionary = session.state["deeps"]
	var m: Dictionary = deeps["mossdeep"]
	var checkpoints: Array = m["checkpoints"]
	var floors: Array[int] = [0]
	for c: Variant in checkpoints:
		var f: int = c
		if f > 0:
			floors.append(f)
	floors.sort()
	for f: int in floors:
		out.append({
			"label": "The entrance" if f == 0 else "Floor %d checkpoint" % f, "button": GO, "enabled": true, "reason": "",
			"command": {"type": "enterMossdeep", "floor": f},
		})
	return out
