import { describe, it, expect } from 'vitest';
import {
  createLobby, addPlayer, start, apply, buildViewFor, rng,
  type GameState, type Role,
} from '../src/index.js';

function lobby(n: number, opts: Parameters<typeof createLobby>[0] = {}): GameState {
  let s = createLobby(opts);
  for (let i = 0; i < n; i++) s = addPlayer(s, `P${i}`);
  return s;
}
function started(n: number, seed = 42, opts: Parameters<typeof createLobby>[0] = {}): GameState {
  const r = start(lobby(n, opts), 0, rng(seed));
  expect(r.error).toBeUndefined();
  return r.next;
}
const seatOf = (s: GameState, role: Role) => s.seats.find(x => x.role === role)!.seat;
const must = (r: { next: GameState; error?: string }) => { expect(r.error).toBeUndefined(); return r.next; };

function throughNight(n: number, seed = 42, opts: Parameters<typeof createLobby>[0] = {}): GameState {
  let s = started(n, seed, opts);
  for (const seat of s.seats.map(x => x.seat)) s = must(apply(s, { type: 'READY', seat }));
  expect(s.phase).toBe('nightIntro');
  const det = seatOf(s, 'detective'); const mur = seatOf(s, 'murderer');
  s = must(apply(s, { type: 'CALL_ROLE', seat: det, target: 'murderer' }));
  s = must(apply(s, { type: 'REVEAL_ACK', seat: mur }));
  const m = s.seats.find(x => x.seat === mur)!;
  s = must(apply(s, { type: 'PICK_SOLUTION', seat: mur, evidenceId: m.evidence[0].id, meansId: m.means[0].id }));
  s = must(apply(s, { type: 'DISMISS', seat: det }));
  if (n >= 6) {
    const acc = seatOf(s, 'accomplice'); const wit = seatOf(s, 'witness');
    s = must(apply(s, { type: 'CALL_ROLE', seat: det, target: 'accomplice' }));
    s = must(apply(s, { type: 'REVEAL_ACK', seat: acc }));
    s = must(apply(s, { type: 'DISMISS', seat: det }));
    s = must(apply(s, { type: 'CALL_ROLE', seat: det, target: 'witness' }));
    s = must(apply(s, { type: 'REVEAL_ACK', seat: wit }));
    s = must(apply(s, { type: 'DISMISS', seat: det }));
  }
  s = must(apply(s, { type: 'BEGIN_DAY', seat: det }));
  expect(s.phase).toBe('evidence');
  return s;
}
function doSwap(s: GameState): GameState {
  const det = seatOf(s, 'detective');
  s = must(apply(s, { type: 'SWAP_DRAW', seat: det }));
  return must(apply(s, { type: 'SWAP_CHOOSE', seat: det, chosenIdx: 0, discardTileIdx: 2 }));
}
function placeAllMarkers(s: GameState): GameState {
  const det = seatOf(s, 'detective');
  for (let t = 0; t < 6; t++) if (s.tray.markers[t] === null) s = must(apply(s, { type: 'PLACE_MARKER', seat: det, tileIdx: t, wordIdx: 0 }));
  return s;
}
function passAll(s: GameState): GameState {
  while (s.phase === 'presentation') s = must(apply(s, { type: 'PASS', seat: s.presentation!.order[s.presentation!.idx] }));
  return s;
}
function throughAllRounds(s: GameState): GameState {
  while (s.phase === 'evidence' || s.phase === 'presentation') {
    if (s.phase === 'evidence' && s.round > 1 && !s.swapDoneThisRound) s = doSwap(s);
    if (s.phase === 'evidence') s = placeAllMarkers(s);
    if (s.phase === 'presentation') s = passAll(s);
  }
  return s;
}

