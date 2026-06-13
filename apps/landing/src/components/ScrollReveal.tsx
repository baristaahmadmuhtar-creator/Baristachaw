import { motion, type Variants } from 'motion/react';
import type { ReactNode } from 'react';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  /** Delay in seconds */
  delay?: number;
  /** Animation variant */
  variant?: 'fade' | 'slide-up' | 'slide-left' | 'blur' | 'scale' | 'dramatic';
  /** Whether to use once or keep animating on scroll */
  once?: boolean;
}

const EASE_PREMIUM = [0.22, 1, 0.36, 1] as const;

const variants: Record<string, Variants> = {
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.9, ease: EASE_PREMIUM } },
  },
  'slide-up': {
    hidden: { opacity: 0, y: 80, filter: 'blur(18px)' },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration: 1.05, ease: EASE_PREMIUM },
    },
  },
  'slide-left': {
    hidden: { opacity: 0, x: 80, filter: 'blur(14px)' },
    visible: {
      opacity: 1,
      x: 0,
      filter: 'blur(0px)',
      transition: { duration: 1.0, ease: EASE_PREMIUM },
    },
  },
  blur: {
    hidden: { opacity: 0, filter: 'blur(24px)', scale: 0.95 },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      scale: 1,
      transition: { duration: 1.1, ease: EASE_PREMIUM },
    },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.88, filter: 'blur(10px)' },
    visible: {
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      transition: { duration: 0.95, ease: EASE_PREMIUM },
    },
  },
  dramatic: {
    hidden: { opacity: 0, y: 60, filter: 'blur(28px)', scale: 0.90 },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      scale: 1,
      transition: { duration: 1.25, ease: EASE_PREMIUM },
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
      viewport={{ once, amount: 0.12, margin: '-60px' }}
      variants={selectedVariant}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}
