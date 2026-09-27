class_name ScriptRunner extends RefCounted
## Plays a script node (see ScriptLang) against a host object that provides:
##   say(who, expr, text)            (awaited: one line of dialogue)
##   choose(options: Array) -> int   (awaited: pick one of the choice texts)
##   context() -> Dictionary         (values for expressions)
##   command(name, args, runner)     (awaited: <<command>>; may return {goto} or {stop})
##   mark_seen(node_id)

const STOP := {"stop": true}

var host: Object
var running := false


func _init(h: Object) -> void:
	host = h


func eval(src: String) -> bool:
	return ScriptLang.test(src, host.context())


func run(node_id: String) -> void:
	if not ScriptLang.has_node(node_id):
		push_warning("[script] missing node " + node_id)
		return
	running = true
	var id := node_id
	while id != "":
		host.mark_seen(id)
		var res: Variant = await exec(ScriptLang.get_node(id))
		id = res.get("goto", "") if res is Dictionary else ""
		if id != "" and not ScriptLang.has_node(id):
			push_warning("[script] missing node " + id)
			id = ""
	running = false


func exec(stmts: Array) -> Variant:
	for st: Dictionary in stmts:
		match st.t:
			"say":
				await host.say(st.who, st.expr, st.text)
			"goto":
				return {"goto": st.node}
			"if":
				for b: Dictionary in st.branches:
					if eval(b.cond):
						var r: Variant = await exec(b.body)
						if r != null:
							return r
						break
			"choice":
				var opts := []
				for o: Dictionary in st.options:
					if o.cond == "" or eval(o.cond):
						opts.append(o)
				if opts.is_empty():
					continue
				var texts := []
				for o in opts:
					texts.append(o.text)
				var idx: int = await host.choose(texts)
				var r: Variant = await exec(opts[idx].body)
				if r != null:
					return r
			"cmd":
				if st.name == "end":
					return STOP
				var r: Variant = await host.command(st.name, st.args, self)
				if r is Dictionary and (r.has("goto") or r.has("stop")):
					return r
	return null