describe('setup & roles', () => {
  it('deals correct role sets at 4, 6, 12 players', () => {
    for (const [n, extras] of [[4, 0], [6, 1], [12, 1]] as const) {
      const s = started(n);
      const count = (r: Role) => s.seats.filter(x => x.role === r).length;
      expect(count('detective')).toBe(1);
      expect(count('murderer')).toBe(1);
      expect(count('accomplice')).toBe(extras);
      expect(count('witness')).toBe(extras);
      expect(count('investigator')).toBe(n - 2 - extras * 2);
    }
  });
  it('volunteer mode makes the designated seat the Detective', () => {
    for (const seed of [1, 2, 3]) {
      let s = lobby(8, { detectiveMode: 'volunteer' });
      s = { ...s, volunteerSeat: 5 };
      const r = start(s, 0, rng(seed));
      expect(r.error).toBeUndefined();
      expect(r.next.seats.find(x => x.seat === 5)!.role).toBe('detective');
      expect(r.next.seats.filter(x => x.role === 'detective').length).toBe(1);
      expect(r.next.seats.filter(x => x.role === 'murderer').length).toBe(1);
    }
  });
  it('blocks start below 4 players', () => {
    expect(start(lobby(3), 0, rng(1)).error).toMatch(/4-12/);
  });
  it('deals difficulty-count cards, none to detective, no duplicate ids', () => {
    const s = started(8);
    const ids = new Set<string>();
    for (const seat of s.seats) {
      if (seat.role === 'detective') { expect(seat.evidence.length).toBe(0); continue; }
      expect(seat.evidence.length).toBe(4); expect(seat.means.length).toBe(4);
      expect(seat.hasInvestigationCard).toBe(true);
      for (const c of [...seat.evidence, ...seat.means]) { expect(ids.has(c.id)).toBe(false); ids.add(c.id); }
    }
  });
});

describe('night sequence', () => {
  it('REVEAL_ACK clears the call so the linked view is reachable (v0.1.1 regression)', () => {
    let s = started(6);
    for (const seat of s.seats.map(x => x.seat)) s = must(apply(s, { type: 'READY', seat }));
    const det = seatOf(s, 'detective'); const mur = seatOf(s, 'murderer');
    s = must(apply(s, { type: 'CALL_ROLE', seat: det, target: 'murderer' }));
    s = must(apply(s, { type: 'REVEAL_ACK', seat: mur }));
    expect(s.phase).toBe('nightKiller');
    expect(s.night.awaitingReveal).toBeNull();
    expect(buildViewFor(mur, s).night.awaitingYou).toBe(false);
  });
  it('4-player game skips accomplice/witness beats', () => {
    expect(throughNight(4).phase).toBe('evidence');
  });
});

