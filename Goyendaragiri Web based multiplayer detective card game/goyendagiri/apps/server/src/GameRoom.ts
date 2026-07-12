// ─── Colyseus room: thin network shell around @goyendagiri/rules. ─────────────
// No @colyseus/schema state on purpose (design doc §6.4): the authoritative
// GameState lives here as a plain object, and every client only ever receives
// its per-role filtered view via targeted send. Secrets never ride a broadcast.
import { Room, Client } from '@colyseus/core';
import {
  createLobby, addPlayer, apply, start, buildViewFor, rng,
  type Action, type GameState,
} from '@goyendagiri/rules';

const GRACE_SECONDS = 120; // §3.5 v1.3
const STUDY_SECONDS = 300;

interface JoinOptions { name?: string }

export class GameRoom extends Room {
  maxClients = 12;
  private game: GameState = createLobby();
  private seatBySession = new Map<string, number>();
  private creatorSession: string | null = null;
  private presentationTimer: any = null;
  private studyTimer: any = null;
  private botTimer: any = null;

  onCreate(options: { timerSec?: number | null; difficulty?: 3 | 4 | 5 } = {}) {
    this.setPrivate(true); // friends-play MVP: rooms joinable by id (the join code) only
    this.game = createLobby({ timerSec: options.timerSec, difficulty: options.difficulty });

    this.onMessage('*', (client, type, payload) => {
      const seat = this.seatBySession.get(client.sessionId);
      if (seat === undefined) return;
      this.handle(client, String(type), seat, payload ?? {});
    });
  }

