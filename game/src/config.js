// Warung Kilat — every tuning number, colour and layout rect in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };

export const STEP = 1 / 60;

/** A day lasts this long; each new day the kitchen gets faster. */
export const DAY_SECONDS = 45;
export const MAX_DAY = 8;

/** Missed / expired orders allowed before the warung closes. */
export const MAX_MISSES = 3;

/** Order timers: day 1 starts here, each day shaves this much, down to the floor. */
export const ORDER_TIME = { start: 48, perDay: 3, min: 26 };
/** Gap between a served/expired order and the next ticket appearing. */
export const ORDER_SPAWN_DELAY = 1.2;
/** Orders on the board: day 1 has 2, day 2+ has 3. */
export const ORDERS = { dayOne: 2, later: 3 };

/** Wrong-ingredient penalty: coins lost and the plate locks briefly. */
export const WRONG = { coins: 5, lockSeconds: 0.5 };
/** Serve within this many seconds of the ticket appearing for the fast bonus. */
export const FAST_SERVE_SECONDS = 18;
export const FAST_BONUS = 10;
/** Combo: each consecutive serve without a miss adds this many coins, up to this many steps. */
export const COMBO_PER_STEP = 5;
export const COMBO_MAX_STEPS = 10;

/** One ingredient: id, label, key, colour and the emoji-free glyph drawn on its bin. */
export const INGREDIENTS = [
  { id: 'rice', name: 'Nasi', key: '1', color: '#fff3d6', accent: '#d9a441', glyph: '🍚' },
  { id: 'noodle', name: 'Mie', key: '2', color: '#ffd66e', accent: '#c98a12', glyph: '🍜' },
  { id: 'egg', name: 'Telur', key: '3', color: '#ffe9a8', accent: '#e0a800', glyph: '🥚' },
  { id: 'chicken', name: 'Ayam', key: '4', color: '#e8a06a', accent: '#a8542a', glyph: '🍗' },
  { id: 'chili', name: 'Cabai', key: '5', color: '#e5484d', accent: '#8f1d22', glyph: '🌶️' },
  { id: 'shallot', name: 'Bawang', key: '6', color: '#cdb4db', accent: '#7b5ea7', glyph: '🧅' },
  { id: 'skewer', name: 'Sate', key: '7', color: '#b08954', accent: '#6b4423', glyph: '🍢' },
  { id: 'tea', name: 'Teh', key: '8', color: '#c98f4e', accent: '#7a4a1d', glyph: '🍵' },
  { id: 'sugar', name: 'Gula', key: '9', color: '#ffffff', accent: '#9aa0a6', glyph: '🧊' },
];

export const ING_BY_ID = Object.fromEntries(INGREDIENTS.map((ing) => [ing.id, ing]));

/** Recipes: name, the exact ingredient sequence, base coins, colour, day it unlocks. */
export const RECIPES = [
  { id: 'nasi-goreng', name: 'Nasi Goreng', needs: ['rice', 'egg', 'chili', 'shallot'], coins: 30, color: '#ff9f1c', day: 1 },
  { id: 'mie-goreng', name: 'Mie Goreng', needs: ['noodle', 'egg', 'chicken', 'chili'], coins: 32, color: '#f4b942', day: 1 },
  { id: 'sate-ayam', name: 'Sate Ayam', needs: ['skewer', 'chicken', 'chili'], coins: 26, color: '#c97b2d', day: 1 },
  { id: 'es-teh', name: 'Es Teh Manis', needs: ['tea', 'sugar'], coins: 14, color: '#a9713f', day: 1 },
  { id: 'ayam-goreng', name: 'Ayam Goreng', needs: ['chicken', 'shallot', 'chili', 'egg'], coins: 34, color: '#d97b4f', day: 2 },
];

export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map((r) => [r.id, r]));

/** Layout rects in logical pixels, shared by renderer and input hit-testing. */
export const LAYOUT = {
  topBar: { x: 0, y: 0, w: 1280, h: 64 },
  orderBoard: { x: 16, y: 76, w: 1248, h: 132 },
  pan: { x: 390, y: 232, w: 500, h: 210 },
  serve: { x: 940, y: 262, w: 300, h: 72 },
  trash: { x: 940, y: 348, w: 300, h: 56 },
  bins: { x: 16, y: 470, w: 1248, h: 150 },
  hint: { x: 16, y: 632, w: 1248, h: 72 },
};

export const PALETTE = {
  wall: '#f7ead7',
  wallStripe: '#f2dcc0',
  floor: '#8a5a33',
  counter: '#b4703a',
  counterTop: '#e0a458',
  panel: '#fff8ec',
  panelEdge: '#d9a441',
  text: '#3a2415',
  muted: '#8a6d4b',
  good: '#2e9e5b',
  bad: '#d64545',
  gold: '#f2c94c',
  ticket: '#fffdf5',
  ticketEdge: '#c9a227',
  pan: '#3d3d3d',
  panInner: '#232323',
  plate: '#ffffff',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const BEST_KEY = 'warung-kilat.best';
