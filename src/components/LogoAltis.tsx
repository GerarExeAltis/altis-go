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
 *
 * Observacao sobre basePath: em prod o app fica em /altis-go/* (GitHub
 * Pages), entao o CSS precisa carregar /altis-go/logo.svg — nao /logo.svg.
 * O `<Image>` do Next aplica basePath sozinho, mas CSS bruto (mask-image)
 * nao. Por isso usamos NEXT_PUBLIC_BASE_PATH (definido em next.config.mjs)
 * para prefixar a URL no style inline.
 */
export function LogoAltis({ size = 48, className }: { size?: number; className?: string }) {
  const bp = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  const url = `url(${bp}/logo.svg)`;
  return (
    <span
      role="img"
      aria-label="Altis Sistemas"
      style={{
        width: size,
        height: size,
        maskImage: url,
        WebkitMaskImage: url,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
      }}
      className={cn('inline-block select-none bg-primary', className)}
    />
  );
}
