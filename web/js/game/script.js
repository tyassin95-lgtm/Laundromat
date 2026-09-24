// Dialogue scripting language + runner.
//
//   === node_id
//   walt.neutral: Line spoken by Walt with the "neutral" portrait.
//   me.smile: The player. {name} and {shop} are substituted, *word* is emphasised.
//   : Narration.
//   * A choice                      (indented lines below form its body)
//     walt.smile: Reply.
//     <<rel walt 20>>
//   * [if hearts.walt >= 2] A conditional choice
//   <<if flag.met_maya and day > 3>> ... <<elseif ...>> ... <<else>> ... <<endif>>
//   <<command args>>                (see Commands in game/story.js)
//   -> other_node                   (jump)

const nodes = new Map();
let speakers = new Set(['me', 'walt', 'maya', 'june', 'remy', 'grant', 'rosa', 'biscuit']);

export function registerSpeakers(list) { speakers = new Set(list); }

export function loadScript(src, fileTag) {
  const raw = src.replace(/\r/g, '').split('\n');
  let cur = null;
  let buf = [];
  const flush = () => { if (cur) nodes.set(cur, parseNode(buf, cur, fileTag)); };
  for (const line of raw) {
    const m = line.match(/^===\s*([\w.-]+)\s*$/);
    if (m) { flush(); cur = m[1]; buf = []; continue; }
    if (cur) buf.push(line);
  }
  flush();
}

export const hasNode = id => nodes.has(id);
export const allNodes = () => nodes;

function parseNode(lines, id, tag) {
  const L = [];
  for (const raw of lines) {
    const line = raw.replace(/\t/g, '  ');
    const text = line.trim();
    if (!text || text.startsWith('//')) continue;
    L.push({ indent: line.length - line.trimStart().length, text });
  }
  const ctx = { lines: L, i: 0, id, tag };
  const base = L.length ? L[0].indent : 0;
  const body = parseBlock(ctx, base, false);
  if (ctx.i < L.length) console.warn(`[script] ${id}: unparsed line "${L[ctx.i].text}"`);
  return body;
}

function parseBlock(ctx, indent, inIf) {
  const out = [];
  while (ctx.i < ctx.lines.length) {
    const L = ctx.lines[ctx.i];
    if (L.indent < indent) break;
    const s = L.text;
    if (inIf && /^<<(elseif\b.*|else|endif)>>$/.test(s)) break;
    if (s.startsWith('* ')) { out.push(parseChoice(ctx, L.indent)); continue; }
    if (/^<<if\s/.test(s)) { out.push(parseIf(ctx, L.indent)); continue; }
    ctx.i++;
    out.push(parseSimple(s, ctx));
  }
  return out;
}

function parseChoice(ctx, indent) {
  const options = [];
  while (ctx.i < ctx.lines.length) {
    const L = ctx.lines[ctx.i];
    if (L.indent !== indent || !L.text.startsWith('* ')) break;
    ctx.i++;
    let text = L.text.slice(2).trim();
    let cond = null;
    const m = text.match(/^\[if (.+?)\]\s*(.*)$/);
    if (m) { cond = m[1]; text = m[2]; }
    const next = ctx.lines[ctx.i];
    const body = next && next.indent > indent ? parseBlock(ctx, next.indent, false) : [];
    options.push({ text, cond, body });
  }
  return { t: 'choice', options };
}

function parseIf(ctx, indent) {
  const branches = [];
  const first = ctx.lines[ctx.i++];
  branches.push({ cond: first.text.match(/^<<if\s+(.+)>>$/)[1], body: parseBlock(ctx, indent, true) });
  while (ctx.i < ctx.lines.length) {
    const L = ctx.lines[ctx.i];
    let m;
    if ((m = L.text.match(/^<<elseif\s+(.+)>>$/))) { ctx.i++; branches.push({ cond: m[1], body: parseBlock(ctx, indent, true) }); }
    else if (L.text === '<<else>>') { ctx.i++; branches.push({ cond: 'true', body: parseBlock(ctx, indent, true) }); }
    else if (L.text === '<<endif>>') { ctx.i++; break; }
    else { console.warn(`[script] ${ctx.id}: missing <<endif>>`); break; }
  }
  return { t: 'if', branches };
}

function parseSimple(s, ctx) {
  let m;
  if ((m = s.match(/^->\s*([\w.-]+)$/))) return { t: 'goto', node: m[1] };
  if ((m = s.match(/^<<(\w+)\s*(.*?)>>$/))) return { t: 'cmd', name: m[1], args: m[2] };
  if (s.startsWith(':')) return { t: 'say', who: null, text: s.slice(1).trim() };
  if ((m = s.match(/^([a-z_]+)(?:\.([a-z_]+))?:\s*(.*)$/)) && speakers.has(m[1])) return { t: 'say', who: m[1], expr: m[2] || null, text: m[3] };
  return { t: 'say', who: null, text: s };
}

// ------------------------------------------------------------------ expressions
const exprCache = new Map();
export function compileExpr(src) {
  if (exprCache.has(src)) return exprCache.get(src);
  const js = src
    .replace(/\band\b/g, '&&').replace(/\bor\b/g, '||').replace(/\bnot\b/g, '!')
    .replace(/(^|[^=!<>])=([^=])/g, '$1==$2');
  let fn;
  try {
    // eslint-disable-next-line no-new-func
    fn = new Function('c', 'with (c) { return (' + js + '); }');
  } catch (e) {
    console.warn('[script] bad expression', src, e);
    fn = () => false;
  }
  exprCache.set(src, fn);
  return fn;
}

// ------------------------------------------------------------------ runner
const STOP = { stop: true };

export class Runner {
  // host: { say(who, expr, text), choose(options) -> index, context() -> expr ctx, command(name, args, runner) }
  constructor(host) { this.host = host; this.running = false; }

  eval(src) {
    try { return !!compileExpr(src)(this.host.context()); } catch (e) { console.warn('[script] eval', src, e.message); return false; }
  }

  async run(nodeId) {
    if (!nodes.has(nodeId)) { console.warn('[script] missing node', nodeId); return; }
    this.running = true;
    let id = nodeId;
    try {
      while (id) {
        this.host.markSeen && this.host.markSeen(id);
        const res = await this.exec(nodes.get(id));
        id = res && res.goto ? res.goto : null;
        if (id && !nodes.has(id)) { console.warn('[script] missing node', id); id = null; }
      }
    } finally {
      this.running = false;
    }
  }

  async exec(stmts) {
    for (const st of stmts) {
      switch (st.t) {
        case 'say': await this.host.say(st.who, st.expr, st.text); break;
        case 'goto': return { goto: st.node };
        case 'if': {
          for (const b of st.branches) {
            if (this.eval(b.cond)) { const r = await this.exec(b.body); if (r) return r; break; }
          }
          break;
        }
        case 'choice': {
          const opts = st.options.filter(o => !o.cond || this.eval(o.cond));
          if (!opts.length) break;
          const idx = await this.host.choose(opts.map(o => o.text));
          const r = await this.exec(opts[idx].body);
          if (r) return r;
          break;
        }
        case 'cmd': {
          if (st.name === 'end') return STOP;
          const r = await this.host.command(st.name, st.args, this);
          if (r && (r.goto || r.stop)) return r;
          break;
        }
        default: break;
      }
    }
    return null;
  }
}
