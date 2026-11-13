// Helpers for the feedback layer's animations (docs/spec/telas-e-feedback.md "Feedback"). The
// durations live in tokens.css; CSS plays the animations, and these read the tokens where script
// has to wait for or time one (the gold counting up after its coin lands).
import { useEffect, useRef, useState } from 'react';
import { seconds } from './feedback';

/** Whether the device asks for less motion: then nothing flies and numbers change at once. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** A duration token in milliseconds; 0 where it is missing or unreadable. */
export function tokenMs(name: string): number {
  if (typeof document === 'undefined') return 0;
  const value = seconds(getComputedStyle(document.documentElement).getPropertyValue(name)) * 1000;
  return Number.isFinite(value) ? value : 0;
}

/** How much of a daily goal's ring is closed: 3 of 8 is 3/8, never past a full turn. */
export function ringFraction(count: number, goal: number): number {
  if (!(goal > 0) || !(count > 0)) return 0;
  return Math.min(1, count / goal);
}

/** Whether the XP bar glows: fewer than 10% of the level's XP left, and the level not yet complete. */
export function nearNextLevel(inLevel: number, forNext: number): boolean {
  return forNext > 0 && inLevel < forNext && (forNext - inLevel) / forNext < 0.1;
}

/** The value `from` to `to` at `progress` (0 to 1), whole numbers. */
export function tween(from: number, to: number, progress: number): number {
  return Math.round(from + (to - from) * Math.min(1, Math.max(0, progress)));
}

/**
 * A number that counts up to `target` after the coin lands, when `earning`; any other change (a
 * load, a lower number) shows at once. With reduced motion it never counts.
 */
export function useCountUp(target: number, earning: boolean): number {
  const [shown, setShown] = useState(target);
  const current = useRef(target);
  const earningNow = useRef(earning);
  earningNow.current = earning;

  useEffect(() => {
    const from = current.current;
    if (target === from) return undefined;
    if (target < from || !earningNow.current || prefersReducedMotion()) {
      current.current = target;
      setShown(target);
      return undefined;
    }
    const duration = tokenMs('--duration-level-roll');
    let frame = 0;
    let began = 0;
    const step = (now: number) => {
      began ||= now;
      const progress = duration > 0 ? (now - began) / duration : 1;
      current.current = tween(from, target, progress);
      setShown(current.current);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    const timer = window.setTimeout(() => {
      frame = requestAnimationFrame(step);
    }, tokenMs('--duration-coin-flight'));
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [target]);

  return shown;
}
