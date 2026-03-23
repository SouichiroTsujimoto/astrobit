fn counter(props : @dom.Props) -> @a.Node {
  let initial = props.get_int("initial")
  let count = @signals.signal(initial)
  @a.div(attrs={ "class": "counter" }, [
    @a.p(@a.dyn_text(fn() { "Count: " + count.get().to_string() })),
    @a.button("-") |> @a.on_click(fn(_) { count.update(fn(n) { n - 1 }) }),
    @a.button("+") |> @a.on_click(fn(_) { count.update(fn(n) { n + 1 }) }),
  ])
}

///|
pub fn mount(element : @dom.Element, props : @dom.Props) -> Unit {
  @a.mount_dom(element, counter(props))
}

///|
pub fn render(props : @dom.Props) -> String {
  @a.render_to_html(counter(props))
}

///|
pub fn hydrate(element : @dom.Element, props : @dom.Props) -> Unit {
  @a.hydrate_dom(element, counter(props))
}
