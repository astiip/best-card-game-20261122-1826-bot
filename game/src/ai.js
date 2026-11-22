// Ember Court — the Ash Warden's mind.
// Readable and counterable by design:
//   - it prefers an element that beats your last played element,
//   - it saves its biggest card while it is behind on life,
//   - it plays cheap cards early (turns 1-2).
// Every choice comes with a one-line thought bubble so you can read it.

import { ELEMENTS, advantageOf } from './cards.js';

/** The element that beats a given element (the counter to it). */
export function counterElement(element) {
  for (const key of Object.keys(ELEMENTS)) {
    if (ELEMENTS[key].beats === element) return key;
  }
  return null;
}

/**
 * Choose the AI's card for this clash. Returns { index, thought } where index is
 * the position in the AI hand, or -1 when it has nothing it can afford.
 * `context` carries { turn, aiLife, playerLife, playerLastElement, rng }.
 */
export function chooseAiCard(hand, embers, context) {
  const affordable = hand
    .map((card, index) => ({ card, index }))
    .filter((entry) => entry.card.cost <= embers);
  if (affordable.length === 0) return { index: -1, thought: 'The Warden has no ember to spare…' };

  const { turn, aiLife, playerLife, playerLastElement, rng } = context;
  const behind = aiLife < playerLife;
  const counter = playerLastElement ? counterElement(playerLastElement) : null;

  const score = (entry) => {
    const { card } = entry;
    let s = card.power * 2 - card.cost;
    // Prefer the element that beats what you just played.
    if (counter && card.element === counter) s += 6;
    // A ward is worth more when the Warden is hurting.
    if (card.effect === 'ward' && behind) s += 3;
    // Cheap cards early, while embers are scarce.
    if (turn <= 2 && card.cost <= 2) s += 2;
    if (turn <= 2 && card.cost >= 4) s -= 3;
    // Save the biggest card while behind: hold the heavy hitters for later.
    if (behind && card.power >= 6) s -= 5;
    // A small nudge of variety so the Warden is not perfectly predictable.
    s += rng() * 0.9;
    return s;
  };

  let best = affordable[0];
  let bestScore = score(best);
  for (const entry of affordable.slice(1)) {
    const s = score(entry);
    if (s > bestScore) {
      best = entry;
      bestScore = s;
    }
  }

  let thought;
  if (counter && best.card.element === counter) {
    thought = `The Warden weighs a ${ELEMENTS[best.card.element].name} card…`;
  } else if (behind && best.card.power < 6) {
    thought = 'The Warden holds its strength back…';
  } else if (turn <= 2) {
    thought = 'The Warden opens with something cheap…';
  } else if (best.card.effect === 'ward') {
    thought = 'The Warden raises a ward…';
  } else {
    thought = `The Warden reaches for ${best.card.name}…`;
  }
  return { index: best.index, thought };
}

/** A flavour line for the Warden when it cannot play at all. */
export function idleThought(rng) {
  const lines = [
    'The Warden stares into the embers…',
    'The Warden taps the table, waiting…',
    'Ash drifts across the Warden’s side of the table…',
  ];
  return lines[Math.floor(rng() * lines.length)];
}
