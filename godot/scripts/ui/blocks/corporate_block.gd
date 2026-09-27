extends VBoxContainer
## A typed letter on company letterhead: the logo, a rule, the body and the signature.

@onready var logo: Label = $Logo
@onready var body: RichTextLabel = $Body
@onready var sign_label: RichTextLabel = $Sign


func setup(logo_text: String, bbcode: String, signature: String) -> void:
	logo.text = logo_text
	body.text = bbcode
	sign_label.text = "[right]%s[/right]" % signature
	sign_label.visible = signature != ""
