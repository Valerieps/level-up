import { levelOf } from '../../domain/habits/progression';
import { strings } from '../../domain/strings';
import { Icon } from './Icon';

/**
 * The plum top of Hoje (docs/spec/telas-e-feedback.md "Hoje"): level, XP bar and the gold balance,
 * always in sight ("ouro vira prêmio real"). Sticks to the top while the list scrolls. A level up
 * shows as a short celebration under it that goes away by itself.
 */
export function ProgressTop({
  xpTotal,
  gold,
  celebration,
  onCelebrationEnd,
}: {
  xpTotal: number;
  gold: number;
  celebration: number | null;
  onCelebrationEnd: () => void;
}) {
  const { level, xpInLevel, xpForNext } = levelOf(xpTotal);
  return (
    <div className="progress-top">
      <div className="progress-top-row">
        <span className="level-badge">{strings.progress.level(level)}</span>
        <span className="grow" />
        <span className="gold-pill">
          <Icon name="coin" />
          <span className="mono" aria-hidden="true">
            {gold}
          </span>
          <span className="visually-hidden">{strings.progress.gold(gold)}</span>
        </span>
      </div>
      <XpBar inLevel={xpInLevel} forNext={xpForNext} onTop />
      <div className="progress-top-row small">
        <span className="mono">{strings.progress.xp(xpInLevel, xpForNext)}</span>
        <span className="top-muted">{strings.progress.missing(xpForNext - xpInLevel)}</span>
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

/** The XP bar; a real progressbar for screen readers. */
export function XpBar({ inLevel, forNext, onTop = false }: { inLevel: number; forNext: number; onTop?: boolean }) {
  const percent = forNext > 0 ? Math.min(100, Math.round((inLevel / forNext) * 100)) : 0;
  return (
    <div
      className={onTop ? 'xp-bar on-top' : 'xp-bar'}
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
