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
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });

  const handleDragStart = (clientX: number, clientY: number) => {
    if (disabled || isAnimating) return;
    setIsDragging(true);
    startPos.current = { x: clientX, y: clientY };
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging || disabled) return;
    
    const deltaX = clientX - startPos.current.x;
    const deltaY = clientY - startPos.current.y;
    setDragOffset({ x: deltaX, y: deltaY });
  };

  const handleDragEnd = () => {
    if (!isDragging || disabled) {
      setIsDragging(false);
      return;
    }

    const swipeThreshold = isMobile ? 100 : 150;
    const absDeltaX = Math.abs(dragOffset.x);

    if (absDeltaX > swipeThreshold) {
      // Trigger animation off screen
      setIsAnimating(true);
      const direction = dragOffset.x > 0 ? 1 : -1;
      setDragOffset({ x: direction * 1000, y: dragOffset.y });

      // Determine which celebrity won
      if (direction > 0) {
        // Swiped right - choose right celebrity
        setTimeout(() => {
          onVote(celebrities[1].id, celebrities[0].id);
          resetDrag();
        }, 300);
      } else {
        // Swiped left - choose left celebrity
        setTimeout(() => {
          onVote(celebrities[0].id, celebrities[1].id);
          resetDrag();
        }, 300);
      }
    } else {
      // Snap back
      setDragOffset({ x: 0, y: 0 });
      setIsDragging(false);
    }
  };

  const resetDrag = () => {
    setDragOffset({ x: 0, y: 0 });
    setIsDragging(false);
    setIsAnimating(false);
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleDragStart(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleDragMove(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMobile) return;
    handleDragStart(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isMobile) return;
    handleDragMove(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    if (isMobile) return;
    handleDragEnd();
  };

  const getRotation = () => {
    return dragOffset.x * 0.03; // Slight rotation based on drag
  };

  const getOverlayOpacity = (side: 'left' | 'right') => {
    const maxOpacity = 0.8;
    const opacity = Math.min(Math.abs(dragOffset.x) / 150, maxOpacity);
    
    if (side === 'left' && dragOffset.x < 0) return opacity;
    if (side === 'right' && dragOffset.x > 0) return opacity;
    return 0;
  };

  return (
    <div
      ref={containerRef}
      className={`select-none relative ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${getRotation()}deg)`,
        transition: isDragging ? 'none' : 'transform 0.3s ease-out',
      }}
    >
      <div className={isMobile ? "grid grid-cols-2 gap-3" : "grid grid-cols-2 gap-8 md:gap-12"}>
        {/* Overlay indicators for swipe direction */}
        <div 
          className={`absolute inset-0 bg-primary/20 z-10 flex items-center justify-center pointer-events-none ${isMobile ? 'rounded-2xl' : 'rounded-3xl'}`}
          style={{ opacity: getOverlayOpacity('left') }}
        >
          <div className="bg-primary text-white px-6 py-3 rounded-full font-bold text-xl">
            CHOOSE LEFT
          </div>
        </div>
        <div 
          className={`absolute inset-0 bg-primary/20 z-10 flex items-center justify-center pointer-events-none ${isMobile ? 'rounded-2xl' : 'rounded-3xl'}`}
          style={{ opacity: getOverlayOpacity('right') }}
        >
          <div className="bg-primary text-white px-6 py-3 rounded-full font-bold text-xl">
            CHOOSE RIGHT
          </div>
        </div>

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

            <Card
              className={`overflow-hidden border border-border/30 hover:border-primary/50 hover:shadow-elegant transition-all duration-500 ${
                isMobile ? 'rounded-2xl' : 'rounded-3xl'
              } ${isDragging || isAnimating ? 'pointer-events-none' : 'cursor-pointer'}`}
              onClick={() => {
                if (!disabled && !isDragging && !isAnimating) {
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
                  draggable={false}
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
          Tap or drag to choose
        </div>
      )}
    </div>
  );
};
