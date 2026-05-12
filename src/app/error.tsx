'use client';
import * as React from 'react';
import { ErrorPage } from '@/components/ErrorPage';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: Props) {
  React.useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return <ErrorPage variant={500} onRecarregar={reset} />;
}
