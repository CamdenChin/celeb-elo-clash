import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

export const KeyboardShortcutsGuide = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setOpen(true);
      }
      // Close with Escape
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const shortcuts = [
    { key: "1", description: "Vote for left celebrity" },
    { key: "2", description: "Vote for right celebrity" },
    { key: "?", description: "Show this help menu" },
    { key: "Esc", description: "Close dialogs" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <Keyboard className="h-12 w-12 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription className="text-center">
            Speed up your voting with these shortcuts
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 mt-4">
          {shortcuts.map((shortcut, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
            >
              <span className="text-sm text-muted-foreground">
                {shortcut.description}
              </span>
              <kbd className="px-3 py-1.5 text-sm font-semibold bg-background border border-border rounded-md shadow-sm">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>

        <p className="text-xs text-center text-muted-foreground mt-4">
          Press <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">?</kbd> anytime to see this guide
        </p>
      </DialogContent>
    </Dialog>
  );
};
