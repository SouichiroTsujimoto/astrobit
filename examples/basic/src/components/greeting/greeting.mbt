fn greeting(props : @dom.Props) -> @a.Node {
  let name = props.get_string("name", default="World")
  let open = @signals.signal(false)
  @a.div(attrs={ "class": "greeting" }, [
    @a.h3("Hello, " + name + "!"),
    @a.button(
      @a.dyn_text(fn() { if open.get() { "Hide" } else { "Show more" } }),
    )
    |> @a.on_click(fn(_) { open.update(fn(b) { !b }) }),
    @a.dyn(fn() {
      if open.get() {
        @a.p("This paragraph appears after clicking — client-side only!")
      } else {
        @a.Empty
      }
    }),
  ])
}

///|
pub fn mount(element : @dom.Element, props : @dom.Props) -> Unit {
  @a.mount_dom(element, greeting(props))
}

///|
pub fn render(props : @dom.Props) -> String {
  @a.render_to_html(greeting(props))
}

///|
pub fn hydrate(element : @dom.Element, props : @dom.Props) -> Unit {
  @a.hydrate_dom(element, greeting(props))
}
