import type { AstroIntegration } from 'astro'
import { moonbitVitePlugin } from './vite-plugin'

export default function astrobit(): AstroIntegration {
    return {
        name: 'astrobit',
        hooks: {
            'astro:config:setup': ({ addRenderer, updateConfig }) => {
                addRenderer({
                    name: 'astrobit',
                    clientEntrypoint: new URL('./client.js', import.meta.url).href,
                    serverEntrypoint: new URL('./server.js', import.meta.url).href,
                })
                updateConfig({ vite: { plugins: [moonbitVitePlugin()] } })
            }
        }
    }
}