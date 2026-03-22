import type { AstroIntegration } from 'astro'

export default function astrobit(): AstroIntegration {
    return {
        name: 'astrobit',
        hooks: {
            'astro:config:setup': ({ addRenderer }) => {
                addRenderer({
                    name: 'astrobit',
                    clientEntrypoint: new URL('./client.ts', import.meta.url).href,
                    serverEntrypoint: new URL('./server.ts', import.meta.url).href,
                })
            }
        }
    }
}