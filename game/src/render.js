// Ember Court — all canvas drawing: the felt table, cards, hands, life bars,
// screens, and the slide / flip / shake / confetti feel.
// Layout is fixed for a 1280x800 canvas; layoutHand() is shared with input.js
// so clicks and drawing always agree on where a card sits.

import { ELEMENTS, effectLabel } from './cards.js';

export const W = 1280;
export const H = 800;

const HAND_Y = 600;
const CARD_W = 118;
const CARD_H = 166;
const PLAY_W = 150;
const PLAY_H = 210;
const PLAY_Y = 268;

// ---------------------------------------------------------------- helpers

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fitText(ctx, text, maxWidth) {
  const match = /(\d+(?:\.\d+)?)px/.exec(ctx.font);
  let size = match ? parseFloat(match[1]) : 16;
  while (size > 8 && ctx.measureText(text).width > maxWidth) {
    size -= 1;
    ctx.font = ctx.font.replace(/(\d+(?:\.\d+)?)px/, `${size}px`);
  }
}

/** Draw an element's shape glyph (colour + shape, never text alone). */
export function drawGlyph(ctx, element, cx, cy, size, color) {
  const el = ELEMENTS[element];
  ctx.save();
  ctx.fillStyle = color || el.color;
  ctx.strokeStyle = color || el.color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (el.glyph === 'triangle') {
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx + size * 0.95, cy + size * 0.7);
    ctx.lineTo(cx - size * 0.95, cy + size * 0.7);
    ctx.closePath();
    ctx.fill();
    // A little inner flame flick.
    ctx.fillStyle = 'rgba(255, 220, 120, 0.9)';
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.45);
    ctx.lineTo(cx + size * 0.4, cy + size * 0.45);
    ctx.lineTo(cx - size * 0.4, cy + size * 0.45);
    ctx.closePath();
    ctx.fill();
  } else if (el.glyph === 'diamond') {
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx + size * 0.8, cy);
    ctx.lineTo(cx, cy + size);
    ctx.lineTo(cx - size * 0.8, cy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.55);
    ctx.lineTo(cx, cy + size * 0.55);
    ctx.stroke();
  } else if (el.glyph === 'square') {
    ctx.fillRect(cx - size * 0.85, cy - size * 0.85, size * 1.7, size * 1.7);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.strokeRect(cx - size * 0.5, cy - size * 0.5, size, size);
  } else {
    // Tide: a circle with a wave cut.
    ctx.arc(cx, cy, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.6, cy);
    ctx.quadraticCurveTo(cx - size * 0.3, cy - size * 0.45, cx, cy);
    ctx.quadraticCurveTo(cx + size * 0.3, cy + size * 0.45, cx + size * 0.6, cy);
    ctx.stroke();
  }
  ctx.restore();
}

/** The rectangles of the player's hand cards, in hand order. Shared with input. */
export function layoutHand(state) {
  const hand = state.player.hand;
  const n = hand.length;
  if (n === 0) return [];
  const spacing = n === 1 ? 0 : Math.min(CARD_W + 6, (1060 - CARD_W) / (n - 1));
  const total = CARD_W + spacing * (n - 1);
  const startX = (W - total) / 2;
  return hand.map((card, i) => {
    const arc = Math.pow(i - (n - 1) / 2, 2) * 3.5;
    const selected = state.selected === i;
    return {
      card,
      index: i,
      x: startX + i * spacing,
      y: HAND_Y + arc - (selected ? 26 : 0),
      w: CARD_W,
      h: CARD_H,
    };
  });
}

// ---------------------------------------------------------------- card faces

