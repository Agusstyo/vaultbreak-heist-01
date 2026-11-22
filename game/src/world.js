// Vaultbreak's rules and state, with no drawing and no browser in it: the thief,
// the guards and their patrols, the cameras, the alarm, the tools, the loot and
// the getaway. step() advances one fixed step and returns what happened as bit
// flags, so the caller can react (sounds, screens) without the world knowing
// about them. Nothing here allocates after createWorld returns.
import {
  ALARM,
  CAMERA_DEFS,
  COVER,
  FIELD,
  GETAWAY,
  GUARD_DEFS,
  LOOT_DEFS,
  PLAYER,
  PLAYER_START,
  SHADOWS,
  TOOLS,
  VISION,
  WALLS,
} from './config.js';

export const EVENT_LOOT = 1;
export const EVENT_DIAMOND = 2;
export const EVENT_SPOTTED = 4;
export const EVENT_ALARM = 8;
export const EVENT_CAUGHT = 16;
export const EVENT_WIN = 32;
export const EVENT_STANDDOWN = 64;
export const EVENT_EMP = 128;
export const EVENT_TOSS = 256;
export const EVENT_DISGUISE = 512;

const TWO_PI = Math.PI * 2;

/** Smallest signed angle from a to b, in (-PI, PI]. */
export function angleDifference(a, b) {
  let diff = (b - a) % TWO_PI;
  if (diff <= -Math.PI) diff += TWO_PI;
  if (diff > Math.PI) diff -= TWO_PI;
  return diff;
}

/** Move `current` toward `target` by at most `maxStep` radians. */
function turnToward(current, target, maxStep) {
  const diff = angleDifference(current, target);
  if (Math.abs(diff) <= maxStep) return target;
  return current + Math.sign(diff) * maxStep;
}

function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

/** True when the circle at (x, y) with radius r overlaps the rectangle. */
function circleHitsRect(x, y, r, rect) {
  const closestX = Math.max(rect.x, Math.min(x, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(y, rect.y + rect.h));
  const dx = x - closestX;
  const dy = y - closestY;
  return dx * dx + dy * dy < r * r;
}

/**
 * True when the segment (x1,y1)-(x2,y2) touches the rectangle: Liang-Barsky
 * clipping. Walls and cover block sight exactly the way they block movement.
 */
function segmentHitsRect(x1, y1, x2, y2, rect) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let t0 = 0;
  let t1 = 1;
  const edges = [
    [-dx, x1 - rect.x],
    [dx, rect.x + rect.w - x1],
    [-dy, y1 - rect.y],
    [dy, rect.y + rect.h - y1],
  ];
  for (let i = 0; i < edges.length; i += 1) {
    const [p, q] = edges[i];
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const t = q / p;
      if (p < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
    }
  }
  return true;
}

/** Every solid rectangle: walls plus cover. */
const SOLIDS = [...WALLS, ...COVER];

/** True when nothing solid stands between the two points. */
export function hasLineOfSight(x1, y1, x2, y2) {
  for (let i = 0; i < SOLIDS.length; i += 1) {
    if (segmentHitsRect(x1, y1, x2, y2, SOLIDS[i])) return false;
  }
  return true;
}

/** True when the point is inside a shadow patch (harder to spot there). */
export function inShadow(x, y) {
  for (let i = 0; i < SHADOWS.length; i += 1) {
    if (pointInRect(x, y, SHADOWS[i])) return true;
  }
  return false;
}

/** True when the circle at (x, y) with radius r overlaps any solid. */
function overlapsAny(x, y, r) {
  for (let i = 0; i < SOLIDS.length; i += 1) {
    if (circleHitsRect(x, y, r, SOLIDS[i])) return true;
  }
  return false;
}

/**
 * Move the circle at `body` by (dx, dy), one axis at a time, so it slides
 * along walls; when both axes are blocked (a corner) it steps in and the
 * push-out below slides it around the corner instead of jamming it there.
 * Returns true if it moved at all.
 */
