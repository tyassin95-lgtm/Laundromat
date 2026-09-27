class_name ScriptLang
## The dialogue scripting language (data/story/*.txt) and its expressions.
##
##   === node_id
##   walt.neutral: Line spoken by Walt with the "neutral" portrait.
##   me.smile: The player. {name} and {shop} are substituted, *word* is emphasised.
##   : Narration.
##   * A choice                      (indented lines below form its body)
##     walt.smile: Reply.
##     <<rel walt 20>>
##   * [if hearts.walt >= 2] A conditional choice
##   <<if flag.met_maya and day > 3>> ... <<elseif ...>> ... <<else>> ... <<endif>>
##   <<command args>>                (see Story.command)
##   -> other_node                   (jump)
##
## Expressions: and / or / not, == (or =) != < > <= >=, + - * / %, numbers, "strings",
## dotted lookups (flag.x, var.y, hearts.walt, ev.o.who) and calls (upgrade("wifi")).
## A missing value is null: it is false, and any comparison with it is false.

static var _nodes := {}
static var _speakers := {}
static var _expr_cache := {}


static func register_speakers(ids: Array) -> void:
	_speakers.clear()
	for id in ids:
		_speakers[id] = true


static func has_node(id: String) -> bool:
	return _nodes.has(id)


static func get_node(id: String) -> Array:
	return _nodes.get(id, [])


static func load_script(src: String, tag: String) -> void:
	var cur := ""
	var buf: Array[String] = []
	var header := RegEx.create_from_string("^===\\s*([\\w.-]+)\\s*$")
	for line in src.replace("\r", "").split("\n"):
		var m := header.search(line)
		if m:
			if cur != "":
				_nodes[cur] = _parse_node(buf, cur, tag)
			cur = m.get_string(1)
			buf = []
			continue
		if cur != "":
			buf.append(line)
	if cur != "":
		_nodes[cur] = _parse_node(buf, cur, tag)


# ------------------------------------------------------------------ parsing
static func _parse_node(lines: Array[String], id: String, _tag: String) -> Array:
	var L := []
	for raw in lines:
		var line: String = raw.replace("\t", "  ")
		var text := line.strip_edges()
		if text == "" or text.begins_with("//"):
			continue
		L.append({"indent": line.length() - line.strip_edges(true, false).length(), "text": text})
	var ctx := {"lines": L, "i": 0, "id": id}
	var base: int = L[0].indent if L.size() > 0 else 0
	var body := _parse_block(ctx, base, false)
	if ctx.i < L.size():
		push_warning("[script] %s: unparsed line \"%s\"" % [id, L[ctx.i].text])
	return body


static func _parse_block(ctx: Dictionary, indent: int, in_if: bool) -> Array:
	var out := []
	var if_end := RegEx.create_from_string("^<<(elseif\\b.*|else|endif)>>$")
	while ctx.i < ctx.lines.size():
		var line: Dictionary = ctx.lines[ctx.i]
		if line.indent < indent:
			break
		var s: String = line.text
		if in_if and if_end.search(s):
			break
		if s.begins_with("* "):
			out.append(_parse_choice(ctx, line.indent))
			continue
		if s.begins_with("<<if ") or s.begins_with("<<if\t"):
			out.append(_parse_if(ctx, line.indent))
			continue
		ctx.i += 1
		out.append(_parse_simple(s))
	return out


static func _parse_choice(ctx: Dictionary, indent: int) -> Dictionary:
	var options := []
	var cond_re := RegEx.create_from_string("^\\[if (.+?)\\]\\s*(.*)$")
	while ctx.i < ctx.lines.size():
		var line: Dictionary = ctx.lines[ctx.i]
		if line.indent != indent or not String(line.text).begins_with("* "):
			break
		ctx.i += 1
		var text := String(line.text).substr(2).strip_edges()
		var cond := ""
		var m := cond_re.search(text)
		if m:
			cond = m.get_string(1)
			text = m.get_string(2)
		var body := []
		if ctx.i < ctx.lines.size() and ctx.lines[ctx.i].indent > indent:
			body = _parse_block(ctx, ctx.lines[ctx.i].indent, false)
		options.append({"text": text, "cond": cond, "body": body})
	return {"t": "choice", "options": options}


