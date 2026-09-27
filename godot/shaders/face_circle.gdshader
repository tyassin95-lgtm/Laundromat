shader_type canvas_item;
// A portrait cropped to a circle with a coloured ring, filling it like CSS object-fit: cover
// (anchored near the top of the picture, where the face is).

uniform vec4 ring_color : source_color = vec4(0.247, 0.424, 0.455, 1.0);
uniform vec4 fill_color : source_color = vec4(0.847, 0.769, 0.612, 1.0);
uniform float ring = 0.04;
uniform float anchor_y = 0.12;
uniform bool cover = true;
uniform float padding = 0.0;
uniform bool silhouette = false;
uniform float fade = 1.0;

void fragment() {
	vec2 ts = vec2(textureSize(TEXTURE, 0));
	vec2 uv = UV;
	if (cover) {
		vec2 f = vec2(min(ts.x, ts.y) / ts.x, min(ts.x, ts.y) / ts.y);
		uv = vec2(0.5 - f.x * 0.5 + UV.x * f.x, anchor_y * (1.0 - f.y) + UV.y * f.y);
	} else {
		// contain, with padding around the icon
		vec2 q = (UV - 0.5) / (1.0 - 2.0 * padding);
		vec2 f = ts / max(ts.x, ts.y);
		uv = q / f + 0.5;
	}
	vec4 tex = (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) ? vec4(0.0) : texture(TEXTURE, uv);
	if (silhouette) {
		tex.rgb = vec3(0.0);
		tex.a *= 0.35;
	}
	vec4 col = mix(fill_color, vec4(tex.rgb, 1.0), tex.a);
	float d = length(UV - 0.5) * 2.0;
	float aa = fwidth(d);
	col = mix(col, ring_color, smoothstep(1.0 - ring - aa, 1.0 - ring, d));
	col.a *= 1.0 - smoothstep(1.0 - aa, 1.0, d);
	col.a *= fade;
	COLOR = col;
}
