import { useRef, type MouseEvent, type PointerEvent } from 'react';

/** How long a press must last to count as a long press. */
const LONG_PRESS_MS = 500;
/** A click this soon after a long press is the end of that press, not a tap. */
const SWALLOW_CLICK_MS = 800;

export interface LongPressHandlers {
  onPointerDown?: (event: PointerEvent) => void;
  onPointerUp?: () => void;
  onPointerLeave?: () => void;
  onPointerCancel?: () => void;
  onContextMenu?: (event: MouseEvent) => void;
  onClickCapture?: (event: MouseEvent) => void;
}

/**
 * A long press on a button that keeps its tap: touch and mouse hold for half a second; the context
 * menu (a right click, the menu key or Shift+F10 on a keyboard) does the same at once. The tap that
 * ends a long press is swallowed. With no handler, nothing is attached.
 */
export function useLongPress(onLongPress: (() => void) | null): LongPressHandlers {
  const timer = useRef<number | undefined>(undefined);
  const firedAt = useRef(0);

  if (!onLongPress) return {};

  const cancel = () => {
    if (timer.current !== undefined) window.clearTimeout(timer.current);
    timer.current = undefined;
  };
  const fire = () => {
    cancel();
    firedAt.current = Date.now();
    onLongPress();
  };

  return {
    onPointerDown: (event) => {
      if (event.button !== 0) return;
      cancel();
      timer.current = window.setTimeout(fire, LONG_PRESS_MS);
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onContextMenu: (event) => {
      event.preventDefault();
      // On touch, the browser's own long press may come right after ours: one is enough.
      if (Date.now() - firedAt.current > SWALLOW_CLICK_MS) fire();
    },
    onClickCapture: (event) => {
      if (Date.now() - firedAt.current > SWALLOW_CLICK_MS) return;
      event.preventDefault();
      event.stopPropagation();
    },
  };
}
