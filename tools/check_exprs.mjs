// Compiles every condition used by the story (script <<if>>/<<elseif>>, event/chatter/location
// conds) exactly as game/script.js does, and reports syntax errors.
// Usage: node tools/check_exprs.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'web', 'js', 'data');
const src = fs.readFileSync(path.join(ROOT, 'web', 'js', 'game', 'script.js'), 'utf8');
// pull the transform chain out of compileExpr so this check never drifts from the game
const body = src.slice(src.indexOf('export function compileExpr'));
const chain = body.slice(body.indexOf('const js = src') + 'const js = src'.length, body.indexOf(';', body.indexOf('const js = src')));
const transform = new Function('src', 'return src' + chain.replace(/\/\/[^\n]*/g, '') + ';');

const exprs = [];
const files = [...fs.readdirSync(path.join(DATA, 'story')).map(f => path.join(DATA, 'story', f)), ...fs.readdirSync(DATA).filter(f => f.endsWith('.js')).map(f => path.join(DATA, f))];
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  for (const m of text.matchAll(/<<\s*(?:if|elseif)\s+(.+?)>>/g)) exprs.push([m[1], path.basename(f)]);
  for (const m of text.matchAll(/\b(?:cond|when|flagCond):\s*'([^']+)'/g)) exprs.push([m[1], path.basename(f)]);
}
let bad = 0;
for (const [e, where] of exprs) {
  try { new Function('c', 'with (c) { return (' + transform(e) + '); }'); }
  catch (err) { bad++; console.log(`  ${where}: ${e}  ->  ${err.message}`); }
}
console.log(`${exprs.length} expressions, ${bad} with syntax errors`);
process.exit(bad ? 1 : 0);
