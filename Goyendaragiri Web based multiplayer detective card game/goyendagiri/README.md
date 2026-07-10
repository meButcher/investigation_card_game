# গোয়েন্দাগিরি (Goyendagiri) — MVP v0.1.0

4–12 player web-based hidden-role deduction game. TypeScript monorepo:
**packages/rules** (pure game engine) · **apps/server** (Colyseus, authoritative) · **apps/client** (Vite + Svelte).

Design spec: `../docs/Goyendagiri-Design-Document.md` · Codebase map: `../docs/Project-Graph.md`

## Run it locally

```bash
npm install            # once, from this folder (goyendagiri/)

npm run dev:server     # terminal 1 → ws://localhost:2567
npm run dev:client     # terminal 2 → http://localhost:5173
```

Open http://localhost:5173 in 4+ browser tabs (or share your LAN IP with friends —
they connect to `ws://<your-ip>:2567` automatically since the client targets
`location.hostname`). Create a room in one tab, join with the room code in the others.

## Verify

```bash
npm test               # 23 rules-engine unit tests (incl. visibility-leak tests)
npm run e2e            # boots the real server, 6 bots play a full game
npm run build:client   # production build (~45 KB gzipped)
```

## Deploy (design doc §12)

- **Client:** `npm run build:client` → upload `apps/client/dist/` to Cloudflare Pages.
  Set `VITE_SERVER_URL=wss://your-server-host` at build time.
- **Server:** any Node host (Railway/Fly/Hetzner): `npm install && npm -w @goyendagiri/server run start`.
  Needs TLS termination (wss) in front — the platform usually does this.

## Security audit stance — read BEFORE running `npm audit fix --force`

**Never run `npm audit fix --force` here.** It doesn't patch — it jumps to different
major frameworks (Svelte 5, Vite 8, Colyseus 0.17) that break this codebase and
mismatch the client/server protocol. If you ran it: delete `node_modules`, restore
`package.json` files from git, and run `npm ci`.

The remaining `npm audit` findings are all **dev-tooling or unreachable**, reviewed one by one:

| Advisory | Severity | Why it doesn't apply |
|---|---|---|
| vitest UI server file read | critical | Only when running `vitest --ui` server. We only ever run `vitest run`. |
| vite dev-server path traversal / fs.deny bypass / NTLM | high | Dev server only — never ships to players. Don't run `vite --host` on untrusted networks (Windows). |
| esbuild dev-server CORS | moderate | Dev server only. |
| svelte SSR XSS (×6) | moderate | SSR-only advisories. This is a pure client SPA — no SSR exists. |
| nanoid predictable IDs | moderate | Triggers only on non-integer length args; Colyseus passes a constant integer. |

What was actually fixed: the `colyseus` meta-package (which dragged in `@colyseus/auth`
→ `grant` → `elliptic`, the real critical) was **removed** — the server depends directly
on `@colyseus/core` + `@colyseus/ws-transport`, which is all the code imports.
`npm ls elliptic` → empty.

Planned dev-tooling major upgrade (Vite 7/8, Vitest 4, Svelte 5, Colyseus 0.17 client+server
together) is a roadmap item for after the first playtests — one deliberate migration, not
an audit-driven accident.

## Dev gotcha: "everyone joins their own room" (Windows)

That means multiple server processes are bound to :2567 — each holds its own room registry,
so a join code created in one process doesn't exist in the others. Fix:
`taskkill /F /IM node.exe`, then start ONE `npm run dev:server`. The server now refuses to
boot if the port already answers, so this can't happen silently again. Also: arriving via an
invite link (`?room=CODE`) now skips auto-reconnect to any old session.

## Known MVP gaps (honest list)

- Client screens are **built but not yet play-tested by humans** — run a friends game before judging it done.
- No one-tap rematch (leave + recreate room for now).
- Fonts load from Google CDN — self-host subsetted woff2 before launch (§7).
- Content deck: ~55 real bilingual cards + placeholder fillers — needs the content pass (§4).
- Version handshake (§12.1) not wired yet — deploy client+server together.
- Server restarts kill live rooms (stateless by design — §6.5).

## Art

Drop files into `apps/client/public/art/` (see `../docs/Artwork-Pipeline-Guide.md`).
`bg-scene.webp`, `bg-night.webp`, `bg-end.webp` activate automatically.
