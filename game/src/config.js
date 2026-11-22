// Vaultbreak — every tuning number, colour and floor-plan fact in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 13,
  walkSpeed: 178,
  sneakSpeed: 96,
  /** How close a guard must get to grab the thief. */
  caughtDistance: 25,
};

export const TOOLS = {
  coins: 3,
  coinRange: 430,
  coinLureRadius: 340,
  emp: 2,
  empRadius: 300,
  empSeconds: 8,
  disguiseSeconds: 6,
  disguiseCooldown: 25,
};

export const VISION = {
  guardRange: 235,
  guardHalfAngle: 0.61,
  cameraRange: 270,
  cameraHalfAngle: 0.44,
};

export const ALARM = {
  /** Suspicion per second while a guard watches the thief, before multipliers. */
  guardSeeRate: 60,
  /** Alarm per second while a camera watches the thief, before multipliers. */
  cameraSeeRate: 26,
  /** Alarm added the moment a guard's suspicion fills. */
  guardSpottedBump: 30,
  /** Alarm per second while nobody sees the thief. */
  decayPerSecond: 7,
  /** Suspicion per second while a guard cannot see the thief. */
  suspicionDecay: 30,
  /** Seconds of alarm before the crew stands down if the thief stays unseen. */
  alarmSeconds: 6,
  unseenToStandDown: 4,
};

export const PALETTE = {
  backdrop: '#0d0f14',
  floorLobby: '#23202a',
  floorGallery: '#262a33',
  floorVault: '#2c2a26',
  floorService: '#20262b',
  floorLine: '#343845',
  wall: '#3d4356',
  wallTop: '#565e75',
  shadow: '#101218',
  cover: '#4a4030',
  coverTop: '#6b5c40',
  caseGlass: '#7fa8c9',
  gold: '#f2c94c',
  diamond: '#8fe3ff',
  player: '#e8e4d8',
  playerHood: '#2c2f3a',
  guard: '#c94f43',
  guardAlert: '#ff3b2f',
  coneCalm: '#f2c94c',
  coneAlert: '#ff5040',
  camera: '#d8d8d8',
  cameraOff: '#5a5f6b',
  alarm: '#ff453a',
  alarmTrack: '#3a2024',
  text: '#eef1f5',
  muted: '#9aa1b0',
  panel: '#171a21',
  panelEdge: '#2e3442',
  exit: '#58d68d',
  exitLocked: '#8b93a3',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'vaultbreak.best';

// ---------------------------------------------------------------------------
// The floor plan. Walls and cover are axis-aligned rectangles; they block
// movement and line of sight. Gaps in the walls are the doors and the vent
// shaft that runs along the top of the whole floor.
// ---------------------------------------------------------------------------

/** Outer walls plus the two interior walls (lobby/gallery, gallery/vault). */
export const WALLS = [
  { x: 0, y: 0, w: 1280, h: 16 },
  { x: 0, y: 704, w: 1280, h: 16 },
  { x: 0, y: 0, w: 16, h: 720 },
  { x: 1264, y: 0, w: 16, h: 720 },
  // Lobby / gallery wall (x 380): vent gap y 16..100, door gap y 300..380.
  { x: 380, y: 100, w: 16, h: 200 },
  { x: 380, y: 380, w: 16, h: 324 },
  // Gallery / vault wall (x 880): vent gap y 16..100, vault door gap y 240..330.
  { x: 880, y: 100, w: 16, h: 140 },
  { x: 880, y: 330, w: 16, h: 374 },
  // Vault south wall (y 470): service door gap x 1080..1160.
  { x: 896, y: 470, w: 184, h: 16 },
  { x: 1160, y: 470, w: 104, h: 16 },
];

/** Crates, display cases, pillars and shelves: cover to hide behind. */
export const COVER = [
  { x: 110, y: 280, w: 90, h: 55, kind: 'crate' },
  { x: 210, y: 500, w: 70, h: 70, kind: 'crate' },
  { x: 330, y: 200, w: 44, h: 44, kind: 'pillar' },
  { x: 470, y: 140, w: 100, h: 54, kind: 'case' },
  { x: 430, y: 600, w: 100, h: 54, kind: 'case' },
  { x: 740, y: 170, w: 46, h: 46, kind: 'pillar' },
  { x: 500, y: 580, w: 120, h: 44, kind: 'crate' },
  { x: 760, y: 600, w: 80, h: 50, kind: 'case' },
  { x: 990, y: 120, w: 130, h: 42, kind: 'shelf' },
  { x: 1140, y: 300, w: 54, h: 96, kind: 'shelf' },
  { x: 1175, y: 80, w: 90, h: 64, kind: 'pedestal' },
  { x: 1000, y: 580, w: 90, h: 50, kind: 'crate' },
  { x: 1180, y: 640, w: 60, h: 44, kind: 'crate' },
];

/** Dark patches where the thief is harder to spot: the vent shaft and two corners. */
export const SHADOWS = [
  { x: 20, y: 20, w: 1244, h: 66 },
  { x: 420, y: 600, w: 220, h: 84 },
  { x: 960, y: 520, w: 180, h: 60 },
];

/** Floor labels painted on the ground, one per zone. */
export const ZONES = [
  { x: 198, y: 372, text: 'LOBBY' },
  { x: 638, y: 372, text: 'GALLERY' },
  { x: 1080, y: 300, text: 'VAULT' },
  { x: 1080, y: 620, text: 'SERVICE' },
];

/** The thief slips in here, beside the getaway door. */
export const PLAYER_START = { x: 80, y: 640 };

/** The getaway van door: locked until the Sunburst Diamond is taken. */
export const GETAWAY = { x: 24, y: 620, w: 110, h: 76 };

export const GUARD_DEFS = [
  {
    name: 'Rook',
    color: '#c94f43',
    speed: 62,
    waypoints: [
      { x: 450, y: 340 },
      { x: 640, y: 180 },
      { x: 830, y: 380 },
      { x: 700, y: 560 },
      { x: 450, y: 560 },
    ],
  },
  {
    name: 'Bishop',
    color: '#b06a2c',
    speed: 58,
    waypoints: [
      { x: 950, y: 210 },
      { x: 1210, y: 210 },
      { x: 1210, y: 430 },
      { x: 950, y: 430 },
    ],
  },
  {
    name: 'Knight',
    color: '#7a4a9e',
    speed: 55,
    waypoints: [
      { x: 80, y: 120 },
      { x: 300, y: 120 },
      { x: 300, y: 620 },
      { x: 80, y: 620 },
    ],
  },
];

export const CAMERA_DEFS = [
  { x: 640, y: 58, baseAngle: Math.PI / 2, sweep: 0.96, sweepSpeed: 0.55, range: 270 },
  { x: 1258, y: 200, baseAngle: Math.PI, sweep: 0.79, sweepSpeed: 0.45, range: 260 },
  { x: 1100, y: 668, baseAngle: -Math.PI / 2, sweep: 0.87, sweepSpeed: 0.5, range: 240 },
];

export const LOOT_DEFS = [
  { kind: 'diamond', name: 'Sunburst Diamond', x: 1220, y: 158, value: 5000, main: true },
  { kind: 'gold', name: 'Gold bar', x: 1055, y: 176, value: 500 },
  { kind: 'gold', name: 'Gold bar', x: 1210, y: 348, value: 500 },
  { kind: 'gold', name: 'Gold bar', x: 580, y: 668, value: 500 },
  { kind: 'painting', name: 'Painting', x: 440, y: 72, value: 300 },
  { kind: 'painting', name: 'Painting', x: 850, y: 660, value: 300 },
];
