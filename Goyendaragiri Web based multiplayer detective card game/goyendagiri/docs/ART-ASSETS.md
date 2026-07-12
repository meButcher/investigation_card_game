# Art Assets — hook map & how to replace anything

Every piece of art in Goyendagiri is a **drop-in file**: the code never needs to change.
CSS points at a fixed path; if the file exists it's shown, if it's missing the game falls
back to a built-in gradient or emoji. Replace the file → hard-refresh (Ctrl+Shift+R) → done.

All paths below are relative to `apps/client/public/`.

## Hook map

| File | Where it appears | Fallback when absent | Recommended size |
|---|---|---|---|
| `art/bg-scene.webp` | Global body background (every screen) | dark gradient | 1920×1080 webp |
| `art/bg-lobby.png` | Lobby screen backdrop | body background shows through | 1920×1080 |
| `art/bg-night.webp` | Night phase backdrop | dark radial gradient | 1920×1080 webp |
| `art/bg-end.webp` | Results screen backdrop | dark radial gradient | 1920×1080 webp |
| `art/ui/btn-brass.png` | "Start investigation" button plate (lobby) | gold CSS gradient | ~840×360, empty face — text is rendered live |
| `art/avatars/av1.png` … `av12.png` | Player chips in the lobby (`seat % 12 + 1`) | 🕵 emoji | 256×256, square, face centred |
| `icons/<name>.svg` | Card icons — `<name>` comes from each card's `icon` field in `packages/rules/src/content.ts` | 🔍 / 🗡 emoji | square SVG, single dark colour |

Where the hooks live in code (only needed if you want to ADD a hook):
- `apps/client/src/app.css` → body background, card and zoom styles
- `apps/client/src/screens/Lobby.svelte` → `.lobby-bg`, `.pav img`, `.start-plate`
- `apps/client/src/screens/Night.svelte` / `End.svelte` → `.night-bg`, `.endbg`

## Generating the pack with Gemini (Nano Banana)

The repo ships a generator at `tools/generate-art.mjs` (lobby background, brass plate,
12 Bangladeshi noir avatars — all in one consistent style). It needs Node 18+ and your
Gemini API key **as an environment variable** (never hard-code or commit the key):

```
# Windows cmd
cd goyendagiri
set GEMINI_API_KEY=YOUR_KEY
node tools/generate-art.mjs

# PowerShell
$env:GEMINI_API_KEY="YOUR_KEY"; node tools/generate-art.mjs
```

Useful flags:

- `--force` — regenerate files that already exist (default skips them, so you can re-run safely)
- `--only=avatar` — regenerate only files whose name contains "avatar" (or `bg-lobby`, `btn`, `av3`, …)
- `--model=gemini-2.5-flash-image` — pin a specific model; by default it tries
  Nano Banana Pro (`gemini-3-pro-image-preview`) and falls back automatically

Don't like one avatar? `node tools/generate-art.mjs --only=av7 --force` rerolls just that one.
Want a different vibe? Edit the `STYLE` constant or any prompt inside the script — each asset's
prompt is plain text at the top of the file.

## Replacing art by hand (Figma / Illustrator / anything)

1. Export your image to the exact filename and folder from the table above
   (PNG or WebP both work — if you use a different extension, update the one CSS line that references it).
2. Keep the design rules from earlier: **no baked-in text** (all labels are rendered live in
   Bangla + English), keep important detail out of the outer ~10% of backgrounds (they're
   cover-cropped), avatars should read at 26 px, and the brass plate must stretch, so keep
   its border detail uniform.
3. Hard-refresh the browser. If the old image sticks, your browser cached it — Ctrl+Shift+R,
   or bump the filename and CSS reference together.

## Adding a brand-new hook

1. Put the file under `apps/client/public/art/…`
2. Reference it in the relevant screen's `<style>` as a **layered** background:
   `background: url('/art/my-thing.png') center/cover no-repeat, <existing fallback>;`
   The second layer keeps the game presentable when the file is missing.
3. Add a row to the table above so future-you knows it exists.
