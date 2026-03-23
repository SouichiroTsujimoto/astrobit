// @ts-check
import { defineConfig } from 'astro/config';
import astroMoonbit from 'astrobit'

// https://astro.build/config
export default defineConfig({
  integrations: [astroMoonbit()],
})