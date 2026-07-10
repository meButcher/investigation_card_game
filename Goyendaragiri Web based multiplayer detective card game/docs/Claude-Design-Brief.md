# Claude Design Prototype Brief — গোয়েন্দাগিরি (Goyendagiri)

*Paste this whole document into Claude Design (or any AI design tool) to recreate the game's
UI. It contains the complete design system + every screen. Tweak individual elements by
referencing their names ("make the Case Memo panel larger").*

---

## PROJECT

Design a web multiplayer social-deduction card game called **গোয়েন্দাগিরি (Goyendagiri)** —
"Detect. Deceive. Discover." A Bengali village murder-mystery: one Detective gives clues via
markers on word-tiles; a hidden Murderer misleads; Investigators must name the exact
Evidence + Means-of-murder card pair. 4–12 players. Desktop AND mobile layouts (mobile = portrait,
bottom action bar, one-suspect-at-a-time).

## ART DIRECTION — "Candlelit Noir"

Warm plum-brown darkness lit by candlelight and antique gold. A 1950s Bengali village detective's
study: aged paper, brass ornaments, engraved gold frames, film grain, soft vignette. Serious but
warm — never cold/techy, never cartoon.

### Color tokens (use exactly)
| Token | Hex | Use |
|---|---|---|
| bg | #160f14 | page background (over a dark desk-scene photo/illustration) |
| panel | #241722 | card/panel surfaces |
| panel2 | #2b1c28 | nested surfaces |
| panel3 | #3a2636 | chips, inputs, segmented controls |
| line | #4a3440 | hairline borders |
| ink | #efe3c8 | primary text (warm cream) |
| dim | #a58d7c | secondary text |
| gold | #d9a94e | accents, active states, detective actions |
| gold-hi / gold-lo | #f0cf7a / #a87b2e | plaque-button gradient ends |
| evidence yellow | #f2c94c | evidence cards — NEVER retheme (gameplay info) |
| means blue | #5b8dd9 | means-of-murder cards — NEVER retheme |
| danger | #c8503f | accusations, murderer |
| good | #7dab6d | ready/success |
| parchment | #ded6c5 (text #352e25) | settings notepad card ONLY |

### Typography
Display/headers: **Noto Serif Bengali** (weight 800). UI/body: **Hind Siliguri**.
Every label is bilingual: "বাংলা প্রধান · English secondary" separated by " · ".

