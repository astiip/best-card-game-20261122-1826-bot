// Ember Court — boot, game loop and deterministic screenshot states.
// Open plain for the title screen, or with ?shot=title | ?shot=play&seed=1 |
// ?shot=win | ?shot=loss for the four fixed states the screenshots are taken from.

import { applyShot, newGame, startMatch, update } from './state.js';
import { draw, H, W } from './render.js';
import { attachInput } from './input.js';
import { AudioSys } from './audio.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const seedParam = params.get('seed');
const seed = seedParam === null ? 1 : Number(seedParam) || 1;
const shot = params.get('shot');

const state = newGame(seed);
const audio = new AudioSys();
let lastScreen = state.screen;
let lastLog = '';

if (shot) {
  applyShot(state, shot, seed);
  lastScreen = state.screen;
} else {
  state.screen = 'title';
}

function announce() {
  if (!statusEl) return;
  const line = `${state.screen} — ${state.log}`;
  if (line !== lastLog) {
    lastLog = line;
    statusEl.textContent = line;
  }
}

function onBegin() {
  audio.ensure();
  audio.play('play');
  startMatch(state);
}

function onPlay() {
  audio.play('clash');
}

function onRestart() {
  audio.ensure();
  audio.play('play');
}

attachInput(canvas, { state, audio, onBegin, onPlay, onRestart });

let lastTime = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  update(state, dt);
  if (state.screen !== lastScreen) {
    if (state.screen === 'win') audio.play('win');
    if (state.screen === 'loss') audio.play('loss');
    lastScreen = state.screen;
  }
  announce();
  ctx.clearRect(0, 0, W, H);
  draw(state, ctx, now);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
