import { useEffect, useId, useRef, type ReactNode } from 'react';

/**
 * A sheet that rises from the bottom, for short actions (régua, later pausar and recompensa), or a
 * centered blocking dialog for confirming a deletion (`variant="confirm"`), the only modal the app
 * has (docs/spec/telas-e-feedback.md "Navegação"). Built on <dialog>: focus is trapped, Esc and
 * a tap outside close it.
 */
export function Sheet({
  open,
  title,
  onClose,
  variant = 'sheet',
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  variant?: 'sheet' | 'confirm';
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={variant === 'confirm' ? 'dialog confirm' : 'dialog sheet'}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog itself, outside its content.
        if (event.target === ref.current) onClose();
      }}
    >
      {open && (
        <div className="dialog-body">
          {variant === 'sheet' && <span className="sheet-handle" aria-hidden="true" />}
          <h2 id={titleId}>{title}</h2>
          {children}
        </div>
      )}
    </dialog>
  );
}
