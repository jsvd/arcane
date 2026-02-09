/**
 * Card Battler — Phase 1 Demo
 *
 * Validates: zone-based state (not entity-position), PRNG shuffle,
 * turn phases, and that the state model is generic (not RPG-shaped).
 * Runs headless — no renderer needed.
 *
 * Two players draw from shuffled decks, play cards to deal damage.
 * First to 0 HP loses.
 */

import type { PRNGState } from "../../runtime/state/prng.ts";
import { seed, shuffle, randomInt } from "../../runtime/state/prng.ts";
import type { Mutation } from "../../runtime/state/transaction.ts";
import { set, update } from "../../runtime/state/transaction.ts";
import { createStore } from "../../runtime/state/store.ts";
import type { GameStore } from "../../runtime/state/store.ts";

// --- Types ---

export type Card = Readonly<{
  id: number;
  name: string;
  cost: number;
  damage: number;
  heal: number;
}>;

export type Zone = readonly Card[];

export type Player = Readonly<{
  name: string;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  deck: Zone;
  hand: Zone;
  discard: Zone;
}>;

export type Phase = "draw" | "play" | "end" | "game_over";

export type BattlerState = {
  players: [Player, Player];
  activePlayer: 0 | 1;
  phase: Phase;
  turn: number;
  rng: PRNGState;
  winner: 0 | 1 | null;
  log: string[];
};

// --- Card definitions ---

export const CARD_TEMPLATES: Omit<Card, "id">[] = [
  { name: "Strike", cost: 1, damage: 6, heal: 0 },
  { name: "Defend", cost: 1, damage: 0, heal: 4 },
  { name: "Bash", cost: 2, damage: 10, heal: 0 },
  { name: "Heal", cost: 1, damage: 0, heal: 6 },
  { name: "Quick Strike", cost: 0, damage: 3, heal: 0 },
];

/** Build a starter deck: 4x Strike, 3x Defend, 1x Bash, 1x Heal, 1x Quick Strike */
export function buildStarterDeck(): Card[] {
  let nextId = 0;
  const deck: Card[] = [];
  const add = (template: Omit<Card, "id">, count: number) => {
    for (let i = 0; i < count; i++) {
      deck.push({ ...template, id: nextId++ });
    }
  };

  add(CARD_TEMPLATES[0], 4); // Strike x4
  add(CARD_TEMPLATES[1], 3); // Defend x3
  add(CARD_TEMPLATES[2], 1); // Bash x1
  add(CARD_TEMPLATES[3], 1); // Heal x1
  add(CARD_TEMPLATES[4], 1); // Quick Strike x1

  return deck;
}

// --- Game creation ---

export function createBattlerState(seedValue: number): BattlerState {
  let rng = seed(seedValue);

  const deck1 = buildStarterDeck();
  const deck2 = buildStarterDeck().map((c) => ({ ...c, id: c.id + 100 }));

  const [shuffled1, rng2] = shuffle(rng, deck1);
  const [shuffled2, rng3] = shuffle(rng2, deck2);

  return {
    players: [
      {
        name: "Player 1",
        hp: 30,
        maxHp: 30,
        energy: 3,
        maxEnergy: 3,
        deck: [...shuffled1],
        hand: [],
        discard: [],
      },
      {
        name: "Player 2",
        hp: 30,
        maxHp: 30,
        energy: 3,
        maxEnergy: 3,
        deck: [...shuffled2],
        hand: [],
        discard: [],
      },
    ],
    activePlayer: 0,
    phase: "draw",
    turn: 1,
    rng: rng3,
    winner: null,
    log: [],
  };
}

// --- Mutations ---

function drawCards(playerIndex: 0 | 1, count: number): Mutation<BattlerState> {
  return {
    type: "update",
    path: `players.${playerIndex}`,
    description: `Player ${playerIndex + 1} draws ${count} cards`,
    apply: (state: BattlerState): BattlerState => {
      const player = state.players[playerIndex];
      let deck = [...player.deck];
      let discard = [...player.discard];
      const hand = [...player.hand];

      for (let i = 0; i < count; i++) {
        if (deck.length === 0) {
          if (discard.length === 0) break; // no cards anywhere
          // Reshuffle discard into deck
          const [shuffled, newRng] = shuffle(state.rng, discard);
          deck = [...shuffled];
          discard = [];
          state = { ...state, rng: newRng };
        }
        hand.push(deck.shift()!);
      }

      const newPlayers = [...state.players] as [Player, Player];
      newPlayers[playerIndex] = { ...player, deck, hand, discard };
      return { ...state, players: newPlayers };
    },
  };
}

function resetEnergy(playerIndex: 0 | 1): Mutation<BattlerState> {
  return {
    type: "set",
    path: `players.${playerIndex}.energy`,
    description: `Reset Player ${playerIndex + 1} energy`,
    apply: (state: BattlerState): BattlerState => {
      const newPlayers = [...state.players] as [Player, Player];
      newPlayers[playerIndex] = {
        ...state.players[playerIndex],
        energy: state.players[playerIndex].maxEnergy,
      };
      return { ...state, players: newPlayers };
    },
  };
}

// --- Game actions ---

export type BattlerGame = {
  store: GameStore<BattlerState>;
  /** Start the draw phase: draw cards, reset energy, transition to play */
  startTurn: () => void;
  /** Play a card from hand by index. Returns true if successful. */
  playCard: (handIndex: number) => boolean;
  /** End the current player's turn */
  endTurn: () => void;
  /** Get a summary of the current state */
  summary: () => string;
};

