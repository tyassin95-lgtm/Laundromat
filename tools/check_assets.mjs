// Checks that every sprite, background and sound the code/data refer to by name exists in
// web/assets (a missing one would silently draw or play nothing), and that every preloaded
// sound file exists. Usage: node tools/check_assets.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = path.join(ROOT, 'web');
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (p.endsWith('.js')) files.push(p); } })(path.join(WEB, 'js'));
const src = files.map(f => [f, fs.readFileSync(f, 'utf8')]);
const has = (dir, name, ext) => fs.existsSync(path.join(WEB, 'assets', dir, name + ext));
const manifest = JSON.parse(fs.readFileSync(path.join(WEB, 'assets', 'sprites', 'manifest.json'), 'utf8'));
const problems = [];
const seen = new Set();
const check = (kind, name, where) => {
  const key = kind + ':' + name; if (seen.has(key)) return; seen.add(key);
  let ok = true;
  if (kind === 'sprite') ok = !!manifest[name] && has('sprites', name, '.webp');
  if (kind === 'bg') ok = has('bg', name, '.webp');
  if (kind === 'sfx') ok = has('audio/sfx', name, '.ogg');
  if (kind === 'amb') ok = has('audio/amb', name, '.ogg');
  if (kind === 'music') ok = has('audio/music', name, '.ogg');
  if (!ok) problems.push(`${kind} "${name}" (${path.relative(ROOT, where)})`);
};
for (const [f, s] of src) {
  // quoted names that look like sprite ids
  for (const m of s.matchAll(/['"`]((?:item|icon|furn|decor|machine|street|face|npc|player|ui|prop)_[a-z0-9_]+)['"`]/g)) {
    if (f.endsWith('characters.js') && m[1].startsWith('face_')) continue;   // built from parts
    if (f.endsWith(path.join('engine', 'audio.js'))) continue;                 // sound names, not sprites
    if (new RegExp(`Sound\\.(play|music)\\(\\s*['"]${m[1]}`).test(s)) continue;
    check('sprite', m[1], f);
  }
  for (const m of s.matchAll(/Assets\.bg\(\s*'([a-z_]+)'/g)) check('bg', m[1], f);
  for (const m of s.matchAll(/\b(?:bg|lights):\s*'([a-z_]+)'/g)) if (f.endsWith('locations.js')) check('bg', m[1], f);
  for (const m of s.matchAll(/Sound\.play\(\s*'([a-z0-9_]+)'/g)) check('sfx', m[1], f);
  for (const m of s.matchAll(/Sound\.play\(\s*rand\.pick\(\[([^\]]+)\]/g)) for (const n of m[1].matchAll(/'([a-z0-9_]+)'/g)) check('sfx', n[1], f);
  for (const m of s.matchAll(/Sound\.music\(\s*'([a-z0-9_]+)'/g)) check('music', m[1], f);
  for (const m of s.matchAll(/\bamb_[a-z_]+\b/g)) if (!/SFX_NAMES/.test(m[0])) check('amb', m[0], f);
  for (const m of s.matchAll(/\bmusic:\s*'([a-z0-9_]+)'/g)) check('music', m[1], f);
}
// story scripts: <<sfx name>> and <<music name>>, portraits face_<who>_<expr>
for (const [f, s] of src) {
  for (const m of s.matchAll(/<<sfx\s+([a-z0-9_]+)/g)) check('sfx', m[1], f);
  for (const m of s.matchAll(/<<music\s+([a-z0-9_]+)/g)) if (m[1] !== 'none') check('music', m[1], f);
}
const chars = fs.readFileSync(path.join(WEB, 'js', 'data', 'characters.js'), 'utf8');
for (const m of chars.matchAll(/portrait:\s*'([a-z]+)'[^\n]*\n\s*exprs:\s*\[([^\]]+)\]/g)) for (const e of m[2].matchAll(/'([a-z]+)'/g)) check('sprite', `face_${m[1]}_${e[1]}`, path.join(WEB, 'js', 'data', 'characters.js'));
// preload list
const audio = fs.readFileSync(path.join(WEB, 'js', 'engine', 'audio.js'), 'utf8');
const list = audio.slice(audio.indexOf('const SFX_NAMES'), audio.indexOf('];', audio.indexOf('const SFX_NAMES')));
const pre = [...list.matchAll(/'([a-z0-9_]+)'/g)].map(m => m[1]);
for (const n of pre) check('sfx', n, path.join(WEB, 'js', 'engine', 'audio.js'));
const notPreloaded = [...seen].filter(k => k.startsWith('sfx:')).map(k => k.slice(4)).filter(n => !pre.includes(n));
console.log(`${seen.size} asset references checked, ${problems.length} missing`);
for (const p of problems) console.log('  missing', p);
if (notPreloaded.length) console.log('  sfx used but not preloaded:', notPreloaded.join(', '));
process.exit(problems.length || notPreloaded.length ? 1 : 0);
