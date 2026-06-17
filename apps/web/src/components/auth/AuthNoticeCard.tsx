import React from 'react';

type AuthNoticeCardProps = {
  title?: string;
  message: string;
  type?: 'info' | 'success' | 'warning';
};

export const AuthNoticeCard: React.FC<AuthNoticeCardProps> = ({ title, message, type = 'info' }) => {
  const bgColors = {
    info: 'bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    success: 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    warning: 'bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  };

  return (
    <div className={`p-4 rounded-md mb-4 text-sm ${bgColors[type]}`}>
      {title && <h4 className="font-semibold mb-1">{title}</h4>}
      <p>{message}</p>
    </div>
  );
};
