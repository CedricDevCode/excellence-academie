import { type ReactNode } from "react";
import { cn } from "@/utils/cn";

interface ContainerProps {
  children: ReactNode;
  className?: string;
  size?: "default" | "narrow" | "wide";
}

export default function Container({ children, className, size = "default" }: ContainerProps) {
  const sizes = {
    default: "max-w-7xl",
    narrow: "max-w-4xl",
    wide: "max-w-[1400px]",
  };

  return (
    <div className={cn(sizes[size], "mx-auto px-4 sm:px-6 lg:px-8", className)}>
      {children}
    </div>
  );
}
