import { Progress } from "@/components/ui/progress";

interface BearProgressProps {
  currentVotes: number;
  votesNeeded: number;
  bearName: string;
  bearImage?: string;
}

export const BearProgress = ({ currentVotes, votesNeeded, bearName, bearImage }: BearProgressProps) => {
  const progress = (currentVotes / votesNeeded) * 100;
  const remaining = votesNeeded - currentVotes;

  return (
    <div className="flex items-center gap-2">
      {bearImage && (
        <img 
          src={bearImage} 
          alt={bearName}
          className="w-8 h-8 rounded-full object-cover"
        />
      )}
      <div className="w-40 space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{bearName}</span>
          <span>{remaining} left</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
    </div>
  );
};
