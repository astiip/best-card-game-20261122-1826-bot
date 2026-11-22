// Ember Court — the elements and the 24-card deck.
// Elements form a cycle, each told apart by colour AND a shape glyph, never text alone:
//   Flame (red, triangle) beats Leaf (green, diamond) beats Stone (grey-brown, square)
//   beats Tide (blue, circle) beats Flame. Advantage adds +3 power in a clash.

export const ELEMENTS = {
  flame: { name: 'Flame', color: '#e2483a', dark: '#8f1f16', light: '#ffb199', glyph: 'triangle', beats: 'leaf' },
  leaf: { name: 'Leaf', color: '#4da34a', dark: '#245c23', light: '#b8e6a8', glyph: 'diamond', beats: 'stone' },
  stone: { name: 'Stone', color: '#9a7d54', dark: '#5c4527', light: '#e3cfa8', glyph: 'square', beats: 'tide' },
  tide: { name: 'Tide', color: '#3a86d8', dark: '#1c4d86', light: '#a8d0f5', glyph: 'circle', beats: 'flame' },
};

export const ELEMENT_ORDER = ['flame', 'leaf', 'stone', 'tide'];

/** Elemental advantage: +3 power when the attacker's element beats the defender's. */
export function advantageOf(attackerElement, defenderElement) {
  if (!attackerElement || !defenderElement) return 0;
  return ELEMENTS[attackerElement].beats === defenderElement ? 3 : 0;
}

/** A clash's effective power: base power plus elemental advantage. */
export function clashPower(card, opponentCard) {
  return card.power + advantageOf(card.element, opponentCard.element);
}

// Card effects:
//   draw   — draw an extra card after the clash.
//   ward   — block the next damage dealt to you.
//   kindle — gain +1 ember next turn.
export const CARD_DEFS = [
  // Flame — 6 cards
  { id: 'cinder-fox', name: 'Cinder Fox', element: 'flame', cost: 1, power: 3, effect: null },
  { id: 'spark-imp', name: 'Spark Imp', element: 'flame', cost: 1, power: 2, effect: 'draw' },
  { id: 'ember-psalm', name: 'Ember Psalm', element: 'flame', cost: 2, power: 4, effect: 'kindle' },
  { id: 'pyre-dancer', name: 'Pyre Dancer', element: 'flame', cost: 2, power: 3, effect: 'draw' },
  { id: 'ashfall', name: 'Ashfall', element: 'flame', cost: 3, power: 5, effect: null },
  { id: 'coalheart', name: 'Coalheart', element: 'flame', cost: 4, power: 7, effect: null },
  // Leaf — 6 cards
  { id: 'grove-wisp', name: 'Grove Wisp', element: 'leaf', cost: 1, power: 2, effect: 'draw' },
  { id: 'seedling-guard', name: 'Seedling Guard', element: 'leaf', cost: 1, power: 3, effect: 'ward' },
  { id: 'thornvine', name: 'Thornvine', element: 'leaf', cost: 2, power: 4, effect: null },
  { id: 'rootbound-sentinel', name: 'Rootbound Sentinel', element: 'leaf', cost: 3, power: 5, effect: 'ward' },
  { id: 'bramble-knight', name: 'Bramble Knight', element: 'leaf', cost: 3, power: 6, effect: null },
  { id: 'canopy-stag', name: 'Canopy Stag', element: 'leaf', cost: 4, power: 6, effect: 'kindle' },
  // Stone — 6 cards
  { id: 'shard-beetle', name: 'Shard Beetle', element: 'stone', cost: 1, power: 2, effect: null },
  { id: 'pebble-guard', name: 'Pebble Guard', element: 'stone', cost: 1, power: 3, effect: 'ward' },
  { id: 'quarry-hound', name: 'Quarry Hound', element: 'stone', cost: 2, power: 4, effect: null },
  { id: 'boulder-sage', name: 'Boulder Sage', element: 'stone', cost: 3, power: 5, effect: 'kindle' },
  { id: 'mountains-echo', name: "Mountain's Echo", element: 'stone', cost: 3, power: 6, effect: 'draw' },
  { id: 'granite-ox', name: 'Granite Ox', element: 'stone', cost: 4, power: 7, effect: null },
  // Tide — 6 cards
  { id: 'ripple-eel', name: 'Ripple Eel', element: 'tide', cost: 1, power: 2, effect: null },
  { id: 'foam-sprite', name: 'Foam Sprite', element: 'tide', cost: 1, power: 3, effect: null },
  { id: 'mist-heron', name: 'Mist Heron', element: 'tide', cost: 2, power: 4, effect: 'kindle' },
  { id: 'tidecaller', name: 'Tidecaller', element: 'tide', cost: 3, power: 5, effect: 'draw' },
  { id: 'undertow', name: 'Undertow', element: 'tide', cost: 3, power: 6, effect: 'ward' },
  { id: 'deepcurrent', name: 'Deepcurrent', element: 'tide', cost: 4, power: 7, effect: null },
];

export const DECK_SIZE = CARD_DEFS.length;
export const HAND_SIZE_START = 5;
export const HAND_MAX = 7;
export const LIFE_START = 20;
export const MAX_EMBERS_PER_TURN = 5;

let nextUid = 1;

/** One playable copy of a card definition, with a unique id for animation tracking. */
export function makeCard(def) {
  return { uid: nextUid++, id: def.id, name: def.name, element: def.element, cost: def.cost, power: def.power, effect: def.effect };
}

/** Build a fresh 24-card deck (one copy of each definition), shuffled by the RNG. */
export function buildDeck(rng) {
  const deck = CARD_DEFS.map(makeCard);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = deck[i];
    deck[i] = deck[j];
    deck[j] = tmp;
  }
  return deck;
}

/** Draw the top card of a deck; reshuffles the discard pile in when the deck runs dry. */
export function drawFrom(deck, discard, rng) {
  if (deck.length === 0) {
    if (discard.length === 0) return null;
    while (discard.length > 0) deck.push(discard.pop());
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = deck[i];
      deck[i] = deck[j];
      deck[j] = tmp;
    }
  }
  return deck.pop() ?? null;
}

/** A short human label for a card's effect, for the card face. */
export function effectLabel(effect) {
  if (effect === 'draw') return 'Draw +1';
  if (effect === 'ward') return 'Ward';
  if (effect === 'kindle') return 'Kindle +1';
  return '';
}
