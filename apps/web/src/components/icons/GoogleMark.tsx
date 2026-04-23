import type { ImgHTMLAttributes } from 'react';

export function GoogleMark({ className = 'h-4 w-4', alt = '', ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img src="/icons/google-g.png?v=20260423c" alt={alt} className={className} draggable="false" {...props} />
  );
}
