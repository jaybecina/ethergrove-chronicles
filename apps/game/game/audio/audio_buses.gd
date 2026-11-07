class_name AudioBuses
extends RefCounted
## The `Music` and `SFX` buses and their volumes (soundtrack spec REQ-18). Created in code, so the project needs no
## bus layout file; a test or tool that never plays sound can skip this.

const MUSIC := "Music"
const SFX := "SFX"


## Adds the buses if they are missing. Safe to call again.
static func ensure() -> void:
	for bus_name: String in [MUSIC, SFX]:
		if AudioServer.get_bus_index(bus_name) == -1:
			AudioServer.add_bus()
			var i := AudioServer.get_bus_count() - 1
			AudioServer.set_bus_name(i, bus_name)
			AudioServer.set_bus_send(i, "Master")


## Sets a bus to `linear` (0 to 1) plus `offset_db` (the music is ducked under a jingle with a negative offset).
static func set_volume(bus_name: String, linear: float, offset_db: float = 0.0) -> void:
	var i := AudioServer.get_bus_index(bus_name)
	if i == -1:
		return
	AudioServer.set_bus_mute(i, linear <= 0.0)
	AudioServer.set_bus_volume_db(i, linear_to_db(maxf(linear, 0.0001)) + offset_db)
