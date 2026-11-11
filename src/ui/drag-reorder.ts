import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
} from 'react';
import { dropIndex, moveItem } from '../domain/habits/order';
import { LONG_PRESS_MS, SWALLOW_CLICK_MS } from './long-press';

/** How far a finger may wander during the long press before it counts as a scroll, in CSS pixels. */
const SLOP = 10;

/** A drag by touch or mouse: the item follows the pointer, the others make room. */
interface PointerDrag {
  readonly mode: 'pointer';
  readonly id: string;
  readonly from: number;
  readonly to: number;
  /** How far the pointer moved since the press. */
  readonly dy: number;
  /** How far the others move to make room: the dragged item's height plus the gap. */
  readonly step: number;
}

/** A move by keyboard: the list shows `order` while the arrows move `id`. */
interface KeyboardDrag {
  readonly mode: 'keyboard';
  readonly id: string;
  readonly order: readonly string[];
}

type Drag = PointerDrag | KeyboardDrag;

/** What the screen says to a screen reader as the item moves (texts in strings.ts). */
export type Announcement =
  | { readonly kind: 'moving'; readonly id: string; readonly position: number; readonly total: number }
  | { readonly kind: 'dropped'; readonly id: string; readonly position: number; readonly total: number }
  | { readonly kind: 'canceled' };

export interface DragItemProps {
  'data-drag-id': string;
  className?: string;
  style?: CSSProperties;
  onPointerDown?: (event: PointerEvent) => void;
  onPointerMove?: (event: PointerEvent) => void;
  onPointerUp?: () => void;
  onPointerCancel?: () => void;
  onContextMenu?: (event: MouseEvent) => void;
  onClickCapture?: (event: MouseEvent) => void;
  onDragStart?: (event: DragEvent) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  onBlur?: (event: FocusEvent) => void;
}

export interface DragReorder {
  /** The ids in the order to show them (the keyboard move reorders them as it goes). */
  readonly order: readonly string[];
  readonly announcement: Announcement | null;
  /** Spread on each item's `<li>`; `enabled` false leaves the item still. */
  itemProps(id: string, enabled: boolean): DragItemProps;
}

/** Controls inside an item that keep their own long press (the marker's versão mínima). */
const OWN_PRESS = '.marker';

const ownsPress = (event: { target: EventTarget }) => event.target instanceof Element && event.target.closest(OWN_PRESS) !== null;

/**
 * Drag to reorder a list (docs/spec/telas-e-feedback.md "Hoje"). A long press on an item (outside
 * the marker) picks it up; it follows the finger and drops where it is let go. On a keyboard, the
 * context menu key (or Shift+F10) picks the focused item; the arrows move it, Enter drops it and
 * Escape puts it back. `onDrop` gets the new order only when it changed.
 */
