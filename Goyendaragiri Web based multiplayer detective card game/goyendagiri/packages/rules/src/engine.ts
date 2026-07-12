// ─── Goyendagiri rules engine — authoritative reducer + view filter. ─────────
// Every ruling traces to the design doc §3.4/§3.5. Pure functions, no deps.
import type { Action, ApplyResult, ClientView, GameSettings, GameState, PublicSeat, Role, Seat, Tile } from './types.js';
import { CAUSE_TILE, EVIDENCE_DECK, LOCATION_TILES, MEANS_DECK, SCENE_TILES } from './content.js';

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const shuffled = <T,>(arr: T[], rand: () => number): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

export function createLobby(settings: Partial<GameSettings> = {}): GameState {
  return {
    phase: 'lobby', round: 1, seats: [], creatorSeat: 0, volunteerSeat: null,
    settings: {
      difficulty: settings.difficulty ?? 4,
      timerSec: settings.timerSec === undefined ? 30 : settings.timerSec,
      rounds: settings.rounds ?? 3,
      detectiveMode: settings.detectiveMode ?? 'random',
      verdictMode: settings.verdictMode ?? 'auto',
    },
    tray: { tiles: [], markers: [] }, sceneDeck: [], swapDoneThisRound: false, swapDraw: null,
    solution: null,
    night: { killerDone: false, accompliceDone: false, witnessDone: false, awaitingReveal: null },
    presentation: null, pendingAccusation: null, finalActed: [],
    attempts: [], winner: null, winReason: null, log: [],
  };
}

export function addPlayer(s: GameState, name: string, isBot = false): GameState {
  const seat = s.seats.length;
  const seats = [...s.seats, {
    seat, name, connected: true, ready: false,
    role: 'investigator' as Role, evidence: [], means: [], hasInvestigationCard: false,
    isBot,
  }];
  return { ...s, seats };
}

const bySeat = (s: GameState, n: number) => s.seats.find(x => x.seat === n);
const detective = (s: GameState) => s.seats.find(x => x.role === 'detective')!;
const roleSeat = (s: GameState, r: Role) => s.seats.find(x => x.role === r);
const hasExtraRoles = (s: GameState) => s.seats.length >= 6;
const log = (s: GameState, m: string): GameState => ({ ...s, log: [...s.log, m] });
const err = (s: GameState, e: string): ApplyResult => ({ next: s, error: e });

function deal(s: GameState, rand: () => number): GameState {
  const n = s.seats.length;
  const volunteer = s.settings.detectiveMode === 'volunteer'
    && s.volunteerSeat !== null && s.seats.some(x => x.seat === s.volunteerSeat)
    ? s.volunteerSeat : null;
  const others: Role[] = ['murderer'];
  if (n >= 6) others.push('accomplice', 'witness');
  while (others.length < n - 1) others.push('investigator');
  const shuffledOthers = shuffled(others, rand);
  let order: Role[];
  if (volunteer !== null) {
    order = s.seats.map(seat => seat.seat === volunteer ? 'detective' as Role : shuffledOthers.pop()!);
  } else {
    order = shuffled(['detective' as Role, ...shuffledOthers], rand);
  }

  // bots never take the detective role — swap it onto a random human
  const detIdx = order.findIndex(r => r === 'detective');
  if (detIdx >= 0 && s.seats[detIdx]?.isBot) {
    const humans = s.seats.map((x, i) => (x.isBot ? -1 : i)).filter(i => i >= 0);
    if (humans.length) {
      const h = humans[Math.floor(rand() * humans.length)];
      [order[detIdx], order[h]] = [order[h], order[detIdx]];
    }
  }

  const evDeck = shuffled(EVIDENCE_DECK, rand);
  const mnDeck = shuffled(MEANS_DECK, rand);
  const k = s.settings.difficulty;

  const seats: Seat[] = s.seats.map((seat, i) => {
    const role = order[i];
    const isDet = role === 'detective';
    return {
      ...seat, ready: false, role,
      evidence: isDet ? [] : evDeck.splice(0, k),
      means: isDet ? [] : mnDeck.splice(0, k),
      hasInvestigationCard: !isDet,
    };
  });

  const sceneDeck = shuffled(SCENE_TILES, rand);
  const location = LOCATION_TILES[Math.floor(rand() * LOCATION_TILES.length)];
  const tiles: Tile[] = [CAUSE_TILE, location, ...sceneDeck.splice(0, 4)];

  return {
    ...s, phase: 'initiation', round: 1, seats, sceneDeck,
    tray: { tiles, markers: [null, null, null, null, null, null] },
    swapDoneThisRound: true, swapDraw: null,
    solution: null,
    night: { killerDone: false, accompliceDone: false, witnessDone: false, awaitingReveal: null },
    presentation: null, pendingAccusation: null, finalActed: [],
    attempts: [], winner: null, winReason: null,
  };
}