/** Draw one card face-up at (x, y) with width w and height h. */
export function drawCardFace(ctx, card, x, y, w, h) {
  const el = ELEMENTS[card.element];
  const s = w / CARD_W; // scale relative to hand size
  ctx.save();
  roundRect(ctx, x, y, w, h, 10 * s);
  ctx.fillStyle = '#f7ead0';
  ctx.fill();
  ctx.lineWidth = 2.5 * s;
  ctx.strokeStyle = el.dark;
  ctx.stroke();
  // Element header band.
  ctx.save();
  roundRect(ctx, x + 3, y + 3, w - 6, 34 * s, 8 * s);
  ctx.fillStyle = el.color;
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.round(13 * s)}px Georgia, serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(el.name.toUpperCase(), x + 10 * s, y + 21 * s);
  drawGlyph(ctx, card.element, x + w - 22 * s, y + 21 * s, 11 * s);
  // Name, one line.
  ctx.fillStyle = '#2b1d12';
  ctx.font = `bold ${Math.round(15 * s)}px Georgia, serif`;
  ctx.textAlign = 'center';
  fitText(ctx, card.name, w - 14 * s);
  ctx.fillText(card.name, x + w / 2, y + 62 * s);
  // Big central glyph.
  drawGlyph(ctx, card.element, x + w / 2, y + h * 0.52, 30 * s);
  // Big power number, bottom-left.
  ctx.fillStyle = el.dark;
  ctx.font = `bold ${Math.round(34 * s)}px Georgia, serif`;
  ctx.textAlign = 'left';
  ctx.fillText(String(card.power), x + 12 * s, y + h - 16 * s);
  ctx.font = `${Math.round(10 * s)}px Georgia, serif`;
  ctx.fillStyle = '#6b543a';
  ctx.fillText('POWER', x + 12 * s, y + h - 34 * s);
  // Effect label, bottom-right.
  const label = effectLabel(card.effect);
  if (label) {
    ctx.font = `bold ${Math.round(11 * s)}px Georgia, serif`;
    ctx.textAlign = 'right';
    ctx.fillStyle = '#7a4d12';
    ctx.fillText(label, x + w - 10 * s, y + h - 16 * s);
  }
  // Ember cost pip, top-right over the header.
  ctx.beginPath();
  ctx.arc(x + w - 8 * s, y + 8 * s, 15 * s, 0, Math.PI * 2);
  ctx.fillStyle = '#ff8c1a';
  ctx.fill();
  ctx.lineWidth = 2 * s;
  ctx.strokeStyle = '#fff3c4';
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.round(16 * s)}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.fillText(String(card.cost), x + w - 8 * s, y + 9 * s);
  ctx.restore();
}

/** Draw a face-down card (card back) at (x, y) with width w and height h. */
export function drawCardBack(ctx, x, y, w, h) {
  const s = w / CARD_W;
  ctx.save();
  roundRect(ctx, x, y, w, h, 10 * s);
  ctx.fillStyle = '#3a2a1c';
  ctx.fill();
  ctx.lineWidth = 2.5 * s;
  ctx.strokeStyle = '#c9a227';
  ctx.stroke();
  roundRect(ctx, x + 7 * s, y + 7 * s, w - 14 * s, h - 14 * s, 7 * s);
  ctx.strokeStyle = '#8a6d1f';
  ctx.lineWidth = 1.5 * s;
  ctx.stroke();
  drawGlyph(ctx, 'flame', x + w / 2, y + h / 2 - 6 * s, 22 * s, '#c9a227');
  ctx.fillStyle = '#c9a227';
  ctx.font = `bold ${Math.round(11 * s)}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.fillText('EMBER COURT', x + w / 2, y + h - 20 * s);
  ctx.restore();
}

// ---------------------------------------------------------------- bars and table

function drawLifeBar(ctx, x, y, w, label, life, maxLife, alignRight, ward) {
  ctx.save();
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textAlign = alignRight ? 'right' : 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f3e2b8';
  ctx.fillText(label, alignRight ? x + w : x, y - 14);
  // Track.
  roundRect(ctx, x, y, w, 22, 11);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fill();
  // Fill.
  const frac = Math.max(0, life / maxLife);
  if (frac > 0) {
    roundRect(ctx, x + 2, y + 2, (w - 4) * frac, 18, 9);
    const grad = ctx.createLinearGradient(x, y, x + w, y);
    grad.addColorStop(0, '#ff7a5c');
    grad.addColorStop(1, '#e2483a');
    ctx.fillStyle = grad;
    ctx.fill();
  }
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 17px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${life} / ${maxLife}`, x + w / 2, y + 12);
  if (ward) {
    ctx.fillStyle = '#8fd0ff';
    ctx.font = 'bold 14px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText('🛡 Ward', alignRight ? x + w + 12 : x - 62, y + 12);
  }
  ctx.restore();
}

