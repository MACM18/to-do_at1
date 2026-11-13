'use client';

import React, { useState } from 'react';
import { parseTimeInput } from '@/lib/time-utils';

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
  ariaLabel?: string;
  onBlur?: () => void;
}

const INVALID_TIME_MESSAGE = 'Use a time such as 09.12, 13:15, or 9.12 pm.';

export default function TimeInput({
  value,
  onChange,
  className,
  placeholder = 'e.g. 08.30 AM or 13:15',
  required = false,
  ariaLabel,
  onBlur,
}: TimeInputProps) {
  const [error, setError] = useState('');
  const errorId = React.useId();
  const widthClass = className?.split(/\s+/).find((name) => name.startsWith('w-')) || 'w-full';

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const trimmed = value.trim();
    const validationError = !trimmed && required
      ? 'A time is required.'
      : trimmed && !parseTimeInput(trimmed)
        ? INVALID_TIME_MESSAGE
        : '';

    setError(validationError);
    event.currentTarget.setCustomValidity(validationError);
    if (!validationError) onBlur?.();
  };

  return (
    <div className={widthClass}>
      <input
        type="text"
        inputMode="text"
        value={value}
        onChange={(event) => {
          setError('');
          event.currentTarget.setCustomValidity('');
          onChange(event.target.value);
        }}
        onBlur={handleBlur}
        placeholder={placeholder}
        required={required}
        aria-label={ariaLabel}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={`${className || ''} ${error ? '!border-rose-500 focus:!ring-rose-500' : ''}`}
      />
      {error && (
        <p id={errorId} className="mt-1 text-[10px] font-medium text-rose-600 dark:text-rose-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
