# Artwork Pipeline Guide — গোয়েন্দাগিরি (Candlelit Noir)

How to turn AI-generated concept renders into real, shippable game art. Written for the
mockup today and the SvelteKit client later — the same rules apply to both.

---

## 1. The one rule that governs everything

**Art never contains text or UI.** Your concept renders bake buttons, labels, and Bangla
text into the image — perfect for choosing a direction, unusable as assets. Three reasons:

1. **Localization:** every label exists in Bangla AND English and switches live. Text in a PNG can't switch.
2. **Layout:** real UI reflows (player counts, name lengths, mobile). A painted button can't stretch.
3. **Iteration:** changing "Start game" copy must be a one-line edit, not a re-render.

So the division of labor is: **art = atmosphere and ornament** (backgrounds, frames,
plaques, portraits, textures); **HTML/CSS = every word, every button, every layout**.
The restyled mockup already renders the gold plaque buttons, angled tabs, ornate panel
rings, vignette, and film grain in pure CSS — art *enriches* it, it doesn't replace it.

## 2. Asset inventory (generate in this order)

| Priority | Asset | Spec | Target size |
|---|---|---|---|
| 1 | `bg-desk.webp` — detective's desk ambient (page background) | 1920×1080, dark, low-contrast, NO focal point in center | ≤ 250 KB |
| 1 | `bg-scene.webp` — room ambience behind all screens | 1920×1080, darker/quieter than bg-desk | ≤ 250 KB |
| 2 | `frame-panel.png` — ornate gold panel border, **9-slice** | ~280×280, transparent center & background, corner ornament ≤ 34 px | ≤ 60 KB |
| 3 | `bg-night.webp`, `bg-init.webp`, `bg-end.webp` — phase moods | 1920×1080 (moon/bamboo; shuffling table; dawn reveal) | ≤ 250 KB each |
| 4 | 12 avatar portraits `avatar-01.webp` … | 256×256, consistent style, noir hats/lanterns | ≤ 20 KB each |
| 5 | Card frames: `card-evidence.png`, `card-means.png`, `card-role.png` (back) | 512×704 (portrait ratio matching CSS cards), transparent art window | ≤ 80 KB each |
| 6 | `marker-hat.png` — the 🎩 marker sprite | 128×128 transparent | ≤ 15 KB |
| 7 | Per-card art `cards/<id>.webp` (post-MVP, §4.2 of design doc) | 512×512 | ≤ 40 KB each |

Icons stay **SVG** (game-icons.net, CC-BY) — never rasterize icons.

## 3. Generating usable assets from an image model

- **Backgrounds:** prompt the scene explicitly *without* interface: "…no text, no UI, no buttons, empty desk surface, space in the center". Generate at 2× (e.g. 3840×2160) and downscale — AI artifacts vanish when halved.
- **Consistency:** reuse one style block in every prompt ("candlelit noir, warm plum-brown shadows, antique gold accents, engraved brass ornaments, soft film grain, Bengali village mystery") and, if your tool supports it, a style-reference image or seed. Generate all assets of one type in one session.
- **Frames/ornaments:** ask for the element **isolated on a plain solid background** ("ornate rectangular gold frame, engraved corners, isolated on flat black background, symmetrical"). Then remove the background (any bg-removal tool) and make the *center* transparent too for 9-slice frames.
- **Portraits:** one prompt template, swap only the person description; same lighting phrase every time; crop to square 256.
- **Reject** anything with accidental text/letters — AI loves inventing gibberish signage.

## 4. Post-processing (the 10-minute pipeline)

1. Crop/trim transparent edges.
2. Downscale to spec size.
3. Compress: WebP for photos/scenes (`quality 75`), PNG only where transparency + crisp edges matter (frames, sprites). Fastest tools: [squoosh.app](https://squoosh.app) (browser, zero install) or CLI:
   ```bash
   npx sharp-cli -i input.png -o bg-scene.webp --resize 1920 -f webp -q 75
   ```
4. Check the size column above — over budget means re-compress, not ship-anyway.

**What is 9-slice?** The frame image is cut into 9 zones (4 corners, 4 edges, center);
corners stay pixel-perfect while edges stretch, so one frame fits any panel size. The
mockup already declares it:

```css
border-image-source: url('art/frame-panel.png');
border-image-slice: 34 fill;   /* 34px corners — match your ornament size */
border-image-width: 14px;
```

If your frame's corner ornament is larger/smaller than 34 px, change `slice` to match.

## 5. Where files go & how they activate

**Mockup (today):** create `mockups/art/` and drop files with the exact names from §2.
The mockup's CSS already references them behind gradient scrims — **missing files are
harmless** (CSS falls back to gradients/borders), present files appear instantly on refresh.
That's the whole integration: no code edits.

**Real client (later):** same files move to `apps/client/static/art/`, referenced identically
(`/art/bg-scene.webp`). Per-card art goes to `static/cards/<id>.webp`, keyed from the
content Sheet (design doc §4.2), with the icon+name template as automatic fallback.

Naming: kebab-case, no spaces, no Bangla in filenames (URLs), content-hashed by the
bundler at build time — you never version filenames manually.

## 6. Performance budget (from design doc §8)

First load ≤ 2 MB total. Reserve: ~200 KB fonts + ~300 KB JS/CSS ⇒ **art gets ~1.2 MB
on first load**. That means: `bg-scene` + `frame-panel` + avatars load up front; phase
backgrounds (`bg-night`, `bg-init`, `bg-end`) lazy-load when their screen first shows
(`loading="lazy"` / dynamic import); per-card art lazy-loads per game. Never preload
everything — a party game that loads in 3 s beats a prettier one that loads in 15.

## 7. Checklist per asset

- [ ] No text, no UI elements baked in
- [ ] Correct size + format from §2, under budget
- [ ] Transparent where required (frames, sprites)
- [ ] Consistent with the Candlelit Noir style block (§3)
- [ ] Filename exact (hooks are name-matched)
- [ ] Looks right on BOTH device toggles in the mockup after refresh
