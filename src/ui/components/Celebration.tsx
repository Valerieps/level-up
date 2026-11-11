import { useState } from 'react';
import type { Celebration } from '../../application/api-contract';
import { MILESTONES } from '../../domain/habits/achievements';
import { strings } from '../../domain/strings';
import { navigate } from '../router';
import { Button } from './Button';
import { Icon } from './Icon';
import { Sheet } from './Sheet';

const c = strings.celebration;

/** What one completion (or a closed review, or a star) reached, to celebrate in one go. */
export interface Moments {
  readonly levelUp: number | null;
  readonly celebrations: readonly Celebration[];
}

export interface CelebrationSummary {
  /** The badge: the milestone's target, or the selo Automatizado. */
  readonly badge: { readonly kind: 'achievement'; readonly target: number } | { readonly kind: 'mastered' };
  readonly kicker: string | null;
  readonly title: string;
  readonly text: string;
  /** Smallest first: the level, each patamar mastered, each conquista. */
  readonly lines: readonly { readonly key: string; readonly text: string; readonly gold: number | null; readonly strong: boolean }[];
  readonly gold: number;
  /** The action besides "Continuar": the habit to raise, or the conquistas. */
  readonly next: { readonly kind: 'regua'; readonly habitId: string } | { readonly kind: 'achievements' };
}

/** Two batches that arrive while one celebration is open become one (never screens in a row). */
export function mergeMoments(a: Moments | null, b: Moments): Moments {
  if (!a) return b;
  const levelUp = a.levelUp === null ? b.levelUp : b.levelUp === null ? a.levelUp : Math.max(a.levelUp, b.levelUp);
  return { levelUp, celebrations: [...a.celebrations, ...b.celebrations] };
}

/**
 * The stacked celebration (docs/spec/telas-e-feedback.md "Feedback"): the biggest moment leads,
 * the list shows every one from smallest to biggest, with the gold they paid. Null when there is
 * nothing beyond a level, which keeps its own short toast.
 */
export function summarize(moments: Moments, canRaise: (habitId: string) => boolean = () => true): CelebrationSummary | null {
  const { levelUp, celebrations } = moments;
  if (celebrations.length === 0) return null;
  const lines: CelebrationSummary['lines'][number][] = [];
  if (levelUp !== null) lines.push({ key: 'level', text: c.levelLine(levelUp), gold: null, strong: false });
  celebrations.forEach((item, i) => {
    if (item.kind === 'mastered') lines.push({ key: `m${i}`, text: c.masteredLine(item.habitName), gold: item.gold, strong: false });
    else lines.push({ key: `a${i}`, text: c.achievementLine[item.track](targetOf(item)), gold: item.gold, strong: true });
  });
  const gold = celebrations.reduce((sum, item) => sum + item.gold, 0);
  const achievements = celebrations.filter((item) => item.kind === 'achievement');
  const biggest = achievements[achievements.length - 1];
  const mastered = celebrations.find((item) => item.kind === 'mastered');
  const raisable = celebrations.find((item) => item.kind === 'mastered' && canRaise(item.habitId));

  if (biggest && biggest.kind === 'achievement') {
    const target = targetOf(biggest);
    return {
      badge: { kind: 'achievement', target },
      kicker: c.achievementKicker(strings.achievements.track[biggest.track], biggest.milestone),
      title: c.achievementTitle,
      text: c.achievementText[biggest.track](target),
      lines,
      gold,
      next: { kind: 'achievements' },
    };
  }
  if (!mastered || mastered.kind !== 'mastered') return null;
  return {
    badge: { kind: 'mastered' },
    kicker: null,
    title: c.masteredTitle,
    text: mastered.firstTime ? c.masteredText(mastered.habitName) : c.masteredAgainText(mastered.habitName),
    lines,
    gold,
    next: raisable && raisable.kind === 'mastered' ? { kind: 'regua', habitId: raisable.habitId } : { kind: 'achievements' },
  };
}

function targetOf(item: Extract<Celebration, { kind: 'achievement' }>): number {
  return MILESTONES[item.track][item.milestone - 1]?.target ?? item.milestone;
}

/**
 * The celebration a screen shows: `show` queues what a command returned; a level alone goes to
 * `onLevelOnly` (the short toast under the top), anything bigger to the stacked dialog.
 */
export function useCelebration(options: { onLevelOnly?: (level: number) => void; canRaise?: (habitId: string) => boolean } = {}) {
  const [moments, setMoments] = useState<Moments | null>(null);
  function show(next: Moments) {
    if (next.celebrations.length === 0) {
      if (next.levelUp !== null) options.onLevelOnly?.(next.levelUp);
      return;
    }
    setMoments((current) => mergeMoments(current, next));
  }
  const summary = moments ? summarize(moments, options.canRaise) : null;
  const element = <CelebrationDialog summary={summary} onClose={() => setMoments(null)} />;
  return { show, element };
}

function CelebrationDialog({ summary, onClose }: { summary: CelebrationSummary | null; onClose: () => void }) {
  const next = summary?.next;
  function goNext() {
    onClose();
    if (next?.kind === 'regua') navigate(`/habito/${next.habitId}?regua=subir`);
    else navigate('/perfil');
  }
  const badge = summary && (
    <div className="celebration-head">
      <span className={summary.badge.kind === 'achievement' ? 'celebration-badge milestone' : 'celebration-badge'} aria-hidden="true">
        {summary.badge.kind === 'achievement' ? <span className="mono">{summary.badge.target}</span> : <Icon name="automated" />}
      </span>
      {summary.kicker && <span className="celebration-kicker">{summary.kicker}</span>}
    </div>
  );
  return (
    <Sheet open={summary !== null} variant="celebration" title={summary?.title ?? ''} before={badge} onClose={onClose}>
      {summary && (
        <>
          <p className="celebration-text">{summary.text}</p>
          <ol className="celebration-lines" aria-label={c.moments}>
            {summary.lines.map((line) => (
              <li key={line.key} className={line.strong ? 'strong' : undefined}>
                <span className="grow">{line.text}</span>
                {line.gold !== null && (
                  <span className="celebration-gold mono">
                    <span aria-hidden="true">{c.gold(line.gold)}</span>
                    <span className="visually-hidden">{c.goldLabel(line.gold)}</span>
                  </span>
                )}
              </li>
            ))}
          </ol>
          <p className="celebration-total">
            <span>{c.goldTotal}</span>
            <span className="celebration-gold big mono">{c.gold(summary.gold)}</span>
          </p>
          <div className="stack">
            <Button className="wide" onClick={goNext}>
              {summary.next.kind === 'regua' ? c.seeRegua : c.seeAchievements}
            </Button>
            <Button variant="secondary" className="wide on-top" onClick={onClose}>
              {c.continue}
            </Button>
          </div>
        </>
      )}
    </Sheet>
  );
}
