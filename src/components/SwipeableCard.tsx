import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Celebrity } from "@/pages/Rate";

interface SwipeableCardProps {
  celebrity: Celebrity;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  disabled?: boolean;
}

export const SwipeableCard = ({ celebrity, onSwipeRight, onSwipeLeft, disabled }: SwipeableCardProps) => {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchCurrent, setTouchCurrent] = useState<{ x: number; y: number } | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || !touchStart) return;
    const touch = e.touches[0];
    setTouchCurrent({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = () => {
    if (disabled || !touchStart || !touchCurrent) {
      setTouchStart(null);
      setTouchCurrent(null);
      setIsSwiping(false);
      return;
    }

    const deltaX = touchCurrent.x - touchStart.x;
    const deltaY = Math.abs(touchCurrent.y - touchStart.y);
    const swipeThreshold = 100;

    // Only trigger if horizontal swipe is dominant
    if (Math.abs(deltaX) > swipeThreshold && Math.abs(deltaX) > deltaY) {
      if (deltaX > 0) {
        onSwipeRight();
      } else {
        onSwipeLeft();
      }
    }

    setTouchStart(null);
    setTouchCurrent(null);
    setIsSwiping(false);
  };

  const getTransform = () => {
    if (!touchStart || !touchCurrent || !isSwiping) return "translate(0, 0) rotate(0deg)";
    
    const deltaX = touchCurrent.x - touchStart.x;
    const deltaY = touchCurrent.y - touchStart.y;
    const rotation = deltaX * 0.05; // Slight rotation based on swipe
    
    return `translate(${deltaX}px, ${deltaY}px) rotate(${rotation}deg)`;
  };

  const getOverlayOpacity = (direction: 'left' | 'right') => {
    if (!touchStart || !touchCurrent || !isSwiping) return 0;
    
    const deltaX = touchCurrent.x - touchStart.x;
    const maxOpacity = 0.7;
    const opacity = Math.min(Math.abs(deltaX) / 200, maxOpacity);
    
    if (direction === 'right' && deltaX > 0) return opacity;
    if (direction === 'left' && deltaX < 0) return opacity;
    return 0;
  };

  return (
    <div
      ref={cardRef}
      className="touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: getTransform(),
        transition: isSwiping ? 'none' : 'transform 0.3s ease-out',
      }}
    >
      <Card className="group cursor-pointer overflow-hidden border border-border/30 hover:border-primary/50 hover:shadow-elegant transition-all duration-500 rounded-3xl relative">
        {/* Swipe overlays */}
        <div 
          className="absolute inset-0 bg-green-500 z-10 flex items-center justify-center pointer-events-none"
          style={{ opacity: getOverlayOpacity('right') }}
        >
          <span className="text-white text-6xl font-bold rotate-[-20deg]">✓</span>
        </div>
        <div 
          className="absolute inset-0 bg-red-500 z-10 flex items-center justify-center pointer-events-none"
          style={{ opacity: getOverlayOpacity('left') }}
        >
          <span className="text-white text-6xl font-bold rotate-[20deg]">✗</span>
        </div>

        <div className="aspect-[3/4] bg-muted relative overflow-hidden">
          <img
            src={celebrity.image_path}
            alt={celebrity.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-500">
            <p className="font-serif text-lg font-medium">Swipe or Tap to Select</p>
          </div>
        </div>
        <div className="p-6 bg-card">
          <h3 className="text-xl font-serif font-semibold mb-3">{celebrity.name}</h3>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="font-light">Rating: {Math.round(celebrity.elo_rating)}</span>
            <span className="font-light">{celebrity.games_played} votes</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export type { Celebrity };