function moveCircle(body, dx, dy) {
  const startX = body.x;
  const startY = body.y;
  if (dx !== 0 && !overlapsAny(body.x + dx, body.y, body.radius)) body.x += dx;
  if (dy !== 0 && !overlapsAny(body.x, body.y + dy, body.radius)) body.y += dy;
  if (body.x === startX && body.y === startY && (dx !== 0 || dy !== 0)) {
    body.x = startX + dx;
    body.y = startY + dy;
  }
  body.x = Math.max(body.radius + 1, Math.min(FIELD.width - body.radius - 1, body.x));
  body.y = Math.max(body.radius + 1, Math.min(FIELD.height - body.radius - 1, body.y));
  resolvePenetration(body);
  return body.x !== startX || body.y !== startY;
}

/** Push the circle out of any solid it overlaps, along the shortest way out. */
function resolvePenetration(body) {
  for (let i = 0; i < SOLIDS.length; i += 1) {
    const rect = SOLIDS[i];
    const closestX = Math.max(rect.x, Math.min(body.x, rect.x + rect.w));
    const closestY = Math.max(rect.y, Math.min(body.y, rect.y + rect.h));
    const ox = body.x - closestX;
    const oy = body.y - closestY;
    const distanceSq = ox * ox + oy * oy;
    if (distanceSq >= body.radius * body.radius) continue;
    if (distanceSq === 0) {
      // The centre is inside the rectangle: leave along the nearest face.
      const left = body.x - rect.x;
      const right = rect.x + rect.w - body.x;
      const top = body.y - rect.y;
      const bottom = rect.y + rect.h - body.y;
      const nearest = Math.min(left, right, top, bottom);
      if (nearest === left) body.x = rect.x - body.radius;
      else if (nearest === right) body.x = rect.x + rect.w + body.radius;
      else if (nearest === top) body.y = rect.y - body.radius;
      else body.y = rect.y + rect.h + body.radius;
      continue;
    }
    const distance = Math.sqrt(distanceSq);
    const push = (body.radius - distance) / distance;
    body.x += ox * push;
    body.y += oy * push;
  }
}

