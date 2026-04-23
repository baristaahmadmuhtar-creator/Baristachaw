import type { LucideIcon, LucideProps } from 'lucide-react';

interface GlassGlyphProps extends Omit<LucideProps, 'color'> {
  icon: LucideIcon;
}

export function GlassGlyph({ icon: Icon, size = 16, className, strokeWidth = 2, style, ...props }: GlassGlyphProps) {
  return (
    <Icon
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      style={{ color: 'var(--icon-glyph-color)', ...style }}
      {...props}
    />
  );
}