function drawEmberPips(ctx, cx, y, embers, maxEmbers) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.fillStyle = '#f3e2b8';
  ctx.fillText('EMBERS', cx - 90, y);
  for (let i = 0; i < maxEmbers; i++) {
    const x = cx - 30 + i * 26;
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    if (i < embers) {
      ctx.fillStyle = '#ff8c1a';
      ctx.fill();
      ctx.strokeStyle = '#fff3c4';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(243,226,184,0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawDeckPile(ctx, x, y, count, faceDown) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(x - 4, y - 4, 62, 88);
  if (count > 0) {
    if (faceDown) drawCardBack(ctx, x, y, 54, 80);
    else drawCardFace(ctx, { name: 'Deck', element: 'stone', cost: 0, power: 0, effect: null }, x, y, 54, 80);
  }
  ctx.fillStyle = '#f3e2b8';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${count}`, x + 27, y + 96);
  ctx.restore();
}

function drawDiscardPile(ctx, x, y, count, label) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(x - 4, y - 4, 62, 88);
  if (count > 0) drawCardBack(ctx, x, y, 54, 80);
  ctx.fillStyle = '#f3e2b8';
  ctx.font = 'bold 12px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + 27, y + 96);
  ctx.fillText(`${count} cards`, x + 27, y + 112);
  ctx.restore();
}

// ---------------------------------------------------------------- screens

function drawTitle(ctx, state, now) {
  ctx.save();
  ctx.fillStyle = '#0a140c'; // solid opaque: the table must not bleed through
  ctx.fillRect(0, 0, W, H);
  const bob = Math.sin(now / 700) * 6;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd76a';
  ctx.font = 'bold 84px Georgia, serif';
  ctx.fillText('EMBER COURT', W / 2, 240 + bob);
  ctx.fillStyle = '#f3e2b8';
  ctx.font = 'italic 24px Georgia, serif';
  ctx.fillText('A duel of elemental cards against the Ash Warden', W / 2, 292 + bob);
  drawGlyph(ctx, 'flame', W / 2 - 190, 330, 16);
  drawGlyph(ctx, 'leaf', W / 2 - 90, 330, 16);
  drawGlyph(ctx, 'stone', W / 2 + 90, 330, 16);
  drawGlyph(ctx, 'tide', W / 2 + 190, 330, 16);
  ctx.fillStyle = '#e8d9ae';
  ctx.font = '18px Georgia, serif';
  ctx.fillText('Flame beats Leaf · Leaf beats Stone · Stone beats Tide · Tide beats Flame', W / 2, 372);
  ctx.fillText('Each turn: gain embers, draw a card, play one card. First to 0 life loses.', W / 2, 404);
  ctx.fillStyle = '#ffd76a';
  ctx.font = 'bold 26px Georgia, serif';
  const blink = Math.sin(now / 350) > -0.4;
  if (blink) ctx.fillText('Click or press Enter to begin', W / 2, 480);
  ctx.fillStyle = '#cbb98a';
  ctx.font = 'italic 17px Georgia, serif';
  ctx.fillText('“The court is lit. The Warden is waiting.”', W / 2, 540);
  ctx.restore();
}

function drawEndScreen(ctx, state, now) {
  const win = state.screen === 'win';
  ctx.save();
  // Solid opaque backdrop: the table must not bleed through the end screen.
  ctx.fillStyle = win ? '#141004' : '#080a0e';
  ctx.fillRect(0, 0, W, H);
  if (win) {
    // Golden rays over the solid backdrop.
    ctx.translate(W / 2, 300);
    ctx.rotate(Math.sin(now / 2400) * 0.08);
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 215, 106, 0.10)' : 'rgba(255, 215, 106, 0.05)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(700, -60);
      ctx.lineTo(700, 60);
      ctx.closePath();
      ctx.fill();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = win ? '#ffd76a' : '#9fb4c8';
  ctx.font = 'bold 76px Georgia, serif';
  ctx.fillText(win ? 'VICTORY' : 'DEFEAT', W / 2, 280);
  ctx.fillStyle = '#f3e2b8';
  ctx.font = 'italic 26px Georgia, serif';
  ctx.fillText(
    win ? '— the Ash Warden kneels —' : '— the embers fade —',
    W / 2,
    330,
  );
  ctx.font = '20px Georgia, serif';
  ctx.fillStyle = '#e8d9ae';
  ctx.fillText(`Turns played: ${state.turnsPlayed}    ·    Damage dealt: ${state.damageDealt}`, W / 2, 400);
  ctx.fillStyle = '#ffd76a';
  ctx.font = 'bold 24px Georgia, serif';
  const blink = Math.sin(now / 350) > -0.4;
  if (blink) ctx.fillText(win ? 'Press R to play again' : 'Press R to try again', W / 2, 470);
  ctx.restore();
}

function drawHelp(ctx) {
  ctx.save();
  ctx.fillStyle = '#080c09'; // solid opaque, like the other overlays
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd76a';
  ctx.font = 'bold 34px Georgia, serif';
  ctx.fillText('HOW TO PLAY', W / 2, 170);
  ctx.fillStyle = '#f3e2b8';
  ctx.font = '19px Georgia, serif';
  const lines = [
    'Each turn you gain embers (min of turn and 5) and draw a card.',
    'Play exactly 1 card per turn. Its ember cost must fit your embers.',
    'Both cards reveal and clash: power + 3 if your element beats theirs.',
    'The loser takes the difference (at least 1); a tie hurts you both.',
    'Ward blocks one hit. Draw draws an extra card. Kindle gives +1 ember next turn.',
    '',
    'Flame beats Leaf · Leaf beats Stone · Stone beats Tide · Tide beats Flame',
    '',
    'Click a card or press 1–7 to select, Enter / Space to play.',
    'R restart · H help · M mute',
  ];
  lines.forEach((line, i) => ctx.fillText(line, W / 2, 220 + i * 34));
  const y = 220 + 5 * 34;
  drawGlyph(ctx, 'flame', W / 2 - 150, y + 68, 14);
  drawGlyph(ctx, 'leaf', W / 2 - 50, y + 68, 14);
  drawGlyph(ctx, 'stone', W / 2 + 50, y + 68, 14);
  drawGlyph(ctx, 'tide', W / 2 + 150, y + 68, 14);
  ctx.restore();
}

// ---------------------------------------------------------------- main draw

/** Draw the whole game for this frame. `now` is milliseconds (for animation). */
export function draw(state, ctx, now) {
  ctx.save();
  // Shake on clash.
  if (state.shake > 0) {
    const s = state.shake;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
  // Felt table.
  const felt = ctx.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, 760);
  felt.addColorStop(0, '#2c5a34');
  felt.addColorStop(1, '#122b18');
  ctx.fillStyle = felt;
  ctx.fillRect(-20, -20, W + 40, H + 40);
  // Gold trim border.
  ctx.strokeStyle = '#c9a227';
  ctx.lineWidth = 5;
  ctx.strokeRect(10, 10, W - 20, H - 20);
  ctx.strokeStyle = 'rgba(201, 162, 39, 0.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(22, 22, W - 44, H - 44);
  // Centre emblem.
  ctx.save();
  ctx.globalAlpha = 0.12;
  drawGlyph(ctx, 'flame', W / 2, 390, 90, '#ffd76a');
  ctx.restore();

  // Any full-screen overlay (title / win / loss / help) sits on a solid
  // opaque panel; while one is up the table's bottom rows stay hidden so
  // overlay text can never collide with them.
  const overlayUp =
    state.screen === 'title' || state.screen === 'win' || state.screen === 'loss' || state.help;

  // Opponent life + hand backs.
  drawLifeBar(ctx, 440, 34, 400, 'ASH WARDEN', state.ai.life, 20, false, state.ai.ward);
  const aiHand = state.ai.hand;
  const backW = 54;
  const backSpacing = Math.min(backW + 4, 620 / Math.max(1, aiHand.length));
  const backTotal = backW + backSpacing * (aiHand.length - 1);
  aiHand.forEach((_, i) => {
    drawCardBack(ctx, (W - backTotal) / 2 + i * backSpacing, 66, backW, 78);
  });
  ctx.fillStyle = '#f3e2b8';
  ctx.font = '13px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Warden's hand: ${aiHand.length} cards`, 40, 110);

  // Warden's thought bubble.
  ctx.save();
  ctx.fillStyle = 'rgba(247, 234, 208, 0.95)';
  roundRect(ctx, 880, 66, 340, 52, 12);
  ctx.fill();
  ctx.fillStyle = '#3a2a1c';
  ctx.font = 'italic 14px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  fitText(ctx, state.thought, 316);
  ctx.fillText(state.thought, 896, 92);
  ctx.restore();

  // Turn + damage tally.
  ctx.fillStyle = '#f3e2b8';
  ctx.font = 'bold 16px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Turn ${state.turn}`, 40, 40);
  ctx.textAlign = 'right';
  ctx.fillText(`Damage dealt: ${state.damageDealt}`, W - 40, 40);

  // Clash result banner.
  if (state.lastClash && state.phase === 'reveal') {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px Georgia, serif';
    ctx.fillStyle = '#ffd76a';
    ctx.fillText(state.lastClash.text, W / 2, 240);
    ctx.font = '18px Georgia, serif';
    ctx.fillStyle = '#f3e2b8';
    ctx.fillText(
      `You ${state.lastClash.playerPower}  vs  ${state.lastClash.aiPower} Warden`,
      W / 2,
      215,
    );
    ctx.restore();
  }

  // Played cards on the table.
  const pCard = state.table.playerCard;
  const aCard = state.table.aiCard;
  if (pCard || aCard) {
    const flip = state.phase === 'reveal' ? Math.min(1, state.revealT / 450) : 1;
    const scaleX = Math.abs(Math.cos(flip * Math.PI * 0.5)) * 0.2 + 0.8;
    if (pCard) {
      ctx.save();
      ctx.translate(560, PLAY_Y + PLAY_H / 2);
      ctx.scale(scaleX, 1);
      drawCardFace(ctx, pCard, -PLAY_W / 2, -PLAY_H / 2, PLAY_W, PLAY_H);
      ctx.restore();
      ctx.fillStyle = '#f3e2b8';
      ctx.font = 'bold 13px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('YOU', 560, PLAY_Y - 12);
    }
    if (aCard) {
      ctx.save();
      ctx.translate(720, PLAY_Y + PLAY_H / 2);
      ctx.scale(scaleX, 1);
      drawCardFace(ctx, aCard, -PLAY_W / 2, -PLAY_H / 2, PLAY_W, PLAY_H);
      ctx.restore();
      ctx.fillStyle = '#f3e2b8';
      ctx.font = 'bold 13px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('WARDEN', 720, PLAY_Y - 12);
    }
  }

  // Decks and discard piles at the table edges.
  drawDeckPile(ctx, 36, 320, state.ai.deck.length, true);
  drawDiscardPile(ctx, 36, 440, state.ai.discard.length, 'Warden discard');
  drawDeckPile(ctx, W - 98, 320, state.player.deck.length, true);
  drawDiscardPile(ctx, W - 98, 440, state.player.discard.length, 'Your discard');

  // Log line — hidden while an overlay is up (its text would collide with
  // the overlay and the life-bar label), and lifted clear of that label.
  if (!overlayUp) {
    ctx.fillStyle = '#e8d9ae';
    ctx.font = 'italic 17px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.log, W / 2, 506);
  }

  // Player life + embers — hidden while an overlay is up (the title quote
  // and the win/loss log line sit on these rows), and the bar is nudged
  // down so the log line's descenders clear its label.
  if (!overlayUp) {
    drawLifeBar(ctx, 440, 540, 400, 'SPARK-KEEPER (YOU)', state.player.life, 20, false, state.player.ward);
    drawEmberPips(ctx, W / 2, 578, state.player.embers, 5);
  }

  // Player hand.
  for (const slot of layoutHand(state)) {
    const affordable = slot.card.cost <= state.player.embers;
    const playable = state.screen === 'play' && state.phase === 'await' && affordable;
    if (state.selected === slot.index) {
      ctx.save();
      ctx.shadowColor = '#ffd76a';
      ctx.shadowBlur = 22;
      drawCardFace(ctx, slot.card, slot.x, slot.y, slot.w, slot.h);
      ctx.restore();
    } else {
      if (!playable && state.screen === 'play') {
        ctx.save();
        ctx.globalAlpha = 0.62;
        drawCardFace(ctx, slot.card, slot.x, slot.y, slot.w, slot.h);
        ctx.restore();
      } else {
        drawCardFace(ctx, slot.card, slot.x, slot.y, slot.w, slot.h);
      }
    }
    if (state.screen === 'play' && state.phase === 'await') {
      ctx.fillStyle = '#f3e2b8';
      ctx.font = 'bold 12px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(slot.index + 1), slot.x + slot.w / 2, slot.y + slot.h + 16);
    }
  }

  // Hint line.
  if (state.screen === 'play' && state.phase === 'await') {
    ctx.fillStyle = '#cbb98a';
    ctx.font = '15px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('Click a card or press 1–7, then Enter to play · H help · M mute', W / 2, 792);
  }

  // Damage floaters.
  for (const f of state.floaters) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - f.t / 1.4);
    ctx.fillStyle = f.color;
    ctx.font = 'bold 34px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(f.text, f.x, f.y - f.t * 60);
    ctx.restore();
  }

  if (state.screen === 'title') drawTitle(ctx, state, now);
  if (state.screen === 'win' || state.screen === 'loss') drawEndScreen(ctx, state, now);
  if (state.help) drawHelp(ctx);

  // Confetti on a win — drawn last so it still falls over the solid
  // opaque end-screen backdrop instead of being buried under it.
  for (const c of state.confetti) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - c.t / 4);
    ctx.fillStyle = c.color;
    ctx.fillRect(c.x, c.y, c.size, c.size * 0.6);
    ctx.restore();
  }
  ctx.restore();
}
