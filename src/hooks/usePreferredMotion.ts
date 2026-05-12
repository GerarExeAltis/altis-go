'use client';
import * as React from 'react';

export function usePreferredMotion(): { reduzir: boolean } {
  const [reduzir, setReduzir] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduzir(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduzir(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return { reduzir };
}