describe('visibility matrix — leak tests', () => {
  it('investigator view NEVER contains the solution or culprit seats', () => {
    const s = throughNight(8);
    const inv = s.seats.find(x => x.role === 'investigator')!;
    const v = buildViewFor(inv.seat, s);
    expect(v.secret.solution).toBeUndefined();
    expect(v.secret.murdererSeat).toBeUndefined();
    expect(v.secret.accompliceSeat).toBeUndefined();
    expect(v.secret.witnessSeat).toBeUndefined();
    expect(JSON.stringify(v.seats)).not.toContain('murderer');
  });
  it('murderer view never contains accomplice or witness seat (v1.1 vamp)', () => {
    const s = throughNight(8);
    const v = buildViewFor(seatOf(s, 'murderer'), s);
    expect(v.secret.accompliceSeat).toBeUndefined();
    expect(v.secret.witnessSeat).toBeUndefined();
    expect(v.secret.solution).toBeDefined();
  });
  it('witness knows murderer only; detective+accomplice know solution', () => {
    const s = throughNight(8);
    const w = buildViewFor(seatOf(s, 'witness'), s);
    expect(w.secret.murdererSeat).toBe(seatOf(s, 'murderer'));
    expect(w.secret.accompliceSeat).toBeUndefined();
    expect(w.secret.solution).toBeUndefined();
    expect(buildViewFor(seatOf(s, 'detective'), s).secret.solution).toBeDefined();
    expect(buildViewFor(seatOf(s, 'accomplice'), s).secret.solution).toBeDefined();
  });
  it('swapDraw is detective-only knowledge (v1.6)', () => {
    let s = passAll(placeAllMarkers(throughNight(6)));
    const det = seatOf(s, 'detective');
    s = must(apply(s, { type: 'SWAP_DRAW', seat: det }));
    expect(buildViewFor(det, s).swapDraw?.length).toBe(2);
    const inv = s.seats.find(x => x.role === 'investigator')!;
    expect(buildViewFor(inv.seat, s).swapDraw).toBeUndefined();
  });
  it('murderer + accomplice become public at witnessHunt (v1.3)', () => {
    let s = placeAllMarkers(throughNight(8));
    const inv = s.seats.find(x => x.role === 'investigator')!;
    s = must(apply(s, { type: 'ACCUSE', seat: inv.seat, suspectSeat: seatOf(s, 'murderer'), evidenceId: s.solution!.evidenceId, meansId: s.solution!.meansId }));
    expect(s.phase).toBe('witnessHunt');
    const v = buildViewFor(inv.seat, s);
    expect(v.seats.find(x => x.revealedRole === 'murderer')).toBeDefined();
    expect(v.seats.find(x => x.revealedRole === 'accomplice')).toBeDefined();
    expect(v.seats.find(x => x.revealedRole === 'witness')).toBeUndefined();
  });
});

describe('evidence, swap & presentation', () => {
  it('markers are final; 6th marker starts presentations', () => {
    let s = throughNight(6);
    const det = seatOf(s, 'detective');
    s = must(apply(s, { type: 'PLACE_MARKER', seat: det, tileIdx: 0, wordIdx: 2 }));
    expect(apply(s, { type: 'PLACE_MARKER', seat: det, tileIdx: 0, wordIdx: 3 }).error).toMatch(/final/);
    s = placeAllMarkers(s);
    expect(s.phase).toBe('presentation');
    expect(s.presentation!.order).not.toContain(det);
  });
  it('v1.6 swap: draw 2, choose 1, unchosen returns to deck bottom', () => {
    let s = passAll(placeAllMarkers(throughNight(6)));
    expect(s.phase).toBe('evidence'); expect(s.round).toBe(2);
    const det = seatOf(s, 'detective');
    expect(apply(s, { type: 'PLACE_MARKER', seat: det, tileIdx: 2, wordIdx: 0 }).error).toMatch(/swap/);
    const deckBefore = s.sceneDeck.length;
    s = must(apply(s, { type: 'SWAP_DRAW', seat: det }));
    expect(s.swapDraw!.length).toBe(2);
    expect(apply(s, { type: 'SWAP_DRAW', seat: det }).error).toMatch(/already/);
    const rejected = s.swapDraw![1];
    s = must(apply(s, { type: 'SWAP_CHOOSE', seat: det, chosenIdx: 0, discardTileIdx: 3 }));
    expect(s.tray.markers[3]).toBeNull();                       // replaced tile lost its marker
    expect(s.tray.markers[0]).not.toBeNull();                   // others persist
    expect(s.sceneDeck.length).toBe(deckBefore - 1);            // net: -2 drawn, +1 returned
    expect(s.sceneDeck[s.sceneDeck.length - 1].id).toBe(rejected.id); // bottom of deck
    s = must(apply(s, { type: 'PLACE_MARKER', seat: det, tileIdx: 3, wordIdx: 1 }));
    expect(s.phase).toBe('presentation');
  });
  it('only scene tiles (2..5) can be replaced', () => {
    let s = passAll(placeAllMarkers(throughNight(6)));
    const det = seatOf(s, 'detective');
    s = must(apply(s, { type: 'SWAP_DRAW', seat: det }));
    expect(apply(s, { type: 'SWAP_CHOOSE', seat: det, chosenIdx: 0, discardTileIdx: 0 }).error).toMatch(/scene/);
  });
});

