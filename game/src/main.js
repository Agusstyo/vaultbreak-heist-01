// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between five screens: title, play,
// paused, caught and win.
//
// ?seed=N fixes the patrol timing. ?shot=cover|stealth|alarm|getaway|title
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  EVENT_ALARM,
  EVENT_CAUGHT,
  EVENT_DIAMOND,
  EVENT_DISGUISE,
  EVENT_EMP,
  EVENT_LOOT,
  EVENT_SPOTTED,
  EVENT_STANDDOWN,
  EVENT_TOSS,
  EVENT_WIN,
  createWorld,
} from './world.js';
import {
  ACTION_CONFIRM,
  ACTION_DISGUISE,
  ACTION_EMP,
  ACTION_MUTE,
  ACTION_PAUSE,
  createInput,
} from './input.js';
import { createAudio } from './audio.js';
import {
  SCREEN_CAUGHT,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_WIN,
  createRenderer,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

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

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and the big moments.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    // The press or click that started the game must not also fire a tool.
    pendingActions = 0;
    pendingClick = null;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce('Playing. Steal the Sunburst Diamond, then reach the getaway van.');
  }

  function endCaught() {
    screen = SCREEN_CAUGHT;
    audio.caught();
    announce(`${world.state.caughtBy}. Press Enter to try again.`);
  }

  function endWin() {
    screen = SCREEN_WIN;
    audio.win();
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Clean getaway. Score ${world.state.score}. Best ${best}.`);
  }

  /** Sounds and announcements for one step's events. */
  function handleEvents(events) {
    if (events & EVENT_LOOT) audio.pickup();
    if (events & EVENT_DIAMOND) {
      audio.diamond();
      announce('Diamond secured. Get to the getaway van!');
    }
    if (events & EVENT_SPOTTED) {
      audio.spotted();
      announce('A guard spotted you!');
    }
    if (events & EVENT_ALARM) {
      audio.alarm();
      announce('Alarm! Break line of sight to cool it down.');
    }
    if (events & EVENT_STANDDOWN) announce('The alarm cools down. The crew stands down.');
    if (events & EVENT_EMP) audio.emp();
    if (events & EVENT_TOSS) audio.toss();
    if (events & EVENT_CAUGHT) endCaught();
    else if (events & EVENT_WIN) endWin();
  }

  function handleActions(actions) {
    if (actions & ACTION_MUTE) audio.setMuted(!audio.isMuted());
    if (screen === SCREEN_TITLE || screen === SCREEN_CAUGHT || screen === SCREEN_WIN) {
      if (actions & ACTION_CONFIRM) startGame();
      return;
    }
    if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step(actions, click) {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { x: 0, y: 0 }, false, {}, true);
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const events = world.step(
      STEP,
      input.direction(),
      input.sneaking(),
      {
        toss: click,
        emp: Boolean(actions & ACTION_EMP),
        disguise: Boolean(actions & ACTION_DISGUISE),
      },
      false,
    );
    handleEvents(events);
  }

  // Presses and clicks wait here until a fixed step spends them: a frame with
  // no step to run must never swallow a toss, an EMP or a disguise.
  let pendingActions = 0;
  let pendingClick = null;

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    pendingActions |= input.takeActions();
    const freshClick = input.takeClick();
    if (freshClick !== null) pendingClick = freshClick;
    handleActions(pendingActions);
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step(pendingActions, pendingClick);
        pendingActions &= ~(ACTION_EMP | ACTION_DISGUISE);
        pendingClick = null;
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
      pendingActions = 0;
      pendingClick = null;
    }
    // One-shot screen actions are handled at once; tool presses wait for a step.
    pendingActions &= ACTION_EMP | ACTION_DISGUISE;
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting the patrols close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  // A hook for automated play-testing: the page's own state, read-only from outside.
  window.__vaultbreak = {
    get state() {
      return world.state;
    },
    get screen() {
      return screen;
    },
    start: startGame,
  };

  announce('Vaultbreak. Press Enter or click to start the heist.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
