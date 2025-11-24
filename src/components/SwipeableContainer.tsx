import { useState, useRef, useEffect } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Celebrity {
  id: string;
  name: string;
  image_path: string;
  elo_rating: number;
  games_played: number;
}

interface DraggableCardProps {
  celebrity: Celebrity;
  onSelect: () => void;
  disabled?: boolean;
  isMobile?: boolean;
  showLeftArrow?: boolean;
  showRightArrow?: boolean;
}

const DraggableCard = ({ celebrity, onSelect, disabled, isMobile, showLeftArrow, showRightArrow }: DraggableCardProps) => {
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  const [showPulse, setShowPulse] = useState(true);
  const startPos = useRef({ x: 0, y: 0 });

  // Hide pulse after initial animation
  useEffect(() => {
    const timer = setTimeout(() => setShowPulse(false), 2000);
    return () => clearTimeout(timer);
  }, [celebrity.id]); // Reset pulse when new celebrity appears

  const handleDragStart = (clientX: number, clientY: number) => {
    if (disabled || isAnimating) return;
    setIsPressing(true);
    startPos.current = { x: clientX, y: clientY };
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isPressing || disabled) return;
    
    const deltaX = clientX - startPos.current.x;
    const deltaY = clientY - startPos.current.y;
    
    // Only enter drag mode after some movement (prevents accidental drags on clicks)
    const dragThreshold = 5;
    if (!isDragging && (Math.abs(deltaX) > dragThreshold || Math.abs(deltaY) > dragThreshold)) {
      setIsDragging(true);
    }
    
    if (isDragging) {
      setDragOffset({ x: deltaX, y: deltaY });
    }
  };

  const handleDragEnd = () => {
    if (!isPressing || disabled) {
      setIsPressing(false);
      setIsDragging(false);
      return;
    }

    // If we never entered drag mode, this was just a click - don't do anything here
    if (!isDragging) {
      setIsPressing(false);
      return;
    }

    const swipeThreshold = isMobile ? 80 : 120;
    const absDeltaX = Math.abs(dragOffset.x);
    const absDeltaY = Math.abs(dragOffset.y);

    // Only trigger if horizontal movement is dominant
    if (absDeltaX > swipeThreshold && absDeltaX > absDeltaY) {
      // Trigger animation off screen
      setIsAnimating(true);
      const direction = dragOffset.x > 0 ? 1 : -1;
      setDragOffset({ x: direction * 1000, y: dragOffset.y * 2 });

      setTimeout(() => {
        onSelect();
        resetDrag();
      }, 300);
    } else {
      // Snap back
      setDragOffset({ x: 0, y: 0 });
      setIsDragging(false);
      setIsPressing(false);
    }
  };

  const resetDrag = () => {
    setDragOffset({ x: 0, y: 0 });
    setIsDragging(false);
    setIsPressing(false);
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
    e.preventDefault();
    handleDragStart(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isMobile || !isDragging) return;
    handleDragMove(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    if (isMobile) return;
    handleDragEnd();
  };

  const getRotation = () => {
    return dragOffset.x * 0.05;
  };

  const getScale = () => {
    const dragDistance = Math.abs(dragOffset.x);
    return 1 + (dragDistance / 1000) * 0.1;
  };

  const getChooseOpacity = () => {
    return Math.min(Math.abs(dragOffset.x) / 100, 1);
  };

  return (
    <div 
      className="relative"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Swipe direction indicator - only on mobile */}
      {isMobile && (showLeftArrow || showRightArrow) && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="bg-background/90 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1 border border-border/50 shadow-lg">
            {showLeftArrow ? (
              <>
                <ArrowLeft className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium">Drag</span>
              </>
            ) : (
              <>
                <span className="text-xs font-medium">Drag</span>
                <ArrowRight className="h-4 w-4 text-primary" />
              </>
            )}
          </div>
        </div>
      )}

      {/* Choose indicator overlay */}
      <div 
        className={`absolute inset-0 z-10 flex items-center justify-center pointer-events-none ${isMobile ? 'rounded-2xl' : 'rounded-3xl'}`}
        style={{ opacity: getChooseOpacity() }}
      >
        <div className="bg-primary text-white px-6 py-3 rounded-full font-bold text-lg shadow-lg">
          CHOOSE
        </div>
      </div>

      <div
        style={{
          transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${getRotation()}deg) scale(${getScale()})`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        <Card
          className={`overflow-hidden border border-border/30 hover:border-primary/50 hover:shadow-elegant transition-all duration-500 ${
            isMobile ? 'rounded-2xl' : 'rounded-3xl'
          } ${isDragging || isAnimating ? 'cursor-grabbing shadow-2xl' : 'cursor-grab'} ${
            showPulse ? 'animate-pulse' : ''
          }`}
          onClick={() => {
            if (!disabled && !isDragging && !isAnimating && !isPressing) {
              onSelect();
            }
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="aspect-[3/4] bg-muted relative overflow-hidden">
            <img
              src={celebrity.image_path}
              alt={celebrity.name}
              className={`w-full h-full object-cover ${!isMobile && !isDragging && 'group-hover:scale-110 transition-transform duration-700'}`}
              draggable={false}
            />
            {!isMobile && !isDragging && (
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
    </div>
  );
};

interface SwipeableContainerProps {
  celebrities: [Celebrity, Celebrity];
  onVote: (winnerId: string, loserId: string) => void;
  disabled?: boolean;
  isMobile?: boolean;
}

export const SwipeableContainer = ({ celebrities, onVote, disabled, isMobile = true }: SwipeableContainerProps) => {
  return (
    <div className="select-none">
      <div className={isMobile ? "grid grid-cols-2 gap-3" : "grid grid-cols-2 gap-8 md:gap-12"}>
        {celebrities.map((celebrity, index) => {
          const other = celebrities.find(c => c.id !== celebrity.id)!;
          return (
            <DraggableCard
              key={celebrity.id}
              celebrity={celebrity}
              onSelect={() => !disabled && onVote(celebrity.id, other.id)}
              disabled={disabled}
              isMobile={isMobile}
              showLeftArrow={isMobile && index === 0}
              showRightArrow={isMobile && index === 1}
            />
          );
        })}
      </div>
      
      {/* Instructions */}
      <div className="text-center mt-4 text-sm text-muted-foreground">
        {isMobile ? (
          "Tap, drag or use keys 1/2"
        ) : (
          "Click, drag or use keys 1/2"
        )}
      </div>
    </div>
  );
};