export function createWorld(random) {
  const player = {
    x: PLAYER_START.x,
    y: PLAYER_START.y,
    radius: PLAYER.radius,
    angle: -Math.PI / 2,
    sneaking: false,
    disguised: false,
    disguiseTimer: 0,
    disguiseCooldown: 0,
  };

  const guards = GUARD_DEFS.map((def) => ({
    name: def.name,
    color: def.color,
    speed: def.speed,
    waypoints: def.waypoints,
    x: def.waypoints[0].x,
    y: def.waypoints[0].y,
    radius: 14,
    angle: 0,
    waypointIndex: 1,
    pauseTimer: 0,
    pauseElapsed: 0,
    suspicion: 0,
    mode: 'patrol',
    lastSeenX: 0,
    lastSeenY: 0,
    unseenTimer: 0,
    investigateTimer: 0,
    lureX: 0,
    lureY: 0,
    seesPlayer: false,
  }));

  const cameras = CAMERA_DEFS.map((def) => ({
    x: def.x,
    y: def.y,
    baseAngle: def.baseAngle,
    sweep: def.sweep,
    sweepSpeed: def.sweepSpeed,
    range: def.range,
    angle: def.baseAngle,
    phase: random.next() * TWO_PI,
    disabledTimer: 0,
    seesPlayer: false,
  }));

  const loot = LOOT_DEFS.map((def) => ({
    kind: def.kind,
    name: def.name,
    x: def.x,
    y: def.y,
    value: def.value,
    main: Boolean(def.main),
    taken: false,
  }));

  const state = {
    player,
    guards,
    cameras,
    loot,
    alarm: 0,
    alarmActive: false,
    alarmTimer: 0,
    unseenTimer: 0,
    coins: TOOLS.coins,
    emp: TOOLS.emp,
    score: 0,
    lootValue: 0,
    elapsed: 0,
    timeBonus: 0,
    caughtBy: null,
    won: false,
    diamondTaken: false,
    lure: null,
    lureTimer: 0,
  };

  function reset() {
    player.x = PLAYER_START.x;
    player.y = PLAYER_START.y;
    player.angle = -Math.PI / 2;
    player.sneaking = false;
    player.disguised = false;
    player.disguiseTimer = 0;
    player.disguiseCooldown = 0;
    for (let i = 0; i < guards.length; i += 1) {
      const guard = guards[i];
      guard.x = guard.waypoints[0].x;
      guard.y = guard.waypoints[0].y;
      guard.angle = 0;
      guard.waypointIndex = 1;
      guard.pauseTimer = 0;
      guard.pauseElapsed = 0;
      guard.suspicion = 0;
      guard.mode = 'patrol';
      guard.unseenTimer = 0;
      guard.investigateTimer = 0;
      guard.seesPlayer = false;
    }
    for (let i = 0; i < cameras.length; i += 1) {
      cameras[i].angle = cameras[i].baseAngle;
      cameras[i].disabledTimer = 0;
      cameras[i].seesPlayer = false;
    }
    for (let i = 0; i < loot.length; i += 1) loot[i].taken = false;
    state.alarm = 0;
    state.alarmActive = false;
    state.alarmTimer = 0;
    state.unseenTimer = 0;
    state.coins = TOOLS.coins;
    state.emp = TOOLS.emp;
    state.score = 0;
    state.lootValue = 0;
    state.elapsed = 0;
    state.timeBonus = 0;
    state.caughtBy = null;
    state.won = false;
    state.diamondTaken = false;
    state.lure = null;
    state.lureTimer = 0;
  }

  /** Distance from a watcher to the thief, and whether the thief is in its cone. */
  function watchDistance(watcher, range, halfAngle) {
    const dx = player.x - watcher.x;
    const dy = player.y - watcher.y;
    const distance = Math.hypot(dx, dy);
    if (distance > range) return -1;
    if (distance < 26) return distance;
    const toPlayer = Math.atan2(dy, dx);
    if (Math.abs(angleDifference(watcher.angle, toPlayer)) > halfAngle) return -1;
    return distance;
  }

  /** Closer is scarier: suspicion and alarm rise faster up close. */
  function proximityFactor(distance) {
    if (distance < 100) return 1.7;
    if (distance < 165) return 1.2;
    return 1;
  }

  /** One guard's patrol, chase and investigate movement for a step. */
  function stepGuard(guard, dt) {
    if (guard.mode === 'patrol') {
      const target = guard.waypoints[guard.waypointIndex];
      if (guard.pauseTimer > 0) {
        guard.pauseTimer -= dt;
        guard.pauseElapsed += dt;
        const next = guard.waypoints[guard.waypointIndex];
        const base = Math.atan2(next.y - guard.y, next.x - guard.x);
        guard.angle = base + Math.sin(guard.pauseElapsed * 1.3) * 0.55;
        if (guard.pauseTimer <= 0) guard.pauseElapsed = 0;
        return;
      }
      const dx = target.x - guard.x;
      const dy = target.y - guard.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 6) {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
        guard.pauseTimer = 1.4;
        guard.pauseElapsed = 0;
        return;
      }
      const stepLength = Math.min(distance, guard.speed * dt);
      const nx = guard.x + (dx / distance) * stepLength;
      const ny = guard.y + (dy / distance) * stepLength;
      guard.angle = turnToward(guard.angle, Math.atan2(dy, dx), 6 * dt);
      moveCircle(guard, nx - guard.x, ny - guard.y);
      return;
    }
    // Chase or investigate: walk toward a point, then look around. A guard
    // that cannot reach its lure (a wall stands in the way) gives up when its
    // timer runs out instead of pushing at the wall forever.
    const tx = guard.mode === 'chase' ? guard.lastSeenX : guard.lureX;
    const ty = guard.mode === 'chase' ? guard.lastSeenY : guard.lureY;
    const dx = tx - guard.x;
    const dy = ty - guard.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 10) {
      const speed = guard.mode === 'chase' ? guard.speed * 1.55 : guard.speed * 1.1;
      const stepLength = Math.min(distance, speed * dt);
      guard.angle = turnToward(guard.angle, Math.atan2(dy, dx), 7 * dt);
      moveCircle(guard, (dx / distance) * stepLength, (dy / distance) * stepLength);
      if (guard.mode === 'investigate') {
        guard.investigateTimer -= dt;
        if (guard.investigateTimer <= 0) {
          guard.mode = 'patrol';
          guard.suspicion = 15;
        }
      }
      return;
    }
    if (guard.mode === 'chase') {
      // At the last seen spot with nothing in sight: scan the room for the thief.
      guard.angle += dt * 1.4;
    }
    if (guard.mode === 'investigate') {
      guard.investigateTimer -= dt;
      guard.angle += dt * 1.6;
      if (guard.investigateTimer <= 0) {
        guard.mode = 'patrol';
        guard.suspicion = 15;
      }
    }
  }

  /** One guard's eyes for a step: returns true when it sees the thief. */
  function guardSeesPlayer(guard, dt, events) {
    const distance = watchDistance(guard, VISION.guardRange, VISION.guardHalfAngle);
    const seen = distance >= 0 && hasLineOfSight(guard.x, guard.y, player.x, player.y);
    guard.seesPlayer = seen;
    if (!seen) {
      guard.suspicion = Math.max(0, guard.suspicion - ALARM.suspicionDecay * dt);
      if (guard.mode === 'chase') {
        guard.unseenTimer += dt;
        if (guard.unseenTimer >= 3) {
          guard.mode = 'patrol';
          guard.suspicion = 35;
          guard.unseenTimer = 0;
        }
      }
      return { seen, events };
    }
    guard.unseenTimer = 0;
    guard.lastSeenX = player.x;
    guard.lastSeenY = player.y;
    if (guard.mode === 'patrol') {
      let rate = ALARM.guardSeeRate * proximityFactor(distance);
      if (player.sneaking) rate *= 0.55;
      if (inShadow(player.x, player.y)) rate *= 0.4;
      if (player.disguised) rate *= 0.25;
      guard.suspicion = Math.min(100, guard.suspicion + rate * dt);
      if (guard.suspicion >= 100) {
        guard.mode = 'chase';
        state.alarm = Math.min(100, state.alarm + ALARM.guardSpottedBump);
        events |= EVENT_SPOTTED;
      }
    }
    return { seen, events };
  }

  /** One camera's sweep and eyes for a step. */
  function stepCamera(camera, dt, events) {
    camera.angle = camera.baseAngle + Math.sin(state.elapsed * camera.sweepSpeed + camera.phase) * camera.sweep;
    if (camera.disabledTimer > 0) {
      camera.disabledTimer -= dt;
      camera.seesPlayer = false;
      return events;
    }
    const distance = watchDistance(camera, camera.range, VISION.cameraHalfAngle);
    const seen = distance >= 0 && hasLineOfSight(camera.x, camera.y, player.x, player.y);
    camera.seesPlayer = seen;
    if (seen) {
      let rate = ALARM.cameraSeeRate * proximityFactor(distance);
      if (player.sneaking) rate *= 0.7;
      if (inShadow(player.x, player.y)) rate *= 0.5;
      state.alarm = Math.min(100, state.alarm + rate * dt);
    }
    return events;
  }

  /**
   * One fixed step. `dir` is the steering vector, `sneaking` the Shift state,
   * `tools` the one-shot tool requests for this step ({ toss: {x,y}|null,
   * emp: bool, disguise: bool }). With `harmless` set (the title screen's
   * backdrop) the patrols walk and the cameras sweep, but nobody watches the
   * thief and nothing scores. Returns the EVENT_* flags for this step.
   */
  function step(dt, dir, sneaking, tools, harmless) {
    let events = 0;
    state.elapsed += dt;
    player.sneaking = sneaking;
    if (player.disguiseTimer > 0) player.disguiseTimer -= dt;
    if (player.disguiseTimer <= 0) player.disguised = false;
    if (player.disguiseCooldown > 0) player.disguiseCooldown -= dt;
    if (state.lureTimer > 0) {
      state.lureTimer -= dt;
      if (state.lureTimer <= 0) state.lure = null;
    }

    const speed = sneaking ? PLAYER.walkSpeed * 0.54 : PLAYER.walkSpeed;
    if (dir.x !== 0 || dir.y !== 0) {
      player.angle = Math.atan2(dir.y, dir.x);
      moveCircle(player, dir.x * speed * dt, dir.y * speed * dt);
    }

    if (!harmless) {
      if (tools.toss && state.coins > 0) {
        const distance = Math.hypot(tools.toss.x - player.x, tools.toss.y - player.y);
        if (distance <= TOOLS.coinRange) {
          state.coins -= 1;
          state.lure = { x: tools.toss.x, y: tools.toss.y };
          state.lureTimer = 0.9;
          for (const guard of guards) {
            const lureDistance = Math.hypot(guard.x - tools.toss.x, guard.y - tools.toss.y);
            if (lureDistance <= TOOLS.coinLureRadius && guard.mode !== 'chase') {
              guard.mode = 'investigate';
              guard.lureX = tools.toss.x;
              guard.lureY = tools.toss.y;
              guard.investigateTimer = 3;
              guard.suspicion = Math.max(0, guard.suspicion - 40);
            }
          }
          events |= EVENT_TOSS;
        }
      }
      if (tools.emp && state.emp > 0) {
        state.emp -= 1;
        for (const camera of cameras) {
          if (Math.hypot(camera.x - player.x, camera.y - player.y) <= TOOLS.empRadius) {
            camera.disabledTimer = TOOLS.empSeconds;
          }
        }
        events |= EVENT_EMP;
      }
      if (tools.disguise && player.disguiseCooldown <= 0) {
        player.disguised = true;
        player.disguiseTimer = TOOLS.disguiseSeconds;
        player.disguiseCooldown = TOOLS.disguiseCooldown;
        events |= EVENT_DISGUISE;
      }
    }

    let anyoneSees = false;
    for (const guard of guards) {
      stepGuard(guard, dt);
      if (!harmless) {
        const result = guardSeesPlayer(guard, dt, events);
        events = result.events;
        anyoneSees = anyoneSees || result.seen;
      }
    }
    for (const camera of cameras) {
      if (harmless) {
        camera.angle = camera.baseAngle + Math.sin(state.elapsed * camera.sweepSpeed + camera.phase) * camera.sweep;
      } else {
        events = stepCamera(camera, dt, events);
        anyoneSees = anyoneSees || camera.seesPlayer;
      }
    }

    if (!harmless) {
      if (anyoneSees) {
        state.unseenTimer = 0;
      } else {
        state.unseenTimer += dt;
        state.alarm = Math.max(0, state.alarm - ALARM.decayPerSecond * dt);
      }

      if (state.alarm >= 100 && !state.alarmActive) {
        state.alarmActive = true;
        state.alarmTimer = ALARM.alarmSeconds;
        for (const guard of guards) {
          if (guard.mode === 'patrol') {
            guard.mode = 'chase';
            guard.lastSeenX = player.x;
            guard.lastSeenY = player.y;
            guard.unseenTimer = 0;
          }
        }
        events |= EVENT_ALARM;
      }
      if (state.alarmActive) {
        // The alarm only winds down while the thief is out of sight: standing
        // in a cone keeps the whole crew hunting.
        if (!anyoneSees) state.alarmTimer -= dt;
        if (state.unseenTimer >= ALARM.unseenToStandDown || state.alarmTimer <= 0) {
          state.alarmActive = false;
          state.alarm = 55;
          for (const guard of guards) {
            if (guard.mode === 'chase') {
              guard.mode = 'patrol';
              guard.suspicion = 35;
              guard.unseenTimer = 0;
            }
          }
          events |= EVENT_STANDDOWN;
        }
      }

      for (const item of loot) {
        if (item.taken) continue;
        if (Math.hypot(item.x - player.x, item.y - player.y) > 40) continue;
        item.taken = true;
        state.lootValue += item.value;
        state.score += item.value;
        events |= EVENT_LOOT;
        if (item.main) {
          state.diamondTaken = true;
          state.alarm = Math.min(100, state.alarm + 20);
          events |= EVENT_DIAMOND;
        }
      }

      for (const guard of guards) {
        if (Math.hypot(guard.x - player.x, guard.y - player.y) > PLAYER.caughtDistance) continue;
        state.caughtBy = state.alarmActive
          ? `Caught by ${guard.name} during the alarm`
          : guard.mode === 'chase'
            ? `Spotted by ${guard.name} — and caught`
            : `Walked straight into ${guard.name}`;
        events |= EVENT_CAUGHT;
        break;
      }

      if (state.caughtBy === null && state.diamondTaken && pointInRect(player.x, player.y, GETAWAY)) {
        state.won = true;
        state.timeBonus = Math.max(0, 2400 - Math.floor(state.elapsed) * 8);
        state.score += state.timeBonus;
        events |= EVENT_WIN;
      }
    }
    return events;
  }

  reset();
  return { state, reset, step };
}
