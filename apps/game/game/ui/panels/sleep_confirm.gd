class_name SleepConfirm
extends ModalPanel
## "Go to bed?", from apps/web/src/ui/screens/SleepConfirm.tsx. "Sleep and save" closes the panel, dispatches
## `sleep` and saves (SaveService also saves on the new morning; saving the same state twice is skipped). The night's
## `shippingReport` and `dayStarted` events then open the morning report through the PanelHost.

const TITLE := "Go to bed?"
const BODY := "Sleeping ends the day, sells what's in the bin, and saves your farm."
const NOT_YET := "Not yet"
const SLEEP := "Sleep and save"


func build() -> void:
	title_label.text = TITLE
	body.add_child(ModalPanel.make_label(BODY, true))
	var row := ModalPanel.make_row()
	var not_yet := ModalPanel.make_button(NOT_YET)
	not_yet.pressed.connect(func() -> void: host.close())
	var sleep := ModalPanel.make_button(SLEEP)
	sleep.pressed.connect(_on_sleep)
	row.add_child(not_yet)
	row.add_child(sleep)
	body.add_child(row)


func _on_sleep() -> void:
	host.close()
	session.dispatch({"type": "sleep"})
	if host.save_service != null:
		host.save_service.save_now()
