import { strings } from '../../domain/strings';
import { Link } from '../router';
import { Icon, type IconName } from './Icon';

export interface Tab {
  readonly path: string;
  readonly label: string;
  readonly icon: IconName;
}

/**
 * The bottom bar (docs/spec/telas-e-feedback.md "Navegação"): Hoje · Loja · Perfil, never more
 * than three in the MVP. Configurações lives in Perfil. A tab is current on its own path and on
 * every screen under it.
 */
export function TabBar({ tabs, path }: { tabs: readonly Tab[]; path: string }) {
  return (
    <nav className="tab-bar" aria-label={strings.nav.main}>
      {tabs.map((tab) => (
        <Link key={tab.path} to={tab.path} className="tab" aria-current={isCurrent(tab.path, path) ? 'page' : undefined}>
          <span className="tab-icon">
            <Icon name={tab.icon} />
          </span>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

export function isCurrent(tabPath: string, path: string): boolean {
  return tabPath === '/' ? path === '/' : path === tabPath || path.startsWith(`${tabPath}/`);
}
