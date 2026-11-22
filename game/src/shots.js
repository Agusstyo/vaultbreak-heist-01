// The screenshot scenes behind ?shot=cover|stealth|alarm|getaway. Each one resets
// the world and then places the thief, the guards and the cameras exactly where
// the moment needs them, so the frame is what a real game looks like mid-heist
// and the same scene always gives the same frame. The renderer paints the
// staged state with the same code as live play, so these are real renders.

import { SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

function placeGuard(state, index, x, y, angle, mode, suspicion) {
  const guard = state.guards[index];
  guard.x = x;
  guard.y = y;
  guard.angle = angle;
  guard.mode = mode;
  guard.suspicion = suspicion;
  guard.seesPlayer = mode !== 'patrol';
}

function placeCamera(state, index, angle, disabledSeconds) {
  const camera = state.cameras[index];
  camera.angle = angle;
  camera.disabledTimer = disabledSeconds;
  camera.seesPlayer = false;
}

function takeLoot(state, index) {
  const item = state.loot[index];
  item.taken = true;
  state.lootValue += item.value;
  state.score += item.value;
  if (item.main) state.diamondTaken = true;
}

/** The cover: the whole heist in one frame — room, cones, cameras, loot, alarm. */
function stageCover(world) {
  const state = world.state;
  state.elapsed = 47.3;
  state.alarm = 34;
  state.coins = 2;
  state.emp = 1;
  takeLoot(state, 3); // a gold bar already pocketed on the way in
  state.player.x = 560;
  state.player.y = 430;
  state.player.angle = Math.PI / 4;
  state.player.sneaking = true;
  placeGuard(state, 0, 660, 300, Math.PI * 0.75, 'patrol', 18);
  placeGuard(state, 1, 1090, 210, Math.PI, 'patrol', 0);
  placeGuard(state, 2, 210, 300, -Math.PI / 2, 'patrol', 0);
  placeCamera(state, 0, Math.PI / 2 + 0.5, 0);
  placeCamera(state, 1, Math.PI - 0.4, 0);
  placeCamera(state, 2, -Math.PI / 2, 0);
  return { screen: SCREEN_PLAY, best: 0 };
}

/** The stealth moment: flat in the shadows while Rook's cone sweeps past. */
function stageStealth(world) {
  const state = world.state;
  state.elapsed = 83.1;
  state.alarm = 18;
  state.coins = 3;
  state.emp = 2;
  takeLoot(state, 4); // the vent painting, lifted quietly
  state.player.x = 560;
  state.player.y = 640;
  state.player.angle = Math.PI / 2;
  state.player.sneaking = true;
  placeGuard(state, 0, 660, 500, Math.PI * 0.85, 'patrol', 62);
  placeGuard(state, 1, 1000, 150, 0, 'patrol', 0);
  placeGuard(state, 2, 150, 180, Math.PI / 2, 'patrol', 0);
  placeCamera(state, 0, Math.PI / 2 - 0.6, 0);
  placeCamera(state, 1, Math.PI + 0.3, 0);
  placeCamera(state, 2, -Math.PI / 2 + 0.5, 0);
  return { screen: SCREEN_PLAY, best: 0 };
}

/** The alarm: the diamond is taken, the meter is full, the crew is hunting. */
function stageAlarm(world) {
  const state = world.state;
  state.elapsed = 131.7;
  state.alarm = 100;
  state.alarmActive = true;
  state.alarmTimer = 4.2;
  state.coins = 1;
  state.emp = 0;
  takeLoot(state, 0); // the Sunburst Diamond
  takeLoot(state, 1);
  takeLoot(state, 2);
  state.player.x = 330;
  state.player.y = 340;
  state.player.angle = Math.PI;
  state.player.sneaking = false;
  placeGuard(state, 0, 470, 360, Math.PI, 'chase', 100);
  placeGuard(state, 1, 900, 300, Math.PI, 'chase', 100);
  placeGuard(state, 2, 300, 480, -Math.PI / 2, 'chase', 100);
  state.guards[0].seesPlayer = true;
  state.guards[1].seesPlayer = true;
  placeCamera(state, 0, Math.PI / 2 + 0.3, 0);
  placeCamera(state, 1, Math.PI, 6.5); // EMP'd moments ago — still offline
  placeCamera(state, 2, -Math.PI / 2, 0);
  return { screen: SCREEN_PLAY, best: 0 };
}

/** The getaway: the van pulls away, the take is counted. */
function stageGetaway(world) {
  const state = world.state;
  state.elapsed = 154;
  state.alarm = 55;
  state.coins = 1;
  state.emp = 1;
  takeLoot(state, 0);
  takeLoot(state, 1);
  takeLoot(state, 3);
  takeLoot(state, 4);
  state.timeBonus = 1168;
  state.score += state.timeBonus;
  state.won = true;
  state.player.x = 79;
  state.player.y = 658;
  state.player.angle = -Math.PI / 2;
  placeGuard(state, 0, 640, 200, 0, 'patrol', 0);
  placeGuard(state, 1, 1100, 250, Math.PI, 'patrol', 0);
  placeGuard(state, 2, 250, 300, Math.PI / 2, 'patrol', 0);
  placeCamera(state, 0, Math.PI / 2, 0);
  placeCamera(state, 1, Math.PI, 0);
  placeCamera(state, 2, -Math.PI / 2, 0);
  return { screen: SCREEN_WIN, best: 7468 };
}

/**
 * Set `world` to the named scene (cover, stealth, alarm, getaway; anything
 * else is the title screen) and return the screen to draw and the best score.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'stealth') return stageStealth(world);
  if (name === 'alarm') return stageAlarm(world);
  if (name === 'getaway') return stageGetaway(world);
  if (name === 'title') return { screen: SCREEN_TITLE, best: 7468 };
  return stageCover(world);
}
