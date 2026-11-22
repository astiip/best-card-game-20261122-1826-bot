// Ember Court — the game state machine: title / play / win / loss, turn flow and clash resolution.
// One duel: you, the Spark-Keeper, against the Ash Warden. First to 0 life loses.
//
// Turn flow: each turn you gain embers equal to min(turn, 5) (+1 if you kindled),
// draw 1 card (hand max 7), and play exactly 1 card. The Warden plays 1 card at the
// same time, face down; both reveal and clash. The loser takes damage equal to the
// power difference (minimum 1 when powers differ); a tie deals 1 to both.
// Ward blocks one instance of damage. Played cards go to the discard pile.

import { buildDeck, clashPower, drawFrom, HAND_MAX, HAND_SIZE_START, LIFE_START, MAX_EMBERS_PER_TURN } from './cards.js';
import { makeRng } from './rng.js';
import { chooseAiCard, idleThought } from './ai.js';

export const SCREENS = ['title', 'play', 'win', 'loss'];
export const REVEAL_MS = 1300;

/** A fresh, empty side of the table (player or AI). */
function newSide() {
  return {
    life: LIFE_START,
    embers: 0,
    hand: [],
    deck: [],
    discard: [],
    ward: false,
    kindlePending: 0,
    lastElement: null,
  };
}

/** A brand-new game in its title screen. `seed` drives every deck and AI choice. */
export function newGame(seed) {
  const rng = makeRng(seed ?? 1);
  return {
    seed: seed ?? 1,
    rng,
    screen: 'title',
    phase: 'await', // 'await' | 'reveal'
    turn: 1,
    player: newSide(),
    ai: newSide(),
    selected: -1,
    table: { playerCard: null, aiCard: null },
    lastClash: null,
    log: 'The Ash Warden waits across the embers.',
    thought: 'The Warden watches you…',
    damageDealt: 0,
    turnsPlayed: 0,
    revealT: 0,
    floaters: [], // { x, y, text, color, t }
    shake: 0,
    confetti: [], // { x, y, vx, vy, color, size, t }
    help: false,
    muted: false,
    frozen: false, // true for a ?shot= state: the table stays put for the screenshot
    startedAt: 0,
  };
}

/** Deal opening hands and begin turn 1. */
export function startMatch(state) {
  state.player = newSide();
  state.ai = newSide();
  state.player.deck = buildDeck(state.rng);
  state.ai.deck = buildDeck(state.rng);
  for (let i = 0; i < HAND_SIZE_START; i++) {
    const p = drawFrom(state.player.deck, state.player.discard, state.rng);
    const a = drawFrom(state.ai.deck, state.ai.discard, state.rng);
    if (p) state.player.hand.push(p);
    if (a) state.ai.hand.push(a);
  }
  state.turn = 1;
  state.turnsPlayed = 0;
  state.damageDealt = 0;
  state.selected = -1;
  state.table = { playerCard: null, aiCard: null };
  state.lastClash = null;
  state.floaters = [];
  state.confetti = [];
  state.shake = 0;
  state.screen = 'play';
  state.phase = 'await';
  state.log = 'Turn 1 — play a card to clash with the Warden.';
  state.thought = 'The Warden weighs its opening…';
  beginTurn(state);
}

/** Start a turn: grant embers, draw a card. Called once per turn. */
export function beginTurn(state) {
  const grant = Math.min(state.turn, MAX_EMBERS_PER_TURN);
  state.player.embers = grant + state.player.kindlePending;
  state.ai.embers = grant + state.ai.kindlePending;
  state.player.kindlePending = 0;
  state.ai.kindlePending = 0;
  const drawn = drawFrom(state.player.deck, state.player.discard, state.rng);
  if (drawn && state.player.hand.length < HAND_MAX) state.player.hand.push(drawn);
  const aiDrawn = drawFrom(state.ai.deck, state.ai.discard, state.rng);
  if (aiDrawn && state.ai.hand.length < HAND_MAX) state.ai.hand.push(aiDrawn);
  state.selected = -1;
  state.phase = 'await';
  state.log = `Turn ${state.turn} — ${state.player.embers} embers. Play a card.`;
}

/** Can the player afford to play this hand index right now? */
export function canPlay(state, index) {
  if (state.screen !== 'play' || state.phase !== 'await') return false;
  const card = state.player.hand[index];
  if (!card) return false;
  return card.cost <= state.player.embers;
}

/** Play the selected card: the Warden answers at the same time, then both reveal. */
export function playSelected(state) {
  if (state.selected < 0 || !canPlay(state, state.selected)) return false;
  const card = state.player.hand[state.selected];
  state.player.embers -= card.cost;
  state.player.hand.splice(state.selected, 1);
  state.selected = -1;
  state.table.playerCard = card;
  state.player.lastElement = card.element;

  const choice = chooseAiCard(state.ai.hand, state.ai.embers, {
    turn: state.turn,
    aiLife: state.ai.life,
    playerLife: state.player.life,
    playerLastElement: card.element,
    rng: state.rng,
  });
  state.thought = choice.thought;
  let aiCard = null;
  if (choice.index >= 0) {
    aiCard = state.ai.hand[choice.index];
    state.ai.embers -= aiCard.cost;
    state.ai.hand.splice(choice.index, 1);
    state.ai.lastElement = aiCard.element;
  } else {
    state.thought = idleThought(state.rng);
  }
  state.table.aiCard = aiCard;
  state.phase = 'reveal';
  state.revealT = 0;
  state.turnsPlayed += 1;
  resolveClash(state, card, aiCard);
  return true;
}

