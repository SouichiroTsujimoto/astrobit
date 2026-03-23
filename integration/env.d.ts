declare module '*.mbt' {
  interface MoonBitComponent {
    (props: Record<string, unknown>): unknown
    __moonbit: true
    mount?: (element: Element, props: Record<string, unknown>) => void
    render?: (props: Record<string, unknown>) => string
    hydrate?: (element: Element, props: Record<string, unknown>) => void
  }
  const component: MoonBitComponent
  export default component
}
