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
            },
            'astro:config:done': ({ injectTypes }) => {
                injectTypes({
                    filename: 'astrobit.d.ts',
                    content: `declare module '*.mbt' {
  interface MoonBitComponent {
    (props: Record<string, unknown>): unknown
    __moonbit: true
    mount?: (element: Element, props: Record<string, unknown>) => void
    render?: (props: Record<string, unknown>) => string
    hydrate?: (element: Element, props: Record<string, unknown>) => void
  }
  const component: MoonBitComponent
  export default component
}`,
                })
            }
        }
    }
}