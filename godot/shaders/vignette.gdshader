shader_type canvas_item;
// Darkens the screen's edges: a radial gradient between a circle a little above the middle
// (clear) and a wider one around it (strength), like a canvas createRadialGradient.

uniform float strength = 0.35;

void fragment() {
	vec2 size = 1.0 / SCREEN_PIXEL_SIZE;
	vec2 p = UV * size;
	vec2 c0 = vec2(size.x * 0.5, size.y * 0.45);
	vec2 c1 = size * 0.5;
	float r0 = min(size.x, size.y) * 0.35;
	float r1 = max(size.x, size.y) * 0.72;
	vec2 dc = c1 - c0;
	float dr = r1 - r0;
	vec2 pd = p - c0;
	float a = dot(dc, dc) - dr * dr;
	float b = dot(pd, dc) + r0 * dr;
	float c = dot(pd, pd) - r0 * r0;
	float t = (b - sqrt(max(b * b - a * c, 0.0))) / a;
	COLOR = vec4(10.0 / 255.0, 6.0 / 255.0, 4.0 / 255.0, strength * clamp(t, 0.0, 1.0));
}
