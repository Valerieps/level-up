import { useState } from 'react';
import type { MeView } from '../../application/api-contract';
import { describeHabit } from '../../domain/habits/describe';
import { strings } from '../../domain/strings';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { Notice } from '../components/Notice';
import { GoldPill, XpBar } from '../components/ProgressTop';
import { ScreenHeader } from '../components/ScreenHeader';
import { Link } from '../router';
import { useQuery } from '../use-query';
import { PauseSheet } from './pause';

const p = strings.profile;
const pause = strings.pause;

// The Perfil tab (docs/spec/telas-e-feedback.md "Perfil"): level and the XP to the next one, and
// the archived habits. Achievements (1c) and the overall heatmap (1d) join with their features.
export function Profile({ me }: { me: MeView }) {
  const progress = useQuery('progress', {}, ['progress']);
  const archived = useQuery('archivedHabits', {}, ['habits']);
  const pauses = useQuery('pauses', {}, ['pauses', 'day']);
  const [pausing, setPausing] = useState(false);
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
            <GoldPill gold={progress.data.gold} />
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

      {pauses.data && !pauses.data.app && (
        <Button variant="secondary" onClick={() => setPausing(true)}>
          <Icon name="pause" />
          {pause.pause}
        </Button>
      )}
      <PauseSheet open={pausing} onClose={() => setPausing(false)} onPaused={pauses.reload} />

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
