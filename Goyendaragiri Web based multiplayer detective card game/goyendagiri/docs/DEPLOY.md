# Free hosting for alpha testing

The game is two deployables with different needs:

| Part | What it is | Needs | Free home |
|---|---|---|---|
| `apps/client` | static files (Vite build) | any static host | **Cloudflare Pages** / Netlify / Vercel |
| `apps/server` | Node + Colyseus, **WebSockets** | a long-running process — NOT serverless | **Colyseus Cloud free tier** or **Render free tier** |

⚠ Vercel/Netlify can host the *client* but NOT the server — their functions are serverless and drop WebSockets.

## Option A (least friction): Colyseus Cloud + Cloudflare Pages

1. Sign up at https://cloud.colyseus.io (free tier), create an app, and follow their deploy flow
   for the `apps/server` folder (they host Colyseus natively — no config gymnastics).
2. Note your server URL, e.g. `wss://xxxx.colyseus.cloud`.
3. Build the client with that URL baked in:
   ```
   cd apps/client
   set VITE_SERVER_URL=wss://xxxx.colyseus.cloud
   npm run build
   ```
4. Push the repo to GitHub → Cloudflare Pages → "connect repo", set:
   - build command: `cd apps/client && npm install && npm run build`
   - output dir: `apps/client/dist`
   - env var: `VITE_SERVER_URL=wss://xxxx.colyseus.cloud`
5. Share the `*.pages.dev` URL with playtesters. Buy a domain later and attach it in the
   Pages dashboard — nothing in the code changes.

## Option B: Render free web service (server) + any static host

1. Push to GitHub. On https://render.com create a **Web Service** from the repo:
   - root directory: `goyendagiri`
   - build command: `npm install`
   - start command: `npm --workspace apps/server run start` (check `apps/server/package.json`
     has a start script — `node --loader ts-node/esm src/index.ts` or prebuilt `node dist/index.js`)
   - instance type: **Free**
2. Render gives you `https://yourapp.onrender.com`; the WS URL is `wss://yourapp.onrender.com`
   (the server must listen on `process.env.PORT` — Colyseus template does).
3. Client on Cloudflare Pages/Netlify with `VITE_SERVER_URL=wss://yourapp.onrender.com`.

**Free-tier caveats (fine for alpha):** Render free services sleep after ~15 min idle and take
30–50 s to cold-start — the first player to open the game wakes it; tell testers to be patient
on the first load. 750 free hours/month is plenty. Alternatives with similar free tiers:
Koyeb (free nano instance) and Fly.io (small free allowance, card required).

## Checklist before first deploy

- `net.ts` already auto-detects: on a hosted domain it connects to `VITE_SERVER_URL`, so set
  that env var at build time.
- Server binds `process.env.PORT` (Render/Koyeb inject it).
- Test with two phones on mobile data (not your wifi) to confirm it's really public.