static func _parse_if(ctx: Dictionary, indent: int) -> Dictionary:
	var branches := []
	var first: Dictionary = ctx.lines[ctx.i]
	ctx.i += 1
	var m := RegEx.create_from_string("^<<if\\s+(.+)>>$").search(first.text)
	branches.append({"cond": m.get_string(1) if m else "false", "body": _parse_block(ctx, indent, true)})
	var elseif := RegEx.create_from_string("^<<elseif\\s+(.+)>>$")
	while ctx.i < ctx.lines.size():
		var text: String = ctx.lines[ctx.i].text
		var e := elseif.search(text)
		if e:
			ctx.i += 1
			branches.append({"cond": e.get_string(1), "body": _parse_block(ctx, indent, true)})
		elif text == "<<else>>":
			ctx.i += 1
			branches.append({"cond": "true", "body": _parse_block(ctx, indent, true)})
		elif text == "<<endif>>":
			ctx.i += 1
			break
		else:
			push_warning("[script] %s: missing <<endif>>" % ctx.id)
			break
	return {"t": "if", "branches": branches}


static func _parse_simple(s: String) -> Dictionary:
	var m := RegEx.create_from_string("^->\\s*([\\w.-]+)$").search(s)
	if m:
		return {"t": "goto", "node": m.get_string(1)}
	m = RegEx.create_from_string("^<<(\\w+)\\s*(.*?)>>$").search(s)
	if m:
		return {"t": "cmd", "name": m.get_string(1), "args": m.get_string(2)}
	if s.begins_with(":"):
		return {"t": "say", "who": "", "expr": "", "text": s.substr(1).strip_edges()}
	m = RegEx.create_from_string("^([a-z_]+)(?:\\.([a-z_]+))?:\\s*(.*)$").search(s)
	if m and _speakers.has(m.get_string(1)):
		return {"t": "say", "who": m.get_string(1), "expr": m.get_string(2), "text": m.get_string(3)}
	return {"t": "say", "who": "", "expr": "", "text": s}


## Splits command arguments: words, or "quoted strings".
static func split_args(s: String) -> Array:
	var out := []
	for m in RegEx.create_from_string("\"([^\"]*)\"|(\\S+)").search_all(s):
		out.append(m.get_string(1) if m.get_start(1) >= 0 else m.get_string(2))
	return out


## "true"/"false"/numbers become values; anything else stays a string.
static func parse_value(v: String) -> Variant:
	if v == "true":
		return true
	if v == "false":
		return false
	if v.is_valid_int():
		return v.to_int()
	if v.is_valid_float():
		return v.to_float()
	return v


# ------------------------------------------------------------------ expressions
static func eval_expr(src: String, ctx: Dictionary) -> Variant:
	if not _expr_cache.has(src):
		_expr_cache[src] = _compile(src)
	return _ev(_expr_cache[src], ctx)


static func test(src: String, ctx: Dictionary) -> bool:
	return truthy(eval_expr(src, ctx))


static func truthy(v: Variant) -> bool:
	match typeof(v):
		TYPE_NIL:
			return false
		TYPE_BOOL:
			return v
		TYPE_INT:
			return v != 0
		TYPE_FLOAT:
			return v != 0.0 and not is_nan(v)
		TYPE_STRING, TYPE_STRING_NAME:
			return v != ""
	return true


static func _compile(src: String) -> Array:
	var toks := _tokenize(src)
	if toks.is_empty() or (toks.size() == 1 and toks[0][0] == "bad"):
		push_warning("[script] bad expression: " + src)
		return ["lit", false]
	var p := {"t": toks, "i": 0}
	var ast := _p_or(p)
	if p.i != toks.size() or ast.is_empty():
		push_warning("[script] bad expression: " + src)
		return ["lit", false]
	return ast


