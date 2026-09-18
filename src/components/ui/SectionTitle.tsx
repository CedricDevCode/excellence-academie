import { type ReactNode } from "react";
import { cn } from "@/utils/cn";

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  centered?: boolean;
  className?: string;
  action?: ReactNode;
}

export default function SectionTitle({ title, subtitle, badge, centered = true, className, action }: SectionTitleProps) {
  return (
    <div className={cn("mb-8 sm:mb-10", centered && "text-center", className)}>
      {badge && <div className="mb-3">{badge}</div>}
      <div className={cn("flex items-end justify-between gap-4", centered && "flex-col items-center")}>
        <div className={cn(centered && "text-center")}>
          <h2 className="text-2xl sm:text-3xl font-black text-[#1c1d1f] tracking-tight leading-tight">
            {title}
          </h2>
          <div className={cn("w-12 h-1 bg-accent-500 rounded-full mt-3", centered && "mx-auto")} />
          {subtitle && (
            <p className="text-surface-500 text-sm sm:text-base max-w-2xl mx-auto mt-3 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}