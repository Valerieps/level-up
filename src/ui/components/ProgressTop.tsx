import { useEffect, useRef, useState } from 'react';
import { levelOf } from '../../domain/habits/progression';
import { strings } from '../../domain/strings';
import { nearNextLevel, useCountUp } from '../feedback/motion';
import { Button } from './Button';
import { CoinIcon } from './Icon';
import { Sheet } from './Sheet';

/**
 * The plum top of Hoje (docs/spec/telas-e-feedback.md "Hoje"): level, XP bar and the gold balance,
 * always in sight ("ouro vira prêmio real"). Sticks to the top while the list scrolls. A level up
 * shows as a short celebration under it that goes away by itself, after the level number rolls to
 * the new one. `earning` says a completion is under way: only then the number rolls and the gold
 * counts up, never on a load.
 */
export function ProgressTop({
  xpTotal,
  gold,
  celebration,
  onCelebrationEnd,
  earning = false,
}: {
  xpTotal: number;
  gold: number;
  celebration: number | null;
  onCelebrationEnd: () => void;
  earning?: boolean;
}) {
  const { level, xpInLevel, xpForNext } = levelOf(xpTotal);
  return (
    <div className="progress-top">
      <div className="progress-top-row">
        <LevelBadge level={level} earning={earning} />
        <span className="grow" />
        <GoldPill gold={gold} earning={earning} />
      </div>
      <XpBar inLevel={xpInLevel} forNext={xpForNext} onTop />
      <div className="progress-top-row small">
        <span className="mono">{strings.progress.xp(xpInLevel, xpForNext)}</span>
      </div>
      {celebration !== null && (
        <p className="level-toast" role="status" onAnimationEnd={onCelebrationEnd}>
          <span className="level-toast-number mono" aria-hidden="true">
            {celebration}
          </span>
          {strings.progress.levelUp(celebration)}
        </p>
      )}
    </div>
  );
}

/** The level; when it goes up because of a completion, the number rolls to the new one. */
function LevelBadge({ level, earning }: { level: number; earning: boolean }) {
  const [rolls, setRolls] = useState(0);
  const previous = useRef(level);
  useEffect(() => {
    if (level > previous.current && earning) setRolls((count) => count + 1);
    previous.current = level;
  }, [level, earning]);
  return (
    <span className="level-badge">
      <span key={rolls} className={rolls > 0 ? 'level-roll' : undefined}>
        {strings.progress.level(level)}
      </span>
    </span>
  );
}

/** The gold balance; tapping it explains how gold is earned and spent. It counts up after a coin lands. */
export function GoldPill({ gold, earning = false }: { gold: number; earning?: boolean }) {
  const [open, setOpen] = useState(false);
  const shown = useCountUp(gold, earning);
  const t = strings.progress.goldInfo;
  return (
    <>
      <button type="button" className="gold-pill" data-gold-balance onClick={() => setOpen(true)}>
        <CoinIcon />
        <span className="mono" aria-hidden="true">
          {shown}
        </span>
        <span className="visually-hidden">{strings.progress.gold(gold)}</span>
      </button>
      <Sheet open={open} title={t.title} onClose={() => setOpen(false)}>
        <p>{t.earn}</p>
        <p className="muted">{t.keep}</p>
        <p>{t.spend}</p>
        <Button onClick={() => setOpen(false)}>{t.close}</Button>
      </Sheet>
    </>
  );
}

/** The XP bar; a real progressbar for screen readers. */
export function XpBar({ inLevel, forNext, onTop = false }: { inLevel: number; forNext: number; onTop?: boolean }) {
  const percent = forNext > 0 ? Math.min(100, Math.round((inLevel / forNext) * 100)) : 0;
  const classes = ['xp-bar', onTop && 'on-top', nearNextLevel(inLevel, forNext) && 'near'].filter(Boolean).join(' ');
  return (
    <div
      className={classes}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={forNext}
      aria-valuenow={inLevel}
      aria-valuetext={strings.progress.xp(inLevel, forNext)}
    >
      <div className="xp-bar-fill" style={{ width: `${percent}%` }} />
    </div>
  );
}