/** Compare the two revealed cards and apply damage, wards and effects. */
export function resolveClash(state, playerCard, aiCard) {
  if (!aiCard) {
    // The Warden could not play: your card lands unopposed.
    const dmg = playerCard.power;
    state.ai.life = Math.max(0, state.ai.life - dmg);
    state.damageDealt += dmg;
    state.lastClash = {
      playerCard,
      aiCard: null,
      playerPower: playerCard.power,
      aiPower: 0,
      dmgToAi: dmg,
      dmgToPlayer: 0,
      text: `${playerCard.name} strikes unopposed for ${dmg}!`,
    };
    state.log = state.lastClash.text;
    addFloater(state, 640, 210, `-${dmg}`, '#ff6b5e');
    state.shake = 10;
    applyEffect(state, playerCard, 'player');
    finishClash(state);
    return;
  }

  const pPower = clashPower(playerCard, aiCard);
  const aPower = clashPower(aiCard, playerCard);
  let dmgToAi = 0;
  let dmgToPlayer = 0;
  let text;
  if (pPower > aPower) {
    dmgToAi = Math.max(1, pPower - aPower);
    text = `${playerCard.name} (${pPower}) overpowers ${aiCard.name} (${aPower}) — ${dmgToAi} damage!`;
  } else if (aPower > pPower) {
    dmgToPlayer = Math.max(1, aPower - pPower);
    text = `${aiCard.name} (${aPower}) overpowers ${playerCard.name} (${pPower}) — you take ${dmgToPlayer}!`;
  } else {
    dmgToAi = 1;
    dmgToPlayer = 1;
    text = `A tie at ${pPower} — both sides take 1 damage.`;
  }

  if (dmgToPlayer > 0 && state.player.ward) {
    state.player.ward = false;
    dmgToPlayer = 0;
    text += ' Your ward blocks it!';
  }
  if (dmgToAi > 0 && state.ai.ward) {
    state.ai.ward = false;
    dmgToAi = 0;
    text += ' The Warden’s ward blocks it!';
  }

  state.ai.life = Math.max(0, state.ai.life - dmgToAi);
  state.player.life = Math.max(0, state.player.life - dmgToPlayer);
  state.damageDealt += dmgToAi;
  if (dmgToAi > 0) addFloater(state, 640, 210, `-${dmgToAi}`, '#ff6b5e');
  if (dmgToPlayer > 0) addFloater(state, 640, 590, `-${dmgToPlayer}`, '#ff6b5e');
  if (dmgToAi > 0 || dmgToPlayer > 0) state.shake = 10;

  state.lastClash = { playerCard, aiCard, playerPower: pPower, aiPower: aPower, dmgToAi, dmgToPlayer, text };
  state.log = text;
  applyEffect(state, playerCard, 'player');
  applyEffect(state, aiCard, 'ai');
  finishClash(state);
}

/** A played card's effect fires after the clash. */
export function applyEffect(state, card, side) {
  if (!card || !card.effect) return;
  const me = side === 'player' ? state.player : state.ai;
  if (card.effect === 'draw') {
    const extra = drawFrom(me.deck, me.discard, state.rng);
    if (extra && me.hand.length < HAND_MAX) me.hand.push(extra);
  } else if (card.effect === 'ward') {
    me.ward = true;
  } else if (card.effect === 'kindle') {
    me.kindlePending += 1;
  }
}

/** Move played cards to the discard piles and check for a winner. */
export function finishClash(state) {
  if (state.table.playerCard) state.player.discard.push(state.table.playerCard);
  if (state.table.aiCard) state.ai.discard.push(state.table.aiCard);
  if (state.ai.life <= 0 && state.player.life <= 0) {
    // A mutual fall: the higher life total would win, but both are 0 — the player takes it.
    endGame(state, 'win');
  } else if (state.ai.life <= 0) {
    endGame(state, 'win');
  } else if (state.player.life <= 0) {
    endGame(state, 'loss');
  }
}

/** Land the end screen and, on a win, launch the golden confetti. */
export function endGame(state, result) {
  state.screen = result;
  state.phase = 'await';
  state.table = { playerCard: null, aiCard: null };
  if (result === 'win') {
    state.log = 'VICTORY — the Ash Warden kneels.';
    spawnConfetti(state);
  } else {
    state.log = 'DEFEAT — the embers fade.';
  }
}

