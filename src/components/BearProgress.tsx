import { Progress } from "@/components/ui/progress";

interface BearProgressProps {
  currentVotes: number;
  votesNeeded: number;
  bearName: string;
}

export const BearProgress = ({ currentVotes, votesNeeded, bearName }: BearProgressProps) => {
  const progress = (currentVotes / votesNeeded) * 100;
  const remaining = votesNeeded - currentVotes;

  return (
    <div className="w-40 space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{bearName}</span>
        <span>{remaining} left</span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
};
