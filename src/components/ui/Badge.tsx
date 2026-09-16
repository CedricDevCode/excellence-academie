import { memo, type ReactNode } from "react";
import { cn } from "@/utils/cn";

interface BadgeProps {
  children: ReactNode;
  variant?: "primary" | "accent" | "success" | "warning" | "danger" | "gray";
  size?: "sm" | "md";
  dot?: boolean;
  className?: string;
}

export default memo(Badge);

function Badge({ children, variant = "primary", size = "sm", dot, className }: BadgeProps) {
  const variants = {
    primary: "bg-primary-50 text-primary-600 border-primary-200",
    accent: "bg-accent-50 text-accent-600 border-accent-200",
    success: "bg-green-50 text-green-700 border-green-200",
    warning: "bg-orange-50 text-orange-700 border-orange-200",
    danger: "bg-red-50 text-red-700 border-red-200",
    gray: "bg-gray-100 text-gray-600 border-gray-200",
  };

  const dotColors = {
    primary: "bg-primary-500",
    accent: "bg-accent-500",
    success: "bg-green-500",
    warning: "bg-orange-500",
    danger: "bg-red-500",
    gray: "bg-gray-400",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-xs",
  };

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 font-bold uppercase tracking-wider rounded-full border",
      variants[variant],
      sizes[size],
      className
    )}>
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full", dotColors[variant])} />}
      {children}
    </span>
  );
}
