export default {
    name: 'astrobit',
    check(Component: any) {
        return Component?.__moonbit === true
    },
    async renderToStaticMarkup(Component: any, props: any) {
        return { html: Component.render?.(props) ?? '<div></div>' }
    }
}