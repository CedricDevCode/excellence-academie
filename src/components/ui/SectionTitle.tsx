import { type ReactNode } from "react";
import { cn } from "@/utils/cn";

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  centered?: boolean;
  className?: string;
}

export default function SectionTitle({ title, subtitle, badge, centered = true, className }: SectionTitleProps) {
  return (
    <div className={cn("mb-8 sm:mb-10", centered && "text-center", className)}>
      {badge && (
        <div className="mb-3">{badge}</div>
      )}
      <h2 className="text-2xl sm:text-3xl font-black text-primary-700 tracking-tight">
        {title}
      </h2>
      <div className={cn("w-12 h-1 bg-accent-500 rounded-full mt-3", centered && "mx-auto")} />
      {subtitle && (
        <p className="text-gray-500 text-sm sm:text-base max-w-2xl mx-auto mt-3 leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}
