import { formatDayLong } from '../../domain/day';
import { strings } from '../../domain/strings';
import { ScreenHeader } from '../components/ScreenHeader';
import { useToday } from '../use-today';

// The Hoje tab (docs/spec/telas-e-feedback.md "Hoje"). For now only the member's day; the habits,
// the top bar with level and gold and the "+" join with their features (docs/ROADMAP.md).
export function Today() {
  const today = useToday();
  return (
    <section>
      <ScreenHeader title={strings.today.title} />
      <p className="muted">{formatDayLong(today)}</p>
      <p>{strings.today.empty}</p>
    </section>
  );
}
