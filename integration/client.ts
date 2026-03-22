export default (element: HTMLElement) => {
    return async (Component: any, props: any) => {
        // SSR コンテンツがある場合は hydrate、ない場合（client:only）は mount
        if (element.innerHTML.trim() && typeof Component.hydrate === 'function') {
            Component.hydrate(element, props)
        } else {
            element.innerHTML = ''
            Component.mount(element, props)
        }
    }
}