extends Node
## Audio: one-shot sound effects, layered ambience loops that fade in and out, and music that
## crossfades. Files live in res://assets/audio/{sfx,amb,music}/<name>.ogg. Autoloaded as Sound.
## Volumes (Settings) are set on the Music, SFX and Amb buses (default_bus_layout.tres).

const SFX_NAMES := [
	"shop_bell", "bell_small", "thunder", "thunder_far", "meow", "meow2", "purr", "camera", "needle_drop", "phone_buzz",
	"ratchet", "wrench", "applause", "applause_big", "spray", "coin", "coins_jar", "type_key", "type_bell", "chime",
	"machine_door", "kettle", "pencil", "mop", "knitting", "pigeons", "bus", "click", "select", "confirm", "back", "error",
	"pop", "drop", "toggle", "tick", "question", "open", "close", "coins", "coins2", "cloth1", "cloth2", "cloth3", "cloth4",
	"book_open", "book_close", "page", "door_open", "door_close", "creak", "latch", "metal_click", "clank", "clank2", "cup",
	"thud", "step_tile1", "step_tile2", "step_tile3", "step_wood1", "step_wood2", "step_wood3", "jingle_good", "jingle_great",
	"jingle_sad", "jingle_day", "jingle_week", "jingle_steel", "machine_done", "machine_start", "machine_error", "blip",
	"heart", "sparkle", "whoosh", "whoosh2", "register", "notify",
]
const POOL_SIZE := 16

var vol := {"master": 1.0, "music": 0.7, "sfx": 0.9, "amb": 0.8, "voice": 0.6}
var duck_level := 1.0
var music_key := ""

var _sfx := {}                                  # name -> AudioStream
var _pool: Array[AudioStreamPlayer] = []
var _next := 0
var _amb := {}                                  # name -> {player, cur, from, target, t, fade}
var _music := []                                # [{player, key, cur, target, fade}]


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	for n: String in SFX_NAMES:
		var path := "res://assets/audio/sfx/%s.ogg" % n
		if ResourceLoader.exists(path):
			_sfx[n] = load(path)
	for i in POOL_SIZE:
		var p := AudioStreamPlayer.new()
		p.bus = "SFX"
		add_child(p)
		_pool.append(p)


func apply_volumes() -> void:
	_set_bus("Master", vol.master)
	_set_bus("Music", vol.music)
	_set_bus("SFX", vol.sfx)
	_set_bus("Amb", vol.amb)


func _set_bus(bus: String, v: float) -> void:
	var i := AudioServer.get_bus_index(bus)
	if i >= 0:
		AudioServer.set_bus_volume_linear(i, maxf(0.0001, v))


## Plays a sound effect. rate: playback speed; jitter: random +/- speed; voice: dialogue blips
## (they follow the voice volume instead of the effects volume).
func play(sfx_name: String, volume: float = 1.0, rate: float = 1.0, jitter: float = 0.0, delay: float = 0.0, voice: bool = false) -> void:
	var s: AudioStream = _sfx.get(sfx_name)
	if s == null:
		return
	if delay > 0.0:
		get_tree().create_timer(delay).timeout.connect(play.bind(sfx_name, volume, rate, jitter, 0.0, voice))
		return
	var p := _pool[_next]
	_next = (_next + 1) % POOL_SIZE
	for i in POOL_SIZE:                         # prefer a player that's free
		var q := _pool[(_next + i) % POOL_SIZE]
		if not q.playing:
			p = q
			break
	var r := rate
	if jitter > 0.0:
		r *= 1.0 + (randf() - 0.5) * 2.0 * jitter
	p.stream = s
	p.pitch_scale = maxf(0.05, r)
	p.volume_linear = volume * (vol.voice / maxf(0.001, vol.sfx) if voice else 1.0)
	p.play()


# ------------------------------------------------------------ ambience
## Declarative ambience: pass {name: volume}; anything not listed fades out.
func set_ambience(layers: Dictionary, fade: float = 1.5) -> void:
	for n: String in _amb.keys():
		if not layers.has(n):
			_ramp(_amb[n], 0.0, fade)
	for n: String in layers:
		_amb_layer(n, float(layers[n]), fade)


func _amb_layer(n: String, v: float, fade: float) -> void:
	var a: Dictionary = _amb.get(n, {})
	if a.is_empty():
		var path := "res://assets/audio/amb/%s.ogg" % n
		if not ResourceLoader.exists(path):
			return
		var stream: AudioStreamOggVorbis = load(path)
		stream.loop = true
		var p := AudioStreamPlayer.new()
		p.bus = "Amb"
		p.stream = stream
		p.volume_linear = 0.0
		add_child(p)
		p.play(randf() * stream.get_length())
		a = {"player": p, "cur": 0.0}
		_amb[n] = a
	_ramp(a, v, fade)


func _ramp(a: Dictionary, v: float, fade: float) -> void:
	a.from = a.cur
	a.target = v
	a.t = 0.0
	a.fade = maxf(0.05, fade)


# ------------------------------------------------------------ music
func music(key: String, fade: float = 2.0) -> void:
	if key == music_key:
		return
	music_key = key
	for m: Dictionary in _music:
		m.target = 0.0
		m.fade = fade
	if key == "":
		return
	var path := "res://assets/audio/music/%s.ogg" % key
	if not ResourceLoader.exists(path):
		return
	var stream: AudioStreamOggVorbis = load(path)
	stream.loop = true
	var p := AudioStreamPlayer.new()
	p.bus = "Music"
	p.stream = stream
	p.volume_linear = 0.0
	add_child(p)
	p.play()
	_music.append({"player": p, "key": key, "cur": 0.0, "target": 1.0, "fade": fade})


## Lowers the music (1 = full) while people talk.
func duck(level: float) -> void:
	duck_level = level


func _process(delta: float) -> void:
	var dt := minf(delta, 0.1)
	for n: String in _amb.keys():
		var a: Dictionary = _amb[n]
		a.t += dt
		a.cur = lerpf(a.from, a.target, minf(1.0, a.t / a.fade))
		a.player.volume_linear = a.cur
		if a.target == 0.0 and a.t >= a.fade + 0.12:
			a.player.queue_free()
			_amb.erase(n)
	for i in range(_music.size() - 1, -1, -1):
		var m: Dictionary = _music[i]
		var step := dt / maxf(0.05, m.fade)
		m.cur = minf(m.target, m.cur + step) if m.target > m.cur else maxf(m.target, m.cur - step)
		m.player.volume_linear = clampf(m.cur * duck_level, 0.0, 1.0)
		if m.target == 0.0 and m.cur == 0.0:
			m.player.queue_free()
			_music.remove_at(i)
