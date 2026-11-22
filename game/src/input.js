// Ember Court — mouse + keyboard input.
// Click a card to select it, click again (or Enter / Space) to play it.
// Keys 1-7 select, R restarts, H toggles help, M toggles mute.

import { layoutHand } from './render.js';
import { canPlay, playSelected, restart } from './state.js';

/**
 * Wire input to the canvas. `hooks` carries the live game:
 *   { state, audio, onPlay, onBegin, onRestart }
 * Returns a detach function (unused by the game, kept for completeness).
 */
export function attachInput(canvas, hooks) {
  const state = () => hooks.state;

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  function hitHand(point) {
    const slots = layoutHand(state());
    for (let i = slots.length - 1; i >= 0; i--) {
      const s = slots[i];
      if (point.x >= s.x && point.x <= s.x + s.w && point.y >= s.y && point.y <= s.y + s.h) return i;
    }
    return -1;
  }

  function beginFromTitle() {
    if (state().screen === 'title') {
      hooks.onBegin();
      return true;
    }
    return false;
  }

  function onClick(event) {
    const s = state();
    if (s.help) {
      s.help = false;
      return;
    }
    if (beginFromTitle()) return;
    if (s.screen !== 'play' || s.phase !== 'await') return;
    const index = hitHand(canvasPoint(event));
    if (index < 0) return;
    if (s.selected === index) {
      if (canPlay(s, index)) {
        playSelected(s);
        hooks.audio.play('play');
        hooks.onPlay();
      } else {
        hooks.audio.play('deny');
      }
    } else {
      s.selected = index;
      hooks.audio.play('select');
    }
  }

  function onKey(event) {
    const s = state();
    if (event.key === 'm' || event.key === 'M') {
      s.muted = !s.muted;
      hooks.audio.setMuted(s.muted);
      return;
    }
    if (event.key === 'h' || event.key === 'H') {
      s.help = !s.help;
      return;
    }
    if (event.key === 'r' || event.key === 'R') {
      if (s.screen === 'win' || s.screen === 'loss' || s.screen === 'play') {
        restart(s);
        hooks.onRestart();
      }
      return;
    }
    if (s.help) {
      if (event.key === 'Escape') s.help = false;
      return;
    }
    if (s.screen === 'title') {
      if (event.key === 'Enter' || event.key === ' ') hooks.onBegin();
      return;
    }
    if (s.screen !== 'play' || s.phase !== 'await') return;
    if (event.key >= '1' && event.key <= '7') {
      const index = Number(event.key) - 1;
      if (index < s.player.hand.length) {
        s.selected = index;
        hooks.audio.play('select');
      }
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (s.selected >= 0) {
        if (canPlay(s, s.selected)) {
          playSelected(s);
          hooks.audio.play('play');
          hooks.onPlay();
        } else {
          hooks.audio.play('deny');
        }
      }
    }
  }

  canvas.addEventListener('click', onClick);
  window.addEventListener('keydown', onKey);
  return () => {
    canvas.removeEventListener('click', onClick);
    window.removeEventListener('keydown', onKey);
  };
}