  private handle(client: Client, type: string, seat: number, p: any) {
    // chat is not a rules action — server enforces mute (§3.4) then relays
    if (type === 'chat') {
      const text = String(p.text ?? '').slice(0, 300);
      if (!text) return;
      const pres = this.game.presentation;
      if (this.game.phase === 'presentation' && pres && pres.order[pres.idx] !== seat) {
        client.send('toast', { msg: 'উপস্থাপনার সময় শুধু বক্তা লিখতে পারেন · Only the presenter may chat now' });
        return;
      }
      if (this.game.seats[seat]?.role === 'detective' && this.game.phase !== 'lobby' && this.game.phase !== 'gameOver') {
        client.send('toast', { msg: 'Golden Rule 1: গোয়েন্দা চ্যাট করতে পারেন না · the Detective cannot chat' });
        return;
      }
      this.broadcast('chat', { seat, name: this.game.seats[seat]?.name, text });
      return;
    }

    if (type === 'updateSettings') {
      if (client.sessionId !== this.creatorSession || this.game.phase !== 'lobby') return;
      const st = this.game.settings;
      const seatExists = (n: unknown) => typeof n === 'number' && this.game.seats.some(x => x.seat === n);
      const detectiveMode = p.detectiveMode === 'random' || p.detectiveMode === 'volunteer' ? p.detectiveMode : st.detectiveMode;
      const verdictMode = p.verdictMode === 'auto' || p.verdictMode === 'detective' ? p.verdictMode : st.verdictMode;
      this.game = {
        ...this.game,
        volunteerSeat: 'volunteerSeat' in p
          ? (p.volunteerSeat === null || seatExists(p.volunteerSeat) ? p.volunteerSeat : this.game.volunteerSeat)
          : (detectiveMode === 'random' ? null : this.game.volunteerSeat),
        settings: {
          difficulty: [3, 4, 5].includes(p.difficulty) ? p.difficulty : st.difficulty,
          timerSec: p.timerSec === null || [30, 45, 60].includes(p.timerSec) ? p.timerSec : st.timerSec,
          rounds: [2, 3, 4, 5].includes(p.rounds) ? p.rounds : st.rounds,
          detectiveMode,
          verdictMode,
        },
      };
      this.pushViews();
      return;
    }

    if (type === 'start') {
      if (client.sessionId !== this.creatorSession) return;
      const seed = (Math.random() * 2 ** 32) >>> 0; // TODO: crypto.getRandomValues for prod
      const r = start(this.game, seat, rng(seed));
      this.finish(client, r);
      return;
    }

    // Host escape hatch (§6.5): abort ANY phase back to a fresh lobby. Keeps the
    // same room/code and every still-connected player; disconnected players are
    // dropped. This unsticks a game deadlocked on a vanished player's turn.
    if (type === 'resetLobby') {
      // creator anytime; ANY player once the game is over (v1.7 rematch flow)
      if (client.sessionId !== this.creatorSession && this.game.phase !== 'gameOver') return;
      this.resetToLobby();
      return;
    }

    // host-only lobby bot management (alpha testing)
    if (type === 'addBot') {
      if (client.sessionId !== this.creatorSession || this.game.phase !== 'lobby') return;
      if (this.game.seats.length >= 12) return;
      const n = this.game.seats.filter(s => s.isBot).length + 1;
      this.game = addPlayer(this.game, `🤖 বট ${n}`, true);
      this.pushViews();
      return;
    }
    if (type === 'removeBot') {
      if (client.sessionId !== this.creatorSession || this.game.phase !== 'lobby') return;
      const bot = [...this.game.seats].reverse().find(s => s.isBot);
      if (!bot) return;
      const remaining = this.game.seats.filter(s => s.seat !== bot.seat);
      const remap = new Map(remaining.map((s, i) => [s.seat, i]));
      const nextMap = new Map<string, number>();
      for (const [sid, old] of this.seatBySession) {
        const n = remap.get(old);
        if (n !== undefined) nextMap.set(sid, n);
      }
      this.seatBySession = nextMap;
      const vol = this.game.volunteerSeat;
      this.game = {
        ...this.game,
        seats: remaining.map((s, i) => ({ ...s, seat: i })),
        creatorSeat: remap.get(this.game.creatorSeat) ?? 0,
        volunteerSeat: vol === null || vol === bot.seat ? null : remap.get(vol) ?? null,
      };
      this.pushViews();
      return;
    }

    const map: Record<string, (p: any) => Action | null> = {
      ready: () => ({ type: 'READY', seat }),
      beginNight: () => ({ type: 'BEGIN_NIGHT', seat }),
      callRole: () => ({ type: 'CALL_ROLE', seat, target: p.target }),
      revealAck: () => ({ type: 'REVEAL_ACK', seat }),
      pickSolution: () => ({ type: 'PICK_SOLUTION', seat, evidenceId: String(p.evidenceId), meansId: String(p.meansId) }),
      dismiss: () => ({ type: 'DISMISS', seat }),
      beginDay: () => ({ type: 'BEGIN_DAY', seat }),
      placeMarker: () => ({ type: 'PLACE_MARKER', seat, tileIdx: Number(p.tileIdx), wordIdx: Number(p.wordIdx) }),
      swapDraw: () => ({ type: 'SWAP_DRAW', seat }),
      swapChoose: () => ({ type: 'SWAP_CHOOSE', seat, chosenIdx: Number(p.chosenIdx), discardTileIdx: Number(p.discardTileIdx) }),
      swapDecline: () => ({ type: 'SWAP_DECLINE', seat }),
      verdict: () => ({ type: 'VERDICT', seat, agree: !!p.agree }),
      abstain: () => ({ type: 'ABSTAIN', seat }),
      pass: () => ({ type: 'PASS', seat }),
      forcePass: () => ({ type: 'FORCE_PASS', seat }),
      accuse: () => ({ type: 'ACCUSE', seat, suspectSeat: Number(p.suspectSeat), evidenceId: String(p.evidenceId), meansId: String(p.meansId) }),
      pickWitness: () => ({ type: 'PICK_WITNESS', seat, targetSeat: Number(p.targetSeat) }),
    };
    const mk = map[type];
    if (!mk) return;
    const action = mk(p);
    if (!action) return;
    this.finish(client, apply(this.game, action));
  }

  private finish(client: Client, r: { next: GameState; error?: string }) {
    if (r.error) { client.send('toast', { msg: r.error }); return; }
    const prevPhase = this.game.phase;
    const prevIdx = this.game.presentation?.idx;
    const prevPending = this.game.pendingAccusation !== null;
    this.game = r.next;
    const nowPending = this.game.pendingAccusation !== null;
    if (this.game.phase !== prevPhase || this.game.presentation?.idx !== prevIdx || prevPending !== nowPending) {
      this.armPresentationTimer();
      this.armStudyTimer();
    }
    this.pushViews();
    this.armBots();
  }

