// Ember Court — seeded randomness (mulberry32) and shuffling.
// Every deterministic screenshot state (?shot=...&seed=...) goes through here,
// so the same seed always deals the same hands.

/** A small, fast seeded PRNG. Returns a function yielding [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Build an RNG from a seed that may be a number or a string. */
export function makeRng(seed) {
  if (typeof seed === 'string') {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return mulberry32(h >>> 0);
  }
  return mulberry32(Number(seed) || 1);
}

/** Fisher–Yates shuffle in place, driven by the given RNG. Returns the array. */
export function shuffle(array, rng) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = array[i];
    array[i] = array[j];
    array[j] = tmp;
  }
  return array;
}

/** A random integer in [min, max], inclusive. */
export function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Pick one element of an array at random. */
export function pick(rng, array) {
  return array[Math.floor(rng() * array.length)];
}
