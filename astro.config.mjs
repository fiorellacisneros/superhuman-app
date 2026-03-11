import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import clerk from '@clerk/astro';
import { esES } from '@clerk/localizations';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  vite: {
    optimizeDeps: {
      include: ['flatpickr', 'flatpickr/dist/l10n/es.js'],
    },
  },
  security: {
    // We handle CSRF checks in middleware with same-site fallbacks
    // (Origin/Referer/Sec-Fetch-Site) to avoid false positives on forms.
    checkOrigin: false,
  },
  integrations: [
    clerk({
      localization: esES,
      signInForceRedirectUrl: '/dashboard',
      signUpForceRedirectUrl: '/dashboard',
    }),
  ],
});