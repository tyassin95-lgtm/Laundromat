class_name DayLight
## The light of the day: ambient colour by time and weather, how dark it is, and the sky.


## Ambient light colour for a time of day (minutes) and weather (white = no darkening).
static func ambient_for(time: float, weather: String, interior: bool) -> Color:
	var h := time / 60.0
	# keyframes: [hour, r, g, b]
	var ext := [[5, 70, 78, 120], [6.5, 200, 170, 170], [8, 250, 245, 235], [16.5, 255, 250, 240], [18.3, 255, 196, 150], [19.5, 150, 120, 150], [20.5, 72, 82, 128], [24, 60, 70, 115], [29, 70, 78, 120]]
	var inn := [[5, 112, 112, 148], [7, 225, 215, 210], [9, 255, 252, 245], [16.5, 255, 250, 242], [18.5, 232, 200, 172], [20, 150, 142, 172], [21.5, 108, 108, 146], [24, 98, 100, 138], [29, 112, 112, 148]]
	var keys: Array = inn if interior else ext
	var hh := h + 24.0 if h < 5 else h
	var c: Array = keys[-1].slice(1)
	for i in keys.size() - 1:
		var k0: Array = keys[i]
		var k1: Array = keys[i + 1]
		if hh >= k0[0] and hh <= k1[0]:
			var f := (hh - k0[0]) / (k1[0] - k0[0])
			c = [lerpf(k0[1], k1[1], f), lerpf(k0[2], k1[2], f), lerpf(k0[3], k1[3], f)]
			break
	var wf := 0.78 if weather == "storm" else 0.88 if weather == "rain" else 0.94 if weather == "cloudy" else 1.0
	var cool := [0.97, 1.0, 1.04] if weather == "rain" or weather == "storm" else [1.0, 1.0, 1.0]
	return Color8(int(clampf(c[0] * wf * cool[0], 0, 255)), int(clampf(c[1] * wf * cool[1], 0, 255)), int(clampf(c[2] * wf * cool[2], 0, 255)))


## 0 (full day) .. 1 (full night): for lamps and lit windows.
static func nightness(time: float) -> float:
	var h := time / 60.0
	if h >= 20.5 or h < 5:
		return 1.0
	if h >= 17.5:
		return clampf((h - 17.5) / 3.0, 0.0, 1.0)
	if h < 7:
		return clampf((7.0 - h) / 2.0, 0.0, 1.0)
	return 0.0


const SKY := [   # hour, top, horizon
	[4.5, "#141a33", "#262d52"], [6, "#4a5486", "#e0a38e"], [7.5, "#8ab2d8", "#f1dcc2"], [9, "#8fb8dd", "#e4ecee"],
	[16.5, "#86aed4", "#ece6d6"], [18.2, "#6f88bb", "#f2b27e"], [19.3, "#454a82", "#e0866a"], [20.4, "#1f2750", "#44497a"],
	[24, "#131931", "#232a4c"], [28.5, "#141a33", "#262d52"],
]


## [top, horizon] colours of the sky seen through the windows.
static func sky_colors(time: float, weather: String) -> Array:
	var h := time / 60.0
	if h < 4.5:
		h += 24.0
	var top := Color(SKY[0][1])
	var bot := Color(SKY[0][2])
	for i in SKY.size() - 1:
		var s0: Array = SKY[i]
		var s1: Array = SKY[i + 1]
		if h >= s0[0] and h <= s1[0]:
			var k := (h - s0[0]) / (s1[0] - s0[0])
			top = _mix(Color(s0[1]), Color(s1[1]), k)
			bot = _mix(Color(s0[2]), Color(s1[2]), k)
			break
	if weather in ["rain", "storm", "cloudy"]:
		var g := 0.45 if weather == "cloudy" else 0.75 if weather == "rain" else 0.9
		top = _mix(top, _grey(top, 0.9), g)
		bot = _mix(bot, _grey(bot, 0.95), g)
	return [top, bot]


static func _mix(a: Color, b: Color, t: float) -> Color:
	return Color8(roundi(a.r8 + (b.r8 - a.r8) * t), roundi(a.g8 + (b.g8 - a.g8) * t), roundi(a.b8 + (b.b8 - a.b8) * t))


static func _grey(c: Color, lift: float) -> Color:
	var l := (c.r8 + c.g8 + c.b8) / 3.0 * lift
	return Color8(int(clampf(l, 0, 255)), int(clampf(l * 1.02, 0, 255)), int(clampf(l * 1.06, 0, 255)))
