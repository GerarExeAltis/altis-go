'use client';
import { cn } from '@/lib/utils';

const PALETA = [
  '#4afad4', '#009993', '#f7b32b', '#e74c3c',
  '#3498db', '#9b59b6', '#27ae60', '#555555',
];

interface Props {
  value: string;
  onChange: (cor: string) => void;
  id?: string;
}

export function CorPickerInline({ value, onChange, id }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {PALETA.map((cor) => (
          <button
            key={cor}
            type="button"
            aria-label={`Selecionar cor ${cor}`}
            onClick={() => onChange(cor)}
            style={{ backgroundColor: cor }}
            className={cn(
              'h-7 w-7 rounded-md border-2 transition-all',
              value === cor ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'
            )}
          />
        ))}
      </div>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#RRGGBB"
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm font-mono"
      />
    </div>
  );
}
