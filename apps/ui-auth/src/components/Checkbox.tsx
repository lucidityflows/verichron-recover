import { type InputHTMLAttributes, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../utils/cn';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
}

export function Checkbox({ id, label, className, ...props }: CheckboxProps) {
  return (
    <div className="flex items-center">
      <div className="relative flex items-center justify-center w-5 h-5">
        <input
          type="checkbox"
          id={id}
          className={cn(
            'peer h-5 w-5 absolute inset-0 cursor-pointer appearance-none rounded border-2 border-border bg-background transition-all duration-200',
            'checked:bg-primary checked:border-primary',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            className
          )}
          {...props}
        />
        <Check className="pointer-events-none h-3.5 w-3.5 text-white opacity-0 transition-opacity peer-checked:opacity-100 z-10" />
      </div>
      {label && (
        <label
          htmlFor={id}
          className="ml-2 text-sm font-medium text-foreground cursor-pointer select-none"
        >
          {label}
        </label>
      )}
    </div>
  );
}
