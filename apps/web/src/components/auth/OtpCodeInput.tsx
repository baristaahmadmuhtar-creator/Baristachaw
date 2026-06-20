import React, { useState, useRef, KeyboardEvent, ClipboardEvent } from 'react';
import { OTP_CODE_LENGTH } from '@baristachaw/shared';

type OtpCodeInputProps = {
  length?: number;
  onComplete: (code: string) => void;
  disabled?: boolean;
  onPasteError?: (error: string) => void;
};

export const OtpCodeInput: React.FC<OtpCodeInputProps> = ({ 
  length = OTP_CODE_LENGTH, 
  onComplete, 
  disabled = false,
  onPasteError
}) => {
  const [code, setCode] = useState<string[]>(Array(length).fill(''));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const focusInput = (index: number) => {
    if (index >= 0 && index < length) {
      inputsRef.current[index]?.focus();
      // Use setTimeout to ensure selection happens after focus
      setTimeout(() => {
        inputsRef.current[index]?.select();
      }, 0);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newCode = [...code];
      if (newCode[index]) {
        // If current input has value, clear it
        newCode[index] = '';
        setCode(newCode);
      } else if (index > 0) {
        // If empty, focus previous and clear it
        newCode[index - 1] = '';
        setCode(newCode);
        focusInput(index - 1);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusInput(index - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusInput(index + 1);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value.replace(/\D/g, ''); // only allow digits
    if (!value) return;

    // Take just the last character if multiple are entered
    const char = value[value.length - 1];
    const newCode = [...code];
    newCode[index] = char;
    setCode(newCode);

    if (index < length - 1) {
      focusInput(index + 1);
    } else {
      inputsRef.current[index]?.blur();
      const fullCode = newCode.join('');
      if (fullCode.length === length) {
        onComplete(fullCode);
      }
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const rawPasted = e.clipboardData.getData('text/plain');
    const cleanPasted = rawPasted.replace(/\D/g, '');
    if (!cleanPasted) return;

    const pastedData = cleanPasted.slice(0, length);
    const newCode = [...code];
    for (let i = 0; i < length; i++) {
      newCode[i] = pastedData[i] || '';
    }
    setCode(newCode);

    if (pastedData.length === length) {
      inputsRef.current[length - 1]?.blur();
      onComplete(newCode.join(''));
    } else {
      focusInput(pastedData.length);
    }
  };

  return (
    <div
      className="my-4 grid w-full max-w-full grid-cols-8 justify-center gap-1 sm:gap-1.5 [grid-template-columns:repeat(8,minmax(0,clamp(1.75rem,9vw,2.75rem)))]"
      dir="ltr"
    >
      {code.map((value, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={2} // Allow 2 to catch rapid typing and slice in handleChange
          value={value}
          disabled={disabled}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          className="h-11 w-full min-w-0 rounded-lg border bg-white text-center text-base font-semibold outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:opacity-50 dark:bg-gray-800 dark:focus:ring-blue-900 sm:h-14 sm:text-xl"
        />
      ))}
    </div>
  );
};
