import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { addDays, formatDayLong, type Day } from '../../domain/day';
import { heatmapMonths, heatmapWeeks, type OverallLevel } from '../../domain/habits/heatmap';
import { strings } from '../../domain/strings';

const h = strings.heatmap;

/** What one day's cell shows; a day missing from the map is the neutral cell. */
export interface HeatCell {
  readonly level: OverallLevel;
  /** A milestone that day (domínio or estrela): a gold outline. */
  readonly marked: boolean;
  /** What happened, read after the date: "feito", "3 conclusões". */
  readonly text: string;
}

const monthName = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', month: 'short' });

/**
 * A year of days, one column per week, Sunday on top (docs/spec/heatmap.md). Only what was done
 * has color: a day without a record, scheduled or not, paused or not, is the same neutral cell,
 * never red. It scrolls sideways inside itself, opening on the latest weeks.
 *
 * Every cell opens the folha do dia. One cell takes the Tab stop; the arrows move a day (up and
 * down) or a week (left and right), Home and End jump to the ends.
 */
export function Heatmap({
  from,
  to,
  cells,
  label,
  showMarkerLegend = false,
  onSelect,
}: {
  from: Day;
  to: Day;
  cells: ReadonlyMap<Day, HeatCell>;
  label: string;
  showMarkerLegend?: boolean;
  onSelect: (day: Day) => void;
}) {
  const weeks = useMemo(() => heatmapWeeks(from, to), [from, to]);
  const months = useMemo(() => heatmapMonths(weeks), [weeks]);
  const [focusDay, setFocusDay] = useState<Day>(to);
  const scroller = useRef<HTMLDivElement>(null);
  const buttons = useRef(new Map<Day, HTMLButtonElement>());

  useEffect(() => {
    const element = scroller.current;
    if (element) element.scrollLeft = element.scrollWidth;
  }, [from, to]);

  const current = focusDay >= from && focusDay <= to ? focusDay : to;

  function move(event: KeyboardEvent<HTMLDivElement>) {
    const step = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 }[event.key];
    let next: Day | null = null;
    if (step !== undefined) next = addDays(current, step);
    if (event.key === 'Home') next = from;
    if (event.key === 'End') next = to;
    if (next === null) return;
    event.preventDefault();
    if (next < from || next > to) return;
    setFocusDay(next);
    buttons.current.get(next)?.focus();
  }

  return (
    <div className="heatmap-wrap">
      <div className="heatmap-scroll" ref={scroller}>
        <div className="heatmap" role="group" aria-label={label} onKeyDown={move}>
          {months.map((month) => (
            <span key={month.day} className="heatmap-month muted" aria-hidden="true" style={{ gridColumn: month.column + 1 }}>
              {monthName.format(new Date(`${month.day}T12:00:00Z`)).replace('.', '')}
            </span>
          ))}
          {weeks.map((week, column) =>
            week.map((day, weekday) => {
              if (day === null) return null;
              const cell = cells.get(day);
              const level = cell?.level ?? 0;
              return (
                <button
                  key={day}
                  type="button"
                  ref={(element) => {
                    if (element) buttons.current.set(day, element);
                    else buttons.current.delete(day);
                  }}
                  className={cell?.marked ? 'heat-cell marked' : 'heat-cell'}
                  data-level={level}
                  style={{ gridColumn: column + 1, gridRow: weekday + 2 }}
                  tabIndex={day === current ? 0 : -1}
                  aria-label={`${formatDayLong(day)}: ${cell?.text ?? h.cell.empty}`}
                  onFocus={() => setFocusDay(day)}
                  onClick={() => onSelect(day)}
                />
              );
            }),
          )}
        </div>
      </div>
      <div className="heatmap-legend muted" aria-hidden="true">
        <span>{h.less}</span>
        {([0, 1, 2, 3, 4] as const).map((level) => (
          <i key={level} className="heat-swatch" data-level={level} />
        ))}
        <span>{h.more}</span>
        {showMarkerLegend && (
          <>
            <span className="grow" />
            <i className="heat-swatch marked" data-level={0} />
            <span>{h.markerLegend}</span>
          </>
        )}
      </div>
      <p className="muted small">{h.noPunishment}</p>
    </div>
  );
}
