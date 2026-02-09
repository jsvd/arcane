import { describe, it, assert } from "../../runtime/testing/harness.ts";
import {
  buildStarterDeck,
  createBattlerState,
  createBattlerGame,
} from "./card-battler.ts";
import type { BattlerState } from "./card-battler.ts";

describe("buildStarterDeck", () => {
  it("builds a 10-card starter deck", () => {
    const deck = buildStarterDeck();
    assert.equal(deck.length, 10);
  });

  it("has unique card ids", () => {
    const deck = buildStarterDeck();
    const ids = new Set(deck.map((c) => c.id));
    assert.equal(ids.size, 10);
  });

  it("contains the right card mix", () => {
    const deck = buildStarterDeck();
    const strikes = deck.filter((c) => c.name === "Strike");
    const defends = deck.filter((c) => c.name === "Defend");
    assert.equal(strikes.length, 4);
    assert.equal(defends.length, 3);
  });
});

describe("createBattlerState", () => {
  it("creates initial state with two players", () => {
    const state = createBattlerState(42);
    assert.equal(state.players.length, 2);
    assert.equal(state.players[0].hp, 30);
    assert.equal(state.players[1].hp, 30);
  });

  it("starts on turn 1 in draw phase", () => {
    const state = createBattlerState(42);
    assert.equal(state.turn, 1);
    assert.equal(state.phase, "draw");
    assert.equal(state.activePlayer, 0);
  });

  it("shuffles the decks", () => {
    const state = createBattlerState(42);
    const unshuffled = buildStarterDeck();
    // Very unlikely to be in the same order after shuffle
    const names = state.players[0].deck.map((c) => c.name).join(",");
    const originalNames = unshuffled.map((c) => c.name).join(",");
    // With 10 cards, probability of same order is 1/10! ≈ 0.000028%
    assert.notEqual(names, originalNames);
  });

  it("is deterministic (same seed = same state)", () => {
    const a = createBattlerState(42);
    const b = createBattlerState(42);
    assert.deepEqual(
      a.players[0].deck.map((c) => c.name),
      b.players[0].deck.map((c) => c.name),
    );
    assert.deepEqual(
      a.players[1].deck.map((c) => c.name),
      b.players[1].deck.map((c) => c.name),
    );
  });

  it("different seeds produce different shuffles", () => {
    const a = createBattlerState(1);
    const b = createBattlerState(2);
    const namesA = a.players[0].deck.map((c) => c.name).join(",");
    const namesB = b.players[0].deck.map((c) => c.name).join(",");
    assert.notEqual(namesA, namesB);
  });

  it("both players start with empty hands", () => {
    const state = createBattlerState(42);
    assert.equal(state.players[0].hand.length, 0);
    assert.equal(state.players[1].hand.length, 0);
  });

  it("no winner at start", () => {
    const state = createBattlerState(42);
    assert.equal(state.winner, null);
  });
});

describe("game flow", () => {
  it("draws cards on startTurn", () => {
    const game = createBattlerGame(42);
    game.startTurn();

    const state = game.store.getState() as BattlerState;
    assert.equal(state.players[0].hand.length, 3);
    assert.equal(state.players[0].deck.length, 7);
    assert.equal(state.phase, "play");
  });

  it("resets energy on startTurn", () => {
    const game = createBattlerGame(42);
    game.startTurn();

    const state = game.store.getState() as BattlerState;
    assert.equal(state.players[0].energy, 3);
  });

  it("plays a card from hand", () => {
    const game = createBattlerGame(42);
    game.startTurn();

    const handBefore = (game.store.getState() as BattlerState).players[0].hand;
    const card = handBefore[0];

    const played = game.playCard(0);
    assert.equal(played, true);

    const state = game.store.getState() as BattlerState;
    assert.equal(state.players[0].hand.length, 2);
    assert.equal(state.players[0].discard.length, 1);
    assert.equal(state.players[0].discard[0].id, card.id);
  });

  it("spends energy when playing a card", () => {
    const game = createBattlerGame(42);
    game.startTurn();

    const card = (game.store.getState() as BattlerState).players[0].hand[0];
    game.playCard(0);

    const state = game.store.getState() as BattlerState;
    assert.equal(state.players[0].energy, 3 - card.cost);
  });

  it("rejects playing a card that costs too much", () => {
    const game = createBattlerGame(42);
    game.startTurn();

    // Spend energy by playing cards until we can't afford an expensive one
    const state = game.store.getState() as BattlerState;
    const expensiveIndex = state.players[0].hand.findIndex((c) => c.cost > state.players[0].energy);
    if (expensiveIndex >= 0) {
      const played = game.playCard(expensiveIndex);
      assert.equal(played, false);
    }
  });

  it("rejects playing during wrong phase", () => {
    const game = createBattlerGame(42);
    // Still in draw phase
    const played = game.playCard(0);
    assert.equal(played, false);
  });

  it("deals damage to opponent", () => {
    const game = createBattlerGame(42);
    game.startTurn();

    const hand = (game.store.getState() as BattlerState).players[0].hand;
    const attackCard = hand.findIndex((c) => c.damage > 0);
    if (attackCard >= 0) {
      const card = hand[attackCard];
      game.playCard(attackCard);

      const state = game.store.getState() as BattlerState;
      assert.equal(state.players[1].hp, 30 - card.damage);
    }
  });

  it("heals the active player", () => {
    const game = createBattlerGame(42);
    game.startTurn();

    // Damage player 1 first so healing is visible
    const state = game.store.getState() as BattlerState;
    game.store.replaceState({
      ...state,
      players: [
        { ...state.players[0], hp: 20 },
        state.players[1],
      ] as [typeof state.players[0], typeof state.players[1]],
    } as BattlerState);

    const hand = (game.store.getState() as BattlerState).players[0].hand;
    const healCard = hand.findIndex((c) => c.heal > 0);
    if (healCard >= 0) {
      const card = hand[healCard];
      const hpBefore = (game.store.getState() as BattlerState).players[0].hp;
      game.playCard(healCard);
      const hpAfter = (game.store.getState() as BattlerState).players[0].hp;
      assert.equal(hpAfter, Math.min(30, hpBefore + card.heal));
    }
  });

  it("ends turn and switches to opponent", () => {
    const game = createBattlerGame(42);
    game.startTurn();
    game.endTurn();

    const state = game.store.getState() as BattlerState;
    assert.equal(state.activePlayer, 1);
    assert.equal(state.phase, "draw");
    assert.equal(state.turn, 2);
  });

  it("discards remaining hand on endTurn", () => {
    const game = createBattlerGame(42);
    game.startTurn();

    const handSize = (game.store.getState() as BattlerState).players[0].hand.length;
    assert.ok(handSize > 0);

    game.endTurn();

    const state = game.store.getState() as BattlerState;
    assert.equal(state.players[0].hand.length, 0);
    assert.ok(state.players[0].discard.length >= handSize);
  });

  it("logs game actions", () => {
    const game = createBattlerGame(42);
    game.startTurn();
    game.playCard(0);

    const state = game.store.getState() as BattlerState;
    assert.ok(state.log.length >= 2); // turn header + card play
    assert.ok(state.log[0].includes("Turn 1"));
  });
});

