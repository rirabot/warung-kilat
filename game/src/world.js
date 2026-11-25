// Warung Kilat — the game's rules and state, with no drawing and no browser in it:
// order tickets, the plate being assembled, serving, misses, combo, coins and days.
// step() advances one fixed step and returns what happened as bit flags, so the
// caller can react (sounds, announcements) without the world knowing about screens.
import {
  DAY_SECONDS, FAST_BONUS, FAST_SERVE_SECONDS, ING_BY_ID, MAX_DAY, MAX_MISSES,
  ORDER_SPAWN_DELAY, ORDER_TIME, ORDERS, RECIPES, RECIPE_BY_ID, WRONG,
  COMBO_PER_STEP, COMBO_MAX_STEPS,
} from './config.js';
import { pick } from './random.js';

export const EVENT_SERVE = 1;
export const EVENT_WRONG = 2;
export const EVENT_EXPIRE = 4;
export const EVENT_OVER = 8;
export const EVENT_DAY = 16;
export const EVENT_ADD = 32;

let nextOrderId = 1;

function orderTimeFor(day) {
  return Math.max(ORDER_TIME.min, ORDER_TIME.start - ORDER_TIME.perDay * (day - 1));
}

function unlockedRecipes(day) {
  return RECIPES.filter((r) => r.day <= day);
}

export function createWorld(random) {
  const state = {
    coins: 0,
    served: 0,
    misses: 0,
    combo: 0,
    bestCombo: 0,
    day: 1,
    elapsed: 0,
    dayElapsed: 0,
    orders: [],
    plate: [],
    spawnTimer: 0,
    lockTimer: 0,
    over: false,
    // Transient feedback the renderer reads: { kind: 'serve'|'wrong'|'expire', text, t }
    flash: null,
    lastServe: null,
  };

  function targetOrderCount() {
    return state.day >= 2 ? ORDERS.later : ORDERS.dayOne;
  }

  function spawnOrder() {
    const recipe = pick(random, unlockedRecipes(state.day));
    const order = {
      id: nextOrderId,
      recipeId: recipe.id,
      name: recipe.name,
      needs: [...recipe.needs],
      timeLeft: orderTimeFor(state.day),
      timeMax: orderTimeFor(state.day),
      age: 0,
    };
    nextOrderId += 1;
    state.orders.push(order);
    return order;
  }

  function reset() {
    state.coins = 0;
    state.served = 0;
    state.misses = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.day = 1;
    state.elapsed = 0;
    state.dayElapsed = 0;
    state.orders = [];
    state.plate = [];
    state.spawnTimer = 0;
    state.lockTimer = 0;
    state.over = false;
    state.flash = null;
    state.lastServe = null;
    nextOrderId = 1;
    while (state.orders.length < targetOrderCount()) spawnOrder();
  }

  /** The recipe the current plate is building toward, or null if it matches none. */
  function matchingRecipe() {
    for (const order of state.orders) {
      const recipe = RECIPE_BY_ID[order.recipeId];
      if (state.plate.length > recipe.needs.length) continue;
      let ok = true;
      for (let i = 0; i < state.plate.length; i += 1) {
        if (state.plate[i] !== recipe.needs[i]) { ok = false; break; }
      }
      if (ok) return recipe;
    }
    return null;
  }

  /** Is the plate exactly one order's full recipe? Returns that order or null. */
  function completedOrder() {
    for (const order of state.orders) {
      const recipe = RECIPE_BY_ID[order.recipeId];
      if (state.plate.length !== recipe.needs.length) continue;
      let ok = true;
      for (let i = 0; i < state.plate.length; i += 1) {
        if (state.plate[i] !== recipe.needs[i]) { ok = false; break; }
      }
      if (ok) return order;
    }
    return null;
  }

  /** The next ingredient the plate needs, for the first order it still matches. */
  function nextNeeded() {
    const recipe = matchingRecipe();
    if (!recipe) return null;
    return recipe.needs[state.plate.length] ?? null;
  }

  /** Add an ingredient to the plate. Returns an event flag. */
  function addIngredient(id) {
    if (state.over || state.lockTimer > 0 || !ING_BY_ID[id]) return 0;
    const trial = [...state.plate, id];
    const fits = state.orders.some((order) => {
      const needs = RECIPE_BY_ID[order.recipeId].needs;
      if (trial.length > needs.length) return false;
      for (let i = 0; i < trial.length; i += 1) {
        if (trial[i] !== needs[i]) return false;
      }
      return true;
    });
    if (!fits) {
      state.coins = Math.max(0, state.coins - WRONG.coins);
      state.lockTimer = WRONG.lockSeconds;
      state.combo = 0;
      state.flash = { kind: 'wrong', text: `Salah! -${WRONG.coins} koin`, t: 0.9 };
      return EVENT_WRONG;
    }
    state.plate = trial;
    state.flash = null;
    return EVENT_ADD;
  }

  function clearPlate() {
    state.plate = [];
  }

  /** Serve the completed plate to its order. Returns an event flag. */
  function serve() {
    if (state.over) return 0;
    const order = completedOrder();
    if (!order) return 0;
    const recipe = RECIPE_BY_ID[order.recipeId];
    const fast = order.age <= FAST_SERVE_SECONDS;
    const comboBonus = Math.min(state.combo, COMBO_MAX_STEPS) * COMBO_PER_STEP;
    const earned = recipe.coins + comboBonus + (fast ? FAST_BONUS : 0);
    state.coins += earned;
    state.served += 1;
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.lastServe = { name: recipe.name, earned, fast, combo: state.combo };
    state.flash = { kind: 'serve', text: `+${earned} koin — ${recipe.name}!`, t: 1.2 };
    state.orders = state.orders.filter((o) => o.id !== order.id);
    state.plate = [];
    state.spawnTimer = ORDER_SPAWN_DELAY;
    return EVENT_SERVE;
  }

  function step(dt, harmless) {
    let events = 0;
    if (state.over) return events;
    state.elapsed += dt;
    state.dayElapsed += dt;
    if (state.lockTimer > 0) state.lockTimer -= dt;
    if (state.flash) {
      state.flash.t -= dt;
      if (state.flash.t <= 0) state.flash = null;
    }
    const newDay = Math.min(MAX_DAY, 1 + Math.floor(state.elapsed / DAY_SECONDS));
    if (newDay !== state.day) {
      state.day = newDay;
      state.dayElapsed = 0;
      events |= EVENT_DAY;
    }
    // Spawn replacement tickets up to the board size.
    if (state.orders.length < targetOrderCount()) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        spawnOrder();
        state.spawnTimer = ORDER_SPAWN_DELAY;
      }
    }
    if (!harmless) {
      for (const order of state.orders) {
        order.timeLeft -= dt;
        order.age += dt;
      }
      const expired = state.orders.filter((o) => o.timeLeft <= 0);
      if (expired.length > 0) {
        state.orders = state.orders.filter((o) => o.timeLeft > 0);
        state.misses += expired.length;
        state.combo = 0;
        state.plate = [];
        state.spawnTimer = ORDER_SPAWN_DELAY;
        state.flash = { kind: 'expire', text: 'Pesanan hangus!', t: 1.2 };
        events |= EVENT_EXPIRE;
        if (state.misses >= MAX_MISSES) {
          state.over = true;
          events |= EVENT_OVER;
        }
      }
    }
    return events;
  }

  reset();
  return {
    state,
    reset,
    step,
    addIngredient,
    clearPlate,
    serve,
    matchingRecipe,
    completedOrder,
    nextNeeded,
    orderTimeFor,
  };
}