/** Advance timers: reveal countdown, floaters, shake, confetti. `dt` is seconds. */
export function update(state, dt) {
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 28);
  for (const f of state.floaters) f.t += dt;
  state.floaters = state.floaters.filter((f) => f.t < 1.4);
  for (const c of state.confetti) {
    c.t += dt;
    c.y += c.vy * dt;
    c.x += c.vx * dt;
    c.vy += 60 * dt;
  }
  state.confetti = state.confetti.filter((c) => c.t < 4 && c.y < 860);
  if (state.screen === 'play' && state.phase === 'reveal' && !state.frozen) {
    state.revealT += dt * 1000;
    if (state.revealT >= REVEAL_MS) {
      state.table = { playerCard: null, aiCard: null };
      state.turn += 1;
      beginTurn(state);
    }
  }
}

/** Restart the duel from the title screen. */
export function restart(state) {
  startMatch(state);
}

function addFloater(state, x, y, text, color) {
  state.floaters.push({ x, y, text, color, t: 0 });
}

function spawnConfetti(state) {
  const colors = ['#ffd76a', '#e2483a', '#4da34a', '#3a86d8', '#fff3c4'];
  for (let i = 0; i < 90; i++) {
    state.confetti.push({
      x: 80 + state.rng() * 1120,
      y: -20 - state.rng() * 200,
      vx: (state.rng() - 0.5) * 90,
      vy: 60 + state.rng() * 140,
      color: colors[Math.floor(state.rng() * colors.length)],
      size: 5 + state.rng() * 7,
      t: 0,
    });
  }
}

// ---------------------------------------------------------------- deterministic shots

/** Build a fixed, stable state for a screenshot: title / play / win / loss. */
export function applyShot(state, shot, seed) {
  if (shot === 'title') {
    state.screen = 'title';
    state.phase = 'await';
    state.table = { playerCard: null, aiCard: null };
    state.lastClash = null;
    return;
  }
  if (shot === 'win' || shot === 'loss') {
    startMatch(state);
    // Force the end screen with plausible final stats.
    state.turn = 9;
    state.turnsPlayed = 8;
    state.damageDealt = shot === 'win' ? 21 : 14;
    state.player.life = shot === 'win' ? 9 : 0;
    state.ai.life = shot === 'win' ? 0 : 7;
    state.player.hand = state.player.hand.slice(0, 3);
    state.ai.hand = state.ai.hand.slice(0, 2);
    state.phase = 'await';
    state.table = { playerCard: null, aiCard: null };
    endGame(state, shot);
    // endGame resets the table; keep the log line it sets.
    return;
  }
  // Default: 'play' — a fixed mid-game position from the seed.
  startMatch(state);
  state.turn = 4;
  state.turnsPlayed = 3;
  state.damageDealt = 9;
  state.player.life = 16;
  state.ai.life = 13;
  state.player.embers = 4;
  state.ai.embers = 3;
  // Fixed revealed clash on the table so the shot shows the duel mid-flourish.
  const pCard = state.player.hand[1] ?? state.player.hand[0];
  const aCard = state.ai.hand[0];
  state.table = { playerCard: pCard, aiCard: aCard };
  state.player.hand = state.player.hand.filter((c) => c !== pCard);
  state.ai.hand = state.ai.hand.filter((c) => c !== aCard);
  // The shot's clash text must come from the real clash math, not a
  // hardcoded result: Cinder Fox (3 Flame) vs Bramble Knight (6 Leaf) is
  // 6 vs 6 — a tie, both take 1 — so the log and floaters say exactly that.
  // The wording mirrors resolveClash so the shot can never drift from it.
  const pPower = clashPower(pCard, aCard);
  const aPower = clashPower(aCard, pCard);
  let dmgToAi = 0;
  let dmgToPlayer = 0;
  let text;
  if (pPower > aPower) {
    dmgToAi = Math.max(1, pPower - aPower);
    text = `${pCard.name} (${pPower}) overpowers ${aCard.name} (${aPower}) — ${dmgToAi} damage!`;
  } else if (aPower > pPower) {
    dmgToPlayer = Math.max(1, aPower - pPower);
    text = `${aCard.name} (${aPower}) overpowers ${pCard.name} (${pPower}) — you take ${dmgToPlayer}!`;
  } else {
    dmgToAi = 1;
    dmgToPlayer = 1;
    text = `A tie at ${pPower} — both sides take 1 damage.`;
  }
  state.lastClash = {
    playerCard: pCard,
    aiCard: aCard,
    playerPower: pPower,
    aiPower: aPower,
    dmgToAi,
    dmgToPlayer,
    text,
  };
  state.log = text;
  state.thought = 'The Warden weighs a Tide card…';
  state.phase = 'reveal';
  state.revealT = 500;
  state.frozen = true; // hold the clash on the table for the screenshot
  state.floaters = [];
  if (dmgToAi > 0) state.floaters.push({ x: 640, y: 210, text: `-${dmgToAi}`, color: '#ff6b5e', t: 0.3 });
  // The player's floater sits right of the life bar so it can never cover
  // the life total or the ember pips while frozen mid-flight.
  if (dmgToPlayer > 0) state.floaters.push({ x: 860, y: 590, text: `-${dmgToPlayer}`, color: '#ff6b5e', t: 0.3 });
}
