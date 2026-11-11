import { useState } from 'react';
import type { MeView, TrackView } from '../../application/api-contract';
import { describeHabit } from '../../domain/habits/describe';
import { strings } from '../../domain/strings';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { Notice } from '../components/Notice';
import { XpBar } from '../components/ProgressTop';
import { ScreenHeader } from '../components/ScreenHeader';
import { Link } from '../router';
import { useQuery } from '../use-query';

const p = strings.profile;
const a = strings.achievements;

// The Perfil tab (docs/spec/telas-e-feedback.md "Perfil"): level and the XP to the next one, the
// conquista tracks side by side, and the archived habits. The overall heatmap (1d) joins with its
// feature.
export function Profile({ me }: { me: MeView }) {
  const progress = useQuery('progress', {}, ['progress']);
  const archived = useQuery('archivedHabits', {}, ['habits']);
  const achievements = useQuery('achievements', {}, ['achievements']);
  const [showArchived, setShowArchived] = useState(false);
  const count = archived.data?.length ?? 0;

  return (
    <section>
      <ScreenHeader
        title={p.title}
        actions={
          <Link to="/perfil/configuracoes" className="icon-button" aria-label={strings.nav.settings}>
            <Icon name="settings" />
          </Link>
        }
      />
      <div className="row">
        {me.photoUrl && <img className="avatar" src={me.photoUrl} alt="" referrerPolicy="no-referrer" />}
        <span className="strong">{me.name}</span>
      </div>

      {progress.data ? (
        <div className="card level-card">
          <div className="row tight">
            <span className="level-badge">{strings.progress.level(progress.data.level)}</span>
            <span className="grow" />
            <span className="gold-pill">
              <Icon name="coin" />
              <span className="mono" aria-hidden="true">
                {progress.data.gold}
              </span>
              <span className="visually-hidden">{strings.progress.gold(progress.data.gold)}</span>
            </span>
          </div>
          <XpBar inLevel={progress.data.xpInLevel} forNext={progress.data.xpForNext} />
          <p className="muted small">
            <span className="mono">{strings.progress.xp(progress.data.xpInLevel, progress.data.xpForNext)}</span> ·{' '}
            {strings.progress.missingFor(progress.data.xpForNext - progress.data.xpInLevel, progress.data.level + 1)}
          </p>
        </div>
      ) : progress.error ? (
        <Notice tone="error">{strings.genericError}</Notice>
      ) : (
        <p className="muted">{strings.loading}</p>
      )}

      <section className="section-title" aria-labelledby="achievements-title">
        <h2 id="achievements-title">{a.title}</h2>
        {achievements.data ? (
          <ul className="list track-grid">
            {achievements.data.map((track) => (
              <TrackCard key={track.track} track={track} />
            ))}
          </ul>
        ) : achievements.error ? (
          <>
            <Notice tone="error">{strings.genericError}</Notice>
            <Button variant="secondary" onClick={achievements.reload}>
              {strings.retry}
            </Button>
          </>
        ) : (
          <p className="muted">{strings.loading}</p>
        )}
      </section>

      <div className="section-title">
        <button
          type="button"
          className="card list-link disclosure"
          aria-expanded={showArchived}
          aria-controls="archived-list"
          onClick={() => setShowArchived((v) => !v)}
        >
          <span className="grow">{p.archived}</span>
          <span className="count-pill mono">{count}</span>
          <span className={showArchived ? 'chevron open' : 'chevron'}>
            <Icon name="chevron" />
          </span>
        </button>
        <div id="archived-list" hidden={!showArchived}>
          {archived.error && !archived.data && <Notice tone="error">{strings.genericError}</Notice>}
          {archived.data && count === 0 && <p className="muted small">{p.archivedEmpty}</p>}
          <ul className="list">
            {archived.data?.map((habit) => (
              <li key={habit.id}>
                <Link to={`/habito/${habit.id}`} className="card list-link column">
                  <span>{habit.name}</span>
                  <span className="muted small">{describeHabit(habit)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/**
 * One conquista track (docs/spec/conquistas.md): what it counts, the bar to the next milestone and
 * that milestone's prize, or "Trilha completa".
 */
function TrackCard({ track }: { track: TrackView }) {
  const automated = track.track === 'automated';
  const unit = a.unit[track.track];
  const next = track.next;
  return (
    <li className={automated ? 'card track automated' : 'card track courage'}>
      <span className="track-icon" aria-hidden="true">
        <Icon name={automated ? 'automated' : 'star'} />
      </span>
      <h3 className="muted small track-name">{a.track[track.track]}</h3>
      <p className="track-count">
        <span className="mono">{track.count}</span> <span className="muted small">{unit(track.count)}</span>
      </p>
      {next ? (
        <>
          <div
            className="track-bar"
            role="progressbar"
            aria-label={a.track[track.track]}
            aria-valuemin={0}
            aria-valuemax={next.target}
            aria-valuenow={Math.min(track.count, next.target)}
            aria-valuetext={a.progress(track.count, next.target)}
          >
            <div className="track-bar-fill" style={{ width: `${Math.min(100, Math.round((track.count / next.target) * 100))}%` }} />
          </div>
          <p className="muted small">
            {a.next(next.target, unit(next.target))} · <span className="track-gold mono">{a.nextGold(next.gold)}</span>
          </p>
        </>
      ) : (
        <p className="muted small">{a.complete}</p>
      )}
    </li>
  );
}