function startPresentation(s: GameState): GameState {
  const det = detective(s);
  const order = s.seats.filter(x => x.role !== 'detective')
    .map(x => x.seat)
    .sort((a, b) => ((a - det.seat + s.seats.length) % s.seats.length) - ((b - det.seat + s.seats.length) % s.seats.length));
  return log({ ...s, phase: 'presentation', presentation: { order, idx: 0 } }, `📣 Round ${s.round} presentations begin`);
}

/** Seats still allowed to vote in the final decision round. */
const eligibleVoters = (s: GameState) =>
  s.seats.filter(x => x.role !== 'detective' && x.hasInvestigationCard && x.connected && !s.finalActed.includes(x.seat));

function advancePresentation(s: GameState): GameState {
  const p = s.presentation!;
  if (p.idx + 1 < p.order.length) return { ...s, presentation: { ...p, idx: p.idx + 1 } };
  if (s.round < s.settings.rounds) {
    return log({ ...s, phase: 'evidence', round: s.round + 1, presentation: null, swapDoneThisRound: false },
      `🌒 Round ${s.round + 1}: detective must swap one scene tile`);
  }
  // v1.6: all rounds done → FINAL DECISION ROUND for everyone with an unspent card
  const next: GameState = { ...s, presentation: null, finalActed: [] };
  if (eligibleVoters(next).length === 0) {
    return endGame(next, 'murderer', 'All rounds ended with the crime unsolved');
  }
  return log({ ...next, phase: 'finalVote' },
    '⚖️ চূড়ান্ত সিদ্ধান্ত · Final decision round — unspent investigation cards must vote or abstain');
}

function endGame(s: GameState, winner: 'investigators' | 'murderer', reason: string): GameState {
  return log({ ...s, phase: 'gameOver', winner, winReason: reason, presentation: null, pendingAccusation: null }, `🏁 ${reason}`);
}

/** Shared outcome logic for auto-judged accusations and Detective verdicts. */
function resolveAccusation(
  s: GameState, bySeat_: number, suspectSeat: number, evidenceId: string, meansId: string, correct: boolean,
): GameState {
  const attempt = { bySeat: bySeat_, suspectSeat, evidenceId, meansId, correct };
  const seats = s.seats.map(x => x.seat === bySeat_ ? { ...x, hasInvestigationCard: false } : x);
  let next: GameState = log(
    { ...s, seats, attempts: [...s.attempts, attempt], pendingAccusation: null,
      finalActed: s.phase === 'finalVote' ? [...s.finalActed, bySeat_] : s.finalActed },
    `${correct ? '✅' : '✗'} Seat ${bySeat_} accused seat ${suspectSeat} — ${correct ? 'CORRECT' : 'the Detective says NO'}`,
  );
  if (correct) {
    const witness = roleSeat(next, 'witness');
    if (witness && witness.connected) {
      return log({ ...next, phase: 'witnessHunt' }, '🕯 Witness hunt! Murderer & accomplice revealed — find the witness');
    }
    return endGame(next, 'investigators', 'The crime was solved');
  }
  if (next.seats.every(x => x.role === 'detective' || !x.hasInvestigationCard)) {
    return endGame(next, 'murderer', 'Every investigation card was spent on wrong guesses');
  }
  if (next.phase === 'finalVote' && eligibleVoters(next).length === 0) {
    return endGame(next, 'murderer', 'The final votes are exhausted — the killer walks free');
  }
  return next;
}

