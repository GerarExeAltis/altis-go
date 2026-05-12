import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
    beforeSend(event) {
      const send = JSON.stringify(event);
      const limpo = send
        .replace(/\d{11}/g, '<TELEFONE>')
        .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '<EMAIL>');
      return JSON.parse(limpo) as typeof event;
    },
  });
}
