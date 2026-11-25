// Warung Kilat — keyboard and mouse input, translated into game actions.
// Mouse clicks are mapped from canvas pixels into the 1280x720 logical field;
// keys 1-9 pick ingredients, Enter serves, Backspace clears the plate.
import { FIELD, INGREDIENTS } from './config.js';
import { binRect, serveRect, trashRect } from './render.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_SERVE = 4;
export const ACTION_TRASH = 8;

function inside(rect, x, y) {
  return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}

export function createInput(canvas, onIngredient) {
  let actions = 0;
  let click = null; // { x, y } in logical pixels, consumed by the loop.

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / FIELD.width, rect.height / FIELD.height);
    const ox = (rect.width - FIELD.width * scale) / 2;
    const oy = (rect.height - FIELD.height * scale) / 2;
    return {
      x: (event.clientX - rect.left - ox) / scale,
      y: (event.clientY - rect.top - oy) / scale,
    };
  }

  function onPointer(event) {
    click = toLogical(event);
    actions |= ACTION_CONFIRM;
  }

  function onKey(event) {
    const key = event.key;
    if (key >= '1' && key <= '9') {
      const ing = INGREDIENTS[Number(key) - 1];
      if (ing) onIngredient(ing.id);
      event.preventDefault();
      return;
    }
    if (key === 'Enter') { actions |= ACTION_SERVE | ACTION_CONFIRM; event.preventDefault(); }
    else if (key === 'Backspace') { actions |= ACTION_TRASH; event.preventDefault(); }
    else if (key === ' ' || key === 'Spacebar') { actions |= ACTION_CONFIRM; event.preventDefault(); }
    else if (key === 'p' || key === 'P' || key === 'Escape') { actions |= ACTION_PAUSE; }
  }

  canvas.addEventListener('pointerdown', onPointer);
  window.addEventListener('keydown', onKey);

  /** Drain queued actions; also resolves the last click into an action. */
  function takeActions(state) {
    const out = actions;
    actions = 0;
    if (click) {
      const { x, y } = click;
      click = null;
      for (let i = 0; i < INGREDIENTS.length; i += 1) {
        if (inside(binRect(i), x, y)) { onIngredient(INGREDIENTS[i].id); return out; }
      }
      if (inside(serveRect(), x, y)) return out | ACTION_SERVE;
      if (inside(trashRect(), x, y)) return out | ACTION_TRASH;
    }
    return out;
  }

  return { takeActions };
}
