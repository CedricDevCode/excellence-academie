import { memo, type ReactNode } from "react";
import { cn } from "@/utils/cn";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  onClick?: () => void;
}

export default memo(Card);

function Card({ children, className, hover = false, padding = "md", onClick }: CardProps) {
  const paddings = {
    none: "",
    sm: "p-3 sm:p-4",
    md: "p-4 sm:p-5",
    lg: "p-6 sm:p-8",
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white rounded-2xl border border-gray-100 shadow-card transition-all duration-300",
        hover && "hover:shadow-card-hover hover:border-gray-200 hover:-translate-y-0.5 cursor-pointer",
        paddings[padding],
        className
      )}
    >
      {children}
    </div>
  );
}