export function apply(s: GameState, a: Action): ApplyResult {
  if (s.winner && a.type !== 'SET_CONNECTED') return err(s, 'game over');
  const actor = bySeat(s, a.seat);
  if (!actor) return err(s, 'unknown seat');

  switch (a.type) {
    case 'SET_CONNECTED': {
      const seats = s.seats.map(x => x.seat === a.seat ? { ...x, connected: a.connected } : x);
      return { next: { ...s, seats } };
    }

    case 'START': {
      if (s.phase !== 'lobby') return err(s, 'not in lobby');
      if (a.seat !== s.creatorSeat) return err(s, 'only room creator starts');
      if (s.seats.length < 4 || s.seats.length > 12) return err(s, 'need 4-12 players');
      return { next: log(deal(s, rng(Date.now())), '🎬 Initiation: roles and cards dealt') };
    }

    case 'READY': {
      if (s.phase !== 'initiation') return err(s, 'not initiation');
      const seats = s.seats.map(x => x.seat === a.seat ? { ...x, ready: true } : x);
      let next: GameState = { ...s, seats };
      if (seats.every(x => x.ready || !x.connected)) {
        next = log({ ...next, phase: 'study' }, '🃏 পর্যবেক্ষণ · Study the table — ৫ মিনিট · 5 minutes');
      }
      return { next };
    }

    case 'BEGIN_NIGHT': {
      if (s.phase !== 'study') return err(s, 'not study time');
      if (actor.role !== 'detective') return err(s, 'detective only');
      return { next: log({ ...s, phase: 'nightIntro' }, '🌙 Night falls. The detective takes over.') };
    }

    case 'CALL_ROLE': {
      if (actor.role !== 'detective') return err(s, 'detective only');
      if (s.night.awaitingReveal) return err(s, 'already calling someone');
      const okPhase =
        (a.target === 'murderer' && s.phase === 'nightIntro' && !s.night.killerDone) ||
        (a.target === 'accomplice' && s.phase === 'nightIntro' && s.night.killerDone && !s.night.accompliceDone && hasExtraRoles(s)) ||
        (a.target === 'witness' && s.phase === 'nightIntro' && s.night.accompliceDone && !s.night.witnessDone && hasExtraRoles(s));
      if (!okPhase) return err(s, `cannot call ${a.target} now`);
      if (!roleSeat(s, a.target)) return err(s, 'role not in play');
      return { next: { ...s, night: { ...s.night, awaitingReveal: a.target } } };
    }

    case 'REVEAL_ACK': {
      const t = s.night.awaitingReveal;
      if (!t || actor.role !== t) return err(s, 'not called');
      const phase = t === 'murderer' ? 'nightKiller' : t === 'accomplice' ? 'nightAccomplice' : 'nightWitness';
      return { next: { ...s, phase, night: { ...s.night, awaitingReveal: null } } };
    }

    case 'PICK_SOLUTION': {
      if (s.phase !== 'nightKiller' || actor.role !== 'murderer') return err(s, 'not your moment');
      const ownsEv = actor.evidence.some(c => c.id === a.evidenceId);
      const ownsMn = actor.means.some(c => c.id === a.meansId);
      if (!ownsEv || !ownsMn) return err(s, 'must pick from your own cards');
      return { next: { ...s, solution: { evidenceId: a.evidenceId, meansId: a.meansId } } };
    }

    case 'DISMISS': {
      if (actor.role !== 'detective') return err(s, 'detective only');
      if (s.phase === 'nightKiller') {
        if (!s.solution) return err(s, 'killer has not picked');
        return { next: { ...s, phase: 'nightIntro', night: { ...s.night, killerDone: true, awaitingReveal: null } } };
      }
      if (s.phase === 'nightAccomplice')
        return { next: { ...s, phase: 'nightIntro', night: { ...s.night, accompliceDone: true, awaitingReveal: null } } };
      if (s.phase === 'nightWitness')
        return { next: { ...s, phase: 'nightIntro', night: { ...s.night, witnessDone: true, awaitingReveal: null } } };
      return err(s, 'nothing to dismiss');
    }

    case 'BEGIN_DAY': {
      if (actor.role !== 'detective' || s.phase !== 'nightIntro') return err(s, 'detective only, from night');
      const needed = hasExtraRoles(s)
        ? s.night.killerDone && s.night.accompliceDone && s.night.witnessDone
        : s.night.killerDone;
      if (!needed) return err(s, 'night beats incomplete');
      return { next: log({ ...s, phase: 'evidence' }, '🌅 Investigation begins — round 1') };
    }

    case 'PLACE_MARKER': {
      if (actor.role !== 'detective' || s.phase !== 'evidence') return err(s, 'detective only, evidence phase');
      if (a.tileIdx < 0 || a.tileIdx > 5) return err(s, 'bad tile');
      if (!s.swapDoneThisRound) return err(s, 'swap a scene tile first');
      if (s.tray.markers[a.tileIdx] !== null) return err(s, 'marker already placed (final once confirmed)');
      const tile = s.tray.tiles[a.tileIdx];
      if (a.wordIdx < 0 || a.wordIdx >= tile.words.length) return err(s, 'bad word');
      const markers = s.tray.markers.map((m, i) => (i === a.tileIdx ? a.wordIdx : m));
      let next = log({ ...s, tray: { ...s.tray, markers } },
        `🎩 Marker: ${tile.bn} → ${tile.words[a.wordIdx].bn} / ${tile.words[a.wordIdx].en}`);
      if (markers.every(m => m !== null)) next = startPresentation(next);
      return { next };
    }

    // v1.6 tile swap: draw 2, choose 1, pick which scene tile it replaces
    case 'SWAP_DRAW': {
      if (actor.role !== 'detective' || s.phase !== 'evidence') return err(s, 'detective only, evidence phase');
      if (s.round === 1 || s.swapDoneThisRound) return err(s, 'no swap available');
      if (s.swapDraw) return err(s, 'already drawn');
      if (s.sceneDeck.length === 0) return err(s, 'scene deck empty');
      const deck = [...s.sceneDeck];
      const draw = deck.splice(0, Math.min(2, deck.length));
      return { next: log({ ...s, sceneDeck: deck, swapDraw: draw }, '🃏 Detective draws new tiles…') };
    }

    case 'SWAP_CHOOSE': {
      if (actor.role !== 'detective' || !s.swapDraw) return err(s, 'nothing drawn');
      if (a.chosenIdx < 0 || a.chosenIdx >= s.swapDraw.length) return err(s, 'bad choice');
      if (a.discardTileIdx < 2 || a.discardTileIdx > 5) return err(s, 'only scene tiles swap');
      const chosen = s.swapDraw[a.chosenIdx];
      const rejected = s.swapDraw.filter((_, i) => i !== a.chosenIdx);
      const tiles = s.tray.tiles.map((t, i) => (i === a.discardTileIdx ? chosen : t));
      const markers = s.tray.markers.map((m, i) => (i === a.discardTileIdx ? null : m));
      return {
        next: log({
          ...s, swapDraw: null, swapDoneThisRound: true,
          sceneDeck: [...s.sceneDeck, ...rejected],   // unchosen goes to the bottom of the deck
          tray: { tiles, markers },
        }, `🔄 Tile swapped in: ${chosen.bn} / ${chosen.en}`),
      };
    }

    case 'SWAP_DECLINE': {
      if (actor.role !== 'detective' || !s.swapDraw) return err(s, 'nothing drawn');
      let next = log({
        ...s, swapDraw: null, swapDoneThisRound: true,
        sceneDeck: [...s.sceneDeck, ...s.swapDraw],   // both drawn tiles go under the deck
      }, '✋ গোয়েন্দা টাইল বদলালেন না · Detective keeps the board unchanged');
      // no tile replaced → no marker slot freed; if the tray is already full, go
      // straight to presentations (otherwise the round could never advance)
      if (next.tray.markers.every(m => m !== null)) next = startPresentation(next);
      return { next };
    }

    case 'PASS': {
      if (s.phase !== 'presentation') return err(s, 'not presenting');
      const cur = s.presentation!.order[s.presentation!.idx];
      if (a.seat !== cur) return err(s, 'not your turn');
      return { next: advancePresentation(s) };
    }
    case 'FORCE_PASS': {
      if (s.phase !== 'presentation') return err(s, 'not presenting');
      if (actor.role !== 'detective') return err(s, 'detective only');
      const cur = s.presentation!.order[s.presentation!.idx];
      return { next: advancePresentation(log(s, `🎩 Detective ended seat ${cur}'s turn`)) };
    }

    case 'ACCUSE': {
      if (s.phase !== 'evidence' && s.phase !== 'presentation' && s.phase !== 'finalVote') return err(s, 'cannot solve now');
      if (actor.role === 'detective') return err(s, 'detective cannot solve');
      if (!actor.hasInvestigationCard) return err(s, 'investigation card spent');
      if (s.pendingAccusation) return err(s, 'the Detective is deciding another accusation');
      const suspect = bySeat(s, a.suspectSeat);
      if (!suspect || suspect.role === 'detective') return err(s, 'bad suspect');
      const ownsEv = suspect.evidence.some(c => c.id === a.evidenceId);
      const ownsMn = suspect.means.some(c => c.id === a.meansId);
      if (!ownsEv || !ownsMn) return err(s, 'cards must belong to the suspect');
      if (s.settings.verdictMode === 'detective') {
        // v1.6 orchestrated mode: the game does NOT auto-decide — the Detective does.
        return {
          next: log({ ...s, pendingAccusation: { bySeat: a.seat, suspectSeat: a.suspectSeat, evidenceId: a.evidenceId, meansId: a.meansId } },
            `⚖️ Seat ${a.seat} accuses seat ${a.suspectSeat} — awaiting the Detective's verdict`),
        };
      }
      const correct = !!s.solution && s.solution.evidenceId === a.evidenceId && s.solution.meansId === a.meansId;
      return { next: resolveAccusation(s, a.seat, a.suspectSeat, a.evidenceId, a.meansId, correct) };
    }

    case 'VERDICT': {
      if (actor.role !== 'detective') return err(s, 'detective only');
      const p = s.pendingAccusation;
      if (!p) return err(s, 'no accusation pending');
      if (a.agree) {
        // v1.7: the Detective's YES is checked against the truth — endorsing a
        // false accusation hands the killer the win.
        const actuallyCorrect = !!s.solution && s.solution.evidenceId === p.evidenceId && s.solution.meansId === p.meansId;
        if (!actuallyCorrect) {
          let next = resolveAccusation(s, p.bySeat, p.suspectSeat, p.evidenceId, p.meansId, false);
          if (!next.winner) next = endGame(next, 'murderer', 'গোয়েন্দা ভুল রায় দিলেন · the Detective endorsed a false accusation — the killer walks free');
          return { next };
        }
        return { next: resolveAccusation(s, p.bySeat, p.suspectSeat, p.evidenceId, p.meansId, true) };
      }
      // a NO from the Detective stands, true or not — the accuser's card is spent.
      return { next: resolveAccusation(s, p.bySeat, p.suspectSeat, p.evidenceId, p.meansId, false) };
    }

    case 'ABSTAIN': {
      if (s.phase !== 'finalVote') return err(s, 'not the final round');
      if (actor.role === 'detective') return err(s, 'detective does not vote');
      if (!actor.hasInvestigationCard) return err(s, 'no card to abstain with');
      if (s.finalActed.includes(a.seat)) return err(s, 'already acted');
      let next: GameState = log({ ...s, finalActed: [...s.finalActed, a.seat] },
        `🤐 Seat ${a.seat} abstains from the final vote`);
      if (eligibleVoters(next).length === 0 && !next.pendingAccusation) {
        next = endGame(next, 'murderer', 'The final votes are exhausted — the killer walks free');
      }
      return { next };
    }

    case 'PICK_WITNESS': {
      if (s.phase !== 'witnessHunt') return err(s, 'no hunt running');
      if (actor.role !== 'murderer') return err(s, 'murderer confirms the pick');
      const target = bySeat(s, a.targetSeat);
      if (!target || target.role === 'detective' || target.role === 'murderer' || target.role === 'accomplice')
        return err(s, 'bad target');
      const correct = target.role === 'witness';
      return {
        next: correct
          ? endGame(s, 'murderer', 'The murderer identified the witness — dark victory')
          : endGame(s, 'investigators', 'The witness stayed hidden — justice prevails'),
      };
    }

    default:
      return err(s, 'unknown action');
  }
}

