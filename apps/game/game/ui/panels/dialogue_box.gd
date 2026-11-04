class_name DialogueBox
extends ModalPanel
## A villager's line (the `talked` event): the villager's name as the title, the line, and one "Close" button
## (Panel.tsx's default close label), so confirm and cancel both close it. Sends no commands.

var _text: Label
var _close: Button


func build() -> void:
	_text = ModalPanel.make_label("", true)
	body.add_child(_text)
	_close = ModalPanel.make_button(ModalPanel.CLOSE)
	_close.size_flags_horizontal = Control.SIZE_SHRINK_END
	_close.pressed.connect(func() -> void: host.close())
	body.add_child(_close)


func show_line(villager_name: String, text: String) -> void:
	title_label.text = villager_name
	_text.text = text
