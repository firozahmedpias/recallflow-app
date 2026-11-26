import confetti from 'canvas-confetti';

export function triggerMilestoneConfetti(): void {
  if (typeof window === 'undefined') return;
  const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  try {
    confetti({
      particleCount: 75,
      spread: 65,
      origin: { y: 0.65 },
      colors: ['#6366F1', '#10B981', '#F59E0B', '#38BDF8'],
    });
  } catch {
    // Fallback quietly if canvas-confetti cannot initialize
  }
}
