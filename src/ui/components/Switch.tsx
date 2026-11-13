import { useId } from 'react';

/** An on/off setting in a card: the label and a hint on the left, the switch on the right. */
export function Switch({
  label,
  hint,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  const hintId = useId();
  return (
    <label className="card row tight switch-row">
      <span className="grow">
        {label}
        {hint && (
          <>
            <br />
            <span id={hintId} className="muted small">
              {hint}
            </span>
          </>
        )}
      </span>
      <input
        type="checkbox"
        role="switch"
        className="switch"
        checked={checked}
        disabled={disabled}
        aria-describedby={hint ? hintId : undefined}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
