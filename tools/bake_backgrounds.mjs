// Bake procedural backgrounds into web/assets/bg using headless Chromium.
// Usage: node tools/bake_backgrounds.mjs [scene[:variant] ...]
// Needs Playwright (npm i -g playwright or local); uses the browser from PLAYWRIGHT_BROWSERS_PATH.
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch (e) {
  const g = execSync('npm root -g').toString().trim();
  playwright = require(path.join(g, 'playwright'));
}
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'web', 'assets', 'bg');

// Painted with Higgsfield (see tools/art_requests.json and art/source/generated/): baking these
// again would replace the painting with the procedural version, so they're only baked when named
// exactly (e.g. park:base) or with --force.
const GENERATED = new Set(['park:base', 'riverside:base', 'map:base']);

// name -> list of [variant, output file, format]
export const JOBS = {
  laundromat: [['base', 'laundromat.webp']],
};

async function main() {
  const args = process.argv.slice(2).filter(a => a !== '--force');
  const force = process.argv.includes('--force');
  const scale = parseFloat(process.env.BAKE_SCALE || '1.5');
  const browser = await playwright.chromium.launch({ args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage();
  page.on('console', m => console.log('[page]', m.text()));
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.goto('file://' + path.join(ROOT, 'tools', 'paint', 'index.html'));
  fs.mkdirSync(OUT, { recursive: true });
  const jobsMod = await import('file://' + path.join(ROOT, 'tools', 'paint', 'jobs.mjs')).catch(() => null);
  const jobs = jobsMod ? jobsMod.JOBS : JOBS;
  const scales = (jobsMod && jobsMod.SCALES) || {};
  for (const [name, variants] of Object.entries(jobs)) {
    for (const [variant, file, fmt, q] of variants) {
      const key = name + ':' + variant;
      if (args.length && !args.includes(name) && !args.includes(key)) continue;
      if (GENERATED.has(key) && !args.includes(key) && !force) { console.log('keeping generated', key); continue; }
      const t0 = Date.now();
      const sc = scales[name] || scale;
      const url = await page.evaluate(([n, v, s, f, qq]) => window.render(n, v, s, f, qq), [name, variant, sc, fmt || 'image/webp', q || 0.86]);
      const b64 = url.split(',')[1];
      fs.writeFileSync(path.join(OUT, file), Buffer.from(b64, 'base64'));
      console.log('baked', key, '->', file, (Buffer.from(b64, 'base64').length / 1024 | 0) + 'KB', (Date.now() - t0) + 'ms');
    }
  }
  await browser.close();
}
main().catch(e => { console.error(e); process.exit(1); });
