import { motion } from "framer-motion";
import { cn } from "@/utils/cn";

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: "primary" | "accent" | "success" | "warning";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
}

export default function ProgressBar({
  value,
  max = 100,
  color = "primary",
  size = "md",
  showLabel = false,
  animated = true,
  className,
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const colors = {
    primary: "from-primary-500 to-primary-400",
    accent: "from-accent-500 to-accent-400",
    success: "from-green-500 to-green-400",
    warning: "from-orange-500 to-orange-400",
  };

  const sizes = {
    sm: "h-1.5",
    md: "h-3",
    lg: "h-4",
  };

  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-semibold text-gray-600">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className={cn("w-full bg-gray-100 rounded-full overflow-hidden", sizes[size])}>
        <motion.div
          className={cn("h-full bg-gradient-to-r rounded-full", colors[color])}
          initial={animated ? { width: 0 } : false}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
        />
      </div>
    </div>
  );
}
