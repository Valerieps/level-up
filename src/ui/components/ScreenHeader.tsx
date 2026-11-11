import type { ReactNode } from 'react';
import { strings } from '../../domain/strings';
import { Link } from '../router';
import { Icon } from './Icon';

/**
 * A screen's title, with "Voltar" to the screen above it when it is not a tab, and room for the
 * screen's own icon buttons (such as the gear in Perfil).
 */
export function ScreenHeader({ title, back, actions }: { title: string; back?: string; actions?: ReactNode }) {
  return (
    <header className="screen-header">
      {back && (
        <Link to={back} className="icon-button" aria-label={strings.nav.back}>
          <Icon name="back" />
        </Link>
      )}
      <h1 className="grow">{title}</h1>
      {actions}
    </header>
  );
}
