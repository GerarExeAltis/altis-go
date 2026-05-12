import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
}

export const Checkbox = React.forwardRef<HTMLInputElement, Props>(
  ({ className, label, id, ...props }, ref) => {
    const generatedId = React.useId();
    const finalId = id ?? generatedId;
    return (
      <div className="flex items-start gap-2">
        <div className="relative flex h-5 w-5 shrink-0">
          <input
            ref={ref}
            id={finalId}
            type="checkbox"
            className={cn(
              'peer h-5 w-5 cursor-pointer appearance-none rounded border border-input bg-background ring-offset-background',
              'checked:border-primary checked:bg-primary',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              className
            )}
            {...props}
          />
          <Check
            className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 opacity-0 text-primary-foreground peer-checked:opacity-100"
            strokeWidth={3}
          />
        </div>
        {label && (
          <label htmlFor={finalId} className="cursor-pointer select-none text-sm leading-tight">
            {label}
          </label>
        )}
      </div>
    );
  }
);
Checkbox.displayName = 'Checkbox';