describe("full game simulation", () => {
  it("plays a deterministic game to completion", () => {
    const game = createBattlerGame(42);
    let turns = 0;
    const maxTurns = 50;

    while (turns < maxTurns) {
      const state = game.store.getState() as BattlerState;
      if (state.phase === "game_over") break;

      if (state.phase === "draw") {
        game.startTurn();
      } else if (state.phase === "play") {
        // Play all affordable cards
        let played = true;
        while (played) {
          const s = game.store.getState() as BattlerState;
          if (s.phase !== "play") break;

          const hand = s.players[s.activePlayer].hand;
          const affordable = hand.findIndex((c) => c.cost <= s.players[s.activePlayer].energy);
          if (affordable >= 0) {
            played = game.playCard(affordable);
          } else {
            played = false;
          }
        }

        if ((game.store.getState() as BattlerState).phase === "play") {
          game.endTurn();
        }
      }

      turns++;
    }

    const final = game.store.getState() as BattlerState;
    assert.equal(final.phase, "game_over");
    assert.notEqual(final.winner, null);
    assert.ok(final.log.length > 0);
    assert.ok(
      final.players[0].hp === 0 || final.players[1].hp === 0,
      "One player should have 0 HP",
    );
  });

  it("same seed produces identical game", () => {
    function simulate(seedValue: number): string[] {
      const game = createBattlerGame(seedValue);
      let turns = 0;

      while (turns < 50) {
        const state = game.store.getState() as BattlerState;
        if (state.phase === "game_over") break;

        if (state.phase === "draw") {
          game.startTurn();
        } else if (state.phase === "play") {
          let played = true;
          while (played) {
            const s = game.store.getState() as BattlerState;
            if (s.phase !== "play") break;
            const hand = s.players[s.activePlayer].hand;
            const affordable = hand.findIndex((c) => c.cost <= s.players[s.activePlayer].energy);
            if (affordable >= 0) {
              played = game.playCard(affordable);
            } else {
              played = false;
            }
          }
          if ((game.store.getState() as BattlerState).phase === "play") {
            game.endTurn();
          }
        }
        turns++;
      }

      return (game.store.getState() as BattlerState).log;
    }

    const log1 = simulate(42);
    const log2 = simulate(42);
    assert.deepEqual(log1, log2);
  });
});

describe("zone integrity", () => {
  it("total cards across all zones stays constant", () => {
    const game = createBattlerGame(42);

    function totalCards(state: BattlerState, playerIndex: 0 | 1): number {
      const p = state.players[playerIndex];
      return p.deck.length + p.hand.length + p.discard.length;
    }

    const initial = game.store.getState() as BattlerState;
    const initialTotal0 = totalCards(initial, 0);
    const initialTotal1 = totalCards(initial, 1);

    // Play several turns
    for (let i = 0; i < 6; i++) {
      const s = game.store.getState() as BattlerState;
      if (s.phase === "game_over") break;
      if (s.phase === "draw") game.startTurn();
      else {
        game.playCard(0);
        game.endTurn();
      }
    }

    const after = game.store.getState() as BattlerState;
    assert.equal(totalCards(after, 0), initialTotal0);
    assert.equal(totalCards(after, 1), initialTotal1);
  });

  it("cards move between zones correctly", () => {
    const game = createBattlerGame(42);
    game.startTurn();

    const s1 = game.store.getState() as BattlerState;
    assert.equal(s1.players[0].hand.length, 3);
    assert.equal(s1.players[0].deck.length, 7);
    assert.equal(s1.players[0].discard.length, 0);

    game.playCard(0);

    const s2 = game.store.getState() as BattlerState;
    assert.equal(s2.players[0].hand.length, 2);
    assert.equal(s2.players[0].discard.length, 1);
  });
});