  /** Server-driven presentation countdown (§3.4). ∞ mode = no timer. */
  private armPresentationTimer() {
    if (this.presentationTimer) { this.presentationTimer.clear(); this.presentationTimer = null; }
    const t = this.game.settings.timerSec;
    if (this.game.phase !== 'presentation' || t === null) return;
    if (this.game.pendingAccusation) return; // verdict pending — clock stops (§3.4 v1.6)
    const current = this.game.presentation!.order[this.game.presentation!.idx];
    this.presentationTimer = this.clock.setTimeout(() => {
      this.finish({ send: () => {} } as any, apply(this.game, { type: 'PASS', seat: current }));
    }, t * 1000);
  }

  /** Auto-advance study → night after STUDY_SECONDS; detective may force-start earlier. */
  private armStudyTimer() {
    if (this.studyTimer) { this.studyTimer.clear(); this.studyTimer = null; }
    if (this.game.phase !== 'study') return;
    const det = this.game.seats.find(s => s.role === 'detective');
    if (!det) return;
    this.studyTimer = this.clock.setTimeout(() => {
      this.finish({ send: () => {} } as any, apply(this.game, { type: 'BEGIN_NIGHT', seat: det.seat }));
    }, STUDY_SECONDS * 1000);
  }

  /** Bots act one beat at a time; every finish() re-arms until nothing is pending. */
  private armBots() {
    if (this.botTimer) { this.botTimer.clear(); this.botTimer = null; }
    const g = this.game;
    if (g.winner) return;
    const bots = g.seats.filter(s => s.isBot);
    if (!bots.length) return;
    const act = (delay: number, action: Action) => {
      this.botTimer = this.clock.setTimeout(
        () => this.finish({ send: () => {} } as any, apply(this.game, action)), delay);
    };
    if (g.phase === 'initiation') {
      const b = bots.find(x => !x.ready);
      if (b) return act(900, { type: 'READY', seat: b.seat });
    }
    if (g.night.awaitingReveal) {
      const called = g.seats.find(x => x.role === g.night.awaitingReveal);
      if (called?.isBot) return act(1200, { type: 'REVEAL_ACK', seat: called.seat });
    }
    if (g.phase === 'nightKiller') {
      const mur = g.seats.find(x => x.role === 'murderer');
      if (mur?.isBot && !g.solution) {
        const ev = mur.evidence[Math.floor(Math.random() * mur.evidence.length)];
        const mn = mur.means[Math.floor(Math.random() * mur.means.length)];
        return act(1500, { type: 'PICK_SOLUTION', seat: mur.seat, evidenceId: ev.id, meansId: mn.id });
      }
    }
    if (g.phase === 'presentation' && g.presentation) {
      const cur = g.presentation.order[g.presentation.idx];
      if (g.seats.find(x => x.seat === cur)?.isBot) return act(4000, { type: 'PASS', seat: cur });
    }
    if (g.phase === 'finalVote') {
      const b = bots.find(x => x.role !== 'detective' && x.hasInvestigationCard && !g.finalActed.includes(x.seat));
      if (b) return act(2000, { type: 'ABSTAIN', seat: b.seat });
    }
    if (g.phase === 'witnessHunt') {
      const mur = g.seats.find(x => x.role === 'murderer');
      if (mur?.isBot) {
        const targets = g.seats.filter(x => x.role !== 'detective' && x.role !== 'murderer' && x.role !== 'accomplice');
        const t = targets[Math.floor(Math.random() * targets.length)];
        if (t) return act(3000, { type: 'PICK_WITNESS', seat: mur.seat, targetSeat: t.seat });
      }
    }
  }

  private pushViews() {
    for (const c of this.clients) {
      const seat = this.seatBySession.get(c.sessionId);
      if (seat === undefined) continue;
      c.send('view', buildViewFor(seat, this.game));
    }
  }