static func _tokenize(src: String) -> Array:
	var toks := []
	var i := 0
	var n := src.length()
	while i < n:
		var c := src[i]
		if c == " " or c == "\t":
			i += 1
		elif (c >= "0" and c <= "9") or (c == "." and i + 1 < n and src[i + 1] >= "0" and src[i + 1] <= "9"):
			var j := i
			while j < n and ((src[j] >= "0" and src[j] <= "9") or src[j] == "."):
				j += 1
			var num := src.substr(i, j - i)
			toks.append(["num", num.to_float() if num.contains(".") else num.to_int()])
			i = j
		elif c == "\"" or c == "'":
			var j := i + 1
			var buf := ""
			while j < n and src[j] != c:
				if src[j] == "\\" and j + 1 < n:
					j += 1
				buf += src[j]
				j += 1
			toks.append(["str", buf])
			i = j + 1
		elif c == "_" or (c.to_lower() != c.to_upper()):
			var j := i
			while j < n and (src[j] == "_" or src[j].to_lower() != src[j].to_upper() or (src[j] >= "0" and src[j] <= "9")):
				j += 1
			var word := src.substr(i, j - i)
			match word:
				"and", "or", "not":
					toks.append(["op", word])
				"true":
					toks.append(["lit", true])
				"false":
					toks.append(["lit", false])
				"null", "undefined":
					toks.append(["lit", null])
				_:
					toks.append(["id", word])
			i = j
		else:
			var two := src.substr(i, 2)
			if two in ["==", "!=", ">=", "<=", "&&", "||"]:
				toks.append(["op", {"&&": "and", "||": "or"}.get(two, two)])
				i += 2
			elif c in ["<", ">", "+", "-", "*", "/", "%", "(", ")", ",", ".", "[", "]"]:
				toks.append(["op", c])
				i += 1
			elif c == "=":
				toks.append(["op", "=="])
				i += 1
			elif c == "!":
				toks.append(["op", "not"])
				i += 1
			else:
				return [["bad"]]
	return toks


static func _peek(p: Dictionary) -> Array:
	return p.t[p.i] if p.i < p.t.size() else ["end"]


static func _is_op(p: Dictionary, ops: Array) -> bool:
	var t := _peek(p)
	return t[0] == "op" and t[1] in ops


static func _p_or(p: Dictionary) -> Array:
	var a := _p_and(p)
	while _is_op(p, ["or"]):
		p.i += 1
		a = ["or", a, _p_and(p)]
	return a


static func _p_and(p: Dictionary) -> Array:
	var a := _p_eq(p)
	while _is_op(p, ["and"]):
		p.i += 1
		a = ["and", a, _p_eq(p)]
	return a


static func _p_eq(p: Dictionary) -> Array:
	var a := _p_rel(p)
	while _is_op(p, ["==", "!="]):
		var op: String = p.t[p.i][1]
		p.i += 1
		a = ["bin", op, a, _p_rel(p)]
	return a


static func _p_rel(p: Dictionary) -> Array:
	var a := _p_add(p)
	while _is_op(p, ["<", ">", "<=", ">="]):
		var op: String = p.t[p.i][1]
		p.i += 1
		a = ["bin", op, a, _p_add(p)]
	return a


static func _p_add(p: Dictionary) -> Array:
	var a := _p_mul(p)
	while _is_op(p, ["+", "-"]):
		var op: String = p.t[p.i][1]
		p.i += 1
		a = ["bin", op, a, _p_mul(p)]
	return a


static func _p_mul(p: Dictionary) -> Array:
	var a := _p_unary(p)
	while _is_op(p, ["*", "/", "%"]):
		var op: String = p.t[p.i][1]
		p.i += 1
		a = ["bin", op, a, _p_unary(p)]
	return a


static func _p_unary(p: Dictionary) -> Array:
	if _is_op(p, ["not"]):
		p.i += 1
		return ["not", _p_unary(p)]
	if _is_op(p, ["-"]):
		p.i += 1
		return ["neg", _p_unary(p)]
	return _p_postfix(p)


