import type { SVGProps } from 'react';

export function FacebookMark({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect width="24" height="24" rx="12" fill="#1877F2" />
      <path
        fill="#fff"
        d="M14.02 8.5h1.42V6.17A18.28 18.28 0 0 0 13.36 6c-2.06 0-3.47 1.26-3.47 3.55v2.01H7.56v2.61h2.33V20h2.8v-5.83h2.32l.35-2.61H12.7V9.81c0-.77.21-1.31 1.32-1.31Z"
      />
    </svg>
  );
}
