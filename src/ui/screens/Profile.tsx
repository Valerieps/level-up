import type { MeView } from '../../application/api-contract';
import { strings } from '../../domain/strings';
import { Icon } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import { Link } from '../router';

// The Perfil tab (docs/spec/telas-e-feedback.md "Perfil"). Level, achievements, the overall
// heatmap and the archived habits join with their features (docs/ROADMAP.md).
export function Profile({ me }: { me: MeView }) {
  return (
    <section>
      <ScreenHeader
        title={strings.profile.title}
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
    </section>
  );
}
