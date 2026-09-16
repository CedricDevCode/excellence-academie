import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/utils/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            className={cn(
              "w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm",
              "focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100",
              "transition-all duration-200",
              "placeholder:text-gray-400",
              icon && "pl-10",
              error && "border-red-400 focus:border-red-500 focus:ring-red-100",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-red-500 text-xs mt-1">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
