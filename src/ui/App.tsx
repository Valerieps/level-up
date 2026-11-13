import { useEffect } from 'react';
import type { MeView } from '../application/api-contract';
import { canManageGroup } from '../domain/group/roles';
import { strings } from '../domain/strings';
import { useLiveStatus, useServices } from './backend-context';
import { Button } from './components/Button';
import { Notice } from './components/Notice';
import { TabBar, type Tab } from './components/TabBar';
import { navigate, usePath } from './router';
import { HabitDetail } from './screens/HabitDetail';
import { HabitEdit } from './screens/HabitEdit';
import { HabitNew } from './screens/HabitNew';
import { Invites } from './screens/Invites';
import { Members } from './screens/Members';
import { Profile } from './screens/Profile';
import { Settings } from './screens/Settings';
import { Shop } from './screens/Shop';
import { SignIn } from './screens/SignIn';
import { useFeedbackSync } from './feedback/use-feedback-sync';
import { useThemeSync } from './screens/theme-picker';
import { Today } from './screens/Today';
import { useQuery } from './use-query';
import { useTimeZoneSync } from './use-today';

/** The bottom tabs (docs/spec/telas-e-feedback.md "Navegação"): Hoje · Loja · Perfil. */
const TABS: readonly Tab[] = [
  { path: '/', label: strings.nav.today, icon: 'today' },
  { path: '/loja', label: strings.nav.shop, icon: 'shop' },
  { path: '/perfil', label: strings.nav.profile, icon: 'profile' },
];

export function App() {
  const { live } = useServices();
  const me = useQuery('me', {}, ['me']);
  const signedIn = me.data !== undefined && me.error !== 'unauthenticated';

  useEffect(() => {
    if (!signedIn) return;
    live.start();
    return () => live.stop();
  }, [live, signedIn]);

  if (me.loading && !me.data) return null;
  if (!me.data && me.error && me.error !== 'unauthenticated') {
    return (
      <main className="app">
        <Notice tone="error">{strings.genericError}</Notice>
        <Button onClick={me.reload}>{strings.retry}</Button>
      </main>
    );
  }
  if (!signedIn) return <SignIn />;
  return <SignedIn me={me.data} onSignedOut={me.reload} />;
}

function SignedIn({ me, onSignedOut }: { me: MeView; onSignedOut: () => void }) {
  const { backend } = useServices();
  const path = usePath();
  useTimeZoneSync();
  useThemeSync();
  useFeedbackSync();

  async function signOut() {
    await backend.signOut();
    navigate('/', { replace: true });
    onSignedOut();
  }

  return (
    <div className="app with-tab-bar">
      <OfflineNotice />
      <main>
        <Screen me={me} path={path} onSignOut={() => void signOut()} />
      </main>
      <TabBar tabs={TABS} path={tabPathOf(path)} />
    </div>
  );
}

function OfflineNotice() {
  const status = useLiveStatus();
  if (status !== 'offline') return null;
  return <Notice>{strings.offline}</Notice>;
}

/** Tab → screen → sheet at most (two levels from a tab). Unknown paths fall back to Hoje. */
function Screen({ me, path, onSignOut }: { me: MeView; path: string; onSignOut: () => void }) {
  if (path === '/loja') return <Shop />;
  if (path === '/perfil') return <Profile me={me} />;
  if (path === '/perfil/configuracoes') return <Settings me={me} onSignOut={onSignOut} />;
  if (path === '/perfil/configuracoes/membros' && canManageGroup(me)) return <Members me={me} />;
  if (path === '/perfil/configuracoes/convites' && canManageGroup(me)) return <Invites />;
  if (path === '/habito/novo') return <HabitNew />;
  const habit = /^\/habito\/([\w-]+)(\/editar)?$/.exec(path);
  if (habit) return habit[2] ? <HabitEdit key={habit[1]} habitId={habit[1]} /> : <HabitDetail key={habit[1]} habitId={habit[1]} />;
  return <Today />;
}

/** Habit screens open from Hoje, so the Hoje tab stays current on them. */
function tabPathOf(path: string): string {
  return path.startsWith('/habito/') ? '/' : path;
}
