// Synthesised sound: no audio files, every effect is a small WebAudio patch
// (oscillator + gain envelope). The context is created on the first user
// gesture, so a silent screenshot run never needs it.

export function createAudio() {
  let context = null;
  let muted = false;
  let hum = null;

  function ensure() {
    if (context !== null) return context;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  /** Start the context (call from a gesture) and the quiet room-tone hum. */
  function unlock() {
    const ctx = ensure();
    if (ctx === null) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    if (hum !== null) return;
    try {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 55;
      gain.gain.value = 0.018;
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start();
      hum = { oscillator, gain };
    } catch {
      hum = null;
    }
  }

  function tone(frequency, seconds, type, volume, slideTo) {
    if (muted) return;
    const ctx = ensure();
    if (ctx === null || ctx.state !== 'running') return;
    try {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, now + seconds);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(now);
      oscillator.stop(now + seconds + 0.02);
    } catch {
      // Sound is garnish: a failure here must never break the game.
    }
  }

  function twoTone(first, second, seconds, type, volume) {
    tone(first, seconds, type, volume);
    window.setTimeout(() => tone(second, seconds, type, volume), Math.round(seconds * 500));
  }

  return {
    unlock,
    setMuted(value) {
      muted = value;
      if (hum !== null) hum.gain.gain.value = value ? 0 : 0.018;
    },
    isMuted() {
      return muted;
    },
    /** A soft coin clink when loot is pocketed. */
    pickup() {
      twoTone(880, 1318, 0.09, 'sine', 0.12);
    },
    /** The bright chime of the Sunburst Diamond. */
    diamond() {
      tone(1046, 0.16, 'sine', 0.14);
      window.setTimeout(() => tone(1568, 0.22, 'sine', 0.12), 90);
      window.setTimeout(() => tone(2093, 0.3, 'sine', 0.1), 180);
    },
    /** A guard's suspicion filling: a short rising blip. */
    spotted() {
      tone(220, 0.18, 'square', 0.07, 440);
    },
    /** The alarm going off: two harsh tones. */
    alarm() {
      twoTone(392, 311, 0.22, 'sawtooth', 0.08);
    },
    /** The buzz of the EMP pulse. */
    emp() {
      tone(1200, 0.25, 'sawtooth', 0.08, 120);
    },
    /** A coin tossed across the floor. */
    toss() {
      tone(1500, 0.08, 'triangle', 0.1, 700);
    },
    /** The low sting of being caught. */
    caught() {
      tone(196, 0.5, 'sawtooth', 0.1, 98);
    },
    /** The getaway payoff: a small rising arpeggio. */
    win() {
      const notes = [523, 659, 784, 1046];
      notes.forEach((frequency, index) => {
        window.setTimeout(() => tone(frequency, 0.22, 'triangle', 0.12), index * 110);
      });
    },
  };
}
