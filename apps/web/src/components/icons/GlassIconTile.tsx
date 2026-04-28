import type { LucideIcon, LucideProps } from 'lucide-react';
import clsx from 'clsx';
import { GlassGlyph } from './GlassGlyph';

export type IconTone = 'amber' | 'blue' | 'purple' | 'green' | 'ice' | 'neutral';
export type IconIntensity = 'hero' | 'standard' | 'micro';
export type IconVariant = 'tile' | 'glyph';

export interface GlassIconTileProps extends Omit<LucideProps, 'color'> {
  icon: LucideIcon;
  tone?: IconTone;
  intensity?: IconIntensity;
  variant?: IconVariant;
  tileClassName?: string;
}

function normalizeIconSize(size: LucideProps['size']): number {
  if (typeof size === 'number' && Number.isFinite(size)) return size;
  if (typeof size === 'string') {
    const parsed = Number.parseFloat(size);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 18;
}

const glyphScaleByIntensity: Record<IconIntensity, number> = {
  hero: 0.56,
  standard: 0.58,
  micro: 0.62,
};

export function GlassIconTile({
  icon,
  tone = 'neutral',
  intensity = 'standard',
  variant = 'glyph',
  size = 18,
  className,
  tileClassName,
  strokeWidth,
  style,
  ...props
}: GlassIconTileProps) {
  const baseSize = normalizeIconSize(size);
  const glyphSize = Math.max(10, Math.round(baseSize * glyphScaleByIntensity[intensity]));

  if (variant === 'glyph') {
    return (
      <span
        className={clsx('glass-icon-glyph', `icon-tone-${tone}`, className)}
        style={{ width: baseSize, height: baseSize, ...style }}
      >
        <GlassGlyph icon={icon} size={Math.max(12, Math.round(baseSize * 0.82))} strokeWidth={strokeWidth} {...props} />
      </span>
    );
  }

  return (
    <span
      className={clsx('glass-icon-tile', `icon-glass-${intensity}`, `icon-tone-${tone}`, className, tileClassName)}
      style={{ width: baseSize, height: baseSize, ...style }}
    >
      <GlassGlyph icon={icon} size={glyphSize} strokeWidth={strokeWidth} {...props} />
    </span>
  );
}
