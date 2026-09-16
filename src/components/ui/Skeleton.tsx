import { cn } from "@/utils/cn";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular" | "card";
}

export default function Skeleton({ className, variant = "rectangular" }: SkeletonProps) {
  const base = "animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] rounded-xl";

  const variants = {
    text: "h-4 w-full rounded",
    circular: "rounded-full",
    rectangular: "rounded-xl",
    card: "rounded-2xl h-48",
  };

  return (
    <div className={cn(base, variants[variant], className)} aria-hidden="true" />
  );
}
