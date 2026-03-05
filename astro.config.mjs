import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import clerk from '@clerk/astro';
import { esES } from '@clerk/localizations';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [
    clerk({
      localization: esES,
      signInForceRedirectUrl: '/dashboard',
      signUpForceRedirectUrl: '/dashboard',
    }),
  ],
});