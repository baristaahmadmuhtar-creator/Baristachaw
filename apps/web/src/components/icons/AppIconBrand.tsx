import type { ImgHTMLAttributes } from 'react';

export function AppIconBrand(props: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <picture>
      <source media="(prefers-color-scheme: dark)" srcSet="/icons/icon-dark-512.png?v=20260430b" />
      <img src="/icons/icon-light-512.png?v=20260430b" alt="Baristachaw" {...props} />
    </picture>
  );
}
