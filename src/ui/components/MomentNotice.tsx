import { useEffect, useRef } from 'react';
import type { Moment } from '../../application/api-contract';
import { strings } from '../../domain/strings';
import { seconds } from '../feedback/feedback';
import { drawPhrase } from '../feedback/phrases';
import { navigate } from '../router';

const m = strings.moments;

/** One short moment as a line: its phrase is drawn once, when the moment arrives. */
export interface ShortLine {
  readonly key: string;
  readonly text: string;
  /** The reward in reach: the line opens the Loja. */
  readonly reward: string | null;
}

/**
 * The lines of the short moments (primeiro passo, recorde de streak, recompensa ao alcance), in
 * the order the server sent them. The dia fechado is not a line: Hoje collapses instead.
 */
export function shortLines(moments: readonly Moment[], draw: typeof drawPhrase = drawPhrase): ShortLine[] {
  return moments.flatMap((moment, i): ShortLine[] => {
    if (moment.kind === 'firstStep') return [{ key: `f${i}`, text: draw('firstStep', m.firstStep), reward: null }];
    if (moment.kind === 'streakRecord') {
      return [{ key: `s${i}`, text: draw('streakRecord', m.streakRecord)(moment.habitName, moment.streak), reward: null }];
    }
    if (moment.kind === 'rewardInReach') {
      return [{ key: `r${i}`, text: draw('rewardInReach', m.rewardInReach)(moment.rewardName), reward: moment.rewardName }];
    }
    return [];
  });
}

/** How long the notice stays, from the theme (the same as the level toast); null if unreadable. */
function toastMs(): number | null {
  const value = seconds(getComputedStyle(document.documentElement).getPropertyValue('--duration-toast'));
  return Number.isFinite(value) && value > 0 ? value * 1000 : null;
}

/**
 * The short notice at the top: one line per moment, gone by itself. A timer, not the animation's
 * end, closes it, so it stays readable under "reduzir movimento". The reward line opens the Loja.
 */
export function MomentNotice({ lines, onDone }: { lines: readonly ShortLine[]; onDone: () => void }) {
  // The timer runs from the arrival of the lines, whatever the screen re-renders meanwhile.
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const ms = toastMs();
    if (lines.length === 0 || ms === null) return;
    const timer = window.setTimeout(() => done.current(), ms);
    return () => window.clearTimeout(timer);
  }, [lines]);
  if (lines.length === 0) return null;
  return (
    <ul className="moment-notice" role="status" aria-label={m.label}>
      {lines.map((line) =>
        line.reward === null ? (
          <li key={line.key}>{line.text}</li>
        ) : (
          <li key={line.key}>
            <button
              type="button"
              className="moment-link"
              onClick={() => {
                onDone();
                navigate('/loja');
              }}
            >
              {line.text}
              <span className="visually-hidden">{m.openShop}</span>
            </button>
          </li>
        ),
      )}
    </ul>
  );
}
