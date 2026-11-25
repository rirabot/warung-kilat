// Warung Kilat — boot and the one loop: input is read every frame, the world
// advances in fixed 1/60 s steps (several in a slow frame, none in a fast one),
// and the renderer paints what is there. The game moves between four screens:
// title, play, paused and game over.
//
// ?seed=N fixes the ticket pattern. ?shot=start|play|end (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, FIELD, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_DAY, EVENT_EXPIRE, EVENT_OVER, EVENT_SERVE, EVENT_WRONG } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_SERVE, ACTION_TRASH, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { playBuzz, playDay, playDing, playPop, ensureAudio, startSizzle, stopSizzle } from './audio.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function fitCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = FIELD.width * dpr;
  canvas.height = FIELD.height * dpr;
}

function runShot(name) {
  fitCanvas();
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, performance.now());
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  fitCanvas();
  window.addEventListener('resize', fitCanvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    ensureAudio();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Bermain. Sajikan pesanan sebelum waktunya habis.');
  }

  function endGame() {
    stopSizzle();
    screen = SCREEN_OVER;
    if (world.state.coins > best) {
      best = world.state.coins;
      saveBest(best);
    }
    announce(`Warung tutup. Koin ${world.state.coins}. Rekor ${best}.`);
  }

  function onIngredient(id) {
    if (screen !== SCREEN_PLAY) return;
    ensureAudio();
    const before = world.state.plate.length;
    world.addIngredient(id);
    if (world.state.plate.length > before) {
      playPop();
      startSizzle();
    }
  }

  const input = createInput(canvas, onIngredient);

  function handleActions() {
    const actions = input.takeActions(world.state);
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      stopSizzle();
      announce('Jeda.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Bermain.');
    }
    if (screen !== SCREEN_PLAY) return;
    if (actions & ACTION_SERVE) {
      const served = world.serve();
      if (served) playDing();
    }
    if (actions & ACTION_TRASH) {
      world.clearPlate();
      stopSizzle();
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, true);
      return;
    }
    const events = world.step(STEP, false);
    if (events & EVENT_SERVE) playDing();
    if (events & EVENT_WRONG) playBuzz();
    if (events & EVENT_DAY) playDay();
    if (events & EVENT_EXPIRE) announce('Pesanan hangus!');
    if (world.state.plate.length === 0) stopSizzle();
    if (events & EVENT_OVER) endGame();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, now);
  }

  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
