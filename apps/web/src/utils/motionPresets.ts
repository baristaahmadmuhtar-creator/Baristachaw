export const motionEase = [0.16, 1, 0.3, 1] as [number, number, number, number];
export const motionEaseExit = [0.7, 0, 0.84, 0] as [number, number, number, number];

export const motionDefaultTransition = {
  duration: 0.2,
  ease: motionEase,
};

export const overlayFadeTransition = {
  duration: 0.16,
  ease: motionEase,
};

export const modalSpringTransition = {
  type: 'spring' as const,
  stiffness: 360,
  damping: 34,
  mass: 0.82,
};

export const modalExitTransition = {
  duration: 0.14,
  ease: motionEaseExit,
};

export const mobileDockPillTransition = {
  type: 'spring' as const,
  stiffness: 500,
  damping: 42,
  mass: 0.7,
};

export const mobileDockIconTransition = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 30,
  mass: 0.72,
};