export function start(s: GameState, seat: number, rand: () => number): ApplyResult {
  if (s.phase !== 'lobby') return err(s, 'not in lobby');
  if (seat !== s.creatorSeat) return err(s, 'only room creator starts');
  if (s.seats.length < 4 || s.seats.length > 12) return err(s, 'need 4-12 players');
  return { next: log(deal(s, rand), '🎬 Initiation: roles and cards dealt') };
}

// ─── View filter — THE visibility matrix (§3.2). Leak tests target this. ─────
export function buildViewFor(seat: number, s: GameState): ClientView {
  const me = bySeat(s, seat)!;
  const revealCulprits = s.phase === 'witnessHunt' || s.phase === 'gameOver';
  const revealAll = s.phase === 'gameOver';

  const seats: PublicSeat[] = s.seats.map(x => {
    const pub: PublicSeat = {
      seat: x.seat, name: x.name, connected: x.connected, ready: x.ready,
      evidence: x.evidence, means: x.means, hasInvestigationCard: x.hasInvestigationCard,
      isDetective: x.role === 'detective',
      isBot: x.isBot,
    };
    if (revealAll) pub.revealedRole = x.role;
    else if (revealCulprits && (x.role === 'murderer' || x.role === 'accomplice')) pub.revealedRole = x.role;
    return pub;
  });

  const secret: ClientView['secret'] = {};
  const mur = roleSeat(s, 'murderer'); const acc = roleSeat(s, 'accomplice'); const wit = roleSeat(s, 'witness');
  const knowsSolution = me.role === 'detective' || me.role === 'murderer' ||
    (me.role === 'accomplice' && (s.night.accompliceDone || s.phase === 'nightAccomplice'));
  if (knowsSolution && s.solution) secret.solution = s.solution;
  if (me.role === 'detective' || me.role === 'accomplice' || me.role === 'murderer') {
    if (mur && s.solution) secret.murdererSeat = mur.seat;
  }
  if (me.role === 'witness' && (s.night.witnessDone || s.phase === 'nightWitness') && mur) {
    secret.murdererSeat = mur.seat; // v1.1 vamp: witness learns murderer ONLY
  }
  if (me.role === 'detective' && acc) secret.accompliceSeat = acc.seat;
  if (me.role === 'accomplice' && acc) secret.accompliceSeat = acc.seat; // self
  if (me.role === 'detective' && wit) secret.witnessSeat = wit.seat;
  if (me.role === 'witness' && wit) secret.witnessSeat = wit.seat;       // self
  if (revealCulprits) {
    if (mur) secret.murdererSeat = mur.seat;
    if (acc) secret.accompliceSeat = acc.seat;
    if (s.solution) secret.solution = s.solution;
  } // v1.3 public reveal

  const p = s.presentation;
  const view: ClientView = {
    seat, phase: s.phase, round: s.round, yourRole: me.role,
    settings: s.settings, creatorSeat: s.creatorSeat, volunteerSeat: s.volunteerSeat,
    seats, tray: s.tray, swapDoneThisRound: s.swapDoneThisRound,
    pendingAccusation: s.pendingAccusation,
    finalActed: s.finalActed,
    night: {
      awaitingYou: s.night.awaitingReveal !== null && me.role === s.night.awaitingReveal,
      killerDone: s.night.killerDone, accompliceDone: s.night.accompliceDone, witnessDone: s.night.witnessDone,
      awaitingReveal: me.role === 'detective' ? s.night.awaitingReveal : null,
    },
    presentation: p ? { ...p, currentSeat: p.order[p.idx] ?? null } : null,
    attempts: s.attempts, winner: s.winner, winReason: s.winReason, log: s.log,
    secret,
  };
  if (me.role === 'detective' && s.swapDraw) view.swapDraw = s.swapDraw; // detective-only knowledge
  return view;
}
