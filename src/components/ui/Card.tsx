import { memo, type ReactNode } from "react";
import { cn } from "@/utils/cn";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  onClick?: () => void;
  borderless?: boolean;
  flat?: boolean;
}

export default memo(Card);

function Card({ children, className, hover = false, padding = "md", onClick, borderless = false, flat = false }: CardProps) {
  const paddings = {
    none: "",
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white rounded border-gray-200 transition-all duration-150",
        borderless ? "" : "border",
        flat ? "shadow-none" : "shadow-sm hover:shadow-md",
        hover && "hover:shadow-md hover:border-gray-300 cursor-pointer",
        paddings[padding],
        className
      )}
    >
      {children}
    </div>
  );
}