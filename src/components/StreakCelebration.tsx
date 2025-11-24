import { useEffect } from "react";
import confetti from "canvas-confetti";

interface StreakCelebrationProps {
  streak: number;
  show: boolean;
}

export const StreakCelebration = ({ streak, show }: StreakCelebrationProps) => {
  useEffect(() => {
    if (!show || streak < 3) return;

    const duration = 2000;
    const animationEnd = Date.now() + duration;
    
    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        particleCount,
        startVelocity: 30,
        spread: 360,
        origin: {
          x: randomInRange(0.1, 0.9),
          y: Math.random() - 0.2,
        },
        colors: ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e'],
        ticks: 60,
        gravity: 1.2,
        decay: 0.94,
        scalar: 1.2,
      });
    }, 250);

    return () => clearInterval(interval);
  }, [show, streak]);

  if (!show || streak < 3) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      <div className="animate-in zoom-in-50 duration-500 bg-primary/90 text-white px-8 py-4 rounded-full shadow-2xl backdrop-blur-sm border-2 border-white/20">
        <div className="text-center">
          <div className="text-4xl font-bold mb-1">🔥 {streak} Streak! 🔥</div>
          <div className="text-sm opacity-90">You're on fire!</div>
        </div>
      </div>
    </div>
  );
};
