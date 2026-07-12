#!/usr/bin/env node
// ─── Goyendagiri art generator — Gemini image API ("Nano Banana") ────────────
// Generates the lobby art pack: background, 12 Bangladeshi noir avatars, brass
// button plate. Files land in apps/client/public/ where the CSS art hooks pick
// them up automatically (see docs/ART-ASSETS.md).
//
// Usage (from the goyendagiri/ folder):
//   Windows (cmd):        set GEMINI_API_KEY=your-key && node tools/generate-art.mjs
//   Windows (PowerShell): $env:GEMINI_API_KEY="your-key"; node tools/generate-art.mjs
//   macOS/Linux:          GEMINI_API_KEY=your-key node tools/generate-art.mjs
//
// Flags:
//   --force        regenerate files that already exist (default: skip existing)
//   --only=<name>  only assets whose filename contains <name> (e.g. --only=avatar)
//   --model=<id>   override the model (default tries Nano Banana Pro, then falls back)
//
// NEVER commit your API key. The script reads it from the environment only.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(ROOT, 'apps', 'client', 'public');

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) {
  console.error('✗ Set GEMINI_API_KEY in your environment first (see usage at the top of this file).');
  process.exit(1);
}

const argv = process.argv.slice(2);
const FORCE = argv.includes('--force');
const ONLY = (argv.find(a => a.startsWith('--only=')) ?? '').split('=')[1] ?? '';
const MODEL_OVERRIDE = (argv.find(a => a.startsWith('--model=')) ?? '').split('=')[1] ?? '';

// Nano Banana Pro first; plain Nano Banana as fallback. Override with --model=…
const MODELS = MODEL_OVERRIDE
  ? [MODEL_OVERRIDE]
  : ['gemini-3-pro-image-preview', 'gemini-2.5-flash-image'];

// ── shared style so every asset belongs to the same world ──
const STYLE = `1940s Bengali detective noir, Kolkata/Dhaka period atmosphere, warm candlelight and
brass-gold accents against deep plum-brown shadows (#241722, #d9a94e), painted illustration,
cinematic rim light, film grain, NO text, NO watermark, NO logo.`;

const AVATAR_BRIEFS = [
  'middle-aged Bangladeshi man, sharp eyes, grey-flecked beard, brown fedora, trench coat',
  'young Bangladeshi woman, confident look, teep (bindi), shawl over a sari, beret tilted',
  'elderly Bangladeshi gentleman, round spectacles, white punjabi, black waistcoat, pipe',
  'young Bangladeshi man, slick side-parted hair, thin moustache, pinstripe blazer',
  'Bangladeshi woman in her 40s, steely gaze, cotton sari with shawl, umbrella handle at shoulder',
  'stocky Bangladeshi man, boat-club cap, rolled sleeves, suspicious side-glance',
  'young Bangladeshi woman journalist, notebook peeking from satchel, cropped hair, raincoat',
  'gaunt tall Bangladeshi man, karakul cap, long dark sherwani, hollow cheeks',
  'cheerful round-faced Bangladeshi tea-stall owner, gamchha on shoulder, knowing smile',
  'sharp Bangladeshi lawyer woman, black-rimmed glasses, white-collared black gown',
  'retired Bangladeshi police officer, thick moustache, khaki shirt, medal ribbon',
  'quiet Bangladeshi student, oiled hair, shawl over kurta, clutching books',
];

const ASSETS = [
  {
    file: 'art/bg-lobby.png', aspect: '16:9',
    prompt: `Wide establishing shot of a 1940s Bengali private detective's office at night for a game
lobby background: heavy wooden desk with case files, brass lamp with warm pool of light, corkboard
with photos and red string on the wall, rain-streaked window with city lights, rotary telephone,
magnifying glass. Composition keeps the CENTRE quiet and low-contrast so UI panels sit on top of it.
${STYLE}`,
  },
  {
    file: 'art/ui/btn-brass.png', aspect: '21:9',
    prompt: `A single polished engraved brass plate, rectangular with softly rounded corners, subtle
screws in the corners, warm gold metal with realistic reflections, completely EMPTY face (no text,
no engraving in the middle), isolated on a plain dark background, front-facing, for use as a button
texture. ${STYLE}`,
  },
  ...AVATAR_BRIEFS.map((brief, i) => ({
    file: `art/avatars/av${i + 1}.png`, aspect: '1:1',
    prompt: `Bust portrait game avatar: ${brief}. Head and shoulders centred, facing slightly off-camera,
moody single-source candlelight, plain dark vignette background, painterly noir comic style,
consistent with a matched set of 12 detective-game avatars. ${STYLE}`,
  })),
];

async function generate(model, prompt, aspect) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: aspect } },
    }),
  });
  if (!res.ok) throw new Error(`${model} → HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const part = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
  if (!part) throw new Error(`${model} → no image in response: ${JSON.stringify(data).slice(0, 300)}`);
  return Buffer.from(part.inlineData.data, 'base64');
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

let done = 0, skipped = 0, failed = 0;
for (const asset of ASSETS) {
  if (ONLY && !asset.file.includes(ONLY)) continue;
  const out = path.join(PUB, asset.file);
  if (!FORCE && fs.existsSync(out)) { console.log(`↷ skip (exists): ${asset.file}`); skipped++; continue; }
  fs.mkdirSync(path.dirname(out), { recursive: true });

  let ok = false;
  for (const model of MODELS) {
    for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
      try {
        process.stdout.write(`⏳ ${asset.file}  [${model}, try ${attempt}] … `);
        const buf = await generate(model, asset.prompt, asset.aspect);
        fs.writeFileSync(out, buf);
        console.log(`✓ ${(buf.length / 1024).toFixed(0)} KB`);
        ok = true; done++;
      } catch (e) {
        console.log(`✗ ${e.message.split('\n')[0]}`);
        if (String(e.message).includes('429')) await sleep(15000); // rate limit — breathe
        else await sleep(2000);
      }
    }
    if (ok) break;
  }
  if (!ok) { failed++; console.log(`‼ giving up on ${asset.file}`); }
  await sleep(1500); // stay polite to the API
}

console.log(`\nDone: ${done} generated · ${skipped} skipped · ${failed} failed`);
console.log('Hard-refresh the game (Ctrl+Shift+R) to see new art. See docs/ART-ASSETS.md for the hook map.');
