import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, MousePointer2, Zap, Trophy } from "lucide-react";

export const OnboardingTutorial = () => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Check if user has seen the tutorial
    const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
    if (!hasSeenTutorial) {
      setOpen(true);
    }
  }, []);

  const handleComplete = () => {
    localStorage.setItem('hasSeenTutorial', 'true');
    setOpen(false);
  };

  const steps = [
    {
      icon: <MousePointer2 className="h-12 w-12 text-primary" />,
      title: "Welcome to CelebRate!",
      description: "Rate celebrity faces to help train an AI neural network. Your votes matter!",
    },
    {
      icon: <Zap className="h-12 w-12 text-primary" />,
      title: "Fast Decisions = Bigger Impact",
      description: "Vote quickly (under 1 second) to multiply your rating impact by 1.5x. Slow decisions reduce your impact.",
    },
    {
      icon: <Trophy className="h-12 w-12 text-primary" />,
      title: "Unlock Bears & Build Streaks",
      description: "Vote to unlock new bear avatars and build voting streaks. Every 10 votes unlocks a new bear!",
    },
    {
      icon: <MousePointer2 className="h-12 w-12 text-primary" />,
      title: "Multiple Ways to Vote",
      description: "• Swipe cards left/right on mobile\n• Click on a celebrity\n• Press 1 or 2 on keyboard\n• Press ? anytime for help",
    },
  ];

  const currentStep = steps[step];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            {currentStep.icon}
          </div>
          <DialogTitle className="text-center text-xl">
            {currentStep.title}
          </DialogTitle>
          <DialogDescription className="text-center whitespace-pre-line text-base pt-2">
            {currentStep.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center justify-between gap-4 mt-4">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-8 rounded-full transition-colors ${
                  i === step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          
          <div className="flex gap-2">
            {step > 0 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
              >
                Back
              </Button>
            )}
            
            {step < steps.length - 1 ? (
              <Button onClick={() => setStep(step + 1)}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleComplete}>
                Get Started
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
