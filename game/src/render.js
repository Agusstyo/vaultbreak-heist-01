// Drawing only: the world's state and the current screen in, pixels out. The
// 1280x720 playfield is scaled to fit the window and centred, the margin filled
// with the backdrop colour. Vision cones are raycast against the walls, so a
// cone stops dead at a wall instead of bleeding through it. Flat shapes and
// canvas text for the HUD and the panels.
import { COVER, FIELD, FONT, GETAWAY, PALETTE, SHADOWS, WALLS, ZONES } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_WIN = 'win';

const SOLIDS = [...WALLS, ...COVER];

/** Distance along the ray (x, y) + t*(cos, sin) before it hits a solid, or maxDist. */
function castRay(x, y, angle, maxDist) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let best = maxDist;
  for (let i = 0; i < SOLIDS.length; i += 1) {
    const rect = SOLIDS[i];
    let tMin = 0;
    let tMax = best;
    let hit = true;
    // X slab: the t values where the ray enters and leaves the rect's x span.
    if (Math.abs(dx) < 1e-9) {
      if (x < rect.x || x > rect.x + rect.w) hit = false;
    } else {
      let t1 = (rect.x - x) / dx;
      let t2 = (rect.x + rect.w - x) / dx;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      if (t1 > tMin) tMin = t1;
      if (t2 < tMax) tMax = t2;
      if (tMin > tMax) hit = false;
    }
    // Y slab, same idea.
    if (hit) {
      if (Math.abs(dy) < 1e-9) {
        if (y < rect.y || y > rect.y + rect.h) hit = false;
      } else {
        let t1 = (rect.y - y) / dy;
        let t2 = (rect.y + rect.h - y) / dy;
        if (t1 > t2) {
          const tmp = t1;
          t1 = t2;
          t2 = tmp;
        }
        if (t1 > tMin) tMin = t1;
        if (t2 < tMax) tMax = t2;
        if (tMin > tMax) hit = false;
      }
    }
    if (hit && tMin >= 0 && tMin < best) best = tMin;
  }
  return best;
}