export function useDragReorder(ids: readonly string[], listRef: RefObject<HTMLElement | null>, onDrop: (order: string[]) => void): DragReorder {
  const [drag, setDrag] = useState<Drag | null>(null);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const press = useRef<{ id: string; x: number; y: number; timer: number } | null>(null);
  const centers = useRef<number[]>([]);
  const endedAt = useRef(0);
  const dragRef = useRef<Drag | null>(null);
  dragRef.current = drag;
  const idsKey = ids.join(' ');

  // The list changed under the drag (marked on another device, a reload): drop nothing.
  useEffect(() => {
    if (dragRef.current) setDrag(null);
    clearPress();
  }, [idsKey]);

  function clearPress() {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  }

  function finish(commit: boolean) {
    const current = dragRef.current;
    if (!current) return;
    // Set now, not on the next render: a touch ends with both pointerup and touchend.
    dragRef.current = null;
    endedAt.current = Date.now();
    setDrag(null);
    if (!commit) {
      setAnnouncement({ kind: 'canceled' });
      return;
    }
    const next = current.mode === 'pointer' ? moveItem(ids, current.from, current.to) : [...current.order];
    setAnnouncement({ kind: 'dropped', id: current.id, position: next.indexOf(current.id) + 1, total: next.length });
    if (next.join(' ') !== idsKey) onDrop(next);
  }

  /** Picks up the pressed item where it is, measuring the list as it stands. */
  function pickUp(id: string) {
    const list = listRef.current;
    const from = ids.indexOf(id);
    if (!list || from < 0) return;
    const rects = ids.map((itemId) => list.querySelector(`[data-drag-id="${CSS.escape(itemId)}"]`)?.getBoundingClientRect());
    if (rects.some((rect) => !rect)) return;
    const boxes = rects as DOMRect[];
    centers.current = boxes.map((rect) => rect.top + rect.height / 2);
    const gap = boxes.length > 1 ? boxes[1].top - boxes[0].bottom : 0;
    endedAt.current = Date.now();
    setDrag({ mode: 'pointer', id, from, to: from, dy: 0, step: boxes[from].height + gap });
    setAnnouncement({ kind: 'moving', id, position: from + 1, total: ids.length });
  }

  // While a pointer drag runs, the whole window follows it, and the page does not scroll.
  const pointerDragging = drag?.mode === 'pointer';
  useEffect(() => {
    if (!pointerDragging) return;
    const startY = press.current?.y ?? 0;
    clearPress();
    const follow = (clientY: number) =>
      setDrag((current) => {
        if (current?.mode !== 'pointer') return current;
        const dy = clientY - startY;
        const to = dropIndex(centers.current, current.from, centers.current[current.from] + dy);
        return { ...current, dy, to };
      });
    const onPointerMove = (event: globalThis.PointerEvent) => follow(event.clientY);
    const onTouchMove = (event: TouchEvent) => {
      if (event.cancelable) event.preventDefault();
      if (event.touches[0]) follow(event.touches[0].clientY);
    };
    const onUp = () => finish(true);
    const onCancel = () => finish(false);
    const onKey = (event: globalThis.KeyboardEvent) => event.key === 'Escape' && finish(false);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('touchend', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('touchend', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('keydown', onKey);
    };
    // finish reads the latest drag through dragRef; re-running only matters when a drag starts.
  }, [pointerDragging]);

  // The keyboard move reorders the DOM; keep the focus on the moving item.
  const keyboardOrder = drag?.mode === 'keyboard' ? drag.order.join(' ') : null;
  useLayoutEffect(() => {
    const current = dragRef.current;
    if (current?.mode !== 'keyboard') return;
    const item = listRef.current?.querySelector<HTMLElement>(`[data-drag-id="${CSS.escape(current.id)}"]`);
    const focusable = item?.querySelector<HTMLElement>('a, button:not(.marker)');
    if (focusable && !item?.contains(document.activeElement)) focusable.focus();
  }, [keyboardOrder, listRef]);

  useEffect(() => clearPress, []);

  function moveByKey(delta: number) {
    const current = dragRef.current;
    if (current?.mode !== 'keyboard') return;
    const from = current.order.indexOf(current.id);
    const to = Math.max(0, Math.min(current.order.length - 1, from + delta));
    if (to === from) return;
    const next: KeyboardDrag = { ...current, order: moveItem(current.order, from, to) };
    dragRef.current = next;
    setDrag(next);
    setAnnouncement({ kind: 'moving', id: current.id, position: to + 1, total: next.order.length });
  }

  function itemProps(id: string, enabled: boolean): DragItemProps {
    const base: DragItemProps = { 'data-drag-id': id };
    if (ids.length < 2) return base;
    const current = drag;

    let className: string | undefined;
    let style: CSSProperties | undefined;
    if (current?.mode === 'pointer') {
      const index = ids.indexOf(id);
      if (id === current.id) {
        className = 'dragging';
        style = { transform: `translateY(${current.dy}px)` };
      } else {
        className = 'shifting';
        const { from, to, step } = current;
        const shift = from < to && index > from && index <= to ? -step : to < from && index >= to && index < from ? step : 0;
        if (shift !== 0) style = { transform: `translateY(${shift}px)` };
      }
    } else if (current?.mode === 'keyboard' && id === current.id) {
      className = 'dragging';
    }

    if (!enabled) return { ...base, className, style };

    return {
      ...base,
      className,
      style,
      onPointerDown: (event) => {
        if (event.button !== 0 || ownsPress(event) || dragRef.current) return;
        clearPress();
        press.current = { id, x: event.clientX, y: event.clientY, timer: window.setTimeout(() => pickUp(id), LONG_PRESS_MS) };
      },
      onPointerMove: (event) => {
        const pending = press.current;
        if (pending && Math.hypot(event.clientX - pending.x, event.clientY - pending.y) > SLOP) clearPress();
      },
      onPointerUp: () => {
        if (!dragRef.current) clearPress();
      },
      onPointerCancel: () => {
        if (!dragRef.current) clearPress();
      },
      onContextMenu: (event) => {
        if (ownsPress(event)) return;
        event.preventDefault();
        if (dragRef.current) return;
        // A touch long press may bring the browser's own menu before our timer: pick up now.
        if (press.current?.id === id) {
          window.clearTimeout(press.current.timer);
          pickUp(id);
          return;
        }
        endedAt.current = Date.now();
        setDrag({ mode: 'keyboard', id, order: [...ids] });
        setAnnouncement({ kind: 'moving', id, position: ids.indexOf(id) + 1, total: ids.length });
      },
      onClickCapture: (event) => {
        // The tap that ends a long press or a drag is not a tap on the item.
        if (dragRef.current?.mode === 'pointer' || Date.now() - endedAt.current < SWALLOW_CLICK_MS) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      // A link's own drag (to another tab, on a desktop or Android) would steal the pointer.
      onDragStart: (event) => event.preventDefault(),
      onKeyDown: (event) => {
        if (dragRef.current?.mode !== 'keyboard' || dragRef.current.id !== id) return;
        const keys: Record<string, () => void> = {
          ArrowUp: () => moveByKey(-1),
          ArrowDown: () => moveByKey(1),
          Home: () => moveByKey(-ids.length),
          End: () => moveByKey(ids.length),
          Enter: () => finish(true),
          ' ': () => finish(true),
          Escape: () => finish(false),
        };
        const action = keys[event.key];
        if (!action) return;
        event.preventDefault();
        event.stopPropagation();
        action();
      },
      onBlur: (event) => {
        if (dragRef.current?.mode !== 'keyboard' || dragRef.current.id !== id) return;
        const item = event.currentTarget;
        // Focus leaving the item (Tab, a tap elsewhere) drops it where it is. A reorder of the
        // DOM may blur it for a moment: the layout effect gives the focus back first.
        window.setTimeout(() => {
          if (dragRef.current?.mode === 'keyboard' && !item.contains(document.activeElement)) finish(true);
        });
      },
    };
  }

  return { order: drag?.mode === 'keyboard' ? drag.order : ids, announcement, itemProps };
}