### Signature components
- **Gold plaque button**: vertical gradient gold-hi→gold→gold-lo, dark engraved text (#241505),
  inner top highlight, soft outer gold glow. Used for primary actions ("START INVESTIGATION").
- **Angled ribbon tabs**: parallelogram clip (14px skew), gold fill when active.
- **Ornate panel**: panel bg, 1px line border + faint outer gold ring, 12px radius, soft drop shadow.
- **Parchment settings notepad**: #ded6c5 paper card with a dark-brown clip/handle protruding
  top-center (90×24px, rounded, gradient #44362d→#2c201a). Rows: icon + UPPERCASE label left,
  control right, thin divider between rows. Controls: segmented pills (active = gold fill,
  dark text), chevron cycler ("3 ›"), dropdown-style value ("Auto (6+) ▼").
- **Cards**: mini 46×62 / large 96×132. Yellow gradient (evidence) or blue gradient (means),
  dark 1px border, name in Bangla bold + English small beneath. Selected = 3px gold outline + glow.
- **Clue tiles**: panel gradient, gold title + dim English subtitle, 2×3 grid of 6 word-chips
  (Bangla + small English). Marked word = gold border + 🎩 hat marker on its corner.
- **Marker motif**: the detective's hat 🎩 everywhere a clue is confirmed.

## SCREENS (design all 8, desktop + mobile variants)

**1. Landing** — centered ornate panel on desk-scene bg: logo 🎩 + game name (large gold serif),
tagline, name input, gold plaque "Create room", divider "— অথবা · or —", room-code input + Join.

**2. Lobby** — topbar (logo · "লবি · Lobby" chip · "N / 12 players" · "বাং | EN" pill).
Left 2/3: Room-code panel (huge gold serif code, dashed gold frame, Copy-link button) above a
Players grid (12 slots: filled chips = avatar + name + HOST/you badges; empty = dashed "waiting…").
Right 1/3: the **parchment settings notepad** (rows: 📊 DIFFICULTY সহজ৩/মধ্যম৪/কঠিন৫ · 🔄 ROUNDS "3 ›" ·
👥 ACCOMPLICE+WITNESS "Auto (6+) ▼" · ⏱ TIMER 30s/45s/60s/∞ · ⚖️ VERDICT Auto/Detective ·
🎩 DETECTIVE Random/Volunteer), a voice note panel, gold plaque START button, ghost Leave.

**3. Initiation** — dark stage. Top-left: ready roster (names + ✓/…). Center: character card
(150×210) mid-twirl reveal (patterned back → gold-framed front with role icon + name), then the
player's 8 cards dealing in one-by-one below. Gold "✓ প্রস্তুত · I'm ready" button.

**4. Night sequence (Detective console)** — moonlit dark bg. Left: 6-beat script list (numbered
steps, done = green ✓, current highlighted) + big gold call-to-action ("📣 Call the killer").
Right: **Case Memo** panel (danger-red border: killer's avatar/name + the 2 chosen cards) and a
"what others see" inset (dark screen: "গোয়েন্দা ঘটনাস্থল বিশ্লেষণ করছেন… Detective is analyzing
the scene of murder"). Variants: killer's linked pick view (own 8 cards large, pick 1+1, confirm);
called-player view (single gold "👁 Reveal" button); witness view (murderer's name revealed).

**5. Investigation board (THE screen)** — topbar: phase chip, round pips, presenting-player timer.
Center: 6 clue tiles (3×2 desktop, 2×3 mobile). Below: suspect grid, 4 columns, each seat = name +
badges + their 8 mini-cards; presenting seat glows gold. Desktop right rail (300px): chat/log
(system lines italic w/ gold left border), input, "🧿 Easy Investigate" ghost button, "🔍 Solve the
crime" danger button. Mobile: sticky bottom bar [🔍][🧿][💬], suspect carousel → bottom card-sheet.
Detective variant: dashed pickable words, gold "Confirm marker" bar, "🃏 Draw new tiles" (rounds 2+).
Role HUD top-right: Case Memo strip (detective/accomplice) or "🕯 YOU SAW: name" (witness).

**6. Overlays** — (a) **Solve modal**: red warning strip, 3 steps: suspect pills → their 4 evidence
cards → their 4 means cards, Cancel/Accuse!. (b) **Easy Investigate**: clue-summary chips
(tile → marked word) + all suspects' cards as tiny icon+name chips. (c) **Verdict popup**
(detective-only): "P votes X as the killer, with:" + the 2 cards large + "✗ না No / ✓ হ্যাঁ Yes"
plaques. (d) **Tile-swap**: card-deck stack (tap) → two tiles rise with flip animation → pick one →
pick which table tile it replaces → gold confirm.

**7. Final decision round** — gold-bordered banner panel over the board: "⚖️ চূড়ান্ত সিদ্ধান্ত ·
Final decision round", list of players still owing a vote, per-player buttons "🔍 Cast my vote" /
"🤐 Abstain".

**8. Endgame** — dawn-lit bg. Huge serif verdict (green "✅ তদন্তকারীরা জয়ী!" or red "🗡 খুনী দল
জয়ী!"), reason line, witness-hunt recap panel, role-reveal grid (every player + colored role:
detective gold, murderer red, accomplice orange, witness purple, investigator green), Leave button.

## RULES FOR THE DESIGNER
1. Evidence-yellow and means-blue are gameplay information — never restyle them.
2. Every string bilingual, Bangla first.
3. No text baked into artwork/illustrations.
4. Mobile = portrait-first, 44px touch targets, board above suspects, actions in thumb reach.
5. Countdown timers always show numerals, never only a shrinking bar.
