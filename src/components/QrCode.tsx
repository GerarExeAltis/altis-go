'use client';
import * as React from 'react';
import QRCode from 'qrcode';

export function QrCode({ data, size = 384 }: { data: string; size?: number }) {
  const [svg, setSvg] = React.useState<string>('');

  React.useEffect(() => {
    QRCode.toString(data, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 2,
      width: size,
      color: { dark: '#0d5d56', light: '#ffffff' },
    })
      .then(setSvg)
      .catch(console.error);
  }, [data, size]);

  if (!svg) {
    return (
      <div
        className="animate-pulse rounded-md bg-muted"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      aria-label="QR Code para participar"
      role="img"
      dangerouslySetInnerHTML={{ __html: svg }}
      className="rounded-lg border bg-white p-2 shadow-sm"
    />
  );
}
