import { useState, useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Celebrity {
  id: string;
  name: string;
  image_path: string;
  elo_rating: number;
  games_played: number;
}

interface SwipeableContainerProps {
  celebrities: [Celebrity, Celebrity];
  onVote: (winnerId: string, loserId: string) => void;
  disabled?: boolean;
  isMobile?: boolean;
}

export const SwipeableContainer = ({ celebrities, onVote, disabled, isMobile = true }: SwipeableContainerProps) => {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchCurrent, setTouchCurrent] = useState<{ x: number; y: number } | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
    const swipeThreshold = 80;

    // Only trigger if horizontal swipe is dominant
    if (Math.abs(deltaX) > swipeThreshold && Math.abs(deltaX) > deltaY) {
      if (deltaX > 0) {
        // Swipe right - choose right celebrity
        onVote(celebrities[1].id, celebrities[0].id);
      } else {
        // Swipe left - choose left celebrity
        onVote(celebrities[0].id, celebrities[1].id);
      }
    }

    setTouchStart(null);
    setTouchCurrent(null);
    setIsSwiping(false);
  };

  // Mouse events for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled || isMobile) return;
    setTouchStart({ x: e.clientX, y: e.clientY });
    setIsSwiping(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (disabled || !touchStart || isMobile) return;
    setTouchCurrent({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    if (disabled || !touchStart || isMobile) {
      setTouchStart(null);
      setTouchCurrent(null);
      setIsSwiping(false);
      return;
    }

    if (!touchCurrent) {
      setTouchStart(null);
      setIsSwiping(false);
      return;
    }

    const deltaX = touchCurrent.x - touchStart.x;
    const deltaY = Math.abs(touchCurrent.y - touchStart.y);
    const swipeThreshold = 100;

    // Only trigger if horizontal swipe is dominant
    if (Math.abs(deltaX) > swipeThreshold && Math.abs(deltaX) > deltaY) {
      if (deltaX > 0) {
        // Swipe right - choose right celebrity
        onVote(celebrities[1].id, celebrities[0].id);
      } else {
        // Swipe left - choose left celebrity
        onVote(celebrities[0].id, celebrities[1].id);
      }
    }

    setTouchStart(null);
    setTouchCurrent(null);
    setIsSwiping(false);
  };

  const getOverlayOpacity = (side: 'left' | 'right') => {
    if (!touchStart || !touchCurrent) return 0;
    
    const deltaX = touchCurrent.x - touchStart.x;
    const maxOpacity = 0.8;
    const opacity = Math.min(Math.abs(deltaX) / 150, maxOpacity);
    
    if (side === 'left' && deltaX < 0) return opacity;
    if (side === 'right' && deltaX > 0) return opacity;
    return 0;
  };

  return (
    <div
      ref={containerRef}
      className={`touch-none select-none relative ${isSwiping ? 'cursor-grabbing' : 'cursor-grab'}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className={isMobile ? "grid grid-cols-2 gap-3" : "grid grid-cols-2 gap-8 md:gap-12"}>
        {celebrities.map((celebrity, index) => (
          <div key={celebrity.id} className="relative">
            {/* Swipe direction indicator - only on mobile */}
            {isMobile && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                <div className="bg-background/90 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1 border border-border/50 shadow-lg">
                  {index === 0 ? (
                    <>
                      <ArrowLeft className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium">Swipe</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xs font-medium">Swipe</span>
                      <ArrowRight className="h-4 w-4 text-primary" />
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Overlay for swipe feedback */}
            <div 
              className={`absolute inset-0 bg-primary z-10 flex items-center justify-center pointer-events-none ${isMobile ? 'rounded-2xl' : 'rounded-3xl'}`}
              style={{ opacity: getOverlayOpacity(index === 0 ? 'left' : 'right') }}
            >
              <span className="text-white text-5xl font-bold">✓</span>
            </div>

            <Card
              className={`overflow-hidden border border-border/30 hover:border-primary/50 hover:shadow-elegant transition-all duration-500 cursor-pointer ${
                isMobile ? 'rounded-2xl' : 'rounded-3xl'
              } ${isSwiping ? 'pointer-events-none' : ''}`}
              onClick={() => {
                if (!disabled && !isSwiping) {
                  const other = celebrities.find(c => c.id !== celebrity.id)!;
                  onVote(celebrity.id, other.id);
                }
              }}
            >
              <div className="aspect-[3/4] bg-muted relative overflow-hidden">
                <img
                  src={celebrity.image_path}
                  alt={celebrity.name}
                  className={`w-full h-full object-cover ${!isMobile && 'group-hover:scale-110 transition-transform duration-700'}`}
                />
                {!isMobile && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                      <p className="font-serif text-lg font-medium">Select</p>
                    </div>
                  </>
                )}
              </div>
              <div className={isMobile ? 'p-3 bg-card' : 'p-6 bg-card'}>
                <h3 className={`font-serif font-semibold ${isMobile ? 'text-sm mb-1 truncate' : 'text-xl mb-3'}`}>
                  {celebrity.name}
                </h3>
                <div className={`flex items-center justify-between text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  <span className="font-light">Rating: {Math.round(celebrity.elo_rating)}</span>
                  <span className="font-light">{celebrity.games_played} votes</span>
                </div>
              </div>
            </Card>
          </div>
        ))}
      </div>
      
      {/* Swipe instruction - only on mobile */}
      {isMobile && (
        <div className="text-center mt-4 text-sm text-muted-foreground">
          Tap or swipe to choose
        </div>
      )}
    </div>
  );
};
