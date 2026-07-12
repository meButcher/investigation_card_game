// ─── Goyendagiri rules — types. Pure TS, zero deps. ───────────────────────────
export type Role = 'detective' | 'murderer' | 'accomplice' | 'witness' | 'investigator';

export type Phase =
  | 'lobby' | 'initiation' | 'study'
  | 'nightIntro' | 'nightKiller' | 'nightAccomplice' | 'nightWitness'
  | 'evidence' | 'presentation' | 'finalVote'
  | 'witnessHunt' | 'gameOver';

export interface Card { id: string; type: 'evidence' | 'means'; bn: string; en: string; icon: string }
export interface TileWord { bn: string; en: string }
export interface Tile { id: string; kind: 'cause' | 'location' | 'scene'; bn: string; en: string; words: TileWord[] }

export interface Seat {
  seat: number; name: string; connected: boolean; ready: boolean;
  role: Role;
  evidence: Card[]; means: Card[];
  hasInvestigationCard: boolean;
}

export interface GameSettings {
  difficulty: 3 | 4 | 5;
  timerSec: number | null;
  rounds: number;
  detectiveMode: 'random' | 'volunteer';
  /** v1.6: 'auto' = engine judges accusations; 'detective' = the Detective clicks Yes/No */
  verdictMode: 'auto' | 'detective';
}

export interface Accusation {
  bySeat: number; suspectSeat: number;
  evidenceId: string; meansId: string; correct: boolean;
}
/** An accusation awaiting the Detective's Yes/No (verdictMode 'detective') */
export interface PendingAccusation {
  bySeat: number; suspectSeat: number; evidenceId: string; meansId: string;
}

export interface GameState {
  phase: Phase; round: number;
  seats: Seat[];
  settings: GameSettings;
  creatorSeat: number;
  volunteerSeat: number | null;
  tray: { tiles: Tile[]; markers: (number | null)[] };
  sceneDeck: Tile[];
  swapDoneThisRound: boolean;
  /** v1.6: the two candidate tiles the Detective drew (choose 1) */
  swapDraw: Tile[] | null;
  solution: { evidenceId: string; meansId: string } | null;
  night: { killerDone: boolean; accompliceDone: boolean; witnessDone: boolean; awaitingReveal: Role | null };
  presentation: { order: number[]; idx: number } | null;
  pendingAccusation: PendingAccusation | null;
  /** seats that voted or abstained during finalVote */
  finalActed: number[];
  attempts: Accusation[];
  winner: 'investigators' | 'murderer' | null;
  winReason: string | null;
  log: string[];
}

export type Action =
  | { type: 'START'; seat: number }
  | { type: 'READY'; seat: number }
  | { type: 'BEGIN_NIGHT'; seat: number }
  | { type: 'CALL_ROLE'; seat: number; target: 'murderer' | 'accomplice' | 'witness' }
  | { type: 'REVEAL_ACK'; seat: number }
  | { type: 'PICK_SOLUTION'; seat: number; evidenceId: string; meansId: string }
  | { type: 'DISMISS'; seat: number }
  | { type: 'BEGIN_DAY'; seat: number }
  | { type: 'PLACE_MARKER'; seat: number; tileIdx: number; wordIdx: number }
  | { type: 'SWAP_DRAW'; seat: number }
  | { type: 'SWAP_CHOOSE'; seat: number; chosenIdx: number; discardTileIdx: number }
  | { type: 'PASS'; seat: number }
  | { type: 'FORCE_PASS'; seat: number }
  | { type: 'ACCUSE'; seat: number; suspectSeat: number; evidenceId: string; meansId: string }
  | { type: 'VERDICT'; seat: number; agree: boolean }
  | { type: 'ABSTAIN'; seat: number }
  | { type: 'PICK_WITNESS'; seat: number; targetSeat: number }
  | { type: 'SET_CONNECTED'; seat: number; connected: boolean };

export interface ApplyResult { next: GameState; error?: string }

export interface PublicSeat {
  seat: number; name: string; connected: boolean; ready: boolean;
  evidence: Card[]; means: Card[]; hasInvestigationCard: boolean;
  isDetective: boolean;
  revealedRole?: Role;
}

export interface ClientView {
  seat: number; phase: Phase; round: number;
  yourRole: Role;
  settings: GameSettings; creatorSeat: number;
  volunteerSeat: number | null;
  seats: PublicSeat[];
  tray: { tiles: Tile[]; markers: (number | null)[] };
  swapDoneThisRound: boolean;
  /** detective only */
  swapDraw?: Tile[];
  /** public — everyone sees an accusation is awaiting the Detective */
  pendingAccusation: PendingAccusation | null;
  finalActed: number[];
  night: { awaitingYou: boolean; killerDone: boolean; accompliceDone: boolean; witnessDone: boolean; awaitingReveal: Role | null };
  presentation: { order: number[]; idx: number; currentSeat: number | null } | null;
  attempts: Accusation[];
  winner: 'investigators' | 'murderer' | null;
  winReason: string | null;
  log: string[];
  secret: {
    solution?: { evidenceId: string; meansId: string };
    murdererSeat?: number;
    accompliceSeat?: number;
    witnessSeat?: number;
  };
}
