import { Skeleton } from "@/components/ui/skeleton";

export const CelebrityCardSkeleton = () => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 w-full">
      {/* Desktop: Side by side */}
      <div className="hidden md:flex gap-8 items-center justify-center w-full max-w-4xl">
        <div className="flex flex-col items-center gap-4 flex-1">
          <Skeleton className="w-80 h-96 rounded-2xl" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-12 w-48" />
        </div>
        <div className="flex flex-col items-center gap-4 flex-1">
          <Skeleton className="w-80 h-96 rounded-2xl" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-12 w-48" />
        </div>
      </div>

      {/* Mobile: Stacked */}
      <div className="md:hidden flex flex-col gap-4 w-full px-4">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="w-full max-w-sm h-80 rounded-2xl" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="w-full max-w-sm h-80 rounded-2xl" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
    </div>
  );
};
