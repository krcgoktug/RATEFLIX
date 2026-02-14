import { useId, useState } from 'react';

function EyeIcon({ open }) {
  return open ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 12s3.5-6 10-6c2.13 0 3.95.65 5.49 1.58M22 12s-3.5 6-10 6c-2.13 0-3.95-.65-5.49-1.58" />
      <path d="M3 3l18 18" />
    </svg>
  );
}

export default function PasswordField({
  label,
  id,
  className,
  ...inputProps
}) {
  const [open, setOpen] = useState(false);
  const generatedId = useId().replace(/:/g, '');
  const inputId = id || `${inputProps.name || 'password'}-${generatedId}`;

  return (
    <label htmlFor={inputId} className={className}>
      {label}
      <div className="password-input-wrap">
        <input
          id={inputId}
          type={open ? 'text' : 'password'}
          {...inputProps}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? 'Hide password' : 'Show password'}
          aria-pressed={open}
        >
          <EyeIcon open={open} />
        </button>
      </div>
    </label>
  );
}
