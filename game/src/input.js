// Keyboard and pointer input. Held keys give a steering vector; one-shot presses
// (start, pause, tools) are queued as bit flags and taken once by the loop, so a
// press between two frames is never lost and never counted twice. Mouse clicks
// arrive as logical playfield points, for aiming the coin toss.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_EMP = 4;
export const ACTION_DISGUISE = 8;
export const ACTION_MUTE = 16;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const SNEAK = new Set(['ShiftLeft', 'ShiftRight']);

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let click = null;

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code) || DOWN.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code)) {
      held.add(event.code);
    } else if (SNEAK.has(event.code)) {
      held.add(event.code);
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (event.code === 'Digit2') {
      if (!event.repeat) actions |= ACTION_EMP;
    } else if (event.code === 'Digit3') {
      if (!event.repeat) actions |= ACTION_DISGUISE;
    } else if (event.code === 'KeyM') {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else {
      return;
    }
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    held.clear();
  });

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = 1280 / rect.width;
    const scaleY = 720 / rect.height;
    click = {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
    actions |= ACTION_CONFIRM;
  });

  function axis(negative, positive) {
    let value = 0;
    for (const code of negative) if (held.has(code)) value -= 1;
    for (const code of positive) if (held.has(code)) value += 1;
    return Math.max(-1, Math.min(1, value));
  }

  return {
    /** Steering vector {x, y}, each -1, 0 or 1, normalised on diagonals. */
    direction() {
      const x = axis(LEFT, RIGHT);
      const y = axis(UP, DOWN);
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.SQRT2;
        return { x: x * inv, y: y * inv };
      }
      return { x, y };
    },
    /** True while either Shift is held: slow, quiet, harder to spot. */
    sneaking() {
      for (const code of SNEAK) if (held.has(code)) return true;
      return false;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The last click point in logical coordinates, taken once. */
    takeClick() {
      const taken = click;
      click = null;
      return taken;
    },
  };
}
