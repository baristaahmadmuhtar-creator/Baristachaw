import React from 'react';

type PasswordStrengthHintProps = {
  password?: string;
  translations: Record<string, string>;
};

export const PasswordStrengthHint: React.FC<PasswordStrengthHintProps> = ({ password = '', translations }) => {
  if (!password) return null;

  const getStrength = () => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const score = getStrength();

  let label = 'Weak';
  let color = 'text-red-500';
  let barColor = 'bg-red-500';
  let width = 'w-1/4';

  if (score >= 4) {
    label = 'Strong';
    color = 'text-green-500';
    barColor = 'bg-green-500';
    width = 'w-full';
  } else if (score >= 2) {
    label = 'Medium';
    color = 'text-yellow-500';
    barColor = 'bg-yellow-500';
    width = 'w-1/2';
  }

  // Use translations if available, fallback to English
  const localizedLabel = translations[`authPasswordStrength${label}`] || label;

  return (
    <div className="mt-1 flex flex-col gap-1">
      <div className="flex gap-1 h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} ${width} transition-all duration-300`} />
      </div>
      <p className={`text-xs ${color} font-medium text-right`}>{localizedLabel}</p>
    </div>
  );
};