describe('final decision round (v1.6)', () => {
  it('after all rounds, unspent players enter finalVote instead of instant loss', () => {
    const s = throughAllRounds(throughNight(6));
    expect(s.phase).toBe('finalVote');
    expect(s.winner).toBeNull();
  });
  it('all abstain → murderer wins', () => {
    let s = throughAllRounds(throughNight(4));
    for (const p of s.seats.filter(x => x.role !== 'detective')) {
      if (s.winner) break;
      s = must(apply(s, { type: 'ABSTAIN', seat: p.seat }));
    }
    expect(s.winner).toBe('murderer');
    expect(s.winReason).toMatch(/exhausted/);
  });
  it('correct final vote → investigators win path', () => {
    let s = throughAllRounds(throughNight(4));
    const inv = s.seats.find(x => x.role === 'investigator' && x.hasInvestigationCard)!;
    s = must(apply(s, { type: 'ACCUSE', seat: inv.seat, suspectSeat: seatOf(s, 'murderer'), evidenceId: s.solution!.evidenceId, meansId: s.solution!.meansId }));
    expect(s.winner).toBe('investigators');
  });
  it('spent players cannot vote or abstain; double-abstain blocked', () => {
    let s = throughAllRounds(throughNight(6));
    const voter = s.seats.find(x => x.role !== 'detective' && x.hasInvestigationCard)!;
    s = must(apply(s, { type: 'ABSTAIN', seat: voter.seat }));
    expect(apply(s, { type: 'ABSTAIN', seat: voter.seat }).error).toBeTruthy();
  });
});

describe('detective-orchestrated verdicts (v1.6)', () => {
  function toPending(n = 4): GameState {
    let s = placeAllMarkers(throughNight(n, 42, { verdictMode: 'detective' }));
    const inv = s.seats.find(x => x.role === 'investigator')!;
    const suspect = s.seats.find(x => x.role !== 'detective' && x.seat !== inv.seat)!;
    s = must(apply(s, { type: 'ACCUSE', seat: inv.seat, suspectSeat: suspect.seat, evidenceId: suspect.evidence[0].id, meansId: suspect.means[0].id }));
    return s;
  }
  it('accusation creates a pending verdict — no auto result', () => {
    const s = toPending();
    expect(s.pendingAccusation).not.toBeNull();
    expect(s.winner).toBeNull();
    expect(s.attempts.length).toBe(0);                          // not judged yet
    const accuser = s.pendingAccusation!.bySeat;
    expect(s.seats.find(x => x.seat === accuser)!.hasInvestigationCard).toBe(true); // card not consumed yet
  });
  it('second accusation blocked while one is pending', () => {
    const s = toPending(6);
    const other = s.seats.find(x => x.role !== 'detective' && x.seat !== s.pendingAccusation!.bySeat && x.hasInvestigationCard)!;
    expect(apply(s, { type: 'ACCUSE', seat: other.seat, suspectSeat: other.seat, evidenceId: other.evidence[0].id, meansId: other.means[0].id }).error).toMatch(/deciding/);
  });
  it('detective says NO → card consumed, game continues', () => {
    let s = toPending(6);
    const accuser = s.pendingAccusation!.bySeat;
    s = must(apply(s, { type: 'VERDICT', seat: seatOf(s, 'detective'), agree: false }));
    expect(s.pendingAccusation).toBeNull();
    expect(s.winner).toBeNull();
    expect(s.seats.find(x => x.seat === accuser)!.hasInvestigationCard).toBe(false);
  });
  it('detective says YES → investigators win even if cards mismatch the night pick (his word is law)', () => {
    let s = toPending(4);
    s = must(apply(s, { type: 'VERDICT', seat: seatOf(s, 'detective'), agree: true }));
    expect(s.winner).toBe('investigators');
  });
  it('only the detective may deliver a verdict', () => {
    const s = toPending(4);
    const notDet = s.seats.find(x => x.role !== 'detective')!;
    expect(apply(s, { type: 'VERDICT', seat: notDet.seat, agree: true }).error).toMatch(/detective/);
  });
});

