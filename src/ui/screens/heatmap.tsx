import { useMemo, useState } from 'react';
import type { DaySheetView, HabitHeatmapView, HeatmapMarker, OverallHeatmapView } from '../../application/api-contract';
import { formatDayLong, type Day } from '../../domain/day';
import { habitCellLevel } from '../../domain/habits/heatmap';
import { strings } from '../../domain/strings';
import { Button } from '../components/Button';
import { Heatmap, type HeatCell } from '../components/Heatmap';
import { Icon } from '../components/Icon';
import { Notice } from '../components/Notice';
import { Sheet } from '../components/Sheet';
import { useQuery } from '../use-query';

const h = strings.heatmap;

/** What can change a heatmap or a folha do dia: a completion, a régua change, a conquista, the day. */
const TOPICS = ['habits', 'progress', 'achievements', 'day'] as const;

function markerText(marker: HeatmapMarker): string {
  return marker === 'mastered' ? h.cell.mastered : h.cell.raised;
}

/** One habit's cells: tone by the part of the goal reached, a gold outline on a milestone day. */
export function habitCells(view: HabitHeatmapView): Map<Day, HeatCell> {
  const cells = new Map<Day, HeatCell>();
  for (const day of view.days) {
    const done = day.fraction >= 1 ? (day.minimum ? h.cell.minimum : h.cell.done) : day.fraction > 0 ? h.cell.partial(Math.round(day.fraction * 100)) : null;
    const text = [done, ...day.markers.map(markerText)].filter((part): part is string => part !== null).join(', ');
    cells.set(day.day, { level: habitCellLevel(day.fraction, day.minimum), marked: day.markers.length > 0, text: text || h.cell.empty });
  }
  return cells;
}

/** The Perfil's cells: tone by the fixed bands of completions. */
export function overallCells(view: OverallHeatmapView): Map<Day, HeatCell> {
  return new Map(view.days.map((day) => [day.day, { level: day.level, marked: false, text: h.cell.completions(day.completions) }]));
}

/** The heatmap section of the habit's detail (docs/spec/telas-e-feedback.md "Detalhe"). */
export function HabitHeatmapSection({ habitId }: { habitId: string }) {
  const heatmap = useQuery('habitHeatmap', { habitId }, TOPICS);
  const cells = useMemo(() => (heatmap.data ? habitCells(heatmap.data) : null), [heatmap.data]);
  const doneDays = heatmap.data?.days.filter((day) => day.fraction >= 1).length ?? 0;
  return (
    <HeatmapSection
      id={`heatmap-${habitId}`}
      range={heatmap.data}
      cells={cells}
      label={h.habitLabel(doneDays)}
      error={heatmap.error !== undefined}
      onRetry={heatmap.reload}
      showMarkerLegend
    />
  );
}

/** The overall heatmap of the Perfil. */
export function OverallHeatmapSection() {
  const heatmap = useQuery('heatmap', {}, TOPICS);
  const cells = useMemo(() => (heatmap.data ? overallCells(heatmap.data) : null), [heatmap.data]);
  return (
    <HeatmapSection
      id="heatmap-overall"
      range={heatmap.data}
      cells={cells}
      label={h.overallLabel(heatmap.data?.days.length ?? 0)}
      error={heatmap.error !== undefined}
      onRetry={heatmap.reload}
    />
  );
}

function HeatmapSection({
  id,
  range,
  cells,
  label,
  error,
  onRetry,
  showMarkerLegend = false,
}: {
  id: string;
  range: { from: Day; to: Day } | undefined;
  cells: Map<Day, HeatCell> | null;
  label: string;
  error: boolean;
  onRetry: () => void;
  showMarkerLegend?: boolean;
}) {
  const [day, setDay] = useState<Day | null>(null);
  const titleId = `${id}-title`;
  return (
    <section className="section-title" aria-labelledby={titleId}>
      <div className="section-head">
        <h2 id={titleId}>{h.title}</h2>
        <span className="muted small">{h.range}</span>
      </div>
      {range && cells ? (
        <Heatmap from={range.from} to={range.to} cells={cells} label={label} showMarkerLegend={showMarkerLegend} onSelect={setDay} />
      ) : error ? (
        <>
          <Notice tone="error">{strings.genericError}</Notice>
          <Button variant="secondary" onClick={onRetry}>
            {strings.retry}
          </Button>
        </>
      ) : (
        <p className="muted">{strings.loading}</p>
      )}
      <DaySheet day={day} onClose={() => setDay(null)} />
    </section>
  );
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * The folha do dia (docs/spec/heatmap.md "Dia"): the date, the milestones of the day, then what
 * was done, the versão mínima named and a goal reached only in part shown as "1 de 3".
 */
export function DaySheet({ day, onClose }: { day: Day | null; onClose: () => void }) {
  return (
    <Sheet open={day !== null} title={day ? capitalize(formatDayLong(day)) : ''} onClose={onClose}>
      {day && <DaySheetBody day={day} />}
      <Button variant="secondary" onClick={onClose}>
        {strings.close}
      </Button>
    </Sheet>
  );
}

function DaySheetBody({ day }: { day: Day }) {
  const sheet = useQuery('daySheet', { day }, TOPICS);
  if (!sheet.data) {
    if (sheet.error) return <Notice tone="error">{strings.genericError}</Notice>;
    return <p className="muted">{strings.loading}</p>;
  }
  return <DayContent view={sheet.data} />;
}

function DayContent({ view }: { view: DaySheetView }) {
  const milestones = view.markers.length + view.achievements.length;
  if (view.habits.length === 0 && milestones === 0) {
    return (
      <>
        <p>{h.day.empty}</p>
        <p className="muted small">{h.noPunishment}</p>
      </>
    );
  }
  return (
    <>
      {milestones > 0 && (
        <section aria-label={h.day.milestones}>
          <ul className="list stack-tight">
            {view.markers.map((marker) => (
              <li key={`${marker.habitId}-${marker.kind}`} className="card milestone row tight">
                <span className="milestone-icon" aria-hidden="true">
                  <Icon name={marker.kind === 'mastered' ? 'automated' : 'star'} />
                </span>
                <span className="grow">{marker.kind === 'mastered' ? h.day.mastered(marker.habitName) : h.day.raised(marker.habitName)}</span>
              </li>
            ))}
            {view.achievements.map((achievement) => (
              <li key={`${achievement.track}-${achievement.milestone}`} className="card milestone row tight">
                <span className="milestone-icon" aria-hidden="true">
                  <Icon name={achievement.track === 'automated' ? 'automated' : 'star'} />
                </span>
                <span className="grow">{h.day.achievement(strings.achievements.track[achievement.track], achievement.milestone)}</span>
                <span className="track-gold mono">{h.day.achievementGold(achievement.gold)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {view.habits.length > 0 && (
        <section aria-label={h.day.done}>
          <ul className="list day-list">
            {view.habits.map((habit) => (
              <li key={habit.habitId} className="day-item">
                <span className="day-item-name">
                  <span>{habit.habitName}</span>
                  {habit.minimum && <span className="muted small">{h.day.minimum}</span>}
                </span>
                {habit.dailyGoal > 1 && !habit.minimum && (
                  <span className={habit.done ? 'mono' : 'mono muted'}>
                    {habit.done ? h.day.goal(habit.count, habit.dailyGoal) : h.day.partial(habit.count, habit.dailyGoal)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
