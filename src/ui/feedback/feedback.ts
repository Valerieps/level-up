// The feedback layer's vibration and sound (docs/spec/telas-e-feedback.md "Movimento, vibração e
// som"). Every number comes from the current theme's tokens (--vibrate-*, --sound-*), so each theme
// feels and sounds its own way; the member's switches decide whether anything happens. Sounds are
// synthesized with Web Audio: no audio files, no dependency, no network.

/** Leve, média, forte: which moments use which is in the spec. */
export type Intensity = 'light' | 'medium' | 'strong';

/** The member's switches, as the server keeps them. */
export interface FeedbackSwitches {
  readonly vibration: boolean;
  readonly sound: boolean;
}

/** Vibration on, sound off, until the member's stored switches arrive. */
export const DEFAULT_SWITCHES: FeedbackSwitches = { vibration: true, sound: false };

/** The parts of Web Audio the sounds use; tests pass a fake. */
export interface AudioLike {
  readonly currentTime: number;
  readonly destination: unknown;
  readonly state: string;
  resume(): Promise<void>;
  createOscillator(): {
    type: string;
    frequency: { setValueAtTime(value: number, at: number): void };
    connect(node: unknown): unknown;
    start(at: number): void;
    stop(at: number): void;
  };
  createGain(): {
    gain: {
      setValueAtTime(value: number, at: number): void;
      linearRampToValueAtTime(value: number, at: number): void;
    };
    connect(node: unknown): unknown;
  };
}

/** What feedback needs from the browser; `vibrate` is missing where the device cannot vibrate. */
export interface FeedbackEnv {
  readToken(name: string): string;
  readonly vibrate?: (pattern: number[]) => boolean;
  /** Creates the audio context, or null where Web Audio is missing. Called once, on the first sound. */
  createAudio(): AudioLike | null;
}

/** The notes of each intensity, as ratios of the base pitch: one, a rising pair, a rising chord. */
const NOTES: Record<Intensity, readonly number[]> = {
  light: [1],
  medium: [1, 5 / 4],
  strong: [1, 5 / 4, 3 / 2, 2],
};

const WAVES = ['sine', 'triangle', 'square', 'sawtooth'];

/** "120ms" or "0.12s" in seconds; NaN when unreadable. */
export function seconds(value: string): number {
  const match = /^(\d*\.?\d+)(ms|s)$/.exec(value.trim());
  if (!match) return Number.NaN;
  return Number(match[1]) / (match[2] === 'ms' ? 1000 : 1);
}

/** A vibration pattern token ("20 50 30") as numbers; empty when unreadable. */
export function pattern(value: string): number[] {
  const parts = value.trim().split(/[\s,]+/).filter(Boolean).map(Number);
  return parts.length > 0 && parts.every((n) => Number.isFinite(n) && n >= 0) ? parts : [];
}

export interface Feedback {
  /** Vibrates and plays the sound of `intensity`, as far as the switches and the device allow. */
  play(intensity: Intensity): void;
  setSwitches(switches: FeedbackSwitches): void;
  readonly canVibrate: boolean;
}

export function createFeedback(env: FeedbackEnv): Feedback {
  let switches = DEFAULT_SWITCHES;
  let audio: AudioLike | null | undefined;

  function vibrate(intensity: Intensity) {
    if (!switches.vibration || !env.vibrate) return;
    const steps = pattern(env.readToken(`--vibrate-${intensity}`));
    if (steps.length === 0) return;
    try {
      env.vibrate(steps);
    } catch {
      // Some browsers throw when vibration is blocked; feedback never breaks a tap.
    }
  }

  function sound(intensity: Intensity) {
    if (!switches.sound) return;
    const pitch = Number(env.readToken('--sound-pitch'));
    const volume = Number(env.readToken('--sound-volume'));
    const note = seconds(env.readToken('--sound-note'));
    const wave = env.readToken('--sound-wave').trim();
    if (!(pitch > 0) || !(volume > 0) || !(note > 0)) return;
    try {
      if (audio === undefined) audio = env.createAudio();
      const context = audio;
      if (!context) return;
      if (context.state === 'suspended') void context.resume().catch(() => undefined);
      const start = context.currentTime;
      NOTES[intensity].forEach((ratio, index) => {
        const at = start + index * note;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = WAVES.includes(wave) ? wave : 'sine';
        oscillator.frequency.setValueAtTime(pitch * ratio, at);
        // A short rise and fall, so no note clicks.
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(volume, at + note / 10);
        gain.gain.linearRampToValueAtTime(0, at + note);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(at);
        oscillator.stop(at + note);
      });
    } catch {
      // No sound is better than a broken tap.
    }
  }

  return {
    play(intensity) {
      vibrate(intensity);
      sound(intensity);
    },
    setSwitches(next) {
      switches = next;
    },
    canVibrate: typeof env.vibrate === 'function',
  };
}

function browserEnv(): FeedbackEnv {
  const nav = typeof navigator === 'undefined' ? undefined : navigator;
  return {
    readToken: (name) => getComputedStyle(document.documentElement).getPropertyValue(name),
    vibrate: typeof nav?.vibrate === 'function' ? (steps) => nav.vibrate(steps) : undefined,
    createAudio: () => {
      if (typeof window === 'undefined') return null;
      const Context = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      return Context ? (new Context() as unknown as AudioLike) : null;
    },
  };
}

let shared: Feedback | null = null;

function instance(): Feedback {
  shared ??= createFeedback(browserEnv());
  return shared;
}

/** Vibrates and sounds for something the member did (never for something left undone). */
export function feedback(intensity: Intensity): void {
  instance().play(intensity);
}

/** The member's stored switches; useFeedbackSync keeps them current. */
export function setFeedbackSwitches(switches: FeedbackSwitches): void {
  instance().setSwitches(switches);
}

/** Whether this device can vibrate at all (an iPhone's browser cannot): the switch hides if not. */
export function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}
