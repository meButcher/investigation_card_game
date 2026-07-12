// ─── End-to-end bot game: boots the real server, connects 6 real Colyseus
// clients, and plays a complete game through the actual network layer.
// This is the MVP's proof of life. Run: npm run e2e (from repo root)
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { Client } from 'colyseus.js';
import { fileURLToPath } from 'node:url';

const PORT = 2599;
const url = `ws://127.0.0.1:${PORT}`;
let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? '  ✓' : '  ✗ FAIL'} ${msg}`); if (!cond) failures++; };

// 1) boot the real server
const server = spawn(process.execPath, ['../../node_modules/tsx/dist/cli.mjs', 'src/index.ts'], {
  cwd: fileURLToPath(new URL('../', import.meta.url)),
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'inherit'],
});
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('server did not boot in 30s')), 30000);
  server.stdout.on('data', d => { if (String(d).includes('listening')) { clearTimeout(t); res(); } });
});
console.log('server up');

try {
  // 2) six bots join one room
  const bots = [];
  const creator = new Client(url);
  const room0 = await creator.create('goyendagiri', { name: 'P0', timerSec: null });
  const mkBot = (room, i) => {
    const b = { i, room, view: null, toasts: [] };
    room.onMessage('view', v => { b.view = v; });
    room.onMessage('toast', t => b.toasts.push(t.msg));
    room.onMessage('chat', () => {});
    return b;
  };
  bots.push(mkBot(room0, 0));
  for (let i = 1; i < 6; i++) {
    const c = new Client(url);
    bots.push(mkBot(await c.joinById(room0.roomId, { name: `P${i}` }), i));
  }
  const waitFor = async (cond, label) => {
    for (let t = 0; t < 200; t++) { if (cond()) return; await sleep(50); }
    throw new Error(`timeout waiting: ${label}`);
  };
  const byRole = role => bots.find(b => b.view?.yourRole === role);
  const send = (b, type, p = {}) => b.room.send(type, p);

  await waitFor(() => bots.every(b => b.view?.seats?.length === 6), 'all joined');
  ok(true, `6 players in room ${room0.roomId} (join code)`);

  // 3) volunteer detective (§3.1): creator designates bot 2, then starts
  const volunteerSeat = bots[2].view.seat;
  send(bots[0], 'updateSettings', { detectiveMode: 'volunteer', volunteerSeat });
  await waitFor(() => bots[0].view.volunteerSeat === volunteerSeat, 'volunteer set');
  send(bots[0], 'start');
  await waitFor(() => bots.every(b => b.view?.phase === 'initiation'), 'initiation');
  const det = byRole('detective'), mur = byRole('murderer'), acc = byRole('accomplice'), wit = byRole('witness');
  ok(det && mur && acc && wit, 'all four special roles dealt');
  ok(det.view.seat === volunteerSeat, 'volunteer became the Detective');
  for (const b of bots) send(b, 'ready');
  await waitFor(() => bots.every(b => b.view?.phase === 'study'), 'study');
  send(det, 'beginNight');
  await waitFor(() => bots.every(b => b.view?.phase === 'nightIntro'), 'night');

  // 4) night sequence
  send(det, 'callRole', { target: 'murderer' });
  await waitFor(() => mur.view.night.awaitingYou, 'murderer called');
  send(mur, 'revealAck');
  await waitFor(() => mur.view.phase === 'nightKiller', 'linked view');
  const mySeat = mur.view.seats.find(s => s.seat === mur.view.seat);
  const solution = { evidenceId: mySeat.evidence[0].id, meansId: mySeat.means[0].id };
  send(mur, 'pickSolution', solution);
  await waitFor(() => det.view.secret?.solution?.evidenceId === solution.evidenceId, 'detective sees solution');
  send(det, 'dismiss');
  send(det, 'callRole', { target: 'accomplice' });
  await waitFor(() => acc.view.night.awaitingYou, 'accomplice called');
  send(acc, 'revealAck');
  await waitFor(() => acc.view.secret?.solution, 'accomplice sees case memo');
  send(det, 'dismiss');
  send(det, 'callRole', { target: 'witness' });
  await waitFor(() => wit.view.night.awaitingYou, 'witness called');
  send(wit, 'revealAck');
  await waitFor(() => wit.view.secret?.murdererSeat !== undefined, 'witness sees murderer');
  ok(wit.view.secret.accompliceSeat === undefined, 'LEAK CHECK: witness does NOT see accomplice (v1.1 vamp)');
  send(det, 'dismiss');
  send(det, 'beginDay');
  await waitFor(() => bots.every(b => b.view.phase === 'evidence'), 'day begins');

  // 5) server-level leak checks on a plain investigator
  const inv = bots.find(b => b.view.yourRole === 'investigator');
  ok(inv.view.secret.solution === undefined, 'LEAK CHECK: investigator view has no solution');
  ok(inv.view.secret.murdererSeat === undefined, 'LEAK CHECK: investigator view has no murderer seat');
  ok(!JSON.stringify(inv.view.seats).includes('"murderer"'), 'LEAK CHECK: no role strings in public seats');

  // 6) detective places 6 markers → presentations begin
  for (let t = 0; t < 6; t++) send(det, 'placeMarker', { tileIdx: t, wordIdx: 0 });
  await waitFor(() => det.view.phase === 'presentation', 'presentation');
  ok(true, 'six markers placed, presentations started');

  // mute rule: non-presenter chat is rejected
  const current = det.view.presentation.currentSeat;
  const notCurrent = bots.find(b => b.view.seat !== current && b.view.yourRole !== 'detective');
  const toastCountBefore = notCurrent.toasts.length;
  send(notCurrent, 'chat', { text: 'interrupting!' });
  await waitFor(() => notCurrent.toasts.length > toastCountBefore, 'mute toast');
  ok(true, 'presentation mute enforced by server');

  // 7) an investigator solves it (harness knows the solution from the murderer bot)
  send(inv, 'accuse', { suspectSeat: mur.view.seat, ...solution });
  await waitFor(() => inv.view.phase === 'witnessHunt', 'witness hunt');
  const murPublic = inv.view.seats.find(s => s.revealedRole === 'murderer');
  const accPublic = inv.view.seats.find(s => s.revealedRole === 'accomplice');
  ok(!!murPublic && !!accPublic, 'v1.3: murderer + accomplice publicly revealed at hunt');

  // 8) murderer team picks the WRONG witness → investigators win
  const wrongTarget = inv.view.seat;
  send(mur, 'pickWitness', { targetSeat: wrongTarget });
  await waitFor(() => bots.every(b => b.view.phase === 'gameOver'), 'game over');
  ok(inv.view.winner === 'investigators', `investigators win (${inv.view.winReason})`);
  ok(inv.view.seats.every(s => s.revealedRole), 'full role reveal at game over');

  console.log(failures === 0 ? '\nE2E BOT GAME: ALL CHECKS PASSED' : `\nE2E BOT GAME: ${failures} FAILURES`);
} catch (e) {
  console.error('E2E ERROR:', e.message); failures++;
} finally {
  server.kill('SIGKILL');
  process.exit(failures === 0 ? 0 : 1);
}
