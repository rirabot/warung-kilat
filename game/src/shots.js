// The screenshot scenes behind ?shot=start|play|end. Each one plays the real rules
// forward from a fresh world, steered by a simple autopilot that clicks the right
// ingredients in order and serves when a plate is complete, so the frame is what a
// real game looks like and the same seed always gives the same frame.
import { STEP } from './config.js';
import { EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 4;
const PLAY_SECONDS = 30;
const END_LIMIT_SECONDS = 600;

/** Add the next ingredient the first incomplete order needs, then serve if ready. */
function autopilot(world) {
  const { state } = world;
  const done = world.completedOrder();
  if (done) { world.serve(); return; }
  const next = world.nextNeeded();
  if (next) world.addIngredient(next);
}

function stepWorld(world, seconds, pilot) {
  let events = 0;
  // The autopilot acts at human pace — one click about every 0.45 s — so the
  // staged scenes show a realistic number of served dishes, not a machine-gun run.
  let sinceAction = 99;
  for (let i = 0; i < seconds / STEP; i += 1) {
    if (pilot) {
      sinceAction += STEP;
      if (sinceAction >= 0.45) { autopilot(world); sinceAction = 0; }
    }
    events |= world.step(STEP, false);
    if (events & EVENT_OVER) break;
  }
  return events;
}

/** Fill the order board back up to its full size (a serve leaves a gap until the spawn timer fires). */
function topUpBoard(world) {
  const target = world.state.day >= 2 ? 3 : 2;
  for (let i = 0; i < 10 && world.state.orders.length < target; i += 1) {
    world.state.spawnTimer = 0;
    world.step(STEP, false);
  }
}


export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    // Play well for a while, then stop mid-assembly: dishes served, the next
    // plate half built, timers running — the mid-play frame.
    stepWorld(world, PLAY_SECONDS, true);
    if (world.completedOrder()) world.serve();
    for (let i = 0; i < 2; i += 1) {
      const next = world.nextNeeded();
      if (!next || world.completedOrder()) break;
      world.addIngredient(next);
    }
    topUpBoard(world);
    return { screen: SCREEN_PLAY, best: world.state.coins };
  }
  if (name === 'serve') {
    // Play until a plate is exactly complete and ready to serve, then stop:
    // the green SAJIKAN button is lit and the finished plate sits in the wok.
    stepWorld(world, PLAY_SECONDS, true);
    for (let i = 0; i < 6 && !world.completedOrder(); i += 1) {
      const next = world.nextNeeded();
      if (!next) break;
      world.addIngredient(next);
    }
    topUpBoard(world);
    return { screen: SCREEN_PLAY, best: world.state.coins };
  }
  if (name === 'end') {
    // Serve a couple of dishes for a real score, then let tickets expire
    // until the third miss closes the warung.
    stepWorld(world, 12, true);
    for (const order of world.state.orders) order.timeLeft = 1.5;
    let events = 0;
    for (let i = 0; i < END_LIMIT_SECONDS / STEP; i += 1) {
      events |= world.step(STEP, false);
      if (events & EVENT_OVER) break;
      if (world.state.orders.length > 0 && world.state.misses < 3) {
        for (const order of world.state.orders) order.timeLeft = Math.min(order.timeLeft, 1.5);
      }
    }
    return { screen: SCREEN_OVER, best: world.state.coins };
  }
  // Any other name (start) is the title screen over a live kitchen.
  stepWorld(world, START_SECONDS, false);
  return { screen: SCREEN_TITLE, best: 0 };
}
