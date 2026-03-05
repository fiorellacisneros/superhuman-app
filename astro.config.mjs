import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import clerk from '@clerk/astro';
import { esES } from '@clerk/localizations';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [
    clerk({
      localization: esES,
      signInForceRedirectUrl: '/dashboard',
      signUpForceRedirectUrl: '/dashboard',
    }),
  ],
});