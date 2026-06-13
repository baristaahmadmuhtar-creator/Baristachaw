import { motion, type Variants } from 'motion/react';
import type { ReactNode } from 'react';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  /** Delay in seconds */
  delay?: number;
  /** Animation variant: 'fade' | 'slide-up' | 'slide-left' | 'blur' | 'scale' */
  variant?: 'fade' | 'slide-up' | 'slide-left' | 'blur' | 'scale';
  /** Whether to use once or keep animating on scroll */
  once?: boolean;
}

const EASE_SMOOTH = [0.16, 1, 0.3, 1] as const;

const variants: Record<string, Variants> = {
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.7, ease: EASE_SMOOTH } },
  },
  'slide-up': {
    hidden: { opacity: 0, y: 48, filter: 'blur(8px)' },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration: 0.75, ease: EASE_SMOOTH },
    },
  },
  'slide-left': {
    hidden: { opacity: 0, x: 60, filter: 'blur(6px)' },
    visible: {
      opacity: 1,
      x: 0,
      filter: 'blur(0px)',
      transition: { duration: 0.8, ease: EASE_SMOOTH },
    },
  },
  blur: {
    hidden: { opacity: 0, filter: 'blur(16px)', scale: 0.97 },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      scale: 1,
      transition: { duration: 0.85, ease: EASE_SMOOTH },
    },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.92 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.7, ease: EASE_SMOOTH },
    },
  },
};

export function ScrollReveal({
  children,
  className,
  delay = 0,
  variant = 'slide-up',
  once = true,
}: ScrollRevealProps) {
  const selectedVariant = variants[variant];
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: 0.15, margin: '-40px' }}
      variants={selectedVariant}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}
