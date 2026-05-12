import { cn } from '@/lib/utils';

/**
 * Logo Altis renderizado via CSS mask-image — assim a cor segue a paleta do
 * sistema (var --primary: #4afad4 no claro / #009993 no escuro) e respeita
 * o dark mode automaticamente.
 *
 * Para mudar a cor, passe uma classe utility do Tailwind no className:
 *   <LogoAltis className="bg-foreground" />     -> texto base
 *   <LogoAltis className="bg-destructive" />    -> vermelho
 *   <LogoAltis />                                -> primary (default)
 */
export function LogoAltis({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <span
      role="img"
      aria-label="Altis Sistemas"
      style={{ width: size, height: size }}
      className={cn(
        'inline-block select-none bg-primary',
        '[mask-image:url(/logo.svg)] [mask-size:contain] [mask-repeat:no-repeat] [mask-position:center]',
        '[-webkit-mask-image:url(/logo.svg)] [-webkit-mask-size:contain] [-webkit-mask-repeat:no-repeat] [-webkit-mask-position:center]',
        className
      )}
    />
  );
}