  /** Rebuild a fresh lobby from the currently-connected clients, preserving the
   *  room id (join code) and settings. Seats are re-indexed 0..n-1; the current
   *  host stays host. Called only by the creator via 'resetLobby'. */
  private resetToLobby() {
    if (this.presentationTimer) { this.presentationTimer.clear(); this.presentationTimer = null; }
    if (this.studyTimer) { this.studyTimer.clear(); this.studyTimer = null; }
    if (this.botTimer) { this.botTimer.clear(); this.botTimer = null; }
    // Only clients still in the room are connected (grace-held leavers are not in this.clients).
    const kept = this.clients.filter(c => this.seatBySession.get(c.sessionId) !== undefined);
    // Host first so it takes seat 0 and stays creator; others keep join order.
    kept.sort((a, b) => (a.sessionId === this.creatorSession ? -1 : b.sessionId === this.creatorSession ? 1 : 0));

    let g = createLobby({ timerSec: this.game.settings.timerSec, difficulty: this.game.settings.difficulty });
    const nextMap = new Map<string, number>();
    let creatorSeat = 0;
    kept.forEach((c, i) => {
      const oldSeat = this.seatBySession.get(c.sessionId)!;
      const name = this.game.seats.find(s => s.seat === oldSeat)?.name ?? 'Player';
      g = addPlayer(g, name);
      nextMap.set(c.sessionId, i);
      if (c.sessionId === this.creatorSession) creatorSeat = i;
    });

    this.seatBySession = nextMap;
    // Preserve chosen settings but clear any stale seat references.
    this.game = { ...g, creatorSeat, settings: { ...this.game.settings }, volunteerSeat: null };
    this.pushViews();
    this.armBots();
  }

  onJoin(client: Client, options: JoinOptions = {}) {
    if (this.game.phase !== 'lobby') { client.leave(4000, 'game already started'); return; }
    const name = String(options.name ?? 'Player').slice(0, 20) || 'Player';
    const seat = this.game.seats.length;
    this.game = addPlayer(this.game, name);
    this.seatBySession.set(client.sessionId, seat);
    if (this.creatorSession === null) { this.creatorSession = client.sessionId; this.game = { ...this.game, creatorSeat: seat }; }
    this.pushViews();
  }

  async onLeave(client: Client, consented: boolean) {
    const seat = this.seatBySession.get(client.sessionId);
    if (seat === undefined) return;
    this.game = apply(this.game, { type: 'SET_CONNECTED', seat, connected: false }).next;
    this.pushViews();
    if (!consented && this.game.phase !== 'lobby') {
      try {
        await this.allowReconnection(client, GRACE_SECONDS); // §3.5: 2 min grace
        this.game = apply(this.game, { type: 'SET_CONNECTED', seat, connected: true }).next;
        this.pushViews();
        return;
      } catch { /* grace expired */ }
    }
    // creator-privilege handoff (§6.5)
    if (client.sessionId === this.creatorSession) {
      const nextClient = this.clients.find(c => c.sessionId !== client.sessionId);
      if (nextClient) {
        this.creatorSession = nextClient.sessionId;
        const nextSeat = this.seatBySession.get(nextClient.sessionId);
        if (nextSeat !== undefined) {
          this.game = { ...this.game, creatorSeat: nextSeat };
        }
      } else {
        this.creatorSession = null;
      }
    }
    // lobby departures free the seat entirely (post-game leavers keep theirs for the reveal).
    // Seats are re-indexed 0..n-1 — new joins use seat = seats.length, so gaps would collide.
    if (this.game.phase === 'lobby') {
      this.seatBySession.delete(client.sessionId);
      const remaining = this.game.seats.filter(s => s.seat !== seat);
      const remap = new Map(remaining.map((s, i) => [s.seat, i]));
      const nextMap = new Map<string, number>();
      for (const [sid, old] of this.seatBySession) {
        const n = remap.get(old);
        if (n !== undefined) nextMap.set(sid, n);
      }
      this.seatBySession = nextMap;
      const vol = this.game.volunteerSeat;
      this.game = {
        ...this.game,
        seats: remaining.map((s, i) => ({ ...s, seat: i })),
        creatorSeat: remap.get(this.game.creatorSeat) ?? 0,
        volunteerSeat: vol === null || vol === seat ? null : remap.get(vol) ?? null,
      };
    }
    this.pushViews();
  }
}