static func _p_postfix(p: Dictionary) -> Array:
	var a := _p_primary(p)
	while true:
		if _is_op(p, ["."]):
			p.i += 1
			var t := _peek(p)
			if t[0] != "id" and t[0] != "op":
				return []
			p.i += 1
			a = ["get", a, str(t[1])]
		elif _is_op(p, ["("]):
			p.i += 1
			var args := []
			while not _is_op(p, [")"]):
				if _peek(p)[0] == "end":
					return []
				args.append(_p_or(p))
				if _is_op(p, [","]):
					p.i += 1
			p.i += 1
			a = ["call", a, args]
		elif _is_op(p, ["["]):
			p.i += 1
			var key := _p_or(p)
			if not _is_op(p, ["]"]):
				return []
			p.i += 1
			a = ["idx", a, key]
		else:
			break
	return a


static func _p_primary(p: Dictionary) -> Array:
	var t := _peek(p)
	p.i += 1
	match t[0]:
		"num", "str", "lit":
			return ["lit", t[1]]
		"id":
			return ["id", t[1]]
		"op":
			if t[1] == "(":
				var e := _p_or(p)
				if _is_op(p, [")"]):
					p.i += 1
				return e
	return []


static func _ev(n: Array, ctx: Dictionary) -> Variant:
	match n[0]:
		"lit":
			return n[1]
		"id":
			return ctx.get(n[1])
		"get":
			return _member(_ev(n[1], ctx), n[2])
		"idx":
			return _member(_ev(n[1], ctx), _ev(n[2], ctx))
		"call":
			var f: Variant = _ev(n[1], ctx)
			if not (f is Callable):
				return null
			var args := []
			for a in n[2]:
				args.append(_ev(a, ctx))
			return (f as Callable).callv(args)
		"not":
			return not truthy(_ev(n[1], ctx))
		"neg":
			var v: Variant = _num(_ev(n[1], ctx))
			return null if v == null else -v
		"and":
			var a: Variant = _ev(n[1], ctx)
			return _ev(n[2], ctx) if truthy(a) else a
		"or":
			var a: Variant = _ev(n[1], ctx)
			return a if truthy(a) else _ev(n[2], ctx)
		"bin":
			return _binary(n[1], _ev(n[2], ctx), _ev(n[3], ctx))
	return null


static func _member(base: Variant, key: Variant) -> Variant:
	if base is Dictionary:
		return base.get(key)
	if base is Array:
		if key is String and key == "length":
			return base.size()
		if key is int and key >= 0 and key < base.size():
			return base[key]
		return null
	if base is String and key is String and key == "length":
		return base.length()
	if base is Object and key is String:
		return base.get(key)
	return null


static func _num(v: Variant) -> Variant:
	match typeof(v):
		TYPE_INT, TYPE_FLOAT:
			return v
		TYPE_BOOL:
			return 1 if v else 0
		TYPE_STRING:
			return v.to_float() if v.is_valid_float() else null
	return null


static func _loose_eq(a: Variant, b: Variant) -> bool:
	if a == null or b == null:
		return a == null and b == null
	var ta := typeof(a)
	var tb := typeof(b)
	if (ta == TYPE_STRING or ta == TYPE_STRING_NAME) and (tb == TYPE_STRING or tb == TYPE_STRING_NAME):
		return String(a) == String(b)
	var na: Variant = _num(a)
	var nb: Variant = _num(b)
	if na != null and nb != null:
		return float(na) == float(nb)
	if ta == tb:
		return a == b
	return false


static func _binary(op: String, a: Variant, b: Variant) -> Variant:
	match op:
		"==":
			return _loose_eq(a, b)
		"!=":
			return not _loose_eq(a, b)
		"+":
			if a is String or b is String:
				return str("" if a == null else a) + str("" if b == null else b)
	if op in ["<", ">", "<=", ">="] and a is String and b is String:
		match op:
			"<": return a < b
			">": return a > b
			"<=": return a <= b
			">=": return a >= b
	var x: Variant = _num(a)
	var y: Variant = _num(b)
	if x == null or y == null:
		return false if op in ["<", ">", "<=", ">="] else null
	match op:
		"<": return x < y
		">": return x > y
		"<=": return x <= y
		">=": return x >= y
		"+": return x + y
		"-": return x - y
		"*": return x * y
		"/": return float(x) / float(y) if y != 0 else null
		"%": return fmod(float(x), float(y)) if y != 0 else null
	return null