/** Fill a vision cone from (x, y), raycast so walls cut it short. */
function drawCone(context, x, y, angle, halfAngle, range, color) {
  const rays = 22;
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(x, y);
  for (let i = 0; i <= rays; i += 1) {
    const a = angle - halfAngle + (2 * halfAngle * i) / rays;
    const distance = castRay(x, y, a, range);
    context.lineTo(x + Math.cos(a) * distance, y + Math.sin(a) * distance);
  }
  context.closePath();
  context.fill();
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align, baseline) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align ?? 'left';
    context.textBaseline = baseline ?? 'alphabetic';
    context.fillText(value, x, y);
  }

  function drawFloor() {
    context.fillStyle = PALETTE.floorLobby;
    context.fillRect(16, 16, 364, 688);
    context.fillStyle = PALETTE.floorGallery;
    context.fillRect(396, 16, 484, 688);
    context.fillStyle = PALETTE.floorVault;
    context.fillRect(896, 16, 368, 454);
    context.fillStyle = PALETTE.floorService;
    context.fillRect(896, 486, 368, 218);
    // Faint tile grid so the floor reads as a floor, not a flat wash.
    context.strokeStyle = PALETTE.floorLine;
    context.lineWidth = 1;
    context.globalAlpha = 0.35;
    context.beginPath();
    for (let x = 16; x <= 1264; x += 64) {
      context.moveTo(x, 16);
      context.lineTo(x, 704);
    }
    for (let y = 16; y <= 704; y += 64) {
      context.moveTo(16, y);
      context.lineTo(1264, y);
    }
    context.stroke();
    context.globalAlpha = 1;
    for (const zone of ZONES) {
      text(zone.text, zone.x, zone.y, 26, 'rgba(238,241,245,0.16)', 'center');
    }
    for (const shadow of SHADOWS) {
      context.fillStyle = PALETTE.shadow;
      context.globalAlpha = 0.55;
      context.fillRect(shadow.x, shadow.y, shadow.w, shadow.h);
    }
    context.globalAlpha = 1;
  }

  function drawWallsAndCover() {
    for (const wall of WALLS) {
      context.fillStyle = PALETTE.wall;
      context.fillRect(wall.x, wall.y, wall.w, wall.h);
      context.fillStyle = PALETTE.wallTop;
      context.fillRect(wall.x, wall.y, wall.w, Math.min(4, wall.h));
    }
    for (const cover of COVER) {
      if (cover.kind === 'case' || cover.kind === 'shelf') {
        context.fillStyle = PALETTE.cover;
        context.fillRect(cover.x, cover.y, cover.w, cover.h);
        context.fillStyle = PALETTE.caseGlass;
        context.globalAlpha = 0.5;
        context.fillRect(cover.x + 5, cover.y + 5, cover.w - 10, cover.h - 10);
        context.globalAlpha = 1;
      } else if (cover.kind === 'pedestal') {
        context.fillStyle = PALETTE.coverTop;
        context.fillRect(cover.x, cover.y, cover.w, cover.h);
        context.strokeStyle = PALETTE.gold;
        context.lineWidth = 2;
        context.strokeRect(cover.x + 3, cover.y + 3, cover.w - 6, cover.h - 6);
      } else if (cover.kind === 'pillar') {
        context.fillStyle = PALETTE.wall;
        context.beginPath();
        context.arc(cover.x + cover.w / 2, cover.y + cover.h / 2, cover.w / 2, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = PALETTE.wallTop;
        context.beginPath();
        context.arc(cover.x + cover.w / 2, cover.y + cover.h / 2, cover.w / 2 - 6, 0, Math.PI * 2);
        context.fill();
      } else {
        context.fillStyle = PALETTE.cover;
        context.fillRect(cover.x, cover.y, cover.w, cover.h);
        context.fillStyle = PALETTE.coverTop;
        context.fillRect(cover.x, cover.y, cover.w, 6);
        context.strokeStyle = 'rgba(0,0,0,0.35)';
        context.lineWidth = 1;
        context.strokeRect(cover.x + 0.5, cover.y + 0.5, cover.w - 1, cover.h - 1);
      }
    }
  }

  function drawGetaway(state) {
    const open = state.diamondTaken;
    const pulse = open ? 0.55 + 0.35 * Math.sin(state.elapsed * 4) : 1;
    context.globalAlpha = pulse;
    context.fillStyle = open ? PALETTE.exit : PALETTE.exitLocked;
    context.fillRect(GETAWAY.x, GETAWAY.y, GETAWAY.w, GETAWAY.h);
    context.globalAlpha = 1;
    context.strokeStyle = open ? '#a9f0c6' : PALETTE.muted;
    context.lineWidth = 3;
    context.strokeRect(GETAWAY.x + 2, GETAWAY.y + 2, GETAWAY.w - 4, GETAWAY.h - 4);
    text('GETAWAY', GETAWAY.x + GETAWAY.w / 2, GETAWAY.y + 32, 17, '#0d0f14', 'center');
    text(open ? 'GO! GO! GO!' : 'LOCKED', GETAWAY.x + GETAWAY.w / 2, GETAWAY.y + 56, 15, '#0d0f14', 'center');
  }

  function drawLoot(state) {
    for (const item of state.loot) {
      if (item.taken) continue;
      const bob = Math.sin(state.elapsed * 3 + item.x) * 2;
      if (item.kind === 'diamond') {
        context.save();
        context.shadowColor = PALETTE.diamond;
        context.shadowBlur = 22;
        context.fillStyle = PALETTE.diamond;
        context.beginPath();
        context.moveTo(item.x, item.y - 14 + bob);
        context.lineTo(item.x + 12, item.y + bob);
        context.lineTo(item.x, item.y + 12 + bob);
        context.lineTo(item.x - 12, item.y + bob);
        context.closePath();
        context.fill();
        context.restore();
        context.strokeStyle = '#ffffff';
        context.lineWidth = 1.5;
        context.beginPath();
        context.moveTo(item.x - 12, item.y + bob);
        context.lineTo(item.x + 12, item.y + bob);
        context.moveTo(item.x, item.y - 14 + bob);
        context.lineTo(item.x, item.y + 12 + bob);
        context.stroke();
        text('SUNBURST', item.x, item.y + 34 + bob, 13, PALETTE.diamond, 'center');
      } else if (item.kind === 'gold') {
        context.fillStyle = PALETTE.gold;
        context.beginPath();
        context.moveTo(item.x - 11, item.y + 7 + bob);
        context.lineTo(item.x - 7, item.y - 7 + bob);
        context.lineTo(item.x + 7, item.y - 7 + bob);
        context.lineTo(item.x + 11, item.y + 7 + bob);
        context.closePath();
        context.fill();
        context.strokeStyle = '#8a6d1f';
        context.lineWidth = 1;
        context.stroke();
      } else {
        context.fillStyle = '#7d5a8f';
        context.fillRect(item.x - 12, item.y - 15 + bob, 24, 30);
        context.strokeStyle = PALETTE.gold;
        context.lineWidth = 2;
        context.strokeRect(item.x - 12, item.y - 15 + bob, 24, 30);
        context.fillStyle = '#c9a86a';
        context.beginPath();
        context.arc(item.x, item.y + bob, 6, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  function drawCones(state) {
    for (const camera of state.cameras) {
      if (camera.disabledTimer > 0) continue;
      drawCone(
        context,
        camera.x,
        camera.y,
        camera.angle,
        0.44,
        camera.range,
        camera.seesPlayer ? 'rgba(255,69,58,0.34)' : 'rgba(255,120,90,0.16)',
      );
    }
    for (const guard of state.guards) {
      const alerted = guard.mode !== 'patrol';
      drawCone(
        context,
        guard.x,
        guard.y,
        guard.angle,
        0.61,
        235,
        alerted
          ? 'rgba(255,80,64,0.34)'
          : guard.suspicion > 25
            ? 'rgba(242,201,76,0.30)'
            : 'rgba(242,201,76,0.17)',
      );
    }
  }

  function drawGuards(state) {
    for (const guard of state.guards) {
      context.fillStyle = guard.mode === 'patrol' ? guard.color : '#ff3b2f';
      context.beginPath();
      context.arc(guard.x, guard.y, guard.radius, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = 'rgba(0,0,0,0.45)';
      context.lineWidth = 2;
      context.stroke();
      // Nose: which way the guard is looking.
      context.strokeStyle = '#ffffff';
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(guard.x, guard.y);
      context.lineTo(guard.x + Math.cos(guard.angle) * 18, guard.y + Math.sin(guard.angle) * 18);
      context.stroke();
      // Suspicion: a filling "?" over the head, "!" once the chase is on.
      if (guard.mode !== 'patrol') {
        text('!', guard.x, guard.y - 22, 26, '#ff5040', 'center');
      } else if (guard.suspicion > 5) {
        const width = 26;
        context.fillStyle = 'rgba(0,0,0,0.5)';
        context.fillRect(guard.x - width / 2, guard.y - 32, width, 5);
        context.fillStyle = PALETTE.gold;
        context.fillRect(guard.x - width / 2, guard.y - 32, (width * guard.suspicion) / 100, 5);
        text('?', guard.x, guard.y - 36, 15, PALETTE.gold, 'center');
      }
      text(guard.name.toUpperCase(), guard.x, guard.y + 30, 11, 'rgba(238,241,245,0.55)', 'center');
    }
  }

  function drawCameras(state) {
    for (const camera of state.cameras) {
      const off = camera.disabledTimer > 0;
      context.fillStyle = off ? PALETTE.cameraOff : PALETTE.camera;
      context.beginPath();
      context.arc(camera.x, camera.y, 8, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = off ? '#3a3f4a' : camera.seesPlayer ? '#ff453a' : '#ff5040';
      context.beginPath();
      context.arc(camera.x, camera.y, 3.5, 0, Math.PI * 2);
      context.fill();
      if (off) {
        text('OFFLINE', camera.x, camera.y + 22, 11, PALETTE.muted, 'center');
      }
    }
  }

  function drawPlayer(state) {
    const player = state.player;
    const radius = player.sneaking ? 11 : player.radius;
    if (player.disguised) {
      context.fillStyle = '#d8b13a';
      context.beginPath();
      context.arc(player.x, player.y, radius + 2, 0, Math.PI * 2);
      context.fill();
    }
    context.fillStyle = PALETTE.playerHood;
    context.beginPath();
    context.arc(player.x, player.y, radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.player;
    context.beginPath();
    context.arc(player.x, player.y, radius - 4, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#0d0f14';
    context.lineWidth = 2.5;
    context.beginPath();
    context.moveTo(player.x, player.y);
    context.lineTo(player.x + Math.cos(player.angle) * (radius + 5), player.y + Math.sin(player.angle) * (radius + 5));
    context.stroke();
    if (player.sneaking) {
      context.strokeStyle = 'rgba(238,241,245,0.5)';
      context.setLineDash([3, 4]);
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(player.x, player.y, radius + 6, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);
    }
  }

  function drawLure(state) {
    if (!state.lure) return;
    const progress = 1 - state.lureTimer / 0.9;
    context.strokeStyle = `rgba(242,201,76,${1 - progress})`;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(state.lure.x, state.lure.y, 6 + progress * 26, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = PALETTE.gold;
    context.beginPath();
    context.arc(state.lure.x, state.lure.y, 4, 0, Math.PI * 2);
    context.fill();
    text('clink!', state.lure.x, state.lure.y - 12, 13, PALETTE.gold, 'center');
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const rest = Math.floor(seconds % 60);
    return `${minutes}:${String(rest).padStart(2, '0')}`;
  }

  function drawHud(state) {
    // Top bar.
    context.fillStyle = 'rgba(13,15,20,0.82)';
    context.fillRect(0, 0, FIELD.width, 46);
    text(`LOOT  $${state.lootValue.toLocaleString('en-US')}`, 20, 30, 20, PALETTE.gold, 'left');
    if (state.diamondTaken) text('◆ DIAMOND SECURED', 210, 30, 16, PALETTE.diamond, 'left');
    // Alarm meter, centre.
    const meterX = FIELD.width / 2 - 160;
    const flashing = state.alarmActive && Math.floor(state.elapsed * 6) % 2 === 0;
    text(state.alarmActive ? '!! ALARM !!' : 'ALARM', FIELD.width / 2, 18, 15, flashing ? '#ffffff' : PALETTE.alarm, 'center');
    context.fillStyle = PALETTE.alarmTrack;
    context.fillRect(meterX, 24, 320, 12);
    context.fillStyle = state.alarmActive ? PALETTE.alarm : '#e07840';
    context.fillRect(meterX, 24, (320 * state.alarm) / 100, 12);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 1;
    context.strokeRect(meterX + 0.5, 24.5, 320, 12);
    // Tools and time, right.
    const disguise = state.player.disguised
      ? `DISGUISE ${Math.ceil(state.player.disguiseTimer)}s`
      : state.player.disguiseCooldown > 0
        ? `DISGUISE ${Math.ceil(state.player.disguiseCooldown)}s`
        : 'DISGUISE READY [3]';
    text(
      `◉ COINS ${state.coins}   ⚡ EMP ${state.emp} [2]   ${disguise}    ${formatTime(state.elapsed)}`,
      FIELD.width - 20,
      30,
      16,
      PALETTE.text,
      'right',
    );
    // Objective and controls, bottom.
    context.fillStyle = 'rgba(13,15,20,0.72)';
    context.fillRect(0, FIELD.height - 34, FIELD.width, 34);
    text(
      state.diamondTaken ? 'Get to the GETAWAY van — bottom left!' : 'Steal the SUNBURST DIAMOND in the vault — top right',
      20,
      FIELD.height - 11,
      16,
      state.diamondTaken ? PALETTE.exit : PALETTE.text,
      'left',
    );
    text(
      'WASD move · Shift sneak · Click: toss coin · 2: EMP · 3: disguise · P: pause · M: mute',
      FIELD.width - 20,
      FIELD.height - 11,
      14,
      PALETTE.muted,
      'right',
    );
  }

  function drawPanel(title, titleColor, lines, prompt) {
    const width = 640;
    const height = 150 + lines.length * 32 + 64;
    const x = (FIELD.width - width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(13,15,20,0.78)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, width, height);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(x + 1, y + 1, width - 2, height - 2);
    text(title, FIELD.width / 2, y + 74, 46, titleColor, 'center');
    for (let i = 0; i < lines.length; i += 1) {
      text(lines[i], FIELD.width / 2, y + 128 + i * 32, 20, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 30, 22, PALETTE.gold, 'center');
  }

  function drawField(state) {
    drawFloor();
    drawGetaway(state);
    drawLoot(state);
    drawCones(state);
    drawWallsAndCover();
    drawCameras(state);
    drawGuards(state);
    drawPlayer(state);
    drawLure(state);
  }

  /** Paint one frame: the floor, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawField(state);
    if (screen === SCREEN_TITLE) {
      drawPanel(
        'VAULTBREAK',
        PALETTE.gold,
        [
          'One thief. Three guards. One Sunburst Diamond.',
          'Read the cones before you move. Shadows hide you; cameras do not blink.',
          'Toss a coin to lure a guard, EMP a camera, or slip past in disguise —',
          'every tool costs something. Grab the diamond, then run for the van.',
          '',
          `Best getaway score: ${best.toLocaleString('en-US')}`,
        ],
        'Press Enter or click to start the heist',
      );
      return;
    }
    drawHud(state);
    if (screen === SCREEN_PAUSED) {
      drawPanel('PAUSED', PALETTE.text, ['The guards will wait for you.'], 'Press P to resume');
    } else if (screen === SCREEN_CAUGHT) {
      drawPanel('CAUGHT!', PALETTE.alarm, [state.caughtBy ?? 'The crew caught up with you.', 'The diamond stays in the vault. This time.'], 'Press Enter to try again');
    } else if (screen === SCREEN_WIN) {
      drawPanel(
        'CLEAN GETAWAY!',
        PALETTE.exit,
        [
          `Loot: $${state.lootValue.toLocaleString('en-US')}   ·   Time: ${formatTime(state.elapsed)}   ·   Time bonus: $${state.timeBonus.toLocaleString('en-US')}`,
          `Score: ${state.score.toLocaleString('en-US')}   ·   Best: ${Math.max(best, state.score).toLocaleString('en-US')}`,
          'The van pulls away as the alarm fades behind you.',
        ],
        'Press Enter to run it again',
      );
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
