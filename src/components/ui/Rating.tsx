import { Star } from "lucide-react";
import { cn } from "@/utils/cn";

interface RatingProps {
  value: number;
  maxStars?: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  reviewCount?: number;
  className?: string;
}

export default function Rating({ value, maxStars = 5, size = "md", showValue = false, reviewCount, className }: RatingProps) {
  const sizes = {
    sm: 12,
    md: 16,
    lg: 20,
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center gap-0.5">
        {[...Array(maxStars)].map((_, i) => (
          <Star
            key={i}
            size={sizes[size]}
            className={cn(
              "transition-colors",
              i < Math.round(value) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"
            )}
          />
        ))}
      </div>
      {showValue && (
        <span className={cn("font-semibold text-gray-700 ml-1", textSizes[size])}>
          {value.toFixed(1)}
        </span>
      )}
      {reviewCount !== undefined && (
        <span className={cn("text-gray-400", textSizes[size])}>
          ({reviewCount})
        </span>
      )}
    </div>
  );
}
