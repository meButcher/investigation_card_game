# Content Authoring Guide — cards, tiles & assets

*Where the game's content actually lives and how to add to it.*

## The honest answer first: there is no spreadsheet yet

The design doc (§4.2) describes a Google Sheet → JSON pipeline, but that's the **planned**
pipeline — nobody has created the Sheet. Right now, **all cards and tiles live in one
TypeScript file**:

```
goyendagiri/packages/rules/src/content.ts   ← THE content file (edit this)
```

That's not a hack — for a solo dev, editing a code file with your cards in it IS the MVP
pipeline. The Sheet becomes worth building when a non-coder (a co-writer, a translator)
needs to edit content. Section 4 below shows how to graduate to it.

## 1. Adding / editing CARDS (evidence & means)

Open `content.ts`. Two arrays at the top:

```ts
const EV: [string, string, string][] = [        // evidence cards (yellow)
  ['কাদা মাখা জুতা', 'Muddy shoes', 'boot-prints'],
  //  ↑ Bangla name    ↑ English name  ↑ icon key
  ...
];
const MN: [string, string, string][] = [        // means-of-murder cards (blue)
  ['কুড়াল', 'Axe', 'axe'],
  ...
];
```

**To add a card:** add one line `['বাংলা নাম', 'English name', 'icon-key'],` to the right
array. That's it — ids (`ev_031`, `mn_026`…) are generated automatically from position,
and the deck auto-fills with placeholder cards up to 60 of each type (the `fill()` call
at the bottom — raise the `60` if you author more than 60 real cards).

**Rules that keep the game playable** (design doc §4.2):
- Never delete cards mid-position — append at the end (ids are positional; reordering
  changes ids, which only matters if games are in progress — between sessions it's fine).
- Minimum deck: ≥55 of each type (12 players × hard mode 5 = 55 dealt).
- Every Means card should plausibly connect to ≥3 "cause of death" words; evidence should
  be ambiguous everyday objects. If one card instantly gives away a pairing, it's too specific.
- The icon key is just a string for now; it becomes the art filename later (see §3).

## 2. Adding / editing TILES

Same file, lower down:

- `CAUSE_TILE` — fixed, 6 words. Edit words in place.
- `LOCATION_TILES` — exactly 4 tiles, 6 words each. Edit in place.
- `SCENE` — the interesting one. Each entry is:
  ```ts
  ['ঘটনার সূত্র · State of the scene', [['এলোমেলো', 'Disarray'], ...6 word pairs]],
  ```
  **Add scene tiles freely** (append entries) — more scene tiles = more variety per game.
  Every tile must have **exactly 6 words** (the UI grid and marker logic assume it).

After any content edit: `npm test` (the deck-size and duplicate-id tests will catch mistakes),
then restart the dev server.

## 3. Art assets (recap — full detail in Artwork-Pipeline-Guide.md)

- Backgrounds → `goyendagiri/apps/client/public/art/` with the exact hook filenames
  (`bg-scene.webp`, `bg-night.webp`, `bg-end.webp`). Drop in → refresh → visible.
- Per-card art (later): `public/cards/<id>.webp` where `<id>` is the card id (`ev_002.webp`).
  The icon key in `content.ts` is the fallback/lookup name. No code changes needed when
  the render-fallback chain lands (roadmap).
- Never put text inside artwork. Ever.

## 4. Graduating to the Google Sheet (when you want it)

1. Create a Sheet with two tabs. **Cards:** columns `type (evidence|means) | bn | en | icon`.
   **Tiles:** columns `kind (cause|location|scene) | title_bn | title_en | w1_bn | w1_en | … | w6_bn | w6_en`.
2. File → Share → Publish to web → CSV per tab. You get two stable URLs.
3. Ask me to write `scripts/pull-content.mjs`: fetches both CSVs, validates (unique names,
   6 words per tile, min deck counts), and regenerates `content.ts`. One command
   (`npm run content`), the Sheet becomes the authoring surface, git stays the source of truth.

Until a second person needs to edit content, step 1–3 buy you nothing over editing
`content.ts` directly — which is why they're not built yet.
