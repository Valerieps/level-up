import { describe, expect, it } from 'vitest';
import { createFeedback, pattern, seconds, type AudioLike, type FeedbackEnv } from './feedback';

const TOKENS: Record<string, string> = {
  '--vibrate-light': ' 10',
  '--vibrate-medium': ' 20 50 30',
  '--vibrate-strong': ' 30 60 30 60 80',
  '--sound-wave': ' triangle',
  '--sound-pitch': ' 440',
  '--sound-volume': ' 0.1',
  '--sound-note': ' 100ms',
};

interface Note {
  type: string;
  frequency: number;
  start: number;
  stop: number;
  peak: number;
}

function fakeAudio(state = 'running') {
  const notes: Note[] = [];
  let resumed = 0;
  const audio: AudioLike = {
    currentTime: 2,
    destination: {},
    state,
    resume: () => {
      resumed++;
      return Promise.resolve();
    },
    createOscillator: () => {
      const note: Note = { type: '', frequency: 0, start: -1, stop: -1, peak: 0 };
      notes.push(note);
      return {
        set type(value: string) {
          note.type = value;
        },
        get type() {
          return note.type;
        },
        frequency: { setValueAtTime: (value: number) => void (note.frequency = value) },
        connect: () => undefined,
        start: (at: number) => void (note.start = at),
        stop: (at: number) => void (note.stop = at),
      };
    },
    createGain: () => ({
      gain: {
        setValueAtTime: () => undefined,
        linearRampToValueAtTime: (value: number) => {
          const note = notes[notes.length - 1];
          note.peak = Math.max(note.peak, value);
        },
      },
      connect: () => undefined,
    }),
  };
  return { audio, notes, resumed: () => resumed };
}

function setup(options: { tokens?: Record<string, string>; vibrate?: boolean; audio?: AudioLike | null } = {}) {
  const vibrations: number[][] = [];
  let audioCreated = 0;
  const env: FeedbackEnv = {
    readToken: (name) => ({ ...TOKENS, ...options.tokens })[name] ?? '',
    vibrate: options.vibrate === false ? undefined : (steps) => (vibrations.push(steps), true),
    createAudio: () => {
      audioCreated++;
      return options.audio === undefined ? null : options.audio;
    },
  };
  return { feedback: createFeedback(env), vibrations, audioCreated: () => audioCreated };
}

describe('feedback', () => {
  it('vibrates with the pattern of the theme, one per intensity, by default', () => {
    const { feedback, vibrations } = setup();
    feedback.play('light');
    feedback.play('medium');
    feedback.play('strong');
    expect(vibrations).toEqual([[10], [20, 50, 30], [30, 60, 30, 60, 80]]);
  });

  it('plays no sound by default, and creates no audio until a sound plays', () => {
    const { audio, notes } = fakeAudio();
    const { feedback, audioCreated } = setup({ audio });
    feedback.play('strong');
    expect(notes).toEqual([]);
    expect(audioCreated()).toBe(0);
  });

  it('obeys the switches', () => {
    const { audio, notes } = fakeAudio();
    const { feedback, vibrations } = setup({ audio });
    feedback.setSwitches({ vibration: false, sound: true });
    feedback.play('light');
    expect(vibrations).toEqual([]);
    expect(notes).toHaveLength(1);
  });

  it('synthesizes more rising notes for stronger intensities, from the theme timbre', () => {
    const { audio, notes } = fakeAudio();
    const { feedback, audioCreated } = setup({ audio });
    feedback.setSwitches({ vibration: true, sound: true });
    feedback.play('light');
    feedback.play('medium');
    feedback.play('strong');
    expect(notes.map((n) => n.frequency)).toEqual([440, 440, 550, 440, 550, 660, 880]);
    expect(notes.every((n) => n.type === 'triangle' && n.peak === 0.1)).toBe(true);
    // The medium pair: one note after the other, each the token's length.
    expect([notes[1].start, notes[1].stop, notes[2].start, notes[2].stop].map((t) => Number(t.toFixed(3)))).toEqual([2, 2.1, 2.1, 2.2]);
    expect(audioCreated()).toBe(1);
  });

  it('resumes a suspended audio context', () => {
    const fake = fakeAudio('suspended');
    const { feedback } = setup({ audio: fake.audio });
    feedback.setSwitches({ vibration: true, sound: true });
    feedback.play('light');
    expect(fake.resumed()).toBe(1);
  });

  it('skips what the device lacks', () => {
    const { feedback } = setup({ vibrate: false, audio: null });
    feedback.setSwitches({ vibration: true, sound: true });
    expect(() => feedback.play('strong')).not.toThrow();
    expect(feedback.canVibrate).toBe(false);
    expect(setup().feedback.canVibrate).toBe(true);
  });

  it('does nothing with unreadable tokens, and falls back to a sine for an unknown wave', () => {
    const fake = fakeAudio();
    const broken = setup({ audio: fake.audio, tokens: { '--vibrate-light': 'soft', '--sound-pitch': '' } });
    broken.feedback.setSwitches({ vibration: true, sound: true });
    broken.feedback.play('light');
    expect(broken.vibrations).toEqual([]);
    expect(fake.notes).toEqual([]);

    const odd = setup({ audio: fake.audio, tokens: { '--sound-wave': 'kazoo' } });
    odd.feedback.setSwitches({ vibration: false, sound: true });
    odd.feedback.play('light');
    expect(fake.notes.map((n) => n.type)).toEqual(['sine']);
  });

  it('never lets a throwing device break a tap', () => {
    const env: FeedbackEnv = {
      readToken: (name) => TOKENS[name] ?? '',
      vibrate: () => {
        throw new Error('blocked');
      },
      createAudio: () => {
        throw new Error('no audio');
      },
    };
    const feedback = createFeedback(env);
    feedback.setSwitches({ vibration: true, sound: true });
    expect(() => feedback.play('medium')).not.toThrow();
  });
});

describe('token parsing', () => {
  it('reads durations in ms or s', () => {
    expect(seconds(' 120ms')).toBe(0.12);
    expect(seconds('0.5s')).toBe(0.5);
    expect(seconds('fast')).toBeNaN();
  });

  it('reads vibration patterns', () => {
    expect(pattern(' 20 50 30 ')).toEqual([20, 50, 30]);
    expect(pattern('20, 50')).toEqual([20, 50]);
    expect(pattern('')).toEqual([]);
    expect(pattern('20 -5')).toEqual([]);
  });
});