export function createBattlerGame(seedValue: number): BattlerGame {
  const state = createBattlerState(seedValue);
  const store = createStore(state);

  return {
    store,

    startTurn(): void {
      const s = store.getState() as BattlerState;
      if (s.phase !== "draw") return;

      store.dispatch([
        drawCards(s.activePlayer, 3),
        resetEnergy(s.activePlayer),
        set<BattlerState>("phase", "play"),
        update<BattlerState>("log", (log: unknown) => [
          ...(log as string[]),
          `--- Turn ${s.turn}: ${s.players[s.activePlayer].name} ---`,
        ]),
      ]);
    },

    playCard(handIndex: number): boolean {
      const s = store.getState() as BattlerState;
      if (s.phase !== "play") return false;

      const active = s.players[s.activePlayer];
      const card = active.hand[handIndex];
      if (!card) return false;
      if (card.cost > active.energy) return false;

      const opponent = s.activePlayer === 0 ? 1 : 0;

      const mutations: Mutation<BattlerState>[] = [];

      // Remove card from hand, add to discard, spend energy
      mutations.push({
        type: "update",
        path: `players.${s.activePlayer}`,
        description: `Play ${card.name}`,
        apply: (state: BattlerState): BattlerState => {
          const player = state.players[s.activePlayer];
          const newHand = player.hand.filter((_, i) => i !== handIndex);
          const newDiscard = [...player.discard, card];
          const newPlayers = [...state.players] as [Player, Player];
          newPlayers[s.activePlayer] = {
            ...player,
            hand: newHand,
            discard: newDiscard,
            energy: player.energy - card.cost,
          };
          return { ...state, players: newPlayers };
        },
      });

      // Apply damage to opponent
      if (card.damage > 0) {
        mutations.push(
          update<BattlerState>(`players.${opponent}.hp`, (hp: unknown) =>
            Math.max(0, (hp as number) - card.damage),
          ),
        );
      }

      // Apply healing to self
      if (card.heal > 0) {
        mutations.push(
          update<BattlerState>(`players.${s.activePlayer}.hp`, (hp: unknown) =>
            Math.min(active.maxHp, (hp as number) + card.heal),
          ),
        );
      }

      // Log the play
      const effects: string[] = [];
      if (card.damage > 0)
        effects.push(`${card.damage} damage to ${s.players[opponent].name}`);
      if (card.heal > 0)
        effects.push(`heal ${card.heal} to ${active.name}`);
      mutations.push(
        update<BattlerState>("log", (log: unknown) => [
          ...(log as string[]),
          `${active.name} plays ${card.name} (${effects.join(", ")})`,
        ]),
      );

      const result = store.dispatch(mutations);
      if (!result.valid) return false;

      // Check for defeat
      const newState = store.getState() as BattlerState;
      if (newState.players[opponent].hp <= 0) {
        store.dispatch([
          set<BattlerState>("phase", "game_over"),
          set<BattlerState>("winner", s.activePlayer),
          update<BattlerState>("log", (log: unknown) => [
            ...(log as string[]),
            `${s.players[opponent].name} is defeated! ${active.name} wins!`,
          ]),
        ]);
      }

      return true;
    },

    endTurn(): void {
      const s = store.getState() as BattlerState;
      if (s.phase !== "play") return;

      const nextPlayer = s.activePlayer === 0 ? 1 : 0;

      // Discard remaining hand
      const mutations: Mutation<BattlerState>[] = [
        {
          type: "update",
          path: `players.${s.activePlayer}`,
          description: `Discard remaining hand`,
          apply: (state: BattlerState): BattlerState => {
            const player = state.players[s.activePlayer];
            const newPlayers = [...state.players] as [Player, Player];
            newPlayers[s.activePlayer] = {
              ...player,
              hand: [],
              discard: [...player.discard, ...player.hand],
            };
            return { ...state, players: newPlayers };
          },
        },
        set<BattlerState>("activePlayer", nextPlayer as 0 | 1),
        set<BattlerState>("phase", "draw"),
        update<BattlerState>("turn", (t: unknown) => (t as number) + 1),
      ];

      store.dispatch(mutations);
    },

    summary(): string {
      const s = store.getState() as BattlerState;
      const p1 = s.players[0];
      const p2 = s.players[1];
      const active = s.players[s.activePlayer];

      const lines = [
        `Turn ${s.turn} | Phase: ${s.phase} | Active: ${active.name}`,
        `${p1.name}: ${p1.hp}/${p1.maxHp} HP, ${p1.energy} energy, ${p1.hand.length} hand, ${p1.deck.length} deck, ${p1.discard.length} discard`,
        `${p2.name}: ${p2.hp}/${p2.maxHp} HP, ${p2.energy} energy, ${p2.hand.length} hand, ${p2.deck.length} deck, ${p2.discard.length} discard`,
      ];

      if (s.phase === "play") {
        lines.push(
          `Hand: ${active.hand.map((c, i) => `[${i}] ${c.name} (${c.cost}e)`).join(", ")}`,
        );
      }

      if (s.winner !== null) {
        lines.push(`Winner: ${s.players[s.winner].name}`);
      }

      return lines.join("\n");
    },
  };
}
