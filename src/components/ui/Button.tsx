import { memo, type ReactNode, type ButtonHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "accent";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
}

export default memo(Button);

function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  loading,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const base = "inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 shadow-sm hover:shadow-md",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900",
    outline: "border-2 border-gray-200 text-gray-700 hover:border-primary-500 hover:text-primary-500",
    accent: "bg-accent-500 text-white hover:bg-accent-600 active:bg-accent-700 shadow-sm shadow-accent-500/20 hover:shadow-md hover:shadow-accent-500/30",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-7 py-3.5 text-base",
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
      {iconRight && <span className="shrink-0">{iconRight}</span>}
    </button>
  );
}
