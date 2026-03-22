export default (element: HTMLElement) => {
    return async (Component: any, props: any) => {
        Component.mount(element, props)
    }
}