describe('solving & endgame', () => {
  it('wrong guess consumes the card (auto mode)', () => {
    let s = placeAllMarkers(throughNight(6));
    const inv = s.seats.find(x => x.role === 'investigator')!;
    const suspect = s.seats.find(x => x.role !== 'detective' && x.seat !== inv.seat)!;
    const wrongEv = suspect.evidence.find(c => c.id !== s.solution!.evidenceId)!;
    s = must(apply(s, { type: 'ACCUSE', seat: inv.seat, suspectSeat: suspect.seat, evidenceId: wrongEv.id, meansId: suspect.means[0].id }));
    expect(s.winner).toBeNull();
    expect(apply(s, { type: 'ACCUSE', seat: inv.seat, suspectSeat: suspect.seat, evidenceId: wrongEv.id, meansId: suspect.means[0].id }).error).toMatch(/spent/);
  });
  it('all cards spent on wrong guesses → murderer wins', () => {
    let s = placeAllMarkers(throughNight(4));
    for (const p of s.seats.filter(x => x.role !== 'detective')) {
      if (s.winner) break;
      const wrongEv = p.evidence.find(c => c.id !== s.solution!.evidenceId)!;
      const wrongMn = p.means.find(c => c.id !== s.solution!.meansId)!;
      s = must(apply(s, { type: 'ACCUSE', seat: p.seat, suspectSeat: p.seat, evidenceId: wrongEv.id, meansId: wrongMn.id }));
    }
    expect(s.winner).toBe('murderer');
  });
  it('murderer self-accusing CORRECTLY ends as investigator win', () => {
    let s = placeAllMarkers(throughNight(4));
    const mur = seatOf(s, 'murderer');
    s = must(apply(s, { type: 'ACCUSE', seat: mur, suspectSeat: mur, evidenceId: s.solution!.evidenceId, meansId: s.solution!.meansId }));
    expect(s.winner).toBe('investigators');
  });
  it('witness hunt: correct pick → murderer wins; wrong → investigators', () => {
    for (const [pickWitness, expected] of [[true, 'murderer'], [false, 'investigators']] as const) {
      let s = placeAllMarkers(throughNight(8));
      const inv = s.seats.find(x => x.role === 'investigator')!;
      s = must(apply(s, { type: 'ACCUSE', seat: inv.seat, suspectSeat: seatOf(s, 'murderer'), evidenceId: s.solution!.evidenceId, meansId: s.solution!.meansId }));
      expect(s.phase).toBe('witnessHunt');
      const target = pickWitness ? seatOf(s, 'witness') : s.seats.find(x => x.role === 'investigator' && x.seat !== inv.seat)?.seat ?? inv.seat;
      s = must(apply(s, { type: 'PICK_WITNESS', seat: seatOf(s, 'murderer'), targetSeat: target }));
      expect(s.winner).toBe(expected);
    }
  });
  it('gameOver reveals all roles to everyone', () => {
    let s = placeAllMarkers(throughNight(6));
    const inv = s.seats.find(x => x.role === 'investigator')!;
    s = must(apply(s, { type: 'ACCUSE', seat: inv.seat, suspectSeat: seatOf(s, 'murderer'), evidenceId: s.solution!.evidenceId, meansId: s.solution!.meansId }));
    s = must(apply(s, { type: 'PICK_WITNESS', seat: seatOf(s, 'murderer'), targetSeat: inv.seat }));
    expect(buildViewFor(inv.seat, s).seats.every(x => x.revealedRole)).toBe(true);
  });
});
