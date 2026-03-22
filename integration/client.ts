export default (element: HTMLElement) => {
    return async (Component: any, props: any) => {
        if (typeof Component.hydrate === 'function') {
            Component.hydrate(element, props)
        } else {
            element.innerHTML = ''
            Component.mount(element, props)
        }
    }
}